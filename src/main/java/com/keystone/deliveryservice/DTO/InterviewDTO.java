package com.keystone.deliveryservice.DTO;

import java.time.LocalDateTime;

import com.keystone.deliveryservice.ENUM.InterviewStatus;
import com.keystone.deliveryservice.ENUM.InterviewType;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class InterviewDTO {
    private Long id;
    private Long applicationId;
    private String applicationReference;
    private String candidateName;
    private String jobTitle;
    private LocalDateTime scheduledAt;
    private Integer durationMinutes;
    private InterviewType type;
    private String locationOrLink;
    private String interviewer;
    private String instructions;
    private InterviewStatus status;
    private Integer rescheduleCount;
    private boolean candidateEmailed;
    private String scheduledByName;
    private LocalDateTime createdAt;
}
