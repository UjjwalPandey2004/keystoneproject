-- V3: Work Orders, Parts, Status History, Part Usage, and Time Logs Schema

CREATE TABLE IF NOT EXISTS parts (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    sku VARCHAR(50) NOT NULL UNIQUE,
    unit_cost NUMERIC(10, 2) NOT NULL,
    stock_qty INT NOT NULL DEFAULT 0,
    min_stock_qty INT DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS work_orders (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    priority VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL,
    sla_due_date TIMESTAMP,
    sla_breached BOOLEAN NOT NULL DEFAULT FALSE,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    site_id BIGINT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    assigned_to_id BIGINT REFERENCES user_auth(id) ON DELETE SET NULL,
    total_parts_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_labor_minutes INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    closed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS work_order_status_history (
    id BIGSERIAL PRIMARY KEY,
    work_order_id BIGINT NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    changed_by_user_id BIGINT REFERENCES user_auth(id) ON DELETE SET NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS part_usages (
    id BIGSERIAL PRIMARY KEY,
    work_order_id BIGINT NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    part_id BIGINT NOT NULL REFERENCES parts(id) ON DELETE RESTRICT,
    quantity_used INT NOT NULL,
    unit_cost NUMERIC(10, 2) NOT NULL,
    total_cost NUMERIC(10, 2) NOT NULL,
    used_by_user_id BIGINT REFERENCES user_auth(id) ON DELETE SET NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS time_logs (
    id BIGSERIAL PRIMARY KEY,
    work_order_id BIGINT NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    technician_user_id BIGINT NOT NULL REFERENCES user_auth(id) ON DELETE CASCADE,
    minutes INT NOT NULL,
    note TEXT,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Initial Parts Inventory
INSERT INTO parts (name, sku, unit_cost, stock_qty, min_stock_qty)
VALUES 
    ('Standard HVAC Air Filter 20x25', 'HVAC-FLTR-2025', 18.50, 45, 10),
    ('Copper Pipe Fitting 1/2 in', 'PLMB-PIPE-05', 12.25, 30, 8),
    ('Commercial Circuit Breaker 20A', 'ELEC-BRKR-20', 24.99, 20, 5),
    ('Smart Thermostat Control Unit', 'HVAC-THRM-01', 89.50, 15, 3)
ON CONFLICT (sku) DO NOTHING;

-- Seed Initial Work Orders
INSERT INTO work_orders (id, code, title, description, priority, status, sla_due_date, sla_breached, customer_id, site_id, assigned_to_id, created_at, updated_at)
VALUES 
    (1, 'WO-1001', 'HVAC cooling unit malfunction on floor 3', 'AC blowing warm air in East wing conference room.', 'HIGH', 'ASSIGNED', CURRENT_TIMESTAMP + INTERVAL '24 hours', FALSE, 1, 1, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (2, 'WO-1002', 'Urgent water line leak in restroom B', 'Pipe connection spraying water behind main valve.', 'CRITICAL', 'IN_PROGRESS', CURRENT_TIMESTAMP + INTERVAL '4 hours', FALSE, 1, 2, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- Seed Initial Status History for seeded work orders
INSERT INTO work_order_status_history (work_order_id, from_status, to_status, changed_by_user_id, notes)
VALUES 
    (1, NULL, 'NEW', 1, 'Initial request created'),
    (1, 'NEW', 'ASSIGNED', 2, 'Assigned to Field Technician'),
    (2, NULL, 'NEW', 1, 'Urgent leak reported'),
    (2, 'NEW', 'ASSIGNED', 2, 'Assigned to Field Technician'),
    (2, 'ASSIGNED', 'IN_PROGRESS', 3, 'Technician arrived on site and started diagnosis')
ON CONFLICT DO NOTHING;
