package com.keystone.deliveryservice.DTO;

import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// Either give startTime + endTime (the duration is calculated) or minutes on their own.
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LogTimeDTO {

    @Min(value = 1, message = "Logged minutes must be at least 1")
    @Max(value = 1440, message = "Logged minutes cannot exceed 24 hours")
    private Integer minutes;

    private LocalDate workDate;

    private LocalTime startTime;

    private LocalTime endTime;

    @Size(max = 2000, message = "Notes must be at most 2000 characters")
    private String note;
}
