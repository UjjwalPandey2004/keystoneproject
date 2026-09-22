package com.keystone.deliveryservice.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.keystone.deliveryservice.DTO.AuthResponseDTO;
import com.keystone.deliveryservice.DTO.ForgotPasswordDTO;
import com.keystone.deliveryservice.DTO.LoginRequestDTO;
import com.keystone.deliveryservice.DTO.RegisterRequestDTO;
import com.keystone.deliveryservice.DTO.ResetPasswordDTO;
import com.keystone.deliveryservice.Service.UserAuthService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Endpoints for user login, registration, password recovery, and token management")
public class UserAuthController {

    @Autowired
    private UserAuthService userAuthService;

    @Operation(summary = "Register a new customer account")
    @PostMapping("/register")
    public ResponseEntity<AuthResponseDTO> register(@Valid @RequestBody RegisterRequestDTO register) {
        return ResponseEntity.ok(userAuthService.register(register));
    }

    @Operation(summary = "Authenticate user and receive a signed JWT token")
    @PostMapping("/login")
    public ResponseEntity<AuthResponseDTO> login(@Valid @RequestBody LoginRequestDTO login) {
        AuthResponseDTO response = userAuthService.login(login);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Request a password reset link")
    @PostMapping("/forgot-password")
    public ResponseEntity<String> forgotPassword(@Valid @RequestBody ForgotPasswordDTO forgotPassword) {
        userAuthService.forgotPassword(forgotPassword);
        return ResponseEntity.ok("Password reset link generated and sent");
    }

    @Operation(summary = "Reset password using a token")
    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(@Valid @RequestBody ResetPasswordDTO resetPassword) {
        userAuthService.resetPassword(resetPassword);
        return ResponseEntity.ok("Password reset successfully");
    }

    @Operation(summary = "Invalidate user token (Logout)")
    @PostMapping("/logout")
    public ResponseEntity<String> logout(HttpServletRequest request) {
        return ResponseEntity.ok(userAuthService.logout(request));
    }
}
