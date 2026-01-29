# 6. Component Documentation

## 6.1. Component Architecture

Project dùng 2 pattern chính:
1. **shadcn/ui pattern**: Primitive UI components trong `components/ui/` — copy-paste, customizable
2. **Feature components**: Business logic components trong các thư mục theo feature

### Convention
- Page-specific components: `app/.../[page]/_components/ComponentName.tsx`
- Shared feature components: `components/{feature}/ComponentName.tsx`
- UI primitives: `components/ui/componentname.tsx`

---

## 6.2. Layout Components (`components/layout/`)

### `Header.tsx`
**Mô tả:** Customer-facing header. Hiển thị logo, navigation, language switcher, auth buttons, cart.
- Conditionally shows `GlampingCartPopover` cho glamping pages
- Responsive: hamburger menu on mobile
- `NotificationBell` cho logged-in customers

### `Footer.tsx`
**Mô tả:** Customer-facing footer. Links, contact info, social media.

### `Container.tsx`
**Mô tả:** Max-width container wrapper.

### `LanguageSwitcher.tsx`
**Mô tả:** Dropdown chuyển ngôn ngữ (VI/EN).

---

## 6.3. Provider Components (`components/providers/`)

### `Providers.tsx`
**Mô tả:** Root provider wrapper. Wraps children with:
- `QueryClientProvider` (React Query)
- `GlampingCartProvider` (Cart state)
- `GoogleMapsProvider` (Google Maps script)

### `ClientI18nProvider.tsx`
**Mô tả:** Client-side i18n provider cho customer pages.
- Detects language from localStorage hoặc browser preference
- Loads message file (vi.json / en.json)
- Wraps `NextIntlClientProvider`

### `AdminI18nProvider.tsx`
**Mô tả:** Admin-specific i18n provider.
- `useAdminLocale()` hook — get/set admin language
- Persists to localStorage

### `GlampingCartProvider.tsx`
**Mô tả:** Shopping cart state management dùng **Zustand**.
- Cart items stored in localStorage
- Functions: `addItem`, `removeItem`, `updateItem`, `clearCart`
- Tính tổng giá, tổng items, etc.
- Shared cart across glamping booking flow

### `GoogleMapsProvider.tsx`
**Mô tả:** Load Google Maps JavaScript SDK.

### `ToastProvider.tsx`
**Mô tả:** Toast notification system.

---

## 6.4. Glamping Booking Components (`components/glamping-booking/`)

### `GlampingCartPopover.tsx`
**Mô tả:** Cart icon + popover hiển thị items trong cart.
- Shows item count badge
- Quick view of cart items
- Link to booking form

### `CartItemsList.tsx`
**Mô tả:** Render danh sách items trong cart.
- Each item shows: name, dates, guests, price
- Remove/edit buttons

### `CartItemInlineEditForm.tsx`
**Mô tả:** Inline edit form cho cart item (change dates, guests).

### `GlampingMenuProductsSelector.tsx`
**Mô tả:** Menu/combo selection UI.
- Group by menu categories
- Show combos with guest limits (min/max)
- Quantity selectors
- Auto-calculate total
- Validation: combo capacity must cover counted guests

### `GlampingMyDetailsSection.tsx`
**Mô tả:** Guest details form section (name, email, phone, etc.)

### `GlampingOtherDetailsSection.tsx`
**Mô tả:** Additional details (special requirements, party names, etc.)
- New customer info fields: date of birth, social media, photo consent, referral source

### `GlampingPaymentSection.tsx`
**Mô tả:** Payment method selection & VietQR display.
- Pay now vs Pay later (deposit)
- QR code generation
- Payment timeout countdown

### `GlampingPricingSummary.tsx`
**Mô tả:** Pricing breakdown display.
- Accommodation cost per item
- Menu products total
- Discount applied
- Tax (if applicable)
- Total amount
- Deposit vs balance

### `GlampingBookingSummaryHeader.tsx`
**Mô tả:** Booking summary header (on confirmation/payment pages).

