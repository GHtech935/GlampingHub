'use client'

import { useState, useEffect, useMemo } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, UtensilsCrossed, Plus, Minus, Ticket, X, CheckCircle2, ImageOff } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { type MultilingualText, getLocalizedText } from '@/lib/i18n-utils'
import { format, addDays, parseISO } from 'date-fns'

interface MenuItem {
  id: string
  name: MultilingualText | string
  description?: MultilingualText | string | null
  category: string
  category_name: MultilingualText | string
  price: number
  unit: MultilingualText | string
  is_available: boolean
  max_quantity?: number
  requires_advance_booking: boolean
  advance_hours?: number
  min_guests?: number | null
  max_guests?: number | null
  image_url?: string | null
}

export interface SelectedMenuProduct {
  id: string
  name: string
  quantity: number
  price: number
  unit: string
  voucher?: {
    code: string
    id: string
    discountType: string
    discountValue: number
    discountAmount: number
  } | null
}

interface GlampingMenuProductsSelectorProps {
  zoneId: string
  selectedProducts: Record<number, Record<string, SelectedMenuProduct>>
  onProductsChange: (products: Record<number, Record<string, SelectedMenuProduct>>) => void
  locale?: string
  disabled?: boolean
  hideZeroPriceItems?: boolean
  showPerProductVoucher?: boolean
  voucherValidationProps?: {
    zoneId: string
    itemId?: string
    checkIn?: string
    checkOut?: string
  }
  nights: number
  checkInDate?: string // yyyy-MM-dd
  totalCountedGuests?: number
}

