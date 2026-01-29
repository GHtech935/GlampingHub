# 4. Database Schema

## 4.1. Tổng quan

Database dùng **PostgreSQL** (hosted trên Supabase). Tất cả glamping tables có prefix `glamping_` để tách biệt với camping tables.

Schema được chia thành các nhóm:
1. **Shared tables** (dùng chung với CampingHub)
2. **Glamping Inventory** (items, categories, tags, parameters)
3. **Glamping Pricing** (pricing, events, deposits, taxes)
4. **Glamping Booking** (bookings, payments, status history)
5. **Glamping Zone** (zones, settings, menu)
6. **Support tables** (notifications, cron jobs, email logs)

## 4.2. Entity Relationship Diagram

```
┌──────────────────┐     ┌───────────────────┐     ┌──────────────────┐
│  glamping_zones   │     │  glamping_items    │     │ glamping_categories│
│                   │1───N│                   │N───1│                    │
│ id (PK)           │     │ id (PK)           │     │ id (PK)            │
│ name (JSONB)      │     │ zone_id (FK)      │     │ name               │
│ slug              │     │ category_id (FK)  │     │ weight             │
│ bank_account_id   │     │ name              │     │ status             │
│ deposit_type      │     │ sku               │     └──────────────────  │
│ deposit_value     │     │ summary           │
│ settings (JSONB)  │     └──────┬────────────┘
└──────────────────┘             │
                                 │ 1
                    ┌────────────┼────────────┐
                    │            │            │
                    ▼ N          ▼ N          ▼ 1
         ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
         │ item_tags    │ │ item_params  │ │ item_attributes  │
         │              │ │              │ │                  │
         │ item_id (FK) │ │ item_id (FK) │ │ item_id (FK,UQ) │
         │ tag_id (FK)  │ │ parameter_id │ │ inventory_qty    │
         └──────────────┘ │ min/max_qty  │ │ unlimited_inv    │
                          │ display_order│ │ allocation_type  │
                          └──────────────┘ │ visibility       │
                                           └──────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  PRICING SYSTEM                                                   │
│                                                                   │
│  glamping_pricing                                                 │
│  ├── item_id (FK) ──── links to item                             │
│  ├── parameter_id (FK) ── links to parameter                     │
│  ├── event_id (FK) ──── NULL = base price, set = event price     │
│  ├── group_min/max ──── group pricing brackets                   │
│  ├── amount ──────────── price amount                            │
│  └── rate_type ──────── per_night, per_day, per_hour             │
│                                                                   │
│  glamping_item_events                                             │
│  ├── type: seasonal | special | closure                          │
│  ├── pricing_type: base_price | new_price | dynamic | yield      │
│  ├── dynamic_pricing_value ── percentage modifier                │
│  ├── yield_thresholds ──── JSON array of stock thresholds        │
│  └── days_of_week ──── integer array (0=Sun, 6=Sat)             │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  BOOKING SYSTEM                                                   │
│                                                                   │
│  glamping_bookings                                                │
│  ├── booking_code (GH260001)                                     │
│  ├── customer_id (FK → customers)                                │
│  ├── status: pending|confirmed|in_progress|completed|cancelled   │
│  ├── payment_status: pending|partial|paid|refunded|failed        │
│  ├── check_in_date / check_out_date                              │
│  ├── guests (JSONB: {adults, children})                          │
│  ├── subtotal_amount + tax_amount - discount_amount              │
│  ├── total_amount (GENERATED ALWAYS)                             │
│  ├── deposit_due / balance_due                                   │
│  └── payment_expires_at                                          │
│      │                                                            │
│      ├── glamping_booking_items                                   │
│      │   ├── item_id, parameter_id, quantity, unit_price         │
│      │   └── metadata (JSONB: per-item dates, guests)            │
│      ├── glamping_booking_parameters (snapshot)                   │
│      ├── glamping_booking_payments                                │
│      ├── glamping_booking_menu_products                           │
│      ├── glamping_booking_taxes (snapshot)                        │
│      └── glamping_booking_status_history                          │
└──────────────────────────────────────────────────────────────────┘
```

## 4.3. Chi tiết từng bảng

### Shared Tables (dùng chung)

