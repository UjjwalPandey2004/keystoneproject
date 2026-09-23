package com.keystone.deliveryservice.controller;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.keystone.deliveryservice.DTO.CreateUserDTO;
import com.keystone.deliveryservice.DTO.UpdateUserDTO;
import com.keystone.deliveryservice.DTO.UserResponseDTO;
import com.keystone.deliveryservice.Service.UserManagementService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/users")
@Tag(name = "User Management", description = "Manager user administration and technician directory")
public class UserManagementController {
    private final UserManagementService userManagementService;

    public UserManagementController(UserManagementService userManagementService) {
        this.userManagementService = userManagementService;
    }

    @GetMapping
    @PreAuthorize("hasRole('MANAGER')")
    @Operation(summary = "List users (Manager only)")
    public Page<UserResponseDTO> list(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return userManagementService.list(PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100),
                Sort.by("userName").ascending()));
    }

    @GetMapping("/technicians")
    @PreAuthorize("hasAnyRole('MANAGER', 'DISPATCHER')")
    @Operation(summary = "List technicians available for assignment")
    public List<UserResponseDTO> technicians() {
        return userManagementService.listTechnicians();
    }

    @PostMapping
    @PreAuthorize("hasRole('MANAGER')")
    @Operation(summary = "Create a staff or customer user (Manager only)")
    public ResponseEntity<UserResponseDTO> create(@Valid @RequestBody CreateUserDTO request) {
        return new ResponseEntity<>(userManagementService.create(request), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    @Operation(summary = "Update a user's profile and role (Manager only)")
    public UserResponseDTO update(@PathVariable Long id, @Valid @RequestBody UpdateUserDTO request) {
        return userManagementService.update(id, request);
    }
}
