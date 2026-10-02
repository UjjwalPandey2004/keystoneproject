package com.keystone.deliveryservice.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.keystone.deliveryservice.DTO.AttendanceDTO;
import com.keystone.deliveryservice.DTO.MarkAttendanceDTO;
import com.keystone.deliveryservice.ENUM.AttendanceStatus;
import com.keystone.deliveryservice.ENUM.NotificationType;
import com.keystone.deliveryservice.ENUM.Role;
import com.keystone.deliveryservice.Entity.Attendance;
import com.keystone.deliveryservice.Entity.UserAuth;
import com.keystone.deliveryservice.Repository.AttendanceRepository;
import com.keystone.deliveryservice.Repository.UserAuthRepository;

/**
 * Daily attendance for staff (technicians and dispatchers). Staff check themselves in and out and
 * see only their own records; managers see everyone and can mark leave or absence. Customers have
 * no access at all.
 */
@Service
@Transactional
public class AttendanceService {

    public static final Set<Role> STAFF_ROLES = Set.of(Role.TECHNICIAN, Role.DISPATCHER);
    // Less than this between check-in and check-out counts as a half day.
    static final double FULL_DAY_HOURS = 4.0;

    private final AttendanceRepository attendanceRepository;
    private final UserAuthRepository userRepository;
    private final NotificationService notificationService;

