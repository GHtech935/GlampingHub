'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { X, Plus } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminTentTabContent, createEmptyTent, type AdminTentItem } from './AdminTentTabContent'
import { AdminBookingSummaryTab } from './AdminBookingSummaryTab'
import { getLocalizedText } from '@/lib/i18n-utils'
import { addDays, parseISO, format } from 'date-fns'

interface AdminGlampingBookingFormModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  zoneId: string
  locale?: string
}

interface Customer {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string
  country: string
  total_bookings: number
  total_spent: number
}

interface NewCustomerData {
  email: string
  first_name: string
  last_name: string
  phone: string
  country: string
}

export function AdminGlampingBookingFormModal({
  open,
  onClose,
  onSuccess,
  zoneId,
  locale = 'vi'
}: AdminGlampingBookingFormModalProps) {
  const { toast } = useToast()

  // ========== TENTS STATE ==========
  const [tents, setTents] = useState<AdminTentItem[]>(() => [createEmptyTent()])
  const [activeTabId, setActiveTabId] = useState<string>('')

  // Initialize activeTabId when tents are first created
  useEffect(() => {
    if (tents.length > 0 && !activeTabId) {
      setActiveTabId(tents[0].id)
    }
  }, [tents, activeTabId])

  // ========== SHARED STATE ==========
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [newCustomerData, setNewCustomerData] = useState<NewCustomerData | null>(null)
  const [preselectedCustomer, setPreselectedCustomer] = useState<Customer | null>(null)
  const [partyNames, setPartyNames] = useState('')
  const [specialRequirements, setSpecialRequirements] = useState('')
  const [invoiceNotes, setInvoiceNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'pay_now' | 'pay_later'>('pay_later')
  const [submitting, setSubmitting] = useState(false)

  // ========== PRICING STATE ==========
  const [multiPricingData, setMultiPricingData] = useState<any>(null)
  const [pricingLoading, setPricingLoading] = useState(false)

  // ========== TENT MANAGEMENT ==========
  const addTent = useCallback(() => {
    if (tents.length >= 10) return
    const newTent = createEmptyTent()
    setTents(prev => [...prev, newTent])
    setActiveTabId(newTent.id)
  }, [tents.length])

  const removeTent = useCallback((index: number) => {
    if (tents.length <= 1) return
    setTents(prev => {
      const updated = prev.filter((_, i) => i !== index)
      // If removed tab was active, switch to first tent or summary
      if (prev[index].id === activeTabId) {
        setActiveTabId(updated[0]?.id || 'summary')
      }
      return updated
    })
  }, [tents.length, activeTabId])

  const updateTent = useCallback((index: number, updated: AdminTentItem) => {
    setTents(prev => {
      const newTents = [...prev]
      newTents[index] = updated
      return newTents
    })
  }, [])

  // ========== MULTI-PRICING ==========
  useEffect(() => {
    // Check if any tent has valid data for pricing
    const validTents = tents.filter(t =>
      t.itemId && t.checkIn && t.checkOut &&
      Object.values(t.parameterQuantities).some(q => q > 0)
    )

    if (validTents.length === 0) {
      setMultiPricingData(null)
      return
    }

    const fetchMultiPricing = async () => {
      setPricingLoading(true)
      try {
        const itemsPayload = validTents.map(t => ({
          itemId: t.itemId,
          checkIn: t.checkIn,
          checkOut: t.checkOut,
          adults: t.adults,
          children: t.children,
          parameterQuantities: t.parameterQuantities,
        }))

        const params = new URLSearchParams({
          items: JSON.stringify(itemsPayload),
        })

        const response = await fetch(`/api/glamping/booking/calculate-multi-pricing?${params}`)
        const data = await response.json()

        if (response.ok) {
          setMultiPricingData(data)

          // Update per-tent pricing breakdown
          setTents(prev => prev.map(tent => {
            const itemPricing = data.items?.find((item: any) => item.itemId === tent.itemId)
            if (itemPricing && tent.checkIn && tent.checkOut) {
              const menuCost = Object.values(tent.menuProducts).reduce((sum, nightSels) => {
                if (!nightSels) return sum
                return sum + Object.values(nightSels)
                  .filter(p => p.quantity > 0)
                  .reduce((s, p) => s + p.price * p.quantity, 0)
              }, 0)

              return {
                ...tent,
                pricingBreakdown: {
                  accommodationCost: itemPricing.accommodationCost || 0,
                  menuProductsCost: menuCost,
                  subtotal: (itemPricing.accommodationCost || 0) + menuCost,
                },
              }
            }
            return tent
          }))
        } else {
          console.error('Multi-pricing calculation failed:', data)
        }
      } catch (error) {
        console.error('Error fetching multi-pricing:', error)
      } finally {
        setPricingLoading(false)
      }
    }

    const timer = setTimeout(fetchMultiPricing, 500)
    return () => clearTimeout(timer)
  }, [
    // Serialize tents pricing-relevant data to avoid infinite loops
    tents.map(t => `${t.itemId}|${t.checkIn}|${t.checkOut}|${JSON.stringify(t.parameterQuantities)}`).join(',')
  ])

  // ========== CUSTOMER HANDLING ==========
  const handleCustomerSelect = useCallback((customerId: string, customer?: Customer) => {
    setSelectedCustomerId(customerId)
    setNewCustomerData(null)
    if (customer) {
      setPreselectedCustomer(customer)
    }
  }, [])

  const handleNewCustomerData = useCallback((data: NewCustomerData | null) => {
    if (data) {
      setNewCustomerData(data)
      setSelectedCustomerId('')
    } else {
      setNewCustomerData(null)
    }
  }, [])

  // ========== VALIDATION ==========
  const validateForm = useCallback((): string | null => {
    // Validate each tent
    for (let i = 0; i < tents.length; i++) {
      const tent = tents[i]
      const label = locale === 'vi' ? `Lều ${i + 1}` : `Tent ${i + 1}`

      if (!tent.itemId) {
        return locale === 'vi'
          ? `${label}: Vui lòng chọn item`
          : `${label}: Please select an item`
      }

      if (!tent.checkIn || !tent.checkOut) {
        return locale === 'vi'
          ? `${label}: Vui lòng chọn ngày check-in và check-out`
          : `${label}: Please select check-in and check-out dates`
      }

      const hasParameters = Object.values(tent.parameterQuantities).some(q => q > 0)
      if (!hasParameters) {
        return locale === 'vi'
          ? `${label}: Vui lòng nhập số lượng cho ít nhất một parameter`
          : `${label}: Please enter quantity for at least one parameter`
      }

      const totalGuests = tent.adults + tent.children
      if (totalGuests < 1) {
        return locale === 'vi'
          ? `${label}: Phải có ít nhất 1 khách`
          : `${label}: Must have at least 1 guest`
      }

      // Parameter min/max validation
      for (const param of tent.itemParameters) {
        const paramId = param.parameter_id || param.id
        const quantity = tent.parameterQuantities[paramId] || 0
        if (quantity > 0) {
          if (param.min_quantity !== undefined && param.min_quantity !== null && quantity < param.min_quantity) {
            return locale === 'vi'
              ? `${label}: ${getLocalizedText(param.name, locale as 'vi' | 'en')}: Tối thiểu ${param.min_quantity}`
              : `${label}: ${getLocalizedText(param.name, locale as 'vi' | 'en')}: Minimum ${param.min_quantity}`
          }
          if (param.max_quantity !== undefined && param.max_quantity !== null && quantity > param.max_quantity) {
            return locale === 'vi'
              ? `${label}: ${getLocalizedText(param.name, locale as 'vi' | 'en')}: Tối đa ${param.max_quantity}`
              : `${label}: ${getLocalizedText(param.name, locale as 'vi' | 'en')}: Maximum ${param.max_quantity}`
          }
        }
      }
    }

    // Same-item date overlap check
    for (let i = 0; i < tents.length; i++) {
      for (let j = i + 1; j < tents.length; j++) {
        if (tents[i].itemId && tents[i].itemId === tents[j].itemId &&
            tents[i].checkIn && tents[i].checkOut && tents[j].checkIn && tents[j].checkOut) {
          // Overlap: start1 < end2 AND start2 < end1
          if (tents[i].checkIn < tents[j].checkOut && tents[j].checkIn < tents[i].checkOut) {
            const label1 = locale === 'vi' ? `Lều ${i + 1}` : `Tent ${i + 1}`
            const label2 = locale === 'vi' ? `Lều ${j + 1}` : `Tent ${j + 1}`
            return locale === 'vi'
              ? `${label1} và ${label2} chọn cùng item nhưng ngày bị trùng`
              : `${label1} and ${label2} have the same item with overlapping dates`
          }
        }
      }
    }

    // Customer validation
    if (!selectedCustomerId && !newCustomerData) {
      return locale === 'vi'
        ? 'Vui lòng chọn hoặc tạo khách hàng'
        : 'Please select or create a customer'
    }

    if (newCustomerData) {
      if (!newCustomerData.email || !newCustomerData.first_name || !newCustomerData.last_name) {
        return locale === 'vi'
          ? 'Vui lòng điền đầy đủ thông tin khách hàng (email, tên, họ)'
          : 'Please fill in all required customer fields (email, first name, last name)'
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(newCustomerData.email)) {
        return locale === 'vi' ? 'Email không hợp lệ' : 'Invalid email address'
      }
    }

    return null
  }, [tents, selectedCustomerId, newCustomerData, locale])

  // ========== SUBMIT ==========
  const handleSubmit = async () => {
    const validationError = validateForm()
    if (validationError) {
      toast({
        title: locale === 'vi' ? 'Lỗi' : 'Error',
        description: validationError,
        variant: 'destructive'
      })
      return
    }

    try {
      setSubmitting(true)

      const validTents = tents.filter(t => t.itemId && t.checkIn && t.checkOut)

      // Build items array for multi-item booking
      const items = validTents.map(t => {
        // Flatten per-night menu products with servingDate
        const flatMenuProducts: Array<{
          id: string
          quantity: number
          price: number
          name: string
          voucher?: any
          servingDate?: string
        }> = []
        Object.entries(t.menuProducts).forEach(([nightIdx, nightSels]) => {
          if (!nightSels) return
          Object.values(nightSels)
            .filter(p => p.quantity > 0)
            .forEach(p => {
              const servingDate = t.checkIn
                ? format(addDays(parseISO(t.checkIn), parseInt(nightIdx)), 'yyyy-MM-dd')
                : undefined
              flatMenuProducts.push({
                id: p.id,
                quantity: p.quantity,
                price: p.price,
                name: p.name,
                voucher: p.voucher || undefined,
                servingDate,
              })
            })
        })

        return {
          itemId: t.itemId,
          checkInDate: t.checkIn,
          checkOutDate: t.checkOut,
          adults: t.adults,
          children: t.children,
          parameterQuantities: t.parameterQuantities,
          accommodationVoucher: t.accommodationVoucher || undefined,
          menuProducts: flatMenuProducts,
        }
      })

      const bookingData: any = {
        items,
        partyNames,
        specialRequirements,
        invoiceNotes,
        internalNotes,
        paymentMethod,
        isAdminBooking: true,
      }

      // Customer data
      if (selectedCustomerId) {
        bookingData.customerId = selectedCustomerId
      }
      if (newCustomerData) {
        bookingData.guestEmail = newCustomerData.email
        bookingData.guestFirstName = newCustomerData.first_name
        bookingData.guestLastName = newCustomerData.last_name
        bookingData.guestPhone = newCustomerData.phone || ''
        bookingData.guestCountry = newCustomerData.country || 'Vietnam'
      }

      const response = await fetch('/api/glamping/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast({
          title: locale === 'vi' ? 'Thành công' : 'Success',
          description: locale === 'vi'
            ? `Booking ${result.bookingCode} đã được tạo`
            : `Booking ${result.bookingCode} created successfully`
        })
        onSuccess()
        handleClose()
      } else if (response.status === 409 && result.errorCode === 'DATES_NOT_AVAILABLE') {
        // Specific handling for availability conflict
        toast({
          title: locale === 'vi' ? 'Lều không khả dụng' : 'Item Not Available',
          description: result.error || (locale === 'vi'
            ? 'Lều đã được đặt hết trong khoảng thời gian này. Vui lòng chọn ngày khác.'
            : 'This item is fully booked for the selected dates. Please choose different dates.'),
          variant: 'destructive'
        })
      } else {
        throw new Error(result.error || 'Failed to create booking')
      }
    } catch (error: any) {
      console.error('Create booking error:', error)
      toast({
        title: locale === 'vi' ? 'Lỗi' : 'Error',
        description: error.message || (locale === 'vi' ? 'Không thể tạo booking' : 'Failed to create booking'),
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }

  // ========== RESET & CLOSE ==========
  const handleClose = () => {
    setTents([createEmptyTent()])
    setActiveTabId('')
    setSelectedCustomerId('')
    setNewCustomerData(null)
    setPreselectedCustomer(null)
    setPartyNames('')
    setSpecialRequirements('')
    setInvoiceNotes('')
    setInternalNotes('')
    setPaymentMethod('pay_later')
    setMultiPricingData(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {locale === 'vi' ? 'Tạo Booking Thủ Công' : 'Create Manual Booking'}
          </DialogTitle>
          <DialogDescription>
            {locale === 'vi'
              ? 'Điền thông tin đầy đủ để tạo booking cho khách hàng. Có thể thêm nhiều lều.'
              : 'Fill in all information to create a booking. You can add multiple tents.'
            }
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTabId} onValueChange={setActiveTabId} className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
            {tents.map((tent, i) => (
              <TabsTrigger
                key={tent.id}
                value={tent.id}
                className="flex items-center gap-1.5 data-[state=active]:bg-blue-500 data-[state=active]:text-white px-3 py-1.5 text-sm"
              >
                <span className="truncate max-w-[120px]">
                  {tent.itemName
                    ? `${locale === 'vi' ? 'Lều' : 'Tent'} ${i + 1}: ${tent.itemName}`
                    : `${locale === 'vi' ? 'Lều' : 'Tent'} ${i + 1}`
                  }
                </span>
                {tents.length > 1 && (
                  <span
                    role="button"
                    tabIndex={-1}
                    className="ml-0.5 hover:bg-white/20 rounded p-0.5 inline-flex cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      removeTent(i)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation()
                        e.preventDefault()
                        removeTent(i)
                      }
                    }}
                  >
                    <X className="h-3 w-3" />
                  </span>
                )}
              </TabsTrigger>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addTent}
              disabled={tents.length >= 10}
              className="h-8 px-2 text-sm"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              {locale === 'vi' ? 'Thêm lều' : 'Add tent'}
            </Button>
            <TabsTrigger
              value="summary"
              className="data-[state=active]:bg-primary data-[state=active]:text-white px-3 py-1.5 text-sm"
            >
              {locale === 'vi' ? 'Thông tin chung & Thanh toán' : 'Summary & Payment'}
            </TabsTrigger>
          </TabsList>

          {tents.map((tent, i) => (
            <TabsContent key={tent.id} value={tent.id} className="mt-4">
              <AdminTentTabContent
                zoneId={zoneId}
                tent={tent}
                onTentChange={(updated) => updateTent(i, updated)}
                otherTents={tents.filter((_, j) => j !== i)}
                locale={locale}
              />
            </TabsContent>
          ))}

          <TabsContent value="summary" className="mt-4">
            <AdminBookingSummaryTab
              tents={tents}
              zoneId={zoneId}
              locale={locale}
              selectedCustomerId={selectedCustomerId}
              onCustomerSelect={handleCustomerSelect}
              newCustomerData={newCustomerData}
              onNewCustomerData={handleNewCustomerData}
              preselectedCustomer={preselectedCustomer}
              partyNames={partyNames}
              onPartyNamesChange={setPartyNames}
              specialRequirements={specialRequirements}
              onSpecialRequirementsChange={setSpecialRequirements}
              invoiceNotes={invoiceNotes}
              onInvoiceNotesChange={setInvoiceNotes}
              internalNotes={internalNotes}
              onInternalNotesChange={setInternalNotes}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              pricingData={multiPricingData}
              pricingLoading={pricingLoading}
              onSubmit={handleSubmit}
              submitting={submitting}
              validateForm={validateForm}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
