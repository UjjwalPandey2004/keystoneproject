-- V6: Customer users are tied to an organisation by an explicit link instead of a matching email address.

ALTER TABLE user_auth
    ADD COLUMN IF NOT EXISTS customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL;

-- Preserve the links that the previous email-matching rule granted.
UPDATE user_auth u
SET customer_id = c.id
FROM customers c
WHERE u.role = 'CUSTOMER'
  AND u.customer_id IS NULL
  AND LOWER(u.user_email) = LOWER(c.email);

CREATE INDEX IF NOT EXISTS idx_user_auth_customer_id ON user_auth(customer_id);
