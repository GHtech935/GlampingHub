-- Migration: Add campsite_images table for image gallery
-- Created: 2025-11-10
-- Purpose: Allow campsites to have multiple images with one featured image

-- Create campsite_images table
CREATE TABLE IF NOT EXISTS campsite_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campsite_id UUID NOT NULL REFERENCES campsites(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  public_id VARCHAR(255), -- Cloudinary public_id for deletion
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_campsite_images_campsite_id ON campsite_images(campsite_id);
CREATE INDEX IF NOT EXISTS idx_campsite_images_featured ON campsite_images(campsite_id, is_featured);
CREATE INDEX IF NOT EXISTS idx_campsite_images_order ON campsite_images(campsite_id, display_order);

-- Add constraint: Only one featured image per campsite
CREATE UNIQUE INDEX IF NOT EXISTS idx_campsite_images_one_featured
ON campsite_images(campsite_id)
WHERE is_featured = true;

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_campsite_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_campsite_images_updated_at
BEFORE UPDATE ON campsite_images
FOR EACH ROW
EXECUTE FUNCTION update_campsite_images_updated_at();

-- Add comment
COMMENT ON TABLE campsite_images IS 'Stores multiple images for each campsite with featured image support';
COMMENT ON COLUMN campsite_images.is_featured IS 'Only one image per campsite can be featured (displayed on card)';
COMMENT ON COLUMN campsite_images.display_order IS 'Order of images in gallery (lower = first)';
COMMENT ON COLUMN campsite_images.public_id IS 'Cloudinary public_id for image deletion';
