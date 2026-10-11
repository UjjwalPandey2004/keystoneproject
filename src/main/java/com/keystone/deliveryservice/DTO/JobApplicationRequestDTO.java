package com.keystone.deliveryservice.DTO;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// Candidate details sent with the resume as multipart form fields.
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobApplicationRequestDTO {

    @NotBlank(message = "Enter your full name")
    @Size(min = 2, max = 120, message = "Your name must be 2-120 characters")
    private String fullName;

    @NotBlank(message = "Enter your email address")
    @Email(message = "Enter a valid email address")
    @Size(max = 150, message = "The email can be at most 150 characters")
    private String email;

    @NotBlank(message = "Enter your phone number")
    @Pattern(regexp = "^[+]?[0-9 ()-]{7,20}$", message = "Enter a valid phone number")
    private String phone;

    @NotBlank(message = "Describe your relevant experience")
    @Size(max = 2000, message = "Experience can be at most 2000 characters")
    private String experience;

    @NotBlank(message = "List your skills")
    @Size(max = 1000, message = "Skills can be at most 1000 characters")
    private String skills;

    @NotBlank(message = "Enter your education")
    @Size(max = 1000, message = "Education can be at most 1000 characters")
    private String education;

    @Size(max = 4000, message = "The cover letter can be at most 4000 characters")
    private String coverLetter;
}
