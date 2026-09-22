package com.keystone.deliveryservice.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.keystone.deliveryservice.DTO.AssignWorkOrderDTO;
import com.keystone.deliveryservice.DTO.CreateWorkOrderDTO;
import com.keystone.deliveryservice.DTO.LogPartsDTO;
import com.keystone.deliveryservice.DTO.LogTimeDTO;
import com.keystone.deliveryservice.DTO.PartUsageDTO;
import com.keystone.deliveryservice.DTO.TimeLogDTO;
import com.keystone.deliveryservice.DTO.TransitionStatusDTO;
import com.keystone.deliveryservice.DTO.UpdateWorkOrderDTO;
import com.keystone.deliveryservice.DTO.WorkOrderResponseDTO;
import com.keystone.deliveryservice.ENUM.WorkOrderStatus;
import com.keystone.deliveryservice.Entity.UserAuth;
import com.keystone.deliveryservice.Repository.UserAuthRepository;
import com.keystone.deliveryservice.Service.WorkOrderService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/work-orders")
@Tag(name = "Work Orders", description = "Endpoints for creating, assigning, transitioning, and tracking work orders")
public class WorkOrderController {

    @Autowired
    private WorkOrderService workOrderService;

    @Autowired
    private UserAuthRepository userRepo;

    private UserAuth getCurrentUser(Authentication auth) {
        return userRepo.findByUserEmail(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("Authenticated user not found"));
    }

    @Operation(summary = "Create a new work order (Dispatcher / Manager / Customer)")
    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'DISPATCHER', 'CUSTOMER')")
    public ResponseEntity<WorkOrderResponseDTO> createWorkOrder(
            @Valid @RequestBody CreateWorkOrderDTO dto,
            Authentication auth) {
        UserAuth user = getCurrentUser(auth);
        WorkOrderResponseDTO created = workOrderService.createWorkOrder(dto, user);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @Operation(summary = "List work orders with role-scoping, filtering, and pagination")
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<WorkOrderResponseDTO>> listWorkOrders(
            @RequestParam(required = false) WorkOrderStatus status,
            @RequestParam(required = false) Long customerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction,
            Authentication auth) {

        Sort sort = direction.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        UserAuth user = getCurrentUser(auth);

        return ResponseEntity.ok(workOrderService.getWorkOrders(status, customerId, pageable, user));
    }

    @Operation(summary = "Fetch a single work order by ID with complete audit history and line items")
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<WorkOrderResponseDTO> getWorkOrderById(
            @PathVariable Long id,
            Authentication auth) {
        UserAuth user = getCurrentUser(auth);
        return ResponseEntity.ok(workOrderService.getWorkOrderById(id, user));
    }

    @Operation(summary = "Update details of an open work order (Manager / Dispatcher)")
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'DISPATCHER')")
    public ResponseEntity<WorkOrderResponseDTO> updateWorkOrder(
            @PathVariable Long id,
            @Valid @RequestBody UpdateWorkOrderDTO dto,
            Authentication auth) {
        UserAuth user = getCurrentUser(auth);
        return ResponseEntity.ok(workOrderService.updateWorkOrder(id, dto, user));
    }

    @Operation(summary = "Assign work order to a technician (Manager / Dispatcher)")
    @PostMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('MANAGER', 'DISPATCHER')")
    public ResponseEntity<WorkOrderResponseDTO> assignWorkOrder(
            @PathVariable Long id,
            @Valid @RequestBody AssignWorkOrderDTO dto,
            Authentication auth) {
        UserAuth user = getCurrentUser(auth);
        return ResponseEntity.ok(workOrderService.assignWorkOrder(id, dto, user));
    }

    @Operation(summary = "Transition work order status validated against the state machine lifecycle")
    @PostMapping("/{id}/status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<WorkOrderResponseDTO> transitionStatus(
            @PathVariable Long id,
            @Valid @RequestBody TransitionStatusDTO dto,
            Authentication auth) {
        UserAuth user = getCurrentUser(auth);
        return ResponseEntity.ok(workOrderService.transitionStatus(id, dto, user));
    }

    @Operation(summary = "Log parts used on a job (Technician / Manager) - transactionally decrements inventory stock")
    @PostMapping("/{id}/parts")
    @PreAuthorize("hasAnyRole('TECHNICIAN', 'MANAGER')")
    public ResponseEntity<PartUsageDTO> logParts(
            @PathVariable Long id,
            @Valid @RequestBody LogPartsDTO dto,
            Authentication auth) {
        UserAuth user = getCurrentUser(auth);
        PartUsageDTO usage = workOrderService.logParts(id, dto, user);
        return new ResponseEntity<>(usage, HttpStatus.CREATED);
    }

    @Operation(summary = "Log labor time spent on a job (Technician / Manager)")
    @PostMapping("/{id}/time")
    @PreAuthorize("hasAnyRole('TECHNICIAN', 'MANAGER')")
    public ResponseEntity<TimeLogDTO> logTime(
            @PathVariable Long id,
            @Valid @RequestBody LogTimeDTO dto,
            Authentication auth) {
        UserAuth user = getCurrentUser(auth);
        TimeLogDTO timeLog = workOrderService.logTime(id, dto, user);
        return new ResponseEntity<>(timeLog, HttpStatus.CREATED);
    }
}
