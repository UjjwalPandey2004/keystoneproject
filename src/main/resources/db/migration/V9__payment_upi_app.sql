-- V9: Customers choose the UPI app they pay with (Google Pay, PhonePe, Paytm, other).
ALTER TABLE payments ADD COLUMN IF NOT EXISTS upi_app VARCHAR(20);
