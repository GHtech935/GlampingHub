'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Save, X } from 'lucide-react'
import { CampsitePitchSelector } from './CampsitePitchSelector'
import { DateRangePickerWithAvailability } from './DateRangePickerWithAvailability'
import { CustomerSearchSelect } from './CustomerSearchSelect'
import { SimpleRichTextEditor } from '@/components/ui/SimpleRichTextEditor'
import SimplifiedPricingSummary from '@/components/booking/SimplifiedPricingSummary'
import { type AppliedVoucher } from '@/components/booking/VoucherInput'
import PitchProductsSelector, { type PitchProduct, type SelectedProduct } from '@/components/booking/PitchProductsSelector'
import { PitchTypeSelectorAdmin } from './PitchTypeSelectorAdmin'
import { format } from 'date-fns'
import type { DateRange } from 'react-day-picker'

interface AdminBookingFormModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  locale?: string
  sourceBookingId?: string | null
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

interface PitchData {
  id: string
  name: string | import('@/lib/i18n-utils').MultilingualText
  maxGuests: number
  campsiteId?: string
  campsiteSlug?: string
}

export function AdminBookingFormModal({
  open,
  onClose,
  onSuccess,
  locale = 'vi',
  sourceBookingId
}: AdminBookingFormModalProps) {
  const { toast } = useToast()

  // Form state
  const [selectedCampsiteId, setSelectedCampsiteId] = useState('')
  const [selectedCampsiteSlug, setSelectedCampsiteSlug] = useState('')
  const [selectedPitchId, setSelectedPitchId] = useState('')
  const [selectedPitch, setSelectedPitch] = useState<PitchData | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [adults, setAdults] = useState(2)
  const [childrenCount, setChildrenCount] = useState(0)
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [newCustomerData, setNewCustomerData] = useState<NewCustomerData | null>(null)
  const [preselectedCustomer, setPreselectedCustomer] = useState<Customer | null>(null)
  const [partyNames, setPartyNames] = useState('')                   // Tên các thành viên trong đoàn
  const [specialRequirements, setSpecialRequirements] = useState('') // Yêu cầu của khách
  const [invoiceNotes, setInvoiceNotes] = useState('')               // Ghi chú khi xuất hoá đơn
  const [internalNotes, setInternalNotes] = useState('')             // Ghi chú nội bộ admin
  const [submitting, setSubmitting] = useState(false)

  // Pricing state
  const [pricingData, setPricingData] = useState<any>(null)
  const [pricingLoading, setPricingLoading] = useState(false)
  const [appliedVoucher, setAppliedVoucher] = useState<AppliedVoucher | null>(null)

  // Products state
  const [availableProducts, setAvailableProducts] = useState<PitchProduct[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Record<string, SelectedProduct>>({})
  const [loadingProducts, setLoadingProducts] = useState(false)

  // Pitch types state
  const [pitchTypes, setPitchTypes] = useState<string[]>([])
  const [selectedPitchType, setSelectedPitchType] = useState('')
  const [pricesByType, setPricesByType] = useState<Record<string, { price: number }>>({})
  const [loadingPitchTypes, setLoadingPitchTypes] = useState(false)

  // Copy booking state
  const [loadingSourceBooking, setLoadingSourceBooking] = useState(false)
  const [sourceBookingProducts, setSourceBookingProducts] = useState<any[]>([])

  // Fetch products when campsite slug is available
  useEffect(() => {
    if (!selectedCampsiteSlug) {
      setAvailableProducts([])
      setSelectedProducts({})
      return
    }

    const fetchProducts = async () => {
      try {
        setLoadingProducts(true)
        const response = await fetch(`/api/campsite/${selectedCampsiteSlug}/products`)
        const data = await response.json()

        if (response.ok) {
          setAvailableProducts(data.products || [])
        } else {
          console.error('Failed to fetch products:', data)
          setAvailableProducts([])
          toast({
            title: locale === 'vi' ? 'Lỗi' : 'Error',
            description: locale === 'vi'
              ? 'Không thể tải danh sách sản phẩm'
              : 'Failed to load products',
            variant: 'destructive'
          })
        }
      } catch (error) {
        console.error('Error fetching products:', error)
        setAvailableProducts([])
        toast({
          title: locale === 'vi' ? 'Lỗi' : 'Error',
          description: locale === 'vi'
            ? 'Không thể tải danh sách sản phẩm'
            : 'Failed to load products',
          variant: 'destructive'
        })
      } finally {
        setLoadingProducts(false)
      }
    }

    fetchProducts()
  }, [selectedCampsiteSlug, toast, locale])

  // Fetch pitch types when pitch is selected
  useEffect(() => {
    if (!selectedPitchId) {
      setPitchTypes([])
      setSelectedPitchType('')
      setPricesByType({})
      return
    }

    const fetchPitchTypes = async () => {
      try {
        setLoadingPitchTypes(true)
        const response = await fetch(`/api/pitch/${selectedPitchId}`)
        const data = await response.json()

        if (response.ok) {
          const types = data.pitchTypes || []
          setPitchTypes(types)
          setPricesByType(data.pricesByType || {})
          // Auto-select if only one type
          if (types.length === 1) {
            setSelectedPitchType(types[0])
          } else {
            setSelectedPitchType('')
          }
        } else {
          setPitchTypes([])
          setSelectedPitchType('')
          setPricesByType({})
        }
      } catch (error) {
        console.error('Error fetching pitch types:', error)
        setPitchTypes([])
        setSelectedPitchType('')
        setPricesByType({})
      } finally {
        setLoadingPitchTypes(false)
      }
    }

    fetchPitchTypes()
  }, [selectedPitchId])

  // Fetch pricing when relevant data changes
  useEffect(() => {
    if (!selectedPitchId || !dateRange?.from || !dateRange?.to) {
      setPricingData(null)
      return
    }

    const fetchPricing = async () => {
      setPricingLoading(true)
      try {
        const params = new URLSearchParams({
          pitchId: selectedPitchId,
          checkIn: format(dateRange.from!, 'yyyy-MM-dd'),
          checkOut: format(dateRange.to!, 'yyyy-MM-dd'),
          adults: adults.toString(),
          children: childrenCount.toString(),
        })

        // Add products
        const productsArray = Object.values(selectedProducts)
        if (productsArray.length > 0) {
          params.append('productIds', productsArray.map(p => p.productId).join(','))
          params.append('productQuantities', productsArray.map(p => p.quantity).join(','))
        }

        // Add voucher
        if (appliedVoucher) {
          params.append('discountCode', appliedVoucher.code)
        }

        // Add selected pitch type
        if (selectedPitchType) {
          params.append('selectedPitchType', selectedPitchType)
        }

        const response = await fetch(`/api/booking/calculate-pricing?${params}`)
        const data = await response.json()

        if (response.ok) {
          setPricingData(data)
        }
      } catch (error) {
        console.error('Error fetching pricing:', error)
      } finally {
        setPricingLoading(false)
      }
    }

    const timer = setTimeout(fetchPricing, 300) // Debounce
    return () => clearTimeout(timer)
  }, [selectedPitchId, dateRange, adults, childrenCount, selectedProducts, appliedVoucher, selectedPitchType])

  // Fetch and pre-fill source booking data when copying
  useEffect(() => {
    if (!sourceBookingId || !open) return

    const fetchSourceBooking = async () => {
      try {
        setLoadingSourceBooking(true)

        const response = await fetch(`/api/admin/bookings/${sourceBookingId}`)
        if (!response.ok) throw new Error('Failed to fetch source booking')

        const data = await response.json()

        // Pre-fill campsite & pitch
        setSelectedCampsiteId(data.campsite.id)
        setSelectedCampsiteSlug(data.campsite.slug)
        setSelectedPitchId(data.pitch.id)
        setSelectedPitch({
          id: data.pitch.id,
          name: data.pitch.name,
          maxGuests: data.pitch.maxGuests,
          campsiteId: data.campsite.id,
        })

        // Pre-fill pitch type if available
        if (data.pitch.selectedPitchTypes && data.pitch.selectedPitchTypes.length > 0) {
          setSelectedPitchType(data.pitch.selectedPitchTypes[0])
        }

        // Pre-fill guest counts
        setAdults(data.guests.adults)
        setChildrenCount(data.guests.children)

        // Pre-fill customer
        if (data.guest.customerId) {
          setSelectedCustomerId(data.guest.customerId)

          // Fetch full customer data to get accurate total_bookings and total_spent
          try {
            const customerResponse = await fetch(`/api/admin/customers?search=${encodeURIComponent(data.guest.customerEmail || data.guest.email)}&limit=1`)
            if (customerResponse.ok) {
              const customerData = await customerResponse.json()
              if (customerData.data && customerData.data.length > 0) {
                const customer = customerData.data[0]
                setPreselectedCustomer(customer)
              } else {
                // Fallback if customer not found in search
                setPreselectedCustomer({
                  id: data.guest.customerId,
                  email: data.guest.customerEmail || data.guest.email,
                  first_name: data.guest.firstName || '',
                  last_name: data.guest.lastName || '',
                  phone: data.guest.phone || '',
                  country: data.guest.country || 'Vietnam',
                  total_bookings: 0,
                  total_spent: 0,
                })
              }
            }
          } catch (error) {
            console.error('Failed to fetch customer details:', error)
            // Fallback to basic info without booking stats
            setPreselectedCustomer({
              id: data.guest.customerId,
              email: data.guest.customerEmail || data.guest.email,
              first_name: data.guest.firstName || '',
              last_name: data.guest.lastName || '',
              phone: data.guest.phone || '',
              country: data.guest.country || 'Vietnam',
              total_bookings: 0,
              total_spent: 0,
            })
          }

          setNewCustomerData(null)
        } else {
          // Guest booking without registered customer
          setSelectedCustomerId('')
          setPreselectedCustomer(null)
          setNewCustomerData({
            email: data.guest.email || '',
            first_name: data.guest.firstName || '',
            last_name: data.guest.lastName || '',
            phone: data.guest.phone || '',
            country: data.guest.country || 'Vietnam',
          })
        }

        // Pre-fill party names, special requirements, invoice notes, and internal notes
        setPartyNames(data.otherDetails.partyNames || '')
        setSpecialRequirements(data.otherDetails.specialRequirements || '')
        setInvoiceNotes(data.invoiceNotes || '')
        setInternalNotes(data.internalNotes || '')

        // Store products for later pre-selection (after availableProducts loads)
        if (data.extras && data.extras.length > 0) {
          setSourceBookingProducts(data.extras)
        }

        // DO NOT pre-fill dates - admin must select new dates
        setDateRange(undefined)

      } catch (error) {
        console.error('Error fetching source booking:', error)
        toast({
          title: locale === 'vi' ? 'Lỗi' : 'Error',
          description: locale === 'vi'
            ? 'Không thể tải thông tin booking gốc'
            : 'Failed to load source booking',
          variant: 'destructive'
        })
      } finally {
        setLoadingSourceBooking(false)
      }
    }

    fetchSourceBooking()
  }, [sourceBookingId, open, toast, locale])

  // Pre-select products from source booking after availableProducts loads
  useEffect(() => {
    if (sourceBookingProducts.length === 0 || availableProducts.length === 0) {
      return
    }

    const productsToSelect: Record<string, SelectedProduct> = {}
    const missingProducts: string[] = []

    sourceBookingProducts.forEach(sourceProduct => {
      const matchingProduct = availableProducts.find(
        ap => ap.id === sourceProduct.campsite_product_id
      )

      if (matchingProduct) {
        productsToSelect[matchingProduct.id] = {
          productId: matchingProduct.id,
          quantity: sourceProduct.quantity,
          voucherCode: undefined,
        }
      } else {
        missingProducts.push(sourceProduct.name)
      }
    })

    setSelectedProducts(productsToSelect)

    // Warn if some products are no longer available
    if (missingProducts.length > 0) {
      toast({
        title: locale === 'vi' ? 'Lưu ý' : 'Note',
        description: locale === 'vi'
          ? `Các sản phẩm sau không còn khả dụng: ${missingProducts.join(', ')}`
          : `Products no longer available: ${missingProducts.join(', ')}`,
        variant: 'default'
      })
    }

    // Clear source products to prevent re-triggering
    setSourceBookingProducts([])
  }, [availableProducts, sourceBookingProducts, locale, toast])

  // Handle campsite change
  const handleCampsiteChange = (campsiteId: string) => {
    setSelectedCampsiteId(campsiteId)
    // Reset pitch when campsite changes
    setSelectedPitchId('')
    setSelectedPitch(null)
    setAvailableProducts([])
    setSelectedProducts({})
    setPitchTypes([])
    setSelectedPitchType('')
    setPricesByType({})
    setPricingData(null)
    setAppliedVoucher(null)
  }

  // Handle pitch change
  const handlePitchChange = (pitchId: string, pitchData: PitchData) => {
    setSelectedPitchId(pitchId)
    setSelectedPitch(pitchData)
    if (pitchData.campsiteSlug) {
      setSelectedCampsiteSlug(pitchData.campsiteSlug)
    }
    setSelectedProducts({}) // Reset products when pitch changes
    setSelectedPitchType('') // Reset pitch type when pitch changes (will be auto-selected by useEffect)
    setPricingData(null)
    setAppliedVoucher(null)
  }

  // Handle customer select
  const handleCustomerSelect = (customerId: string, customer: Customer) => {
    setSelectedCustomerId(customerId)
    setNewCustomerData(null)
  }

  // Handle new customer data
  const handleNewCustomerData = (data: NewCustomerData) => {
    setNewCustomerData(data)
    setSelectedCustomerId('') // Clear selected customer ID
  }

  // Validate form
  const validateForm = (): string | null => {
    if (!selectedPitchId) {
      return locale === 'vi' ? 'Vui lòng chọn slot' : 'Please select a slot'
    }

    // Check pitch type selection (required when pitch has multiple types)
    if (pitchTypes.length > 1 && !selectedPitchType) {
      return locale === 'vi' ? 'Vui lòng chọn loại slot' : 'Please select a slot type'
    }

    if (!dateRange?.from || !dateRange?.to) {
      return locale === 'vi' ? 'Vui lòng chọn ngày check-in và check-out' : 'Please select check-in and check-out dates'
    }

    if (adults < 1) {
      return locale === 'vi' ? 'Phải có ít nhất 1 người lớn' : 'Must have at least 1 adult'
    }

    // Check total guests vs pitch max guests
    if (selectedPitch && (adults + childrenCount) > selectedPitch.maxGuests) {
      return locale === 'vi'
        ? `Pitch này chỉ chứa tối đa ${selectedPitch.maxGuests} khách`
        : `This pitch has a maximum capacity of ${selectedPitch.maxGuests} guests`
    }

    // Customer validation
    if (!selectedCustomerId && !newCustomerData) {
      return locale === 'vi' ? 'Vui lòng chọn hoặc tạo khách hàng' : 'Please select or create a customer'
    }

    if (newCustomerData) {
      if (!newCustomerData.email || !newCustomerData.first_name || !newCustomerData.last_name) {
        return locale === 'vi'
          ? 'Vui lòng điền đầy đủ thông tin khách hàng (email, tên, họ)'
          : 'Please fill in all required customer fields (email, first name, last name)'
      }

      // Simple email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(newCustomerData.email)) {
        return locale === 'vi' ? 'Email không hợp lệ' : 'Invalid email address'
      }
    }

    return null
  }

  // Submit form
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

      const checkInDate = format(dateRange!.from!, 'yyyy-MM-dd')
      const checkOutDate = format(dateRange!.to!, 'yyyy-MM-dd')

      // Prepare booking data
      const bookingData: any = {
        pitchId: selectedPitchId,
        checkInDate,
        checkOutDate,
        adults,
        children: childrenCount,
        selectedPitchType: selectedPitchType || undefined, // Selected pitch type for pricing
        partyNames,           // Tên các thành viên trong đoàn → DB: party_names
        specialRequirements,  // Yêu cầu của khách → DB: special_requirements
        invoiceNotes,         // Ghi chú xuất hoá đơn → DB: invoice_notes
        internalNotes,        // Ghi chú admin → DB: internal_notes
        isAdminBooking: true, // Flag for backend
      }

      // Customer data
      if (selectedCustomerId) {
        bookingData.customerId = selectedCustomerId
      } else if (newCustomerData) {
        bookingData.guestEmail = newCustomerData.email
        bookingData.guestFirstName = newCustomerData.first_name
        bookingData.guestLastName = newCustomerData.last_name
        bookingData.guestPhone = newCustomerData.phone || ''
        bookingData.guestCountry = newCustomerData.country || 'Vietnam'
      }

      // Products data
      const productsArray = Object.values(selectedProducts)
      if (productsArray.length > 0) {
        bookingData.products = productsArray.map(p => ({
          pitchProductId: p.productId,
          quantity: p.quantity,
          voucherCode: p.voucherCode,
        }))
      }

      // Voucher for accommodation
      if (appliedVoucher) {
        bookingData.discountCode = appliedVoucher.code
      }

      // Call booking API
      const response = await fetch('/api/booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast({
          title: locale === 'vi' ? 'Thành công' : 'Success',
          description: locale === 'vi'
            ? `Booking ${result.bookingReference} đã được tạo`
            : `Booking ${result.bookingReference} created successfully`
        })
        onSuccess()
        handleClose()
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

  // Reset form and close
  const handleClose = () => {
    setSelectedCampsiteId('')
    setSelectedPitchId('')
    setSelectedPitch(null)
    setDateRange(undefined)
    setAdults(2)
    setChildrenCount(0)
    setSelectedCustomerId('')
    setNewCustomerData(null)
    setPreselectedCustomer(null)
    setAvailableProducts([])
    setSelectedProducts({})
    setPitchTypes([])
    setSelectedPitchType('')
    setPricesByType({})
    setPricingData(null)
    setAppliedVoucher(null)
    setPartyNames('')
    setSpecialRequirements('')
    setInvoiceNotes('')
    setInternalNotes('')
    setSourceBookingProducts([])
    setLoadingSourceBooking(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {sourceBookingId
              ? (locale === 'vi' ? 'Sao chép Booking' : 'Copy Booking')
              : (locale === 'vi' ? 'Tạo Booking Mới' : 'Create New Booking')
            }
          </DialogTitle>
          <DialogDescription>
            {sourceBookingId
              ? (locale === 'vi'
                  ? 'Thông tin đã được sao chép. Vui lòng chọn ngày check-in và check-out mới.'
                  : 'Information copied. Please select new check-in and check-out dates.')
              : (locale === 'vi'
                  ? 'Điền thông tin để tạo booking cho khách hàng'
                  : 'Fill in the information to create a booking for the customer')
            }
          </DialogDescription>

          {loadingSourceBooking && (
            <div className="flex items-center gap-2 text-blue-600 bg-blue-50 p-3 rounded-lg mt-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">
                {locale === 'vi' ? 'Đang tải thông tin booking...' : 'Loading booking information...'}
              </span>
            </div>
          )}
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: Select Campsite & Pitch */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold border-b pb-2">
              1. {locale === 'vi' ? 'Chọn Campsite & Slot' : 'Select Campsite & Slot'}
            </h3>
            <CampsitePitchSelector
              selectedCampsiteId={selectedCampsiteId}
              selectedPitchId={selectedPitchId}
              onCampsiteChange={handleCampsiteChange}
              onPitchChange={handlePitchChange}
              locale={locale}
            />

            {/* Pitch Type Selector - shows when pitch is selected and has multiple types */}
            {selectedPitchId && (
              loadingPitchTypes ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  <span className="ml-2 text-sm text-gray-500">
                    {locale === 'vi' ? 'Đang tải loại slot...' : 'Loading slot types...'}
                  </span>
                </div>
              ) : pitchTypes.length > 0 ? (
                <div className="">
                  <PitchTypeSelectorAdmin
                    availableTypes={pitchTypes}
                    selectedType={selectedPitchType}
                    onChange={setSelectedPitchType}
                    pricesByType={pricesByType}
                    locale={locale}
                  />
                </div>
              ) : null
            )}
          </div>

          {/* Step 2: Select Dates & Guests */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold border-b pb-2">
              2. {locale === 'vi' ? 'Chọn Ngày & Số Khách' : 'Select Dates & Guests'}
            </h3>
            <DateRangePickerWithAvailability
              pitchId={selectedPitchId}
              dateRange={dateRange}
              adults={adults}
              childrenCount={childrenCount}
              maxGuests={selectedPitch?.maxGuests}
              selectedPitchType={selectedPitchType}
              onDateRangeChange={setDateRange}
              onGuestsChange={(newAdults, newChildren) => {
                setAdults(newAdults)
                setChildrenCount(newChildren)
              }}
              locale={locale}
            />
          </div>

          {/* Step 3: Select/Create Customer */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold border-b pb-2">
              3. {locale === 'vi' ? 'Khách Hàng' : 'Customer'}
            </h3>
            <CustomerSearchSelect
              selectedCustomerId={selectedCustomerId}
              selectedCustomerData={newCustomerData || undefined}
              preselectedCustomer={preselectedCustomer || undefined}
              onCustomerSelect={handleCustomerSelect}
              onNewCustomerData={handleNewCustomerData}
              locale={locale}
            />
          </div>

          {/* Step 4: Guest Requirements */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">
              4. {locale === 'vi' ? 'Yêu cầu của khách' : 'Guest Requirements'}
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Tên các thành viên trong đoàn */}
              <div className="space-y-2">
                <Label htmlFor="party-names">
                  {locale === 'vi' ? 'Tên các thành viên trong đoàn' : 'Party Member Names'}
                </Label>
                <Textarea
                  id="party-names"
                  value={partyNames}
                  onChange={(e) => setPartyNames(e.target.value)}
                  placeholder={locale === 'vi'
                    ? 'VD: Nguyễn Văn A, Trần Thị B, Lê Văn C...'
                    : 'E.g.: John Doe, Jane Smith, Bob Johnson...'}
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* Yêu cầu đặc biệt của khách */}
              <div className="space-y-2">
                <Label htmlFor="special-requirements">
                  {locale === 'vi' ? 'Yêu cầu đặc biệt của khách' : 'Special Requests'}
                </Label>
                <Textarea
                  id="special-requirements"
                  value={specialRequirements}
                  onChange={(e) => setSpecialRequirements(e.target.value)}
                  placeholder={locale === 'vi'
                    ? 'VD: Dị ứng thực phẩm, cần giường phụ, đón sớm...'
                    : 'E.g.: Food allergies, extra bed needed, early check-in...'}
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>

            {/* Ghi chú khi xuất hoá đơn */}
            <div className="space-y-2">
              <Label>
                {locale === 'vi' ? 'Ghi chú khi xuất hoá đơn' : 'Invoice Notes'}
              </Label>
              <SimpleRichTextEditor
                value={invoiceNotes}
                onChange={setInvoiceNotes}
                placeholder={locale === 'vi'
                  ? 'Nhập ghi chú nếu cần thiết khi xuất hoá đơn...'
                  : 'Enter notes for invoice if needed...'}
                minHeight={80}
              />
            </div>
          </div>

          {/* Step 5 & 6: Products and Internal Notes */}
          {selectedPitchId && (
            <>
              {/* 5. Products */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold border-b pb-2">
                  5. {locale === 'vi' ? 'Sản Phẩm' : 'Products'}
                </h3>
                {loadingProducts ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    <span className="ml-2 text-sm text-gray-500">
                      {locale === 'vi' ? 'Đang tải...' : 'Loading...'}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {availableProducts.length > 0 ? (
                      <PitchProductsSelector
                        products={availableProducts}
                        selectedProducts={selectedProducts}
                        onProductsChange={setSelectedProducts}
                        locale={locale}
                        campsiteId={selectedCampsiteId}
                        checkIn={dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined}
                        checkOut={dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined}
                        customerId={selectedCustomerId}
                      />
                    ) : (
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <p className="text-sm text-gray-500 italic text-center">
                          {locale === 'vi' ? 'Chưa có sản phẩm' : 'No products available'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 6. Internal Notes */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold border-b pb-2">
                  6. {locale === 'vi' ? 'Ghi Chú Nội Bộ (Tùy chọn)' : 'Internal Notes (Optional)'}
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="internal-notes" className="text-sm text-gray-600">
                    {locale === 'vi' ? 'Ghi chú của admin (chỉ nhân viên xem được)' : 'Admin notes (staff only)'}
                  </Label>
                  <Textarea
                    id="internal-notes"
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder={locale === 'vi'
                      ? 'Ghi chú nội bộ, khách không thấy được...'
                      : 'Internal notes, not visible to customers...'}
                    rows={8}
                    className="resize-none"
                  />
                </div>
              </div>
            </>
          )}

          {/* Step 6: Pricing - TỔNG CHI PHÍ */}
          <div className="space-y-2 rounded-lg bg-blue-50">
            {pricingLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">
                  {locale === 'vi' ? 'Đang tính giá...' : 'Calculating...'}
                </span>
              </div>
            ) : (
              <SimplifiedPricingSummary
                pricingData={pricingData}
                locale={locale}
                appliedVoucher={appliedVoucher}
                onVoucherApplied={setAppliedVoucher}
                onVoucherRemoved={() => setAppliedVoucher(null)}
                campsiteId={selectedCampsiteId}
                checkIn={dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined}
                checkOut={dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined}
                productVoucherDiscounts={Object.values(selectedProducts).reduce(
                  (sum, p) => sum + (p.voucherDiscount || 0),
                  0
                )}
              />
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={submitting}
          >
            <X className="h-4 w-4 mr-2" />
            {locale === 'vi' ? 'Hủy' : 'Cancel'}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {locale === 'vi' ? 'Đang tạo...' : 'Creating...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {locale === 'vi' ? 'Tạo Booking' : 'Create Booking'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
