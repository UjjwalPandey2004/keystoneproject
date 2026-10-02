package com.keystone.deliveryservice.DTO;

import java.math.BigDecimal;

import com.keystone.deliveryservice.ENUM.PaymentMethod;
import com.keystone.deliveryservice.ENUM.UpiApp;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreatePaymentDTO {

    @NotNull(message = "Choose the work order you are paying for")
    private Long workOrderId;

    @NotNull(message = "Enter the payment amount")
    @DecimalMin(value = "1.00", message = "The amount must be at least 1.00")
    @DecimalMax(value = "1000000.00", message = "The amount cannot exceed 10,00,000.00")
    @Digits(integer = 7, fraction = 2, message = "Use at most 2 decimal places")
    private BigDecimal amount;

    @NotNull(message = "Choose a payment method")
    private PaymentMethod method;

    // For UPI: Google Pay, PhonePe, Paytm or another UPI app.
    private UpiApp upiApp;

    // Optional for UPI: the transaction reference (UTR) shown by the UPI app after paying.
    @Pattern(regexp = "^[A-Za-z0-9]{6,35}$", message = "The UPI transaction reference must be 6-35 letters or digits")
    private String transactionRef;
}
