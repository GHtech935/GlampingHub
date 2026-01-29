-- Add video_start_time column to glamping_item_media table
-- This stores the number of seconds into a YouTube video to start playback at
ALTER TABLE glamping_item_media ADD COLUMN IF NOT EXISTS video_start_time INTEGER DEFAULT 0;
