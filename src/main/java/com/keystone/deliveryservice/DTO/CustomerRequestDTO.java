package com.keystone.deliveryservice.DTO;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CustomerRequestDTO {
    @NotBlank @Size(max = 150)
    private String companyName;

    @NotBlank @Size(max = 100)
    private String contactPerson;

    @NotBlank @Email @Size(max = 150)
    private String email;

    @NotBlank @Size(max = 30)
    private String phone;

    @NotBlank @Size(max = 1000)
    private String address;

    private Boolean active;
}
