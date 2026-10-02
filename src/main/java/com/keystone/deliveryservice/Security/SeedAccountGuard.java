package com.keystone.deliveryservice.Security;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.keystone.deliveryservice.Entity.UserAuth;
import com.keystone.deliveryservice.Repository.UserAuthRepository;

/**
 * The Flyway seed creates demonstration accounts with a publicly documented password.
 * Outside demo mode, any account still carrying that password is rotated at startup
 * so a deployment can never be entered with the documented credentials.
 */
@Component
public class SeedAccountGuard implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SeedAccountGuard.class);

    // BCrypt hash of "password" written by V2__seed_users.sql
    static final String SEED_PASSWORD_HASH = "$2a$10$HbzC5IFm1o0GfahWLdQ7gemdRGAU3xSSBkwuaETiL9PYZRNFq6rSC";
    static final String SEED_MANAGER_EMAIL = "admin@meridian.com";
    static final List<String> SEED_EMAILS = List.of(SEED_MANAGER_EMAIL, "dispatcher@meridian.com",
            "tech@meridian.com", "customer@meridian.com");
    private static final int MIN_PASSWORD_LENGTH = 8;

    private final UserAuthRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final boolean demoMode;
    private final String bootstrapAdminPassword;

    public SeedAccountGuard(UserAuthRepository userRepository, PasswordEncoder passwordEncoder,
            @Value("${app.demo-mode:false}") boolean demoMode,
            @Value("${app.bootstrap-admin-password:}") String bootstrapAdminPassword) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.demoMode = demoMode;
        this.bootstrapAdminPassword = bootstrapAdminPassword;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (demoMode) {
            // Restore the documented password so the demo logins work even after an earlier non-demo start rotated it.
            for (String email : SEED_EMAILS) {
                userRepository.findByUserEmail(email).ifPresent(user -> {
                    user.setPassword(SEED_PASSWORD_HASH);
                    userRepository.save(user);
                });
            }
            log.warn("DEMO_MODE is enabled: seed accounts use their documented password. Never enable this in production.");
            return;
        }

        List<UserAuth> seeded = userRepository.findByPassword(SEED_PASSWORD_HASH);
        for (UserAuth user : seeded) {
            if (SEED_MANAGER_EMAIL.equalsIgnoreCase(user.getUserEmail())) {
                user.setPassword(passwordEncoder.encode(managerPassword()));
            } else {
                // Locked until a manager sets a new password through user management.
                user.setPassword(passwordEncoder.encode(randomPassword()));
                log.warn("Seed account {} had the default password and has been locked; a manager must set a new one.",
                        user.getUserEmail());
            }
            userRepository.save(user);
        }
    }

    private String managerPassword() {
        if (bootstrapAdminPassword != null && !bootstrapAdminPassword.isBlank()) {
            if (bootstrapAdminPassword.length() < MIN_PASSWORD_LENGTH) {
                throw new IllegalStateException(
                        "BOOTSTRAP_ADMIN_PASSWORD must contain at least " + MIN_PASSWORD_LENGTH + " characters");
            }
            log.warn("Seed manager {} now uses BOOTSTRAP_ADMIN_PASSWORD.", SEED_MANAGER_EMAIL);
            return bootstrapAdminPassword;
        }
        String generated = randomPassword();
        log.warn("Seed manager {} had the default password. One-time generated password: {} "
                + "(set BOOTSTRAP_ADMIN_PASSWORD to choose your own on first start).", SEED_MANAGER_EMAIL, generated);
        return generated;
    }

    private static String randomPassword() {
        byte[] bytes = new byte[18];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
