package com.keystone.deliveryservice.ENUM;

public enum Priority {
    LOW(72),        // 72 hours SLA
    MEDIUM(48),     // 48 hours SLA
    HIGH(24),       // 24 hours SLA
    CRITICAL(4);    // 4 hours SLA

    private final int slaHours;

    Priority(int slaHours) {
        this.slaHours = slaHours;
    }

    public int getSlaHours() {
        return slaHours;
    }
}
