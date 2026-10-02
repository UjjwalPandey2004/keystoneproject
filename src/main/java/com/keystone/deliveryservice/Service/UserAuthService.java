package com.keystone.deliveryservice.Service;

import java.time.LocalDateTime;
import java.util.Date;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.keystone.deliveryservice.DTO.AuthResponseDTO;
import com.keystone.deliveryservice.DTO.ChangePasswordDTO;
import com.keystone.deliveryservice.DTO.ForgotPasswordDTO;
import com.keystone.deliveryservice.DTO.LoginRequestDTO;
import com.keystone.deliveryservice.DTO.RegisterRequestDTO;
import com.keystone.deliveryservice.DTO.ResetPasswordDTO;
import com.keystone.deliveryservice.DTO.UpdateProfileDTO;
import com.keystone.deliveryservice.ENUM.NotificationType;
import com.keystone.deliveryservice.ENUM.Role;
import com.keystone.deliveryservice.Entity.UserAuth;
import com.keystone.deliveryservice.Repository.UserAuthRepository;
import com.keystone.deliveryservice.Security.EmailNotVerifiedException;
import com.keystone.deliveryservice.Security.JWTUtil;
import com.keystone.deliveryservice.Security.TokenKillingService;

import jakarta.servlet.http.HttpServletRequest;

@Service
public class UserAuthService {

    @Autowired
    private UserAuthRepository userAuthRepo;

    @Autowired
    private JWTUtil jwtUtil;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EmailLogService emailLogService;

    @Autowired
    private TokenKillingService tokenKill;

    @Autowired
    private EmailVerificationService emailVerificationService;

    @Autowired
    private NotificationService notificationService;

    // No token is issued here: the account can sign in only after the emailed code is verified.
    @Transactional
    public AuthResponseDTO register(RegisterRequestDTO register) {
        if (userAuthRepo.existsByUserEmail(register.getUserEmail())) {
            throw new IllegalArgumentException("User with email " + register.getUserEmail() + " already exists");
        }

        UserAuth user = new UserAuth();
        user.setUserName(register.getUserName());
        user.setUserEmail(register.getUserEmail());
        user.setPassword(passwordEncoder.encode(register.getPassword()));
        user.setPhone(register.getPhone());
        // Anonymous registration must never be able to grant a privileged role.
        user.setRole(Role.CUSTOMER);
        user.setEmailVerified(false);
        user.setAvailable(true);

        user = userAuthRepo.save(user);
        emailVerificationService.issueCode(user);
        notificationService.notifyRoles(java.util.Set.of(Role.MANAGER), user, NotificationType.CUSTOMER_REGISTERED,
                "New customer registered",
                user.getUserName() + " (" + user.getUserEmail() + ") created a customer account. "
                        + "Link it to an organisation under Customers so they can raise requests.",
                NotificationService.Ref.none());

        return new AuthResponseDTO(null, user.getUserEmail(), user.getUserName(), user.getRole(),
                "Account created. Enter the verification code sent to " + user.getUserEmail() + ".");
    }

    public AuthResponseDTO login(LoginRequestDTO login) {
        UserAuth user = userAuthRepo.findByUserEmail(login.getUserEmail())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        if (!passwordEncoder.matches(login.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        // Checked only after the password, so this cannot be used to discover which emails exist.
        if (!user.isEmailVerified()) {
            throw new EmailNotVerifiedException();
        }

        String token = jwtUtil.generateToken(user);
        return new AuthResponseDTO(token, user.getUserEmail(), user.getUserName(), user.getRole(), "Login successful");
    }

    @Transactional
    public void forgotPassword(ForgotPasswordDTO forgotPassword) {
        UserAuth user = userAuthRepo.findByUserEmail(forgotPassword.getUserEmail())
                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + forgotPassword.getUserEmail()));

        String token = UUID.randomUUID().toString();
        user.setResettoken(token);
        user.setTokenExpireTime(new Date(System.currentTimeMillis() + 15 * 60 * 1000L)); // 15 mins

        userAuthRepo.save(user);

        try {
            emailLogService.sendResetPasswordMail(forgotPassword.getUserEmail(), token);
        } catch (Exception e) {
            // Log error without breaking flow
            System.err.println("Failed to send reset email: " + e.getMessage());
        }
    }

    @Transactional
    public void resetPassword(ResetPasswordDTO resetPassword) {
        UserAuth user = userAuthRepo.findByResettoken(resetPassword.getToken())
                .orElseThrow(() -> new IllegalArgumentException("Invalid reset token"));

        if (user.getTokenExpireTime() == null || user.getTokenExpireTime().before(new Date())) {
            throw new IllegalArgumentException("Reset token has expired");
        }

        if (resetPassword.getNewpassword() == null || resetPassword.getNewpassword().length() < 8) {
            throw new IllegalArgumentException("New password must be at least 8 characters");
        }

        user.setPassword(passwordEncoder.encode(resetPassword.getNewpassword()));
        user.setResettoken(null);
        user.setTokenExpireTime(null);
        // Sessions opened with the old password stop working.
        user.setPasswordChangedAt(LocalDateTime.now());

        userAuthRepo.save(user);
        notificationService.notifyUser(user, NotificationType.SECURITY, "Password reset",
                "Your password was reset. If this was not you, contact your KEYSTONE manager immediately.",
                NotificationService.Ref.none());
    }

    /**
     * Changes the password and returns a fresh token. Every token issued before the change,
     * on any device, is rejected from now on.
     */
    @Transactional
    public String changePassword(String userEmail, ChangePasswordDTO change) {
        UserAuth user = userAuthRepo.findByUserEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!passwordEncoder.matches(change.getCurrentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }
        if (!change.getNewPassword().equals(change.getConfirmPassword())) {
            throw new IllegalArgumentException("New password and confirm password do not match");
        }
        if (change.getNewPassword().equals(change.getCurrentPassword())) {
            throw new IllegalArgumentException("New password must be different from the current password");
        }

        user.setPassword(passwordEncoder.encode(change.getNewPassword()));
        user.setPasswordChangedAt(LocalDateTime.now());
        userAuthRepo.save(user);
        notificationService.notifyUser(user, NotificationType.SECURITY, "Password changed",
                "Your password was changed and your other sessions were signed out. "
                        + "If this was not you, contact your KEYSTONE manager immediately.",
                NotificationService.Ref.none());
        return jwtUtil.generateToken(user);
    }

    /** Lets a user edit their own contact details. Role and email can never be changed here. */
    @Transactional
    public UserAuth updateOwnProfile(String userEmail, UpdateProfileDTO update) {
        UserAuth user = userAuthRepo.findByUserEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (update.getUserName() != null && !update.getUserName().isBlank()) {
            user.setUserName(update.getUserName().trim());
        }
        if (update.getPhone() != null) {
            user.setPhone(update.getPhone().isBlank() ? null : update.getPhone().trim());
        }
        // Location and availability only matter for dispatching technicians.
        if (user.getRole() == Role.TECHNICIAN) {
            if (update.getLocation() != null) {
                user.setLocation(update.getLocation().isBlank() ? null : update.getLocation().trim());
            }
            if (update.getAvailable() != null) {
                user.setAvailable(update.getAvailable());
            }
        }
        return userAuthRepo.save(user);
    }

    public String logout(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        String token = jwtUtil.extractToken(header);

        if (token != null) {
            tokenKill.blockTokenProcess(token);
            return "Logged out successfully";
        }

        return "Authorization header missing or invalid";
    }
}
