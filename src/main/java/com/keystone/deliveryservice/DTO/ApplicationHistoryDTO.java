package com.keystone.deliveryservice.DTO;

import java.time.LocalDateTime;

import com.keystone.deliveryservice.ENUM.ApplicationStatus;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ApplicationHistoryDTO {
    private Long id;
    private ApplicationStatus fromStatus;
    private ApplicationStatus toStatus;
    private String action;
    private String changedByName;
    private LocalDateTime changedAt;
}
