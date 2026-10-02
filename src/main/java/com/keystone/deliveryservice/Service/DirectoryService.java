package com.keystone.deliveryservice.Service;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.keystone.deliveryservice.DTO.CustomerAccountDTO;
import com.keystone.deliveryservice.DTO.StaffDTO;
import com.keystone.deliveryservice.ENUM.PaymentStatus;
import com.keystone.deliveryservice.ENUM.Role;
import com.keystone.deliveryservice.ENUM.WorkOrderStatus;
import com.keystone.deliveryservice.Entity.Customer;
import com.keystone.deliveryservice.Entity.Payment;
import com.keystone.deliveryservice.Entity.UserAuth;
import com.keystone.deliveryservice.Repository.CustomerRepository;
import com.keystone.deliveryservice.Repository.PaymentRepository;
import com.keystone.deliveryservice.Repository.UserAuthRepository;
import com.keystone.deliveryservice.Repository.WorkOrderRepository;

/**
 * Manager-only directories: registered customer accounts and staff. Every method checks the
 * caller is a manager, in addition to the controller's @PreAuthorize.
 */
@Service
@Transactional(readOnly = true)
public class DirectoryService {

    private static final List<WorkOrderStatus> OPEN = List.of(WorkOrderStatus.NEW, WorkOrderStatus.ASSIGNED,
            WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.ON_HOLD);

    private final UserAuthRepository userRepository;
    private final CustomerRepository customerRepository;
    private final WorkOrderRepository workOrderRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentService paymentService;
    private final AttendanceService attendanceService;

    public DirectoryService(UserAuthRepository userRepository, CustomerRepository customerRepository,
            WorkOrderRepository workOrderRepository, PaymentRepository paymentRepository, PaymentService paymentService,
            AttendanceService attendanceService) {
        this.userRepository = userRepository;
        this.customerRepository = customerRepository;
        this.workOrderRepository = workOrderRepository;
        this.paymentRepository = paymentRepository;
        this.paymentService = paymentService;
        this.attendanceService = attendanceService;
    }

    /** Registered customer accounts, newest first. */
    public List<CustomerAccountDTO> customerAccounts(UserAuth manager, Integer limit) {
        requireManager(manager);
        List<UserAuth> customers = userRepository.findByRoleNewestFirst(Role.CUSTOMER);
        if (limit != null && limit > 0 && customers.size() > limit) {
            customers = customers.subList(0, limit);
        }
        return customers.stream().map(this::toAccount).toList();
    }

    /** One customer account with their work-order and payment summary. */
    public CustomerAccountDTO customerAccount(UserAuth manager, Long userId) {
        requireManager(manager);
        UserAuth user = userRepository.findById(userId)
                .filter(u -> u.getRole() == Role.CUSTOMER)
                .orElseThrow(() -> new IllegalArgumentException("Customer not found"));
        CustomerAccountDTO dto = toAccount(user);
        List<Payment> payments = paymentRepository.findByPayerIdOrderByCreatedAtDesc(user.getId());
        dto.setPayments(payments.stream().map(paymentService::toDTO).toList());
        dto.setTotalPaid(payments.stream().filter(p -> p.getStatus() == PaymentStatus.PAID)
                .map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add));
        if (user.getCustomerId() != null) {
            var page = workOrderRepository.findByCustomerId(user.getCustomerId(),
                    PageRequest.of(0, 10, Sort.by("createdAt").descending()));
            dto.setTotalWorkOrders(page.getTotalElements());
            dto.setOpenWorkOrders(workOrderRepository.findByCustomerId(user.getCustomerId(), PageRequest.of(0, 500))
                    .stream().filter(w -> OPEN.contains(w.getStatus())).count());
            dto.setRecentWorkOrders(page.getContent().stream()
                    .map(w -> CustomerAccountDTO.WorkOrderSummary.builder()
                            .id(w.getId()).code(w.getCode()).title(w.getTitle())
                            .status(w.getStatus().name()).createdAt(w.getCreatedAt()).build())
                    .toList());
        } else {
            dto.setTotalWorkOrders(0L);
            dto.setOpenWorkOrders(0L);
            dto.setRecentWorkOrders(List.of());
        }
        return dto;
    }

    /** Technicians and dispatchers with location, workload and today's attendance. Never customers. */
    public List<StaffDTO> staff(UserAuth manager) {
        requireManager(manager);
        Map<Long, String> today = attendanceService.todayStatusByUser();
        return userRepository.findByRoleIn(AttendanceService.STAFF_ROLES).stream()
                .sorted(Comparator.comparing(UserAuth::getRole).thenComparing(UserAuth::getUserName, String.CASE_INSENSITIVE_ORDER))
                .map(u -> StaffDTO.builder()
                        .id(u.getId())
                        .name(u.getUserName())
                        .role(u.getRole())
                        .email(u.getUserEmail())
                        .phone(u.getPhone())
                        .location(u.getRole() == Role.TECHNICIAN ? u.getLocation() : null)
                        .available(u.getRole() == Role.TECHNICIAN ? u.isAvailable() : null)
                        .currentJobs(u.getRole() == Role.TECHNICIAN
                                ? workOrderRepository.countByAssignedToIdAndStatusIn(u.getId(),
                                        List.of(WorkOrderStatus.ASSIGNED, WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.ON_HOLD))
                                : null)
                        .todayAttendance(today.getOrDefault(u.getId(), "NOT_MARKED"))
                        .joinedAt(u.getCreatedAt())
                        .build())
                .toList();
    }

    private CustomerAccountDTO toAccount(UserAuth user) {
        Customer organisation = user.getCustomerId() != null
                ? customerRepository.findById(user.getCustomerId()).orElse(null) : null;
        String status = !user.isEmailVerified() ? "UNVERIFIED" : organisation == null ? "UNLINKED" : "ACTIVE";
        return CustomerAccountDTO.builder()
                .id(user.getId())
                .name(user.getUserName())
                .email(user.getUserEmail())
                .phone(user.getPhone())
                .organisationId(organisation != null ? organisation.getId() : null)
                .organisationName(organisation != null ? organisation.getCompanyName() : null)
                .emailVerified(user.isEmailVerified())
                .status(status)
                .joinedAt(user.getCreatedAt())
                .build();
    }

    private static void requireManager(UserAuth user) {
        if (user.getRole() != Role.MANAGER) {
            throw new AccessDeniedException("Only managers can see customer and staff directories.");
        }
    }
}
