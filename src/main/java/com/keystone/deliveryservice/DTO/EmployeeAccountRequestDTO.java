package com.keystone.deliveryservice.DTO;

import com.keystone.deliveryservice.ENUM.Role;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// Creates the staff login for a hired candidate. The allowed roles are checked on the server.
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeAccountRequestDTO {

    @NotNull(message = "Choose the employee role")
    private Role role;

    @NotBlank(message = "Set a first password")
    @Size(min = 8, max = 100, message = "The password must be 8-100 characters")
    private String initialPassword;

    // Base location for a technician, e.g. "Jaipur".
    @Size(max = 150, message = "The location can be at most 150 characters")
    private String location;
}
