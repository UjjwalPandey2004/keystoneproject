package com.keystone.deliveryservice.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RejectPaymentDTO {

    @NotBlank(message = "Give a reason so the customer knows what went wrong")
    @Size(max = 300, message = "The reason must be at most 300 characters")
    private String reason;
}
