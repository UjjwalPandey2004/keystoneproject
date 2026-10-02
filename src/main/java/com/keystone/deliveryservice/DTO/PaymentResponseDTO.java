package com.keystone.deliveryservice.DTO;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.keystone.deliveryservice.ENUM.PaymentMethod;
import com.keystone.deliveryservice.ENUM.PaymentStatus;
import com.keystone.deliveryservice.ENUM.UpiApp;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PaymentResponseDTO {
    private Long id;
    private String reference;
    private Long workOrderId;
    private String workOrderCode;
    private String workOrderTitle;
    private Long customerId;
    private String customerName;
    private String payerName;
    private String payerEmail;
    private String payerPhone;
    private String customerAddress;
    // The problem the customer paid for.
    private String workOrderDescription;
    private UpiApp upiApp;
    private BigDecimal amount;
    private String currency;
    private PaymentMethod method;
    private PaymentStatus status;
    private String transactionRef;
    private String failureReason;
    private String verifiedByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime paidAt;
    // For a pending UPI payment: the upi://pay link the customer's app (or QR code) opens.
    private String upiUri;
}
