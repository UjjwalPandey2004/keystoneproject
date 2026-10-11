package com.keystone.deliveryservice.DTO;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CancelRequestDTO {

    // Optional: why the request is being cancelled.
    @Size(max = 500, message = "The reason can be at most 500 characters")
    private String reason;
}
