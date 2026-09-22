package com.keystone.deliveryservice.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.keystone.deliveryservice.DTO.DashboardMetricsDTO;
import com.keystone.deliveryservice.Service.DashboardService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/reports")
@Tag(name = "Reports & Analytics", description = "Operational dashboards, status counts, and SLA compliance metrics")
public class ReportController {

    @Autowired
    private DashboardService dashboardService;

    @Operation(summary = "Get operational summary metrics and SLA compliance rate (Manager / Dispatcher)")
    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('MANAGER', 'DISPATCHER')")
    public ResponseEntity<DashboardMetricsDTO> getSummaryMetrics() {
        return ResponseEntity.ok(dashboardService.getDashboardMetrics());
    }
}
