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
public class PartUsageDTO {

    private Long id;
    private Long partId;
    private String partName;
    private String sku;
    private Integer quantityUsed;
    private Double unitCost;
    private Double totalCost;
    private String usedByName;
    private LocalDateTime usedAt;
}