    public AttendanceService(AttendanceRepository attendanceRepository, UserAuthRepository userRepository,
            NotificationService notificationService) {
        this.attendanceRepository = attendanceRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    public AttendanceDTO checkIn(UserAuth staff) {
        requireStaff(staff);
        LocalDate today = LocalDate.now();
        Attendance record = attendanceRepository.findByUserIdAndWorkDate(staff.getId(), today).orElse(null);
        if (record != null && record.getCheckIn() != null) {
            throw new IllegalStateException("You have already checked in today.");
        }
        if (record != null && record.getStatus() == AttendanceStatus.ON_LEAVE) {
            throw new IllegalStateException("You are marked on leave today. Ask your manager to change it first.");
        }
        if (record == null) {
            record = Attendance.builder().user(staff).workDate(today).build();
        }
        record.setCheckIn(LocalDateTime.now());
        record.setStatus(AttendanceStatus.PRESENT);
        return toDTO(attendanceRepository.save(record), staff);
    }

    public AttendanceDTO checkOut(UserAuth staff) {
        requireStaff(staff);
        Attendance record = attendanceRepository.findByUserIdAndWorkDate(staff.getId(), LocalDate.now())
                .filter(a -> a.getCheckIn() != null)
                .orElseThrow(() -> new IllegalStateException("Check in first."));
        if (record.getCheckOut() != null) {
            throw new IllegalStateException("You have already checked out today.");
        }
        record.setCheckOut(LocalDateTime.now());
        if (hours(record) < FULL_DAY_HOURS) {
            record.setStatus(AttendanceStatus.HALF_DAY);
        }
        return toDTO(attendanceRepository.save(record), staff);
    }

    /** The signed-in staff member's own recent attendance. */
    @Transactional(readOnly = true)
    public List<AttendanceDTO> mine(UserAuth staff, int days) {
        requireStaff(staff);
        LocalDate today = LocalDate.now();
        return attendanceRepository
                .findByUserIdAndWorkDateBetweenOrderByWorkDateDesc(staff.getId(), today.minusDays(Math.max(days, 1) - 1L), today)
                .stream().map(a -> toDTO(a, staff)).toList();
    }

    /** Manager: every staff member for one day, including those with no record yet. */
    @Transactional(readOnly = true)
    public List<AttendanceDTO> forDay(UserAuth manager, LocalDate date) {
        requireManager(manager);
        Map<Long, Attendance> byUser = attendanceRepository.findByWorkDate(date).stream()
                .collect(Collectors.toMap(a -> a.getUser().getId(), Function.identity()));
        return userRepository.findByRoleIn(STAFF_ROLES).stream()
                .sorted(Comparator.comparing(UserAuth::getRole).thenComparing(UserAuth::getUserName, String.CASE_INSENSITIVE_ORDER))
                .map(staff -> {
                    Attendance record = byUser.get(staff.getId());
                    return record != null ? toDTO(record, staff) : notMarked(staff, date);
                })
                .toList();
    }

    /** Manager sets a staff member's status for a day (e.g. ON_LEAVE, ABSENT). */
    public AttendanceDTO mark(UserAuth manager, Long userId, MarkAttendanceDTO request) {
        requireManager(manager);
        UserAuth staff = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Staff member not found"));
        if (!STAFF_ROLES.contains(staff.getRole())) {
            throw new IllegalArgumentException("Attendance is only kept for technicians and dispatchers.");
        }
        if (request.getDate().isAfter(LocalDate.now().plusDays(60))) {
            throw new IllegalArgumentException("Choose a date within the next 60 days.");
        }
        Attendance record = attendanceRepository.findByUserIdAndWorkDate(userId, request.getDate())
                .orElseGet(() -> Attendance.builder().user(staff).workDate(request.getDate()).build());
        record.setStatus(request.getStatus());
        record.setNote(request.getNote() == null || request.getNote().isBlank() ? null : request.getNote().trim());
        record.setMarkedBy(manager);
        record = attendanceRepository.save(record);

        notificationService.notifyUser(staff, NotificationType.ATTENDANCE,
                "Attendance updated for " + request.getDate(),
                manager.getUserName() + " marked you " + request.getStatus().name().replace('_', ' ') + " on "
                        + request.getDate() + (record.getNote() != null ? ": " + record.getNote() : "."),
                NotificationService.Ref.none());
        return toDTO(record, staff);
    }

    /** Today's status for each staff member, for the staff list. */
    @Transactional(readOnly = true)
    public Map<Long, String> todayStatusByUser() {
        return attendanceRepository.findByWorkDate(LocalDate.now()).stream()
                .collect(Collectors.toMap(a -> a.getUser().getId(), a -> a.getStatus().name()));
    }

    private static void requireStaff(UserAuth user) {
        if (!STAFF_ROLES.contains(user.getRole())) {
            throw new AccessDeniedException("Attendance is for technicians and dispatchers.");
        }
    }

    private static void requireManager(UserAuth user) {
        if (user.getRole() != Role.MANAGER) {
            throw new AccessDeniedException("Only managers can see staff attendance.");
        }
    }

    static double hours(Attendance record) {
        if (record.getCheckIn() == null) {
            return 0;
        }
        LocalDateTime end = record.getCheckOut() != null ? record.getCheckOut() : LocalDateTime.now();
        return Duration.between(record.getCheckIn(), end).toMinutes() / 60.0;
    }

    private static AttendanceDTO toDTO(Attendance a, UserAuth staff) {
        return AttendanceDTO.builder()
                .id(a.getId())
                .userId(staff.getId())
                .userName(staff.getUserName())
                .role(staff.getRole())
                .location(staff.getLocation())
                .date(a.getWorkDate())
                .checkIn(a.getCheckIn())
                .checkOut(a.getCheckOut())
                .status(a.getStatus().name())
                .hours(a.getCheckIn() != null ? Math.round(hours(a) * 100) / 100.0 : null)
                .note(a.getNote())
                .markedByName(a.getMarkedBy() != null ? a.getMarkedBy().getUserName() : null)
                .build();
    }

    private static AttendanceDTO notMarked(UserAuth staff, LocalDate date) {
        return AttendanceDTO.builder()
                .userId(staff.getId())
                .userName(staff.getUserName())
                .role(staff.getRole())
                .location(staff.getLocation())
                .date(date)
                .status("NOT_MARKED")
                .build();
    }
}
