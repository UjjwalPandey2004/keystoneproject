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

    // Organisation to link a CUSTOMER user to; ignored for staff roles.
    private Long customerId;

    // Optional: set a new password for the user.
    @Size(min = 8, max = 100)
    private String password;
}
