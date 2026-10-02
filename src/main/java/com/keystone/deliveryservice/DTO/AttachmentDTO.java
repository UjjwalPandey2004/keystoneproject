package com.keystone.deliveryservice.DTO;

import java.time.LocalDateTime;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AttachmentDTO {
    private Long id;
    private String fileName;
    private String contentType;
    private Long sizeBytes;
    private String uploadedByName;
    private LocalDateTime uploadedAt;
}
