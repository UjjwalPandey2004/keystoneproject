package com.keystone.deliveryservice.DTO;

import java.time.LocalDateTime;

import com.keystone.deliveryservice.ENUM.Role;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StaffDTO {
    private Long id;
    private String name;
    private Role role;
    private String email;
    private String phone;
    // Technicians only.
    private String location;
    private Boolean available;
    private Long currentJobs;
    // Today's attendance: PRESENT, ABSENT, ON_LEAVE, HALF_DAY or NOT_MARKED.
    private String todayAttendance;
    private LocalDateTime joinedAt;
}
