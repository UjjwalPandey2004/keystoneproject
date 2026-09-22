package com.keystone.deliveryservice.Service;

import java.time.LocalDateTime;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.keystone.deliveryservice.DTO.DashboardMetricsDTO;
import com.keystone.deliveryservice.ENUM.WorkOrderStatus;
import com.keystone.deliveryservice.Repository.WorkOrderRepository;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    @Autowired
    private WorkOrderRepository workOrderRepo;

    public DashboardMetricsDTO getDashboardMetrics() {
        long newOrders = workOrderRepo.countByStatus(WorkOrderStatus.NEW);
        long assignedOrders = workOrderRepo.countByStatus(WorkOrderStatus.ASSIGNED);
        long inProgressOrders = workOrderRepo.countByStatus(WorkOrderStatus.IN_PROGRESS);
        long onHoldOrders = workOrderRepo.countByStatus(WorkOrderStatus.ON_HOLD);
        long completedOrders = workOrderRepo.countByStatus(WorkOrderStatus.COMPLETED);
        long closedOrders = workOrderRepo.countByStatus(WorkOrderStatus.CLOSED);
        long cancelledOrders = workOrderRepo.countByStatus(WorkOrderStatus.CANCELLED);

        long totalOpen = workOrderRepo.countTotalOpen();
        long overdueOrders = workOrderRepo.countOverdueWorkOrders(LocalDateTime.now());
        long totalClosed = workOrderRepo.countTotalClosed();
        long totalClosedWithinSla = workOrderRepo.countClosedWithinSla();

        double complianceRate = totalClosed > 0 
                ? Math.round(((double) totalClosedWithinSla / totalClosed * 100.0) * 10.0) / 10.0 
                : 100.0;

        return DashboardMetricsDTO.builder()
                .newOrders(newOrders)
                .assignedOrders(assignedOrders)
                .inProgressOrders(inProgressOrders)
                .onHoldOrders(onHoldOrders)
                .completedOrders(completedOrders)
                .closedOrders(closedOrders)
                .cancelledOrders(cancelledOrders)
                .totalOpen(totalOpen)
                .overdueOrders(overdueOrders)
                .totalClosed(totalClosed)
                .totalClosedWithinSla(totalClosedWithinSla)
                .slaCompliancePercentage(complianceRate)
                .build();
    }
}
