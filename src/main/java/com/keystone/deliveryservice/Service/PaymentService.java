package com.keystone.deliveryservice.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.keystone.deliveryservice.DTO.CreatePaymentDTO;
import com.keystone.deliveryservice.DTO.PaymentConfigDTO;
import com.keystone.deliveryservice.DTO.PaymentResponseDTO;
import com.keystone.deliveryservice.ENUM.NotificationType;
import com.keystone.deliveryservice.ENUM.PaymentMethod;
import com.keystone.deliveryservice.ENUM.PaymentStatus;
import com.keystone.deliveryservice.ENUM.Role;
import com.keystone.deliveryservice.ENUM.UpiApp;
import com.keystone.deliveryservice.ENUM.WorkOrderStatus;
import com.keystone.deliveryservice.Entity.Payment;
import com.keystone.deliveryservice.Entity.UserAuth;
import com.keystone.deliveryservice.Entity.WorkOrder;
import com.keystone.deliveryservice.Repository.PaymentRepository;
import com.keystone.deliveryservice.Repository.WorkOrderRepository;

/**
 * Customer payments: cash, UPI (Google Pay / PhonePe / Paytm / other), UPI QR, or card at the visit.
 *
 * Only customers pay. Nothing marks a payment as paid on its own: every payment starts PENDING
 * and a manager confirms it (PAID) after checking the money arrived, or rejects it (FAILED).
 * Managers never create payments. The customer can cancel while it is still PENDING.
 */
@Service
@Transactional
public class PaymentService {

    private static final Set<Role> MANAGERS = Set.of(Role.MANAGER);
    static final String CURRENCY = "INR";

    private final PaymentRepository paymentRepository;
    private final WorkOrderRepository workOrderRepository;
    private final NotificationService notificationService;
    private final String upiVpa;
    private final String payeeName;

    public PaymentService(PaymentRepository paymentRepository, WorkOrderRepository workOrderRepository,
            NotificationService notificationService,
            @Value("${app.payments.upi-vpa:}") String upiVpa,
            @Value("${app.payments.payee-name:KEYSTONE Facilities}") String payeeName) {
        this.paymentRepository = paymentRepository;
        this.workOrderRepository = workOrderRepository;
        this.notificationService = notificationService;
        this.upiVpa = upiVpa == null ? "" : upiVpa.trim();
        this.payeeName = payeeName;
    }

    public boolean upiEnabled() {
        // A UPI ID looks like name@bank.
        return upiVpa.matches("^[A-Za-z0-9.\\-_]{2,256}@[A-Za-z]{2,64}$");
    }

    @Transactional(readOnly = true)
    public PaymentConfigDTO config() {
        return PaymentConfigDTO.builder()
                .upiEnabled(upiEnabled())
                .upiVpa(upiEnabled() ? upiVpa : null)
                .payeeName(payeeName)
                .currency(CURRENCY)
                .build();
    }

