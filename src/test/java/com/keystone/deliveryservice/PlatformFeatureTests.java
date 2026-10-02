package com.keystone.deliveryservice;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import com.keystone.deliveryservice.DTO.CreatePaymentDTO;
import com.keystone.deliveryservice.ENUM.PaymentMethod;
import com.keystone.deliveryservice.ENUM.PaymentStatus;
import com.keystone.deliveryservice.ENUM.Role;
import com.keystone.deliveryservice.ENUM.WorkOrderStatus;
import com.keystone.deliveryservice.Entity.Customer;
import com.keystone.deliveryservice.Entity.Payment;
import com.keystone.deliveryservice.Entity.Site;
import com.keystone.deliveryservice.Entity.UserAuth;
import com.keystone.deliveryservice.Entity.WorkOrder;
import com.keystone.deliveryservice.Repository.PaymentRepository;
import com.keystone.deliveryservice.Repository.UserAuthRepository;
import com.keystone.deliveryservice.Repository.WorkOrderRepository;
import com.keystone.deliveryservice.Service.EmailLogService;
import com.keystone.deliveryservice.Service.EmailVerificationService;
import com.keystone.deliveryservice.Service.NotificationService;
import com.keystone.deliveryservice.Service.PaymentService;
import com.keystone.deliveryservice.Service.ReceiptPdfService;

