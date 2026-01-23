-- ==========================================
-- SEED DATA FOR DEVELOPMENT
-- Sample data for testing
-- ==========================================

-- Insert sample regions
INSERT INTO regions (name, slug, description, is_featured) VALUES
('Đà Lạt', 'da-lat', 'The city of eternal spring with cool climate and beautiful pine forests', true),
('Sapa', 'sapa', 'Mountainous region with terraced rice fields and ethnic minority culture', true),
('Phú Quốc', 'phu-quoc', 'Tropical island paradise with pristine beaches', true),
('Ninh Thuận', 'ninh-thuan', 'Coastal region with unique desert landscape', false),
('Mộc Châu', 'moc-chau', 'Highland plateau famous for tea plantations', false);

-- Insert sample campsites
INSERT INTO campsites (
  region_id,
  name,
  slug,
  description,
  short_description,
  address,
  latitude,
  longitude,
  phone,
  email,
  is_featured
) VALUES
(
  (SELECT id FROM regions WHERE slug = 'da-lat'),
  'Thông Vi Vu Camping',
  'thong-vi-vu',
  'Experience nature at its finest with stunning lake views and peaceful forest surroundings. Perfect for families and groups seeking a tranquil escape.',
  'Lakeside camping with beautiful pine forest views',
  'Đường Trần Hưng Đạo, Phường 1, Đà Lạt, Lâm Đồng',
  11.9404,
  108.4583,
  '+84 263 123 4567',
  'info@thongvivu.com',
  true
),
(
  (SELECT id FROM regions WHERE slug = 'sapa'),
  'Sapa Mountain View Camp',
  'sapa-mountain-view',
  'Wake up to breathtaking mountain views and terraced rice fields. Immerse yourself in local H''Mong culture.',
  'Mountain camping with terraced rice field views',
  'Lao Chải, Sa Pa, Lào Cai',
  22.3364,
  103.8438,
  '+84 214 987 6543',
  'hello@sapamountain.com',
  true
),
(
  (SELECT id FROM regions WHERE slug = 'phu-quoc'),
  'Phú Quốc Beach Glamping',
  'phu-quoc-beach',
  'Luxury glamping experience right on the beach. Fall asleep to the sound of waves.',
  'Beachfront glamping with sunset views',
  'Bãi Sao, Phú Quốc, Kiên Giang',
  10.2275,
  103.9670,
  '+84 297 456 7890',
  'booking@phuquocbeach.com',
  true
);

-- Insert sample pitches for Thông Vi Vu
INSERT INTO pitches (
  campsite_id,
  name,
  slug,
  description,
  max_guests,
  max_vehicles,
  max_dogs,
  ground_type,
  base_price,
  weekend_price,
  is_featured
) VALUES
(
  (SELECT id FROM campsites WHERE slug = 'thong-vi-vu'),
  'View Hồ Premium',
  'view-ho-premium',
  'Premium pitch with stunning lake views, perfect for romantic getaways or small families',
  6,
  2,
  2,
  'Grass',
  500000,
  650000,
  true
),
(
  (SELECT id FROM campsites WHERE slug = 'thong-vi-vu'),
  'View Vườn Standard',
  'view-vuon-standard',
  'Peaceful garden view pitch surrounded by pine trees',
  4,
  1,
  1,
  'Grass',
  400000,
  500000,
  false
),
(
  (SELECT id FROM campsites WHERE slug = 'thong-vi-vu'),
  'Electric Hardstanding',
  'electric-hardstanding',
  'Gravel pitch with electric hookup, ideal for motorhomes',
  4,
  1,
  0,
  'Gravel and hardstanding',
  450000,
  550000,
  false
);

-- Insert sample pitches for Sapa
INSERT INTO pitches (
  campsite_id,
  name,
  slug,
  description,
  max_guests,
  max_vehicles,
  max_dogs,
  ground_type,
  base_price,
  weekend_price,
  is_featured
) VALUES
(
  (SELECT id FROM campsites WHERE slug = 'sapa-mountain-view'),
  'Mountain Vista Deluxe',
  'mountain-vista-deluxe',
  'Spectacular mountain and terrace views from your tent',
  6,
  2,
  2,
  'Grass',
  550000,
  700000,
  true
),
(
  (SELECT id FROM campsites WHERE slug = 'sapa-mountain-view'),
  'Valley View Standard',
  'valley-view-standard',
  'Comfortable pitch with valley views',
  4,
  1,
  1,
  'Grass',
  450000,
  550000,
  false
);

