package com.keystone.deliveryservice.DTO;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LogTimeDTO {

    @NotNull(message = "Labor minutes are required")
    @Min(value = 1, message = "Logged minutes must be at least 1")
    private Integer minutes;

    private String note;
}