#### `users` — Staff/Admin accounts
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | |
| email | VARCHAR | Unique |
| password_hash | VARCHAR | bcrypt |
| first_name, last_name | VARCHAR | |
| role | VARCHAR | `admin`, `sale`, `operations`, `owner`, `glamping_owner` |
| campsite_id | UUID (FK) | Legacy camping assignment |
| glamping_zone_id | UUID (FK) | Glamping zone assignment |
| phone, notes | VARCHAR | |
| is_active | BOOLEAN | |
| last_login_at | TIMESTAMP | |

#### `customers` — Customer accounts
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | |
| email | VARCHAR | Unique |
| password_hash | VARCHAR | NULL = guest (no password) |
| first_name, last_name | VARCHAR | |
| phone, country | VARCHAR | |
| address_line1, city, postal_code | VARCHAR | |
| is_registered | BOOLEAN | true = has account |
| email_verified | BOOLEAN | |
| marketing_consent | BOOLEAN | |

#### `user_glamping_zones` — Junction table: staff ↔ zones
| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID (FK → users) | |
| zone_id | UUID (FK → glamping_zones) | |
| role | VARCHAR | `glamping_owner` |
| UNIQUE(user_id, zone_id, role) | | |

### Glamping Zone

#### `glamping_zones` — Zone (vùng glamping)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | |
| name | JSONB | `{ vi: "...", en: "..." }` |
| slug | VARCHAR | URL-friendly |
| description | JSONB | Multilingual |
| address, city, province | VARCHAR | |
| latitude, longitude | NUMERIC | |
| phone, email, website | VARCHAR | |
| check_in_time, check_out_time | TIME | |
| min_stay_nights | INTEGER | |
| cancellation_policy, house_rules | JSONB | Multilingual |
| deposit_type | VARCHAR | `percentage`, `fixed_amount` |
| deposit_value | NUMERIC | |
| bank_account_id | UUID (FK) | |
| is_active | BOOLEAN | |
| settings | JSONB | Zone-specific settings |

### Glamping Inventory

#### `glamping_items` — Đơn vị cho thuê
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | |
| zone_id | UUID (FK) | |
| category_id | UUID (FK) | |
| name | VARCHAR | |
| sku | VARCHAR (UNIQUE) | |
| summary | TEXT | |

#### `glamping_categories`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | |
| zone_id | UUID (FK) | |
| name | VARCHAR | |
| weight | INTEGER | Sort order |
| status | VARCHAR | `active`, `hidden` |

#### `glamping_tags`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | |
| zone_id | UUID (FK) | |
| name | VARCHAR | |
| weight | INTEGER | |
| visibility | VARCHAR | `staff`, `everyone` |

#### `glamping_item_attributes` — Item thuộc tính
| Column | Type | Description |
|--------|------|-------------|
| item_id | UUID (FK, UNIQUE) | 1:1 with item |
| inventory_quantity | INTEGER | |
| unlimited_inventory | BOOLEAN | |
| allocation_type | VARCHAR | `per_day`, `per_night`, `per_hour`, `timeslots` |
| visibility | VARCHAR | `everyone`, `staff_only`, `packages_only` |
| default_calendar_status | VARCHAR | `available`, `unavailable`, `disabled` |

#### `glamping_parameters` — Tham số booking
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | |
| name | VARCHAR | VD: "Người lớn", "Trẻ em", "Thú cưng" |
| color_code | VARCHAR(7) | Hex color |
| controls_inventory | BOOLEAN | Tham số này chiếm inventory? |
| sets_pricing | BOOLEAN | Tham số này ảnh hưởng giá? |
| price_range | BOOLEAN | |
| visibility | VARCHAR | `everyone`, `staff` |
| counted_for_menu | BOOLEAN | Tính vào combo menu? |
| display_order | INTEGER | |

#### `glamping_item_parameters` — Item ↔ Parameter junction
| Column | Type | Description |
|--------|------|-------------|
| item_id | UUID (FK) | |
| parameter_id | UUID (FK) | |
| min_quantity, max_quantity | INTEGER | |
| display_order | INTEGER | |

### Pricing System

#### `glamping_pricing` — Bảng giá
| Column | Type | Description |
|--------|------|-------------|
| item_id | UUID (FK) | |
| parameter_id | UUID (FK) | |
| event_id | UUID (FK) | NULL = base price |
| group_min, group_max | INTEGER | NULL = no group restriction |
| amount | DECIMAL(12,2) | |
| rate_type | VARCHAR | `per_night`, `per_day`, `per_hour` |

