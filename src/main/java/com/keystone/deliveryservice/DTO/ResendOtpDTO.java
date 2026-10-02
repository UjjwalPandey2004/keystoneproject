package com.keystone.deliveryservice.DTO;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResendOtpDTO {

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String userEmail;
}
