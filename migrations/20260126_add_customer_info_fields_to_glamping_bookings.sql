-- Add customer information fields to glamping_bookings table
-- Date: 2026-01-26

-- Add date_of_birth column
ALTER TABLE glamping_bookings ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Add social_media_url column (Facebook/Instagram personal profile)
ALTER TABLE glamping_bookings ADD COLUMN IF NOT EXISTS social_media_url TEXT;

-- Add photo_consent column (whether customer agrees to have photos taken and stored)
ALTER TABLE glamping_bookings ADD COLUMN IF NOT EXISTS photo_consent BOOLEAN DEFAULT FALSE;

-- Add referral_source column (how customer heard about the camp)
ALTER TABLE glamping_bookings ADD COLUMN IF NOT EXISTS referral_source TEXT;

-- Add comments
COMMENT ON COLUMN glamping_bookings.date_of_birth IS 'Customer date of birth for birthday greetings and special offers';
COMMENT ON COLUMN glamping_bookings.social_media_url IS 'Customer Facebook/Instagram profile URL for pre-checkin confirmation';
COMMENT ON COLUMN glamping_bookings.photo_consent IS 'Whether customer agrees to have random photos taken and stored as camp memories';
COMMENT ON COLUMN glamping_bookings.referral_source IS 'How customer heard about the camp (Facebook, Instagram, TikTok, Referral, Returning customer, Panorama Glamping, Google, Other)';
