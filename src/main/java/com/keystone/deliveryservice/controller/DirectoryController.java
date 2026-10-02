package com.keystone.deliveryservice.controller;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.keystone.deliveryservice.DTO.CustomerAccountDTO;
import com.keystone.deliveryservice.DTO.StaffDTO;
import com.keystone.deliveryservice.Service.DirectoryService;
import com.keystone.deliveryservice.Service.ResourceAuthorizationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@PreAuthorize("hasRole('MANAGER')")
@Tag(name = "Manager Directory", description = "Registered customer accounts and staff (Manager only)")
public class DirectoryController {

    private final DirectoryService directoryService;
    private final ResourceAuthorizationService authorizationService;

    public DirectoryController(DirectoryService directoryService, ResourceAuthorizationService authorizationService) {
        this.directoryService = directoryService;
        this.authorizationService = authorizationService;
    }

    @Operation(summary = "Registered customer accounts, newest first (Manager)")
    @GetMapping("/api/customers/accounts")
    public List<CustomerAccountDTO> customerAccounts(@RequestParam(required = false) Integer limit,
            Authentication authentication) {
        return directoryService.customerAccounts(authorizationService.currentUser(authentication), limit);
    }

    @Operation(summary = "One customer account with work orders and payments (Manager)")
    @GetMapping("/api/customers/accounts/{userId}")
    public CustomerAccountDTO customerAccount(@PathVariable Long userId, Authentication authentication) {
        return directoryService.customerAccount(authorizationService.currentUser(authentication), userId);
    }

    @Operation(summary = "Technicians and dispatchers with location, workload and today's attendance (Manager)")
    @GetMapping("/api/staff")
    public List<StaffDTO> staff(Authentication authentication) {
        return directoryService.staff(authorizationService.currentUser(authentication));
    }
}
