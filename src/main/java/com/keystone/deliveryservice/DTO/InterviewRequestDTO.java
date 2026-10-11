package com.keystone.deliveryservice.DTO;

import java.time.LocalDateTime;

import com.keystone.deliveryservice.ENUM.InterviewType;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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
public class InterviewRequestDTO {

    @NotNull(message = "Choose the interview date and time")
    private LocalDateTime scheduledAt;

    @NotNull(message = "Enter the interview length")
    @Min(value = 15, message = "An interview lasts at least 15 minutes")
    @Max(value = 480, message = "An interview lasts at most 8 hours")
    private Integer durationMinutes;

    @NotNull(message = "Choose the interview type")
    private InterviewType type;

    @NotBlank(message = "Enter the address, phone number or meeting link")
    @Size(max = 500, message = "The location or link can be at most 500 characters")
    private String locationOrLink;

    @NotBlank(message = "Enter the interviewer")
    @Size(max = 120, message = "The interviewer can be at most 120 characters")
    private String interviewer;

    @Size(max = 2000, message = "Instructions can be at most 2000 characters")
    private String instructions;
}
