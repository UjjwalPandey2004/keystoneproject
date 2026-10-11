package com.keystone.deliveryservice;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;

import com.keystone.deliveryservice.DTO.ApplicationStatusChangeDTO;
import com.keystone.deliveryservice.DTO.EmployeeAccountRequestDTO;
import com.keystone.deliveryservice.DTO.InterviewRequestDTO;
import com.keystone.deliveryservice.DTO.JobApplicationRequestDTO;
import com.keystone.deliveryservice.DTO.JobOpeningRequestDTO;
import com.keystone.deliveryservice.ENUM.ApplicationStatus;
import com.keystone.deliveryservice.ENUM.EmploymentType;
import com.keystone.deliveryservice.ENUM.InterviewStatus;
import com.keystone.deliveryservice.ENUM.InterviewType;
import com.keystone.deliveryservice.ENUM.JobStatus;
import com.keystone.deliveryservice.ENUM.Role;
import com.keystone.deliveryservice.Entity.Interview;
import com.keystone.deliveryservice.Entity.JobApplication;
import com.keystone.deliveryservice.Entity.JobOpening;
import com.keystone.deliveryservice.Entity.UserAuth;
import com.keystone.deliveryservice.Repository.ApplicationHistoryRepository;
import com.keystone.deliveryservice.Repository.InterviewRepository;
import com.keystone.deliveryservice.Repository.JobApplicationRepository;
import com.keystone.deliveryservice.Repository.JobOpeningRepository;
import com.keystone.deliveryservice.Repository.UserAuthRepository;
import com.keystone.deliveryservice.Security.ResourceNotFoundException;
import com.keystone.deliveryservice.Service.EmailLogService;
import com.keystone.deliveryservice.Service.NotificationService;
import com.keystone.deliveryservice.Service.RecruitmentService;
import com.keystone.deliveryservice.Service.UserManagementService;
import com.keystone.deliveryservice.Service.storage.StorageService;

class RecruitmentTests {

    private final JobOpeningRepository jobs = mock(JobOpeningRepository.class);
    private final JobApplicationRepository applications = mock(JobApplicationRepository.class);
    private final InterviewRepository interviews = mock(InterviewRepository.class);
    private final UserAuthRepository users = mock(UserAuthRepository.class);
    private final UserManagementService userManagement = mock(UserManagementService.class);
    private final StorageService storage = mock(StorageService.class);
    private final RecruitmentService service = new RecruitmentService(jobs, applications, interviews,
            mock(ApplicationHistoryRepository.class), users, userManagement, mock(NotificationService.class),
            mock(EmailLogService.class), storage, false);

    private static UserAuth user(long id, Role role) {
        return UserAuth.builder().id(id).userName(role + " " + id).userEmail(role.name().toLowerCase() + id + "@example.com")
                .role(role).build();
    }

    private static final UserAuth HR = user(1L, Role.HR);
    private static final UserAuth MANAGER = user(2L, Role.MANAGER);

    private static JobOpening job(JobStatus status, LocalDate deadline) {
        return JobOpening.builder().id(10L).title("HVAC Technician").department("Field Services").description("Maintain HVAC")
                .location("Jaipur").employmentType(EmploymentType.FULL_TIME).status(status).applicationDeadline(deadline).build();
    }

    private JobApplication application(ApplicationStatus status) {
        JobApplication a = JobApplication.builder().id(20L).reference("KS-APP-000020").jobOpening(job(JobStatus.PUBLISHED, null))
                .fullName("Ravi Kumar").email("ravi@example.com").phone("+91 98765 43210").status(status)
                .resumeFileName("ravi.pdf").resumeContentType("application/pdf").resumeSizeBytes(100L)
                .resumeStorageKey("resumes/x.pdf").build();
        when(applications.findById(20L)).thenReturn(Optional.of(a));
        when(applications.save(any(JobApplication.class))).thenAnswer(i -> i.getArgument(0));
        return a;
    }

    private static JobApplicationRequestDTO form() {
        return JobApplicationRequestDTO.builder().fullName("Ravi Kumar").email("Ravi@Example.com").phone("+91 98765 43210")
                .experience("5 years HVAC").skills("Chillers, VRF").education("Diploma, Mechanical").build();
    }

    private static InterviewRequestDTO interview(LocalDateTime when) {
        return InterviewRequestDTO.builder().scheduledAt(when).durationMinutes(45).type(InterviewType.VIDEO)
                .locationOrLink("https://meet.example.com/abc").interviewer("Priya Shah").build();
    }

    @Test
    void onlyHrAndManagersCanUseRecruitment() {
        for (Role role : List.of(Role.CUSTOMER, Role.TECHNICIAN, Role.DISPATCHER)) {
            UserAuth other = user(9L, role);
            assertThrows(AccessDeniedException.class, () -> service.listJobs(other));
            assertThrows(AccessDeniedException.class, () -> service.listApplications(null, null, null, other));
            assertThrows(AccessDeniedException.class, () -> service.resume(20L, other));
            assertThrows(AccessDeniedException.class, () -> service.stats(other));
        }
    }

