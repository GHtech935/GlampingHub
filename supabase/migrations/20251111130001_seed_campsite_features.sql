-- Seed data for campsite features system
-- Contains all features extracted from the campsite features image

-- Insert categories
INSERT INTO campsite_feature_categories (name, slug, icon, sort_order, is_active) VALUES
  ('{"vi": "Giải trí tại chỗ", "en": "Leisure on site"}', 'leisure-on-site', 'activity', 1, true),
  ('{"vi": "Tiện nghi tại chỗ", "en": "Amenities on site"}', 'amenities-on-site', 'home', 2, true),
  ('{"vi": "Chào đón nhóm", "en": "Groups welcome"}', 'groups-welcome', 'users', 3, true),
  ('{"vi": "Quy tắc", "en": "Rules"}', 'rules', 'clipboard-list', 4, true),
  ('{"vi": "Tiện ích", "en": "Utilities"}', 'utilities', 'zap', 5, true),
  ('{"vi": "Khả năng tiếp cận", "en": "Accessibility"}', 'accessibility', 'accessibility', 6, true),
  ('{"vi": "Tiện nghi gần đây", "en": "Nearby amenities"}', 'nearby-amenities', 'map-pin', 7, true),
  ('{"vi": "Giải trí gần đây", "en": "Nearby leisure"}', 'nearby-leisure', 'compass', 8, true),
  ('{"vi": "Loại hình", "en": "Type"}', 'type', 'tag', 9, true),
  ('{"vi": "Chủ đề", "en": "Themes"}', 'themes', 'star', 10, true),
  ('{"vi": "Du lịch và nhà di động", "en": "Touring and motorhomes"}', 'touring-motorhomes', 'truck', 11, true);

-- Get category IDs for reference (we'll use subqueries in the INSERT)
-- Insert feature templates for each category

-- 1. LEISURE ON SITE
INSERT INTO campsite_feature_templates (category_id, name, sort_order, is_active) VALUES
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'leisure-on-site'), '{"vi": "Quán bar hoặc câu lạc bộ", "en": "Bar or club house"}', 1, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'leisure-on-site'), '{"vi": "Cho thuê xe đạp", "en": "Cycle hire"}', 2, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'leisure-on-site'), '{"vi": "Giải trí buổi tối", "en": "Evening entertainment"}', 3, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'leisure-on-site'), '{"vi": "Câu cá", "en": "Fishing"}', 4, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'leisure-on-site'), '{"vi": "Trung tâm thể dục", "en": "Fitness centre"}', 5, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'leisure-on-site'), '{"vi": "Phòng trò chơi", "en": "Games room"}', 6, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'leisure-on-site'), '{"vi": "Bể bơi trong nhà", "en": "Indoor swimming pool"}', 7, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'leisure-on-site'), '{"vi": "Câu lạc bộ trẻ em", "en": "Kids'' club"}', 8, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'leisure-on-site'), '{"vi": "Nhà hàng/quán cà phê tại chỗ", "en": "On-site restaurant/cafe"}', 9, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'leisure-on-site'), '{"vi": "Bể bơi ngoài trời", "en": "Outdoor swimming pool"}', 10, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'leisure-on-site'), '{"vi": "Khu vui chơi", "en": "Play area"}', 11, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'leisure-on-site'), '{"vi": "Đồ ăn mang về", "en": "Take away"}', 12, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'leisure-on-site'), '{"vi": "Sân tennis", "en": "Tennis"}', 13, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'leisure-on-site'), '{"vi": "Phòng TV", "en": "TV room"}', 14, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'leisure-on-site'), '{"vi": "Thể thao dưới nước", "en": "Watersports"}', 15, true);

