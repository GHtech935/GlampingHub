# 9. Pricing System

## 9.1. Tổng quan

Hệ thống pricing của GlampingHub rất linh hoạt, hỗ trợ:

- **Parameter-based pricing**: Giá khác nhau cho từng loại khách (adults, children, pets...)
- **Group pricing**: Giá theo nhóm (1-2 người giá X, 3-5 người giá Y)
- **Event pricing**: Giá thay đổi theo mùa, sự kiện, ngày đặc biệt
- **Dynamic pricing**: Tăng/giảm % so với giá gốc
- **Yield pricing**: Giá tự điều chỉnh theo tồn kho (demand-based)
- **Nightly pricing**: Giá tính per-night, có thể khác nhau mỗi đêm

## 9.2. Core Pricing Engine

File: `lib/glamping-pricing.ts`

### Function chính
```typescript
calculateGlampingPricing(
  db: Pool,
  itemId: string,
  checkInDate: Date,
  checkOutDate: Date,
  parameterQuantities: Record<string, number>  // { paramId: quantity }
): Promise<PricingResult>
```

### PricingResult
```typescript
interface PricingResult {
  parameterPricing: Record<string, number>;  // Total per parameter
  nightlyPricing: NightlyPricing[];          // Per-night breakdown
}

interface NightlyPricing {
  date: string;           // "2026-02-01"
  parameters: Record<string, number>;  // Per-param price for this night
}
```

## 9.3. Pricing Flow Chi Tiết

```
Input: itemId, checkIn, checkOut, parameterQuantities
                    │
                    ▼
┌──────────────────────────────────────────────┐
│ 1. Fetch ALL pricing records                  │
│    FROM glamping_pricing WHERE item_id = X    │
│    → Base prices (event_id IS NULL)           │
│    → Event prices (event_id IS NOT NULL)      │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│ 2. Fetch ALL active events for item           │
│    FROM glamping_item_events                  │
│    JOIN glamping_item_event_items             │
│    WHERE status = 'available'                 │
│    ORDER BY:                                  │
│      closure > special > seasonal (priority)  │
│      display_order DESC                       │
│      created_at DESC                          │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│ 3. Fetch item inventory (for yield pricing)   │
│    → NULL = unlimited                         │
│    → Number = remaining stock                 │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│ 4. Build Pricing Map                          │
│    base: { paramId → [{amount, group}] }     │
│    events: { eventId → { paramId → [...] } } │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│ 5. FOR EACH NIGHT in date range:              │
│    a. Find matching events for this date      │
│       - Check date range (start ≤ date ≤ end)│
│       - Check days_of_week                    │
│    b. FOR EACH PARAMETER:                     │
│       - Try events (priority order):          │
│         * new_price → use event pricing table │
│         * dynamic → base × modifier           │
│         * yield → base × stock threshold      │
│         * base_price → use base price          │
│       - If no event match → use base price    │
│       - If no base price → 0                  │
│    c. Accumulate totals                       │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
        Return { parameterPricing, nightlyPricing }
```

## 9.4. Pricing Types

### Base Pricing
Giá mặc định khi không có event nào apply.

```
glamping_pricing table:
item_id = X, parameter_id = 'adults', event_id = NULL
group_min = NULL, group_max = NULL, amount = 500000
→ Giá 500,000 VND / người lớn / đêm
```

### Group Pricing
Giá khác nhau theo số lượng:

```
item_id = X, parameter_id = 'adults', event_id = NULL
group_min = 1, group_max = 2, amount = 500000  (1-2 người: 500k)
group_min = 3, group_max = 6, amount = 400000  (3-6 người: 400k)
```

Logic tìm giá:
```typescript
function findPrice(prices, quantity) {
  // 1. Tìm group pricing match
  const groupPrice = prices.find(p =>
    p.group_min !== null &&
    quantity >= p.group_min &&
    quantity <= p.group_max
  );
  if (groupPrice) return groupPrice.amount;

  // 2. Fallback to base price (no group limits)
  const basePrice = prices.find(p => p.group_min === null);
  return basePrice?.amount ?? null;
}
```

### Event Pricing Types

#### `new_price` — Giá mới hoàn toàn
Event có pricing records riêng trong `glamping_pricing` (event_id IS NOT NULL).

```
Ví dụ: Tết event
glamping_pricing:
  item_id = X, parameter_id = 'adults', event_id = 'tet-event'
  amount = 800000  (tăng từ 500k → 800k)
```

