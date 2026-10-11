package com.keystone.deliveryservice.controller;

import java.io.IOException;
import java.util.List;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.keystone.deliveryservice.DTO.ApplicationStatusChangeDTO;
import com.keystone.deliveryservice.DTO.ApplicationUpdateDTO;
import com.keystone.deliveryservice.DTO.CancelRequestDTO;
import com.keystone.deliveryservice.DTO.EmployeeAccountRequestDTO;
import com.keystone.deliveryservice.DTO.HrStatsDTO;
import com.keystone.deliveryservice.DTO.InterviewDTO;
import com.keystone.deliveryservice.DTO.InterviewRequestDTO;
import com.keystone.deliveryservice.DTO.JobApplicationDTO;
import com.keystone.deliveryservice.DTO.JobApplicationRequestDTO;
import com.keystone.deliveryservice.DTO.JobOpeningDTO;
import com.keystone.deliveryservice.DTO.JobOpeningRequestDTO;
import com.keystone.deliveryservice.ENUM.ApplicationStatus;
import com.keystone.deliveryservice.Entity.UserAuth;
import com.keystone.deliveryservice.Service.RecruitmentService;
import com.keystone.deliveryservice.Service.ReportExportService;
import com.keystone.deliveryservice.Service.ResourceAuthorizationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/hr")
@PreAuthorize("hasAnyRole('HR', 'MANAGER')")
@Tag(name = "Recruitment", description = "Job openings, applications, resumes, interviews and hiring (HR and Manager)")
public class RecruitmentController {

    private final RecruitmentService recruitmentService;
    private final ReportExportService exportService;
    private final ResourceAuthorizationService authorizationService;

    public RecruitmentController(RecruitmentService recruitmentService, ReportExportService exportService,
            ResourceAuthorizationService authorizationService) {
        this.recruitmentService = recruitmentService;
        this.exportService = exportService;
        this.authorizationService = authorizationService;
    }

    private UserAuth me(Authentication authentication) {
        return authorizationService.currentUser(authentication);
    }

    @Operation(summary = "Recruitment figures for the HR dashboard")
    @GetMapping("/stats")
    public HrStatsDTO stats(Authentication authentication) {
        return recruitmentService.stats(me(authentication));
    }

    // ---- job openings

    @Operation(summary = "All job openings (draft, published and closed) with application counts")
    @GetMapping("/jobs")
    public List<JobOpeningDTO> jobs(Authentication authentication) {
        return recruitmentService.listJobs(me(authentication));
    }

    @Operation(summary = "Create a job opening (starts as a draft)")
    @PostMapping("/jobs")
    public ResponseEntity<JobOpeningDTO> createJob(@Valid @RequestBody JobOpeningRequestDTO request,
            Authentication authentication) {
        return new ResponseEntity<>(recruitmentService.createJob(request, me(authentication)), HttpStatus.CREATED);
    }

    @Operation(summary = "Edit a job opening")
    @PutMapping("/jobs/{id}")
    public JobOpeningDTO updateJob(@PathVariable Long id, @Valid @RequestBody JobOpeningRequestDTO request,
            Authentication authentication) {
        return recruitmentService.updateJob(id, request, me(authentication));
    }

    @Operation(summary = "Publish a job opening on the careers page")
    @PostMapping("/jobs/{id}/publish")
    public JobOpeningDTO publishJob(@PathVariable Long id, Authentication authentication) {
        return recruitmentService.publishJob(id, me(authentication));
    }

    @Operation(summary = "Close a job opening to new applications")
    @PostMapping("/jobs/{id}/close")
    public JobOpeningDTO closeJob(@PathVariable Long id, Authentication authentication) {
        return recruitmentService.closeJob(id, me(authentication));
    }

    // ---- applications

    @Operation(summary = "Applications, optionally for one opening, one status, or matching a search")
    @GetMapping("/applications")
    public List<JobApplicationDTO> applications(@RequestParam(required = false) Long jobId,
            @RequestParam(required = false) ApplicationStatus status, @RequestParam(required = false) String search,
            Authentication authentication) {
        return recruitmentService.listApplications(jobId, status, search, me(authentication));
    }