-- 2. AMENITIES ON SITE
INSERT INTO campsite_feature_templates (category_id, name, sort_order, is_active) VALUES
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Có bồn tắm", "en": "Bath available"}', 1, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Chỗ đậu xe theo lô/đơn vị", "en": "Car parking by pitch/unit"}', 2, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Nhà vệ sinh phân hủy", "en": "Composting toilet"}', 3, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Công viên chó", "en": "Dog park"}', 4, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Phòng sấy khô", "en": "Drying room"}', 5, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Cửa hàng thực phẩm", "en": "Food shop"}', 6, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Wifi miễn phí", "en": "Free wifi"}', 7, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Đông lạnh túi chườm", "en": "Ice pack freezing"}', 8, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Truy cập internet", "en": "Internet access"}', 9, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Phòng giặt tự động", "en": "Launderette"}', 10, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Sản phẩm địa phương", "en": "Local produce"}', 11, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Phòng vệ sinh cho phụ huynh và em bé", "en": "Parent & baby washroom"}', 12, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Đón tại phương tiện công cộng", "en": "Pick-up from public transport"}', 13, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Bàn dã ngoại", "en": "Picnic table"}', 14, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Nhà vệ sinh di động", "en": "Portable toilet"}', 15, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Nhà vệ sinh công cộng", "en": "Pub toilets"}', 16, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Điện thoại công cộng", "en": "Public telephone"}', 17, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Có vòi sen", "en": "Shower available"}', 18, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Khối nhà vệ sinh", "en": "Toilet block"}', 19, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Khu vực rửa chén", "en": "Washing-up area"}', 20, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'amenities-on-site'), '{"vi": "Wifi", "en": "Wifi"}', 21, true);

-- 3. GROUPS WELCOME
INSERT INTO campsite_feature_templates (category_id, name, sort_order, is_active) VALUES
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'groups-welcome'), '{"vi": "Chào đón D. of E.", "en": "D. of E. welcome"}', 1, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'groups-welcome'), '{"vi": "Thân thiện với gia đình", "en": "Family friendly"}', 2, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'groups-welcome'), '{"vi": "Thân thiện với xe máy", "en": "Motorcycle friendly"}', 3, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'groups-welcome'), '{"vi": "Chào đón nhóm cùng giới", "en": "Single-sex groups welcome"}', 4, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'groups-welcome'), '{"vi": "Chào đón nhóm sinh viên", "en": "Student groups welcome"}', 5, true);

-- 4. RULES
INSERT INTO campsite_feature_templates (category_id, name, sort_order, is_active) VALUES
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'rules'), '{"vi": "Có cung cấp lò nướng", "en": "Barbecue provided"}', 1, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'rules'), '{"vi": "Cho phép nướng BBQ", "en": "Barbecues allowed"}', 2, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'rules'), '{"vi": "Cho phép đốt lửa trại", "en": "Campfires allowed"}', 3, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'rules'), '{"vi": "Cho phép xe thương mại", "en": "Commercial vehicles allowed"}', 4, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'rules'), '{"vi": "Cho phép mang chó", "en": "Dogs allowed"}', 5, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'rules'), '{"vi": "Cho phép mang chó cả năm", "en": "Dogs allowed all year"}', 6, true);

-- 5. UTILITIES
INSERT INTO campsite_feature_templates (category_id, name, sort_order, is_active) VALUES
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'utilities'), '{"vi": "Tiện ích sạc", "en": "Charging facilities"}', 1, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'utilities'), '{"vi": "Xử lý hóa chất", "en": "Chemical disposal"}', 2, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'utilities'), '{"vi": "Điểm sạc xe điện", "en": "Electric car charging point(s)"}', 3, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'utilities'), '{"vi": "Có bình gas", "en": "Gas cylinders available"}', 4, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'utilities'), '{"vi": "Có tái chế", "en": "Recycling available"}', 5, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'utilities'), '{"vi": "Năng lượng tái tạo", "en": "Renewable energy"}', 6, true);

-- 6. ACCESSIBILITY
INSERT INTO campsite_feature_templates (category_id, name, sort_order, is_active) VALUES
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'accessibility'), '{"vi": "Phòng tắm: Vòi sen rộng rãi", "en": "Bathrooms: Large spacious shower"}', 1, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'accessibility'), '{"vi": "Phòng tắm: Nhà vệ sinh rộng rãi", "en": "Bathrooms: Large spacious toilet"}', 2, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'accessibility'), '{"vi": "Phòng tắm: Không có bậc thang", "en": "Bathrooms: Step-free access"}', 3, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'accessibility'), '{"vi": "Phòng tắm: Cửa rộng (trên 30 inches/75cm)", "en": "Bathrooms: Wide doorways (over 30 inches/75cm)"}', 4, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'accessibility'), '{"vi": "Không có bậc hoặc bằng phẳng", "en": "Step-free or level access"}', 5, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'accessibility'), '{"vi": "Địa hình không bằng phẳng; sỏi hoặc bùn lỏng", "en": "Uneven terrain; gravel or loose mud"}', 6, true);

