package com.keystone.deliveryservice.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.keystone.deliveryservice.Entity.Site;
import com.keystone.deliveryservice.Service.SiteService;
import com.keystone.deliveryservice.Service.ResourceAuthorizationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/sites")
@Tag(name = "Site Management", description = "Endpoints for managing individual customer buildings and facilities")
public class SiteController {

    @Autowired
    private SiteService siteService;

    @Autowired
    private ResourceAuthorizationService authorizationService;

    @Operation(summary = "Get site by ID")
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'DISPATCHER', 'CUSTOMER')")
    public ResponseEntity<Site> getSiteById(@PathVariable Long id, Authentication authentication) {
        Site site = siteService.getSite(id);
        authorizationService.requireSiteAccess(site, authentication);
        return ResponseEntity.ok(site);
    }

    @Operation(summary = "Update site details (Manager / Dispatcher)")
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'DISPATCHER')")
    public ResponseEntity<Site> updateSite(@PathVariable Long id, @Valid @RequestBody Site site) {
        return ResponseEntity.ok(siteService.UpdateSite(id, site));
    }

    @Operation(summary = "Delete a site (Manager only)")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<Void> deleteSite(@PathVariable Long id) {
        siteService.deleteSite(id);
        return ResponseEntity.noContent().build();
    }
}
