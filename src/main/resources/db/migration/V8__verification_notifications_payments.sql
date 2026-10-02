-- V8: Email verification (OTP), technician location/availability, detailed time logs,
-- in-app notifications, customer payments and work-order attachments.

-- Accounts that already exist (seeded or created by a manager) count as verified.
ALTER TABLE user_auth ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT TRUE;
-- One-time code, stored only as a BCrypt hash.
ALTER TABLE user_auth ADD COLUMN IF NOT EXISTS otp_hash VARCHAR(100);
ALTER TABLE user_auth ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP;
ALTER TABLE user_auth ADD COLUMN IF NOT EXISTS otp_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_auth ADD COLUMN IF NOT EXISTS otp_sent_at TIMESTAMP;
-- Tokens issued before this moment are rejected (set on password change / reset).
ALTER TABLE user_auth ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;
-- Technician dispatch details.
ALTER TABLE user_auth ADD COLUMN IF NOT EXISTS location VARCHAR(150);
ALTER TABLE user_auth ADD COLUMN IF NOT EXISTS available BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE time_logs ADD COLUMN IF NOT EXISTS work_date DATE;
ALTER TABLE time_logs ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE time_logs ADD COLUMN IF NOT EXISTS end_time TIME;

ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS technician_notes TEXT;

CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    recipient_id BIGINT NOT NULL REFERENCES user_auth(id) ON DELETE CASCADE,
    type VARCHAR(40) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message VARCHAR(1000) NOT NULL,
    reference_type VARCHAR(30),
    reference_id BIGINT,
    reference_label VARCHAR(60),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created ON notifications(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON notifications(recipient_id) WHERE is_read = FALSE;

CREATE SEQUENCE IF NOT EXISTS payment_reference_seq START WITH 1001;

CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    reference VARCHAR(30) NOT NULL UNIQUE,
    work_order_id BIGINT NOT NULL REFERENCES work_orders(id),
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    payer_id BIGINT NOT NULL REFERENCES user_auth(id),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    method VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    transaction_ref VARCHAR(40),
    failure_reason VARCHAR(300),
    verified_by_id BIGINT REFERENCES user_auth(id),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP,
    paid_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_work_order ON payments(work_order_id);
-- A UPI transaction reference (UTR) can only be claimed once.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_transaction_ref ON payments(transaction_ref) WHERE transaction_ref IS NOT NULL;

CREATE TABLE IF NOT EXISTS work_order_attachments (
    id BIGSERIAL PRIMARY KEY,
    work_order_id BIGINT NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_key VARCHAR(300) NOT NULL UNIQUE,
    uploaded_by_id BIGINT NOT NULL REFERENCES user_auth(id),
    uploaded_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attachments_work_order ON work_order_attachments(work_order_id);
