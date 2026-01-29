# 8. Booking Flow

## 8.1. Tổng quan Booking Flow

GlampingHub hỗ trợ 2 loại booking:
1. **Single-item booking** — Đặt 1 item (lều/phòng)
2. **Multi-item booking** — Đặt nhiều items cùng lúc (shopping cart)

## 8.2. Customer Booking Flow (Frontend)

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ 1. Browse │ ──▶ │ 2. Detail │ ──▶ │ 3. Cart  │ ──▶ │ 4. Form  │ ──▶ │5. Payment│
│   Search  │     │  + Book  │     │  Review  │     │  Details │     │  + QR    │
└──────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                                          │
                                                                          ▼
                                                                    ┌──────────┐
                                                                    │6. Confirm│
                                                                    │  Done!   │
                                                                    └──────────┘
```

### Step 1: Browse & Search
- **URL:** `/glamping/search` hoặc `/glamping/search_2` (v2)
- **URL:** `/glamping/zones/[zoneId]` (browse zone)
- Search by: zone, date range, guests, category
- API: `GET /api/glamping/search`

### Step 2: Item Detail
- **URL:** `/glamping/zones/[zoneId]/items/[id]`
- Xem: images, description, parameters, pricing, availability calendar
- APIs:
  - `GET /api/glamping/items/[id]/details`
  - `GET /api/glamping/items/[id]/availability?checkIn=...&checkOut=...`
  - `POST /api/glamping/booking/calculate-pricing`

### Step 3: Add to Cart
- User chọn: dates, parameter quantities (adults, children, etc.)
- Pricing calculated realtime via `POST /api/glamping/booking/calculate-pricing`
- "Add to Cart" → Zustand store (GlampingCartProvider)
- Cart persisted in localStorage
- Có thể add nhiều items (multi-item booking)

### Step 4: Booking Form
- **URL:** `/glamping/booking/form`
- Sections:
  - **Cart Items List** — Review items, edit/remove
  - **Menu Selection** — Chọn combo/menu products
  - **My Details** — Name, email, phone, country
  - **Other Details** — Special requirements, party names, invoice notes
  - **Voucher Code** — Apply discount
  - **Payment Method** — Pay Now (full) or Pay Later (deposit)
  - **Pricing Summary** — Full breakdown
- "Submit Booking" → `POST /api/glamping/booking`

### Step 5: Payment
- **URL:** `/glamping/booking/payment/[id]`
- Hiển thị:
  - Booking summary
  - VietQR code (bank transfer)
  - Payment amount (deposit or full)
  - Countdown timer (payment timeout)
- Auto-poll: `GET /api/glamping/bookings/[id]/payment-status`
- When payment detected (via SePay webhook) → redirect to confirmation

### Step 6: Confirmation
- **URL:** `/glamping/booking/confirmation/[code]`
- Hiển thị booking details, confirmation message
- Email confirmation already sent

## 8.3. Backend Booking Logic

### Single-item Booking Flow
```
POST /api/glamping/booking
├── 1. Validate input fields
├── 2. Fetch item + zone + parameters + taxes
├── 3. Check availability (overlap query)
├── 4. Validate menu combos vs counted guests
├── 5. Calculate pricing (calculateGlampingPricing)
│   ├── Fetch all pricing records
│   ├── Fetch active events for item
│   ├── For each night:
│   │   ├── Find matching events (by date + day of week)
│   │   ├── Apply event pricing (new_price/dynamic/yield)
│   │   └── Use base price if no event match
│   └── Sum up per-parameter totals
├── 6. Calculate menu products total
├── 7. Validate & apply voucher code
├── 8. Calculate deposit (from item or zone settings)
├── 9. Find/create customer
├── 10. Generate booking code (GH260001)
├── 11. BEGIN transaction
│   ├── INSERT glamping_bookings
│   ├── INSERT glamping_booking_items (per parameter)
│   ├── INSERT glamping_booking_parameters (snapshot)
│   ├── INSERT glamping_booking_menu_products
│   ├── INSERT glamping_booking_status_history
│   └── UPDATE glamping_discounts (increment usage)
├── 12. COMMIT transaction
├── 13. Send confirmation email to customer
├── 14. Send notification email to staff
├── 15. Create in-app notifications
└── 16. Return { bookingId, bookingCode, redirectUrl }
```

### Multi-item Booking Flow
Tương tự single-item, nhưng:
- Step 1: Validate ALL items belong to same zone
- Step 3: Check availability for ALL items
- Step 5: Calculate pricing for EACH item
- Step 10: Use earliest check-in / latest check-out for booking dates
- Step 11: Create booking_items for all items' parameters
- Menu products can be shared (booking level) or per-item

## 8.4. Availability Check Logic

```sql
-- Overlap detection: Find existing bookings that conflict with requested dates
SELECT b.id, b.booking_code, bi.parameter_id
FROM glamping_bookings b
JOIN glamping_booking_items bi ON b.id = bi.booking_id
WHERE bi.item_id = $1
  AND b.status NOT IN ('cancelled', 'rejected')
  AND (
    (b.check_in_date < $3 AND b.check_out_date > $2)        -- Overlap inside
    OR (b.check_in_date >= $2 AND b.check_in_date < $3)     -- Start inside
    OR (b.check_out_date > $2 AND b.check_out_date <= $3)   -- End inside
  )
