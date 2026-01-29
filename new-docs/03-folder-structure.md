# 3. Cấu trúc thư mục

## 3.1. Top-level Structure

```
GlampingHub-App/
├── app/                    # Next.js App Router (pages + API routes)
│   ├── (auth)/             # Auth pages (route group, no layout segment)
│   ├── admin/              # Admin panel pages
│   ├── api/                # API route handlers
│   ├── glamping/           # Customer-facing glamping pages
│   ├── login-admin/        # Admin login page
│   ├── layout.tsx          # Root layout (client component)
│   ├── page.tsx            # Home page
│   └── globals.css         # Global CSS + Tailwind
│
├── components/             # Shared React components
│   ├── admin/              # Admin-specific components
│   ├── auth/               # Auth components (LoginForm, LoginModal)
│   ├── booking/            # Booking UI components (camping legacy)
│   ├── glamping-booking/   # Glamping booking components
│   ├── home/               # Homepage components
│   ├── layout/             # Layout components (Header, Footer, Container)
│   ├── notifications/      # Notification system components
│   ├── pitch/              # Pitch image gallery (camping legacy)
│   ├── providers/          # Context providers
│   ├── search/             # Search page components
│   └── ui/                 # shadcn/ui primitive components
│
├── hooks/                  # Custom React hooks
├── lib/                    # Server-side utilities & business logic
├── types/                  # TypeScript type definitions
├── messages/               # i18n translation files
├── i18n/                   # i18n configuration
├── migrations/             # Recent DB migrations (standalone SQL)
├── supabase/migrations/    # Historical DB migrations
├── public/                 # Static assets (images, favicon)
├── docs/                   # Existing documentation files
└── new-docs/               # 📂 THIS documentation folder
```

## 3.2. `app/` — Pages & API Routes

### Customer Pages
```
app/
├── page.tsx                          # Homepage
├── layout.tsx                        # Root layout (Header + Footer for non-admin)
├── glamping/
│   ├── search/                       # Search page (v1)
│   │   ├── page.tsx
│   │   └── _components/
│   │       ├── AvailabilityCalendar.tsx
│   │       └── ItemDetailModal.tsx
│   ├── search_2/                     # Search page (v2, newer)
│   │   ├── page.tsx
│   │   └── _components/
│   │       ├── CategoryTabs.tsx
│   │       ├── AvailabilityCalendar.tsx
│   │       ├── SearchSidebar.tsx
│   │       ├── SearchHeader.tsx
│   │       ├── ItemDetailModal.tsx
│   │       ├── ItemCard.tsx
│   │       └── ItemsGrid.tsx
│   ├── zones/[zoneId]/              # Zone listing page
│   │   ├── page.tsx
│   │   ├── _components/
│   │   │   ├── ItemCardVertical.tsx
│   │   │   └── ItemsGrid.tsx
│   │   └── items/[id]/             # Item detail page
│   │       ├── page.tsx
│   │       └── _components/
│   │           ├── ItemDetailContent.tsx
│   │           ├── ItemAvailabilityCalendar.tsx
│   │           ├── ItemBookingSection.tsx
│   │           ├── ItemInformationGrid.tsx
│   │           └── ItemBookingSummaryPanel.tsx
│   └── booking/
│       ├── form/page.tsx             # Booking form (guest details)
│       ├── payment/[id]/page.tsx     # Payment page (QR code)
│       └── confirmation/[code]/page.tsx  # Booking confirmation
```

### Auth Pages
```
app/(auth)/
├── layout.tsx                        # Auth layout (centered card)
├── login/page.tsx                    # Customer login
├── register/page.tsx                 # Customer registration
├── forgot-password/page.tsx          # Forgot password
└── reset-password/[token]/page.tsx   # Reset password
```

