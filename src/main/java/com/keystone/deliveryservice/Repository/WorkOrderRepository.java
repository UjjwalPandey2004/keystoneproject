package com.keystone.deliveryservice.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.keystone.deliveryservice.ENUM.WorkOrderStatus;
import com.keystone.deliveryservice.Entity.WorkOrder;

@Repository
public interface WorkOrderRepository extends JpaRepository<WorkOrder, Long> {

    Optional<WorkOrder> findByCode(String code);

    boolean existsByCode(String code);

    @Query(value = "SELECT nextval('work_order_code_seq')", nativeQuery = true)
    Long nextWorkOrderCodeValue();

    // Filtered & scoped pagination queries
    Page<WorkOrder> findByCustomerId(Long customerId, Pageable pageable);

    Page<WorkOrder> findByAssignedToId(Long technicianId, Pageable pageable);

    Page<WorkOrder> findByStatus(WorkOrderStatus status, Pageable pageable);

    Page<WorkOrder> findByCustomerIdAndStatus(Long customerId, WorkOrderStatus status, Pageable pageable);

    Page<WorkOrder> findByAssignedToIdAndStatus(Long technicianId, WorkOrderStatus status, Pageable pageable);

    // SLA Monitoring queries
    @Query("SELECT w FROM WorkOrder w WHERE w.slaBreached = false AND w.status NOT IN ('CLOSED', 'CANCELLED') AND w.slaDueDate < :now")
    List<WorkOrder> findBreachedWorkOrders(@Param("now") LocalDateTime now);

    @Query("SELECT w FROM WorkOrder w WHERE w.slaAtRisk = false AND w.slaBreached = false " +
            "AND w.status NOT IN ('CLOSED', 'CANCELLED') AND w.slaDueDate > :now AND w.slaDueDate <= :latest")
    List<WorkOrder> findPotentiallyAtRiskWorkOrders(@Param("now") LocalDateTime now,
            @Param("latest") LocalDateTime latest);

    // Dashboard metrics
    long countByStatus(WorkOrderStatus status);

    @Query("SELECT COUNT(w) FROM WorkOrder w WHERE w.status NOT IN ('CLOSED', 'CANCELLED') AND w.slaDueDate < :now")
    long countOverdueWorkOrders(@Param("now") LocalDateTime now);

    long countBySlaBreachedTrue();

    @Query("SELECT COUNT(w) FROM WorkOrder w WHERE w.status = 'CLOSED' AND w.slaBreached = false")
    long countClosedWithinSla();

    @Query("SELECT COUNT(w) FROM WorkOrder w WHERE w.status = 'CLOSED'")
    long countTotalClosed();

    @Query("SELECT COUNT(w) FROM WorkOrder w WHERE w.status NOT IN ('CLOSED', 'CANCELLED')")
    long countTotalOpen();
}
