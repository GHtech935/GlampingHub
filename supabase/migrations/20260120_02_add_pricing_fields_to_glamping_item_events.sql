-- Add pricing fields to glamping_item_events table

-- Dynamic pricing fields
ALTER TABLE glamping_item_events 
ADD COLUMN IF NOT EXISTS dynamic_pricing_value NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS dynamic_pricing_mode VARCHAR(20) CHECK (dynamic_pricing_mode IN ('percent', 'fixed'));

-- Yield thresholds as JSONB
ALTER TABLE glamping_item_events 
ADD COLUMN IF NOT EXISTS yield_thresholds JSONB;

-- Add comments
COMMENT ON COLUMN glamping_item_events.dynamic_pricing_value IS 'Dynamic pricing adjustment value (e.g., 25 for +25% or -5 for -5đ)';
COMMENT ON COLUMN glamping_item_events.dynamic_pricing_mode IS 'Dynamic pricing mode: percent or fixed';
COMMENT ON COLUMN glamping_item_events.yield_thresholds IS 'Yield pricing thresholds as JSON array: [{"stock": 0, "rate_adjustment": 0}]';

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_glamping_item_events_pricing_type ON glamping_item_events(pricing_type);
