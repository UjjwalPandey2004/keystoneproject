package com.keystone.deliveryservice.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentReferenceDTO {

    // UPI transaction reference (UTR) or card-machine slip number.
    @NotBlank(message = "Enter the transaction reference")
    @Pattern(regexp = "^[A-Za-z0-9]{6,35}$", message = "The transaction reference must be 6-35 letters or digits")
    private String transactionRef;
}
