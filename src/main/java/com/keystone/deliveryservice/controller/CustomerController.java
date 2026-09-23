package com.keystone.deliveryservice.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.keystone.deliveryservice.DTO.ApiDtoMapper;
import com.keystone.deliveryservice.DTO.CustomerRequestDTO;
import com.keystone.deliveryservice.DTO.CustomerResponseDTO;
import com.keystone.deliveryservice.DTO.SiteRequestDTO;
import com.keystone.deliveryservice.DTO.SiteResponseDTO;
import com.keystone.deliveryservice.Entity.Customer;
import com.keystone.deliveryservice.Entity.Site;
import com.keystone.deliveryservice.Service.CustomerServiceLogic;
import com.keystone.deliveryservice.Service.ResourceAuthorizationService;
import com.keystone.deliveryservice.Service.SiteService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/customers")
@Tag(name = "Customer Management", description = "Endpoints for managing client organizations and their physical sites")
public class CustomerController {

    @Autowired
    private CustomerServiceLogic customerService;

    @Autowired
    private SiteService siteService;

    @Autowired
    private ResourceAuthorizationService authorizationService;

    @Operation(summary = "Create a new customer (Manager / Dispatcher)")
    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'DISPATCHER')")
    public ResponseEntity<CustomerResponseDTO> createCustomer(@Valid @RequestBody CustomerRequestDTO request) {
        Customer created = customerService.createCustomer(ApiDtoMapper.toCustomerEntity(request));
        return new ResponseEntity<>(ApiDtoMapper.toCustomerResponse(created), HttpStatus.CREATED);
    }

    @Operation(summary = "List all customers (Manager / Dispatcher)")
    @GetMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'DISPATCHER')")
    public ResponseEntity<Page<CustomerResponseDTO>> getAllCustomers(
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100),
                Sort.by("companyName").ascending());
        return ResponseEntity.ok(customerService.searchCustomers(query, pageable).map(ApiDtoMapper::toCustomerResponse));
    }

    @Operation(summary = "Get a customer by ID")
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'DISPATCHER', 'CUSTOMER')")
    public ResponseEntity<CustomerResponseDTO> getCustomerById(@PathVariable Long id, Authentication authentication) {
        Customer customer = customerService.getCustomer(id);
        authorizationService.requireCustomerAccess(customer, authentication);
        return ResponseEntity.ok(ApiDtoMapper.toCustomerResponse(customer));
    }

    @Operation(summary = "Update customer details (Manager / Dispatcher)")
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'DISPATCHER')")
    public ResponseEntity<CustomerResponseDTO> updateCustomer(@PathVariable Long id,
            @Valid @RequestBody CustomerRequestDTO request) {
        Customer updated = customerService.updateCustomer(id, ApiDtoMapper.toCustomerEntity(request));
        return ResponseEntity.ok(ApiDtoMapper.toCustomerResponse(updated));
    }

    @Operation(summary = "Get all sites belonging to a customer")
    @GetMapping("/{customerId}/sites")
    @PreAuthorize("hasAnyRole('MANAGER', 'DISPATCHER', 'CUSTOMER')")
    public ResponseEntity<Page<SiteResponseDTO>> getSitesByCustomer(
            @PathVariable Long customerId,
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        authorizationService.requireCustomerAccess(customerService.getCustomer(customerId), authentication);
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100),
                Sort.by("SiteName").ascending());
        return ResponseEntity.ok(siteService.searchSitesByCustomer(customerId, query, pageable)
                .map(ApiDtoMapper::toSiteResponse));
    }

    @Operation(summary = "Add a new site to a customer (Manager / Dispatcher)")
    @PostMapping("/{customerId}/sites")
    @PreAuthorize("hasAnyRole('MANAGER', 'DISPATCHER')")
    public ResponseEntity<SiteResponseDTO> addSiteToCustomer(@PathVariable Long customerId,
            @Valid @RequestBody SiteRequestDTO request) {
        Customer customer = customerService.getCustomer(customerId);
        Site site = ApiDtoMapper.toSiteEntity(request);
        site.setCustomer(customer);
        Site created = siteService.createSite(site);
        return new ResponseEntity<>(ApiDtoMapper.toSiteResponse(created), HttpStatus.CREATED);
    }
}
