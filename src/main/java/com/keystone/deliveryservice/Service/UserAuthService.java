package com.keystone.deliveryservice.Service;

import java.util.Date;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.keystone.deliveryservice.DTO.AuthResponseDTO;
import com.keystone.deliveryservice.DTO.ForgotPasswordDTO;
import com.keystone.deliveryservice.DTO.LoginRequestDTO;
import com.keystone.deliveryservice.DTO.RegisterRequestDTO;
import com.keystone.deliveryservice.DTO.ResetPasswordDTO;
import com.keystone.deliveryservice.ENUM.Role;
import com.keystone.deliveryservice.Entity.UserAuth;
import com.keystone.deliveryservice.Repository.UserAuthRepository;
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

        user = userAuthRepo.save(user);

        String token = jwtUtil.generateToken(user);
        return new AuthResponseDTO(token, user.getUserEmail(), user.getUserName(), user.getRole(), "Registration successful");
    }

    public AuthResponseDTO login(LoginRequestDTO login) {
        UserAuth user = userAuthRepo.findByUserEmail(login.getUserEmail())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        if (!passwordEncoder.matches(login.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Invalid email or password");
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

        user.setPassword(passwordEncoder.encode(resetPassword.getNewpassword()));
        user.setResettoken(null);
        user.setTokenExpireTime(null);

        userAuthRepo.save(user);
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
