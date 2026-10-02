package com.keystone.deliveryservice.DTO;

import com.keystone.deliveryservice.ENUM.Role;
import com.keystone.deliveryservice.Entity.UserAuth;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserResponseDTO {
    private Long id;
    private String userName;
    private String userEmail;
    private String phone;
    private Role role;
    private Long customerId;
    private boolean emailVerified;
    // Technician dispatch details.
    private String location;
    private Boolean available;
    // Open jobs (assigned / in progress / on hold); filled in for the technician directory.
    private Long currentJobs;
    private java.time.LocalDateTime joinedAt;

    public static UserResponseDTO from(UserAuth user) {
        boolean technician = user.getRole() == Role.TECHNICIAN;
        return UserResponseDTO.builder()
                .id(user.getId())
                .userName(user.getUserName())
                .userEmail(user.getUserEmail())
                .phone(user.getPhone())
                .role(user.getRole())
                .customerId(user.getCustomerId())
                .emailVerified(user.isEmailVerified())
                .location(technician ? user.getLocation() : null)
                .available(technician ? user.isAvailable() : null)
                .joinedAt(user.getCreatedAt())
                .build();
    }
}
