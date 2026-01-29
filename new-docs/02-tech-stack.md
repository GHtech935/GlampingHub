# 2. Tech Stack & Dependencies

## 2.1. Core Framework

| Technology | Version | Mục đích |
|-----------|---------|---------|
| **Next.js** | ^15.5.9 | Full-stack React framework (App Router) |
| **React** | ^18.3.1 | UI library |
| **TypeScript** | ^5 | Type safety |
| **Node.js** | (xem .nvmrc) | Runtime |

## 2.2. Database & Backend

| Library | Version | Mục đích |
|---------|---------|---------|
| **pg** | ^8.16.3 | PostgreSQL client (raw SQL, connection pool) |
| **jose** | ^6.1.0 | JWT token creation/verification (edge-compatible) |
| **bcryptjs** | ^3.0.3 | Password hashing |
| **jsonwebtoken** | ^9.0.2 | JWT (server-side, dùng cho một số legacy code) |
| **cookie** | ^1.0.2 | Cookie parsing |
| **uuid** | ^13.0.0 | UUID generation |
| **zod** | ^3.25.76 | Schema validation |

## 2.3. UI Components

| Library | Version | Mục đích |
|---------|---------|---------|
| **Radix UI** | Various | Headless UI primitives (dialog, dropdown, tabs, etc.) |
| **Tailwind CSS** | ^3.4.0 | Utility-first CSS |
| **tailwind-merge** | ^2.6.0 | Merge Tailwind classes |
| **class-variance-authority** | ^0.7.1 | Component variants (shadcn/ui pattern) |
| **lucide-react** | ^0.292.0 | Icon library |
| **recharts** | ^3.5.1 | Dashboard charts |
| **sweetalert2** | ^11.26.3 | Alert dialogs |
| **sonner** | ^2.0.7 | Toast notifications |
| **react-hot-toast** | ^2.4.0 | Toast notifications (admin panel) |
| **yet-another-react-lightbox** | ^3.26.0 | Image lightbox |

> **Note:** UI components dùng pattern **shadcn/ui** — component code nằm trong `components/ui/`. File `components.json` chứa config shadcn.

## 2.4. Forms & Validation

| Library | Version | Mục đích |
|---------|---------|---------|
| **react-hook-form** | ^7.70.0 | Form management |
| **@hookform/resolvers** | ^3.10.0 | Zod resolver cho react-hook-form |
| **zod** | ^3.25.76 | Schema validation |

## 2.5. State Management

| Library | Version | Mục đích |
|---------|---------|---------|
| **zustand** | ^4.4.0 | Global state (cart, auth state) |
| **@tanstack/react-query** | ^5.0.0 | Server state management, data fetching |

## 2.6. Internationalization (i18n)

| Library | Version | Mục đích |
|---------|---------|---------|
| **next-intl** | ^4.4.0 | i18n cho Next.js (messages, useTranslations) |

Các file messages:
- `messages/vi.json` — Tiếng Việt
- `messages/en.json` — English
- Config: `i18n/request.ts`

## 2.7. Maps & Location

| Library | Version | Mục đích |
|---------|---------|---------|
| **@react-google-maps/api** | ^2.20.7 | Google Maps (admin zone map) |
| **leaflet** | ^1.9.4 | Leaflet maps (customer search) |
| **react-leaflet** | ^4.2.1 | React wrapper cho Leaflet |

## 2.8. Rich Text & Calendar

| Library | Version | Mục đích |
|---------|---------|---------|
| **quill** / **react-quill-new** | ^2.0.3 / ^3.6.0 | Rich text editor (descriptions, policies) |
| **react-day-picker** | ^9.11.1 | Date picker / calendar component |
| **date-fns** | ^2.30.0 | Date utilities |

## 2.9. Drag & Drop

| Library | Version | Mục đích |
|---------|---------|---------|
| **@dnd-kit/core** | ^6.3.1 | Drag and drop (reorder items) |
| **@dnd-kit/sortable** | ^10.0.0 | Sortable lists |
| **@dnd-kit/utilities** | ^3.2.2 | DnD utilities |

## 2.10. External Services

| Service | Library | Mục đích |
|---------|---------|---------|
| **Brevo** (Sendinblue) | @getbrevo/brevo ^3.0.1 | Email sending (transactional) |
| **Cloudinary** | cloudinary ^2.8.0 + next-cloudinary ^6.17.4 | Image upload & hosting |
| **Supabase** | @supabase/supabase-js ^2.38.0 | Database hosting (chủ yếu dùng pg trực tiếp) |
| **SePay** | Custom webhook handler | VietQR bank transfer payment |
| **Stripe** | stripe ^14.7.0 | Payment (có import nhưng có thể chưa dùng active) |

## 2.11. Export & PDF

| Library | Version | Mục đích |
|---------|---------|---------|
| **exceljs** | ^4.4.0 | Export Excel (customer data, bookings) |

## 2.12. Cron Jobs

| Library | Version | Mục đích |
|---------|---------|---------|
| **node-cron** | ^4.2.1 | In-process cron scheduler |

## 2.13. Dev Dependencies

| Library | Mục đích |
|---------|---------|
| **eslint + eslint-config-next** | Linting |
| **tailwindcss + autoprefixer + postcss** | CSS toolchain |
| **tsx** | TypeScript execution (scripts) |
| **@tailwindcss/forms** | Form styling plugin |
| **@tailwindcss/typography** | Prose styling plugin |

## 2.14. Environment Variables

Xem file `.env.example` cho danh sách đầy đủ:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# JWT & Session
JWT_SECRET=your-super-secret-jwt-key
SESSION_COOKIE_NAME=glampinghub_session

# Email (Brevo)
BREVO_API_KEY=...
FROM_EMAIL=noreply@glampinghub.com

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Social OAuth
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...

# App
NEXT_PUBLIC_BASE_URL=https://glampinghub.your-domain.com
NODE_ENV=production

# SePay (Payment)
SEPAY_PAYMENT_TIMEOUT_MINUTES=30
```

> ⚠️ **QUAN TRỌNG:** `JWT_SECRET` phải giống với CampingHub-App nếu muốn shared staff login.