```

Sau đó check nếu booked parameters overlap với requested parameters.

## 8.5. Payment Flow

### Pay Now (Full Payment)
```
1. Booking created → payment_status = 'pending'
2. payment_expires_at = NOW() + 30 minutes (configurable)
3. Show VietQR code with booking_code as reference
4. Customer transfers money via bank app
5. SePay webhook → POST /api/webhooks/sepay
   a. Parse transaction_content for booking code pattern (GH...)
   b. Match amount
   c. UPDATE booking: payment_status = 'paid'
   d. Send payment confirmation email
6. Frontend polls payment-status → detected → redirect to confirmation
```

### Pay Later (Deposit)
```
1. Deposit calculated from:
   - Item deposit settings (glamping_deposit_settings)
   - OR Zone deposit settings (glamping_zones.deposit_type/value)
   - Types: percentage, fixed, per_day, per_quantity
2. Booking created → deposit_due, balance_due calculated
3. Similar QR flow but for deposit amount
4. Balance due can be paid on-site or later via admin
```

### Admin Payment
```
Admin can:
- Add manual payment: POST /api/admin/glamping/bookings/[id]/add-payment
- Edit payment: PUT /api/admin/glamping/bookings/[id]/payments/[paymentId]
- Delete payment: DELETE /api/admin/glamping/bookings/[id]/payments/[paymentId]
- Force status change: PATCH /api/admin/glamping/bookings/[id]
```

## 8.6. Booking Status Machine

```
                                ┌───────────┐
                        ┌──────│  pending   │──────┐
                        │      └───────────┘      │
                        │                          │ (timeout)
                        ▼                          ▼
                  ┌───────────┐            ┌───────────┐
           ┌─────│ confirmed  │            │ cancelled  │
           │     └───────────┘            └───────────┘
           │           │
           │           ▼
           │     ┌───────────┐
           │     │in_progress │ (checked in)
           │     └───────────┘
           │           │
           │           ▼
           │     ┌───────────┐
           └────▶│ completed  │
                 └───────────┘
```

Payment status: `pending → partial → paid → refunded/failed`

## 8.7. Discount/Voucher System

### Discount Types
- **Percentage:** % off total
- **Fixed:** Fixed amount off

### Application Types
- `per_booking` — Applied once per booking
- `per_item` — Applied per item

### Recurrence
- `always` — Always valid
- `one_time` — Single use per customer
- `date_range` — Valid within start_date/end_date
- Weekly: `days_of_week` array for specific days

### Validation Flow
```
POST /api/glamping/validate-voucher
├── Find discount by code
├── Check status = 'active'
├── Check date range (if date_range recurrence)
├── Check days_of_week (if weekly)
├── Check max_uses vs current_uses
├── Check applicable items (glamping_discount_items)
├── Calculate discount amount
│   ├── Percentage: totalAmount * (amount / 100)
│   └── Fixed: amount (capped at totalAmount)
└── Return { valid, discountAmount, voucher }
```

## 8.8. Menu System

Khách có thể chọn menu products (combo meals) khi booking:

### Menu Structure
- **Menu Categories** → **Menu Items** (with prices)
- Menu items can have guest limits (combo for N people):
  - `min_guests = max_guests` → Fixed combo (e.g., Combo 2 người)
  - `min_guests ≠ max_guests` → Variable combo
  - `NULL/NULL` → Traditional item (no guest limit)

### Validation Rule
Khi có menu combos:
```
totalComboGuests >= totalCountedGuests
```
- `totalCountedGuests` = sum of quantities for parameters with `counted_for_menu = true`
- `totalComboGuests` = sum of combo capacities

### Menu Reminder Cron
Cron job `menu-selection-reminder` gửi email nhắc khách chọn menu trước check-in.

## 8.9. Email Notifications

Khi booking được tạo:
1. **Customer:** Booking confirmation email
2. **Staff:** New booking notification (admin, sale, operations roles)
3. **Zone owners:** Notification to glamping_owner of that zone
4. **In-app:** Notifications cho tất cả relevant users

### Automated Emails (Cron)
- Pre-arrival email (before check-in)
- Post-checkout email (after check-out)
- Menu selection reminder
- Payment reminder
