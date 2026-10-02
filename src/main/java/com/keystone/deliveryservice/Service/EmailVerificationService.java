package com.keystone.deliveryservice.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.keystone.deliveryservice.ENUM.NotificationType;
import com.keystone.deliveryservice.Entity.UserAuth;
import com.keystone.deliveryservice.Repository.UserAuthRepository;

/**
 * Email verification with a one-time code (OTP).
 * The code is 6 random digits, stored only as a BCrypt hash, valid for 10 minutes, single use,
 * and limited to 5 attempts. A new code can be requested after a 60 second cooldown.
 */
@Service
@Transactional
public class EmailVerificationService {

    private static final Logger log = LoggerFactory.getLogger(EmailVerificationService.class);

    static final Duration CODE_VALIDITY = Duration.ofMinutes(10);
    static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);
    static final int MAX_ATTEMPTS = 5;

    private final SecureRandom random = new SecureRandom();
    private final UserAuthRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailLogService emailLogService;
    private final NotificationService notificationService;
    private final boolean mailEnabled;
    private final boolean demoMode;

    public EmailVerificationService(UserAuthRepository userRepository, PasswordEncoder passwordEncoder,
            EmailLogService emailLogService, NotificationService notificationService,
            @Value("${notifications.mail.enabled:false}") boolean mailEnabled,
            @Value("${app.demo-mode:false}") boolean demoMode) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailLogService = emailLogService;
        this.notificationService = notificationService;
        this.mailEnabled = mailEnabled;
        this.demoMode = demoMode;
    }

    /** Creates a fresh code for the user and emails it. */
    public void issueCode(UserAuth user) {
        String code = String.format("%06d", random.nextInt(1_000_000));
        LocalDateTime now = LocalDateTime.now();
        user.setOtpHash(passwordEncoder.encode(code));
        user.setOtpExpiresAt(now.plus(CODE_VALIDITY));
        user.setOtpAttempts(0);
        user.setOtpSentAt(now);
        userRepository.save(user);

        emailLogService.sendVerificationCode(user.getUserEmail(), user.getUserName(), code, CODE_VALIDITY.toMinutes());
        if (!mailEnabled && demoMode) {
            // Local demo only: with email delivery switched off there is no other way to read the code.
            log.warn("DEMO MODE (email disabled): verification code for {} is {}", user.getUserEmail(), code);
        }
    }

    /** Sends a new code if the account still needs one and the cooldown has passed. */
    public void resend(String email) {
        UserAuth user = userRepository.findByUserEmail(email).orElse(null);
        // Unknown or already-verified emails get the same response, so this cannot be used to probe accounts.
        if (user == null || user.isEmailVerified()) {
            return;
        }
        if (user.getOtpSentAt() != null && user.getOtpSentAt().plus(RESEND_COOLDOWN).isAfter(LocalDateTime.now())) {
            long wait = Duration.between(LocalDateTime.now(), user.getOtpSentAt().plus(RESEND_COOLDOWN)).toSeconds() + 1;
            throw new IllegalStateException("Please wait " + wait + " seconds before requesting a new code.");
        }
        issueCode(user);
    }

    /** Checks the code; on success the account is verified and the code can never be used again. */
    public void verify(String email, String code) {
        UserAuth user = userRepository.findByUserEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Invalid verification code."));
        if (user.isEmailVerified()) {
            return;
        }
        if (user.getOtpHash() == null) {
            throw new IllegalArgumentException("No verification code is pending. Request a new code.");
        }
        if (user.getOtpExpiresAt() == null || user.getOtpExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("This verification code has expired. Request a new code.");
        }
        if (user.getOtpAttempts() >= MAX_ATTEMPTS) {
            throw new IllegalArgumentException("Too many incorrect attempts. Request a new code.");
        }
        if (code == null || !passwordEncoder.matches(code.trim(), user.getOtpHash())) {
            user.setOtpAttempts(user.getOtpAttempts() + 1);
            userRepository.save(user);
            int left = MAX_ATTEMPTS - user.getOtpAttempts();
            throw new IllegalArgumentException(left > 0
                    ? "Invalid verification code. " + left + " attempt" + (left == 1 ? "" : "s") + " left."
                    : "Too many incorrect attempts. Request a new code.");
        }

        user.setEmailVerified(true);
        user.setOtpHash(null);
        user.setOtpExpiresAt(null);
        user.setOtpAttempts(0);
        userRepository.save(user);
        notificationService.notifyUser(user, NotificationType.EMAIL_VERIFIED, "Email verified",
                "Your email address " + user.getUserEmail() + " has been verified. Welcome to KEYSTONE.",
                NotificationService.Ref.none());
    }
}
