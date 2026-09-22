package com.keystone.deliveryservice.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.keystone.deliveryservice.Entity.Part;
import com.keystone.deliveryservice.Repository.PartRepository;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/parts")
@Tag(name = "Parts & Inventory", description = "Endpoints for managing inventory parts and stock quantities")
public class PartController {

    @Autowired
    private PartRepository partRepo;

    @Operation(summary = "List all parts and stock levels")
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Part>> listParts() {
        return ResponseEntity.ok(partRepo.findAll());
    }

    @Operation(summary = "Get part by ID")
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Part> getPartById(@PathVariable Long id) {
        Part part = partRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Part not found with ID: " + id));
        return ResponseEntity.ok(part);
    }

    @Operation(summary = "Add a new inventory part (Manager only)")
    @PostMapping
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<Part> createPart(@Valid @RequestBody Part part) {
        if (partRepo.existsBySku(part.getSku())) {
            throw new IllegalArgumentException("Part with SKU " + part.getSku() + " already exists.");
        }
        Part created = partRepo.save(part);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @Operation(summary = "Update part pricing or stock quantity (Manager only)")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<Part> updatePart(@PathVariable Long id, @Valid @RequestBody Part partDetails) {
        Part part = partRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Part not found with ID: " + id));

        if (partDetails.getStockQty() != null && partDetails.getStockQty() < 0) {
            throw new IllegalArgumentException("Stock quantity cannot be negative");
        }
        if (partDetails.getUnitCost() != null && partDetails.getUnitCost() < 0) {
            throw new IllegalArgumentException("Unit cost cannot be negative");
        }

        part.setName(partDetails.getName());
        part.setUnitCost(partDetails.getUnitCost());
        part.setStockQty(partDetails.getStockQty());
        part.setMinStockQty(partDetails.getMinStockQty());

        return ResponseEntity.ok(partRepo.save(part));
    }
}
