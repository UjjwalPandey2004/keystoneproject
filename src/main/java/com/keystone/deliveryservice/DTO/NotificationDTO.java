package com.keystone.deliveryservice.DTO;

import java.time.LocalDateTime;

import com.keystone.deliveryservice.ENUM.NotificationType;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class NotificationDTO {
    private Long id;
    private NotificationType type;
    private String title;
    private String message;
    private String referenceType;
    private Long referenceId;
    private String referenceLabel;
    private boolean read;
    private LocalDateTime createdAt;
}