class PlatformFeatureTests {

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);

    // ---------- Email verification (OTP) ----------

    private EmailVerificationService verificationService(UserAuthRepository users, EmailLogService mail) {
        return new EmailVerificationService(users, encoder, mail, mock(NotificationService.class), false, false);
    }

    @Test
    void otpIsStoredHashedAndVerifiesOnceOnly() {
        UserAuthRepository users = mock(UserAuthRepository.class);
        EmailLogService mail = mock(EmailLogService.class);
        UserAuth user = UserAuth.builder().id(7L).userName("Asha").userEmail("asha@example.com")
                .role(Role.CUSTOMER).emailVerified(false).build();
        when(users.findByUserEmail("asha@example.com")).thenReturn(Optional.of(user));

        EmailVerificationService service = verificationService(users, mail);
        service.issueCode(user);

        ArgumentCaptor<String> code = ArgumentCaptor.forClass(String.class);
        verify(mail).sendVerificationCode(eq("asha@example.com"), eq("Asha"), code.capture(), anyLong());
        assertTrue(code.getValue().matches("\\d{6}"));
        // Only a BCrypt hash is kept.
        assertFalse(user.getOtpHash().contains(code.getValue()));

        service.verify("asha@example.com", code.getValue());
        assertTrue(user.isEmailVerified());
        assertNull(user.getOtpHash());
    }

    @Test
    void wrongExpiredAndExhaustedOtpsAreRejected() {
        UserAuthRepository users = mock(UserAuthRepository.class);
        UserAuth user = UserAuth.builder().id(7L).userName("Asha").userEmail("asha@example.com")
                .role(Role.CUSTOMER).emailVerified(false)
                .otpHash(encoder.encode("123456")).otpExpiresAt(LocalDateTime.now().plusMinutes(5)).build();
        when(users.findByUserEmail("asha@example.com")).thenReturn(Optional.of(user));
        EmailVerificationService service = verificationService(users, mock(EmailLogService.class));

        IllegalArgumentException wrong = assertThrows(IllegalArgumentException.class,
                () -> service.verify("asha@example.com", "000000"));
        assertTrue(wrong.getMessage().startsWith("Invalid verification code"));
        assertEquals(1, user.getOtpAttempts());

        user.setOtpAttempts(5);
        assertThrows(IllegalArgumentException.class, () -> service.verify("asha@example.com", "123456"));
        assertFalse(user.isEmailVerified());

        user.setOtpAttempts(0);
        user.setOtpExpiresAt(LocalDateTime.now().minusSeconds(1));
        IllegalArgumentException expired = assertThrows(IllegalArgumentException.class,
                () -> service.verify("asha@example.com", "123456"));
        assertTrue(expired.getMessage().contains("expired"));
        assertFalse(user.isEmailVerified());
    }

    @Test
    void resendRespectsCooldown() {
        UserAuthRepository users = mock(UserAuthRepository.class);
        EmailLogService mail = mock(EmailLogService.class);
        UserAuth user = UserAuth.builder().id(7L).userName("Asha").userEmail("asha@example.com")
                .role(Role.CUSTOMER).emailVerified(false).otpSentAt(LocalDateTime.now()).build();
        when(users.findByUserEmail("asha@example.com")).thenReturn(Optional.of(user));

        assertThrows(IllegalStateException.class, () -> verificationService(users, mail).resend("asha@example.com"));
        verify(mail, never()).sendVerificationCode(anyString(), anyString(), anyString(), anyLong());
    }

    // ---------- Payments ----------

    private static Customer org(long id, String name) {
        return Customer.builder().id(id).companyName(name).email(name + "@example.com").build();
    }

    private static UserAuth customerUser(long id, long orgId) {
        return UserAuth.builder().id(id).userName("Customer " + id).userEmail("c" + id + "@example.com")
                .role(Role.CUSTOMER).customerId(orgId).build();
    }

    private static Payment payment(Customer customer, UserAuth payer, PaymentStatus status) {
        WorkOrder workOrder = WorkOrder.builder().id(50L).code("WO-1050").title("Chiller repair")
                .status(WorkOrderStatus.COMPLETED).customer(customer)
                .site(Site.builder().id(1L).siteName("Tower A").build()).build();
        return Payment.builder().id(3L).reference("KS-PAY-001003").workOrder(workOrder).customer(customer).payer(payer)
                .amount(new BigDecimal("1500.00")).method(PaymentMethod.CASH).status(status).build();
    }

    private static UserAuth manager() {
        return UserAuth.builder().id(1L).userName("Dhruv").userEmail("admin@example.com").role(Role.MANAGER).build();
    }

    private PaymentService service(PaymentRepository payments, WorkOrderRepository workOrders, String vpa) {
        return new PaymentService(payments, workOrders, mock(NotificationService.class), vpa, "KEYSTONE");
    }

    @Test
    void customerPaysWithChosenUpiAppAndItStaysPendingUntilManagerConfirms() {
        PaymentRepository payments = mock(PaymentRepository.class);
        WorkOrderRepository workOrders = mock(WorkOrderRepository.class);
        UserAuth customerA = customerUser(4L, 1L);
        Payment template = payment(org(1L, "Apex"), customerA, PaymentStatus.PENDING);
        when(workOrders.findById(50L)).thenReturn(Optional.of(template.getWorkOrder()));
        when(payments.nextReferenceValue()).thenReturn(1003L);
        when(payments.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        PaymentService service = service(payments, workOrders, "keystone@okhdfcbank");

        var upi = service.create(CreatePaymentDTO.builder().workOrderId(50L).amount(new BigDecimal("1500"))
                .method(PaymentMethod.UPI).upiApp(com.keystone.deliveryservice.ENUM.UpiApp.PHONEPE).build(), customerA);
        assertEquals(PaymentStatus.PENDING, upi.getStatus());
        assertNull(upi.getPaidAt());
        assertEquals(com.keystone.deliveryservice.ENUM.UpiApp.PHONEPE, upi.getUpiApp());
        assertEquals("Customer 4", upi.getPayerName());
        assertEquals("Chiller repair", upi.getWorkOrderTitle());
        assertTrue(upi.getUpiUri().startsWith("upi://pay?pa=keystone%40okhdfcbank&pn=KEYSTONE&am=1500.00&cu=INR"));

        var card = service.create(CreatePaymentDTO.builder().workOrderId(50L).amount(new BigDecimal("900"))
                .method(PaymentMethod.CARD).build(), customerA);
        assertEquals(PaymentStatus.PENDING, card.getStatus());
        assertNull(card.getUpiApp());
    }

    @Test
    void managersDispatchersAndTechniciansCannotPay() {
        WorkOrderRepository workOrders = mock(WorkOrderRepository.class);
        PaymentService service = service(mock(PaymentRepository.class), workOrders, "keystone@okhdfcbank");
        for (Role role : List.of(Role.MANAGER, Role.DISPATCHER, Role.TECHNICIAN)) {
            UserAuth user = UserAuth.builder().id(9L).role(role).build();
            assertThrows(AccessDeniedException.class, () -> service.create(CreatePaymentDTO.builder().workOrderId(50L)
                    .amount(BigDecimal.TEN).method(PaymentMethod.CASH).build(), user));
        }
    }

    @Test
    void customerCannotSeeAnotherCustomersPayment() {
        PaymentRepository payments = mock(PaymentRepository.class);
        UserAuth customerA = customerUser(4L, 1L);
        UserAuth customerB = customerUser(5L, 2L);
        when(payments.findById(3L)).thenReturn(Optional.of(payment(org(1L, "Apex"), customerA, PaymentStatus.PAID)));
        PaymentService service = service(payments, mock(WorkOrderRepository.class), "");

        assertEquals("KS-PAY-001003", service.get(3L, customerA).getReference());
        assertEquals("KS-PAY-001003", service.get(3L, manager()).getReference());
        assertThrows(AccessDeniedException.class, () -> service.get(3L, customerB));
        assertThrows(AccessDeniedException.class, () -> service.paidPaymentForReceipt(3L, customerB));
        assertThrows(AccessDeniedException.class, () -> service.list(UserAuth.builder().id(2L).role(Role.DISPATCHER).build()));
        assertThrows(AccessDeniedException.class, () -> service.list(UserAuth.builder().id(3L).role(Role.TECHNICIAN).build()));
    }

    @Test
    void upiIsRefusedWhenNotConfiguredAndOtherOrgsWorkOrdersCannotBePaid() {
        WorkOrderRepository workOrders = mock(WorkOrderRepository.class);
        Payment template = payment(org(1L, "Apex"), customerUser(4L, 1L), PaymentStatus.PENDING);
        when(workOrders.findById(50L)).thenReturn(Optional.of(template.getWorkOrder()));
        PaymentService service = service(mock(PaymentRepository.class), workOrders, "");

        assertThrows(IllegalStateException.class, () -> service.create(CreatePaymentDTO.builder().workOrderId(50L)
                .amount(BigDecimal.TEN).method(PaymentMethod.UPI_QR).build(), customerUser(4L, 1L)));
        assertThrows(AccessDeniedException.class, () -> service.create(CreatePaymentDTO.builder().workOrderId(50L)
                .amount(BigDecimal.TEN).method(PaymentMethod.CASH).build(), customerUser(5L, 2L)));
    }

    @Test
    void receiptIsOnlyForPaidPaymentsAndIsAValidPdf() {
        PaymentRepository payments = mock(PaymentRepository.class);
        UserAuth customerA = customerUser(4L, 1L);
        Payment pending = payment(org(1L, "Apex"), customerA, PaymentStatus.PENDING);
        when(payments.findById(3L)).thenReturn(Optional.of(pending));
        PaymentService service = service(payments, mock(WorkOrderRepository.class), "");
        assertThrows(IllegalStateException.class, () -> service.paidPaymentForReceipt(3L, customerA));

        pending.setStatus(PaymentStatus.PAID);
        pending.setPaidAt(LocalDateTime.now());
        pending.setVerifiedBy(manager());
        byte[] pdf = new ReceiptPdfService().render(service.paidPaymentForReceipt(3L, customerA));
        String text = new String(pdf, StandardCharsets.ISO_8859_1);
        assertTrue(text.startsWith("%PDF-1.4"));
        assertTrue(text.contains("KS-PAY-001003"));
        assertTrue(text.contains("INR 1500.00"));
        assertTrue(text.contains("Chiller repair"));
        assertTrue(text.trim().endsWith("%%EOF"));
    }
    @Test
    void customerSeesOnlyPaymentsTheyMadeEvenWithinTheSameOrganisation() {
        PaymentRepository payments = mock(PaymentRepository.class);
        UserAuth colleague = customerUser(6L, 1L);
        when(payments.findById(3L)).thenReturn(Optional.of(payment(org(1L, "Apex"), customerUser(4L, 1L), PaymentStatus.PAID)));
        when(payments.findByPayerIdOrderByCreatedAtDesc(6L)).thenReturn(List.of());
        PaymentService service = service(payments, mock(WorkOrderRepository.class), "");

        assertThrows(AccessDeniedException.class, () -> service.get(3L, colleague));
        assertThrows(AccessDeniedException.class, () -> service.paidPaymentForReceipt(3L, colleague));
        assertTrue(service.list(colleague).isEmpty());
        verify(payments, never()).findByCustomerIdOrderByCreatedAtDesc(anyLong());
    }

    // ---------- Attendance and manager directories ----------

    private com.keystone.deliveryservice.Service.AttendanceService attendance(
            com.keystone.deliveryservice.Repository.AttendanceRepository repo, UserAuthRepository users) {
        return new com.keystone.deliveryservice.Service.AttendanceService(repo, users, mock(NotificationService.class));
    }

    @Test
    void customersCannotUseAttendanceAndStaffSeeOnlyTheirOwn() {
        var repo = mock(com.keystone.deliveryservice.Repository.AttendanceRepository.class);
        var service = attendance(repo, mock(UserAuthRepository.class));
        UserAuth customer = customerUser(4L, 1L);
        UserAuth tech = UserAuth.builder().id(3L).userName("Tech").role(Role.TECHNICIAN).build();

        assertThrows(AccessDeniedException.class, () -> service.checkIn(customer));
        assertThrows(AccessDeniedException.class, () -> service.mine(customer, 7));
        assertThrows(AccessDeniedException.class, () -> service.forDay(customer, java.time.LocalDate.now()));
        assertThrows(AccessDeniedException.class, () -> service.forDay(tech, java.time.LocalDate.now()));

        when(repo.findByUserIdAndWorkDate(eq(3L), any())).thenReturn(Optional.empty());
        when(repo.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        var checkedIn = service.checkIn(tech);
        assertEquals("PRESENT", checkedIn.getStatus());
        assertEquals(3L, checkedIn.getUserId());
    }

    @Test
    void shortDayBecomesHalfDayAndDoubleCheckInIsRefused() {
        var repo = mock(com.keystone.deliveryservice.Repository.AttendanceRepository.class);
        var service = attendance(repo, mock(UserAuthRepository.class));
        UserAuth tech = UserAuth.builder().id(3L).userName("Tech").role(Role.TECHNICIAN).build();
        var record = com.keystone.deliveryservice.Entity.Attendance.builder().user(tech).workDate(java.time.LocalDate.now())
                .checkIn(LocalDateTime.now().minusHours(2)).status(com.keystone.deliveryservice.ENUM.AttendanceStatus.PRESENT).build();
        when(repo.findByUserIdAndWorkDate(eq(3L), any())).thenReturn(Optional.of(record));
        when(repo.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        assertThrows(IllegalStateException.class, () -> service.checkIn(tech));
        assertEquals("HALF_DAY", service.checkOut(tech).getStatus());
        assertThrows(IllegalStateException.class, () -> service.checkOut(tech));
    }

    @Test
    void managerSeesEveryStaffMemberIncludingNotMarked() {
        var repo = mock(com.keystone.deliveryservice.Repository.AttendanceRepository.class);
        UserAuthRepository users = mock(UserAuthRepository.class);
        UserAuth tech = UserAuth.builder().id(3L).userName("Tech").role(Role.TECHNICIAN).location("Jaipur").build();
        UserAuth dispatcher = UserAuth.builder().id(2L).userName("Disp").role(Role.DISPATCHER).build();
        when(users.findByRoleIn(any())).thenReturn(List.of(tech, dispatcher));
        when(repo.findByWorkDate(any())).thenReturn(List.of());

        var day = attendance(repo, users).forDay(manager(), java.time.LocalDate.now());
        assertEquals(2, day.size());
        assertTrue(day.stream().allMatch(a -> a.getStatus().equals("NOT_MARKED")));
    }

    @Test
    void onlyManagersCanReadCustomerAndStaffDirectories() {
        var directory = new com.keystone.deliveryservice.Service.DirectoryService(mock(UserAuthRepository.class),
                mock(com.keystone.deliveryservice.Repository.CustomerRepository.class), mock(WorkOrderRepository.class),
                mock(PaymentRepository.class), service(mock(PaymentRepository.class), mock(WorkOrderRepository.class), ""),
                attendance(mock(com.keystone.deliveryservice.Repository.AttendanceRepository.class), mock(UserAuthRepository.class)));
        for (Role role : List.of(Role.CUSTOMER, Role.DISPATCHER, Role.TECHNICIAN)) {
            UserAuth user = UserAuth.builder().id(9L).role(role).customerId(1L).build();
            assertThrows(AccessDeniedException.class, () -> directory.customerAccounts(user, null));
            assertThrows(AccessDeniedException.class, () -> directory.customerAccount(user, 4L));
            assertThrows(AccessDeniedException.class, () -> directory.staff(user));
        }
    }
    @Test
    void notificationsAreOnlyCreatedForTheIntendedRecipients() {
        var notifications = mock(com.keystone.deliveryservice.Repository.NotificationRepository.class);
        UserAuthRepository users = mock(UserAuthRepository.class);
        UserAuth orgAUser1 = customerUser(4L, 1L);
        UserAuth orgAUser2 = customerUser(6L, 1L);
        when(users.findByCustomerId(1L)).thenReturn(List.of(orgAUser1, orgAUser2));

        new NotificationService(notifications, users).notifyCustomerOrganisation(1L, orgAUser1,
                com.keystone.deliveryservice.ENUM.NotificationType.PAYMENT_RECEIVED, "t", "m", NotificationService.Ref.none());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<com.keystone.deliveryservice.Entity.Notification>> saved = ArgumentCaptor.forClass(List.class);
        verify(notifications).saveAll(saved.capture());
        // The actor is skipped, and only users of organisation 1 are notified.
        assertEquals(1, saved.getValue().size());
        assertEquals(6L, saved.getValue().get(0).getRecipient().getId());
    }
}
