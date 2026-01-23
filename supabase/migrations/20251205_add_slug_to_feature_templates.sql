-- Add slug column to campsite_feature_templates
ALTER TABLE campsite_feature_templates
ADD COLUMN slug VARCHAR(100);

-- Generate slugs from English names
-- Convert to lowercase, replace spaces with hyphens, remove special characters
UPDATE campsite_feature_templates
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        COALESCE(name->>'en', name->>'vi'),
        '[^a-zA-Z0-9\s-]', '', 'g'  -- Remove special characters except spaces and hyphens
      ),
      '\s+', '-', 'g'  -- Replace spaces with hyphens
    ),
    '-+', '-', 'g'  -- Replace multiple hyphens with single hyphen
  )
);

-- Make slug NOT NULL and UNIQUE after populating
ALTER TABLE campsite_feature_templates
ALTER COLUMN slug SET NOT NULL;

-- Add unique index for slug
CREATE UNIQUE INDEX idx_campsite_feature_templates_slug ON campsite_feature_templates(slug);
