package com.keystone.deliveryservice.DTO;

import java.time.LocalDate;

import com.keystone.deliveryservice.ENUM.AttendanceStatus;

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
public class MarkAttendanceDTO {

    @NotNull(message = "Choose the date")
    private LocalDate date;

    @NotNull(message = "Choose a status")
    private AttendanceStatus status;

    @Size(max = 300, message = "The note must be at most 300 characters")
    private String note;
}
