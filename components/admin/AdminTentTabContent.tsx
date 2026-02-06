'use client'

import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, Loader2, Package, Minus, Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { GlampingItemSelector } from './GlampingItemSelector'
import { GlampingDateRangePickerWithCalendar } from './GlampingDateRangePickerWithCalendar'
import { GlampingMenuProductsSelector, type SelectedMenuProduct } from './GlampingMenuProductsSelector'
import VoucherInput, { type AppliedVoucher } from '@/components/booking/VoucherInput'
import { format } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { type MultilingualText, getLocalizedText } from '@/lib/i18n-utils'
import { useItemAddons, type ItemAddon } from '@/hooks/useItemAddons'
import { type AddonSelection } from '@/components/providers/GlampingCartProvider'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'

// Types shared with the parent modal
export interface AdminTentItem {
  id: string
  itemId: string
  itemName: string
  itemSku: string
  itemData: GlampingItem | null
  itemParameters: GlampingParameter[]
  dateRange: DateRange | undefined
  checkIn: string
  checkOut: string
  nights: number
  adults: number
  children: number
  parameterQuantities: Record<string, number>
  parameters: Array<{ id: string; name: MultilingualText | string; color_code?: string; quantity: number }>
  menuProducts: Record<number, Record<string, SelectedMenuProduct>>
  accommodationVoucher: {
    code: string
    id: string
    discountAmount: number
    discountType: string
    discountValue: number
  } | null
  addonSelections: Record<string, AddonSelection>
  pricingBreakdown: {
    accommodationCost: number
    menuProductsCost: number
    addonsCost: number
    subtotal: number
  } | null
  loadingItemDetails: boolean
}

export interface GlampingItem {
  id: string
  name: MultilingualText | string
  sku: string
  category_name: MultilingualText | string
  inventory_quantity: number
  unlimited_inventory: boolean
  status: string
  max_guests?: number
}

export interface GlampingParameter {
  id: string
  parameter_id: string
  name: MultilingualText | string
  color_code: string
  controls_inventory: boolean
  sets_pricing: boolean
  min_quantity?: number
  max_quantity?: number
  counted_for_menu?: boolean
}

export function createEmptyTent(): AdminTentItem {
  return {
    id: crypto.randomUUID(),
    itemId: '',
    itemName: '',
    itemSku: '',
    itemData: null,
    itemParameters: [],
    dateRange: undefined,
    checkIn: '',
    checkOut: '',
    nights: 0,
    adults: 0,
    children: 0,
    parameterQuantities: {},
    parameters: [],
    menuProducts: {},
    accommodationVoucher: null,
    addonSelections: {},
    pricingBreakdown: null,
    loadingItemDetails: false,
  }
}

interface AdminTentTabContentProps {
  zoneId: string
  tent: AdminTentItem
  onTentChange: (updated: AdminTentItem) => void
  otherTents: AdminTentItem[]
  locale: string
}

