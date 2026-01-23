-- Create pitch_images table
-- Similar to campsite_images but for individual pitches

CREATE TABLE IF NOT EXISTS pitch_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id UUID NOT NULL REFERENCES pitches(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  public_id VARCHAR(255),  -- Cloudinary public_id for deletion
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_pitch_images_pitch_id ON pitch_images(pitch_id);
CREATE INDEX idx_pitch_images_display_order ON pitch_images(pitch_id, display_order);

-- Ensure only one featured image per pitch
CREATE UNIQUE INDEX idx_pitch_images_one_featured
  ON pitch_images(pitch_id)
  WHERE is_featured = true;

-- Add comment
COMMENT ON TABLE pitch_images IS 'Stores images for individual pitches';
COMMENT ON COLUMN pitch_images.public_id IS 'Cloudinary public_id used for deletion';
COMMENT ON COLUMN pitch_images.is_featured IS 'Main featured image for the pitch (only one per pitch)';