    @Operation(summary = "Enter an application received by HR (same form and resume checks as the careers page)")
    @PostMapping(value = "/jobs/{jobId}/applications", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<JobApplicationDTO> addApplication(@PathVariable Long jobId,
            @Valid @ModelAttribute JobApplicationRequestDTO request, @RequestParam("resume") MultipartFile resume,
            Authentication authentication) throws IOException {
        return new ResponseEntity<>(recruitmentService.apply(jobId, request, resume, me(authentication)), HttpStatus.CREATED);
    }

    @Operation(summary = "One application with its interviews and full history")
    @GetMapping("/applications/{id}")
    public JobApplicationDTO application(@PathVariable Long id, Authentication authentication) {
        return recruitmentService.getApplication(id, me(authentication));
    }

    @Operation(summary = "Correct candidate details or update internal notes")
    @PutMapping("/applications/{id}")
    public JobApplicationDTO updateApplication(@PathVariable Long id, @Valid @RequestBody ApplicationUpdateDTO request,
            Authentication authentication) {
        return recruitmentService.updateApplication(id, request, me(authentication));
    }

    @Operation(summary = "Move an application through the pipeline (review, shortlist, select, reject, hire)")
    @PostMapping("/applications/{id}/status")
    public JobApplicationDTO changeStatus(@PathVariable Long id, @Valid @RequestBody ApplicationStatusChangeDTO request,
            Authentication authentication) {
        return recruitmentService.changeStatus(id, request, me(authentication));
    }

    @Operation(summary = "Download the candidate's resume (HR and Manager only; never a public link)")
    @GetMapping("/applications/{id}/resume")
    public ResponseEntity<byte[]> resume(@PathVariable Long id, Authentication authentication) throws IOException {
        RecruitmentService.Download file = recruitmentService.resume(id, me(authentication));
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(file.fileName()).build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .header("X-Content-Type-Options", "nosniff")
                .body(file.content());
    }

    @Operation(summary = "Create the staff login for a hired candidate (technician / dispatcher; HR only by a manager)")
    @PostMapping("/applications/{id}/employee-account")
    public JobApplicationDTO employeeAccount(@PathVariable Long id, @Valid @RequestBody EmployeeAccountRequestDTO request,
            Authentication authentication) {
        return recruitmentService.createEmployeeAccount(id, request, me(authentication));
    }

    // ---- interviews

    @Operation(summary = "Interviews; upcoming=true shows only scheduled ones still ahead")
    @GetMapping("/interviews")
    public List<InterviewDTO> interviews(@RequestParam(defaultValue = "false") boolean upcoming,
            Authentication authentication) {
        return recruitmentService.listInterviews(upcoming, me(authentication));
    }

    @Operation(summary = "Schedule an interview for a shortlisted candidate (one scheduled interview at a time)")
    @PostMapping("/applications/{id}/interviews")
    public ResponseEntity<InterviewDTO> schedule(@PathVariable Long id, @Valid @RequestBody InterviewRequestDTO request,
            Authentication authentication) {
        return new ResponseEntity<>(recruitmentService.scheduleInterview(id, request, me(authentication)), HttpStatus.CREATED);
    }

    @Operation(summary = "Reschedule an interview")
    @PutMapping("/interviews/{id}")
    public InterviewDTO reschedule(@PathVariable Long id, @Valid @RequestBody InterviewRequestDTO request,
            Authentication authentication) {
        return recruitmentService.rescheduleInterview(id, request, me(authentication));
    }

    @Operation(summary = "Cancel an interview, with an optional reason")
    @PostMapping("/interviews/{id}/cancel")
    public InterviewDTO cancelInterview(@PathVariable Long id, @Valid @RequestBody(required = false) CancelRequestDTO request,
            Authentication authentication) {
        return recruitmentService.cancelInterview(id, request == null ? null : request.getReason(), me(authentication));
    }

    @Operation(summary = "Mark an interview as held")
    @PostMapping("/interviews/{id}/complete")
    public InterviewDTO completeInterview(@PathVariable Long id, Authentication authentication) {
        return recruitmentService.completeInterview(id, me(authentication));
    }

    // ---- exports

    @Operation(summary = "Applications as CSV (opens in Excel)")
    @GetMapping("/export/applications")
    public ResponseEntity<byte[]> exportApplications(Authentication authentication) {
        return ReportController.csv("keystone-applications.csv", exportService.applicationsCsv(me(authentication)));
    }

    @Operation(summary = "Interview schedule as CSV (opens in Excel)")
    @GetMapping("/export/interviews")
    public ResponseEntity<byte[]> exportInterviews(Authentication authentication) {
        return ReportController.csv("keystone-interviews.csv", exportService.interviewsCsv(me(authentication)));
    }
}