    /** A customer starts paying for one of their organisation's work orders. */
    public PaymentResponseDTO create(CreatePaymentDTO request, UserAuth customer) {
        if (customer.getRole() != Role.CUSTOMER) {
            throw new AccessDeniedException("Only customers make payments. Managers confirm them.");
        }
        if (customer.getCustomerId() == null) {
            throw new IllegalArgumentException("Your account is not linked to an organisation yet. Ask your service manager to link it.");
        }
        WorkOrder workOrder = workOrderRepository.findById(request.getWorkOrderId())
                .orElseThrow(() -> new IllegalArgumentException("Work order not found"));
        if (!customer.isLinkedTo(workOrder.getCustomer().getId())) {
            throw new AccessDeniedException("You can only pay for your own organisation's work orders.");
        }
        if (workOrder.getStatus() == WorkOrderStatus.CANCELLED) {
            throw new IllegalStateException("This work order was cancelled and cannot be paid.");
        }
        if (request.getMethod().isUpi() && !upiEnabled()) {
            throw new IllegalStateException("UPI payments are not set up yet. Please choose cash or card, or contact your service manager.");
        }
        if (paymentRepository.existsByWorkOrderIdAndStatus(workOrder.getId(), PaymentStatus.PENDING)) {
            throw new IllegalStateException("A payment for " + workOrder.getCode()
                    + " is already waiting for confirmation. Cancel it first to start a new one.");
        }
        String transactionRef = null;
        if (request.getMethod() != PaymentMethod.CASH && request.getTransactionRef() != null
                && !request.getTransactionRef().isBlank()) {
            transactionRef = checkTransactionRefUnused(request.getTransactionRef());
        }

        Payment payment = Payment.builder()
                .reference(String.format("KS-PAY-%06d", paymentRepository.nextReferenceValue()))
                .workOrder(workOrder)
                .customer(workOrder.getCustomer())
                .payer(customer)
                .amount(request.getAmount().setScale(2, RoundingMode.HALF_UP))
                .method(request.getMethod())
                .upiApp(request.getMethod() == PaymentMethod.UPI
                        ? (request.getUpiApp() != null ? request.getUpiApp() : UpiApp.OTHER) : null)
                .status(PaymentStatus.PENDING)
                .transactionRef(transactionRef)
                .build();
        payment = paymentRepository.save(payment);

        NotificationService.Ref ref = paymentRef(payment);
        notificationService.notifyRoles(MANAGERS, customer, NotificationType.PAYMENT_PENDING,
                "Payment pending: " + payment.getReference(),
                customer.getUserName() + " (" + workOrder.getCustomer().getCompanyName() + ") is paying "
                        + money(payment.getAmount()) + " by " + methodLabel(payment) + " for " + workOrder.getCode()
                        + " - " + workOrder.getTitle() + ". Confirm it once the money has arrived.",
                ref);
        notificationService.notifyUser(customer, NotificationType.PAYMENT_PENDING,
                "Payment submitted: " + payment.getReference(),
                money(payment.getAmount()) + " by " + methodLabel(payment) + " for " + workOrder.getCode()
                        + " is waiting for confirmation by KEYSTONE.",
                ref);
        return toDTO(payment);
    }

    /** Customer adds the UPI transaction reference (UTR) or card slip number after paying. */
    public PaymentResponseDTO submitTransactionRef(Long paymentId, String transactionRef, UserAuth customer) {
        Payment payment = findOwnPayment(paymentId, customer);
        requirePending(payment);
        if (payment.getMethod() == PaymentMethod.CASH) {
            throw new IllegalStateException("A transaction reference is not needed for cash payments.");
        }
        payment.setTransactionRef(checkTransactionRefUnused(transactionRef));
        payment = paymentRepository.save(payment);
        notificationService.notifyRoles(MANAGERS, customer, NotificationType.PAYMENT_PENDING,
                "Reference added: " + payment.getReference(),
                customer.getUserName() + " entered reference " + payment.getTransactionRef() + " for "
                        + money(payment.getAmount()) + " (" + methodLabel(payment) + "). Check it and confirm.",
                paymentRef(payment));
        return toDTO(payment);
    }

    public PaymentResponseDTO cancel(Long paymentId, UserAuth customer) {
        Payment payment = findOwnPayment(paymentId, customer);
        requirePending(payment);
        payment.setStatus(PaymentStatus.CANCELLED);
        payment = paymentRepository.save(payment);
        notificationService.notifyRoles(MANAGERS, customer, NotificationType.PAYMENT_CANCELLED,
                "Payment cancelled: " + payment.getReference(),
                customer.getUserName() + " cancelled the " + money(payment.getAmount()) + " payment for "
                        + payment.getWorkOrder().getCode() + ".",
                paymentRef(payment));
        return toDTO(payment);
    }

