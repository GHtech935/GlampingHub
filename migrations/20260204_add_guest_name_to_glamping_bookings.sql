ALTER TABLE glamping_bookings ADD COLUMN guest_name VARCHAR(255);

-- Backfill existing bookings
UPDATE glamping_bookings b
SET guest_name = TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')))
FROM customers c
WHERE b.customer_id = c.id AND b.guest_name IS NULL;
