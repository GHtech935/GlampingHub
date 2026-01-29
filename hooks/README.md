# Glamping Cart Editing Hooks

This directory contains custom React hooks for managing the cart item editing functionality in the glamping booking system.

## Overview

The cart editing feature has been refactored from a modal-based approach to inline editing. These hooks encapsulate reusable logic that can be shared across components.

## Hooks

### `useCartItemFormState.ts`

Manages the form state for editing a cart item.

**Purpose:** Initialize and track form state including dates, parameters, menu products, and vouchers.

**Features:**
- Initializes state from a cart item
- Tracks dirty state (unsaved changes)
- Provides reset functionality
- Calculates total guests from parameters

**Usage:**
```typescript
const formState = useCartItemFormState(cartItem);

// Access state
formState.dateRange
formState.parameterQuantities
formState.menuProducts
formState.accommodationVoucher
formState.menuVoucher
formState.isDirty
formState.totalGuests

// Update state
formState.setDateRange(newDateRange)
formState.setParameterQuantities(quantities)
formState.setMenuProducts(products)
formState.setAccommodationVoucher(voucher)
formState.setMenuVoucher(voucher)

// Reset to original
formState.reset()
```

---

### `useMenuProductsData.ts`

Fetches menu products for a glamping item.

**Purpose:** Load available menu products from the API.

**Features:**
- Fetches menu products by item ID
- Handles loading and error states
- Caches results for the same item ID

**Usage:**
```typescript
const { menuProducts, loading, error } = useMenuProductsData(itemId);

if (loading) return <Spinner />;
if (error) return <Error message={error.message} />;

// Use menuProducts
```

---

### `useCartItemPricing.ts`

Calculates real-time pricing for cart items.

**Purpose:** Fetch pricing calculations from the API with debouncing.

**Features:**
- Real-time pricing updates (500ms debounce)
- Includes parameters and voucher discounts
- Handles loading and error states

**Usage:**
```typescript
const { pricingData, pricingLoading, error } = useCartItemPricing({
  itemId,
  dateRange,
  parameterQuantities,
  accommodationVoucher
});

if (pricingLoading) return <PricingLoader />;

// Display pricing
const total = pricingData?.totals?.accommodationCost;
```

**Debouncing:**
The hook automatically debounces API calls for 500ms to avoid excessive requests while the user is typing or adjusting quantities.

---

### `useCartItemSave.ts`

Handles saving cart item changes.

**Purpose:** Validate and save cart item updates to the cart.

**Features:**
- Validates required fields (dates, etc.)
- Calculates pricing breakdown
- Updates cart via GlampingCartProvider
- Calculates menu products total and discount
- Handles saving state and errors

**Usage:**
```typescript
const {
  handleSave,
  isSaving,
  error,
  menuProductsTotal,
  menuDiscountAmount
} = useCartItemSave({
  cartItemId: item.id,
  item,
  formState,
  pricingData,
  menuProductsData
});

// Save changes
await handleSave();

// Display save button
<Button onClick={handleSave} disabled={isSaving}>
  {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
</Button>
```

---

### `useGlampingParameters.ts`

Fetches available parameters for a glamping item.

**Purpose:** Load all possible parameters that can be selected for an item.

**Usage:**
```typescript
const { parameters, loading } = useGlampingParameters(itemId);

if (loading) return <Spinner />;

// Use parameters
<GlampingParameterSelector parameters={parameters} ... />
```

---

## Architecture

### Inline Editing Flow

1. **User clicks cart item** → Expand inline form
2. **User edits fields** → Form state updates locally
3. **Form state changes** → Pricing recalculates (debounced)
4. **User clicks Save** → Validate & update cart
5. **Form collapses** → Back to summary view

### State Management

- **Local state** in `CartItemsList` for expand/collapse
- **Form state** managed by `useCartItemFormState` hook
- **Cart updates** via `GlampingCartProvider` context
- Only 1 item can be edited at a time (mutual exclusion)

### Component Structure

```
CartItemsList
└── CartItemInlineEditForm (per item)
    ├── useCartItemFormState
    ├── useGlampingParameters
    ├── useMenuProductsData
    ├── useCartItemPricing
    └── useCartItemSave
```

---

## Benefits of This Architecture

✅ **Reusable:** Hooks can be used in other components (e.g., admin forms)

✅ **Testable:** Each hook can be tested independently

✅ **Maintainable:** Logic separated from UI concerns

✅ **Type-safe:** Full TypeScript support with proper types

✅ **DRY:** No code duplication between components

---

## Migration from Modal

Previously, cart item editing used `EditCartItemModal` component with all logic in one file. The refactoring:

1. **Extracted** state management → `useCartItemFormState`
2. **Extracted** API calls → `useMenuProductsData`, `useCartItemPricing`
3. **Extracted** save logic → `useCartItemSave`
4. **Created** inline component → `CartItemInlineEditForm`
5. **Integrated** into list → `CartItemsList`
6. **Removed** modal component

**Result:** Better UX (no modal), cleaner code, reusable hooks

---

## Testing

When testing cart editing functionality:

1. **Unit tests:** Test each hook independently with mock data
2. **Integration tests:** Test `CartItemInlineEditForm` with real hooks
3. **E2E tests:** Test full flow in `CartItemsList`

See `MULTI-ITEM-BOOKING-TEST-GUIDE.md` for detailed test scenarios.

---

## Related Files

- `/components/glamping-booking/CartItemsList.tsx` - Main list view
- `/components/glamping-booking/CartItemInlineEditForm.tsx` - Inline edit form
- `/components/providers/GlampingCartProvider.tsx` - Cart context
- `/app/glamping/booking/form/page.tsx` - Booking form page

---

**Last Updated:** 2026-01-26