### `GlampingCancellationPolicySection.tsx`
**Mô tả:** Cancellation policy display from zone settings.

---

## 6.5. Customer Glamping Pages (`app/glamping/.../_components/`)

### Search Page v2 Components (`search_2/_components/`)

#### `SearchHeader.tsx` — Search bar with date picker, guest count
#### `SearchSidebar.tsx` — Filter sidebar (categories, price range)
#### `CategoryTabs.tsx` — Category filter tabs
#### `ItemsGrid.tsx` — Grid layout for search results
#### `ItemCard.tsx` — Single item card in search results
#### `AvailabilityCalendar.tsx` — Calendar showing availability
#### `ItemDetailModal.tsx` — Quick view modal for item details

### Zone Page Components (`zones/[zoneId]/_components/`)

#### `ItemsGrid.tsx` — Items grid for a specific zone
#### `ItemCardVertical.tsx` — Vertical layout item card

### Item Detail Components (`zones/[zoneId]/items/[id]/_components/`)

#### `ItemDetailContent.tsx` — Main content layout (images, description, parameters)
#### `ItemAvailabilityCalendar.tsx` — Calendar showing available dates
#### `ItemBookingSection.tsx` — Booking form (date picker, guest selector, add to cart)
#### `ItemInformationGrid.tsx` — Item info grid (features, amenities)
#### `ItemBookingSummaryPanel.tsx` — Sticky sidebar with pricing summary

---

## 6.6. Admin Components (`components/admin/`)

### Admin Glamping Components (`admin/glamping/`)

#### `ZoneSelector.tsx`
**Mô tả:** Zone switcher trong admin header. Cho phép chuyển giữa các zones.
- "All Zones" option cho admin/sale
- glamping_owner chỉ thấy zones được gán

#### `GlampingBookingDetailModal.tsx`
**Mô tả:** Modal chi tiết booking. Có nhiều tabs:
- Overview (booking info, guest info)
- Stay Items (items & parameters)
- Financial (pricing breakdown)
- Payments (payment history, add payment)
- Products (menu products)
- Emails (email history, send email)
- History (status change log)

#### Form Modals (CRUD)
| Component | Mô tả |
|-----------|-------|
| `CategoryFormModal.tsx` | Create/edit category |
| `TagFormModal.tsx` | Create/edit tag |
| `ParameterFormModal.tsx` | Create/edit parameter |
| `EventFormModal.tsx` | Create/edit event (complex form with pricing type) |
| `DiscountFormModal.tsx` | Create/edit discount |
| `MenuFormModal.tsx` | Create/edit menu item |
| `MenuCategoryModal.tsx` | Create/edit menu category |
| `ZoneFormModal.tsx` | Create/edit zone |

#### Booking Detail Tabs (`admin/glamping/tabs/`)
| Component | Mô tả |
|-----------|-------|
| `BookingOverviewCard.tsx` | General booking info card |
| `BookingStayItemsSection.tsx` | Items booked with per-item details |
| `GuestDistributionCard.tsx` | Guest distribution across items |
| `ItemFinancialBreakdown.tsx` | Per-item financial breakdown |
| `PaymentAllocationInfo.tsx` | Payment allocation info |

### Admin Item Form (`app/admin/zones/[zoneId]/items/_components/`)

#### `ItemFormWizard.tsx`
**Mô tả:** Multi-step wizard cho tạo/edit item.
- Step 1: Basic info (name, SKU, category, summary)
- Step 2: Attributes (inventory, allocation type)
- Step 3: Parameters (attach params, set min/max)
- Step 4: Pricing (base pricing per parameter, group pricing)
- Step 5: Events (link to events)
- Step 6: Media (upload images)
- Step 7: Tags
- Step 8: Deposit settings
- Step 9: Tax settings

#### `PricingTable.tsx`
**Mô tả:** Pricing editor table. Hiển thị pricing grid:
- Rows = parameters
- Columns = base + events
- Editable cells
- Group pricing brackets

### General Admin Components

