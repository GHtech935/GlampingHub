# 1. Tổng quan dự án & Kiến trúc hệ thống

## 1.1. Dự án là gì?

**GlampingHub-App** là một ứng dụng web quản lý đặt chỗ glamping (glamorous camping) tại Việt Nam. Hệ thống hỗ trợ:

- **Khách hàng (Customer):** Tìm kiếm, xem chi tiết, đặt chỗ glamping items (lều, phòng, cabin...), chọn menu ẩm thực, thanh toán online qua chuyển khoản ngân hàng (VietQR/SePay).
- **Admin/Staff:** Quản lý inventory (items, categories, tags, parameters, events, pricing), quản lý booking, khách hàng, discounts, email templates, menu ẩm thực, cron jobs, bank accounts, zone settings.
- **Zone Owners (glamping_owner):** Quản lý zone cụ thể được gán (multi-zone support).

## 1.2. Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js 15)                   │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Customer UI  │  │  Admin Panel │  │  Auth Pages      │  │
│  │ /glamping/*  │  │  /admin/*    │  │  /login, etc     │  │
│  │ Booking Flow │  │  Zone-based  │  │  Staff+Customer  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                      API Layer (Route Handlers)             │
│                                                             │
│  /api/glamping/*    → Public APIs (search, booking, items)  │
│  /api/admin/*       → Admin APIs (CRUD, management)         │
│  /api/auth/*        → Auth (login, register, OAuth, etc)    │
│  /api/cron/*        → Cron jobs (email automation, etc)     │
│  /api/webhooks/*    → External webhooks (SePay payment)     │
│  /api/notifications → In-app notification system            │
│  /api/upload        → Cloudinary image upload               │
├─────────────────────────────────────────────────────────────┤
│                      Business Logic Layer                   │
│                                                             │
│  lib/glamping-pricing.ts    → Tính giá (event, yield, group)│
│  lib/auth.ts + auth-edge.ts → Authentication (JWT/cookies)  │
│  lib/email.ts               → Email sending (Brevo)         │
│  lib/notifications.ts       → In-app notifications          │
│  lib/vietqr.ts              → VietQR payment integration    │
│  lib/booking-status.ts      → Booking status machine        │
├─────────────────────────────────────────────────────────────┤
│                      Data Layer                             │
│                                                             │
│  lib/db.ts  →  PostgreSQL (pg Pool)                         │
│  Direct SQL queries (no ORM)                                │
│  Supabase Postgres (hosted or self-hosted)                  │
└─────────────────────────────────────────────────────────────┘
```

## 1.3. Các hệ thống con chính

### 🏕️ Glamping Inventory System
- **Zones:** Vùng glamping (multi-zone, mỗi zone có settings riêng)
- **Items:** Đơn vị cho thuê (lều, cabin, phòng...)
- **Categories:** Phân loại items
- **Tags:** Nhãn cho items (visible to staff or everyone)
- **Parameters:** Tham số booking (adults, children, pets...) — mỗi parameter có thể set pricing riêng
- **Events:** Sự kiện ảnh hưởng giá (seasonal, special, closure) với pricing types: base_price, new_price, dynamic, yield
- **Pricing:** Bảng giá cho từng item + parameter + event combination, hỗ trợ group pricing
- **Rules:** Bộ quy tắc booking (min stay, max advance booking, etc.)

### 📋 Booking System
- Single-item và Multi-item booking
- Booking code format: `GH{YY}{000001}` (VD: GH260001)
- Status machine: `pending → confirmed → in_progress → completed/cancelled`
- Payment status: `pending → partial → paid → refunded/failed`
- Deposit system (percentage hoặc fixed)
- Menu products selection (combo meals)
- Discount/voucher system

### 💰 Payment System
- VietQR bank transfer (SePay webhook integration)
- Payment timeout (configurable, default 30 phút)
- Deposit + balance due tracking
- Auto-cancel expired bookings (cron job)

### 📧 Email System
- Brevo (formerly Sendinblue) API
- Email templates (confirmation, notification, reminder)
- Email automation via cron jobs
- Glamping-specific email templates

### 🔔 Notification System
- In-app notifications (real-time polling)
- Role-based broadcast (admin, sale, operations, glamping_owner)
- Customer notifications
- Notification templates

### 🌐 Internationalization (i18n)
- Vietnamese (vi) + English (en)
- next-intl library
- Multilingual content: `{ vi: "...", en: "..." }` JSONB fields in DB
- Admin panel language switcher
- Customer-facing language switcher

## 1.4. Môi trường Shared

GlampingHub-App chia sẻ database & auth system với **CampingHub-App** (camping booking):
- Cùng PostgreSQL database (Supabase)
- Cùng JWT_SECRET → staff có thể login vào cả 2 hệ thống
- Bảng `users`, `customers`, `login_history` được share
- Glamping tables có prefix `glamping_` để tách biệt

## 1.5. Key Design Decisions

| Quyết định | Lý do |
|-----------|-------|
| **Raw SQL (no ORM)** | Kiểm soát tối đa, performance, complex queries dễ viết |
| **Next.js App Router** | Full-stack framework, API routes + SSR + CSR trong 1 project |
| **PostgreSQL (Supabase)** | Managed database, easy setup, share với CampingHub |
| **JWT in HTTP-only cookies** | Secure, no localStorage tokens, edge-compatible |
| **Zone-based admin** | Multi-zone support, mỗi owner quản lý zone riêng |
| **Parameter-based pricing** | Linh hoạt: pricing per parameter (adults, children, etc.) per night |
| **Event-based pricing** | Seasonal, special, closure events với dynamic/yield pricing |
| **Cloudinary** | Image hosting, automatic optimization |
| **Brevo** | Transactional emails, reliable delivery |
| **SePay** | VietQR bank transfer webhooks cho thị trường Việt Nam |
