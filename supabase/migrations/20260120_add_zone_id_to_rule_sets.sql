-- Add zone_id to glamping_rule_sets for zone-specific rule sets
ALTER TABLE glamping_rule_sets
ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES glamping_zones(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_glamping_rule_sets_zone_id ON glamping_rule_sets(zone_id);

-- Update is_default constraint: only one default per zone
-- First drop existing unique constraint if any
-- ALTER TABLE glamping_rule_sets DROP CONSTRAINT IF EXISTS unique_default_per_zone;

-- Add new constraint: only one default rule set per zone
-- CREATE UNIQUE INDEX IF NOT EXISTS unique_default_per_zone ON glamping_rule_sets(zone_id) WHERE is_default = TRUE;
