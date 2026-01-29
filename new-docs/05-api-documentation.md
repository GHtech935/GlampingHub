# 5. API Documentation

## 5.1. Tổng quan

Tất cả API endpoints dùng **Next.js Route Handlers** (`app/api/*/route.ts`).

### Convention
- Tất cả response là JSON
- Error format: `{ error: "message", errorCode?: "CODE" }`
- Success format: `{ data: ... }` hoặc array trực tiếp
- Admin APIs require staff session (checked via middleware + `getSession()`)
- Public APIs không yêu cầu authentication

### Authentication
- JWT token stored in HTTP-only cookie (`glampinghub_session`)
- Session verified via `getSession()` (lib/auth.ts)
- Admin routes: middleware redirects unauthenticated users to `/login-admin`

---

## 5.2. Auth APIs (`/api/auth/*`)

### `POST /api/auth/admin/login`
**Mô tả:** Đăng nhập staff/admin.

**Body:**
```json
{ "email": "admin@example.com", "password": "secret" }
```

**Response:** `200 OK`
```json
{
  "user": {
    "type": "staff",
    "id": "uuid",
    "email": "admin@example.com",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin",
    "campsiteIds": [],
    "glampingZoneIds": []
  }
}
```
Sets HTTP-only cookie `glampinghub_session`.

### `POST /api/auth/customer/login`
**Mô tả:** Đăng nhập customer.

**Body:**
```json
{ "email": "customer@example.com", "password": "secret" }
```

### `POST /api/auth/customer/register`
**Mô tả:** Đăng ký tài khoản customer.

**Body:**
```json
{
  "email": "new@example.com",
  "password": "secret123",
  "firstName": "Nguyen",
  "lastName": "Van A",
  "phone": "0901234567"
}
```

### `GET /api/auth/customer/oauth/[provider]/start`
**Mô tả:** Bắt đầu OAuth flow (Google, Facebook).
**Redirect:** Chuyển hướng đến provider's OAuth consent screen.

### `GET /api/auth/customer/oauth/[provider]/callback`
**Mô tả:** OAuth callback handler. Tạo/cập nhật customer, set session.

### `POST /api/auth/logout`
**Mô tả:** Xóa session cookie.

### `GET /api/auth/me`
**Mô tả:** Lấy thông tin session hiện tại.

**Response:** `200 OK`
```json
{
  "user": {
    "type": "staff",
    "id": "uuid",
    "email": "admin@example.com",
    "role": "admin",
    "glampingZoneIds": ["zone-uuid-1"]
  }
}
```
Hoặc `{ "user": null }` nếu chưa login.

### `POST /api/auth/forgot-password`
**Body:** `{ "email": "user@example.com" }`

### `POST /api/auth/reset-password`
**Body:** `{ "token": "reset-token", "password": "new-password" }`

---

## 5.3. Public Glamping APIs (`/api/glamping/*`)

