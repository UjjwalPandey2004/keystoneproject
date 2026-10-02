package com.keystone.deliveryservice.DTO;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.keystone.deliveryservice.ENUM.Role;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AttendanceDTO {
    private Long id;
    private Long userId;
    private String userName;
    private Role role;
    private String location;
    private LocalDate date;
    private LocalDateTime checkIn;
    private LocalDateTime checkOut;
    // PRESENT, ABSENT, ON_LEAVE, HALF_DAY, or NOT_MARKED when there is no record for the day.
    private String status;
    // Worked hours (check-in to check-out, or to now while still checked in); null if not checked in.
    private Double hours;
    private String note;
    private String markedByName;
}