    /** Manager confirms the customer's money arrived. */
    public PaymentResponseDTO confirm(Long paymentId, UserAuth manager) {
        requireManager(manager);
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found"));
        requirePending(payment);
        if (payment.getMethod().isUpi() && payment.getTransactionRef() == null) {
            throw new IllegalStateException("This UPI payment has no transaction reference yet. "
                    + "Match it in your bank statement first, or wait for the customer to enter it.");
        }
        payment.setStatus(PaymentStatus.PAID);
        payment.setPaidAt(LocalDateTime.now());
        payment.setVerifiedBy(manager);
        payment = paymentRepository.save(payment);

        NotificationService.Ref ref = paymentRef(payment);
        notificationService.notifyCustomerOrganisation(payment.getCustomer().getId(), manager, NotificationType.PAYMENT_RECEIVED,
                "Payment received: " + payment.getReference(),
                "We received " + money(payment.getAmount()) + " for " + payment.getWorkOrder().getCode()
                        + ". Your receipt is ready in My Payments. Thank you!",
                ref);
        notificationService.notifyRoles(MANAGERS, manager, NotificationType.PAYMENT_RECEIVED,
                "Payment confirmed: " + payment.getReference(),
                manager.getUserName() + " confirmed " + money(payment.getAmount()) + " from "
                        + payment.getPayer().getUserName() + " (" + payment.getCustomer().getCompanyName() + ").",
                ref);
        return toDTO(payment);
    }

    /** Manager marks the payment as failed (e.g. no matching UPI credit). */
    public PaymentResponseDTO reject(Long paymentId, String reason, UserAuth manager) {
        requireManager(manager);
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found"));
        requirePending(payment);
        payment.setStatus(PaymentStatus.FAILED);
        payment.setFailureReason(reason.trim());
        payment.setVerifiedBy(manager);
        payment = paymentRepository.save(payment);
        notificationService.notifyCustomerOrganisation(payment.getCustomer().getId(), manager, NotificationType.PAYMENT_FAILED,
                "Payment failed: " + payment.getReference(),
                "Your " + money(payment.getAmount()) + " payment for " + payment.getWorkOrder().getCode()
                        + " could not be confirmed: " + payment.getFailureReason(),
                paymentRef(payment));
        return toDTO(payment);
    }