### `GET /api/glamping/zones`
**Mô tả:** Lấy danh sách zones đang active.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": { "vi": "Khu A", "en": "Zone A" },
    "slug": "khu-a",
    "description": { "vi": "...", "en": "..." },
    "address": "...",
    "latitude": 10.123,
    "longitude": 106.456,
    "is_active": true,
    "images": [...]
  }
]
```

### `GET /api/glamping/zones/[id]`
**Mô tả:** Chi tiết một zone.

### `GET /api/glamping/items`
**Mô tả:** Lấy danh sách items (có thể filter theo zone).

**Query params:**
- `zoneId` — Filter theo zone
- `categoryId` — Filter theo category

### `GET /api/glamping/items/[id]`
**Mô tả:** Chi tiết item.

### `GET /api/glamping/items/[id]/details`
**Mô tả:** Chi tiết item + parameters + pricing + attributes + media.

**Response:**
```json
{
  "item": {
    "id": "uuid",
    "name": "Lều Bell",
    "sku": "BELL-001",
    "summary": "...",
    "zone_id": "uuid",
    "category_id": "uuid"
  },
  "attributes": {
    "inventory_quantity": 5,
    "unlimited_inventory": false,
    "allocation_type": "per_night"
  },
  "parameters": [
    {
      "id": "uuid",
      "name": "Người lớn",
      "min_quantity": 1,
      "max_quantity": 6,
      "sets_pricing": true,
      "controls_inventory": true
    }
  ],
  "pricing": {
    "base": {
      "param-uuid": [
        { "group_min": null, "group_max": null, "amount": 500000 },
        { "group_min": 3, "group_max": 6, "amount": 400000 }
      ]
    },
    "events": { ... }
  },
  "media": [
    { "url": "https://res.cloudinary.com/...", "type": "image" }
  ],
  "tags": [...]
}
```

### `GET /api/glamping/items/[id]/availability`
**Mô tả:** Check availability cho item trong khoảng ngày.

**Query params:**
- `checkIn` — YYYY-MM-DD
- `checkOut` — YYYY-MM-DD

**Response:**
```json
{
  "available": true,
  "conflictingBookings": []
}
```

### `GET /api/glamping/items/[id]/deposit-settings`
**Mô tả:** Lấy deposit settings cho item.

### `GET /api/glamping/items/availability`
**Mô tả:** Bulk availability check cho nhiều items.

### `GET /api/glamping/categories`
**Mô tả:** Lấy danh sách categories.

### `GET /api/glamping/search`
**Mô tả:** Tìm kiếm items.

**Query params:**
- `zoneId` — Zone filter
- `checkIn`, `checkOut` — Date range
- `guests` — Number of guests
- `categoryId` — Category filter

### `GET /api/glamping/availability/calendar`
**Mô tả:** Calendar data cho availability view.

**Query params:**
- `itemId` — Item ID
- `month` — YYYY-MM

### `POST /api/glamping/validate-voucher`
**Mô tả:** Validate discount/voucher code.

**Body:**
```json
{
  "code": "SUMMER20",
  "zoneId": "uuid",
  "itemId": "uuid",
  "checkIn": "2026-02-01",
  "checkOut": "2026-02-03",
  "totalAmount": 1500000
}
```

**Response:**
```json
{
  "valid": true,
  "discountAmount": 300000,
  "voucher": { "id": "uuid", "name": "Summer Sale", "type": "percentage", "amount": 20 }
}
```

### `POST /api/glamping/booking/calculate-pricing`
**Mô tả:** Tính giá cho single item booking.

**Body:**
```json
{
  "itemId": "uuid",
  "checkInDate": "2026-02-01",
  "checkOutDate": "2026-02-03",
  "parameterQuantities": {
    "param-uuid-adults": 2,
    "param-uuid-children": 1
  }
}
```

**Response:**
```json
{
  "parameterPricing": {
    "param-uuid-adults": 1000000,
    "param-uuid-children": 400000
  },
  "nightlyPricing": [
    {
      "date": "2026-02-01",
      "parameters": {
        "param-uuid-adults": 500000,
        "param-uuid-children": 200000
      }
    }
  ],
  "totalAccommodation": 1400000,
  "nights": 2
}
```

### `POST /api/glamping/booking/calculate-multi-pricing`
**Mô tả:** Tính giá cho multi-item booking.

### `POST /api/glamping/booking`
**Mô tả:** 🔑 **Tạo booking** (single hoặc multi-item).

**Body (single-item):**
```json
{
  "itemId": "uuid",
  "checkInDate": "2026-02-01",
  "checkOutDate": "2026-02-03",
  "adults": 2,
  "children": 1,
  "parameterQuantities": { "param-uuid": 2 },
  "menuProducts": [
    { "id": "menu-uuid", "quantity": 2, "price": 150000 }
  ],
  "guestEmail": "guest@example.com",
  "guestFirstName": "Nguyen",
  "guestLastName": "Van A",
  "guestPhone": "0901234567",
  "guestCountry": "Vietnam",
  "specialRequirements": "...",
  "discountCode": "SUMMER20",
  "paymentMethod": "pay_now"
}
```

**Body (multi-item):**
```json
{
  "items": [
    {
      "itemId": "uuid-1",
      "checkInDate": "2026-02-01",
      "checkOutDate": "2026-02-03",
      "adults": 2,
      "children": 0,
      "parameterQuantities": { "param-uuid": 2 },
      "menuProducts": []
    },
    {
      "itemId": "uuid-2",
      "checkInDate": "2026-02-01",
      "checkOutDate": "2026-02-03",
      "adults": 2,
      "children": 1,
      "parameterQuantities": { "param-uuid": 3 }
    }
  ],
  "menuProducts": [
    { "id": "menu-uuid", "quantity": 5, "price": 150000 }
  ],
  "guestEmail": "...",
  "guestFirstName": "...",
  "guestLastName": "...",
  "paymentMethod": "pay_now"
}
```

**Response:**
```json
{
  "success": true,
  "bookingId": "uuid",
  "bookingCode": "GH260001",
  "paymentRequired": true,
  "redirectUrl": "/glamping/booking/payment/uuid",
  "totalAmount": 1400000,
  "depositDue": 700000,
  "balanceDue": 700000
}
```

### Booking Detail APIs

#### `GET /api/glamping/bookings/[id]/details`
#### `GET /api/glamping/bookings/code/[code]/details`
**Mô tả:** Lấy chi tiết booking.

#### `GET /api/glamping/bookings/[id]/payment-status`
#### `GET /api/glamping/bookings/[id]/payment-info`
**Mô tả:** Lấy trạng thái & thông tin thanh toán (QR code info).

#### `GET /api/glamping/bookings/[id]/menu-products`
#### `GET /api/glamping/bookings/[id]/available-menu-items`
**Mô tả:** Menu products cho booking.

---

## 5.4. Admin APIs (`/api/admin/*`)

> Tất cả admin APIs yêu cầu staff session. Trả về `401` nếu chưa login.

### Zone Management

#### `GET /api/admin/glamping/zones`
**Query:** `?page=1&limit=20`

#### `POST /api/admin/glamping/zones`
**Body:** `{ name: { vi, en }, slug, address, ... }`

#### `GET/PUT/DELETE /api/admin/glamping/zones/[id]`

#### `PATCH /api/admin/glamping/zones/[id]/settings`
**Body:** Zone-specific settings.

#### `POST /api/admin/glamping/zones/[id]/images`
**Body:** FormData with images.

### Item Management

#### `GET /api/admin/glamping/items`
**Query:** `?zoneId=uuid&categoryId=uuid&page=1&limit=20`

#### `POST /api/admin/glamping/items`
**Body:** Full item creation with attributes, parameters, pricing, media.

#### `GET/PUT/DELETE /api/admin/glamping/items/[id]`

#### `GET/PUT /api/admin/glamping/items/[id]/events`
**Mô tả:** Events linked to item.

### Booking Management

#### `GET /api/admin/glamping/bookings`
**Query:** `?zoneId=uuid&status=confirmed&paymentStatus=pending&search=GH26&page=1&limit=20&dateFrom=&dateTo=`

#### `GET/PUT/DELETE /api/admin/glamping/bookings/[id]`

#### `PATCH /api/admin/glamping/bookings/[id]/stay`
**Mô tả:** Update check-in/check-out dates.

#### `POST /api/admin/glamping/bookings/[id]/add-payment`
**Body:** `{ amount, paymentMethod, transactionReference }`

#### `GET/POST /api/admin/glamping/bookings/[id]/payments`
#### `PUT/DELETE /api/admin/glamping/bookings/[id]/payments/[paymentId]`

#### `GET/POST /api/admin/glamping/bookings/[id]/products`
#### `PUT/DELETE /api/admin/glamping/bookings/[id]/products/[productId]`

#### `POST /api/admin/glamping/bookings/[id]/emails`
**Mô tả:** Send email to customer about this booking.

#### `GET /api/admin/glamping/bookings/[id]/history`
**Mô tả:** Status change history.

#### `GET /api/admin/glamping/bookings/[id]/pricing-details`
#### `POST /api/admin/glamping/bookings/[id]/toggle-tax-invoice`
#### `PATCH /api/admin/glamping/bookings/[id]/guest`

### Category/Tag/Parameter/Event/Discount Management
Tất cả follow CRUD pattern:

```
GET    /api/admin/glamping/{resource}           # List
POST   /api/admin/glamping/{resource}           # Create
GET    /api/admin/glamping/{resource}/[id]       # Get one
PUT    /api/admin/glamping/{resource}/[id]       # Update
DELETE /api/admin/glamping/{resource}/[id]       # Delete
```

Resources: `categories`, `tags`, `parameters`, `events`, `discounts`, `rules`, `menu`, `menu-categories`

Special endpoints:
- `POST /api/admin/glamping/parameters/reorder` — Reorder parameters
- `GET /api/admin/glamping/events/[id]/items` — Items in event

### Pricing

#### `GET /api/admin/glamping/pricing`
**Query:** `?itemId=uuid`

#### `POST /api/admin/glamping/pricing`
**Mô tả:** Batch update pricing for item.

### Dashboard

#### `GET /api/admin/glamping/dashboard`
**Query:** `?zoneId=uuid&period=7d`
**Response:** Stats, revenue, recent bookings, occupancy.

### Other Admin APIs

#### User Management
- `GET/POST /api/admin/users` — List/create staff users
- `GET/PUT/DELETE /api/admin/users/[id]`
- `POST /api/admin/users/impersonate` — Login as another user

#### Customer Management
- `GET/POST /api/admin/customers`
- `GET/PUT/DELETE /api/admin/customers/[id]`
- `GET /api/admin/customers/export` — Export to Excel

#### Bank Accounts
- `GET/POST /api/admin/bank-accounts`
- `GET/PUT/DELETE /api/admin/bank-accounts/[id]`
- `POST /api/admin/bank-accounts/[id]/set-default`

#### Email
- `GET/POST /api/admin/glamping/email-templates`
- `POST /api/admin/glamping/email-templates/preview`
- `GET /api/admin/glamping/email-logs`

#### Cron Jobs
- `GET /api/admin/cron-jobs`
- `POST /api/admin/cron-jobs/trigger`
- `POST /api/admin/cron-jobs/toggle`

---

## 5.5. Webhook APIs

### `POST /api/webhooks/sepay`
**Mô tả:** SePay bank transfer webhook. Tự động match thanh toán với booking.

**Headers:** Phải có webhook secret/key.

**Flow:**
1. SePay gửi notification khi nhận tiền vào bank account
2. System parse transaction content để match booking code (GH{YY}XXXXXX)
3. Nếu match → update payment status → send confirmation email

---

## 5.6. Notification APIs

### `GET /api/notifications`
**Query:** `?page=1&limit=20`

### `PATCH /api/notifications/[id]`
**Body:** `{ read: true }`

### `POST /api/notifications/mark-all-read`

### `GET /api/notifications/unread-count`
**Response:** `{ count: 5 }`

---

## 5.7. Cron Job APIs

### `POST /api/cron/trigger`
**Mô tả:** Manually trigger cron jobs.

### `GET /api/cron/health`
**Mô tả:** Cron system health check.

### `GET /api/cron/external/[jobSlug]`
**Mô tả:** External trigger for specific job (e.g., from Render cron).

### Cron Jobs:
1. **cancel-expired-bookings** — Hủy bookings quá hạn thanh toán
2. **email-automation** — Gửi email tự động (pre-arrival, post-checkout, etc.)
3. **menu-selection-reminder** — Nhắc khách chọn menu trước check-in

---

## 5.8. Other APIs

### `POST /api/upload`
**Mô tả:** Upload image lên Cloudinary.
**Body:** FormData with `file` field.
**Response:** `{ url: "https://res.cloudinary.com/..." }`

### `GET /api/settings/public`
**Mô tả:** Public settings (currency, default language, etc.)

### `GET /api/health`
**Mô tả:** App health check.
**Response:** `{ status: "ok", timestamp: "..." }`
