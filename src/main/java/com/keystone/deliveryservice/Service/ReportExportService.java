package com.keystone.deliveryservice.Service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.keystone.deliveryservice.ENUM.Role;
import com.keystone.deliveryservice.ENUM.WorkOrderStatus;
import com.keystone.deliveryservice.Entity.Interview;
import com.keystone.deliveryservice.Entity.JobApplication;
import com.keystone.deliveryservice.Entity.Payment;
import com.keystone.deliveryservice.Entity.UserAuth;
import com.keystone.deliveryservice.Entity.WorkOrder;
import com.keystone.deliveryservice.Repository.InterviewRepository;
import com.keystone.deliveryservice.Repository.JobApplicationRepository;
import com.keystone.deliveryservice.Repository.PaymentRepository;
import com.keystone.deliveryservice.Repository.UserAuthRepository;
import com.keystone.deliveryservice.Repository.WorkOrderRepository;

/**
 * CSV exports (open directly in Excel). Each export checks the caller's role itself, so the same
 * permissions apply as on the dashboard: operations and payments for managers, recruitment for HR and managers.
 */
@Service
@Transactional(readOnly = true)
public class ReportExportService {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final WorkOrderRepository workOrderRepository;
    private final PaymentRepository paymentRepository;
    private final UserAuthRepository userRepository;
    private final JobApplicationRepository applicationRepository;
    private final InterviewRepository interviewRepository;

    public ReportExportService(WorkOrderRepository workOrderRepository, PaymentRepository paymentRepository,
            UserAuthRepository userRepository, JobApplicationRepository applicationRepository,
            InterviewRepository interviewRepository) {
        this.workOrderRepository = workOrderRepository;
        this.paymentRepository = paymentRepository;
        this.userRepository = userRepository;
        this.applicationRepository = applicationRepository;
        this.interviewRepository = interviewRepository;
    }

    public byte[] workOrdersCsv(LocalDate from, LocalDate to, UserAuth user) {
        requireRole(user, Role.MANAGER);
        List<WorkOrder> rows = workOrderRepository.findAll().stream()
                .filter(w -> inRange(w.getCreatedAt(), from, to))
                .sorted(Comparator.comparing(WorkOrder::getCreatedAt).reversed())
                .toList();
        return csv(List.of("Code", "Title", "Customer", "Site", "Priority", "Status", "Technician", "Created",
                "SLA due", "SLA breached", "Completed", "Closed", "Closed by", "Cancelled", "Cancelled by",
                "Cancellation reason", "Parts cost", "Labour minutes"),
                rows, w -> List.of(w.getCode(), w.getTitle(), w.getCustomer().getCompanyName(), w.getSite().getSiteName(),
                        String.valueOf(w.getPriority()), String.valueOf(w.getStatus()),
                        w.getAssignedTo() != null ? w.getAssignedTo().getUserName() : "", time(w.getCreatedAt()),
                        time(w.getSlaDueDate()), w.isSlaBreached() ? "Yes" : "No", time(w.getCompletedAt()),
                        time(w.getClosedAt()), w.getClosedBy() != null ? w.getClosedBy().getUserName() : "",
                        time(w.getCancelledAt()), w.getCancelledBy() != null ? w.getCancelledBy().getUserName() : "",
                        nz(w.getCancellationReason()), String.valueOf(w.getTotalPartsCost()),
                        String.valueOf(w.getTotalLaborMinutes())));
    }

    public byte[] paymentsCsv(LocalDate from, LocalDate to, UserAuth user) {
        requireRole(user, Role.MANAGER);
        List<Payment> rows = paymentRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(p -> inRange(p.getCreatedAt(), from, to))
                .toList();
        return csv(List.of("Payment ID", "Customer", "Customer ID", "Paid by", "Work order", "Service", "Amount (INR)",
                "Method", "Transaction ref", "Status", "Created", "Paid", "Verified by", "Failure reason"),
                rows, p -> List.of(p.getReference(), p.getCustomer().getCompanyName(), String.valueOf(p.getCustomer().getId()),
                        p.getPayer().getUserName(), p.getWorkOrder().getCode(), p.getWorkOrder().getTitle(),
                        p.getAmount().toPlainString(), String.valueOf(p.getMethod()), nz(p.getTransactionRef()),
                        String.valueOf(p.getStatus()), time(p.getCreatedAt()), time(p.getPaidAt()),
                        p.getVerifiedBy() != null ? p.getVerifiedBy().getUserName() : "", nz(p.getFailureReason())));
    }

