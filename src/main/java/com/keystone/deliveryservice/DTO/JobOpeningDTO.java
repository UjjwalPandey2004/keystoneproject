package com.keystone.deliveryservice.DTO;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.keystone.deliveryservice.ENUM.EmploymentType;
import com.keystone.deliveryservice.ENUM.JobStatus;

import lombok.Builder;
import lombok.Data;

// HR fields (application count, author) are left out when the opening is shown on the public careers page.
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class JobOpeningDTO {
    private Long id;
    private String title;
    private String department;
    private String description;
    private String requiredSkills;
    private String location;
    private EmploymentType employmentType;
    private LocalDate applicationDeadline;
    private JobStatus status;
    private Boolean acceptingApplications;
    private Long applicationCount;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
