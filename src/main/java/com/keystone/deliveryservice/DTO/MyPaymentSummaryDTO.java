package com.keystone.deliveryservice.DTO;

import java.math.BigDecimal;

import lombok.Builder;
import lombok.Data;

// Totals for the signed-in customer's own payments only.
@Data
@Builder
public class MyPaymentSummaryDTO {
    // Paid plus waiting for confirmation (failed and cancelled payments are not counted).
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private BigDecimal pendingAmount;
    private long paymentCount;
    private long pendingCount;
    private String currency;
}
