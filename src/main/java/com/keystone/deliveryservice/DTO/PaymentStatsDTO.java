package com.keystone.deliveryservice.DTO;

import java.math.BigDecimal;

import lombok.Builder;
import lombok.Data;

// Company-wide payment figures. Manager only.
@Data
@Builder
public class PaymentStatsDTO {
    // Sum of confirmed (PAID) payments.
    private BigDecimal totalRevenue;
    private long totalPayments;
    private long paidPayments;
    // Number of payments per method, any status.
    private long cashPayments;
    private long upiPayments;
    private long qrPayments;
    private long cardPayments;
    // Confirmed amount per method.
    private BigDecimal cashRevenue;
    private BigDecimal upiRevenue;
    private BigDecimal qrRevenue;
    private BigDecimal cardRevenue;
    private long pendingPayments;
    private BigDecimal pendingAmount;
    private long failedPayments;
    private long cancelledPayments;
    private String currency;
}
