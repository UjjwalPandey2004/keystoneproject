package com.keystone.deliveryservice.controller;

import java.time.LocalDate;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;

import com.keystone.deliveryservice.DTO.DashboardMetricsDTO;
import com.keystone.deliveryservice.Service.DashboardService;
import com.keystone.deliveryservice.Service.ReportExportService;
import com.keystone.deliveryservice.Service.ResourceAuthorizationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/reports")
@Tag(name = "Reports & Analytics", description = "Operational dashboards, status counts, SLA compliance metrics and CSV exports")
public class ReportController {

    @Autowired
    private DashboardService dashboardService;

    @Autowired
    private ReportExportService exportService;

    @Autowired
    private ResourceAuthorizationService authorizationService;

    @Operation(summary = "Get operational summary metrics and SLA compliance rate (Manager / Dispatcher)")
    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('MANAGER', 'DISPATCHER')")
    public ResponseEntity<DashboardMetricsDTO> getSummaryMetrics(
            @RequestParam(required = false) Long customerId,
            @RequestParam(required = false) Long siteId,
            @RequestParam(required = false) Long technicianId) {
        return ResponseEntity.ok(dashboardService.getDashboardMetrics(customerId, siteId, technicianId));
    }

    @Operation(summary = "Work orders as CSV, optionally created between from and to (Manager)")
    @GetMapping("/export/work-orders")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<byte[]> exportWorkOrders(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            Authentication authentication) {
        return csv("keystone-work-orders.csv",
                exportService.workOrdersCsv(from, to, authorizationService.currentUser(authentication)));
    }

    @Operation(summary = "All customer payments as CSV, optionally made between from and to (Manager)")
    @GetMapping("/export/payments")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<byte[]> exportPayments(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            Authentication authentication) {
        return csv("keystone-payments.csv",
                exportService.paymentsCsv(from, to, authorizationService.currentUser(authentication)));
    }

    @Operation(summary = "Jobs per technician as CSV, optionally for work orders created between from and to (Manager)")
    @GetMapping("/export/technician-workload")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<byte[]> exportTechnicianWorkload(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            Authentication authentication) {
        return csv("keystone-technician-workload.csv",
                exportService.technicianWorkloadCsv(from, to, authorizationService.currentUser(authentication)));
    }

    static ResponseEntity<byte[]> csv(String fileName, byte[] body) {
        return ResponseEntity.ok()
                .contentType(new MediaType("text", "csv", java.nio.charset.StandardCharsets.UTF_8))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(fileName).build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(body);
    }
}