-- Insert sample filters
INSERT INTO filters (category_id, name, slug, is_popular, icon) VALUES
((SELECT id FROM filter_categories WHERE slug = 'popular'), 'Electric pitch', 'electric-pitch', true, 'zap'),
((SELECT id FROM filter_categories WHERE slug = 'popular'), 'Dogs allowed', 'dogs-allowed', true, 'dog'),
((SELECT id FROM filter_categories WHERE slug = 'popular'), 'Lake view', 'lake-view', true, 'waves'),
((SELECT id FROM filter_categories WHERE slug = 'popular'), 'Mountain view', 'mountain-view', true, 'mountain'),
((SELECT id FROM filter_categories WHERE slug = 'popular'), 'Wi-Fi available', 'wifi-available', true, 'wifi'),
((SELECT id FROM filter_categories WHERE slug = 'amenities-on-site'), 'Shower facilities', 'shower-facilities', false, 'shower'),
((SELECT id FROM filter_categories WHERE slug = 'amenities-on-site'), 'Toilets', 'toilets', false, 'door-open'),
((SELECT id FROM filter_categories WHERE slug = 'amenities-on-site'), 'Restaurant', 'restaurant', false, 'utensils'),
((SELECT id FROM filter_categories WHERE slug = 'amenities-on-site'), 'BBQ area', 'bbq-area', false, 'flame'),
((SELECT id FROM filter_categories WHERE slug = 'leisure-on-site'), 'Hiking trails', 'hiking-trails', false, 'mountain'),
((SELECT id FROM filter_categories WHERE slug = 'leisure-on-site'), 'Kayaking', 'kayaking', false, 'ship'),
((SELECT id FROM filter_categories WHERE slug = 'leisure-on-site'), 'Fishing', 'fishing', false, 'fish'),
((SELECT id FROM filter_categories WHERE slug = 'rules'), 'Campfires allowed', 'campfires-allowed', false, 'flame'),
((SELECT id FROM filter_categories WHERE slug = 'rules'), 'Quiet hours enforced', 'quiet-hours', false, 'volume-x'),
((SELECT id FROM filter_categories WHERE slug = 'accessibility'), 'Wheelchair accessible', 'wheelchair-accessible', false, 'accessibility');

-- Assign filters to campsites
INSERT INTO campsite_filters (campsite_id, filter_id, is_included) VALUES
-- Thông Vi Vu filters
((SELECT id FROM campsites WHERE slug = 'thong-vi-vu'), (SELECT id FROM filters WHERE slug = 'electric-pitch'), true),
((SELECT id FROM campsites WHERE slug = 'thong-vi-vu'), (SELECT id FROM filters WHERE slug = 'dogs-allowed'), true),
((SELECT id FROM campsites WHERE slug = 'thong-vi-vu'), (SELECT id FROM filters WHERE slug = 'lake-view'), true),
((SELECT id FROM campsites WHERE slug = 'thong-vi-vu'), (SELECT id FROM filters WHERE slug = 'wifi-available'), true),
((SELECT id FROM campsites WHERE slug = 'thong-vi-vu'), (SELECT id FROM filters WHERE slug = 'shower-facilities'), true),
((SELECT id FROM campsites WHERE slug = 'thong-vi-vu'), (SELECT id FROM filters WHERE slug = 'toilets'), true),
((SELECT id FROM campsites WHERE slug = 'thong-vi-vu'), (SELECT id FROM filters WHERE slug = 'bbq-area'), true),
((SELECT id FROM campsites WHERE slug = 'thong-vi-vu'), (SELECT id FROM filters WHERE slug = 'kayaking'), true),
((SELECT id FROM campsites WHERE slug = 'thong-vi-vu'), (SELECT id FROM filters WHERE slug = 'fishing'), true),
((SELECT id FROM campsites WHERE slug = 'thong-vi-vu'), (SELECT id FROM filters WHERE slug = 'campfires-allowed'), true),

-- Sapa Mountain View filters
((SELECT id FROM campsites WHERE slug = 'sapa-mountain-view'), (SELECT id FROM filters WHERE slug = 'mountain-view'), true),
((SELECT id FROM campsites WHERE slug = 'sapa-mountain-view'), (SELECT id FROM filters WHERE slug = 'dogs-allowed'), true),
((SELECT id FROM campsites WHERE slug = 'sapa-mountain-view'), (SELECT id FROM filters WHERE slug = 'wifi-available'), true),
((SELECT id FROM campsites WHERE slug = 'sapa-mountain-view'), (SELECT id FROM filters WHERE slug = 'shower-facilities'), true),
((SELECT id FROM campsites WHERE slug = 'sapa-mountain-view'), (SELECT id FROM filters WHERE slug = 'toilets'), true),
((SELECT id FROM campsites WHERE slug = 'sapa-mountain-view'), (SELECT id FROM filters WHERE slug = 'restaurant'), true),
((SELECT id FROM campsites WHERE slug = 'sapa-mountain-view'), (SELECT id FROM filters WHERE slug = 'hiking-trails'), true);

