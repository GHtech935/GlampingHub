'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Calculator,
  Tag,
  TrendingDown,
  Receipt,
  Loader2,
  Check,
  AlertCircle
} from 'lucide-react'

interface PricingData {
  nights: number
  accommodation: any
  products: any
  voucher: any | null
  totals: any
}

interface PricingModeSectionProps {
  pitchId?: string
  checkInDate?: string
  checkOutDate?: string
  adults?: number
  childrenCount?: number
  selectedProducts?: Array<{ pitchProductId: string; quantity: number }>
  customerId?: string
  voucherCode?: string
  onVoucherChange: (code: string) => void
  onPricingCalculated?: (pricing: PricingData) => void
  locale?: string
}

export function PricingModeSection({
  pitchId,
  checkInDate,
  checkOutDate,
  adults = 2,
  childrenCount = 0,
  selectedProducts = [],
  customerId,
  voucherCode = '',
  onVoucherChange,
  onPricingCalculated,
  locale = 'vi'
}: PricingModeSectionProps) {
  const [pricing, setPricing] = useState<PricingData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [voucherInput, setVoucherInput] = useState('')
  const [voucherApplied, setVoucherApplied] = useState(false)

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  // Fetch pricing when all required fields are filled
  useEffect(() => {
    if (!pitchId || !checkInDate || !checkOutDate) {
      return
    }

    // Create a debounce timer to avoid rapid re-fetching
    const timer = setTimeout(async () => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams({
          pitchId,
          checkInDate,
          checkOutDate,
          adults: adults.toString(),
          children: childrenCount.toString()
        })

        // Add products with quantities
        if (selectedProducts.length > 0) {
          params.append('productIds', selectedProducts.map(p => p.pitchProductId).join(','))
          params.append('productQuantities', selectedProducts.map(p => p.quantity).join(','))
        }

        if (voucherCode && voucherApplied) {
          params.append('discountCode', voucherCode)
        }

        if (customerId) {
          params.append('customerId', customerId)
        }

        const response = await fetch(`/api/admin/bookings/calculate-pricing?${params}`)
        const data = await response.json()

        if (response.ok && data.success) {
          setPricing(data.pricing)
          if (onPricingCalculated) {
            onPricingCalculated(data.pricing)
          }
        } else {
          setError(data.error || 'Failed to calculate pricing')
        }
      } catch (err: any) {
        setError(err.message || 'Error fetching pricing')
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pitchId, checkInDate, checkOutDate, adults, childrenCount, JSON.stringify(selectedProducts), voucherCode, voucherApplied, customerId])

  const handleApplyVoucher = () => {
    onVoucherChange(voucherInput)
    setVoucherApplied(true)
  }

  const handleRemoveVoucher = () => {
    onVoucherChange('')
    setVoucherInput('')
    setVoucherApplied(false)
  }

  return (
    <div className="space-y-4">
      {/* Pricing Mode Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {locale === 'vi' ? 'Tính giá' : 'Pricing'}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
              {/* Loading state */}
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-600">
                    {locale === 'vi' ? 'Đang tính giá...' : 'Calculating pricing...'}
                  </span>
                </div>
              )}

              {/* Error state */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-900">
                      {locale === 'vi' ? 'Lỗi tính giá' : 'Pricing Error'}
                    </p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              )}

              {/* Pricing breakdown */}
              {!loading && !error && pricing && (
                <div className="space-y-3">
                  {/* Accommodation */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {locale === 'vi' ? 'Tiền thuê slot' : 'Accommodation'}
                        {' '}({pricing.nights} {locale === 'vi' ? 'đêm' : pricing.nights === 1 ? 'night' : 'nights'})
                      </span>
                      <div className="text-right">
                        {pricing.accommodation.autoDiscountTotal > 0 && (
                          <p className="text-xs text-gray-400 line-through">
                            {formatCurrency(pricing.accommodation.beforeDiscounts)}
                          </p>
                        )}
                        <p className={pricing.accommodation.autoDiscountTotal > 0 ? 'text-green-600 font-semibold' : ''}>
                          {formatCurrency(pricing.accommodation.afterAutoDiscounts)}
                        </p>
                      </div>
                    </div>

                    {/* Auto discounts summary */}
                    {pricing.accommodation.autoDiscountTotal > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded px-2 py-1.5">
                        <p className="text-xs text-green-800 flex items-center gap-1">
                          <TrendingDown className="h-3 w-3" />
                          {locale === 'vi' ? 'Giảm giá tự động: ' : 'Auto-discounts: '}
                          <span className="font-semibold">
                            -{formatCurrency(pricing.accommodation.autoDiscountTotal)}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Products */}
                  {pricing.products.items.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {locale === 'vi' ? 'Sản phẩm & Extras' : 'Products & Extras'}
                        </span>
                        <p>{formatCurrency(pricing.products.total)}</p>
                      </div>
                      {pricing.products.discountTotal > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded px-2 py-1.5">
                          <p className="text-xs text-blue-800">
                            {locale === 'vi' ? 'Giảm giá: ' : 'Discounts: '}
                            -{formatCurrency(pricing.products.discountTotal)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Voucher input */}
                  <div className="pt-2 border-t">
                    <Label className="text-sm flex items-center gap-1 mb-2">
                      <Tag className="h-3.5 w-3.5" />
                      {locale === 'vi' ? 'Mã giảm giá (voucher)' : 'Voucher Code'}
                    </Label>

                    {pricing.voucher ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-yellow-900 flex items-center gap-1">
                              <Check className="h-4 w-4" />
                              {pricing.voucher.code}
                            </p>
                            <p className="text-xs text-yellow-700 mt-1">{pricing.voucher.name}</p>
                            <p className="text-sm font-semibold text-yellow-900 mt-2">
                              -{formatCurrency(pricing.voucher.amount)}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveVoucher}
                          >
                            {locale === 'vi' ? 'Xóa' : 'Remove'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder={locale === 'vi' ? 'Nhập mã giảm giá' : 'Enter voucher code'}
                          value={voucherInput}
                          onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                          disabled={voucherApplied}
                        />
                        <Button
                          type="button"
                          onClick={handleApplyVoucher}
                          disabled={!voucherInput || voucherApplied}
                          size="sm"
                        >
                          {locale === 'vi' ? 'Áp dụng' : 'Apply'}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Totals */}
                  <div className="pt-3 border-t space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        {locale === 'vi' ? 'Tạm tính' : 'Subtotal'}
                      </span>
                      <span>{formatCurrency(pricing.totals.subtotal)}</span>
                    </div>

                    {pricing.totals.totalDiscounts > 0 && (
                      <div className="flex items-center justify-between text-sm text-green-600">
                        <span>{locale === 'vi' ? 'Tổng tiết kiệm' : 'Total Savings'}</span>
                        <span className="font-semibold">-{formatCurrency(pricing.totals.totalDiscounts)}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 flex items-center gap-1">
                        <Receipt className="h-3.5 w-3.5" />
                        {locale === 'vi' ? 'Thuế' : 'Tax'} ({pricing.accommodation.taxRate}%)
                      </span>
                      <span>{formatCurrency(pricing.totals.totalTax)}</span>
                    </div>

                    <div className="flex items-center justify-between text-lg font-bold pt-2 border-t">
                      <span>{locale === 'vi' ? 'Tổng cộng' : 'Grand Total'}</span>
                      <span className="text-green-600">{formatCurrency(pricing.totals.grandTotal)}</span>
                    </div>

                    {pricing.totals.depositAmount > 0 ? (
                      <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-blue-900">
                            {locale === 'vi'
                              ? `Đặt cọc ${pricing.totals.depositType === 'percentage' ? `(${pricing.totals.depositPercentage}%)` : ''}`
                              : `Deposit ${pricing.totals.depositType === 'percentage' ? `(${pricing.totals.depositPercentage}%)` : ''}`}
                          </span>
                          <span className="font-semibold text-blue-900">
                            {formatCurrency(pricing.totals.depositAmount)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-blue-700">
                            {locale === 'vi' ? 'Còn lại (trả khi check-in)' : 'Balance (pay at check-in)'}
                          </span>
                          <span className="text-blue-700">
                            {formatCurrency(pricing.totals.balanceAmount)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded p-2 text-xs">
                        <p className="text-gray-600 text-center">
                          {locale === 'vi'
                            ? 'Không yêu cầu đặt cọc - Thanh toán toàn bộ khi check-in'
                            : 'No deposit required - Pay full amount at check-in'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!loading && !error && !pricing && (
                <div className="text-center py-6 text-gray-500 text-sm">
                  {locale === 'vi'
                    ? 'Điền đầy đủ thông tin slot và ngày để xem giá'
                    : 'Fill in slot and dates to see pricing'}
                </div>
              )}
        </CardContent>
      </Card>
    </div>
  )
}
