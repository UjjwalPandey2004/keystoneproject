package com.keystone.deliveryservice.Service;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.keystone.deliveryservice.DTO.ApplicationHistoryDTO;
import com.keystone.deliveryservice.DTO.ApplicationStatusChangeDTO;
import com.keystone.deliveryservice.DTO.ApplicationUpdateDTO;
import com.keystone.deliveryservice.DTO.CreateUserDTO;
import com.keystone.deliveryservice.DTO.EmailLogDTO;
import com.keystone.deliveryservice.DTO.EmployeeAccountRequestDTO;
import com.keystone.deliveryservice.DTO.HrStatsDTO;
import com.keystone.deliveryservice.DTO.InterviewDTO;
import com.keystone.deliveryservice.DTO.InterviewRequestDTO;
import com.keystone.deliveryservice.DTO.JobApplicationDTO;
import com.keystone.deliveryservice.DTO.JobApplicationRequestDTO;
import com.keystone.deliveryservice.DTO.JobOpeningDTO;
import com.keystone.deliveryservice.DTO.JobOpeningRequestDTO;
import com.keystone.deliveryservice.ENUM.ApplicationStatus;
import com.keystone.deliveryservice.ENUM.InterviewStatus;
import com.keystone.deliveryservice.ENUM.JobStatus;
import com.keystone.deliveryservice.ENUM.NotificationType;
import com.keystone.deliveryservice.ENUM.Role;
import com.keystone.deliveryservice.Entity.ApplicationHistory;
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
import com.keystone.deliveryservice.Service.storage.StorageService;

/**
 * Recruitment: job openings, candidate applications with private resumes, interviews and hiring.
 *
 * HR and managers run it. Candidates apply through the public careers page and never get an account
 * from applying; a staff login is only created by an explicit HR / manager action after HIRED.
 */
@Service
@Transactional
public class RecruitmentService {

    static final long MAX_RESUME_BYTES = 5L * 1024 * 1024;
    private static final Set<Role> RECRUITERS = Set.of(Role.HR, Role.MANAGER);
    private static final DateTimeFormatter WHEN = DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm", Locale.ENGLISH);

    private final JobOpeningRepository jobRepository;
    private final JobApplicationRepository applicationRepository;
    private final InterviewRepository interviewRepository;
    private final ApplicationHistoryRepository historyRepository;
    private final UserAuthRepository userRepository;
    private final UserManagementService userManagementService;
    private final NotificationService notificationService;
    private final EmailLogService emailService;
    private final StorageService storage;
    private final boolean mailEnabled;

    public RecruitmentService(JobOpeningRepository jobRepository, JobApplicationRepository applicationRepository,
            InterviewRepository interviewRepository, ApplicationHistoryRepository historyRepository,
            UserAuthRepository userRepository, UserManagementService userManagementService,
            NotificationService notificationService, EmailLogService emailService, StorageService storage,
            @Value("${notifications.mail.enabled:false}") boolean mailEnabled) {
        this.jobRepository = jobRepository;
        this.applicationRepository = applicationRepository;
        this.interviewRepository = interviewRepository;
        this.historyRepository = historyRepository;
        this.userRepository = userRepository;
        this.userManagementService = userManagementService;
        this.notificationService = notificationService;
        this.emailService = emailService;
        this.storage = storage;
        this.mailEnabled = mailEnabled;
    }

    public record Download(String fileName, String contentType, byte[] content) {
    }

    // ---------------------------------------------------------------- job openings

