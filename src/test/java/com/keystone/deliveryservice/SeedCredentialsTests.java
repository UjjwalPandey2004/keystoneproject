package com.keystone.deliveryservice;

import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class SeedCredentialsTests {

    private static final String SEED_PASSWORD_HASH =
            "$2a$10$HbzC5IFm1o0GfahWLdQ7gemdRGAU3xSSBkwuaETiL9PYZRNFq6rSC";

    @Test
    void documentedSeedPasswordMatchesStoredHash() {
        assertTrue(new BCryptPasswordEncoder().matches("password", SEED_PASSWORD_HASH));
    }
}
