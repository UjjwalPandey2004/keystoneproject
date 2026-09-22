package com.keystone.deliveryservice.DTO;

import java.time.LocalDateTime;

import com.keystone.deliveryservice.ENUM.WorkOrderStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkOrderStatusHistoryDTO {

    private Long id;
    private WorkOrderStatus fromStatus;
    private WorkOrderStatus toStatus;
    private String changedByEmail;
    private String changedByName;
    private LocalDateTime changedAt;
    private String notes;
}
