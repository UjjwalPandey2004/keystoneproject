package com.keystone.deliveryservice.controller;

import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.keystone.deliveryservice.DTO.NotificationDTO;
import com.keystone.deliveryservice.Service.NotificationService;
import com.keystone.deliveryservice.Service.ResourceAuthorizationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/notifications")
@PreAuthorize("isAuthenticated()")
@Tag(name = "Notifications", description = "The signed-in user's own in-app notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final ResourceAuthorizationService authorizationService;

    public NotificationController(NotificationService notificationService,
            ResourceAuthorizationService authorizationService) {
        this.notificationService = notificationService;
        this.authorizationService = authorizationService;
    }

    @Operation(summary = "List my notifications, newest first")
    @GetMapping
    public Page<NotificationDTO> list(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size, Authentication authentication) {
        return notificationService.listFor(authorizationService.currentUser(authentication), page, size);
    }

    @Operation(summary = "Number of my unread notifications")
    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount(Authentication authentication) {
        return Map.of("count", notificationService.unreadCount(authorizationService.currentUser(authentication)));
    }

    @Operation(summary = "Mark one of my notifications as read")
    @PostMapping("/{id}/read")
    public NotificationDTO markRead(@PathVariable Long id, Authentication authentication) {
        return notificationService.markRead(authorizationService.currentUser(authentication), id);
    }

    @Operation(summary = "Mark all my notifications as read")
    @PostMapping("/read-all")
    public Map<String, Integer> markAllRead(Authentication authentication) {
        return Map.of("updated", notificationService.markAllRead(authorizationService.currentUser(authentication)));
    }
}
