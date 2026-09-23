package com.keystone.deliveryservice.DTO;

import com.keystone.deliveryservice.ENUM.Role;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateUserDTO {
    @NotBlank @Size(max = 100)
    private String userName;

    @NotBlank @Email @Size(max = 150)
    private String userEmail;

    @NotBlank @Size(min = 8, max = 100)
    private String password;

    @Size(max = 30)
    private String phone;

    @NotNull
    private Role role;
}