    @Test
    void newOpeningsStartAsDraftsAndPastDeadlinesAreRefused() {
        when(jobs.save(any(JobOpening.class))).thenAnswer(i -> i.getArgument(0));
        JobOpeningRequestDTO request = JobOpeningRequestDTO.builder().title("Electrician").department("Field Services")
                .description("Wiring and panels").location("Delhi").employmentType(EmploymentType.FULL_TIME).build();
        assertEquals(JobStatus.DRAFT, service.createJob(request, HR).getStatus());

        request.setApplicationDeadline(LocalDate.now().minusDays(1));
        assertThrows(IllegalArgumentException.class, () -> service.createJob(request, HR));
    }

    @Test
    void candidatesCanOnlyApplyToPublishedOpenOpeningsOnceWithARealResume() throws Exception {
        MockMultipartFile pdf = new MockMultipartFile("resume", "ravi.pdf", "application/pdf",
                "%PDF-1.4 resume".getBytes(StandardCharsets.ISO_8859_1));
        when(applications.nextReferenceValue()).thenReturn(7L);
        when(applications.save(any(JobApplication.class))).thenAnswer(i -> i.getArgument(0));

        when(jobs.findById(10L)).thenReturn(Optional.of(job(JobStatus.DRAFT, null)));
        assertThrows(ResourceNotFoundException.class, () -> service.apply(10L, form(), pdf, null));

        when(jobs.findById(10L)).thenReturn(Optional.of(job(JobStatus.PUBLISHED, LocalDate.now().minusDays(1))));
        assertThrows(IllegalStateException.class, () -> service.apply(10L, form(), pdf, null));

        when(jobs.findById(10L)).thenReturn(Optional.of(job(JobStatus.PUBLISHED, LocalDate.now())));
        var created = service.apply(10L, form(), pdf, null);
        assertEquals("KS-APP-000007", created.getReference());
        assertEquals(ApplicationStatus.APPLIED, created.getStatus());
        assertEquals("ravi@example.com", created.getEmail());

        when(applications.existsByJobOpeningIdAndEmailIgnoreCase(10L, "ravi@example.com")).thenReturn(true);
        assertThrows(IllegalStateException.class, () -> service.apply(10L, form(), pdf, null));
    }

    @Test
    void resumesAreCheckedByContentNotByName() {
        when(jobs.findById(10L)).thenReturn(Optional.of(job(JobStatus.PUBLISHED, null)));
        // An executable renamed to .pdf, a text file named .docx, and an oversized PDF are all refused.
        MockMultipartFile exe = new MockMultipartFile("resume", "cv.pdf", "application/pdf", new byte[] {'M', 'Z', 0, 0, 0, 0});
        MockMultipartFile fakeDocx = new MockMultipartFile("resume", "cv.docx", "application/octet-stream", "hello".getBytes());
        byte[] big = new byte[5 * 1024 * 1024 + 1];
        big[0] = '%'; big[1] = 'P'; big[2] = 'D'; big[3] = 'F'; big[4] = '-';
        MockMultipartFile tooBig = new MockMultipartFile("resume", "cv.pdf", "application/pdf", big);
        assertThrows(IllegalArgumentException.class, () -> service.apply(10L, form(), exe, null));
        assertThrows(IllegalArgumentException.class, () -> service.apply(10L, form(), fakeDocx, null));
        assertThrows(IllegalArgumentException.class, () -> service.apply(10L, form(), tooBig, null));
        assertThrows(IllegalArgumentException.class, () -> service.apply(10L, form(), null, null));
    }

    @Test
    void pipelineMustBeFollowedAndHiringNeedsSelectionFirst() {
        JobApplication a = application(ApplicationStatus.APPLIED);
        assertThrows(IllegalStateException.class, () -> service.changeStatus(20L,
                new ApplicationStatusChangeDTO(ApplicationStatus.HIRED, null), HR));
        assertThrows(IllegalArgumentException.class, () -> service.changeStatus(20L,
                new ApplicationStatusChangeDTO(ApplicationStatus.INTERVIEW_SCHEDULED, null), HR));

        service.changeStatus(20L, new ApplicationStatusChangeDTO(ApplicationStatus.UNDER_REVIEW, null), HR);
        service.changeStatus(20L, new ApplicationStatusChangeDTO(ApplicationStatus.SHORTLISTED, null), HR);
        service.changeStatus(20L, new ApplicationStatusChangeDTO(ApplicationStatus.SELECTED, null), HR);
        assertEquals(ApplicationStatus.HIRED,
                service.changeStatus(20L, new ApplicationStatusChangeDTO(ApplicationStatus.HIRED, null), HR).getStatus());
        // Final: nothing further.
        assertThrows(IllegalStateException.class, () -> service.changeStatus(20L,
                new ApplicationStatusChangeDTO(ApplicationStatus.REJECTED, "late"), HR));
        assertTrue(a.getStatus().isFinal());
    }