### Admin Pages
```
app/admin/
├── layout.tsx                        # Admin layout (sidebar + header)
├── page.tsx                          # Admin root redirect
├── zones/
│   ├── manage/                       # Zone management (CRUD zones)
│   │   ├── page.tsx                  # List all zones
│   │   └── [id]/
│   │       ├── page.tsx              # Zone detail
│   │       ├── edit/page.tsx         # Edit zone
│   │       └── _components/ZoneMap.tsx
│   ├── new/page.tsx                  # Create new zone
│   ├── all/                          # All zones aggregated view
│   │   ├── items/page.tsx
│   │   ├── categories/page.tsx
│   │   ├── tags/page.tsx
│   │   ├── events/page.tsx
│   │   └── parameters/page.tsx
│   └── [zoneId]/                     # Zone-specific management
│       ├── dashboard/page.tsx        # Zone dashboard
│       ├── items/                    # Manage items
│       │   ├── page.tsx
│       │   ├── new/page.tsx
│       │   ├── [id]/edit/page.tsx
│       │   └── _components/
│       │       ├── ItemFormWizard.tsx
│       │       └── PricingTable.tsx
│       ├── bookings/page.tsx         # Manage bookings
│       ├── categories/page.tsx       # Manage categories
│       ├── tags/page.tsx
│       ├── parameters/page.tsx
│       ├── events/page.tsx
│       ├── discounts/page.tsx
│       ├── rules/page.tsx
│       ├── menu/page.tsx             # Menu management
│       ├── customers/page.tsx
│       ├── users/page.tsx
│       └── settings/page.tsx         # Zone settings
├── settings/
│   ├── page.tsx                      # General settings
│   └── bank-accounts/page.tsx        # Bank account management
├── emails/page.tsx                   # Email templates
├── customers/page.tsx                # All customers
├── users/page.tsx                    # Staff user management
├── glamping/
│   └── cron-jobs/page.tsx           # Cron job management
│   (Legacy paths below — also accessible via /admin/zones/[zoneId]/)
├── items/                            # Global items management
├── categories/
├── tags/
├── parameters/
├── events/
└── discounts/
```

### API Routes
```
app/api/
├── auth/                             # Authentication
│   ├── admin/login/route.ts          # Admin login
│   ├── customer/
│   │   ├── login/route.ts            # Customer login
│   │   ├── register/route.ts         # Customer registration
│   │   └── oauth/[provider]/         # OAuth (Google, Facebook)
│   │       ├── start/route.ts
│   │       └── callback/route.ts
│   ├── login/route.ts                # Legacy login
│   ├── register/route.ts             # Legacy register
│   ├── logout/route.ts
│   ├── me/route.ts                   # Current user session
│   ├── forgot-password/route.ts
│   └── reset-password/route.ts
│
├── glamping/                         # Public glamping APIs
│   ├── zones/route.ts                # GET zones list
│   ├── zones/[id]/route.ts           # GET zone detail
│   ├── items/route.ts                # GET items list
│   ├── items/[id]/route.ts           # GET item detail
│   ├── items/[id]/details/route.ts
│   ├── items/[id]/availability/route.ts
│   ├── items/[id]/deposit-settings/route.ts
│   ├── items/availability/route.ts   # Bulk availability check
│   ├── categories/route.ts           # GET categories
│   ├── search/route.ts               # Search items
│   ├── availability/calendar/route.ts # Calendar data
│   ├── validate-voucher/route.ts     # Validate discount code
│   ├── booking/route.ts              # POST create booking
│   ├── booking/calculate-pricing/route.ts
│   ├── booking/calculate-multi-pricing/route.ts
│   └── bookings/                     # Booking details (by ID or code)
│       ├── [id]/details/route.ts
│       ├── [id]/payment-status/route.ts
│       ├── [id]/payment-info/route.ts
│       ├── [id]/menu-products/route.ts
│       ├── [id]/available-menu-items/route.ts
│       └── code/[code]/              # Same endpoints, by booking code
│
├── admin/                            # Protected admin APIs
│   ├── glamping/                     # Glamping management
│   │   ├── zones/route.ts            # CRUD zones
│   │   ├── items/route.ts            # CRUD items
│   │   ├── categories/route.ts       # CRUD categories
│   │   ├── tags/route.ts             # CRUD tags
│   │   ├── parameters/route.ts       # CRUD parameters
│   │   ├── events/route.ts           # CRUD events
│   │   ├── discounts/route.ts        # CRUD discounts
│   │   ├── rules/route.ts            # CRUD rules
│   │   ├── pricing/route.ts          # Pricing management
│   │   ├── menu/route.ts             # Menu items
│   │   ├── menu-categories/route.ts  # Menu categories
│   │   ├── bookings/route.ts         # Booking management
│   │   ├── bookings/[id]/            # Single booking operations
│   │   ├── dashboard/route.ts        # Dashboard data
│   │   ├── email-templates/route.ts
│   │   ├── email-logs/route.ts
│   │   ├── automation-rules/route.ts
│   │   └── customers/[customerId]/bookings/route.ts
│   ├── users/route.ts                # Staff CRUD
│   ├── customers/route.ts            # Customer CRUD
│   ├── bank-accounts/route.ts        # Bank accounts
│   ├── email-templates/route.ts      # Email template management
│   ├── email-logs/route.ts
│   └── cron-jobs/route.ts            # Cron job management
│
├── cron/                             # Cron job system
│   ├── init/route.ts
│   ├── trigger/route.ts
│   ├── health/route.ts
│   ├── scheduler.ts
│   ├── auto-init.ts
│   ├── types.ts
│   ├── utils.ts
│   ├── external/[jobSlug]/route.ts
│   └── jobs/
│       ├── index.ts
│       ├── cancel-expired-bookings.ts
│       ├── email-automation.ts
│       └── menu-selection-reminder.ts
│
├── webhooks/sepay/route.ts           # SePay payment webhook
├── notifications/                    # Notification APIs
│   ├── route.ts
│   ├── [id]/route.ts
│   ├── mark-all-read/route.ts
│   └── unread-count/route.ts
├── upload/route.ts                   # Image upload (Cloudinary)
├── settings/public/route.ts          # Public settings
└── health/route.ts                   # Health check
```

