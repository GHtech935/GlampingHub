-- ============================================================================
-- Migration: Refactor Pricing Schema - Shared Fields & Remove Redundant Columns
-- Date: 2025-12-06
-- Description:
--   - Tách price_per_night ra bảng riêng (khác nhau theo pitch type)
--   - Giữ các trường SHARED trong pricing_calendar (chung cho tất cả pitch types)
--   - Xóa các trường không dùng: max_stay_nights, min_advance_days, max_advance_days, price_type, notes
-- ============================================================================

-- ============================================================================
-- PART 1: Tạo bảng pitch_type_prices mới cho giá theo từng loại pitch
-- ============================================================================

CREATE TABLE IF NOT EXISTS pitch_type_prices (
  pitch_id UUID NOT NULL REFERENCES pitches(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  pitch_type pitch_type NOT NULL,
  price_per_night DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (pitch_id, date, pitch_type)
);

-- Add comments
COMMENT ON TABLE pitch_type_prices IS 'Stores price per night for each pitch type (tent, campervan, etc.) - varies by pitch type';
COMMENT ON COLUMN pitch_type_prices.price_per_night IS 'Price per night for this specific pitch type';

-- ============================================================================
-- PART 2: Migrate price data từ pricing_calendar sang pitch_type_prices
-- ============================================================================

INSERT INTO pitch_type_prices (pitch_id, date, pitch_type, price_per_night, created_at, updated_at)
SELECT pitch_id, date, pitch_type, COALESCE(price_per_night, 0), created_at, updated_at
FROM pricing_calendar
ON CONFLICT (pitch_id, date, pitch_type) DO NOTHING;

-- ============================================================================
-- PART 3: Tạo bảng pricing_calendar mới (chỉ chứa shared fields)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pricing_calendar_new (
  pitch_id UUID NOT NULL REFERENCES pitches(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  min_stay_nights INT DEFAULT 1,
  extra_person_adult_price DECIMAL(10,2) DEFAULT 0,
  extra_person_child_price DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (pitch_id, date)
);

-- Add comments
COMMENT ON TABLE pricing_calendar_new IS 'Stores shared pricing rules per pitch per date (same for all pitch types)';
COMMENT ON COLUMN pricing_calendar_new.min_stay_nights IS 'Minimum nights stay required - SHARED for all pitch types';
COMMENT ON COLUMN pricing_calendar_new.extra_person_adult_price IS 'Extra charge per adult per night - SHARED for all pitch types';
COMMENT ON COLUMN pricing_calendar_new.extra_person_child_price IS 'Extra charge per child per night - SHARED for all pitch types';

-- ============================================================================
-- PART 4: Migrate shared data (lấy 1 row đại diện cho mỗi pitch_id, date)
-- ============================================================================

INSERT INTO pricing_calendar_new (
  pitch_id,
  date,
  min_stay_nights,
  extra_person_adult_price,
  extra_person_child_price,
  created_at,
  updated_at
)
SELECT DISTINCT ON (pitch_id, date)
  pitch_id,
  date,
  COALESCE(min_stay_nights, 1),
  COALESCE(extra_person_adult_price, 0),
  COALESCE(extra_person_child_price, 0),
  created_at,
  updated_at
FROM pricing_calendar
ORDER BY pitch_id, date, created_at DESC
ON CONFLICT (pitch_id, date) DO NOTHING;

-- ============================================================================
-- PART 5: Drop bảng cũ và rename bảng mới
-- ============================================================================

DROP TABLE IF EXISTS pricing_calendar;
ALTER TABLE pricing_calendar_new RENAME TO pricing_calendar;

-- ============================================================================
-- PART 6: Tạo indexes cho hiệu suất
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_pitch_type_prices_pitch_date ON pitch_type_prices(pitch_id, date);
CREATE INDEX IF NOT EXISTS idx_pitch_type_prices_date ON pitch_type_prices(date);
CREATE INDEX IF NOT EXISTS idx_pricing_calendar_pitch_date ON pricing_calendar(pitch_id, date);
CREATE INDEX IF NOT EXISTS idx_pricing_calendar_date ON pricing_calendar(date);

-- ============================================================================
-- PART 7: Update pricing_history - thêm cột cho schema mới
-- Giữ lại các cột cũ để backward compatibility với history đã có
-- ============================================================================

-- Add comment to document deprecated columns
COMMENT ON COLUMN pricing_history.old_max_stay_nights IS 'DEPRECATED - No longer used in new schema';
COMMENT ON COLUMN pricing_history.new_max_stay_nights IS 'DEPRECATED - No longer used in new schema';
COMMENT ON COLUMN pricing_history.old_min_advance_days IS 'DEPRECATED - No longer used in new schema';
COMMENT ON COLUMN pricing_history.new_min_advance_days IS 'DEPRECATED - No longer used in new schema';
COMMENT ON COLUMN pricing_history.old_max_advance_days IS 'DEPRECATED - No longer used in new schema';
COMMENT ON COLUMN pricing_history.new_max_advance_days IS 'DEPRECATED - No longer used in new schema';
COMMENT ON COLUMN pricing_history.old_price_type IS 'DEPRECATED - No longer used in new schema';
COMMENT ON COLUMN pricing_history.new_price_type IS 'DEPRECATED - No longer used in new schema';
COMMENT ON COLUMN pricing_history.old_notes IS 'DEPRECATED - Notes moved to availability_calendar';
COMMENT ON COLUMN pricing_history.new_notes IS 'DEPRECATED - Notes moved to availability_calendar';

-- ============================================================================
-- End of migration
-- ============================================================================
