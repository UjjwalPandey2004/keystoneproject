package com.keystone.deliveryservice.ENUM;

public enum WorkOrderStatus {
    NEW,
    ASSIGNED,
    IN_PROGRESS,
    ON_HOLD,
    COMPLETED,
    CLOSED,
    CANCELLED;

    public boolean isTerminal() {
        return this == CLOSED || this == CANCELLED;
    }

    public boolean isOpen() {
        return !isTerminal();
    }
}
