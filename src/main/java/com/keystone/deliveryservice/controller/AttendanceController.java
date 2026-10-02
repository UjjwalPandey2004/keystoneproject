package com.keystone.deliveryservice.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
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

import com.keystone.deliveryservice.DTO.AttendanceDTO;
import com.keystone.deliveryservice.DTO.MarkAttendanceDTO;
import com.keystone.deliveryservice.Service.AttendanceService;
import com.keystone.deliveryservice.Service.ResourceAuthorizationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/attendance")
@Tag(name = "Attendance", description = "Staff attendance: staff see their own, managers see everyone. No customer access.")
public class AttendanceController {

    private final AttendanceService attendanceService;
    private final ResourceAuthorizationService authorizationService;

    public AttendanceController(AttendanceService attendanceService, ResourceAuthorizationService authorizationService) {
        this.attendanceService = attendanceService;
        this.authorizationService = authorizationService;
    }

    @Operation(summary = "All staff attendance for a day, default today (Manager)")
    @GetMapping
    @PreAuthorize("hasRole('MANAGER')")
    public List<AttendanceDTO> forDay(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            Authentication authentication) {
        return attendanceService.forDay(authorizationService.currentUser(authentication), date != null ? date : LocalDate.now());
    }

    @Operation(summary = "Set a staff member's status for a day, e.g. ON_LEAVE (Manager)")
    @PutMapping("/{userId}")
    @PreAuthorize("hasRole('MANAGER')")
    public AttendanceDTO mark(@PathVariable Long userId, @Valid @RequestBody MarkAttendanceDTO request,
            Authentication authentication) {
        return attendanceService.mark(authorizationService.currentUser(authentication), userId, request);
    }

    @Operation(summary = "My own attendance for the last N days (Technician / Dispatcher)")
    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('TECHNICIAN', 'DISPATCHER')")
    public List<AttendanceDTO> mine(@RequestParam(defaultValue = "14") int days, Authentication authentication) {
        return attendanceService.mine(authorizationService.currentUser(authentication), Math.min(days, 90));
    }

    @Operation(summary = "Check in for today (Technician / Dispatcher)")
    @PostMapping("/check-in")
    @PreAuthorize("hasAnyRole('TECHNICIAN', 'DISPATCHER')")
    public AttendanceDTO checkIn(Authentication authentication) {
        return attendanceService.checkIn(authorizationService.currentUser(authentication));
    }

    @Operation(summary = "Check out for today (Technician / Dispatcher)")
    @PostMapping("/check-out")
    @PreAuthorize("hasAnyRole('TECHNICIAN', 'DISPATCHER')")
    public AttendanceDTO checkOut(Authentication authentication) {
        return attendanceService.checkOut(authorizationService.currentUser(authentication));
    }
}
