package com.keystone.deliveryservice.ENUM;

public enum PaymentMethod {
    CASH,
    UPI,
    UPI_QR,
    // Debit/credit card on the card machine at the service visit (no card details are taken online).
    CARD;

    public boolean isUpi() {
        return this == UPI || this == UPI_QR;
    }
}
