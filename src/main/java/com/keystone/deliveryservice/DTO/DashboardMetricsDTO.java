package com.keystone.deliveryservice.DTO;

import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardMetricsDTO {

    private long newOrders;
    private long assignedOrders;
    private long inProgressOrders;
    private long onHoldOrders;
    private long completedOrders;
    private long closedOrders;
    private long cancelledOrders;

    private long totalOpen;
    private long overdueOrders;
    private long atRiskOrders;
    private double slaCompliancePercentage;
    private long totalClosed;
    private long totalClosedWithinSla;
    private Map<String, Long> technicianBreakdown;
    private Map<String, Long> siteBreakdown;
}
