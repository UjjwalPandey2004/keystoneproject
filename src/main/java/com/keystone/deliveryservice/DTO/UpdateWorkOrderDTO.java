package com.keystone.deliveryservice.DTO;

import com.keystone.deliveryservice.ENUM.Priority;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateWorkOrderDTO {

    private String title;
    private String description;
    private Priority priority;
}
