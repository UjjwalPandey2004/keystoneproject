package com.keystone.deliveryservice.DTO;

import com.keystone.deliveryservice.ENUM.WorkOrderStatus;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransitionStatusDTO {

    @NotNull(message = "Target status is required")
    private WorkOrderStatus status;

    private String note;
}
