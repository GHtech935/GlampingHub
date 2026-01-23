-- ==========================================
-- SEPAY PAYMENT INTEGRATION
-- Tích hợp thanh toán chuyển khoản qua Sepay
-- ==========================================

-- Bảng lưu giao dịch từ Sepay webhook
CREATE TABLE sepay_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Liên kết với booking
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,

  -- Thông tin từ Sepay
  sepay_transaction_id VARCHAR(255), -- ID từ Sepay (nếu có)
  transaction_code VARCHAR(255) NOT NULL, -- Mã giao dịch ngân hàng

  -- Chi tiết giao dịch
  amount DECIMAL(15,2) NOT NULL,
  description TEXT, -- Nội dung chuyển khoản
  account_number VARCHAR(50), -- Số tài khoản nhận
  bank_name VARCHAR(100), -- Tên ngân hàng

  -- Thời gian giao dịch
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Trạng thái
  status VARCHAR(50) DEFAULT 'pending', -- pending, matched, cancelled

  -- Gateway info
  gateway VARCHAR(50) DEFAULT 'sepay',

  -- Webhook data (lưu toàn bộ payload từ Sepay)
  webhook_data JSONB,

  -- Matching info
  matched_at TIMESTAMP WITH TIME ZONE,
  matched_by VARCHAR(50), -- 'auto' hoặc 'manual'

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index cho performance
CREATE INDEX idx_sepay_transactions_booking_id ON sepay_transactions(booking_id);
CREATE INDEX idx_sepay_transactions_transaction_code ON sepay_transactions(transaction_code);
CREATE INDEX idx_sepay_transactions_status ON sepay_transactions(status);
CREATE INDEX idx_sepay_transactions_transaction_date ON sepay_transactions(transaction_date DESC);
CREATE INDEX idx_sepay_transactions_description ON sepay_transactions USING gin(to_tsvector('simple', description));

-- ==========================================
-- DEPRECATED: payment_status column
-- The unified_status field is now the single source of truth for booking status.
-- See migration 20251204_remove_payment_status.sql
-- ==========================================

-- Thêm các cột bổ sung cho thanh toán (KHÔNG phải payment_status)
ALTER TABLE bookings
  -- REMOVED: payment_status - use unified_status instead
  -- ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50), -- 'bank_transfer', 'cash', etc
  ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255), -- Mã tham chiếu thanh toán
  ADD COLUMN IF NOT EXISTS payment_qr_code TEXT, -- QR code data (VietQR)
  ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMP WITH TIME ZONE, -- Thời hạn thanh toán
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE; -- Thời gian thanh toán thành công

-- Index cho payment expires (KHÔNG tạo index cho payment_status)
-- REMOVED: CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_expires_at ON bookings(payment_expires_at);

-- Comment
COMMENT ON TABLE sepay_transactions IS 'Lưu giao dịch ngân hàng từ Sepay webhook';
-- REMOVED: COMMENT ON COLUMN bookings.payment_status
COMMENT ON COLUMN bookings.payment_method IS 'Phương thức thanh toán: bank_transfer, cash, card';
COMMENT ON COLUMN bookings.payment_qr_code IS 'Dữ liệu QR code VietQR (base64 hoặc URL)';
COMMENT ON COLUMN bookings.payment_expires_at IS 'Hạn chót thanh toán (mặc định 24h sau khi tạo booking)';
