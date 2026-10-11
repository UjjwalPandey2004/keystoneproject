package com.keystone.deliveryservice.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.function.Predicate;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.keystone.deliveryservice.DTO.CreatePaymentDTO;
import com.keystone.deliveryservice.DTO.MyPaymentSummaryDTO;
import com.keystone.deliveryservice.DTO.PaymentConfigDTO;
import com.keystone.deliveryservice.DTO.PaymentResponseDTO;
import com.keystone.deliveryservice.DTO.PaymentStatsDTO;
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
import com.keystone.deliveryservice.Security.ResourceNotFoundException;

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
        Payment payment = findPayment(paymentId);
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
        Payment payment = findPayment(paymentId);
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

    /** Every payment in the system. Manager only. */
    @Transactional(readOnly = true)
    public List<PaymentResponseDTO> listAll(UserAuth manager) {
        requireManager(manager);
        return paymentRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toDTO).toList();
    }

    /** The signed-in customer's own payments. The customer comes from the JWT, never from the request. */
    @Transactional(readOnly = true)
    public List<PaymentResponseDTO> listMine(UserAuth customer) {
        requireCustomer(customer);
        return paymentRepository.findByPayerIdOrderByCreatedAtDesc(customer.getId()).stream()
                .map(this::toDTO).toList();
    }

    /** Company-wide totals. Manager only. */
    @Transactional(readOnly = true)
    public PaymentStatsDTO stats(UserAuth manager) {
        requireManager(manager);
        List<Payment> all = paymentRepository.findAll();
        return PaymentStatsDTO.builder()
                .totalRevenue(sum(all, p -> p.getStatus() == PaymentStatus.PAID))
                .totalPayments(all.size())
                .paidPayments(count(all, p -> p.getStatus() == PaymentStatus.PAID))
                .cashPayments(count(all, p -> p.getMethod() == PaymentMethod.CASH))
                .upiPayments(count(all, p -> p.getMethod() == PaymentMethod.UPI))
                .qrPayments(count(all, p -> p.getMethod() == PaymentMethod.UPI_QR))
                .cardPayments(count(all, p -> p.getMethod() == PaymentMethod.CARD))
                .cashRevenue(sum(all, p -> p.getStatus() == PaymentStatus.PAID && p.getMethod() == PaymentMethod.CASH))
                .upiRevenue(sum(all, p -> p.getStatus() == PaymentStatus.PAID && p.getMethod() == PaymentMethod.UPI))
                .qrRevenue(sum(all, p -> p.getStatus() == PaymentStatus.PAID && p.getMethod() == PaymentMethod.UPI_QR))
                .cardRevenue(sum(all, p -> p.getStatus() == PaymentStatus.PAID && p.getMethod() == PaymentMethod.CARD))
                .pendingPayments(count(all, p -> p.getStatus() == PaymentStatus.PENDING))
                .pendingAmount(sum(all, p -> p.getStatus() == PaymentStatus.PENDING))
                .failedPayments(count(all, p -> p.getStatus() == PaymentStatus.FAILED))
                .cancelledPayments(count(all, p -> p.getStatus() == PaymentStatus.CANCELLED))
                .currency(CURRENCY)
                .build();
    }

    /** Totals over the signed-in customer's own payments only. */
    @Transactional(readOnly = true)
    public MyPaymentSummaryDTO mySummary(UserAuth customer) {
        requireCustomer(customer);
        List<Payment> mine = paymentRepository.findByPayerIdOrderByCreatedAtDesc(customer.getId());
        BigDecimal paid = sum(mine, p -> p.getStatus() == PaymentStatus.PAID);
        BigDecimal pending = sum(mine, p -> p.getStatus() == PaymentStatus.PENDING);
        return MyPaymentSummaryDTO.builder()
                .totalAmount(paid.add(pending))
                .paidAmount(paid)
                .pendingAmount(pending)
                .paymentCount(mine.size())
                .pendingCount(count(mine, p -> p.getStatus() == PaymentStatus.PENDING))
                .currency(CURRENCY)
                .build();
    }

    private static long count(List<Payment> payments, Predicate<Payment> filter) {
        return payments.stream().filter(filter).count();
    }

    private static BigDecimal sum(List<Payment> payments, Predicate<Payment> filter) {
        return payments.stream().filter(filter).map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);
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

    private Payment findPayment(Long paymentId) {
        return paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found"));
    }

    private Payment findVisiblePayment(Long paymentId, UserAuth user) {
        if (user.getRole() != Role.MANAGER && user.getRole() != Role.CUSTOMER) {
            throw new AccessDeniedException("Payments are only available to managers and customers.");
        }
        Payment payment = findPayment(paymentId);
        if (user.getRole() == Role.MANAGER) {
            return payment;
        }
        // Ownership is checked on the server: only the customer who made the payment.
        // Someone else's payment answers 404 like a missing one, so IDs cannot be probed.
        if (payment.getPayer() != null && payment.getPayer().getId().equals(user.getId())) {
            return payment;
        }
        throw new ResourceNotFoundException("Payment not found");
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
            throw new AccessDeniedException("Only managers can manage payments.");
        }
    }

    private static void requireCustomer(UserAuth user) {
        if (user.getRole() != Role.CUSTOMER) {
            throw new AccessDeniedException("Only customers have their own payments.");
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
