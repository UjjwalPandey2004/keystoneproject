package com.keystone.deliveryservice.DTO;

import lombok.Builder;
import lombok.Data;

// Public payment settings the customer screen needs. Contains no secrets.
@Data
@Builder
public class PaymentConfigDTO {
    private boolean upiEnabled;
    private String upiVpa;
    private String payeeName;
    private String currency;
}
