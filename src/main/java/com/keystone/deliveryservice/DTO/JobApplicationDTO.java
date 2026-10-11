package com.keystone.deliveryservice.DTO;

import java.time.LocalDateTime;
import java.util.List;

import com.keystone.deliveryservice.ENUM.ApplicationStatus;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class JobApplicationDTO {
    private Long id;
    private String reference;
    private Long jobOpeningId;
    private String jobTitle;
    private String department;
    private String fullName;
    private String email;
    private String phone;
    private String experience;
    private String skills;
    private String education;
    private String coverLetter;
    private String resumeFileName;
    private Long resumeSizeBytes;
    private ApplicationStatus status;
    // Statuses HR may choose next by hand.
    private List<ApplicationStatus> allowedNextStatuses;
    private String rejectionReason;
    private String internalNotes;
    private Long employeeUserId;
    private String employeeEmail;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    // Filled in when one application is opened.
    private List<InterviewDTO> interviews;
    private List<ApplicationHistoryDTO> history;
}