    /** Open and finished jobs per technician over the period. */
    public byte[] technicianWorkloadCsv(LocalDate from, LocalDate to, UserAuth user) {
        requireRole(user, Role.MANAGER);
        Map<Long, List<WorkOrder>> byTech = workOrderRepository.findAll().stream()
                .filter(w -> w.getAssignedTo() != null && inRange(w.getCreatedAt(), from, to))
                .collect(Collectors.groupingBy(w -> w.getAssignedTo().getId()));
        List<UserAuth> technicians = userRepository.findByRole(Role.TECHNICIAN).stream()
                .sorted(Comparator.comparing(UserAuth::getUserName, String.CASE_INSENSITIVE_ORDER)).toList();
        return csv(List.of("Technician", "Email", "Location", "Available", "Assigned", "In progress", "On hold",
                "Completed", "Closed", "Cancelled", "SLA breached", "Labour minutes"),
                technicians, t -> {
                    List<WorkOrder> jobs = byTech.getOrDefault(t.getId(), List.of());
                    Function<WorkOrderStatus, String> count = s -> String.valueOf(jobs.stream().filter(w -> w.getStatus() == s).count());
                    return List.of(t.getUserName(), t.getUserEmail(), nz(t.getLocation()), t.isAvailable() ? "Yes" : "No",
                            count.apply(WorkOrderStatus.ASSIGNED), count.apply(WorkOrderStatus.IN_PROGRESS),
                            count.apply(WorkOrderStatus.ON_HOLD), count.apply(WorkOrderStatus.COMPLETED),
                            count.apply(WorkOrderStatus.CLOSED), count.apply(WorkOrderStatus.CANCELLED),
                            String.valueOf(jobs.stream().filter(WorkOrder::isSlaBreached).count()),
                            String.valueOf(jobs.stream().mapToInt(w -> w.getTotalLaborMinutes() == null ? 0 : w.getTotalLaborMinutes()).sum()));
                });
    }

    public byte[] applicationsCsv(UserAuth user) {
        requireRole(user, Role.HR, Role.MANAGER);
        List<JobApplication> rows = applicationRepository.findAllByOrderByCreatedAtDesc();
        return csv(List.of("Reference", "Candidate", "Email", "Phone", "Job", "Department", "Status", "Applied",
                "Last update", "Rejection reason", "Employee account"),
                rows, a -> List.of(a.getReference(), a.getFullName(), a.getEmail(), a.getPhone(), a.getJobOpening().getTitle(),
                        a.getJobOpening().getDepartment(), String.valueOf(a.getStatus()), time(a.getCreatedAt()),
                        time(a.getUpdatedAt()), nz(a.getRejectionReason()),
                        a.getEmployeeAccount() != null ? a.getEmployeeAccount().getUserEmail() : ""));
    }

    public byte[] interviewsCsv(UserAuth user) {
        requireRole(user, Role.HR, Role.MANAGER);
        List<Interview> rows = interviewRepository.findAllByOrderByScheduledAtAsc();
        return csv(List.of("Application", "Candidate", "Job", "Date and time", "Minutes", "Type", "Where / link",
                "Interviewer", "Status", "Times rescheduled", "Candidate emailed"),
                rows, i -> List.of(i.getApplication().getReference(), i.getApplication().getFullName(),
                        i.getApplication().getJobOpening().getTitle(), time(i.getScheduledAt()),
                        String.valueOf(i.getDurationMinutes()), String.valueOf(i.getType()), i.getLocationOrLink(),
                        i.getInterviewer(), String.valueOf(i.getStatus()), String.valueOf(i.getRescheduleCount()),
                        i.isCandidateEmailed() ? "Yes" : "No"));
    }

    private static void requireRole(UserAuth user, Role... roles) {
        for (Role role : roles) {
            if (user.getRole() == role) {
                return;
            }
        }
        throw new AccessDeniedException("You do not have permission to export this report.");
    }

    private static boolean inRange(LocalDateTime at, LocalDate from, LocalDate to) {
        if (at == null) {
            return from == null && to == null;
        }
        LocalDate day = at.toLocalDate();
        return (from == null || !day.isBefore(from)) && (to == null || !day.isAfter(to));
    }

    private static <T> byte[] csv(List<String> header, List<T> rows, Function<T, List<String>> columns) {
        StringBuilder out = new StringBuilder("﻿"); // BOM so Excel reads UTF-8 (e.g. the rupee sign)
        out.append(header.stream().map(ReportExportService::cell).collect(Collectors.joining(","))).append("\r\n");
        for (T row : rows) {
            out.append(columns.apply(row).stream().map(ReportExportService::cell).collect(Collectors.joining(","))).append("\r\n");
        }
        return out.toString().getBytes(StandardCharsets.UTF_8);
    }

    /** Quotes a value and defuses spreadsheet formulas (=, +, -, @) so an export cannot run code in Excel. */
    static String cell(String value) {
        String v = value == null ? "" : value;
        if (!v.isEmpty() && "=+-@\t\r".indexOf(v.charAt(0)) >= 0) {
            v = "'" + v;
        }
        return "\"" + v.replace("\"", "\"\"") + "\"";
    }

    private static String time(LocalDateTime at) {
        return at == null ? "" : at.format(TIME);
    }

    private static String nz(String value) {
        return value == null ? "" : value;
    }
}