#### `glamping_item_events` — Sự kiện giá
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | |
| name | VARCHAR | |
| type | VARCHAR | `seasonal`, `special`, `closure` |
| start_date, end_date | DATE | |
| recurrence | VARCHAR | `one_time`, `weekly`, `monthly`, `yearly` |
| days_of_week | INTEGER[] | Array: 0=Sun, 6=Sat |
| pricing_type | VARCHAR | `base_price`, `new_price`, `dynamic`, `yield` |
| dynamic_pricing_value | NUMERIC | % modifier |
| dynamic_pricing_mode | VARCHAR | `increase`, `decrease` |
| yield_thresholds | JSONB | Yield pricing config |
| rules_id | UUID (FK) | |
| status | VARCHAR | `available`, `unavailable` |

#### `glamping_item_event_items` — Event ↔ Item junction
| Column | Type | Description |
|--------|------|-------------|
| event_id | UUID (FK) | |
| item_id | UUID (FK) | |
| display_order | INTEGER | |

#### `glamping_deposit_settings` — Deposit per item
| Column | Type | Description |
|--------|------|-------------|
| item_id | UUID (FK, UNIQUE) | |
| type | VARCHAR | `percentage`, `fixed`, `per_day`, `per_quantity` |
| amount | DECIMAL(12,2) | |

#### `glamping_taxes`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | |
| name | VARCHAR | |
| type | VARCHAR | `normal`, `vat`, `service` |
| amount | DECIMAL(10,2) | |
| is_percentage | BOOLEAN | |
| status | BOOLEAN | |

### Discount System

#### `glamping_discounts`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | |
| name | VARCHAR | |
| code | VARCHAR (UNIQUE) | Discount code |
| type | VARCHAR | `percentage`, `fixed` |
| amount | DECIMAL(12,2) | |
| apply_type | VARCHAR | `per_booking`, `per_item` |
| recurrence | VARCHAR | `always`, `one_time`, `date_range` |
| start_date, end_date | DATE | |
| days_of_week | INTEGER[] | Weekly recurrence |
| application_type | VARCHAR | |
| max_uses, current_uses | INTEGER | |
| rules_id | UUID (FK) | |
| status | VARCHAR | `active`, `inactive` |

#### `glamping_discount_items` — Discount ↔ Item junction
| Column | Type | Description |
|--------|------|-------------|
| discount_id | UUID (FK) | |
| item_id | UUID (FK) | |

### Booking System

#### `glamping_bookings` — Bookings chính
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | |
| booking_code | VARCHAR(20) UNIQUE | Format: GH{YY}{000001} |
| customer_id | UUID (FK → customers) | |
| created_by_user_id | UUID (FK → users) | Admin who created |
| status | VARCHAR | `pending`, `confirmed`, `in_progress`, `completed`, `cancelled` |
| payment_status | VARCHAR | `pending`, `partial`, `paid`, `refunded`, `failed` |
| check_in_date, check_out_date | DATE | |
| nights | INTEGER | GENERATED (check_out - check_in) |
| guests | JSONB | `{adults: N, children: N}` |
| total_guests | INTEGER | |
| subtotal_amount | DECIMAL(12,2) | |
| tax_amount | DECIMAL(12,2) | |
| discount_amount | DECIMAL(12,2) | |
| total_amount | DECIMAL(12,2) | GENERATED (subtotal + tax - discount) |
| deposit_due, balance_due | DECIMAL(12,2) | |
| currency | VARCHAR | Default 'VND' |
| customer_notes, internal_notes | TEXT | |
| special_requirements, party_names | TEXT | |
| invoice_notes | TEXT | |
| payment_expires_at | TIMESTAMP | Auto-cancel deadline |
| discount_breakdown | JSONB | Per-item discount details |
| date_of_birth | DATE | Customer info |
| social_media_url | VARCHAR | |
| photo_consent | BOOLEAN | |
| referral_source | VARCHAR | |

#### `glamping_booking_items` — Items trong booking
| Column | Type | Description |
|--------|------|-------------|
| booking_id | UUID (FK) | |
| item_id | UUID (FK) | |
| parameter_id | UUID (FK) | |
| allocation_type | VARCHAR | |
| quantity | INTEGER | |
| unit_price | DECIMAL(12,2) | |
| total_price | DECIMAL(12,2) | GENERATED (unit_price * quantity) |
| metadata | JSONB | Per-item check-in/out dates, guests |

