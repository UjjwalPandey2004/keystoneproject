-- V2: Seed Default Roles and Accounts for Keystone Platform
-- Default password for all seed accounts: password (BCrypt: $2a$10$HbzC5IFm1o0GfahWLdQ7gemdRGAU3xSSBkwuaETiL9PYZRNFq6rSC)

INSERT INTO user_auth (user_name, user_email, password, phone, role)
VALUES 
    ('Manager Admin', 'admin@meridian.com', '$2a$10$HbzC5IFm1o0GfahWLdQ7gemdRGAU3xSSBkwuaETiL9PYZRNFq6rSC', '+1-555-0100', 'MANAGER'),
    ('Lead Dispatcher', 'dispatcher@meridian.com', '$2a$10$HbzC5IFm1o0GfahWLdQ7gemdRGAU3xSSBkwuaETiL9PYZRNFq6rSC', '+1-555-0101', 'DISPATCHER'),
    ('Field Technician', 'tech@meridian.com', '$2a$10$HbzC5IFm1o0GfahWLdQ7gemdRGAU3xSSBkwuaETiL9PYZRNFq6rSC', '+1-555-0102', 'TECHNICIAN'),
    ('Commercial Customer', 'customer@meridian.com', '$2a$10$HbzC5IFm1o0GfahWLdQ7gemdRGAU3xSSBkwuaETiL9PYZRNFq6rSC', '+1-555-0103', 'CUSTOMER')
ON CONFLICT (user_email) DO NOTHING;

-- Seed Sample Customer and Site
INSERT INTO customers (id, company_name, contact_person, email, phone, address, active)
VALUES 
    (1, 'Apex Commercial Towers', 'Sarah Jenkins', 'customer@meridian.com', '+1-555-0199', '100 Financial District, Metro City', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO sites (id, customer_id, site_name, building_name, room_no, address, city, state, country, zipcode)
VALUES 
    (1, 1, 'Headquarters Tower A', 'Tower A', 101, '100 Financial District, Metro City', 'Metro City', 'NY', 'USA', 10001),
    (2, 1, 'East Campus Facility', 'Building C', 204, '45 East Boulevard, Metro City', 'Metro City', 'NY', 'USA', 10002)
ON CONFLICT (id) DO NOTHING;
