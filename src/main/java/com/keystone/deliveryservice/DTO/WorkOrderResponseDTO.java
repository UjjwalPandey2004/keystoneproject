package com.keystone.deliveryservice.DTO;

import java.time.LocalDateTime;
import java.util.List;

import com.keystone.deliveryservice.ENUM.Priority;
import com.keystone.deliveryservice.ENUM.WorkOrderStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkOrderResponseDTO {

    private Long id;
    private String code;
    private String title;
    private String description;
    private Priority priority;
    private WorkOrderStatus status;
    private LocalDateTime slaDueDate;
    private boolean slaBreached;

    // Customer summary
    private Long customerId;
    private String customerName;
    private String customerEmail;

    // Site summary
    private Long siteId;
    private String siteName;
    private String siteAddress;

    // Assignee summary
    private Long assignedToId;
    private String assignedToName;
    private String assignedToEmail;

    // Cost & labor totals
    private Double totalPartsCost;
    private Integer totalLaborMinutes;

    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime completedAt;
    private LocalDateTime closedAt;

    // Audit and line-items
    private List<WorkOrderStatusHistoryDTO> statusHistory;
    private List<PartUsageDTO> partsUsed;
    private List<TimeLogDTO> timeLogs;
}
