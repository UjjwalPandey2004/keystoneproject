-- V11: Three more field technicians, so dispatch has at least four to choose from.
-- Same documented demo password as the other seeded accounts ("password"); outside DEMO_MODE the
-- SeedAccountGuard locks any account still using it until a manager sets a new password.
-- Phone numbers are left empty; technicians fill them in (and update location) on their profile.

INSERT INTO user_auth (user_name, user_email, password, phone, role, email_verified, available, location, created_at)
VALUES
    ('Amit Verma',  'amit.verma@meridian.com',  '$2a$10$HbzC5IFm1o0GfahWLdQ7gemdRGAU3xSSBkwuaETiL9PYZRNFq6rSC', NULL, 'TECHNICIAN', TRUE, TRUE, 'Delhi',      CURRENT_TIMESTAMP),
    ('Vikas Meena', 'vikas.meena@meridian.com', '$2a$10$HbzC5IFm1o0GfahWLdQ7gemdRGAU3xSSBkwuaETiL9PYZRNFq6rSC', NULL, 'TECHNICIAN', TRUE, TRUE, 'Agra',       CURRENT_TIMESTAMP),
    ('Rohit Kumar', 'rohit.kumar@meridian.com', '$2a$10$HbzC5IFm1o0GfahWLdQ7gemdRGAU3xSSBkwuaETiL9PYZRNFq6rSC', NULL, 'TECHNICIAN', TRUE, TRUE, 'Chandigarh', CURRENT_TIMESTAMP)
ON CONFLICT (user_email) DO NOTHING;