#### `BookingsTable.tsx` — Main bookings list with filters
#### `BookingsFilterBar.tsx` — Filter bar (status, date range, search)
#### `CustomerDetailModal.tsx` — Customer detail with booking history
#### `CustomerSearchSelect.tsx` — Searchable customer dropdown
#### `ImageUpload.tsx` — Multi-image upload with drag & drop reorder
#### `LocationPicker.tsx` — Google Maps location picker
#### `MultilingualInput.tsx` — Input with VI/EN tabs
#### `MultilingualTextarea.tsx` — Textarea with VI/EN tabs
#### `MultilingualRichTextEditor.tsx` — Rich text editor with VI/EN tabs
#### `MetricCard.tsx` — Dashboard stat card
#### `RevenueChart.tsx` — Revenue chart (recharts)

### Admin Event Form Components (`admin/events/`)
| Component | Mô tả |
|-----------|-------|
| `EventFormFields.tsx` | Main event form fields |
| `EventTypeSelector.tsx` | Type selector (seasonal/special/closure) |
| `DateRangeFields.tsx` | Start/end date fields |
| `RecurrenceSelector.tsx` | Recurrence pattern selector |
| `ApplicableDaysSelector.tsx` | Days of week selector |
| `PriceTypeSelector.tsx` | Pricing type selector |
| `DynamicPricingTab.tsx` | Dynamic pricing config |
| `YieldPricingTab.tsx` | Yield pricing config |
| `CategoryItemSelector.tsx` | Select items for event |
| `RulesetSelector.tsx` | Attach ruleset to event |

---

## 6.7. UI Primitives (`components/ui/`)

shadcn/ui components — fully customizable. Key components:

| Component | Based On |
|-----------|---------|
| `button.tsx` | Radix Slot + CVA variants |
| `dialog.tsx` | Radix Dialog |
| `dropdown-menu.tsx` | Radix DropdownMenu |
| `select.tsx` | Radix Select |
| `tabs.tsx` | Radix Tabs |
| `toast.tsx` + `toaster.tsx` | Radix Toast |
| `calendar.tsx` | react-day-picker |
| `date-picker.tsx` | Calendar + Popover |
| `date-range-picker.tsx` | Calendar with range |
| `form.tsx` | react-hook-form integration |
| `rich-text-editor.tsx` | Quill editor wrapper |
| `image-lightbox.tsx` | yet-another-react-lightbox |
| `currency-input.tsx` | Formatted number input for VND |
| `checkbox-tree.tsx` | Hierarchical checkbox tree |

---

## 6.8. Notification Components (`components/notifications/`)

### `NotificationBell.tsx`
**Mô tả:** Bell icon with unread count badge. Click opens panel.

### `NotificationPanel.tsx`
**Mô tả:** Slide-out panel with notification list.

### `NotificationList.tsx`
**Mô tả:** Scrollable list of notifications with pagination.

### `NotificationItem.tsx`
**Mô tả:** Single notification item with read/unread styling.

---

## 6.9. Custom Hooks (`hooks/`)

### `useAuth()`
**Return:** `{ user, loading, isStaff, isCustomer, isAdmin }`
**Mô tả:** Fetch current session from `/api/auth/me`.

### `useCartItemFormState(itemId)`
**Return:** Form state for cart item (dates, guests, parameters).

### `useCartItemPricing(formState)`
**Return:** Calculated pricing based on form state. Calls calculate-pricing API.

### `useCartItemSave()`
**Return:** `{ saveToCart }` — Save form state to Zustand cart store.

### `useGlampingParameters(itemId)`
**Return:** Parameters list for an item.

### `useMenuProductsData(zoneId)`
**Return:** Menu items grouped by category.

### `useNotifications()`
**Return:** `{ notifications, unreadCount, markAsRead, markAllRead }`
**Mô tả:** Polling hook for notification system.

### `useGeolocation()`
**Return:** `{ latitude, longitude, error }`

### `useWishlist()`
**Return:** `{ items, addToWishlist, removeFromWishlist, isWishlisted }`
