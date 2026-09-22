package com.keystone.deliveryservice.DTO;

import com.keystone.deliveryservice.ENUM.Role;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateUserDTO {
    @NotBlank @Size(max = 100)
    private String userName;

    @Size(max = 30)
    private String phone;

    @NotNull
    private Role role;
}
