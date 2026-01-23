-- Remove pitch_size_width and pitch_size_depth columns from pitches table
-- These are redundant as pitch_size (JSONB) already contains size description

ALTER TABLE pitches
  DROP COLUMN IF EXISTS pitch_size_width,
  DROP COLUMN IF EXISTS pitch_size_depth;

COMMENT ON COLUMN pitches.pitch_size IS 'Multilingual pitch size description: {"vi": "Diện tích 100m², phù hợp cho lều lớn", "en": "100m² area, suitable for large tents"}';
