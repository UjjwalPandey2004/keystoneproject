package com.keystone.deliveryservice.DTO;

import java.time.LocalDate;

import com.keystone.deliveryservice.ENUM.EmploymentType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobOpeningRequestDTO {

    @NotBlank(message = "Enter the job title")
    @Size(max = 150, message = "The title can be at most 150 characters")
    private String title;

    @NotBlank(message = "Enter the department")
    @Size(max = 100, message = "The department can be at most 100 characters")
    private String department;

    @NotBlank(message = "Enter a job description")
    @Size(max = 5000, message = "The description can be at most 5000 characters")
    private String description;

    @Size(max = 1000, message = "Required skills can be at most 1000 characters")
    private String requiredSkills;

    @NotBlank(message = "Enter the job location")
    @Size(max = 150, message = "The location can be at most 150 characters")
    private String location;

    @NotNull(message = "Choose the employment type")
    private EmploymentType employmentType;

    // Optional; must not be in the past when the opening is published.
    private LocalDate applicationDeadline;
}
