package com.keystone.deliveryservice.DTO;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// Fields a user may change on their own profile. Role and email are deliberately absent.
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateProfileDTO {

    @Size(min = 1, max = 100, message = "Name must be between 1 and 100 characters")
    private String userName;

    @Size(max = 30, message = "Phone must be at most 30 characters")
    private String phone;

    // Technicians only.
    @Size(max = 150, message = "Location must be at most 150 characters")
    private String location;

    // Technicians only.
    private Boolean available;
}
