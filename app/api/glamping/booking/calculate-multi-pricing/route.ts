import { NextRequest, NextResponse } from 'next/server'
import { calculateGlampingPricing } from '@/lib/glamping-pricing'
import pool from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const itemsJson = searchParams.get('items')
    const discountCode = searchParams.get('discountCode')

    if (!itemsJson) {
      return NextResponse.json(
        { error: 'Items array is required' },
        { status: 400 }
      )
    }

    let items: Array<{
      itemId: string
      checkIn: string
      checkOut: string
      adults: number
      children: number
      parameterQuantities: Record<string, number>
    }>

    try {
      items = JSON.parse(itemsJson)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid items JSON format' },
        { status: 400 }
      )
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items must be a non-empty array' },
        { status: 400 }
      )
    }

    // Calculate pricing for each item
    const itemPricingResults = await Promise.all(
      items.map(async (item) => {
        try {
          // Calculate nights
          const checkInDate = new Date(item.checkIn)
          const checkOutDate = new Date(item.checkOut)
          const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))

          // Use the calculateGlampingPricing function with PostgreSQL pool
          const { parameterPricing, nightlyPricing } = await calculateGlampingPricing(
            pool,
            item.itemId,
            checkInDate,
            checkOutDate,
            item.parameterQuantities
          )

          // Calculate total accommodation cost - CHECK pricing_mode
          let accommodationCost = 0
          const missingPricing: string[] = []

          // Use nightly pricing with pricing_mode check (like calculate-pricing does)
          nightlyPricing.forEach(night => {
            Object.entries(item.parameterQuantities).forEach(([paramId, quantity]) => {
              const nightPrice = night.parameters[paramId] || 0
              const pricingMode = night.pricingModes?.[paramId] || 'per_person'

              let priceToAdd: number
              if (pricingMode === 'per_group') {
                // Per group: fixed price, regardless of quantity
                priceToAdd = nightPrice
              } else {
                // Per person: multiply by quantity
                priceToAdd = nightPrice * quantity
              }

              accommodationCost += priceToAdd
            })
          })

          // Check for missing pricing
          Object.entries(item.parameterQuantities).forEach(([paramId, quantity]) => {
            const paramTotalPrice = parameterPricing[paramId]
            if (paramTotalPrice === undefined || paramTotalPrice === null) {
              console.warn(`[Multi-Pricing] Missing pricing for parameter ${paramId} in item ${item.itemId}`)
              missingPricing.push(paramId)
            }
          })

          // Validation: Cross-check with nightly breakdown (with pricing_mode check)
          let validationTotal = 0
          nightlyPricing.forEach(night => {
            Object.entries(item.parameterQuantities).forEach(([paramId, quantity]) => {
              const nightPrice = night.parameters[paramId] || 0
              const pricingMode = night.pricingModes?.[paramId] || 'per_person'

              if (pricingMode === 'per_group') {
                validationTotal += nightPrice
              } else {
                validationTotal += nightPrice * quantity
              }
            })
          })

          // If there's a mismatch, use validation total
          if (Math.abs(validationTotal - accommodationCost) > 0.01) {
            console.error(`[Multi-Pricing] Mismatch for item ${item.itemId}! Method 1: ${accommodationCost}, Method 2: ${validationTotal}`)
            accommodationCost = validationTotal
          }

          if (missingPricing.length > 0) {
            console.error(`[Multi-Pricing] Item ${item.itemId} has parameters missing pricing:`, missingPricing)
          }

          // Extract pricing modes from first night
          const parameterPricingModes: Record<string, string> = {}
          if (nightlyPricing.length > 0) {
            Object.keys(item.parameterQuantities).forEach(paramId => {
              parameterPricingModes[paramId] = nightlyPricing[0].pricingModes?.[paramId] || 'per_person'
            })
          }

          return {
            itemId: item.itemId,
            nights: nights,
            accommodationCost: accommodationCost,
            menuProductsCost: 0, // Menu products handled separately in booking form
            subtotal: accommodationCost,
            parameterQuantities: item.parameterQuantities,
            nightlyPricing: nightlyPricing, // Include per-night breakdown
            parameterPricing: parameterPricing, // Include per-parameter pricing
            parameterPricingModes: parameterPricingModes, // Include pricing modes for each parameter
          }
        } catch (error) {
          console.error(`Error calculating pricing for item ${item.itemId}:`, error)
          throw error
        }
      })
    )

    // Calculate aggregate totals
    const totalAccommodation = itemPricingResults.reduce(
      (sum, item) => sum + item.accommodationCost,
      0
    )
    const totalMenuProducts = 0 // Will be added from booking form selections
    const grossSubtotal = totalAccommodation + totalMenuProducts

    // Apply discount code to total if provided
    let voucherDiscount = 0
    let discountDetails = null

    if (discountCode) {
      try {
        // Validate voucher using PostgreSQL
        const voucherQuery = `
          SELECT *
          FROM glamping_vouchers
          WHERE code = $1
            AND is_active = true
            AND status = 'active'
        `
        const voucherResult = await pool.query(voucherQuery, [discountCode])

        if (voucherResult.rows.length > 0) {
          const voucher = voucherResult.rows[0]

          // Check if voucher is valid
          const now = new Date()
          const validFrom = voucher.valid_from ? new Date(voucher.valid_from) : null
          const validTo = voucher.valid_to ? new Date(voucher.valid_to) : null

          const isValid =
            (!validFrom || validFrom <= now) && (!validTo || validTo >= now)

          if (isValid) {
            // Calculate discount
            if (voucher.discount_type === 'percentage') {
              voucherDiscount = (grossSubtotal * parseFloat(voucher.discount_value)) / 100
            } else if (voucher.discount_type === 'fixed_amount') {
              voucherDiscount = parseFloat(voucher.discount_value)
            }

            // Ensure discount doesn't exceed total
            voucherDiscount = Math.min(voucherDiscount, grossSubtotal)

            discountDetails = {
              code: voucher.code,
              type: voucher.discount_type,
              value: parseFloat(voucher.discount_value),
              amount: voucherDiscount,
            }
          }
        }
      } catch (error) {
        console.error('Error validating voucher:', error)
        // Continue without discount if voucher validation fails
      }
    }

    const subtotalAfterDiscount = grossSubtotal - voucherDiscount

    // Calculate tax (typically 10% VAT, but not included in grand total by default)
    const taxRate = 10 // This should come from settings or item config
    const taxAmount = (subtotalAfterDiscount * taxRate) / 100

    const grandTotal = subtotalAfterDiscount // Tax not included unless customer requests invoice

    // Calculate deposit (using first item's deposit settings as reference)
    // In production, you might want to fetch deposit settings separately
    const depositInfo = {
      type: 'percentage',
      value: 30,
      amount: grandTotal * 0.3,
      balance: grandTotal * 0.7,
    }

    // Return multi-item pricing structure
    return NextResponse.json({
      items: itemPricingResults,
      totals: {
        totalAccommodation,
        totalMenuProducts,
        grossSubtotal,
        voucherDiscount,
        subtotalAfterDiscount,
        taxAmount,
        taxRate,
        grandTotal,
      },
      discountDetails,
      depositInfo,
    })
  } catch (error: any) {
    console.error('Error calculating multi-item pricing:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to calculate pricing' },
      { status: 500 }
    )
  }
}