-- Assign filters to specific pitches
INSERT INTO pitch_features (pitch_id, filter_id, is_included) VALUES
-- View Hồ Premium features
((SELECT id FROM pitches WHERE slug = 'view-ho-premium'), (SELECT id FROM filters WHERE slug = 'electric-pitch'), true),
((SELECT id FROM pitches WHERE slug = 'view-ho-premium'), (SELECT id FROM filters WHERE slug = 'lake-view'), true),

-- Electric Hardstanding features
((SELECT id FROM pitches WHERE slug = 'electric-hardstanding'), (SELECT id FROM filters WHERE slug = 'electric-pitch'), true);

-- Insert sample products for pitches
INSERT INTO pitch_products (pitch_id, name, description, category, price, unit, tax_rate, is_available) VALUES
-- Products for View Hồ Premium
(
  (SELECT id FROM pitches WHERE slug = 'view-ho-premium'),
  'BBQ Set Rental',
  'Complete BBQ set including grill, charcoal, and utensils',
  'equipment',
  150000,
  'day',
  10.00,
  true
),
(
  (SELECT id FROM pitches WHERE slug = 'view-ho-premium'),
  'Kayak Rental',
  'Single kayak rental with safety equipment',
  'activity',
  200000,
  'hour',
  10.00,
  true
),
(
  (SELECT id FROM pitches WHERE slug = 'view-ho-premium'),
  'Extra Tent Setup',
  'Additional small tent setup service',
  'service',
  100000,
  'item',
  10.00,
  true
),
(
  (SELECT id FROM pitches WHERE slug = 'view-ho-premium'),
  'Breakfast Package',
  'Continental breakfast delivered to your pitch',
  'food',
  120000,
  'person',
  5.00,
  true
);

-- Insert sample discounts
INSERT INTO discounts (
  category_id,
  name,
  code,
  description,
  discount_type,
  discount_value,
  applies_to,
  min_order_amount,
  usage_limit,
  valid_from,
  valid_until,
  is_active
) VALUES
(
  (SELECT id FROM discount_categories WHERE slug = 'discounts'),
  'Early Bird 20%',
  'EARLY20',
  'Book 30 days in advance and save 20%',
  'percentage',
  20.00,
  'total',
  500000,
  1000,
  NOW(),
  NOW() + INTERVAL '6 months',
  true
),
(
  (SELECT id FROM discount_categories WHERE slug = 'vouchers'),
  'New Customer 100k',
  'WELCOME100',
  'Welcome discount for first-time customers',
  'fixed_amount',
  100000,
  'total',
  800000,
  500,
  NOW(),
  NOW() + INTERVAL '3 months',
  true
),
(
  (SELECT id FROM discount_categories WHERE slug = 'discounts'),
  'Weekend Special 15%',
  'WEEKEND15',
  'Weekend bookings get 15% off',
  'percentage',
  15.00,
  'accommodation',
  NULL,
  NULL,
  NOW(),
  NOW() + INTERVAL '1 year',
  true
);

-- Insert pricing calendar for next 90 days
INSERT INTO pricing_calendar (pitch_id, date, price_per_night, price_type)
SELECT
  p.id,
  generate_series::date,
  CASE
    WHEN EXTRACT(DOW FROM generate_series) IN (5, 6) THEN p.weekend_price
    ELSE p.base_price
  END,
  CASE
    WHEN EXTRACT(DOW FROM generate_series) IN (5, 6) THEN 'weekend'
    ELSE 'standard'
  END
FROM
  pitches p,
  generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days', '1 day'::interval);

-- Insert availability calendar for next 90 days (all available by default)
INSERT INTO availability_calendar (pitch_id, date, status)
SELECT
  p.id,
  generate_series::date,
  'available'
FROM
  pitches p,
  generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days', '1 day'::interval);

-- Create a sample admin user (password: Admin123!)
-- Note: In production, use proper password hashing
INSERT INTO admins (email, password_hash, first_name, last_name, role, is_active) VALUES
('admin@glampinghub.com', '$2a$10$placeholder_hash_change_in_production', 'Admin', 'User', 'super_admin', true);

-- Sample regular user
INSERT INTO users (email, first_name, last_name, phone, country, email_verified) VALUES
('customer@example.com', 'John', 'Doe', '+84 901 234 567', 'Vietnam', true);
