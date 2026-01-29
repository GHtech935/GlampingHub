'use client'

import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Users, Info } from 'lucide-react'
import { type MultilingualText, getLocalizedText } from '@/lib/i18n-utils'
import { formatCurrency } from '@/lib/utils'
import type { DateRange } from 'react-day-picker'

interface GlampingParameter {
  id: string
  parameter_id: string // The actual parameter ID from glamping_parameters
  name: MultilingualText | string
  color_code: string
  controls_inventory: boolean
  sets_pricing: boolean
  min_quantity?: number
  max_quantity?: number
}

interface NightlyPricing {
  date: string
  pricing: Record<string, number>
}

interface GlampingParameterSelectorProps {
  parameters: GlampingParameter[]
  parameterQuantities: Record<string, number>
  onQuantitiesChange: (quantities: Record<string, number>) => void
  locale?: string
  disabled?: boolean

  // Pricing props
  parameterPricing?: Record<string, number>  // Total price per parameter for all nights
  nights?: number  // Number of nights selected
  dateRange?: DateRange  // To check if dates are selected
  nightlyParameterPricing?: NightlyPricing[]  // Per-night pricing breakdown
}

export function GlampingParameterSelector({
  parameters,
  parameterQuantities,
  onQuantitiesChange,
  locale = 'vi',
  disabled = false,
  parameterPricing,
  nights,
  dateRange,
  nightlyParameterPricing = [],
}: GlampingParameterSelectorProps) {
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Validate quantities whenever they change
  useEffect(() => {
    const errors: Record<string, string> = {}

    parameters.forEach(param => {
      const paramId = param.parameter_id || param.id
      const quantity = parameterQuantities[paramId] || 0

      // Check min quantity
      if (param.min_quantity !== undefined && param.min_quantity !== null && quantity < param.min_quantity) {
        errors[paramId] = locale === 'vi'
          ? `Tối thiểu: ${param.min_quantity}`
          : `Minimum: ${param.min_quantity}`
      }

      // Check max quantity
      if (param.max_quantity !== undefined && param.max_quantity !== null && quantity > param.max_quantity) {
        errors[paramId] = locale === 'vi'
          ? `Tối đa: ${param.max_quantity}`
          : `Maximum: ${param.max_quantity}`
      }
    })

    setValidationErrors(errors)
  }, [parameterQuantities, parameters, locale])

  const handleQuantityChange = (paramId: string, value: string) => {
    const quantity = parseInt(value) || 0
    const newQuantities = {
      ...parameterQuantities,
      [paramId]: quantity
    }
    onQuantitiesChange(newQuantities)
  }

  // Check if at least one parameter has quantity > 0
  const hasAnyQuantity = Object.values(parameterQuantities).some(q => q > 0)

  if (parameters.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {locale === 'vi'
            ? 'Item này chưa có parameters được cấu hình'
            : 'This item has no parameters configured'
          }
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      
      <div className="grid gap-3">
        {parameters.map(param => {
          const paramId = param.parameter_id || param.id
          const quantity = parameterQuantities[paramId] || 0
          const hasError = validationErrors[paramId]
          const paramName = getLocalizedText(param.name, locale as 'vi' | 'en')

          // Pricing data
          const totalPrice = parameterPricing?.[paramId] || 0
          const hasPricing = dateRange?.from && dateRange?.to && totalPrice > 0

          // Per-night prices for this parameter
          const nightPrices = nightlyParameterPricing
            .map(n => n.pricing[paramId] || 0)
            .filter((_, i) => i < (nights || 0))
          const allSamePrice = nightPrices.length > 0 && nightPrices.every(p => p === nightPrices[0])

          return (
            <div
              key={paramId}
              className="border-l-2 rounded-lg p-2 bg-gray-50 hover:bg-gray-100 transition-colors"
              style={{ borderLeftColor: param.color_code }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  {/* Parameter name */}
                  <Label htmlFor={`param-${paramId}`} className="text-sm font-medium">
                    {paramName}
                  </Label>

                  {/* Price display - event-based pricing */}
                  {hasPricing && quantity > 0 && (
                    <div className="space-y-0.5">
                      {allSamePrice && nightPrices.length > 0 ? (
                        // All nights same price - compact display
                        <div className="text-sm text-green-600 font-semibold">
                          {formatCurrency(nightPrices[0], locale)}/{locale === 'vi' ? 'đêm' : 'night'} × {nights} {locale === 'vi' ? 'đêm' : nights === 1 ? 'night' : 'nights'} × {quantity} {locale === 'vi' ? 'khách' : quantity === 1 ? 'guest' : 'guests'}
                        </div>
                      ) : nightPrices.length > 0 ? (
                        // Different prices per night - show breakdown
                        <div className="space-y-0.5">
                          <div className="text-xs text-gray-500">
                            {nightlyParameterPricing.slice(0, nights || 0).map((n, i) => {
                              const price = n.pricing[paramId] || 0
                              const dateLabel = n.date.slice(5).replace('-', '/')
                              return (
                                <span key={n.date}>
                                  {i > 0 && ' + '}
                                  <span title={n.date}>{formatCurrency(price, locale)}</span>
                                  <span className="text-gray-400"> ({dateLabel})</span>
                                </span>
                              )
                            })}
                          </div>
                          <div className="text-sm text-green-600 font-semibold">
                            {formatCurrency(totalPrice, locale)}/{locale === 'vi' ? 'khách' : 'guest'} × {quantity} {locale === 'vi' ? 'khách' : quantity === 1 ? 'guest' : 'guests'}
                          </div>
                        </div>
                      ) : (
                        // Fallback - just show total per guest
                        <div className="text-sm text-green-600 font-semibold">
                          {formatCurrency(totalPrice, locale)} ({nights} {locale === 'vi' ? 'đêm' : 'nights'}) × {quantity} {locale === 'vi' ? 'khách' : quantity === 1 ? 'guest' : 'guests'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Min/max quantity display */}
                  {(param.min_quantity !== undefined && param.min_quantity !== null) ||
                   (param.max_quantity !== undefined && param.max_quantity !== null) ? (
                    <p className="text-xs text-gray-500">
                      {locale === 'vi' ? 'Tối thiểu:' : 'Min:'} {param.min_quantity || 0}
                      {' • '}
                      {locale === 'vi' ? 'Tối đa:' : 'Max:'} {param.max_quantity || 0}
                    </p>
                  ) : null}

                  {/* Error message */}
                  {hasError && (
                    <p className="text-xs text-red-500">{hasError}</p>
                  )}
                </div>

                {/* Quantity input */}
                <div className="flex flex-col items-end gap-1">
                  <Input
                    id={`param-${paramId}`}
                    type="number"
                    min={param.min_quantity || 0}
                    max={param.max_quantity || 999}
                    value={quantity}
                    onChange={(e) => handleQuantityChange(paramId, e.target.value)}
                    className={`w-20 text-center ${hasError ? 'border-red-500' : ''}`}
                    disabled={disabled}
                  />

                  {/* Total for this parameter based on quantity */}
                  {hasPricing && quantity > 0 && (
                    <div className="text-xs font-semibold text-blue-600">
                      = {formatCurrency(totalPrice * quantity, locale)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {!hasAnyQuantity && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {locale === 'vi'
              ? 'Vui lòng nhập số lượng cho ít nhất một parameter'
              : 'Please enter quantity for at least one parameter'
            }
          </AlertDescription>
        </Alert>
      )}

      {Object.keys(validationErrors).length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {locale === 'vi'
              ? 'Vui lòng kiểm tra các giá trị không hợp lệ'
              : 'Please check invalid values'
            }
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
