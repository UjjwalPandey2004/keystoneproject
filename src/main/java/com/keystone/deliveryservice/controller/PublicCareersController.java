package com.keystone.deliveryservice.controller;

import java.io.IOException;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.keystone.deliveryservice.DTO.JobApplicationDTO;
import com.keystone.deliveryservice.DTO.JobApplicationRequestDTO;
import com.keystone.deliveryservice.DTO.JobOpeningDTO;
import com.keystone.deliveryservice.Service.RecruitmentService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

/** The public careers page: no login. Candidates only see open jobs and a receipt for their own application. */
@RestController
@RequestMapping("/api/public/jobs")
@Tag(name = "Careers (public)", description = "Open job openings and candidate applications, no login needed")
public class PublicCareersController {

    private final RecruitmentService recruitmentService;

    public PublicCareersController(RecruitmentService recruitmentService) {
        this.recruitmentService = recruitmentService;
    }

    @Operation(summary = "Job openings currently accepting applications")
    @GetMapping
    public List<JobOpeningDTO> openJobs() {
        return recruitmentService.publicJobs();
    }

    @Operation(summary = "One open job opening")
    @GetMapping("/{id}")
    public JobOpeningDTO openJob(@PathVariable Long id) {
        return recruitmentService.publicJob(id);
    }

    @Operation(summary = "Apply for an opening: form fields plus a PDF / DOC / DOCX resume (max 5 MB)")
    @PostMapping(value = "/{id}/applications", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> apply(@PathVariable Long id,
            @Valid @ModelAttribute JobApplicationRequestDTO request, @RequestParam("resume") MultipartFile resume)
            throws IOException {
        JobApplicationDTO application = recruitmentService.apply(id, request, resume, null);
        // Only a receipt goes back to the (anonymous) candidate, never HR data.
        return new ResponseEntity<>(Map.of(
                "reference", application.getReference(),
                "jobTitle", application.getJobTitle(),
                "message", "Thank you, " + application.getFullName() + ". Your application " + application.getReference()
                        + " has been received. Our HR team will contact you by email."),
                HttpStatus.CREATED);
    }
}
