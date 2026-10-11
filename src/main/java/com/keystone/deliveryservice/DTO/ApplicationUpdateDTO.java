package com.keystone.deliveryservice.DTO;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// Details HR may correct on an application, plus internal notes. Null fields are left unchanged.
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplicationUpdateDTO {

    @Pattern(regexp = "^[+]?[0-9 ()-]{7,20}$", message = "Enter a valid phone number")
    private String phone;

    @Size(max = 2000, message = "Experience can be at most 2000 characters")
    private String experience;

    @Size(max = 1000, message = "Skills can be at most 1000 characters")
    private String skills;

    @Size(max = 1000, message = "Education can be at most 1000 characters")
    private String education;

    @Size(max = 4000, message = "Internal notes can be at most 4000 characters")
    private String internalNotes;
}
