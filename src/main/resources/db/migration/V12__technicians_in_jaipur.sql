-- V12: All four field technicians are based in Jaipur.
UPDATE user_auth
SET location = 'Jaipur'
WHERE role = 'TECHNICIAN'
  AND user_email IN ('tech@meridian.com', 'amit.verma@meridian.com', 'vikas.meena@meridian.com', 'rohit.kumar@meridian.com');