export function AdminTentTabContent({
  zoneId,
  tent,
  onTentChange,
  otherTents,
  locale,
}: AdminTentTabContentProps) {
  // Date overlap warning
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null)

  // Check date overlap with other tents using the same item
  useEffect(() => {
    if (!tent.itemId || !tent.checkIn || !tent.checkOut) {
      setOverlapWarning(null)
      return
    }

    const sameItemTents = otherTents.filter(t => t.itemId === tent.itemId && t.checkIn && t.checkOut)
    if (sameItemTents.length === 0) {
      setOverlapWarning(null)
      return
    }

    for (const other of sameItemTents) {
      // Overlap check: start1 < end2 AND start2 < end1
      // Consecutive is OK: checkout1 == checkin2
      if (tent.checkIn < other.checkOut && other.checkIn < tent.checkOut) {
        setOverlapWarning(
          locale === 'vi'
            ? `Ngày trùng với lều khác cùng loại "${getLocalizedText(tent.itemData?.name || tent.itemName, locale as 'vi' | 'en')}". Checkout lều này phải <= Check-in lều kia hoặc ngược lại.`
            : `Date overlap with another tent of the same type. Checkout must be <= check-in of the other tent.`
        )
        return
      }
    }

    setOverlapWarning(null)
  }, [tent.itemId, tent.checkIn, tent.checkOut, otherTents, locale, tent.itemData?.name, tent.itemName])

  // Fetch item details when item changes
  useEffect(() => {
    if (!tent.itemId) return
    // Skip if we already have parameters loaded for this item (prevents reset on tab-switch re-mount)
    if (tent.itemParameters.length > 0 && !tent.loadingItemDetails) return

    const fetchItemDetails = async () => {
      onTentChange({ ...tent, loadingItemDetails: true })
      try {
        const response = await fetch(`/api/glamping/items/${tent.itemId}/details`)
        if (!response.ok) throw new Error('Failed to fetch item details')

        const data = await response.json()
        const parameters = data.parameters || []
        const initialQuantities: Record<string, number> = {}
        parameters.forEach((param: GlampingParameter) => {
          initialQuantities[param.parameter_id || param.id] = param.min_quantity || 0
        })

        onTentChange({
          ...tent,
          itemData: data.item || tent.itemData,
          itemParameters: parameters,
          parameterQuantities: initialQuantities,
          loadingItemDetails: false,
        })
      } catch (error) {
        console.error('Error fetching item details:', error)
        onTentChange({ ...tent, loadingItemDetails: false })
      }
    }

    fetchItemDetails()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tent.itemId])

  // Calculate guest count from parameters
  useEffect(() => {
    let calculatedAdults = 0
    let calculatedChildren = 0

    tent.itemParameters.forEach(param => {
      const paramId = param.parameter_id || param.id
      const quantity = tent.parameterQuantities[paramId] || 0

      if (quantity > 0) {
        const paramName = typeof param.name === 'string'
          ? param.name.toLowerCase()
          : (param.name.vi || param.name.en || '').toLowerCase()

        if (paramName.includes('người lớn') || paramName.includes('adult') || paramName.includes('>10') || paramName.includes('> 10')) {
          calculatedAdults += quantity
        } else if (paramName.includes('trẻ em') || paramName.includes('child') || paramName.includes('6-10') || paramName.includes('6- 10') || paramName.includes('6 - 10')) {
          calculatedChildren += quantity
        } else {
          calculatedAdults += quantity
        }
      }
    })

    if (calculatedAdults !== tent.adults || calculatedChildren !== tent.children) {
      onTentChange({ ...tent, adults: calculatedAdults, children: calculatedChildren })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tent.parameterQuantities, tent.itemParameters])

  const handleItemChange = (itemId: string, itemData: GlampingItem) => {
    onTentChange({
      ...tent,
      itemId,
      itemName: typeof itemData.name === 'string'
        ? itemData.name
        : getLocalizedText(itemData.name, locale as 'vi' | 'en'),
      itemSku: itemData.sku,
      itemData,
      // Reset dependent fields but keep dates
      itemParameters: [],
      parameterQuantities: {},
      // Preserve dateRange, checkIn, checkOut, nights for better UX when switching items
      adults: 0,
      children: 0,
      menuProducts: {},
      accommodationVoucher: null,
      addonSelections: {},
      pricingBreakdown: null,
    })
  }

  const handleDateRangeChange = (range: DateRange | undefined) => {
    const checkIn = range?.from ? format(range.from, 'yyyy-MM-dd') : ''
    const checkOut = range?.to ? format(range.to, 'yyyy-MM-dd') : ''
    const nights = range?.from && range?.to
      ? Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24))
      : 0

    // Trim menu products when nights decrease — keep only indices 0..nights-1
    let trimmedMenuProducts = tent.menuProducts
    if (nights > 0 && nights < tent.nights) {
      trimmedMenuProducts = {} as Record<number, Record<string, SelectedMenuProduct>>
      for (let i = 0; i < nights; i++) {
        if (tent.menuProducts[i]) {
          trimmedMenuProducts[i] = tent.menuProducts[i]
        }
      }
    }

    onTentChange({
      ...tent,
      dateRange: range,
      checkIn,
      checkOut,
      nights,
      menuProducts: trimmedMenuProducts,
    })
  }

  const handleParameterQuantitiesChange = (quantities: Record<string, number>) => {
    onTentChange({ ...tent, parameterQuantities: quantities })
  }

  const handleMenuProductsChange = (products: Record<number, Record<string, SelectedMenuProduct>>) => {
    onTentChange({ ...tent, menuProducts: products })
  }

  const handleVoucherApplied = (voucher: AppliedVoucher) => {
    onTentChange({
      ...tent,
      accommodationVoucher: {
        code: voucher.code,
        id: voucher.id,
        discountAmount: voucher.discountAmount,
        discountType: voucher.discountType,
        discountValue: voucher.discountValue,
      },
    })
  }

  const handleVoucherRemoved = () => {
    onTentChange({ ...tent, accommodationVoucher: null })
  }

  // ========== ADDON SUPPORT ==========
  const { addons, loading: addonsLoading } = useItemAddons(tent.itemId || null)

  // Addon pricing state
  const [addonPricingMap, setAddonPricingMap] = useState<Record<string, {
    parameterPricing: Record<string, number>
    parameterPricingModes: Record<string, string>
    loading: boolean
  }>>({})

  // Use ref flag to prevent circular dependency between pricing fetch and sync effects.
  // Without this, syncing pricing back into addonSelections triggers another fetch.
  const isSyncingPricingRef = useRef(false)

  // Helper: get localized name for addon/param
  const getAddonName = useCallback((obj: any) => {
    if (!obj) return ''
    if (typeof obj.name === 'object' && obj.name !== null) {
      return obj.name[locale] || obj.name.vi || obj.name.en || ''
    }
    return obj.name || ''
  }, [locale])

  // Helper: build default dates for an addon based on dates_setting
  const getDefaultAddonDates = useCallback((addon: ItemAddon): { from: string; to: string } | undefined => {
    if (addon.dates_setting === 'inherit_parent') {
      if (tent.dateRange?.from) {
        const fromStr = format(tent.dateRange.from, 'yyyy-MM-dd')
        const nextDay = new Date(tent.dateRange.from)
        nextDay.setDate(nextDay.getDate() + 1)
        return { from: fromStr, to: format(nextDay, 'yyyy-MM-dd') }
      }
    } else if (addon.dates_setting === 'custom') {
      if (addon.custom_start_date && addon.custom_end_date) {
        return { from: addon.custom_start_date, to: addon.custom_end_date }
      }
    }
    return undefined
  }, [tent.dateRange])

  // Init required addons — auto-select is_required addons with default param quantities
  useEffect(() => {
    if (!addons || addons.length === 0) return
    const currentSelections = { ...tent.addonSelections }
    let hasChanges = false

    addons.forEach((addon) => {
      if (!currentSelections[addon.addon_item_id]) {
        if (addon.is_required) {
          const defaultParamQtys: Record<string, number> = {}
          addon.parameters.forEach((p) => {
            defaultParamQtys[p.id] = p.min_quantity || 0
          })
          currentSelections[addon.addon_item_id] = {
            addonItemId: addon.addon_item_id,
            selected: true,
            quantity: 1,
            parameterQuantities: defaultParamQtys,
            dates: getDefaultAddonDates(addon),
          }
          hasChanges = true
        }
      }
    })

    if (hasChanges) {
      onTentChange({ ...tent, addonSelections: currentSelections })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addons, getDefaultAddonDates])

  // Fetch addon pricing — call calculate-pricing for each selected addon
  useEffect(() => {
    // Skip API call if this addonSelections update is from pricing sync (not user action).
    // This breaks the circular dependency: fetch → sync → fetch → sync → ...
    if (isSyncingPricingRef.current) {
      isSyncingPricingRef.current = false
      return
    }

    if (!addons || addons.length === 0) return

    const selectedAddons = addons.filter(
      (a) => tent.addonSelections[a.addon_item_id]?.selected
    )

    if (selectedAddons.length === 0) {
      setAddonPricingMap({})
      return
    }

    const fetchAllAddonPricing = async () => {
      const newMap: typeof addonPricingMap = {}

      selectedAddons.forEach((addon) => {
        newMap[addon.addon_item_id] = {
          parameterPricing: {},
          parameterPricingModes: {},
          loading: true,
        }
      })
      setAddonPricingMap({ ...newMap })

      await Promise.all(
        selectedAddons.map(async (addon) => {
          const sel = tent.addonSelections[addon.addon_item_id]
          if (!sel) return

          const checkIn = sel.dates?.from
          const checkOut = sel.dates?.to

          if (!checkIn || !checkOut) {
            newMap[addon.addon_item_id] = {
              parameterPricing: {},
              parameterPricingModes: {},
              loading: false,
            }
            return
          }

          try {
            const params = new URLSearchParams({
              itemId: addon.addon_item_id,
              checkIn,
              checkOut,
            })

            Object.entries(sel.parameterQuantities).forEach(([paramId, qty]) => {
              if (qty > 0) {
                params.append(`param_${paramId}`, qty.toString())
              }
            })

            const response = await fetch(
              `/api/glamping/booking/calculate-pricing?${params}`
            )
            const data = await response.json()

            if (response.ok) {
              const adjustedPricing: Record<string, number> = {}
              const pct = addon.price_percentage / 100
              Object.entries(data.parameterPricing || {}).forEach(
                ([paramId, price]) => {
                  adjustedPricing[paramId] = (price as number) * pct
                }
              )

              newMap[addon.addon_item_id] = {
                parameterPricing: adjustedPricing,
                parameterPricingModes: data.parameterPricingModes || {},
                loading: false,
              }
            } else {
              newMap[addon.addon_item_id] = {
                parameterPricing: {},
                parameterPricingModes: {},
                loading: false,
              }
            }
          } catch {
            newMap[addon.addon_item_id] = {
              parameterPricing: {},
              parameterPricingModes: {},
              loading: false,
            }
          }
        })
      )

      setAddonPricingMap({ ...newMap })
    }

    const timer = setTimeout(fetchAllAddonPricing, 800)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addons, tent.addonSelections, tent.dateRange])

  // Sync computed addon pricing back into addonSelections
  useEffect(() => {
    if (!addons || addons.length === 0) return

    const anyLoading = Object.values(addonPricingMap).some(p => p.loading)
    if (anyLoading) return

    const currentSelections = tent.addonSelections
    let hasChanges = false
    const updatedSelections = { ...currentSelections }

    for (const addon of addons) {
      const sel = currentSelections[addon.addon_item_id]
      if (!sel || !sel.selected) continue

      const addonPricing = addonPricingMap[addon.addon_item_id]
      if (!addonPricing) continue

      let computedTotal = 0
      const computedParamPricing: Record<string, { unitPrice: number; pricingMode: string; paramName: string }> = {}

      addon.parameters.forEach((param) => {
        const qty = sel.parameterQuantities[param.id] || 0
        const unitPrice = addonPricing.parameterPricing[param.id] || 0
        const pricingMode = addonPricing.parameterPricingModes[param.id] || 'per_person'
        const isPerGroup = pricingMode === 'per_group'
        const paramTotal = isPerGroup ? unitPrice : unitPrice * qty
        computedTotal += paramTotal

        computedParamPricing[param.id] = {
          unitPrice,
          pricingMode,
          paramName: getAddonName(param),
        }
      })

      const addonName = getAddonName(addon)

      if (
        sel.totalPrice !== computedTotal ||
        sel.addonName !== addonName ||
        JSON.stringify(sel.parameterPricing) !== JSON.stringify(computedParamPricing)
      ) {
        updatedSelections[addon.addon_item_id] = {
          ...sel,
          totalPrice: computedTotal,
          addonName,
          parameterPricing: computedParamPricing,
        }
        hasChanges = true
      }
    }

    if (hasChanges) {
      isSyncingPricingRef.current = true  // Set flag before update
      onTentChange({ ...tent, addonSelections: updatedSelections })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addonPricingMap, addons])

  // Cleanup effect to reset flag after render cycle
  useEffect(() => {
    isSyncingPricingRef.current = false
  }, [tent.addonSelections])

  // Addon event handlers
  const handleAddonToggle = useCallback((addonItemId: string, selected: boolean, addon: ItemAddon) => {
    const current = { ...tent.addonSelections }
    if (selected) {
      const defaultParamQtys: Record<string, number> = {}
      addon.parameters.forEach((p) => {
        defaultParamQtys[p.id] = p.min_quantity || 0
      })
      current[addonItemId] = {
        addonItemId,
        selected: true,
        quantity: 1,
        parameterQuantities: defaultParamQtys,
        dates: getDefaultAddonDates(addon),
      }
    } else {
      delete current[addonItemId]
    }
    onTentChange({ ...tent, addonSelections: current })
  }, [tent, onTentChange, getDefaultAddonDates])

  const handleAddonParamQtyChange = useCallback((addonItemId: string, paramId: string, delta: number, addon: ItemAddon) => {
    const current = { ...tent.addonSelections }
    const sel = current[addonItemId]
    if (!sel) return

    const param = addon.parameters.find(p => p.id === paramId)
    const min = param?.min_quantity || 0
    const max = param?.max_quantity || 99
    const currentQty = sel.parameterQuantities[paramId] || 0
    const newQty = Math.max(min, Math.min(max, currentQty + delta))

    current[addonItemId] = {
      ...sel,
      parameterQuantities: {
        ...sel.parameterQuantities,
        [paramId]: newQty,
      },
    }
    onTentChange({ ...tent, addonSelections: current })
  }, [tent, onTentChange])

  const handleAddonSingleDateChange = useCallback((addonItemId: string, value: string) => {
    const current = { ...tent.addonSelections }
    const sel = current[addonItemId]
    if (!sel) return

    const nextDay = new Date(value)
    nextDay.setDate(nextDay.getDate() + 1)

    current[addonItemId] = {
      ...sel,
      dates: { from: value, to: format(nextDay, 'yyyy-MM-dd') },
    }
    onTentChange({ ...tent, addonSelections: current })
  }, [tent, onTentChange])

  const handleAddonDateChange = useCallback((addonItemId: string, field: 'from' | 'to', value: string) => {
    const current = { ...tent.addonSelections }
    const sel = current[addonItemId]
    if (!sel) return

    const currentDates = sel.dates || { from: '', to: '' }
    current[addonItemId] = {
      ...sel,
      dates: {
        ...currentDates,
        [field]: value,
      },
    }
    onTentChange({ ...tent, addonSelections: current })
  }, [tent, onTentChange])

  const handleAddonVoucherApplied = useCallback((addonItemId: string, voucher: AppliedVoucher) => {
    const current = { ...tent.addonSelections }
    const sel = current[addonItemId]
    if (!sel) return

    current[addonItemId] = {
      ...sel,
      voucher: {
        code: voucher.code,
        id: voucher.id,
        discountAmount: voucher.discountAmount,
        discountType: voucher.discountType as 'percentage' | 'fixed',
        discountValue: voucher.discountValue,
      },
    }
    onTentChange({ ...tent, addonSelections: current })
  }, [tent, onTentChange])

  const handleAddonVoucherRemoved = useCallback((addonItemId: string) => {
    const current = { ...tent.addonSelections }
    const sel = current[addonItemId]
    if (!sel) return

    current[addonItemId] = {
      ...sel,
      voucher: null,
    }
    onTentChange({ ...tent, addonSelections: current })
  }, [tent, onTentChange])

  const handleAddonToggleOverride = useCallback((addonItemId: string, checked: boolean) => {
    const current = { ...tent.addonSelections }
    const sel = current[addonItemId]
    if (!sel) return

    current[addonItemId] = {
      ...sel,
      usePriceOverride: checked,
      priceOverride: checked ? (sel.totalPrice || 0) : undefined, // Pre-fill with calculated
    }
    onTentChange({ ...tent, addonSelections: current })
  }, [tent, onTentChange])

  const handleAddonPriceOverrideChange = useCallback((addonItemId: string, value: number | undefined) => {
    const current = { ...tent.addonSelections }
    const sel = current[addonItemId]
    if (!sel) return

    current[addonItemId] = {
      ...sel,
      priceOverride: value,
    }
    onTentChange({ ...tent, addonSelections: current })
  }, [tent, onTentChange])

  // Compute total guests counted for menu (combo limits)
  const totalCountedGuests = useMemo(() => {
    return tent.itemParameters.reduce((sum, param) => {
      const paramId = param.parameter_id || param.id
      const qty = tent.parameterQuantities[paramId] || 0
      // Use counted_for_menu flag; fallback to name-based heuristic
      if (qty > 0) {
        if (param.counted_for_menu) return sum + qty
        // Fallback: count adults/children by name
        const paramName = typeof param.name === 'string'
          ? param.name.toLowerCase()
          : ((param.name as MultilingualText).vi || (param.name as MultilingualText).en || '').toLowerCase()
        if (paramName.includes('người lớn') || paramName.includes('adult') ||
            paramName.includes('trẻ em') || paramName.includes('child') ||
            paramName.includes('>10') || paramName.includes('> 10') ||
            paramName.includes('6-10') || paramName.includes('6- 10') || paramName.includes('6 - 10')) {
          return sum + qty
        }
      }
      return sum
    }, 0)
  }, [tent.itemParameters, tent.parameterQuantities])

  return (
    <div className="space-y-6 py-4">
      {/* Date overlap warning */}
      {overlapWarning && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{overlapWarning}</AlertDescription>
        </Alert>
      )}

      {/* Section 1: Item Selection */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm">1</span>
          {locale === 'vi' ? 'Chọn Item' : 'Select Item'}
          <span className="text-red-500">*</span>
        </h3>
        <GlampingItemSelector
          zoneId={zoneId}
          selectedItemId={tent.itemId}
          onItemChange={handleItemChange}
          locale={locale}
        />
      </div>

      {/* Section 2: Dates & Parameters */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm">2</span>
          {locale === 'vi' ? 'Chọn Ngày & Parameters' : 'Select Dates & Parameters'}
          <span className="text-red-500">*</span>
        </h3>
        <GlampingDateRangePickerWithCalendar
          itemId={tent.itemId}
          dateRange={tent.dateRange}
          onDateRangeChange={handleDateRangeChange}
          locale={locale}
          disabled={!tent.itemId}
          parameters={tent.itemParameters}
          parameterQuantities={tent.parameterQuantities}
          onQuantitiesChange={handleParameterQuantitiesChange}
          loadingParameters={tent.loadingItemDetails}
          allowPastDates
        />
      </div>

      {/* Section 3: Menu Products (per-tent) */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm">3</span>
          {locale === 'vi' ? 'Menu Items (Tuỳ chọn)' : 'Menu Items (Optional)'}
        </h3>
        <GlampingMenuProductsSelector
          zoneId={zoneId}
          selectedProducts={tent.menuProducts}
          onProductsChange={handleMenuProductsChange}
          locale={locale}
          showPerProductVoucher
          voucherValidationProps={{
            zoneId,
            itemId: tent.itemId,
            checkIn: tent.checkIn,
            checkOut: tent.checkOut,
          }}
          nights={tent.nights || 1}
          checkInDate={tent.checkIn}
          totalCountedGuests={totalCountedGuests}
        />
      </div>

      {/* Section 4: Accommodation Voucher */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm">4</span>
          {locale === 'vi' ? 'Voucher lưu trú' : 'Accommodation Voucher'}
        </h3>
        <VoucherInput
          zoneId={zoneId}
          itemId={tent.itemId}
          checkIn={tent.checkIn}
          checkOut={tent.checkOut}
          totalAmount={tent.pricingBreakdown?.accommodationCost || 0}
          locale={locale}
          validationEndpoint="/api/glamping/validate-voucher"
          applicationType="accommodation"
          appliedVoucher={
            tent.accommodationVoucher
              ? {
                  id: tent.accommodationVoucher.id,
                  code: tent.accommodationVoucher.code,
                  name: '',
                  description: '',
                  discountType: tent.accommodationVoucher.discountType,
                  discountValue: tent.accommodationVoucher.discountValue,
                  discountAmount: tent.accommodationVoucher.discountAmount,
                  isStackable: false,
                }
              : null
          }
          onVoucherApplied={handleVoucherApplied}
          onVoucherRemoved={handleVoucherRemoved}
        />
      </div>

      {/* Section 5: Add-ons (Common Items) */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm">5</span>
          {locale === 'vi' ? 'Dịch vụ bổ sung' : 'Add-ons'}
        </h3>

        {addonsLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
            <span className="ml-2 text-sm text-gray-600">
              {locale === 'vi' ? 'Đang tải dịch vụ bổ sung...' : 'Loading add-ons...'}
            </span>
          </div>
        ) : addons.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">
            {locale === 'vi' ? 'Không có dịch vụ bổ sung' : 'No add-ons available'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {addons.map((addon) => {
              const selection = tent.addonSelections[addon.addon_item_id]
              const isSelected = selection?.selected || false

              return (
                <div
                  key={addon.addon_item_id}
                  className={`rounded-lg border p-3 transition-colors ${
                    isSelected ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  {/* Addon Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Package className="h-4 w-4 text-purple-600 shrink-0" />
                      <span className="font-medium text-sm">{getAddonName(addon)}</span>
                      {addon.is_required && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          {locale === 'vi' ? 'Bắt buộc' : 'Required'}
                        </Badge>
                      )}
                      {addon.price_percentage < 100 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {addon.price_percentage}%
                        </Badge>
                      )}
                    </div>
                    {!addon.is_required && (
                      <Switch
                        checked={isSelected}
                        onCheckedChange={(checked) => handleAddonToggle(addon.addon_item_id, checked, addon)}
                      />
                    )}
                  </div>

                  {/* Addon Date - single date picker for inherit_parent */}
                  {isSelected && addon.dates_setting === 'inherit_parent' && tent.dateRange?.from && tent.dateRange?.to && (() => {
                    const parentFrom = format(tent.dateRange.from!, 'yyyy-MM-dd')
                    const lastNight = new Date(tent.dateRange.to!)
                    lastNight.setDate(lastNight.getDate() - 1)
                    const parentMaxDate = format(lastNight, 'yyyy-MM-dd')

                    return (
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-600 shrink-0">{locale === 'vi' ? 'Ngày' : 'Date'}</span>
                        <input
                          type="date"
                          className="w-32 text-xs border rounded px-2 py-1"
                          value={selection?.dates?.from || parentFrom}
                          min={parentFrom}
                          max={parentMaxDate}
                          onChange={(e) => handleAddonSingleDateChange(addon.addon_item_id, e.target.value)}
                        />
                      </div>
                    )
                  })()}

                  {/* Addon Date - from/to for custom */}
                  {isSelected && addon.dates_setting === 'custom' && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 shrink-0">{locale === 'vi' ? 'Từ ngày' : 'From'}</span>
                        <input
                          type="date"
                          className="w-32 text-xs border rounded px-2 py-1"
                          value={selection?.dates?.from || ''}
                          min={addon.custom_start_date || undefined}
                          max={selection?.dates?.to || addon.custom_end_date || undefined}
                          onChange={(e) => handleAddonDateChange(addon.addon_item_id, 'from', e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 shrink-0">{locale === 'vi' ? 'Đến ngày' : 'To'}</span>
                        <input
                          type="date"
                          className="w-32 text-xs border rounded px-2 py-1"
                          value={selection?.dates?.to || ''}
                          min={selection?.dates?.from || addon.custom_start_date || undefined}
                          max={addon.custom_end_date || undefined}
                          onChange={(e) => handleAddonDateChange(addon.addon_item_id, 'to', e.target.value)}
                        />
                      </div>
                      {addon.custom_start_date && addon.custom_end_date && (
                        <p className="text-[10px] text-gray-400">
                          {format(new Date(addon.custom_start_date), 'dd/MM/yyyy')} - {format(new Date(addon.custom_end_date), 'dd/MM/yyyy')}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Addon Parameters */}
                  {isSelected && addon.parameters.length > 0 && (() => {
                    const addonPricing = addonPricingMap[addon.addon_item_id]
                    return (
                      <div className="space-y-2 mt-2">
                        {addon.parameters.map((param) => {
                          const qty = selection?.parameterQuantities[param.id] || 0
                          const paramPrice = addonPricing?.parameterPricing[param.id]
                          const pricingMode = addonPricing?.parameterPricingModes[param.id] || 'per_person'
                          const isPerGroup = pricingMode === 'per_group'
                          const paramTotal = paramPrice != null
                            ? (isPerGroup ? paramPrice : paramPrice * qty)
                            : null

                          return (
                            <div key={param.id}>
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-xs text-gray-600">
                                    {getAddonName(param)}
                                  </span>
                                  {addonPricing?.loading ? (
                                    <div><Loader2 className="h-3 w-3 animate-spin text-gray-400" /></div>
                                  ) : paramPrice != null && paramPrice > 0 ? (
                                    <div className="text-xs text-gray-500">
                                      {formatCurrency(paramPrice, locale, 'VND')}/{isPerGroup ? (locale === 'vi' ? 'nhóm' : 'group') : (locale === 'vi' ? 'người' : 'person')}
                                    </div>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => handleAddonParamQtyChange(addon.addon_item_id, param.id, -1, addon)}
                                    disabled={qty <= (param.min_quantity || 0)}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="text-sm font-medium w-6 text-center">{qty}</span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => handleAddonParamQtyChange(addon.addon_item_id, param.id, 1, addon)}
                                    disabled={qty >= (param.max_quantity || 99)}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )
                        })}

                        {/* Addon total & voucher */}
                        {!addonPricing?.loading && (() => {
                          let addonTotal = 0
                          addon.parameters.forEach((param) => {
                            const qty = selection?.parameterQuantities[param.id] || 0
                            const price = addonPricing?.parameterPricing[param.id] || 0
                            const mode = addonPricing?.parameterPricingModes[param.id] || 'per_person'
                            addonTotal += mode === 'per_group' ? price : price * qty
                          })
                          const voucherDiscount = selection?.voucher?.discountAmount || 0
                          const addonFinalTotal = Math.max(0, addonTotal - voucherDiscount)
                          return (
                            <>
                              {addonTotal > 0 && (
                                <div className="flex justify-between items-center pt-2 mt-1 border-t border-purple-200">
                                  <span className="text-xs text-gray-600">{locale === 'vi' ? 'Tổng dịch vụ' : 'Service total'}</span>
                                  <span className="text-sm font-semibold text-purple-700">
                                    {formatCurrency(addonTotal, locale, 'VND')}
                                  </span>
                                </div>
                              )}

                              {/* Price Override Section */}
                              {addonTotal > 0 && (
                                <div className="mt-2 space-y-2 bg-gray-50 p-2 rounded border border-gray-200">
                                  <div className="flex items-start gap-2">
                                    <input
                                      type="checkbox"
                                      id={`override-${addon.addon_item_id}`}
                                      checked={selection?.usePriceOverride || false}
                                      onChange={(e) => handleAddonToggleOverride(addon.addon_item_id, e.target.checked)}
                                      className="mt-1"
                                    />
                                    <div className="flex-1">
                                      <label
                                        htmlFor={`override-${addon.addon_item_id}`}
                                        className="text-xs cursor-pointer font-medium"
                                      >
                                        {locale === 'vi' ? 'Ghi đè giá thủ công' : 'Override price manually'}
                                      </label>

                                      {selection?.usePriceOverride && (
                                        <div className="mt-2 space-y-1">
                                          <CurrencyInput
                                            value={selection?.priceOverride}
                                            onValueChange={(val) => handleAddonPriceOverrideChange(addon.addon_item_id, val)}
                                            placeholder={locale === 'vi' ? 'Nhập giá...' : 'Enter price...'}
                                            locale={locale}
                                            className="w-full"
                                          />
                                          <p className="text-[10px] text-muted-foreground">
                                            💡 {locale === 'vi' ? 'Giá tính toán:' : 'Calculated price:'}{' '}
                                            {formatCurrency(addonTotal, locale, 'VND')}
                                          </p>

                                          {selection?.priceOverride !== undefined && (() => {
                                            const calculated = addonTotal || 0
                                            const override = selection.priceOverride || 0
                                            const diff = Math.abs(override - calculated)
                                            const diffPercent = calculated > 0 ? (diff / calculated) * 100 : 0

                                            if (diffPercent > 30) {
                                              return (
                                                <p className="text-[10px] text-yellow-600">
                                                  ⚠️ {locale === 'vi'
                                                    ? `Giá ghi đè khác ${diffPercent.toFixed(0)}% so với giá tính toán`
                                                    : `Override differs ${diffPercent.toFixed(0)}% from calculated`}
                                                </p>
                                              )
                                            }
                                            return null
                                          })()}

                                          {selection?.priceOverride !== undefined && selection.priceOverride <= 0 && (
                                            <p className="text-[10px] text-orange-600">
                                              ⚠️ {locale === 'vi'
                                                ? 'Giá bằng 0 hoặc âm. Xác nhận đây là dịch vụ miễn phí/hoàn tiền?'
                                                : 'Zero or negative price. Confirm this is free/refund?'}
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {selection?.usePriceOverride && selection?.voucher && (
                                    <p className="text-[10px] text-blue-600">
                                      ℹ️ {locale === 'vi'
                                        ? 'Voucher sẽ áp dụng vào giá đã ghi đè'
                                        : 'Voucher will apply to overridden price'}
                                    </p>
                                  )}
                                </div>
                              )}

                              {addonTotal > 0 && (
                                <div className="mt-2">
                                  <VoucherInput
                                    itemId={addon.addon_item_id}
                                    zoneId={zoneId}
                                    totalAmount={selection?.usePriceOverride && selection?.priceOverride !== undefined ? selection.priceOverride : addonTotal}
                                    applicationType="common_item"
                                    validationEndpoint="/api/glamping/validate-voucher"
                                    locale={locale}
                                    appliedVoucher={selection?.voucher ? {
                                      id: selection.voucher.id,
                                      code: selection.voucher.code,
                                      name: '',
                                      description: '',
                                      discountType: selection.voucher.discountType,
                                      discountValue: selection.voucher.discountValue,
                                      discountAmount: selection.voucher.discountAmount,
                                      isStackable: false,
                                    } : null}
                                    onVoucherApplied={(voucher) => handleAddonVoucherApplied(addon.addon_item_id, voucher)}
                                    onVoucherRemoved={() => handleAddonVoucherRemoved(addon.addon_item_id)}
                                  />
                                </div>
                              )}

                              {voucherDiscount > 0 && addonTotal > 0 && (
                                <div className="flex justify-between items-center pt-2 mt-1 border-t border-purple-200">
                                  <span className="text-xs font-semibold text-gray-700">{locale === 'vi' ? 'Tổng sau voucher' : 'Total after voucher'}</span>
                                  <span className="text-sm font-bold text-purple-700">
                                    {formatCurrency(addonFinalTotal, locale, 'VND')}
                                  </span>
                                </div>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    )
                  })()}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Tent Total Summary */}
      {tent.pricingBreakdown && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h4 className="font-semibold text-sm mb-3">
              {locale === 'vi' ? 'Tổng tiền lều' : 'Tent Total'}
            </h4>
            <div className="space-y-1.5 text-sm">
              {/* Accommodation */}
              <div className="flex justify-between">
                <span className="text-gray-600">{locale === 'vi' ? 'Lưu trú' : 'Accommodation'}</span>
                <span className="font-medium">{formatCurrency(tent.pricingBreakdown.accommodationCost, locale, 'VND')}</span>
              </div>

              {/* Accommodation voucher discount */}
              {tent.accommodationVoucher && tent.accommodationVoucher.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Voucher {tent.accommodationVoucher.code}</span>
                  <span>-{formatCurrency(tent.accommodationVoucher.discountAmount, locale, 'VND')}</span>
                </div>
              )}

              {/* Menu products */}
              {(() => {
                const menuTotal = Object.values(tent.menuProducts).reduce((sum, nightSels) => {
                  if (!nightSels) return sum
                  return sum + Object.values(nightSels)
                    .filter(p => p.quantity > 0)
                    .reduce((s, p) => s + p.price * p.quantity, 0)
                }, 0)
                const menuDiscount = Object.values(tent.menuProducts).reduce((sum, nightSels) => {
                  if (!nightSels) return sum
                  return sum + Object.values(nightSels)
                    .filter(p => p.quantity > 0 && p.voucher?.discountAmount)
                    .reduce((s, p) => s + (p.voucher?.discountAmount || 0), 0)
                }, 0)

                if (menuTotal <= 0) return null
                return (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{locale === 'vi' ? 'Món ăn' : 'Menu items'}</span>
                      <span className="font-medium">{formatCurrency(menuTotal, locale, 'VND')}</span>
                    </div>
                    {menuDiscount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>{locale === 'vi' ? 'Voucher món ăn' : 'Menu vouchers'}</span>
                        <span>-{formatCurrency(menuDiscount, locale, 'VND')}</span>
                      </div>
                    )}
                  </>
                )
              })()}

              {/* Addon costs */}
              {(() => {
                const addonTotal = Object.values(tent.addonSelections || {}).reduce((sum, sel) => {
                  if (!sel || !sel.selected) return sum
                  // Use override if set, otherwise use calculated totalPrice
                  const effectivePrice = sel.usePriceOverride && sel.priceOverride !== undefined
                    ? sel.priceOverride
                    : (sel.totalPrice || 0)
                  return sum + effectivePrice
                }, 0)
                const addonDiscount = Object.values(tent.addonSelections || {}).reduce((sum, sel) => {
                  if (!sel || !sel.selected) return sum
                  return sum + (sel.voucher?.discountAmount || 0)
                }, 0)
                const hasOverrides = Object.values(tent.addonSelections || {}).some(s => s.selected && s.usePriceOverride)

                if (addonTotal <= 0) return null
                return (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        {locale === 'vi' ? 'Dịch vụ bổ sung' : 'Add-ons'}
                        {hasOverrides && (
                          <span className="ml-1 text-xs text-blue-600">*</span>
                        )}
                      </span>
                      <span className="font-medium">{formatCurrency(addonTotal, locale, 'VND')}</span>
                    </div>
                    {addonDiscount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>{locale === 'vi' ? 'Voucher dịch vụ' : 'Add-on vouchers'}</span>
                        <span>-{formatCurrency(addonDiscount, locale, 'VND')}</span>
                      </div>
                    )}
                    {hasOverrides && (
                      <p className="text-[10px] text-blue-600 mt-0.5">
                        * {locale === 'vi' ? 'Có dịch vụ đã ghi đè giá' : 'Some add-ons have overridden prices'}
                      </p>
                    )}
                  </>
                )
              })()}

              {/* Total */}
              <div className="border-t border-blue-300 pt-2 mt-2 flex justify-between font-bold text-base">
                <span>{locale === 'vi' ? 'Tổng cộng' : 'Total'}</span>
                <span className="text-blue-700">
                  {(() => {
                    const accommodation = tent.pricingBreakdown.accommodationCost
                    const accDiscount = tent.accommodationVoucher?.discountAmount || 0
                    const menuTotal = Object.values(tent.menuProducts).reduce((sum, nightSels) => {
                      if (!nightSels) return sum
                      return sum + Object.values(nightSels)
                        .filter(p => p.quantity > 0)
                        .reduce((s, p) => s + p.price * p.quantity, 0)
                    }, 0)
                    const menuDiscount = Object.values(tent.menuProducts).reduce((sum, nightSels) => {
                      if (!nightSels) return sum
                      return sum + Object.values(nightSels)
                        .filter(p => p.quantity > 0 && p.voucher?.discountAmount)
                        .reduce((s, p) => s + (p.voucher?.discountAmount || 0), 0)
                    }, 0)
                    const addonTotal = Object.values(tent.addonSelections || {}).reduce((sum, sel) => {
                      if (!sel || !sel.selected) return sum
                      // Use override if set, otherwise use calculated totalPrice
                      const effectivePrice = sel.usePriceOverride && sel.priceOverride !== undefined
                        ? sel.priceOverride
                        : (sel.totalPrice || 0)
                      return sum + effectivePrice
                    }, 0)
                    const addonDiscount = Object.values(tent.addonSelections || {}).reduce((sum, sel) => {
                      if (!sel || !sel.selected) return sum
                      return sum + (sel.voucher?.discountAmount || 0)
                    }, 0)
                    return formatCurrency(accommodation - accDiscount + menuTotal - menuDiscount + addonTotal - addonDiscount, locale, 'VND')
                  })()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
