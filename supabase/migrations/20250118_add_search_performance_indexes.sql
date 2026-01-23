-- =====================================================
-- SEARCH PERFORMANCE OPTIMIZATION - MISSING INDEXES
-- =====================================================
-- Created: 2025-01-18
-- Purpose: Add composite indexes to optimize search API queries
-- Expected Impact: 2-3x performance improvement
-- Reference: docs/PERFORMANCE_ANALYSIS_2025-01-18.md
-- =====================================================

-- =====================================================
-- CAMPSITE IMAGES INDEXES
-- =====================================================

-- Optimize featured image lookup (used in search results)
-- Query: SELECT ci.image_url FROM campsite_images ci WHERE ci.campsite_id = ? AND ci.is_featured = true
CREATE INDEX IF NOT EXISTS idx_campsite_images_featured
ON campsite_images(campsite_id, is_featured)
WHERE is_featured = true;

-- Optimize images list with ordering (used in search results)
-- Query: SELECT json_agg(ci.image_url ORDER BY ci.display_order) FROM campsite_images ci WHERE ci.campsite_id = ?
CREATE INDEX IF NOT EXISTS idx_campsite_images_display
ON campsite_images(campsite_id, display_order);

-- =====================================================
-- CAMPSITE FILTERS INDEXES
-- =====================================================

-- Optimize features lookup (used in search results)
-- Query: SELECT json_agg(f.name) FROM campsite_filters cf JOIN filters f WHERE cf.campsite_id = ? AND cf.is_included = true
CREATE INDEX IF NOT EXISTS idx_campsite_filters_included
ON campsite_filters(campsite_id, is_included, filter_id)
WHERE is_included = true;

-- =====================================================
-- CAMPSITES SEARCH INDEXES
-- =====================================================

-- Optimize active campsite filtering by location
-- Query: SELECT * FROM campsites WHERE is_active = true AND (city LIKE ? OR province LIKE ?)
CREATE INDEX IF NOT EXISTS idx_campsites_active_city
ON campsites(is_active, city, province)
WHERE is_active = true;

-- Full-text search index for location search (Vietnamese + English)
-- Query: Search by name (vi/en), city, province, address
CREATE INDEX IF NOT EXISTS idx_campsites_location_search
ON campsites USING gin(
  to_tsvector('simple',
    coalesce(name->>'vi', '') || ' ' ||
    coalesce(name->>'en', '') || ' ' ||
    coalesce(city, '') || ' ' ||
    coalesce(province, '') || ' ' ||
    coalesce(address, '')
  )
);

-- =====================================================
-- PITCH FEATURES INDEXES
-- =====================================================

-- Optimize electric pitch check (very common filter)
-- Query: EXISTS(SELECT 1 FROM pitch_features pf WHERE pf.pitch_id = ? AND LOWER(pf.name::text) LIKE '%electric%')
CREATE INDEX IF NOT EXISTS idx_pitch_features_electric
ON pitch_features(pitch_id)
WHERE LOWER(name::text) LIKE '%electric%' OR LOWER(name::text) LIKE '%điện%';

-- =====================================================
-- PITCHES COMPOSITE INDEX
-- =====================================================

-- Optimize pitch listing with sorting (used in search results for top 3 pitches)
-- Query: SELECT * FROM pitches WHERE campsite_id = ? AND is_active = true ORDER BY sort_order, id
CREATE INDEX IF NOT EXISTS idx_pitches_campsite_active_sort
ON pitches(campsite_id, is_active, sort_order, id)
WHERE is_active = true;

-- =====================================================
-- ANALYZE TABLES
-- =====================================================
-- Update table statistics for query planner

ANALYZE campsites;
ANALYZE campsite_images;
ANALYZE campsite_filters;
ANALYZE pitches;
ANALYZE pitch_features;
ANALYZE filters;

-- =====================================================
-- PERFORMANCE NOTES
-- =====================================================
--
-- These indexes target the most expensive subqueries in the search API:
-- 1. Featured image lookup (1 per campsite)
-- 2. Images aggregation (1 per campsite)
-- 3. Features aggregation (1 per campsite)
-- 4. Location search (1 per request)
-- 5. Pitch listing with electric check (3 per campsite)
--
-- Expected query time reduction: 50-70%
-- Index storage overhead: ~5-10 MB
-- Maintenance overhead: Minimal (auto-updated on INSERT/UPDATE)
--
-- =====================================================
