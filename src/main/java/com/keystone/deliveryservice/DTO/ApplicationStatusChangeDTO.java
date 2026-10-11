package com.keystone.deliveryservice.DTO;

import com.keystone.deliveryservice.ENUM.ApplicationStatus;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplicationStatusChangeDTO {

    @NotNull(message = "Choose the new status")
    private ApplicationStatus status;

    // Optional; for REJECTED it is kept as the rejection reason.
    @Size(max = 500, message = "The note can be at most 500 characters")
    private String note;
}
