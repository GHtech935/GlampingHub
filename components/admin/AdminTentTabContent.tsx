'use client'

import { useEffect, useMemo, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { GlampingItemSelector } from './GlampingItemSelector'
import { GlampingDateRangePickerWithCalendar } from './GlampingDateRangePickerWithCalendar'
import { GlampingMenuProductsSelector, type SelectedMenuProduct } from './GlampingMenuProductsSelector'
import VoucherInput, { type AppliedVoucher } from '@/components/booking/VoucherInput'
import { format } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { type MultilingualText, getLocalizedText } from '@/lib/i18n-utils'

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
  pricingBreakdown: {
    accommodationCost: number
    menuProductsCost: number
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
                    return formatCurrency(accommodation - accDiscount + menuTotal - menuDiscount, locale, 'VND')
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