## 3.3. `components/` — React Components

```
components/
├── admin/                            # Admin-specific components
│   ├── glamping/                     # Glamping management modals
│   │   ├── CategoryFormModal.tsx
│   │   ├── DiscountFormModal.tsx
│   │   ├── EventFormModal.tsx
│   │   ├── GlampingBookingDetailModal.tsx
│   │   ├── GlampingBookingEmailsSection.tsx
│   │   ├── GlampingBookingFinancialTab.tsx
│   │   ├── GlampingBookingPaymentsTab.tsx
│   │   ├── GlampingBookingProductsTab.tsx
│   │   ├── GlampingForceEditStatusDialog.tsx
│   │   ├── MenuCategoryModal.tsx
│   │   ├── MenuFormModal.tsx
│   │   ├── ParameterFormModal.tsx
│   │   ├── TagFormModal.tsx
│   │   ├── ZoneFormModal.tsx
│   │   ├── ZoneSelector.tsx          # Zone switcher in header
│   │   ├── shared/                   # Shared glamping UI components
│   │   │   ├── ItemBadge.tsx
│   │   │   ├── ItemCard.tsx
│   │   │   ├── ItemColorProvider.tsx
│   │   │   └── index.ts
│   │   ├── tabs/                     # Booking detail tabs
│   │   │   ├── BookingOverviewCard.tsx
│   │   │   ├── BookingStayItemsSection.tsx
│   │   │   ├── GuestDistributionCard.tsx
│   │   │   ├── ItemFinancialBreakdown.tsx
│   │   │   ├── PaymentAllocationInfo.tsx
│   │   │   └── index.ts
│   │   └── types.ts
│   ├── events/                       # Event form components
│   ├── about/                        # About page admin
│   ├── campsite-setup/               # Campsite setup (legacy)
│   ├── campsite/                     # Campsite components (legacy)
│   ├── items/                        # Item admin components
│   ├── pitch-setup/                  # Pitch setup (legacy)
│   ├── pitch/                        # Pitch components (legacy)
│   ├── BookingsTable.tsx             # Main bookings table
│   ├── BookingDetailModal.tsx        # Booking detail modal
│   ├── CustomerDetailModal.tsx       # Customer detail
│   ├── ImageUpload.tsx               # Image upload component
│   ├── LocationPicker.tsx            # Google Maps location picker
│   └── ...                           # Many more admin components
│
├── glamping-booking/                 # Glamping booking flow components
│   ├── CartItemInlineEditForm.tsx
│   ├── CartItemsList.tsx
│   ├── GlampingBookingSummaryHeader.tsx
│   ├── GlampingCancellationPolicySection.tsx
│   ├── GlampingCartPopover.tsx       # Cart popover in header
│   ├── GlampingMenuProductsSelector.tsx  # Menu selection UI
│   ├── GlampingMyDetailsSection.tsx
│   ├── GlampingOtherDetailsSection.tsx
│   ├── GlampingPaymentSection.tsx
│   └── GlampingPricingSummary.tsx
│
├── providers/                        # React context providers
│   ├── Providers.tsx                 # Main provider wrapper (React Query, etc.)
│   ├── ClientI18nProvider.tsx        # Client-side i18n provider
│   ├── AdminI18nProvider.tsx         # Admin-specific i18n
│   ├── GlampingCartProvider.tsx      # Cart state (Zustand)
│   ├── GoogleMapsProvider.tsx        # Google Maps script loader
│   └── ToastProvider.tsx
│
├── layout/                           # Layout components
│   ├── Header.tsx                    # Customer header
│   ├── Footer.tsx                    # Customer footer
│   ├── Container.tsx
│   ├── LanguageSwitcher.tsx
│   └── index.ts
│
├── notifications/                    # Notification components
│   ├── NotificationBell.tsx
│   ├── NotificationItem.tsx
│   ├── NotificationList.tsx
│   ├── NotificationPanel.tsx
│   └── index.ts
│
└── ui/                               # shadcn/ui primitives
    ├── button.tsx, card.tsx, dialog.tsx, ...
    ├── calendar.tsx, date-picker.tsx, date-range-picker.tsx
    ├── rich-text-editor.tsx
    ├── image-lightbox.tsx
    └── index.ts
```

