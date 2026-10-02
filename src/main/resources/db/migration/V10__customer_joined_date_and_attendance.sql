-- V10: When each account was created (accounts that existed before this are left unknown),
-- and daily attendance for staff (technicians and dispatchers).

ALTER TABLE user_auth ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS attendance (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES user_auth(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    check_in TIMESTAMP,
    check_out TIMESTAMP,
    status VARCHAR(20) NOT NULL,
    note VARCHAR(300),
    marked_by_id BIGINT REFERENCES user_auth(id),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_attendance_user_day UNIQUE (user_id, work_date)
);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(work_date);
