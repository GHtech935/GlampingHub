-- Add social media URL settings for footer icons
-- These will be managed via admin settings page

INSERT INTO admin_settings (key, value, description) VALUES
  ('social_facebook_url', '""', 'Facebook page URL for footer icon'),
  ('social_twitter_url', '""', 'Twitter/X profile URL for footer icon'),
  ('social_instagram_url', '""', 'Instagram profile URL for footer icon')
ON CONFLICT (key) DO NOTHING;