export function GlampingMenuProductsSelector({
  zoneId,
  selectedProducts,
  onProductsChange,
  locale = 'vi',
  disabled = false,
  hideZeroPriceItems = false,
  showPerProductVoucher = false,
  voucherValidationProps,
  nights,
  checkInDate,
  totalCountedGuests,
}: GlampingMenuProductsSelectorProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeNight, setActiveNight] = useState<number>(0)

  // Reset activeNight when nights decrease
  useEffect(() => {
    if (activeNight >= nights && nights > 0) {
      setActiveNight(0)
    }
  }, [nights, activeNight])

  // Fetch menu items when zoneId changes
  useEffect(() => {
    const fetchMenuItems = async () => {
      if (!zoneId) {
        setMenuItems([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/admin/glamping/menu?zone_id=${zoneId}`)

        if (!response.ok) {
          throw new Error('Failed to fetch menu items')
        }

        const data = await response.json()
        // Filter only available items
        const availableItems = (data.menuItems || []).filter((item: MenuItem) => item.is_available)
        setMenuItems(availableItems)
      } catch (err) {
        console.error('Error fetching menu items:', err)
        setError(locale === 'vi'
          ? 'Không thể tải danh sách menu'
          : 'Failed to load menu items'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchMenuItems()
  }, [zoneId, locale])

  // Active night selections
  const activeNightSelections = useMemo(() => {
    return selectedProducts[activeNight] || {}
  }, [selectedProducts, activeNight])

  // Total combo guests for active night (for max quantity calculation)
  const totalComboGuests = useMemo(() => {
    return Object.entries(activeNightSelections).reduce((sum, [productId, selection]) => {
      if (!selection) return sum
      const item = menuItems.find(m => m.id === productId)
      if (!item) return sum
      if (item.min_guests !== null && item.min_guests !== undefined &&
          item.max_guests !== null && item.max_guests !== undefined) {
        return sum + (item.max_guests * selection.quantity)
      }
      return sum
    }, 0)
  }, [activeNightSelections, menuItems])

  // Calculate max quantity for a menu item (guest-based limits)
  const getMaxQuantity = (item: MenuItem): number => {
    const { min_guests, max_guests } = item

    // Traditional item (no guest limits) - use max_quantity or unlimited
    if (min_guests === null || min_guests === undefined ||
        max_guests === null || max_guests === undefined) {
      return item.max_quantity || 999
    }

    // If no totalCountedGuests, allow unlimited
    if (totalCountedGuests === undefined || totalCountedGuests === 0) {
      return item.max_quantity || 999
    }

    // Calculate remaining guests excluding current product
    const currentQty = activeNightSelections[item.id]?.quantity || 0
    const currentProductGuests = currentQty * max_guests
    const otherComboGuests = totalComboGuests - currentProductGuests
    const remainingGuests = Math.max(0, totalCountedGuests - otherComboGuests)

    if (remainingGuests === 0) {
      return currentQty // Keep current, don't allow increasing
    }

    // FIX: For fixed combos (min_guests = max_guests), use floor to ensure
    // total servings don't exceed guest count
    // For variable combos, ceil allows flexibility
    const isFixedCombo = min_guests === max_guests
    const guestBasedMax = isFixedCombo
      ? Math.floor(remainingGuests / max_guests)  // Fixed: 5/2 = 2 (4 servings ≤ 5 guests)
      : Math.ceil(remainingGuests / max_guests)   // Variable: allows flexibility

    // Also respect max_quantity if set
    return item.max_quantity ? Math.min(guestBasedMax, item.max_quantity) : guestBasedMax
  }

  const handleQuantityChange = (item: MenuItem, quantity: number) => {
    const maxQty = getMaxQuantity(item)
    const finalQty = Math.max(0, Math.min(quantity, maxQty))

    const newProducts = { ...selectedProducts }
    const nightSels = { ...(newProducts[activeNight] || {}) }

    if (finalQty <= 0) {
      delete nightSels[item.id]
    } else {
      nightSels[item.id] = {
        id: item.id,
        name: typeof item.name === 'string' ? item.name : getLocalizedText(item.name, locale as 'vi' | 'en'),
        quantity: finalQty,
        price: item.price,
        unit: typeof item.unit === 'string' ? item.unit : getLocalizedText(item.unit, locale as 'vi' | 'en'),
        voucher: nightSels[item.id]?.voucher || null,
      }
    }

    newProducts[activeNight] = nightSels
    onProductsChange(newProducts)
  }

  const incrementQuantity = (item: MenuItem) => {
    const currentQty = activeNightSelections[item.id]?.quantity || 0
    handleQuantityChange(item, currentQty + 1)
  }

  const decrementQuantity = (item: MenuItem) => {
    const currentQty = activeNightSelections[item.id]?.quantity || 0
    if (currentQty > 0) {
      handleQuantityChange(item, currentQty - 1)
    }
  }

  // Per-product voucher handling
  const [productVoucherCodes, setProductVoucherCodes] = useState<Record<string, string>>({})
  const [productVoucherLoading, setProductVoucherLoading] = useState<Record<string, boolean>>({})
  const [productVoucherErrors, setProductVoucherErrors] = useState<Record<string, string>>({})

  const handleApplyProductVoucher = async (productId: string) => {
    const code = productVoucherCodes[productId]?.trim()
    if (!code) return

    setProductVoucherLoading(prev => ({ ...prev, [productId]: true }))
    setProductVoucherErrors(prev => ({ ...prev, [productId]: '' }))

    try {
      const product = activeNightSelections[productId]
      if (!product) return

      const response = await fetch('/api/glamping/validate-voucher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          zoneId: voucherValidationProps?.zoneId || '',
          itemId: productId,
          totalAmount: product.price * product.quantity,
          applicationType: 'menu_only',
        }),
      })

      const data = await response.json()

      if (response.ok && data.valid) {
        const newProducts = { ...selectedProducts }
        const nightSels = { ...(newProducts[activeNight] || {}) }
        nightSels[productId] = {
          ...nightSels[productId],
          voucher: {
            code: data.voucher.code,
            id: data.voucher.id,
            discountType: data.voucher.discountType,
            discountValue: data.voucher.discountValue,
            discountAmount: data.discountAmount,
          },
        }
        newProducts[activeNight] = nightSels
        onProductsChange(newProducts)
        setProductVoucherCodes(prev => ({ ...prev, [productId]: '' }))
      } else {
        setProductVoucherErrors(prev => ({
          ...prev,
          [productId]: data.error || (locale === 'vi' ? 'Mã không hợp lệ' : 'Invalid code'),
        }))
      }
    } catch {
      setProductVoucherErrors(prev => ({
        ...prev,
        [productId]: locale === 'vi' ? 'Lỗi xác thực' : 'Validation error',
      }))
    } finally {
      setProductVoucherLoading(prev => ({ ...prev, [productId]: false }))
    }
  }

  const handleRemoveProductVoucher = (productId: string) => {
    const newProducts = { ...selectedProducts }
    const nightSels = { ...(newProducts[activeNight] || {}) }
    nightSels[productId] = { ...nightSels[productId], voucher: null }
    newProducts[activeNight] = nightSels
    onProductsChange(newProducts)
  }

  // Filter and group menu items by category
  const filteredMenuItems = hideZeroPriceItems
    ? menuItems.filter(item => item.price !== undefined && item.price !== null && item.price > 0)
    : menuItems

  const groupedItems = filteredMenuItems.reduce((acc, item) => {
    const categoryName = typeof item.category_name === 'string'
      ? item.category_name
      : getLocalizedText(item.category_name, locale as 'vi' | 'en') || 'Other'
    if (!acc[categoryName]) {
      acc[categoryName] = []
    }
    acc[categoryName].push(item)
    return acc
  }, {} as Record<string, MenuItem[]>)

  // Calculate total across ALL nights (subtract voucher discounts)
  const totalAmount = useMemo(() => {
    return Object.values(selectedProducts).reduce((sum, nightSels) => {
      if (!nightSels) return sum
      return sum + Object.values(nightSels).reduce((nightSum, product) => {
        if (!product) return nightSum
        const lineTotal = product.price * product.quantity
        const discount = product.voucher?.discountAmount || 0
        return nightSum + lineTotal - discount
      }, 0)
    }, 0)
  }, [selectedProducts])

  // Check if a specific night has valid combo coverage
  const isNightValid = (nightIndex: number): boolean => {
    if (totalCountedGuests === undefined || totalCountedGuests === 0) return true

    const nightSels = selectedProducts[nightIndex] || {}
    const nightComboGuests = Object.entries(nightSels).reduce((sum, [productId, selection]) => {
      if (!selection) return sum
      const item = menuItems.find(m => m.id === productId)
      if (!item) return sum
      if (item.min_guests !== null && item.min_guests !== undefined &&
          item.max_guests !== null && item.max_guests !== undefined) {
        return sum + (item.max_guests * selection.quantity)
      }
      return sum
    }, 0)

    return nightComboGuests >= totalCountedGuests
  }

  // Has any selections across all nights
  const hasAnySelections = useMemo(() => {
    return Object.values(selectedProducts).some(nightSels =>
      nightSels && Object.values(nightSels).some(p => p && p.quantity > 0)
    )
  }, [selectedProducts])

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  const effectiveNights = nights || 1
  const showTabs = effectiveNights > 1

  // Render the product list for the active night
  const renderProductList = () => (
    <>
      {Object.entries(groupedItems).map(([categoryName, items]) => (
        <div key={categoryName} className="space-y-2">
          <h4 className="font-medium text-sm text-gray-700">{categoryName}</h4>
          <div className="grid gap-2">
            {items.map(item => {
              const quantity = activeNightSelections[item.id]?.quantity || 0
              const productVoucher = activeNightSelections[item.id]?.voucher
              const maxQty = getMaxQuantity(item)
              const isAtMax = quantity >= maxQty
              const isCombo = item.min_guests !== null && item.min_guests !== undefined &&
                              item.max_guests !== null && item.max_guests !== undefined

              return (
                <Card key={item.id} className={disabled ? 'opacity-50' : ''}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        {item.image_url ? (
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                            <Image
                              src={item.image_url}
                              alt={typeof item.name === 'string' ? item.name : getLocalizedText(item.name, locale as 'vi' | 'en')}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                            <ImageOff className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {typeof item.name === 'string' ? item.name : getLocalizedText(item.name, locale as 'vi' | 'en')}
                          </span>
                          {item.requires_advance_booking && item.advance_hours && (
                            <Badge variant="outline" className="text-xs">
                              {locale === 'vi'
                                ? `Đặt trước ${item.advance_hours}h`
                                : `${item.advance_hours}h advance`
                              }
                            </Badge>
                          )}
                          {/* Combo badge */}
                          {isCombo && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                              {item.min_guests === item.max_guests
                                ? `Combo ${item.max_guests} người`
                                : `${item.min_guests}-${item.max_guests} người`
                              }
                            </Badge>
                          )}
                          {/* Max limit hint for combo items */}
                          {isCombo && maxQty < 999 && totalCountedGuests !== undefined && totalCountedGuests > 0 && (
                            <span className="text-xs text-gray-500">
                              ({locale === 'vi' ? 'Tối đa' : 'Max'}: {maxQty})
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">
                            {typeof item.description === 'string' ? item.description : getLocalizedText(item.description, locale as 'vi' | 'en')}
                          </p>
                        )}
                        <p className="text-sm font-medium text-gray-900 mt-1">
                          {item.price === 0 ? (
                            <span className="text-green-600">{locale === 'vi' ? 'Miễn phí' : 'Free'}</span>
                          ) : (
                            <>
                              {formatCurrency(item.price, locale, 'VND')}
                              {item.unit && (
                                <span className="text-xs text-gray-500">
                                  /{typeof item.unit === 'string' ? item.unit : getLocalizedText(item.unit, locale as 'vi' | 'en')}
                                </span>
                              )}
                            </>
                          )}
                        </p>
                        {!isCombo && item.max_quantity && (
                          <p className="text-xs text-gray-500">
                            {locale === 'vi' ? 'Tối đa' : 'Max'}: {item.max_quantity}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => decrementQuantity(item)}
                          disabled={disabled || quantity === 0}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          min="0"
                          max={maxQty}
                          value={quantity}
                          onChange={(e) => handleQuantityChange(item, parseInt(e.target.value) || 0)}
                          className="h-8 w-16 text-center"
                          disabled={disabled}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => incrementQuantity(item)}
                          disabled={disabled || isAtMax}
                          title={isAtMax ? `${locale === 'vi' ? 'Tối đa' : 'Max'} ${maxQty}` : ''}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Per-product voucher input - only show for non-zero prices */}
                    {showPerProductVoucher && quantity > 0 && item.price !== undefined && item.price !== null && item.price > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        {productVoucher ? (
                          <div className="flex items-center gap-2 bg-green-50 rounded px-2 py-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                            <Badge variant="default" className="font-mono text-xs">
                              {productVoucher.code}
                            </Badge>
                            <span className="text-xs text-green-700">
                              {productVoucher.discountType === 'percentage'
                                ? `(-${productVoucher.discountValue}%)`
                                : `(-${formatCurrency(productVoucher.discountAmount, locale, 'VND')})`
                              }
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 ml-auto"
                              onClick={() => handleRemoveProductVoucher(item.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex gap-1.5">
                              <Ticket className="h-3.5 w-3.5 text-gray-400 mt-1.5 flex-shrink-0" />
                              <Input
                                type="text"
                                placeholder={locale === 'vi' ? 'Mã giảm giá...' : 'Discount code...'}
                                value={productVoucherCodes[item.id] || ''}
                                onChange={(e) => setProductVoucherCodes(prev => ({
                                  ...prev,
                                  [item.id]: e.target.value.toUpperCase(),
                                }))}
                                onKeyDown={(e) => e.key === 'Enter' && handleApplyProductVoucher(item.id)}
                                className="h-7 text-xs flex-1"
                                disabled={disabled || productVoucherLoading[item.id]}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs px-2"
                                onClick={() => handleApplyProductVoucher(item.id)}
                                disabled={disabled || !productVoucherCodes[item.id]?.trim() || productVoucherLoading[item.id]}
                              >
                                {productVoucherLoading[item.id]
                                  ? '...'
                                  : (locale === 'vi' ? 'Áp dụng' : 'Apply')
                                }
                              </Button>
                            </div>
                            {productVoucherErrors[item.id] && (
                              <p className="text-xs text-red-500 pl-5">{productVoucherErrors[item.id]}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ))}

      {/* Combo validation summary per night */}
      {totalCountedGuests !== undefined && totalCountedGuests > 0 && (
        <div className={`p-3 rounded-lg border text-sm ${
          totalComboGuests >= totalCountedGuests
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span>{locale === 'vi' ? 'Số khách cần món ăn:' : 'Guests needing food:'}</span>
              <strong>{totalCountedGuests} {locale === 'vi' ? 'người' : 'guests'}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>{locale === 'vi' ? 'Đã chọn combo cho:' : 'Combo selected for:'}</span>
              <strong>{totalComboGuests} {locale === 'vi' ? 'người' : 'guests'}</strong>
            </div>
            {totalComboGuests < totalCountedGuests && (
              <div className="text-red-600 font-medium pt-1.5 border-t border-red-200">
                {locale === 'vi'
                  ? `Thiếu ${totalCountedGuests - totalComboGuests} người - Vui lòng chọn thêm combo`
                  : `Missing ${totalCountedGuests - totalComboGuests} guests - Please select more combos`
                }
              </div>
            )}
            {totalComboGuests >= totalCountedGuests && (
              <div className="text-green-600 font-medium pt-1.5 border-t border-green-200">
                {locale === 'vi'
                  ? (showTabs ? 'Đủ combo cho đêm này' : 'Đủ combo cho tất cả khách')
                  : (showTabs ? 'Enough combos for this night' : 'Enough combos for all guests')
                }
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )

  return (
    <div className="space-y-4">
      <div>
        <Label className="flex items-center gap-2">
          <UtensilsCrossed className="h-4 w-4" />
          {locale === 'vi' ? 'Menu Items (Tùy chọn)' : 'Menu Items (Optional)'}
        </Label>
        <p className="text-xs text-gray-600 mt-1">
          {locale === 'vi'
            ? 'Thêm các món ăn, đồ uống hoặc dịch vụ cho booking'
            : 'Add food, beverages or services to the booking'
          }
        </p>
      </div>

      {loading && (
        <p className="text-sm text-gray-600">
          {locale === 'vi' ? 'Đang tải menu...' : 'Loading menu...'}
        </p>
      )}

      {!loading && filteredMenuItems.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {locale === 'vi'
              ? 'Không có menu items nào trong zone này'
              : 'No menu items available in this zone'
            }
          </AlertDescription>
        </Alert>
      )}

      {!loading && Object.keys(groupedItems).length > 0 && (
        <div className="space-y-4">
          {showTabs ? (
            <Tabs value={String(activeNight)} onValueChange={(val) => setActiveNight(parseInt(val))}>
              <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${effectiveNights}, minmax(0, 1fr))` }}>
                {Array.from({ length: effectiveNights }).map((_, index) => {
                  const date = checkInDate ? addDays(parseISO(checkInDate), index) : null
                  const label = date
                    ? `${locale === 'vi' ? 'Ngày' : 'Day'} ${index + 1} (${format(date, 'dd/MM')})`
                    : `${locale === 'vi' ? 'Ngày' : 'Day'} ${index + 1}`
                  const hasError = !isNightValid(index)

                  return (
                    <TabsTrigger
                      key={index}
                      value={String(index)}
                      className={hasError ? 'border-red-500 data-[state=active]:border-red-600' : ''}
                    >
                      {label}
                      {hasError && <AlertCircle className="ml-1 h-3 w-3 text-red-500" />}
                    </TabsTrigger>
                  )
                })}
              </TabsList>

              {Array.from({ length: effectiveNights }).map((_, nightIndex) => (
                <TabsContent key={nightIndex} value={String(nightIndex)} className="space-y-4 mt-4">
                  {renderProductList()}
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            renderProductList()
          )}
        </div>
      )}

      {/* Selected Products Summary — Aggregate across ALL nights */}
      {hasAnySelections && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3">
            <h4 className="font-medium text-sm mb-2">
              {locale === 'vi' ? 'Đã chọn' : 'Selected'}:
            </h4>
            <div className="space-y-1">
              {Array.from({ length: effectiveNights }).map((_, nightIndex) => {
                const nightSels = selectedProducts[nightIndex] || {}
                const nightProducts = Object.values(nightSels).filter((p): p is SelectedMenuProduct => !!p && p.quantity > 0)
                if (nightProducts.length === 0) return null

                const nightDate = checkInDate ? addDays(parseISO(checkInDate), nightIndex) : null
                const nightLabel = showTabs
                  ? (nightDate
                    ? `${locale === 'vi' ? 'Ngày' : 'Day'} ${nightIndex + 1} (${format(nightDate, 'dd/MM')})`
                    : `${locale === 'vi' ? 'Ngày' : 'Day'} ${nightIndex + 1}`)
                  : null

                return (
                  <div key={nightIndex}>
                    {nightLabel && (
                      <p className="text-xs font-semibold text-gray-500 mt-1.5 mb-0.5">{nightLabel}</p>
                    )}
                    {nightProducts.map(product => {
                      const lineTotal = product.price * product.quantity
                      const discount = product.voucher?.discountAmount || 0
                      return (
                        <div key={`${nightIndex}-${product.id}`}>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-700">
                              {product.name} x{product.quantity}
                            </span>
                            <span className={`font-medium ${discount > 0 ? 'line-through text-gray-400' : ''}`}>
                              {formatCurrency(lineTotal, locale, 'VND')}
                            </span>
                          </div>
                          {discount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-green-600 text-xs">
                                Voucher {product.voucher?.code} (-{formatCurrency(discount, locale, 'VND')})
                              </span>
                              <span className="font-medium text-green-600">
                                {formatCurrency(lineTotal - discount, locale, 'VND')}
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
              <div className="border-t border-blue-300 pt-1 mt-2 flex justify-between font-medium">
                <span>{locale === 'vi' ? 'Tổng cộng' : 'Total'}:</span>
                <span>{formatCurrency(totalAmount, locale, 'VND')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
