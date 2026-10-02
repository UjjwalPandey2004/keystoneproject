-- V7: The seeded manager account belongs to Dhruv. Rename it in place (no new user is created),
-- and only while it still carries the original seed name so a name changed later is left alone.

UPDATE user_auth
SET user_name = 'Dhruv'
WHERE LOWER(user_email) = 'admin@meridian.com'
  AND role = 'MANAGER'
  AND user_name = 'Manager Admin';