    @Transactional(readOnly = true)
    public List<JobOpeningDTO> listJobs(UserAuth user) {
        requireRecruiter(user);
        return jobRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toJobDTO).toList();
    }

    public JobOpeningDTO createJob(JobOpeningRequestDTO request, UserAuth user) {
        requireRecruiter(user);
        checkDeadline(request.getApplicationDeadline());
        JobOpening job = JobOpening.builder().status(JobStatus.DRAFT).createdBy(user).build();
        apply(job, request);
        return toJobDTO(jobRepository.save(job));
    }

    public JobOpeningDTO updateJob(Long id, JobOpeningRequestDTO request, UserAuth user) {
        requireRecruiter(user);
        JobOpening job = findJob(id);
        if (job.getStatus() == JobStatus.PUBLISHED) {
            checkDeadline(request.getApplicationDeadline());
        }
        apply(job, request);
        return toJobDTO(jobRepository.save(job));
    }

    public JobOpeningDTO publishJob(Long id, UserAuth user) {
        requireRecruiter(user);
        JobOpening job = findJob(id);
        if (job.getStatus() == JobStatus.PUBLISHED) {
            throw new IllegalStateException("This opening is already published.");
        }
        checkDeadline(job.getApplicationDeadline());
        job.setStatus(JobStatus.PUBLISHED);
        return toJobDTO(jobRepository.save(job));
    }

    public JobOpeningDTO closeJob(Long id, UserAuth user) {
        requireRecruiter(user);
        JobOpening job = findJob(id);
        if (job.getStatus() == JobStatus.CLOSED) {
            throw new IllegalStateException("This opening is already closed.");
        }
        job.setStatus(JobStatus.CLOSED);
        return toJobDTO(jobRepository.save(job));
    }

    /** Openings shown on the public careers page: published and still accepting applications. */
    @Transactional(readOnly = true)
    public List<JobOpeningDTO> publicJobs() {
        return jobRepository.findByStatusOrderByCreatedAtDesc(JobStatus.PUBLISHED).stream()
                .filter(JobOpening::acceptsApplications).map(this::toPublicJobDTO).toList();
    }

    @Transactional(readOnly = true)
    public JobOpeningDTO publicJob(Long id) {
        JobOpening job = jobRepository.findById(id).filter(JobOpening::acceptsApplications)
                .orElseThrow(() -> new ResourceNotFoundException("This job opening is not available."));
        return toPublicJobDTO(job);
    }

    private static void apply(JobOpening job, JobOpeningRequestDTO request) {
        job.setTitle(request.getTitle().trim());
        job.setDepartment(request.getDepartment().trim());
        job.setDescription(request.getDescription().trim());
        job.setRequiredSkills(blankToNull(request.getRequiredSkills()));
        job.setLocation(request.getLocation().trim());
        job.setEmploymentType(request.getEmploymentType());
        job.setApplicationDeadline(request.getApplicationDeadline());
    }

    private static void checkDeadline(LocalDate deadline) {
        if (deadline != null && deadline.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("The application deadline cannot be in the past.");
        }
    }

    // ---------------------------------------------------------------- applications

    /**
     * A candidate applies (public careers page) or HR enters an application received elsewhere.
     * {@code actor} is null for a public application.
     */
    public JobApplicationDTO apply(Long jobId, JobApplicationRequestDTO request, MultipartFile resume, UserAuth actor)
            throws IOException {
        JobOpening job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("This job opening is not available."));
        if (job.getStatus() != JobStatus.PUBLISHED) {
            throw new ResourceNotFoundException("This job opening is not available.");
        }
        if (!job.acceptsApplications()) {
            throw new IllegalStateException("Applications for this opening closed on " + job.getApplicationDeadline() + ".");
        }
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        if (applicationRepository.existsByJobOpeningIdAndEmailIgnoreCase(jobId, email)) {
            throw new IllegalStateException("An application with this email address has already been received for this opening.");
        }
        ResumeKind kind = checkResume(resume);
        byte[] bytes = resume.getBytes();
        String key = "resumes/" + UUID.randomUUID() + kind.extension;
        storage.put(key, bytes);

        JobApplication application = JobApplication.builder()
                .reference(String.format("KS-APP-%06d", applicationRepository.nextReferenceValue()))
                .jobOpening(job)
                .fullName(request.getFullName().trim())
                .email(email)
                .phone(request.getPhone().trim())
                .experience(blankToNull(request.getExperience()))
                .skills(blankToNull(request.getSkills()))
                .education(blankToNull(request.getEducation()))
                .coverLetter(blankToNull(request.getCoverLetter()))
                .resumeFileName(cleanFileName(resume.getOriginalFilename(), kind))
                .resumeContentType(kind.contentType)
                .resumeSizeBytes((long) bytes.length)
                .resumeStorageKey(key)
                .status(ApplicationStatus.APPLIED)
                .build();
        try {
            application = applicationRepository.save(application);
        } catch (RuntimeException e) {
            storage.delete(key);
            throw e;
        }
        record(application, null, ApplicationStatus.APPLIED,
                actor == null ? "Applied through the careers page" : "Application entered by " + actor.getUserName(), actor);
        notificationService.notifyRoles(RECRUITERS, actor, NotificationType.JOB_APPLICATION,
                "New application: " + application.getReference(),
                application.getFullName() + " applied for " + job.getTitle() + " (" + job.getDepartment() + ").",
                ref(application));
        return toApplicationDTO(application, false);
    }

    @Transactional(readOnly = true)
    public List<JobApplicationDTO> listApplications(Long jobId, ApplicationStatus status, String search, UserAuth user) {
        requireRecruiter(user);
        List<JobApplication> all = jobId != null
                ? applicationRepository.findByJobOpeningIdOrderByCreatedAtDesc(jobId)
                : applicationRepository.findAllByOrderByCreatedAtDesc();
        String term = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        return all.stream()
                .filter(a -> status == null || a.getStatus() == status)
                .filter(a -> term.isEmpty() || contains(a.getFullName(), term) || contains(a.getEmail(), term)
                        || contains(a.getReference(), term) || contains(a.getSkills(), term)
                        || contains(a.getJobOpening().getTitle(), term))
                .map(a -> toApplicationDTO(a, false))
                .toList();
    }

    @Transactional(readOnly = true)
    public JobApplicationDTO getApplication(Long id, UserAuth user) {
        requireRecruiter(user);
        return toApplicationDTO(findApplication(id), true);
    }

    public JobApplicationDTO updateApplication(Long id, ApplicationUpdateDTO request, UserAuth user) {
        requireRecruiter(user);
        JobApplication application = findApplication(id);
        boolean detailsChanged = false;
        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            application.setPhone(request.getPhone().trim());
            detailsChanged = true;
        }
        if (request.getExperience() != null) {
            application.setExperience(blankToNull(request.getExperience()));
            detailsChanged = true;
        }
        if (request.getSkills() != null) {
            application.setSkills(blankToNull(request.getSkills()));
            detailsChanged = true;
        }
        if (request.getEducation() != null) {
            application.setEducation(blankToNull(request.getEducation()));
            detailsChanged = true;
        }
        boolean notesChanged = request.getInternalNotes() != null;
        if (notesChanged) {
            application.setInternalNotes(blankToNull(request.getInternalNotes()));
        }
        application = applicationRepository.save(application);
        if (detailsChanged || notesChanged) {
            record(application, null, null, detailsChanged && notesChanged ? "Details and internal notes updated"
                    : detailsChanged ? "Candidate details updated" : "Internal notes updated", user);
        }
        return toApplicationDTO(application, true);
    }

    /** Manual pipeline step chosen by HR. Interviews have their own endpoints. */
    public JobApplicationDTO changeStatus(Long id, ApplicationStatusChangeDTO request, UserAuth user) {
        requireRecruiter(user);
        JobApplication application = findApplication(id);
        ApplicationStatus from = application.getStatus();
        ApplicationStatus to = request.getStatus();
        if (from == to) {
            throw new IllegalStateException("The application is already " + label(to) + ".");
        }
        if (to == ApplicationStatus.INTERVIEW_SCHEDULED) {
            throw new IllegalArgumentException("Schedule an interview to move the application to Interview Scheduled.");
        }
        if (!from.manualNext().contains(to)) {
            throw new IllegalStateException("An application that is " + label(from) + " cannot be moved to " + label(to)
                    + (to == ApplicationStatus.HIRED ? ". Select the candidate first." : "."));
        }
        String note = blankToNull(request.getNote());
        application.setStatus(to);
        if (to == ApplicationStatus.REJECTED) {
            application.setRejectionReason(note);
            // A rejected candidate keeps no open interview slots.
            interviewRepository.findByApplicationIdOrderByScheduledAtDesc(id).stream()
                    .filter(i -> i.getStatus() == InterviewStatus.SCHEDULED)
                    .forEach(i -> {
                        i.setStatus(InterviewStatus.CANCELLED);
                        interviewRepository.save(i);
                    });
        }
        application = applicationRepository.save(application);
        record(application, from, to, "Moved to " + label(to) + (note != null ? ": " + note : ""), user);
        if (to == ApplicationStatus.SELECTED || to == ApplicationStatus.HIRED) {
            notificationService.notifyRoles(RECRUITERS, user, NotificationType.HIRING_UPDATE,
                    application.getReference() + " " + label(to).toLowerCase(Locale.ROOT),
                    user.getUserName() + " marked " + application.getFullName() + " (" + application.getJobOpening().getTitle()
                            + ") as " + label(to) + ".",
                    ref(application));
        }
        return toApplicationDTO(application, true);
    }

    @Transactional(readOnly = true)
    public Download resume(Long id, UserAuth user) throws IOException {
        requireRecruiter(user);
        JobApplication application = findApplication(id);
        return new Download(application.getResumeFileName(), application.getResumeContentType(),
                storage.get(application.getResumeStorageKey()));
    }

    // ---------------------------------------------------------------- interviews

    public InterviewDTO scheduleInterview(Long applicationId, InterviewRequestDTO request, UserAuth user) {
        requireRecruiter(user);
        JobApplication application = findApplication(applicationId);
        if (application.getStatus() != ApplicationStatus.SHORTLISTED
                && application.getStatus() != ApplicationStatus.INTERVIEW_SCHEDULED) {
            throw new IllegalStateException("Shortlist the candidate before scheduling an interview (the application is "
                    + label(application.getStatus()) + ").");
        }
        if (interviewRepository.existsByApplicationIdAndStatus(applicationId, InterviewStatus.SCHEDULED)) {
            throw new IllegalStateException("This candidate already has an interview scheduled. Reschedule or cancel it instead.");
        }
        checkFuture(request.getScheduledAt());
        Interview interview = Interview.builder()
                .application(application)
                .status(InterviewStatus.SCHEDULED)
                .rescheduleCount(0)
                .scheduledBy(user)
                .build();
        applyInterview(interview, request);
        interview.setCandidateEmailed(emailCandidate(interview, "Interview scheduled"));
        interview = interviewRepository.save(interview);

        ApplicationStatus from = application.getStatus();
        if (from != ApplicationStatus.INTERVIEW_SCHEDULED) {
            application.setStatus(ApplicationStatus.INTERVIEW_SCHEDULED);
            applicationRepository.save(application);
        }
        record(application, from == ApplicationStatus.INTERVIEW_SCHEDULED ? null : from,
                from == ApplicationStatus.INTERVIEW_SCHEDULED ? null : ApplicationStatus.INTERVIEW_SCHEDULED,
                "Interview scheduled for " + interview.getScheduledAt().format(WHEN) + " with " + interview.getInterviewer(), user);
        notificationService.notifyRoles(RECRUITERS, user, NotificationType.INTERVIEW_SCHEDULED,
                "Interview scheduled: " + application.getFullName(),
                application.getJobOpening().getTitle() + " interview on " + interview.getScheduledAt().format(WHEN)
                        + " with " + interview.getInterviewer() + ".",
                ref(application));
        return toInterviewDTO(interview);
    }

    public InterviewDTO rescheduleInterview(Long interviewId, InterviewRequestDTO request, UserAuth user) {
        requireRecruiter(user);
        Interview interview = findInterview(interviewId);
        if (interview.getStatus() != InterviewStatus.SCHEDULED) {
            throw new IllegalStateException("Only a scheduled interview can be rescheduled (this one is "
                    + interview.getStatus().name().toLowerCase(Locale.ROOT) + ").");
        }
        checkFuture(request.getScheduledAt());
        LocalDateTime before = interview.getScheduledAt();
        applyInterview(interview, request);
        interview.setRescheduleCount(interview.getRescheduleCount() + 1);
        interview.setCandidateEmailed(emailCandidate(interview, "Interview rescheduled"));
        interview = interviewRepository.save(interview);
        record(interview.getApplication(), null, null, "Interview moved from " + before.format(WHEN) + " to "
                + interview.getScheduledAt().format(WHEN), user);
        notificationService.notifyRoles(RECRUITERS, user, NotificationType.INTERVIEW_SCHEDULED,
                "Interview rescheduled: " + interview.getApplication().getFullName(),
                "Now on " + interview.getScheduledAt().format(WHEN) + " with " + interview.getInterviewer() + ".",
                ref(interview.getApplication()));
        return toInterviewDTO(interview);
    }

    public InterviewDTO cancelInterview(Long interviewId, String reason, UserAuth user) {
        requireRecruiter(user);
        Interview interview = findInterview(interviewId);
        if (interview.getStatus() != InterviewStatus.SCHEDULED) {
            throw new IllegalStateException("This interview is already " + interview.getStatus().name().toLowerCase(Locale.ROOT) + ".");
        }
        interview.setStatus(InterviewStatus.CANCELLED);
        interview.setCandidateEmailed(emailCandidate(interview, "Interview cancelled"));
        interview = interviewRepository.save(interview);
        JobApplication application = interview.getApplication();
        String why = blankToNull(reason);
        // Without another interview the candidate goes back to the shortlist.
        if (application.getStatus() == ApplicationStatus.INTERVIEW_SCHEDULED
                && !interviewRepository.existsByApplicationIdAndStatus(application.getId(), InterviewStatus.SCHEDULED)) {
            application.setStatus(ApplicationStatus.SHORTLISTED);
            applicationRepository.save(application);
            record(application, ApplicationStatus.INTERVIEW_SCHEDULED, ApplicationStatus.SHORTLISTED,
                    "Interview on " + interview.getScheduledAt().format(WHEN) + " cancelled" + (why != null ? ": " + why : ""), user);
        } else {
            record(application, null, null, "Interview on " + interview.getScheduledAt().format(WHEN) + " cancelled"
                    + (why != null ? ": " + why : ""), user);
        }
        return toInterviewDTO(interview);
    }

    public InterviewDTO completeInterview(Long interviewId, UserAuth user) {
        requireRecruiter(user);
        Interview interview = findInterview(interviewId);
        if (interview.getStatus() != InterviewStatus.SCHEDULED) {
            throw new IllegalStateException("This interview is already " + interview.getStatus().name().toLowerCase(Locale.ROOT) + ".");
        }
        interview.setStatus(InterviewStatus.COMPLETED);
        interview = interviewRepository.save(interview);
        record(interview.getApplication(), null, null, "Interview on " + interview.getScheduledAt().format(WHEN)
                + " marked as held", user);
        return toInterviewDTO(interview);
    }

    @Transactional(readOnly = true)
    public List<InterviewDTO> listInterviews(boolean upcomingOnly, UserAuth user) {
        requireRecruiter(user);
        LocalDateTime now = LocalDateTime.now();
        return interviewRepository.findAllByOrderByScheduledAtAsc().stream()
                .filter(i -> !upcomingOnly || (i.getStatus() == InterviewStatus.SCHEDULED && i.getScheduledAt().isAfter(now)))
                .map(this::toInterviewDTO)
                .toList();
    }

    private static void applyInterview(Interview interview, InterviewRequestDTO request) {
        interview.setScheduledAt(request.getScheduledAt().withSecond(0).withNano(0));
        interview.setDurationMinutes(request.getDurationMinutes());
        interview.setType(request.getType());
        interview.setLocationOrLink(request.getLocationOrLink().trim());
        interview.setInterviewer(request.getInterviewer().trim());
        interview.setInstructions(blankToNull(request.getInstructions()));
    }

    private static void checkFuture(LocalDateTime when) {
        if (!when.isAfter(LocalDateTime.now())) {
            throw new IllegalArgumentException("Choose an interview date and time in the future.");
        }
    }

    /** Emails the candidate when delivery is configured; returns whether it was sent. */
    private boolean emailCandidate(Interview interview, String subject) {
        if (!mailEnabled) {
            return false;
        }
        JobApplication a = interview.getApplication();
        String body = "Dear " + a.getFullName() + ",\n\n"
                + (interview.getStatus() == InterviewStatus.CANCELLED
                        ? "Your interview for " + a.getJobOpening().getTitle() + " on " + interview.getScheduledAt().format(WHEN)
                                + " has been cancelled. We will contact you about next steps.\n"
                        : "Your interview for " + a.getJobOpening().getTitle() + " (application " + a.getReference() + "):\n\n"
                                + "Date and time: " + interview.getScheduledAt().format(WHEN) + " (" + interview.getDurationMinutes()
                                + " minutes)\n"
                                + "Type: " + interview.getType().name().replace('_', ' ').toLowerCase(Locale.ROOT) + "\n"
                                + "Where: " + interview.getLocationOrLink() + "\n"
                                + "Interviewer: " + interview.getInterviewer() + "\n"
                                + (interview.getInstructions() != null ? "\n" + interview.getInstructions() + "\n" : ""))
                + "\nKEYSTONE Maintenance Solutions - Human Resources";
        String result = emailService.notification(new EmailLogDTO(a.getEmail(), subject + " - KEYSTONE", body));
        return result.startsWith("Email sent");
    }

    // ---------------------------------------------------------------- hiring

    /**
     * Creates the staff login of a HIRED candidate. Only technician, dispatcher or (by a manager) HR
     * accounts can be created here; manager and customer accounts never are.
     */
    public JobApplicationDTO createEmployeeAccount(Long applicationId, EmployeeAccountRequestDTO request, UserAuth user) {
        requireRecruiter(user);
        JobApplication application = findApplication(applicationId);
        if (application.getStatus() != ApplicationStatus.HIRED) {
            throw new IllegalStateException("Mark the candidate as hired before creating their employee account.");
        }
        if (application.getEmployeeAccount() != null) {
            throw new IllegalStateException("An employee account already exists for this candidate: "
                    + application.getEmployeeAccount().getUserEmail());
        }
        Set<Role> allowed = user.getRole() == Role.MANAGER
                ? EnumSet.of(Role.TECHNICIAN, Role.DISPATCHER, Role.HR)
                : EnumSet.of(Role.TECHNICIAN, Role.DISPATCHER);
        if (!allowed.contains(request.getRole())) {
            throw new AccessDeniedException("You cannot create a " + request.getRole() + " account from a hiring. "
                    + "Allowed: " + allowed + ".");
        }
        CreateUserDTO account = new CreateUserDTO();
        account.setUserName(application.getFullName());
        account.setUserEmail(application.getEmail());
        account.setPassword(request.getInitialPassword());
        account.setPhone(application.getPhone().length() > 30 ? application.getPhone().substring(0, 30) : application.getPhone());
        account.setRole(request.getRole());
        account.setLocation(blankToNull(request.getLocation()));
        userManagementService.create(account);
        UserAuth employee = userRepository.findByUserEmail(application.getEmail()).orElseThrow();
        application.setEmployeeAccount(employee);
        application = applicationRepository.save(application);
        record(application, null, null, request.getRole().name().charAt(0) + request.getRole().name().substring(1).toLowerCase(Locale.ROOT)
                + " account created (" + employee.getUserEmail() + ")", user);
        notificationService.notifyRoles(RECRUITERS, user, NotificationType.HIRING_UPDATE,
                "Employee account created: " + application.getFullName(),
                user.getUserName() + " created a " + request.getRole() + " login for " + application.getFullName() + ".",
                ref(application));
        return toApplicationDTO(application, true);
    }

    // ---------------------------------------------------------------- dashboard

    @Transactional(readOnly = true)
    public HrStatsDTO stats(UserAuth user) {
        requireRecruiter(user);
        return HrStatsDTO.builder()
                .totalOpenings(jobRepository.count())
                .publishedOpenings(jobRepository.countByStatus(JobStatus.PUBLISHED))
                .totalApplications(applicationRepository.count())
                .newApplications(applicationRepository.countByStatus(ApplicationStatus.APPLIED))
                .underReview(applicationRepository.countByStatus(ApplicationStatus.UNDER_REVIEW))
                .shortlisted(applicationRepository.countByStatus(ApplicationStatus.SHORTLISTED))
                .interviewsScheduled(applicationRepository.countByStatus(ApplicationStatus.INTERVIEW_SCHEDULED))
                .upcomingInterviews(interviewRepository.countByStatusAndScheduledAtAfter(InterviewStatus.SCHEDULED, LocalDateTime.now()))
                .selected(applicationRepository.countByStatus(ApplicationStatus.SELECTED))
                .rejected(applicationRepository.countByStatus(ApplicationStatus.REJECTED))
                .hired(applicationRepository.countByStatus(ApplicationStatus.HIRED))
                .candidateEmailEnabled(mailEnabled)
                .build();
    }

    // ---------------------------------------------------------------- helpers

    static void requireRecruiter(UserAuth user) {
        if (user == null || !RECRUITERS.contains(user.getRole())) {
            throw new AccessDeniedException("Recruitment is available to HR and managers only.");
        }
    }

    private JobOpening findJob(Long id) {
        return jobRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Job opening not found"));
    }

    private JobApplication findApplication(Long id) {
        return applicationRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Application not found"));
    }

    private Interview findInterview(Long id) {
        return interviewRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Interview not found"));
    }

    private void record(JobApplication application, ApplicationStatus from, ApplicationStatus to, String action, UserAuth user) {
        historyRepository.save(ApplicationHistory.builder()
                .application(application)
                .fromStatus(from)
                .toStatus(to)
                .action(action.length() > 500 ? action.substring(0, 500) : action)
                .changedBy(user)
                .changedAt(LocalDateTime.now())
                .build());
    }

    private static NotificationService.Ref ref(JobApplication application) {
        return new NotificationService.Ref(NotificationService.APPLICATION, application.getId(), application.getReference());
    }

    static String label(ApplicationStatus status) {
        String text = status.name().replace('_', ' ').toLowerCase(Locale.ROOT);
        return Character.toUpperCase(text.charAt(0)) + text.substring(1);
    }

    private static boolean contains(String value, String term) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(term);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private JobOpeningDTO toJobDTO(JobOpening job) {
        return JobOpeningDTO.builder()
                .id(job.getId())
                .title(job.getTitle())
                .department(job.getDepartment())
                .description(job.getDescription())
                .requiredSkills(job.getRequiredSkills())
                .location(job.getLocation())
                .employmentType(job.getEmploymentType())
                .applicationDeadline(job.getApplicationDeadline())
                .status(job.getStatus())
                .acceptingApplications(job.acceptsApplications())
                .applicationCount(applicationRepository.countByJobOpeningId(job.getId()))
                .createdByName(job.getCreatedBy() != null ? job.getCreatedBy().getUserName() : null)
                .createdAt(job.getCreatedAt())
                .updatedAt(job.getUpdatedAt())
                .build();
    }

    private JobOpeningDTO toPublicJobDTO(JobOpening job) {
        return JobOpeningDTO.builder()
                .id(job.getId())
                .title(job.getTitle())
                .department(job.getDepartment())
                .description(job.getDescription())
                .requiredSkills(job.getRequiredSkills())
                .location(job.getLocation())
                .employmentType(job.getEmploymentType())
                .applicationDeadline(job.getApplicationDeadline())
                .acceptingApplications(true)
                .build();
    }

    JobApplicationDTO toApplicationDTO(JobApplication a, boolean withDetails) {
        JobApplicationDTO.JobApplicationDTOBuilder dto = JobApplicationDTO.builder()
                .id(a.getId())
                .reference(a.getReference())
                .jobOpeningId(a.getJobOpening().getId())
                .jobTitle(a.getJobOpening().getTitle())
                .department(a.getJobOpening().getDepartment())
                .fullName(a.getFullName())
                .email(a.getEmail())
                .phone(a.getPhone())
                .experience(a.getExperience())
                .skills(a.getSkills())
                .education(a.getEducation())
                .coverLetter(a.getCoverLetter())
                .resumeFileName(a.getResumeFileName())
                .resumeSizeBytes(a.getResumeSizeBytes())
                .status(a.getStatus())
                .allowedNextStatuses(a.getStatus().manualNext().stream().sorted().toList())
                .rejectionReason(a.getRejectionReason())
                .internalNotes(a.getInternalNotes())
                .employeeUserId(a.getEmployeeAccount() != null ? a.getEmployeeAccount().getId() : null)
                .employeeEmail(a.getEmployeeAccount() != null ? a.getEmployeeAccount().getUserEmail() : null)
                .createdAt(a.getCreatedAt())
                .updatedAt(a.getUpdatedAt());
        if (withDetails) {
            dto.interviews(interviewRepository.findByApplicationIdOrderByScheduledAtDesc(a.getId()).stream()
                    .map(this::toInterviewDTO).toList());
            dto.history(historyRepository.findByApplicationIdOrderByChangedAtAsc(a.getId()).stream()
                    .map(h -> ApplicationHistoryDTO.builder()
                            .id(h.getId())
                            .fromStatus(h.getFromStatus())
                            .toStatus(h.getToStatus())
                            .action(h.getAction())
                            .changedByName(h.getChangedBy() != null ? h.getChangedBy().getUserName() : "Candidate")
                            .changedAt(h.getChangedAt())
                            .build())
                    .toList());
        }
        return dto.build();
    }

    InterviewDTO toInterviewDTO(Interview i) {
        return InterviewDTO.builder()
                .id(i.getId())
                .applicationId(i.getApplication().getId())
                .applicationReference(i.getApplication().getReference())
                .candidateName(i.getApplication().getFullName())
                .jobTitle(i.getApplication().getJobOpening().getTitle())
                .scheduledAt(i.getScheduledAt())
                .durationMinutes(i.getDurationMinutes())
                .type(i.getType())
                .locationOrLink(i.getLocationOrLink())
                .interviewer(i.getInterviewer())
                .instructions(i.getInstructions())
                .status(i.getStatus())
                .rescheduleCount(i.getRescheduleCount())
                .candidateEmailed(i.isCandidateEmailed())
                .scheduledByName(i.getScheduledBy() != null ? i.getScheduledBy().getUserName() : null)
                .createdAt(i.getCreatedAt())
                .build();
    }

    // ---------------------------------------------------------------- resume files

    /** Checks size and the real file content; the browser-supplied name and type are not trusted. */
    static ResumeKind checkResume(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Attach your resume (PDF or Word document).");
        }
        if (file.getSize() > MAX_RESUME_BYTES) {
            throw new IllegalArgumentException("The resume is too large. The limit is 5 MB.");
        }
        ResumeKind kind = ResumeKind.detect(file.getBytes(), file.getOriginalFilename());
        if (kind == null) {
            throw new IllegalArgumentException("The resume must be a PDF, DOC or DOCX file.");
        }
        return kind;
    }

    private static String cleanFileName(String original, ResumeKind kind) {
        String name = original == null ? "" : original.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_").trim();
        if (name.isEmpty()) {
            name = "resume";
        }
        if (name.length() > 200) {
            name = name.substring(0, 200);
        }
        return name.toLowerCase(Locale.ROOT).endsWith(kind.extension) ? name : name + kind.extension;
    }

    enum ResumeKind {
        PDF("application/pdf", ".pdf"),
        DOCX("application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"),
        DOC("application/msword", ".doc");

        final String contentType;
        final String extension;

        ResumeKind(String contentType, String extension) {
            this.contentType = contentType;
            this.extension = extension;
        }

        static ResumeKind detect(byte[] b, String fileName) {
            String name = fileName == null ? "" : fileName.toLowerCase(Locale.ROOT);
            if (b.length >= 5 && b[0] == '%' && b[1] == 'P' && b[2] == 'D' && b[3] == 'F' && b[4] == '-') {
                return PDF;
            }
            // DOCX is a ZIP container holding a word/ folder.
            if (b.length >= 4 && b[0] == 'P' && b[1] == 'K' && b[2] == 3 && b[3] == 4 && name.endsWith(".docx")
                    && new String(b, 0, Math.min(b.length, 64 * 1024), java.nio.charset.StandardCharsets.ISO_8859_1).contains("word/")) {
                return DOCX;
            }
            // Legacy .doc is an OLE2 compound file.
            byte[] ole = {(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, (byte) 0xA1, (byte) 0xB1, 0x1A, (byte) 0xE1};
            if (b.length >= 8 && Arrays.equals(Arrays.copyOf(b, 8), ole) && name.endsWith(".doc")) {
                return DOC;
            }
            return null;
        }
    }
}