    @Test
    void rejectionKeepsTheReason() {
        application(ApplicationStatus.UNDER_REVIEW);
        var rejected = service.changeStatus(20L, new ApplicationStatusChangeDTO(ApplicationStatus.REJECTED, "Not enough experience"), HR);
        assertEquals(ApplicationStatus.REJECTED, rejected.getStatus());
        assertEquals("Not enough experience", rejected.getRejectionReason());
    }

    @Test
    void interviewsNeedAShortlistAFutureTimeAndNoOtherScheduledInterview() {
        JobApplication a = application(ApplicationStatus.APPLIED);
        when(interviews.save(any(Interview.class))).thenAnswer(i -> i.getArgument(0));
        LocalDateTime tomorrow = LocalDateTime.now().plusDays(1);

        assertThrows(IllegalStateException.class, () -> service.scheduleInterview(20L, interview(tomorrow), HR));

        a.setStatus(ApplicationStatus.SHORTLISTED);
        assertThrows(IllegalArgumentException.class, () -> service.scheduleInterview(20L, interview(LocalDateTime.now().minusHours(1)), HR));

        var scheduled = service.scheduleInterview(20L, interview(tomorrow), HR);
        assertEquals(InterviewStatus.SCHEDULED, scheduled.getStatus());
        assertEquals(ApplicationStatus.INTERVIEW_SCHEDULED, a.getStatus());
        assertFalse(scheduled.isCandidateEmailed());

        when(interviews.existsByApplicationIdAndStatus(20L, InterviewStatus.SCHEDULED)).thenReturn(true);
        assertThrows(IllegalStateException.class, () -> service.scheduleInterview(20L, interview(tomorrow), HR));
    }

    @Test
    void cancellingTheOnlyInterviewReturnsTheCandidateToTheShortlist() {
        JobApplication a = application(ApplicationStatus.INTERVIEW_SCHEDULED);
        Interview i = Interview.builder().id(30L).application(a).scheduledAt(LocalDateTime.now().plusDays(2)).durationMinutes(30)
                .type(InterviewType.PHONE).locationOrLink("+91 141 000 0000").interviewer("Priya").status(InterviewStatus.SCHEDULED)
                .rescheduleCount(0).build();
        when(interviews.findById(30L)).thenReturn(Optional.of(i));
        when(interviews.save(any(Interview.class))).thenAnswer(x -> x.getArgument(0));

        var moved = service.rescheduleInterview(30L, interview(LocalDateTime.now().plusDays(3)), HR);
        assertEquals(1, moved.getRescheduleCount());

        service.cancelInterview(30L, "Candidate unavailable", HR);
        assertEquals(InterviewStatus.CANCELLED, i.getStatus());
        assertEquals(ApplicationStatus.SHORTLISTED, a.getStatus());
        assertThrows(IllegalStateException.class, () -> service.cancelInterview(30L, null, HR));
    }

    @Test
    void employeeAccountsOnlyForHiredCandidatesAndNeverPrivilegedRoles() {
        JobApplication a = application(ApplicationStatus.SELECTED);
        EmployeeAccountRequestDTO technician = new EmployeeAccountRequestDTO(Role.TECHNICIAN, "Welcome#2026", "Jaipur");
        assertThrows(IllegalStateException.class, () -> service.createEmployeeAccount(20L, technician, HR));

        a.setStatus(ApplicationStatus.HIRED);
        assertThrows(AccessDeniedException.class, () -> service.createEmployeeAccount(20L,
                new EmployeeAccountRequestDTO(Role.MANAGER, "Welcome#2026", null), MANAGER));
        assertThrows(AccessDeniedException.class, () -> service.createEmployeeAccount(20L,
                new EmployeeAccountRequestDTO(Role.CUSTOMER, "Welcome#2026", null), MANAGER));
        // HR cannot create another HR login; a manager can.
        assertThrows(AccessDeniedException.class, () -> service.createEmployeeAccount(20L,
                new EmployeeAccountRequestDTO(Role.HR, "Welcome#2026", null), HR));
        verify(userManagement, never()).create(any());

        UserAuth employee = user(50L, Role.TECHNICIAN);
        employee.setUserEmail("ravi@example.com");
        when(users.findByUserEmail("ravi@example.com")).thenReturn(Optional.of(employee));
        var linked = service.createEmployeeAccount(20L, technician, HR);
        assertEquals(50L, linked.getEmployeeUserId());
        assertThrows(IllegalStateException.class, () -> service.createEmployeeAccount(20L, technician, HR));
    }

    @Test
    void csvCellsCannotCarrySpreadsheetFormulas() throws Exception {
        var cell = com.keystone.deliveryservice.Service.ReportExportService.class.getDeclaredMethod("cell", String.class);
        cell.setAccessible(true);
        assertEquals("\"'=HYPERLINK(\"\"x\"\")\"", cell.invoke(null, "=HYPERLINK(\"x\")"));
        assertEquals("\"'+1\"", cell.invoke(null, "+1"));
        assertEquals("\"Plain, text\"", cell.invoke(null, "Plain, text"));
    }
}
