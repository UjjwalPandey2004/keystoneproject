package com.keystone.deliveryservice.DTO;

import java.time.LocalDateTime;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CustomerResponseDTO {
    private long id;
    private String companyName;
    private String contactPerson;
    private String email;
    private String phone;
    private String address;
    private boolean active;
    private LocalDateTime createdAt;
}
