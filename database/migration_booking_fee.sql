-- Run once on existing databases created before booking_fee was added.
-- psql -d chargeflow -f database/migration_booking_fee.sql

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS booking_fee DECIMAL(10, 2) NOT NULL DEFAULT 49.00;

COMMENT ON COLUMN reservations.booking_fee IS 'Non-refundable fee charged at booking to deter spam bookings.';
