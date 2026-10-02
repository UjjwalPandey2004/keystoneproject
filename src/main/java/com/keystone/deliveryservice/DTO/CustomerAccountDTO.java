package com.keystone.deliveryservice.DTO;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import lombok.Builder;
import lombok.Data;

// A registered customer account as the manager sees it.
@Data
@Builder
public class CustomerAccountDTO {
    private Long id;
    private String name;
    private String email;
    private String phone;
    private Long organisationId;
    private String organisationName;
    private boolean emailVerified;
    // ACTIVE, UNVERIFIED (email not confirmed) or UNLINKED (no organisation yet).
    private String status;
    private LocalDateTime joinedAt;

    // Filled in for the detail view only.
    private Long openWorkOrders;
    private Long totalWorkOrders;
    private BigDecimal totalPaid;
    private List<WorkOrderSummary> recentWorkOrders;
    private List<PaymentResponseDTO> payments;

    @Data
    @Builder
    public static class WorkOrderSummary {
        private Long id;
        private String code;
        private String title;
        private String status;
        private LocalDateTime createdAt;
    }
}