#### `glamping_booking_payments`
| Column | Type | Description |
|--------|------|-------------|
| booking_id | UUID (FK) | |
| payment_method | VARCHAR | |
| amount | DECIMAL(12,2) | |
| status | VARCHAR | `pending`, `awaiting_confirmation`, `paid`, `failed`, `refunded` |
| transaction_reference | VARCHAR | |
| paid_at | TIMESTAMP | |
| created_by_user_id | UUID (FK) | |

#### `glamping_booking_menu_products`
| Column | Type | Description |
|--------|------|-------------|
| booking_id | UUID (FK) | |
| menu_item_id | UUID (FK) | |
| quantity | INTEGER | |
| unit_price | DECIMAL(12,2) | |
| booking_item_id | UUID (FK) | Per-item menu (optional) |

#### `glamping_booking_status_history`
| Column | Type | Description |
|--------|------|-------------|
| booking_id | UUID (FK) | |
| previous_status, new_status | VARCHAR | |
| previous_payment_status, new_payment_status | VARCHAR | |
| changed_by_user_id | UUID (FK) | |
| reason | TEXT | |

### Menu System

#### `glamping_menu_categories`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | |
| zone_id | UUID (FK) | |
| name | VARCHAR | |
| display_order | INTEGER | |

#### `glamping_menu_items`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | |
| zone_id | UUID (FK) | |
| category_id | UUID (FK → menu_categories) | |
| name | VARCHAR | |
| description | TEXT | |
| price | DECIMAL(12,2) | |
| image_url | VARCHAR | |
| is_active | BOOLEAN | |
| stock | INTEGER | NULL = unlimited |
| min_guests, max_guests | INTEGER | Combo guest limits |
| display_order | INTEGER | |

### Rule System

#### `glamping_rule_sets`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | |
| name | VARCHAR | |
| zone_id | UUID (FK) | |
| is_default | BOOLEAN | |

#### `glamping_rules`
| Column | Type | Description |
|--------|------|-------------|
| rule_set_id | UUID (FK) | |
| rule_type | VARCHAR | Min stay, max advance, etc. |
| value | INTEGER | |
| unit | VARCHAR | `days`, `hours`, `nights`, etc. |
| apply_to_customer | BOOLEAN | |
| apply_to_staff | BOOLEAN | |
| is_strict | BOOLEAN | |

### Support Tables

#### `glamping_notifications`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | |
| user_id / customer_id | UUID (FK) | Recipient |
| type | VARCHAR | Notification type |
| title, message | VARCHAR | |
| data | JSONB | Extra data |
| read | BOOLEAN | |
| app_type | VARCHAR | `glamping` |

#### `bank_accounts`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | |
| bank_name, account_number | VARCHAR | |
| account_holder | VARCHAR | |
| is_default | BOOLEAN | |
| sepay_account_number | VARCHAR | For webhook matching |

#### `sepay_transactions`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | |
| transaction_content | VARCHAR | For matching to booking |
| amount | DECIMAL | |
| glamping_booking_id | UUID (FK) | |
| bank_account_id | UUID (FK) | |

## 4.4. Database Functions

```sql
-- Generate sequential glamping booking codes
CREATE OR REPLACE FUNCTION get_next_glamping_booking_number(p_year INTEGER)
RETURNS INTEGER
-- Uses glamping_booking_sequences table
-- Returns next number atomically (INSERT ON CONFLICT DO UPDATE)
```

## 4.5. Key Indexes

```sql
CREATE INDEX idx_glamping_items_category ON glamping_items(category_id);
CREATE INDEX idx_glamping_pricing_item ON glamping_pricing(item_id);
CREATE INDEX idx_glamping_pricing_event ON glamping_pricing(event_id);
CREATE INDEX idx_glamping_bookings_code ON glamping_bookings(booking_code);
CREATE INDEX idx_glamping_bookings_customer ON glamping_bookings(customer_id);
CREATE INDEX idx_glamping_bookings_status ON glamping_bookings(status);
CREATE INDEX idx_glamping_bookings_dates ON glamping_bookings(check_in_date, check_out_date);
```

## 4.6. Migration Files

Migrations nằm trong 2 thư mục:
- `supabase/migrations/` — Historical migrations (từ đầu project)
- `migrations/` — Recent standalone migrations

File quan trọng nhất:
- `supabase/migrations/20260108_create_glamping_system.sql` — Tạo toàn bộ glamping schema
- `supabase/migrations/20260113_create_glamping_zones.sql` — Zone system
- `supabase/migrations/20260116_create_glamping_menu.sql` — Menu system
