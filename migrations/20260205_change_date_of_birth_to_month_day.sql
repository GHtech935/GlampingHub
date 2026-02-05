-- Thay đổi date_of_birth từ DATE sang VARCHAR(5) với format MM-DD
-- Ngày: 2026-02-05

-- Bước 1: Thêm cột tạm thời
ALTER TABLE glamping_bookings ADD COLUMN IF NOT EXISTS date_of_birth_new VARCHAR(5);

-- Bước 2: Migrate dữ liệu cũ (trích xuất tháng-ngày)
UPDATE glamping_bookings
SET date_of_birth_new = TO_CHAR(date_of_birth, 'MM-DD')
WHERE date_of_birth IS NOT NULL;

-- Bước 3: Xóa cột cũ
ALTER TABLE glamping_bookings DROP COLUMN IF EXISTS date_of_birth;

-- Bước 4: Đổi tên cột mới
ALTER TABLE glamping_bookings RENAME COLUMN date_of_birth_new TO date_of_birth;

-- Bước 5: Thêm constraint kiểm tra format
ALTER TABLE glamping_bookings
ADD CONSTRAINT check_date_of_birth_format
CHECK (date_of_birth IS NULL OR date_of_birth ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$');

-- Bước 6: Cập nhật comment
COMMENT ON COLUMN glamping_bookings.date_of_birth IS 'Customer birth month and day in MM-DD format for birthday greetings (e.g., 03-25)';
