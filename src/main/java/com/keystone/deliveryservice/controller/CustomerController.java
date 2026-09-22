package com.keystone.deliveryservice.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.keystone.deliveryservice.Entity.Customer;
import com.keystone.deliveryservice.Entity.Site;
import com.keystone.deliveryservice.Service.CustomerServiceLogic;
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

    @Operation(summary = "Create a new customer (Manager / Dispatcher)")
    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'DISPATCHER')")
    public ResponseEntity<Customer> createCustomer(@Valid @RequestBody Customer customer) {
        Customer created = customerService.createCustomer(customer);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @Operation(summary = "List all customers (Manager / Dispatcher)")
    @GetMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'DISPATCHER')")
    public ResponseEntity<List<Customer>> getAllCustomers() {
        return ResponseEntity.ok(customerService.getAllCustomer());
    }

    @Operation(summary = "Get a customer by ID")
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'DISPATCHER', 'CUSTOMER')")
    public ResponseEntity<Customer> getCustomerById(@PathVariable Long id) {
        return ResponseEntity.ok(customerService.getCustomer(id));
    }

    @Operation(summary = "Update customer details (Manager / Dispatcher)")
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'DISPATCHER')")
    public ResponseEntity<Customer> updateCustomer(@PathVariable Long id, @Valid @RequestBody Customer customer) {
        return ResponseEntity.ok(customerService.updateCustomer(id, customer));
    }

    @Operation(summary = "Get all sites belonging to a customer")
    @GetMapping("/{customerId}/sites")
    @PreAuthorize("hasAnyRole('MANAGER', 'DISPATCHER', 'CUSTOMER')")
    public ResponseEntity<List<Site>> getSitesByCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(siteService.getSiteByCustomer(customerId));
    }

    @Operation(summary = "Add a new site to a customer (Manager / Dispatcher)")
    @PostMapping("/{customerId}/sites")
    @PreAuthorize("hasAnyRole('MANAGER', 'DISPATCHER')")
    public ResponseEntity<Site> addSiteToCustomer(@PathVariable Long customerId, @Valid @RequestBody Site site) {
        Customer customer = customerService.getCustomer(customerId);
        site.setCustomer(customer);
        Site created = siteService.createSite(site);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }
}
