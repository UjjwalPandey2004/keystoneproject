package com.keystone.deliveryservice.ENUM;

// A payment is PENDING until a manager confirms the money arrived (PAID) or rejects it (FAILED).
// The customer may CANCEL while it is still PENDING.
public enum PaymentStatus {
    PENDING,
    PAID,
    FAILED,
    CANCELLED
}
