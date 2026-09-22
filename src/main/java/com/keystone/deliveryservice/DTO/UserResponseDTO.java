package com.keystone.deliveryservice.DTO;

import com.keystone.deliveryservice.ENUM.Role;

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
}
