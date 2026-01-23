-- ============================================
-- GLAMPING ZONES - MULTI-ZONE ARCHITECTURE
-- Date: 2026-01-13
-- ============================================

-- 1. ZONES TABLE
CREATE TABLE IF NOT EXISTS glamping_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name JSONB DEFAULT '{"vi": "", "en": ""}'::jsonb NOT NULL,
    description JSONB DEFAULT '{"vi": "", "en": ""}'::jsonb,

    -- Location (same structure as campsites)
    address TEXT,
    city VARCHAR(255),
    province VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. ZONE IMAGES TABLE
CREATE TABLE IF NOT EXISTS glamping_zone_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES glamping_zones(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    public_id VARCHAR(255), -- Cloudinary public_id for deletion
    is_featured BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. ADD zone_id TO EXISTING GLAMPING TABLES
ALTER TABLE glamping_items ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES glamping_zones(id) ON DELETE CASCADE;
ALTER TABLE glamping_categories ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES glamping_zones(id) ON DELETE CASCADE;
ALTER TABLE glamping_tags ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES glamping_zones(id) ON DELETE CASCADE;
ALTER TABLE glamping_parameters ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES glamping_zones(id) ON DELETE CASCADE;
ALTER TABLE glamping_item_events ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES glamping_zones(id) ON DELETE CASCADE;
ALTER TABLE glamping_discounts ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES glamping_zones(id) ON DELETE CASCADE;

-- 4. INDEXES for Performance
CREATE INDEX IF NOT EXISTS idx_glamping_zones_city ON glamping_zones(city);
CREATE INDEX IF NOT EXISTS idx_glamping_zones_province ON glamping_zones(province);
CREATE INDEX IF NOT EXISTS idx_glamping_zones_active ON glamping_zones(is_active);
CREATE INDEX IF NOT EXISTS idx_glamping_zone_images_zone ON glamping_zone_images(zone_id);

-- Indexes for zone_id foreign keys
CREATE INDEX IF NOT EXISTS idx_glamping_items_zone ON glamping_items(zone_id);
CREATE INDEX IF NOT EXISTS idx_glamping_categories_zone ON glamping_categories(zone_id);
CREATE INDEX IF NOT EXISTS idx_glamping_tags_zone ON glamping_tags(zone_id);
CREATE INDEX IF NOT EXISTS idx_glamping_parameters_zone ON glamping_parameters(zone_id);
CREATE INDEX IF NOT EXISTS idx_glamping_item_events_zone ON glamping_item_events(zone_id);
CREATE INDEX IF NOT EXISTS idx_glamping_discounts_zone ON glamping_discounts(zone_id);

-- 5. TRIGGERS for updated_at
DROP TRIGGER IF EXISTS update_glamping_zones_updated_at ON glamping_zones;
CREATE TRIGGER update_glamping_zones_updated_at
    BEFORE UPDATE ON glamping_zones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_glamping_zone_images_updated_at ON glamping_zone_images;
CREATE TRIGGER update_glamping_zone_images_updated_at
    BEFORE UPDATE ON glamping_zone_images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. UNIQUE CONSTRAINT for featured image (only one featured image per zone)
DROP INDEX IF EXISTS idx_glamping_zone_images_featured_unique;
CREATE UNIQUE INDEX idx_glamping_zone_images_featured_unique
    ON glamping_zone_images (zone_id)
    WHERE is_featured = true;

-- 7. COMMENTS for documentation
COMMENT ON TABLE glamping_zones IS 'Multi-zone architecture: Each zone contains isolated sets of items, categories, tags, parameters, events, and discounts';
COMMENT ON TABLE glamping_zone_images IS 'Images for glamping zones (max 10 per zone recommended)';
COMMENT ON COLUMN glamping_zones.name IS 'JSONB multilingual: {"vi": "Tên tiếng Việt", "en": "English name"}';
COMMENT ON COLUMN glamping_zones.description IS 'JSONB multilingual description';
COMMENT ON COLUMN glamping_items.zone_id IS 'Zone context for data isolation';
COMMENT ON COLUMN glamping_categories.zone_id IS 'Zone context for data isolation';
COMMENT ON COLUMN glamping_tags.zone_id IS 'Zone context for data isolation';
COMMENT ON COLUMN glamping_parameters.zone_id IS 'Zone context for data isolation';
COMMENT ON COLUMN glamping_item_events.zone_id IS 'Zone context for data isolation';
COMMENT ON COLUMN glamping_discounts.zone_id IS 'Zone context for data isolation';
