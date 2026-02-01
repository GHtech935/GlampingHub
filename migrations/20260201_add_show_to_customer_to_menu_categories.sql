-- Thêm column show_to_customer vào bảng glamping_menu_categories
-- Mặc định là true để các category hiện tại vẫn hiển thị cho khách hàng
ALTER TABLE glamping_menu_categories
ADD COLUMN IF NOT EXISTS show_to_customer BOOLEAN DEFAULT true;

-- Tạo index cho query performance
CREATE INDEX IF NOT EXISTS idx_glamping_menu_categories_show_to_customer
ON glamping_menu_categories(show_to_customer);