-- 7. NEARBY AMENITIES
INSERT INTO campsite_feature_templates (category_id, name, sort_order, is_active) VALUES
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'nearby-amenities'), '{"vi": "Quán bar gần đây", "en": "Bar nearby"}', 1, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'nearby-amenities'), '{"vi": "Dắt chó đi dạo gần đây", "en": "Dog walk nearby"}', 2, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'nearby-amenities'), '{"vi": "Phương tiện công cộng gần đây", "en": "Public transport nearby"}', 3, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'nearby-amenities'), '{"vi": "Cửa hàng gần đây", "en": "Shop nearby"}', 4, true);

-- 8. NEARBY LEISURE
INSERT INTO campsite_feature_templates (category_id, name, sort_order, is_active) VALUES
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'nearby-leisure'), '{"vi": "Chèo thuyền kayak gần đây", "en": "Canoeing/kayaking nearby"}', 1, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'nearby-leisure'), '{"vi": "Cho thuê xe đạp gần đây", "en": "Cycle hire nearby"}', 2, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'nearby-leisure'), '{"vi": "Câu cá gần đây", "en": "Fishing nearby"}', 3, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'nearby-leisure'), '{"vi": "Sân golf gần đây", "en": "Golf nearby"}', 4, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'nearby-leisure'), '{"vi": "Cưỡi ngựa gần đây", "en": "Horse riding nearby"}', 5, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'nearby-leisure'), '{"vi": "Đạp xe leo núi gần đây", "en": "Mountain biking nearby"}', 6, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'nearby-leisure'), '{"vi": "Bể bơi ngoài trời gần đây", "en": "Outdoor pool nearby"}', 7, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'nearby-leisure'), '{"vi": "Nhà hàng gần đây", "en": "Restaurant nearby"}', 8, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'nearby-leisure'), '{"vi": "Đi thuyền buồm gần đây", "en": "Sailing nearby"}', 9, true);

-- 9. TYPE
INSERT INTO campsite_feature_templates (category_id, name, sort_order, is_active) VALUES
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'type'), '{"vi": "Lớn (51-200 lô)", "en": "Large (51-200 pitches)"}', 1, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'type'), '{"vi": "Vừa (21-50 lô)", "en": "Medium (21-50 pitches)"}', 2, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'type'), '{"vi": "Nhỏ (1-20 lô)", "en": "Small (1-20 pitches)"}', 3, true);

-- 10. THEMES
INSERT INTO campsite_feature_templates (category_id, name, sort_order, is_active) VALUES
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'themes'), '{"vi": "Phong cảnh ngoạn mục", "en": "Spectacular scenery"}', 1, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'themes'), '{"vi": "Thiên đường cho người đi bộ", "en": "Walkers'' paradise"}', 2, true);

-- 11. TOURING AND MOTORHOMES
INSERT INTO campsite_feature_templates (category_id, name, sort_order, is_active) VALUES
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'touring-motorhomes'), '{"vi": "Điểm thoát nước cho xe du lịch", "en": "Drainage hook-up points for tourers"}', 1, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'touring-motorhomes'), '{"vi": "Điểm dịch vụ nhà di động", "en": "Motorhome service point"}', 2, true),
  ((SELECT id FROM campsite_feature_categories WHERE slug = 'touring-motorhomes'), '{"vi": "Điểm kết nối nước cho xe du lịch", "en": "Water hook-up points for tourers"}', 3, true);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully seeded % categories and % feature templates',
    (SELECT COUNT(*) FROM campsite_feature_categories),
    (SELECT COUNT(*) FROM campsite_feature_templates);
END $$;
