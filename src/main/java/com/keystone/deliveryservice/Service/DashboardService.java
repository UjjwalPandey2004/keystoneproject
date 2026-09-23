package com.keystone.deliveryservice.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.keystone.deliveryservice.DTO.DashboardMetricsDTO;
import com.keystone.deliveryservice.ENUM.WorkOrderStatus;
import com.keystone.deliveryservice.Entity.WorkOrder;
import com.keystone.deliveryservice.Repository.WorkOrderRepository;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    @Autowired
    private WorkOrderRepository workOrderRepo;

    public DashboardMetricsDTO getDashboardMetrics(Long customerId, Long siteId, Long technicianId) {
        LocalDateTime now = LocalDateTime.now();
        List<WorkOrder> orders = workOrderRepo.findAll().stream()
                .filter(order -> customerId == null || order.getCustomer().getId() == customerId)
                .filter(order -> siteId == null || order.getSite().getId().equals(siteId))
                .filter(order -> technicianId == null
                        || (order.getAssignedTo() != null && order.getAssignedTo().getId().equals(technicianId)))
                .toList();

        long newOrders = countStatus(orders, WorkOrderStatus.NEW);
        long assignedOrders = countStatus(orders, WorkOrderStatus.ASSIGNED);
        long inProgressOrders = countStatus(orders, WorkOrderStatus.IN_PROGRESS);
        long onHoldOrders = countStatus(orders, WorkOrderStatus.ON_HOLD);
        long completedOrders = countStatus(orders, WorkOrderStatus.COMPLETED);
        long closedOrders = countStatus(orders, WorkOrderStatus.CLOSED);
        long cancelledOrders = countStatus(orders, WorkOrderStatus.CANCELLED);

        long totalOpen = orders.stream().filter(order -> !order.getStatus().isTerminal()).count();
        long overdueOrders = orders.stream().filter(order -> !order.getStatus().isTerminal())
                .filter(order -> order.getSlaDueDate().isBefore(now)).count();
        long atRiskOrders = orders.stream().filter(WorkOrder::isSlaAtRisk)
                .filter(order -> !order.isSlaBreached()).count();
        long totalClosed = closedOrders;
        long totalClosedWithinSla = orders.stream()
                .filter(order -> order.getStatus() == WorkOrderStatus.CLOSED && !order.isSlaBreached()).count();

        Map<String, Long> technicianBreakdown = orders.stream().collect(Collectors.groupingBy(
                order -> order.getAssignedTo() == null ? "Unassigned" : order.getAssignedTo().getUserName(),
                Collectors.counting()));
        Map<String, Long> siteBreakdown = orders.stream().collect(Collectors.groupingBy(
                order -> order.getSite().getSiteName(), Collectors.counting()));

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
                .atRiskOrders(atRiskOrders)
                .totalClosed(totalClosed)
                .totalClosedWithinSla(totalClosedWithinSla)
                .technicianBreakdown(technicianBreakdown)
                .siteBreakdown(siteBreakdown)
                .slaCompliancePercentage(complianceRate)
                .build();
    }

    private long countStatus(List<WorkOrder> orders, WorkOrderStatus status) {
        return orders.stream().filter(order -> order.getStatus() == status).count();
    }
}