## 3.4. `lib/` — Business Logic & Utilities

```
lib/
├── db.ts                    # PostgreSQL connection pool + query helpers
├── auth.ts                  # Server-side auth (hash, verify, session, roles)
├── auth-edge.ts             # Edge-compatible auth (JWT create/verify with jose)
├── booking-status.ts        # Booking & payment status types + labels
├── glamping-pricing.ts      # 🔑 Core pricing engine (event, group, yield)
├── glamping-event-pricing.ts # Event pricing calculator (dynamic, yield)
├── glamping-utils.ts        # Glamping utility functions
├── email.ts                 # Email sending (Brevo API)
├── email-templates-html.ts  # Camping email HTML templates
├── glamping-email-templates-html.ts  # Glamping email HTML templates
├── glamping-menu-email-templates.ts  # Menu reminder email templates
├── notifications.ts         # In-app notification system
├── notification-templates.ts # Notification message templates
├── vietqr.ts                # VietQR URL generation
├── bank-accounts.ts         # Bank account helpers
├── booking-history.ts       # Booking status history tracking
├── booking-recalculate.ts   # Recalculate booking totals
├── commission.ts            # Commission calculation (camping legacy)
├── commission-payouts.ts    # Payout system (camping legacy)
├── export-utils.ts          # Excel export utilities
├── i18n-utils.ts            # i18n helper functions
├── icon-renderer.tsx        # Dynamic icon rendering
├── invoice-generator.ts     # Invoice PDF generation
├── password-reset.ts        # Password reset token management
├── webhook-alert.ts         # Webhook alert utilities
├── webhook-logger.ts        # Webhook logging
├── about-colors.ts          # About page color utilities
├── utils.ts                 # General utilities (cn function, etc.)
└── supabase/
    ├── client.ts            # Supabase client (browser)
    └── server.ts            # Supabase server client
```

## 3.5. `hooks/` — Custom React Hooks

```
hooks/
├── useAuth.ts               # Authentication hook (current user)
├── useCartItemFormState.ts  # Cart item form state management
├── useCartItemPricing.ts    # Cart item pricing calculation
├── useCartItemSave.ts       # Save cart item to store
├── useGeolocation.ts        # Browser geolocation
├── useGlampingParameters.ts # Fetch glamping parameters for items
├── useMenuProductsData.ts   # Fetch menu products for booking
├── useNotifications.ts      # Notification polling hook
├── useWishlist.ts           # Customer wishlist
└── use-toast.ts             # Toast notification hook
```

## 3.6. `types/` — TypeScript Definitions

```
types/
├── database.ts              # Database types (Supabase-style Row/Insert/Update)
├── index.ts                 # 🔑 Core domain types (Campsite, Booking, User, etc.)
└── about-content.ts         # About page content types
```

## 3.7. Other Important Files

```
middleware.ts                # Next.js middleware (auth, subdomain routing)
next.config.js              # Next.js configuration (i18n, images)
tailwind.config.ts          # Tailwind CSS configuration
tsconfig.json               # TypeScript configuration
render.yaml                 # Render.com deployment config
vercel.json                 # Vercel deployment config
components.json             # shadcn/ui configuration
.env.example                # Environment variables template
.env.local                  # Local environment variables (gitignored)
```