    /** Managers see every payment; a customer sees only the payments they made themselves. */
    @Transactional(readOnly = true)
    public List<PaymentResponseDTO> list(UserAuth user) {
        if (user.getRole() == Role.MANAGER) {
            return paymentRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toDTO).toList();
        }
        if (user.getRole() == Role.CUSTOMER) {
            return paymentRepository.findByPayerIdOrderByCreatedAtDesc(user.getId()).stream()
                    .map(this::toDTO).toList();
        }
        throw new AccessDeniedException("Payments are only available to managers and customers.");
    }

    @Transactional(readOnly = true)
    public PaymentResponseDTO get(Long paymentId, UserAuth user) {
        return toDTO(findVisiblePayment(paymentId, user));
    }

    /** The payment behind a receipt: visible to the caller, and actually paid. */
    @Transactional(readOnly = true)
    public Payment paidPaymentForReceipt(Long paymentId, UserAuth user) {
        Payment payment = findVisiblePayment(paymentId, user);
        if (payment.getStatus() != PaymentStatus.PAID) {
            throw new IllegalStateException("A receipt is available once the payment has been confirmed.");
        }
        return payment;
    }

    private Payment findVisiblePayment(Long paymentId, UserAuth user) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found"));
        if (user.getRole() == Role.MANAGER) {
            return payment;
        }
        // Ownership is checked on the server: only the customer who made the payment.
        if (user.getRole() == Role.CUSTOMER && payment.getPayer() != null && payment.getPayer().getId().equals(user.getId())) {
            return payment;
        }
        throw new AccessDeniedException("You do not have access to this payment.");
    }

    private Payment findOwnPayment(Long paymentId, UserAuth customer) {
        if (customer.getRole() != Role.CUSTOMER) {
            throw new AccessDeniedException("Only the paying customer can change this payment.");
        }
        return findVisiblePayment(paymentId, customer);
    }

    private static void requirePending(Payment payment) {
        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new IllegalStateException("This payment is already " + payment.getStatus() + ".");
        }
    }

    private static void requireManager(UserAuth user) {
        if (user.getRole() != Role.MANAGER) {
            throw new AccessDeniedException("Only managers can confirm or reject payments.");
        }
    }

    private String checkTransactionRefUnused(String transactionRef) {
        String value = transactionRef.trim().toUpperCase();
        if (paymentRepository.existsByTransactionRefIgnoreCase(value)) {
            throw new IllegalArgumentException("This transaction reference has already been used for another payment.");
        }
        return value;
    }

    /** upi://pay link per the NPCI UPI linking spec; the QR code and app buttons use exactly this. */
    String upiUri(Payment payment) {
        if (!upiEnabled()) {
            return null;
        }
        return "upi://pay?pa=" + encode(upiVpa)
                + "&pn=" + encode(payeeName)
                + "&am=" + payment.getAmount().setScale(2, RoundingMode.HALF_UP).toPlainString()
                + "&cu=" + CURRENCY
                + "&tr=" + encode(payment.getReference())
                + "&tn=" + encode("KEYSTONE " + payment.getWorkOrder().getCode());
    }

    PaymentResponseDTO toDTO(Payment p) {
        boolean pendingUpi = p.getStatus() == PaymentStatus.PENDING && p.getMethod().isUpi();
        return PaymentResponseDTO.builder()
                .id(p.getId())
                .reference(p.getReference())
                .workOrderId(p.getWorkOrder().getId())
                .workOrderCode(p.getWorkOrder().getCode())
                .workOrderTitle(p.getWorkOrder().getTitle())
                .workOrderDescription(p.getWorkOrder().getDescription())
                .customerId(p.getCustomer().getId())
                .customerName(p.getCustomer().getCompanyName())
                // The customer user who paid.
                .payerName(p.getPayer().getUserName())
                .payerEmail(p.getPayer().getUserEmail())
                .payerPhone(p.getPayer().getPhone())
                .customerAddress(p.getCustomer().getAddress())
                .amount(p.getAmount())
                .currency(CURRENCY)
                .method(p.getMethod())
                .upiApp(p.getUpiApp())
                .status(p.getStatus())
                .transactionRef(p.getTransactionRef())
                .failureReason(p.getFailureReason())
                .verifiedByName(p.getVerifiedBy() != null ? p.getVerifiedBy().getUserName() : null)
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .paidAt(p.getPaidAt())
                .upiUri(pendingUpi ? upiUri(p) : null)
                .build();
    }

    static String money(BigDecimal amount) {
        return CURRENCY + " " + amount.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    static String methodLabel(PaymentMethod method) {
        return switch (method) {
            case CASH -> "Cash";
            case UPI -> "UPI";
            case UPI_QR -> "UPI QR";
            case CARD -> "Card";
        };
    }

    /** Method including the UPI app, e.g. "UPI (PhonePe)". */
    static String methodLabel(Payment payment) {
        if (payment.getMethod() == PaymentMethod.UPI && payment.getUpiApp() != null) {
            return "UPI (" + appLabel(payment.getUpiApp()) + ")";
        }
        return methodLabel(payment.getMethod());
    }

    static String appLabel(UpiApp app) {
        return switch (app) {
            case GOOGLE_PAY -> "Google Pay";
            case PHONEPE -> "PhonePe";
            case PAYTM -> "Paytm";
            case OTHER -> "other UPI app";
        };
    }

    private static NotificationService.Ref paymentRef(Payment payment) {
        return new NotificationService.Ref(NotificationService.PAYMENT, payment.getId(), payment.getReference());
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }
}
