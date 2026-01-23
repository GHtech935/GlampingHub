"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "react-hot-toast"
import Swal from "sweetalert2"
import { useTranslations } from "next-intl"
import { useClientLocale } from "@/components/providers/ClientI18nProvider"
import { useAuth } from "@/hooks/useAuth"
import { GlampingBookingSummaryHeader } from "@/components/glamping-booking/GlampingBookingSummaryHeader"
import { GlampingMyDetailsSection } from "@/components/glamping-booking/GlampingMyDetailsSection"
import { GlampingOtherDetailsSection } from "@/components/glamping-booking/GlampingOtherDetailsSection"
import { GlampingCancellationPolicySection } from "@/components/glamping-booking/GlampingCancellationPolicySection"
import { GlampingPaymentSection } from "@/components/glamping-booking/GlampingPaymentSection"
import { AppliedVoucher } from "@/components/booking/VoucherInput"
import GlampingPricingSummary from "@/components/glamping-booking/GlampingPricingSummary"
import { GlampingMenuProductsSelector, type MenuProduct } from "@/components/glamping-booking/GlampingMenuProductsSelector"

// Zod validation schema function
const createBookingFormSchema = (t: any) => {
  return z.object({
    // My Details
    email: z.string().email(t('validation.emailInvalid')),
    firstName: z.string().min(1, t('validation.firstNameRequired')),
    lastName: z.string().min(1, t('validation.lastNameRequired')),
    country: z.string().min(1, t('validation.countryRequired')),
    phoneCountryCode: z.string().default("+84"),
    phoneNumber: z.string().min(9, t('validation.phoneInvalid')),
    townCity: z.string().optional(),
    postcode: z.string().optional(),
    createPassword: z.string().optional(),

    // Other Details
    partyNames: z.string().optional(),
    specialRequests: z.string().optional(),

    // Payment
    agreeTerms: z.boolean().refine((val) => val === true, {
      message: t('validation.termsRequired'),
    }),
    paymentMethod: z.enum(["pay_now", "pay_later"]).default("pay_now"),
  })
}

type BookingFormData = z.infer<ReturnType<typeof createBookingFormSchema>>

interface BookingData {
  itemId: string
  zoneId?: string
  zoneName: string
  itemName: string
  checkIn: string
  checkOut: string
  adults: number
  children: number
  basePrice: number
  itemImageUrl?: string
  cancellationPolicy?: { vi: string; en: string }
  houseRules?: { vi: string; en: string }
  zoneAddress?: string
  city?: string
  province?: string
  taxEnabled?: boolean
  taxRate?: number
  taxName?: { vi: string; en: string }
  parameterQuantities?: Record<string, number>
  parameters?: Array<{
    id: string
    name: string
    color_code?: string
    quantity: number
  }>
}

function GlampingBookingFormContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { locale } = useClientLocale()
  const t = useTranslations('booking')
  const { user, isCustomer, loading: authLoading } = useAuth()
  const [bookingData, setBookingData] = useState<BookingData | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [appliedVoucher, setAppliedVoucher] = useState<AppliedVoucher | null>(null)
  const [pricingData, setPricingData] = useState<any>(null)
  const [allowPayLater, setAllowPayLater] = useState<boolean>(true)
  const [invoiceNotes, setInvoiceNotes] = useState<string>("")
  const [menuProducts, setMenuProducts] = useState<MenuProduct[]>([])
  const [menuProductSelections, setMenuProductSelections] = useState<Record<string, number>>({})
  const isLoggedIn = !authLoading && user && isCustomer

  // Deposit settings state
  const [depositType, setDepositType] = useState<'percentage' | 'fixed_amount' | null>(null)
  const [depositValue, setDepositValue] = useState<number>(0)
  const [hasDeposit, setHasDeposit] = useState<boolean>(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(createBookingFormSchema(t)),
    defaultValues: {
      phoneCountryCode: "+84",
      country: "Vietnam",
      agreeTerms: false,
      paymentMethod: "pay_now" as const,
    },
  })

  // Fetch public settings (allow_pay_later)
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings/public?keys=allow_pay_later')
        if (response.ok) {
          const data = await response.json()
          const allowPayLaterValue = data.settings?.allow_pay_later
          setAllowPayLater(allowPayLaterValue === true || allowPayLaterValue === 'true')
        }
      } catch (error) {
        console.error('Error fetching settings:', error)
      }
    }
    fetchSettings()
  }, [])

  // Pre-fill form with customer data when logged in
  useEffect(() => {
    if (isLoggedIn && user) {
      setValue('email', user.email || '')
      setValue('firstName', user.firstName || '')
      setValue('lastName', user.lastName || '')
    }
  }, [isLoggedIn, user, setValue])

  // Watch all form values
  const formValues = watch()

  // Calculate menu products total (client-side calculation to match GlampingPricingSummary)
  const menuProductsTotal = menuProducts.reduce((sum, product) => {
    const quantity = menuProductSelections[product.id] || 0;
    return sum + (product.price * quantity);
  }, 0);

  // Calculate actual grand total including menu products
  const accommodationTotal = pricingData?.totals?.accommodationAfterDiscount || 0;
  const voucherDiscount = pricingData?.totals?.voucherDiscount || 0;
  // accommodationTotal already has voucher discount applied, so just add menu products
  const actualGrandTotal = accommodationTotal + menuProductsTotal;

  // Calculate deposit/balance based on actual grand total and deposit settings
  const actualDepositAmount = hasDeposit && depositType
    ? depositType === 'percentage'
      ? actualGrandTotal * (depositValue / 100)
      : depositValue
    : 0;
  const actualBalanceAmount = actualGrandTotal - actualDepositAmount;

  // Load booking data from URL params
  useEffect(() => {
    const loadBookingData = async () => {
      const itemId = searchParams.get("itemId")
      const zoneName = searchParams.get("zoneName")
      const itemName = searchParams.get("itemName")
      const checkIn = searchParams.get("checkIn")
      const checkOut = searchParams.get("checkOut")
      const adults = searchParams.get("adults")
      const children = searchParams.get("children")
      const basePrice = searchParams.get("basePrice")

      if (!itemId || !checkIn || !checkOut) {
        toast.error(t('invalidBookingInfo'))
        router.push("/")
        return
      }

      // Parse parameter quantities from URL (UUID params)
      const parameterQuantities: Record<string, number> = {}
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

      searchParams.forEach((value, key) => {
        if (uuidRegex.test(key)) {
          const quantity = parseInt(value)
          if (!isNaN(quantity) && quantity > 0) {
            parameterQuantities[key] = quantity
          }
        }
      })

      // Fetch glamping item data
      let itemImageUrl = undefined
      let cancellationPolicy = undefined
      let houseRules = undefined
      let zoneAddress = undefined
      let city = undefined
      let province = undefined
      let zoneId = undefined
      let taxEnabled = false
      let taxRate = 0
      let taxName = { vi: 'VAT', en: 'VAT' }
      let parameters: Array<{ id: string; name: string; color_code?: string; quantity: number }> = []

      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

        // Fetch item details
        const response = await fetch(`${baseUrl}/api/glamping/items/${itemId}`, {
          cache: 'no-store'
        })
        if (response.ok) {
          const data = await response.json()
          console.log('[Booking Form] Item data received:', data.item?.id, 'menu_products:', data.item?.menu_products)
          // Get first image
          const firstImage = data.item?.media?.find((m: any) => m.type === 'image')
          itemImageUrl = firstImage?.url

          // Get zone info
          zoneId = data.item?.zone_id

          // Get tax configuration from item
          if (data.item?.taxes && data.item.taxes.length > 0) {
            taxEnabled = true
            const firstTax = data.item.taxes[0]
            taxRate = firstTax.is_percentage ? parseFloat(firstTax.amount) : 0
            taxName = { vi: firstTax.name, en: firstTax.name }
          }

          // Get parameter details from item
          if (data.item?.parameters) {
            parameters = data.item.parameters
              .filter((p: any) => parameterQuantities[p.id])
              .map((p: any) => ({
                id: p.id,
                name: p.name,
                color_code: p.color_code,
                quantity: parameterQuantities[p.id] || 0
              }))
          }

          // Get menu products from item
          if (data.item?.menu_products && data.item.menu_products.length > 0) {
            setMenuProducts(data.item.menu_products)

            // Auto-select required products with quantity 1
            const initialSelections: Record<string, number> = {}
            data.item.menu_products.forEach((mp: MenuProduct) => {
              if (mp.is_required) {
                initialSelections[mp.id] = 1
              }
            })
            if (Object.keys(initialSelections).length > 0) {
              setMenuProductSelections(initialSelections)
            }
          }
        }

        // Fetch deposit settings for the item
        try {
          const depositResponse = await fetch(`${baseUrl}/api/glamping/items/${itemId}/deposit-settings`, {
            cache: 'no-store'
          })
          if (depositResponse.ok) {
            const depositData = await depositResponse.json()
            if (depositData.hasDeposit) {
              setHasDeposit(true)
              setDepositType(depositData.depositType)
              setDepositValue(depositData.depositValue)
            } else {
              setHasDeposit(false)
              setDepositType(null)
              setDepositValue(0)
            }
          }
        } catch (error) {
          console.error('Error fetching deposit settings:', error)
        }

        // Fetch zone details for policies
        if (zoneId) {
          const zoneResponse = await fetch(`${baseUrl}/api/glamping/zones/${zoneId}`, {
            cache: 'no-store'
          })
          if (zoneResponse.ok) {
            const zoneData = await zoneResponse.json()
            zoneAddress = zoneData.zone?.address
            city = zoneData.zone?.city
            province = zoneData.zone?.province

            // Load cancellation policy and house rules from zone settings
            if (zoneData.zone?.cancellation_policy) {
              cancellationPolicy = zoneData.zone.cancellation_policy
            }
            if (zoneData.zone?.house_rules) {
              houseRules = zoneData.zone.house_rules
            }
          }
        }
      } catch (error) {
        console.error("Error fetching item data:", error)
      }

      setBookingData({
        itemId,
        zoneId,
        zoneName: zoneName || "",
        itemName: itemName || "",
        checkIn,
        checkOut,
        adults: parseInt(adults || "2"),
        children: parseInt(children || "0"),
        basePrice: parseFloat(basePrice || "0"),
        itemImageUrl,
        cancellationPolicy,
        houseRules,
        zoneAddress,
        city,
        province,
        taxEnabled,
        taxRate,
        taxName,
        parameterQuantities,
        parameters,
      })
    }

    loadBookingData()
  }, [searchParams, router, t])

  // Fetch pricing data
  useEffect(() => {
    const fetchPricingData = async () => {
      if (!bookingData) return

      try {
        const voucherCode = appliedVoucher?.code || ''

        const params = new URLSearchParams({
          itemId: bookingData.itemId,
          checkIn: bookingData.checkIn,
          checkOut: bookingData.checkOut,
          adults: bookingData.adults.toString(),
          children: bookingData.children.toString(),
        })

        // Add parameter quantities
        if (bookingData.parameterQuantities) {
          Object.entries(bookingData.parameterQuantities).forEach(([paramId, quantity]) => {
            params.append(`param_${paramId}`, quantity.toString())
          })
        }

        if (voucherCode) params.append('discountCode', voucherCode)

        const response = await fetch(`/api/glamping/booking/calculate-pricing?${params.toString()}`)
        const data = await response.json()

        if (!response.ok) {
          console.error('Error fetching pricing:', data.error)
          return
        }

        setPricingData(data)
      } catch (error) {
        console.error('Error fetching pricing:', error)
      }
    }

    const timer = setTimeout(fetchPricingData, 300)
    return () => clearTimeout(timer)
  }, [bookingData, appliedVoucher])

  // Voucher handlers
  const handleVoucherApplied = (voucher: AppliedVoucher) => {
    setAppliedVoucher(voucher)
    toast.success(`Áp dụng voucher ${voucher.code} thành công`)
  }

  const handleVoucherRemoved = () => {
    setAppliedVoucher(null)
    toast.success("Đã xóa voucher")
  }

  const onSubmit = async (data: BookingFormData) => {
    if (!bookingData) {
      toast.error(t('invalidBookingInfo'))
      return
    }

    setIsSubmitting(true)

    try {
      // Build menu product selections for payload
      // API expects: { id, quantity, price, name }
      const menuProductSelectionsPayload = Object.entries(menuProductSelections)
        .filter(([_, qty]) => qty > 0)
        .map(([productId, quantity]) => {
          const product = menuProducts.find(p => p.id === productId)
          return {
            id: productId,
            quantity,
            price: product?.price || 0,
            name: product?.name || '',
          }
        })

      const bookingPayload = {
        // Booking info
        itemId: bookingData.itemId,
        checkInDate: bookingData.checkIn,
        checkOutDate: bookingData.checkOut,
        adults: bookingData.adults,
        children: bookingData.children,

        // Parameter quantities
        parameterQuantities: bookingData.parameterQuantities || {},

        // Menu products
        menuProducts: menuProductSelectionsPayload,

        // Guest details
        guestEmail: data.email,
        guestFirstName: data.firstName,
        guestLastName: data.lastName,
        guestPhone: `${data.phoneCountryCode}${data.phoneNumber}`,
        guestCountry: data.country,
        guestAddress: data.townCity && data.postcode
          ? `${data.townCity}, ${data.postcode}`
          : undefined,

        // Other details
        specialRequirements: data.specialRequests,
        partyNames: data.partyNames,
        invoiceNotes: invoiceNotes || undefined,

        // Voucher code
        discountCode: appliedVoucher?.code,

        // Payment
        paymentMethod: data.paymentMethod,
      }

      const response = await fetch("/api/glamping/booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingPayload),
      })

      if (!response.ok) {
        const error = await response.json()

        // Handle specific error for dates not available
        if (error.errorCode === 'DATES_NOT_AVAILABLE') {
          await Swal.fire({
            icon: 'error',
            title: locale === 'vi' ? 'Ngày đã được đặt' : 'Dates Already Booked',
            html: locale === 'vi'
              ? `Rất tiếc, mặt hàng này đã được đặt trong khoảng thời gian bạn chọn.<br/><br/>Vui lòng chọn ngày khác hoặc quay lại trang chi tiết để chọn ngày còn trống.`
              : `Sorry, this item is already booked for the selected dates.<br/><br/>Please choose different dates or go back to the item details page to select available dates.`,
            confirmButtonText: locale === 'vi' ? 'Đồng ý' : 'OK',
          })
          return
        }

        throw new Error(error.error || t('bookingFailed'))
      }

      const result = await response.json()

      if (result.paymentRequired) {
        toast.success(locale === 'vi' ? 'Đặt phòng thành công! Vui lòng thanh toán.' : 'Booking created! Please complete payment.')
      } else {
        toast.success(locale === 'vi' ? 'Đặt phòng thành công!' : 'Booking confirmed!')
      }

      // Redirect to payment page
      router.push(result.redirectUrl || `/glamping/booking/payment/${result.bookingId}`)

    } catch (error: any) {
      console.error("Booking error:", error)
      toast.error(error.message || t('bookingError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!bookingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('loadingBookingInfo')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Blue header with booking summary */}
        <GlampingBookingSummaryHeader
          bookingData={{
            ...bookingData,
            pitchId: bookingData.itemId,
            campsiteSlug: '',
            campsiteName: bookingData.zoneName,
            pitchName: bookingData.itemName,
            pitchImageUrl: bookingData.itemImageUrl,
          }}
        />

        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-8 space-y-6">
          {/* My Details and Other Details - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* My Details Section */}
            <GlampingMyDetailsSection
              register={register}
              errors={errors}
              watch={watch}
              setValue={setValue}
              locale={locale}
              isLoggedIn={!!isLoggedIn}
            />

            {/* Other Details Section */}
            <GlampingOtherDetailsSection
              register={register}
              errors={errors}
              locale={locale}
              invoiceNotes={invoiceNotes}
              onInvoiceNotesChange={setInvoiceNotes}
            />
          </div>

          {/* Cancellation Policy - Full Width (2 columns: Cancellation Policy + Zone Rules) */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <GlampingCancellationPolicySection
              locale={locale}
              cancellationPolicy={bookingData.cancellationPolicy}
              houseRules={bookingData.houseRules}
            />
          </div>

          {/* Menu Products and Pricing Summary */}
          {menuProducts.length > 0 ? (
            /* Two-column layout on large screens when menu products exist */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Menu Products Selector */}
              <GlampingMenuProductsSelector
                menuProducts={menuProducts}
                selections={menuProductSelections}
                onChange={setMenuProductSelections}
                locale={locale}
              />

              {/* Pricing Summary */}
              <div>
                <GlampingPricingSummary
                  pricingData={pricingData}
                  locale={locale}
                  appliedVoucher={appliedVoucher}
                  onVoucherApplied={handleVoucherApplied}
                  onVoucherRemoved={handleVoucherRemoved}
                  zoneId={bookingData.zoneId}
                  itemId={bookingData.itemId}
                  checkIn={bookingData.checkIn}
                  checkOut={bookingData.checkOut}
                  basePrice={bookingData.basePrice}
                  parameters={bookingData.parameters}
                  menuProducts={menuProducts}
                  menuProductSelections={menuProductSelections}
                />
              </div>
            </div>
          ) : (
            /* Full-width layout when no menu products */
            <div>
              <GlampingPricingSummary
                pricingData={pricingData}
                locale={locale}
                appliedVoucher={appliedVoucher}
                onVoucherApplied={handleVoucherApplied}
                onVoucherRemoved={handleVoucherRemoved}
                zoneId={bookingData.zoneId}
                itemId={bookingData.itemId}
                checkIn={bookingData.checkIn}
                checkOut={bookingData.checkOut}
                basePrice={bookingData.basePrice}
                parameters={bookingData.parameters}
                menuProducts={menuProducts}
                menuProductSelections={menuProductSelections}
              />
            </div>
          )}

          {/* Payment Section */}
          <GlampingPaymentSection
            register={register}
            errors={errors}
            watch={watch}
            setValue={setValue}
            isSubmitting={isSubmitting}
            locale={locale}
            allowPayLater={allowPayLater}
            depositType={depositType || 'percentage'}
            depositValue={depositValue}
            depositAmount={actualDepositAmount}
            balanceAmount={actualBalanceAmount}
            grandTotal={actualGrandTotal}
          />
        </div>
      </form>
    </div>
  )
}

export default function GlampingBookingFormPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div>Loading...</div></div>}>
      <GlampingBookingFormContent />
    </Suspense>
  )
}
