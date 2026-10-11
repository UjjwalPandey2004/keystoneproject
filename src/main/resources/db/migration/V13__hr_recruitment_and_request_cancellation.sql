-- V13: HR role and recruitment (job openings, applications, interviews, hiring history),
-- plus who closed / cancelled a work order and why.

-- Work order closure and cancellation audit.
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS closed_by_id BIGINT REFERENCES user_auth(id);
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS cancelled_by_id BIGINT REFERENCES user_auth(id);
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(500);

-- Back-fill closure / cancellation details from the existing status history.
UPDATE work_orders w SET closed_by_id = h.changed_by_id
FROM (SELECT DISTINCT ON (work_order_id) work_order_id, changed_by_user_id AS changed_by_id
      FROM work_order_status_history WHERE to_status = 'CLOSED'
      ORDER BY work_order_id, changed_at DESC) h
WHERE w.id = h.work_order_id AND w.status = 'CLOSED' AND w.closed_by_id IS NULL;

UPDATE work_orders w SET cancelled_by_id = h.changed_by_id, cancelled_at = h.changed_at, cancellation_reason = h.notes
FROM (SELECT DISTINCT ON (work_order_id) work_order_id, changed_by_user_id AS changed_by_id, changed_at, LEFT(notes, 500) AS notes
      FROM work_order_status_history WHERE to_status = 'CANCELLED'
      ORDER BY work_order_id, changed_at DESC) h
WHERE w.id = h.work_order_id AND w.status = 'CANCELLED' AND w.cancelled_at IS NULL;

CREATE TABLE IF NOT EXISTS job_openings (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    department VARCHAR(100) NOT NULL,
    description VARCHAR(5000) NOT NULL,
    required_skills VARCHAR(1000),
    location VARCHAR(150) NOT NULL,
    employment_type VARCHAR(20) NOT NULL,
    application_deadline DATE,
    status VARCHAR(20) NOT NULL,
    created_by_id BIGINT REFERENCES user_auth(id),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_job_openings_status ON job_openings(status);

CREATE SEQUENCE IF NOT EXISTS job_application_reference_seq START WITH 1;

CREATE TABLE IF NOT EXISTS job_applications (
    id BIGSERIAL PRIMARY KEY,
    reference VARCHAR(30) NOT NULL UNIQUE,
    job_opening_id BIGINT NOT NULL REFERENCES job_openings(id),
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    experience VARCHAR(2000),
    skills VARCHAR(1000),
    education VARCHAR(1000),
    cover_letter VARCHAR(4000),
    resume_file_name VARCHAR(255) NOT NULL,
    resume_content_type VARCHAR(120) NOT NULL,
    resume_size_bytes BIGINT NOT NULL,
    resume_storage_key VARCHAR(300) NOT NULL UNIQUE,
    status VARCHAR(30) NOT NULL,
    rejection_reason VARCHAR(500),
    internal_notes VARCHAR(4000),
    employee_user_id BIGINT REFERENCES user_auth(id),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_job_applications_job ON job_applications(job_opening_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);
-- One application per email address per opening.
CREATE UNIQUE INDEX IF NOT EXISTS uq_job_applications_job_email ON job_applications(job_opening_id, LOWER(email));

CREATE TABLE IF NOT EXISTS interviews (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL REFERENCES job_applications(id),
    scheduled_at TIMESTAMP NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 15 AND 480),
    type VARCHAR(20) NOT NULL,
    location_or_link VARCHAR(500) NOT NULL,
    interviewer VARCHAR(120) NOT NULL,
    instructions VARCHAR(2000),
    status VARCHAR(20) NOT NULL,
    reschedule_count INTEGER NOT NULL DEFAULT 0,
    candidate_emailed BOOLEAN NOT NULL DEFAULT FALSE,
    scheduled_by_id BIGINT REFERENCES user_auth(id),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_interviews_application ON interviews(application_id);
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled ON interviews(status, scheduled_at);
-- At most one scheduled (not yet held or cancelled) interview per application.
CREATE UNIQUE INDEX IF NOT EXISTS uq_interviews_one_scheduled ON interviews(application_id) WHERE status = 'SCHEDULED';

CREATE TABLE IF NOT EXISTS application_history (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL REFERENCES job_applications(id),
    from_status VARCHAR(30),
    to_status VARCHAR(30),
    action VARCHAR(500) NOT NULL,
    changed_by_id BIGINT REFERENCES user_auth(id),
    changed_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_application_history_application ON application_history(application_id, changed_at);

-- Demo HR account (password: password). Like the other seed accounts it only keeps that
-- password while DEMO_MODE=true; otherwise SeedAccountGuard locks it at startup.
INSERT INTO user_auth (user_name, user_email, password, phone, role, email_verified, available, created_at)
VALUES ('HR Manager', 'hr@meridian.com', '$2a$10$HbzC5IFm1o0GfahWLdQ7gemdRGAU3xSSBkwuaETiL9PYZRNFq6rSC', NULL, 'HR', TRUE, TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (user_email) DO NOTHING;
