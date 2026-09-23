package com.keystone.deliveryservice.Service;

import java.time.LocalDateTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.keystone.deliveryservice.Entity.WorkOrder;
import com.keystone.deliveryservice.Entity.WorkOrderStatusHistory;
import com.keystone.deliveryservice.Entity.UserAuth;
import com.keystone.deliveryservice.ENUM.Role;
import com.keystone.deliveryservice.Repository.UserAuthRepository;
import com.keystone.deliveryservice.Repository.WorkOrderRepository;
import com.keystone.deliveryservice.Repository.WorkOrderStatusHistoryRepository;

@Service
public class SlaMonitoringService {

    private static final Logger log = LoggerFactory.getLogger(SlaMonitoringService.class);

    @Autowired
    private WorkOrderRepository workOrderRepo;

    @Autowired
    private WorkOrderStatusHistoryRepository historyRepo;

    @Autowired
    private UserAuthRepository userRepo;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    /**
     * Runs every 60 seconds to detect open work orders that passed their SLA due date.
     * Section 09 - F7: A scheduled job flags work orders at risk of, or in, breach.
     */
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void monitorSlaBreaches() {
        LocalDateTime now = LocalDateTime.now();
        markAtRiskOrders(now);
        List<WorkOrder> breachedOrders = workOrderRepo.findBreachedWorkOrders(now);

        if (!breachedOrders.isEmpty()) {
            log.warn("SLA Monitor detected {} new SLA breach(es)", breachedOrders.size());

            for (WorkOrder order : breachedOrders) {
                order.setSlaBreached(true);
                workOrderRepo.save(order);

                // Add audit entry
                WorkOrderStatusHistory history = WorkOrderStatusHistory.builder()
                        .workOrder(order)
                        .fromStatus(order.getStatus())
                        .toStatus(order.getStatus())
                        .changedBy(null) // SYSTEM
                        .changedAt(now)
                        .notes("AUTOMATED ALERT: SLA deadline breached (Due: " + order.getSlaDueDate() + ")")
                        .build();
                historyRepo.save(history);

                notifyManagers(
                        "SLA breached: " + order.getCode(),
                        order.getCode() + " - " + order.getTitle()
                                + " breached its SLA deadline at " + order.getSlaDueDate());

                log.warn("ALERT: Work order {} ({}) breached SLA deadline.", order.getCode(), order.getTitle());
            }
        }
    }

    private void markAtRiskOrders(LocalDateTime now) {
        List<WorkOrder> candidates = workOrderRepo.findPotentiallyAtRiskWorkOrders(now, now.plusHours(18));
        for (WorkOrder order : candidates) {
            long warningHours = Math.max(1, order.getPriority().getSlaHours() / 4);
            if (!order.getSlaDueDate().isAfter(now.plusHours(warningHours))) {
                order.setSlaAtRisk(true);
                workOrderRepo.save(order);

                historyRepo.save(WorkOrderStatusHistory.builder()
                        .workOrder(order)
                        .fromStatus(order.getStatus())
                        .toStatus(order.getStatus())
                        .changedBy(null)
                        .changedAt(now)
                        .notes("AUTOMATED WARNING: Work order is approaching its SLA deadline (Due: "
                                + order.getSlaDueDate() + ")")
                        .build());

                notifyManagers(
                        "SLA at risk: " + order.getCode(),
                        order.getCode() + " - " + order.getTitle()
                                + " is approaching its SLA deadline at " + order.getSlaDueDate());
            }
        }
    }

    private void notifyManagers(String subject, String body) {
        for (UserAuth manager : userRepo.findByRole(Role.MANAGER)) {
            eventPublisher.publishEvent(new NotificationEvent(manager.getUserEmail(), subject, body));
        }
    }
}
