package com.keystone.deliveryservice.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.keystone.deliveryservice.DTO.AuthResponseDTO;
import com.keystone.deliveryservice.DTO.ChangePasswordDTO;
import com.keystone.deliveryservice.DTO.ForgotPasswordDTO;
import com.keystone.deliveryservice.DTO.LoginRequestDTO;
import com.keystone.deliveryservice.DTO.RegisterRequestDTO;
import com.keystone.deliveryservice.DTO.ResendOtpDTO;
import com.keystone.deliveryservice.DTO.ResetPasswordDTO;
import com.keystone.deliveryservice.DTO.UpdateProfileDTO;
import com.keystone.deliveryservice.DTO.UserResponseDTO;
import com.keystone.deliveryservice.DTO.VerifyEmailDTO;
import com.keystone.deliveryservice.Repository.UserAuthRepository;
import com.keystone.deliveryservice.Service.EmailVerificationService;
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

    @Autowired
    private UserAuthRepository userAuthRepository;

    @Autowired
    private EmailVerificationService emailVerificationService;

    @Value("${app.demo-mode:false}")
    private boolean demoMode;

    @Operation(summary = "Public client configuration (whether demo logins are available)")
    @GetMapping("/config")
    public ResponseEntity<Map<String, Boolean>> config() {
        return ResponseEntity.ok(Map.of("demoMode", demoMode));
    }

    private static boolean isSignedIn(Authentication authentication) {
        // /api/auth/** is public, so anonymous callers must be rejected explicitly.
        return authentication != null && !(authentication instanceof AnonymousAuthenticationToken)
                && authentication.isAuthenticated();
    }

    @Operation(summary = "Profile of the signed-in user (validates the JWT)")
    @GetMapping("/me")
    public ResponseEntity<UserResponseDTO> me(Authentication authentication) {
        if (!isSignedIn(authentication)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return userAuthRepository.findByUserEmail(authentication.getName())
                .map(user -> ResponseEntity.ok(UserResponseDTO.from(user)))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    @Operation(summary = "Update the signed-in user's own name, phone and (technicians) location / availability")
    @PutMapping("/me")
    public ResponseEntity<UserResponseDTO> updateMe(Authentication authentication,
            @Valid @RequestBody UpdateProfileDTO update) {
        if (!isSignedIn(authentication)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(UserResponseDTO.from(userAuthService.updateOwnProfile(authentication.getName(), update)));
    }

    @Operation(summary = "Verify a newly registered email address with the emailed 6-digit code")
    @PostMapping("/verify-email")
    public ResponseEntity<Map<String, String>> verifyEmail(@Valid @RequestBody VerifyEmailDTO request) {
        emailVerificationService.verify(request.getUserEmail(), request.getOtp());
        return ResponseEntity.ok(Map.of("message", "Email verified. You can now sign in."));
    }

    @Operation(summary = "Send a new verification code (60 second cooldown)")
    @PostMapping("/resend-otp")
    public ResponseEntity<Map<String, String>> resendOtp(@Valid @RequestBody ResendOtpDTO request) {
        emailVerificationService.resend(request.getUserEmail());
        return ResponseEntity.ok(Map.of("message",
                "If this email has an account waiting for verification, a new code has been sent."));
    }
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

    @Operation(summary = "Change the signed-in user's own password (requires the current password)")
    @PostMapping("/change-password")
    public ResponseEntity<Map<String, String>> changePassword(Authentication authentication,
            @Valid @RequestBody ChangePasswordDTO change) {
        if (!isSignedIn(authentication)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        // The old token stops working; the client switches to the token returned here.
        String token = userAuthService.changePassword(authentication.getName(), change);
        return ResponseEntity.ok(Map.of("message", "Password changed successfully", "token", token));
    }

    @Operation(summary = "Invalidate user token (Logout)")
    @PostMapping("/logout")
    public ResponseEntity<String> logout(HttpServletRequest request) {
        return ResponseEntity.ok(userAuthService.logout(request));
    }
}
