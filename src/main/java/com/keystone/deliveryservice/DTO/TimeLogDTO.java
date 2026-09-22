package com.keystone.deliveryservice.DTO;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimeLogDTO {

    private Long id;
    private Long technicianId;
    private String technicianName;
    private String technicianEmail;
    private Integer minutes;
    private String note;
    private LocalDateTime loggedAt;
}