#### `dynamic` — Tăng/giảm % so với giá gốc
```
Event: { pricing_type: 'dynamic', dynamic_pricing_value: 20, dynamic_pricing_mode: 'increase' }
→ Base price 500,000 × 1.20 = 600,000 VND
```

File: `lib/glamping-event-pricing.ts`
```typescript
function calculateEventPrice(basePrice, config, context?) {
  if (config.pricing_type === 'dynamic') {
    const modifier = config.dynamic_pricing_value / 100;
    if (config.dynamic_pricing_mode === 'increase') {
      return basePrice * (1 + modifier);
    } else {
      return basePrice * (1 - modifier);
    }
  }
}
```

#### `yield` — Giá theo tồn kho
Giá tự điều chỉnh dựa trên remaining inventory (demand-based).

```
Event: {
  pricing_type: 'yield',
  yield_thresholds: [
    { stock_below: 3, modifier: 30 },   // < 3 items left → +30%
    { stock_below: 5, modifier: 15 },   // < 5 items left → +15%
    { stock_below: 10, modifier: 5 },   // < 10 items left → +5%
  ]
}
→ If 4 items remaining: base × 1.15 (matched stock_below: 5 → +15%)
```

#### `base_price` — Dùng giá gốc
Event apply nhưng giá không đổi (chỉ thay đổi rules/availability).

### Event Priority
Khi nhiều events match cùng 1 ngày, priority:
1. **Type priority:** closure > special > seasonal
2. **Display order:** higher first
3. **Created date:** newer first

→ Chỉ 1 event được apply per parameter per night.

## 9.5. Total Price Calculation

```
For each item in booking:
  accommodationCost = 0
  for each parameter with quantity > 0:
    paramTotalPrice = calculateGlampingPricing()  // Sum across all nights
    accommodationCost += paramTotalPrice × quantity

menuProductsTotal = sum(menuProduct.price × menuProduct.quantity)

subtotalAmount = accommodationCost + menuProductsTotal
discountAmount = applyVoucher(subtotalAmount)
totalAmount = subtotalAmount - discountAmount
```

## 9.6. Deposit Calculation

```typescript
// Hierarchy: Item deposit → Zone deposit → Full payment
1. Check glamping_deposit_settings for item
2. If not found → check glamping_zones deposit_type/deposit_value
3. If not found → full payment (depositDue = totalAmount)

// Types:
if (type === 'percentage') {
  depositDue = totalAmount * (value / 100);
} else {
  depositDue = value;  // fixed amount
}

balanceDue = totalAmount - depositDue;
```

## 9.7. Ví dụ cụ thể

### Scenario: Booking lều Bell, 2 đêm, 2 adults + 1 child, Tết event

**Setup:**
- Item: Bell Tent
- Parameters: Adults (500k/đêm), Children (300k/đêm)
- Tết Event (Jan 28 - Feb 5): dynamic pricing +30%
- Booking: Jan 30 - Feb 1 (2 nights)

**Calculation:**
```
Night 1 (Jan 30) - Tết event applies:
  Adults: 500,000 × 1.30 = 650,000
  Children: 300,000 × 1.30 = 390,000

Night 2 (Jan 31) - Tết event applies:
  Adults: 650,000
  Children: 390,000

Parameter totals:
  Adults: 650,000 + 650,000 = 1,300,000
  Children: 390,000 + 390,000 = 780,000

Accommodation cost:
  Adults: 1,300,000 × 2 (quantity) = 2,600,000
  Children: 780,000 × 1 (quantity) = 780,000
  Total accommodation: 3,380,000

Menu: BBQ Combo × 3 = 150,000 × 3 = 450,000

Subtotal: 3,380,000 + 450,000 = 3,830,000
Voucher SUMMER20 (20%): -766,000
Total: 3,064,000

Deposit (50%): 1,532,000
Balance: 1,532,000
```

## 9.8. Admin Pricing Management

Admin quản lý pricing qua `PricingTable` component:
- Grid view: Parameters × Events
- Editable cells
- Support group pricing brackets
- Bulk update via `POST /api/admin/glamping/pricing`

Pricing data stored in `glamping_pricing` table:
- 1 record per item × parameter × event × group bracket
- `event_id = NULL` → base price
- `group_min/max = NULL` → default price (no group)
