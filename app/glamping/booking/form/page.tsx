"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState, useMemo, Suspense } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "react-hot-toast"
import Swal from "sweetalert2"
import { useTranslations } from "next-intl"
import { useClientLocale } from "@/components/providers/ClientI18nProvider"
import { useAuth } from "@/hooks/useAuth"
import { useGlampingCart } from "@/components/providers/GlampingCartProvider"
import { GlampingBookingSummaryHeader } from "@/components/glamping-booking/GlampingBookingSummaryHeader"
import { GlampingMyDetailsSection } from "@/components/glamping-booking/GlampingMyDetailsSection"
import { GlampingOtherDetailsSection } from "@/components/glamping-booking/GlampingOtherDetailsSection"
import { GlampingCancellationPolicySection } from "@/components/glamping-booking/GlampingCancellationPolicySection"
import { GlampingPaymentSection } from "@/components/glamping-booking/GlampingPaymentSection"
import { AppliedVoucher } from "@/components/booking/VoucherInput"
import GlampingPricingSummary from "@/components/glamping-booking/GlampingPricingSummary"
import { GlampingMenuProductsSelector, type MenuProduct } from "@/components/glamping-booking/GlampingMenuProductsSelector"
import { CartItemsList } from "@/components/glamping-booking/CartItemsList"

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

    // New customer info fields
    dateOfBirth: z.string().min(1, t('validation.dateOfBirthRequired')),
    socialMediaUrl: z.string().optional(),
    photoConsent: z.boolean().default(true),
    referralSource: z.string().optional(),

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
    name: string | { vi?: string; en?: string }
    color_code?: string
    quantity: number
    counted_for_menu?: boolean
  }>
}

function GlampingBookingFormContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { locale } = useClientLocale()
  const t = useTranslations('booking')
  const { user, isCustomer, loading: authLoading } = useAuth()
  const { cart, clearCart, isInitialized: cartInitialized } = useGlampingCart()
  const [bookingData, setBookingData] = useState<BookingData | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookingSubmitted, setBookingSubmitted] = useState(false)
  const [appliedVoucher, setAppliedVoucher] = useState<AppliedVoucher | null>(null)
  const [pricingData, setPricingData] = useState<any>(null)
  const [allowPayLater, setAllowPayLater] = useState<boolean>(true)
  const [invoiceNotes, setInvoiceNotes] = useState<string>("")
  const [menuProducts, setMenuProducts] = useState<MenuProduct[]>([])
  const [menuProductSelections, setMenuProductSelections] = useState<Record<string, { quantity: number; price: number; name: string; voucher?: any }>>({})
  const isLoggedIn = !authLoading && user && isCustomer

  // Cart mode state
  const isCartMode = searchParams.get('from') === 'cart'

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
      photoConsent: true,
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

  // Calculate total counted guests from cart items or single booking
  const totalCountedGuests = useMemo(() => {
    if (isCartMode && cart && cart.items.length > 0) {
      // Cart mode: Sum counted parameters from all cart items
      let total = 0;
      for (const item of cart.items) {
        if (item.parameters) {
          item.parameters.forEach((param: any) => {
            if (param.counted_for_menu) {
              total += param.quantity || 0;
            }
          });
        }
      }
      return total;
    } else if (bookingData?.parameters) {
      // Single booking mode: Count from bookingData parameters
      return bookingData.parameters.reduce((sum, param: any) => {
        if (param.counted_for_menu) {
          return sum + (param.quantity || 0);
        }
        return sum;
      }, 0);
    }
    return 0;
  }, [isCartMode, cart, bookingData?.parameters]);

  // Calculate menu products total (client-side calculation to match GlampingPricingSummary)
  const menuProductsTotal = Object.values(menuProductSelections).reduce((sum, selection) => {
    const itemTotal = selection.price * selection.quantity;
    const discount = selection.voucher?.discountAmount || 0;
    return sum + itemTotal - discount;
  }, 0);

  // Calculate actual grand total - different logic for cart mode vs single-item mode
  const actualGrandTotal = useMemo(() => {
    if (isCartMode && cart && cart.items.length > 0) {
      // Cart mode: Sum all cart items (vouchers already applied per item)
      return cart.items.reduce((sum, item) => {
        const itemTotal = Number(item.pricingBreakdown?.subtotal || item.totalPrice || item.basePrice) || 0;
        return sum + itemTotal;
      }, 0);
    } else {
      // Single-item mode: Use pricing data
      const accommodationTotal = pricingData?.totals?.accommodationAfterDiscount || 0;
      return accommodationTotal + menuProductsTotal;
    }
  }, [isCartMode, cart, pricingData, menuProductsTotal]);

  // Calculate deposit/balance based on actual grand total and deposit settings
  const actualDepositAmount = hasDeposit && depositType
    ? depositType === 'percentage'
      ? actualGrandTotal * (depositValue / 100)
      : depositValue
    : 0;
  const actualBalanceAmount = actualGrandTotal - actualDepositAmount;

  // Load booking data from URL params or cart
  useEffect(() => {
    const loadBookingData = async () => {
      // Cart mode: Load data from cart context
      if (isCartMode) {
        // Wait for cart to initialize from localStorage
        if (!cartInitialized) {
          console.log('[Booking Form] Waiting for cart to initialize...')
          return
        }

        // Skip cart check if booking was already submitted (prevents redirect loop after successful booking)
        if (bookingSubmitted) {
          console.log('[Booking Form] Booking already submitted, skipping cart check')
          return
        }

        // Now check if cart is empty AFTER it's initialized
        if (!cart || cart.items.length === 0) {
          console.log('[Booking Form] Cart is empty after initialization, redirecting...')
          toast.error(t('cart.empty'))
          router.push('/')
          return
        }

        console.log('[Booking Form] Cart loaded successfully with', cart.items.length, 'items')

        // For cart mode, we'll use the first item's zone info as the booking zone
        // All items must be from the same zone (enforced by cart provider)
        const firstItem = cart.items[0]

        // Fetch zone details for policies
        let cancellationPolicy = undefined
        let houseRules = undefined
        let zoneAddress = undefined
        let city = undefined
        let province = undefined
        let taxEnabled = false
        let taxRate = 0
        let taxName = { vi: 'VAT', en: 'VAT' }

        try {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:4000'
          const zoneResponse = await fetch(`${baseUrl}/api/glamping/zones/${firstItem.zoneId}`, {
            cache: 'no-store'
          })
          if (zoneResponse.ok) {
            const zoneData = await zoneResponse.json()
            zoneAddress = zoneData.zone?.address
            city = zoneData.zone?.city
            province = zoneData.zone?.province
            cancellationPolicy = zoneData.zone?.cancellation_policy
            houseRules = zoneData.zone?.house_rules
          }

          // Fetch tax info from first item
          const itemResponse = await fetch(`${baseUrl}/api/glamping/items/${firstItem.itemId}`, {
            cache: 'no-store'
          })
          if (itemResponse.ok) {
            const itemData = await itemResponse.json()
            if (itemData.item?.taxes && itemData.item.taxes.length > 0) {
              taxEnabled = true
              const firstTax = itemData.item.taxes[0]
              taxRate = firstTax.is_percentage ? parseFloat(firstTax.amount) : 0
              taxName = { vi: firstTax.name, en: firstTax.name }
            }

            // Get menu products from zone (if applicable)
            if (itemData.item?.menu_products && itemData.item.menu_products.length > 0) {
              setMenuProducts(itemData.item.menu_products)

              // Auto-select required products
              const initialSelections: Record<string, { quantity: number; price: number; name: string; voucher?: any }> = {}
              itemData.item.menu_products.forEach((mp: MenuProduct) => {
                if (mp.is_required) {
                  const name = typeof mp.name === 'string' ? mp.name : (mp.name?.vi || mp.name?.en || 'Unknown');
                  initialSelections[mp.id] = {
                    quantity: 1,
                    price: mp.price,
                    name,
                    voucher: null
                  }
                }
              })
              if (Object.keys(initialSelections).length > 0) {
                setMenuProductSelections(initialSelections)
              }
            }
          }

          // Fetch deposit settings from first item (assuming all items have same deposit settings)
          const depositResponse = await fetch(`${baseUrl}/api/glamping/items/${firstItem.itemId}/deposit-settings`, {
            cache: 'no-store'
          })
          if (depositResponse.ok) {
            const depositData = await depositResponse.json()
            if (depositData.hasDeposit) {
              setHasDeposit(true)
              setDepositType(depositData.depositType)
              setDepositValue(depositData.depositValue)
            }
          }
        } catch (error) {
          console.error('Error fetching zone/item details for cart mode:', error)
        }

        // Set booking data for cart mode (used for zone info, policies, etc.)
        setBookingData({
          itemId: firstItem.itemId, // Use first item ID for compatibility
          zoneId: firstItem.zoneId,
          zoneName: firstItem.zoneName.vi,
          itemName: `${cart.items.length} lều`, // Multi-item indicator
          checkIn: firstItem.checkIn, // Use first item's dates for display
          checkOut: firstItem.checkOut,
          adults: firstItem.adults,
          children: firstItem.children,
          basePrice: cart.items.reduce((sum, item) => sum + item.basePrice, 0),
          itemImageUrl: firstItem.itemImageUrl,
          cancellationPolicy,
          houseRules,
          zoneAddress,
          city,
          province,
          taxEnabled,
          taxRate,
          taxName,
          parameterQuantities: firstItem.parameterQuantities,
          parameters: firstItem.parameters,
        })

        return
      }

      // Single-item mode: Load from URL params (existing logic)
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
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:4000'

        // Fetch item details
        const itemUrl = `${baseUrl}/api/glamping/items/${itemId}`
        console.log('[Booking Form] Fetching item from:', itemUrl)
        const response = await fetch(itemUrl, {
          cache: 'no-store'
        })
        console.log('[Booking Form] Item response status:', response.status, response.ok)
        if (!response.ok) {
          console.error('[Booking Form] Failed to fetch item:', response.status, response.statusText)
          const text = await response.text()
          console.error('[Booking Form] Response body:', text.substring(0, 200))
          throw new Error(`Failed to fetch item: ${response.status}`)
        }

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
          const initialSelections: Record<string, { quantity: number; price: number; name: string; voucher?: any }> = {}
          data.item.menu_products.forEach((mp: MenuProduct) => {
            if (mp.is_required) {
              const name = typeof mp.name === 'string' ? mp.name : (mp.name?.vi || mp.name?.en || 'Unknown');
              initialSelections[mp.id] = {
                quantity: 1,
                price: mp.price,
                name,
                voucher: null
              }
            }
          })
          if (Object.keys(initialSelections).length > 0) {
            setMenuProductSelections(initialSelections)
          }
        }

        // Fetch deposit settings for the item
        try {
          const depositResponse = await fetch(`${baseUrl}/api/glamping/items/${itemId}/deposit-settings`, {
            cache: 'no-store'
          })
          if (!depositResponse.ok) {
            console.error('[Booking Form] Failed to fetch deposit settings:', depositResponse.status)
            throw new Error(`Failed to fetch deposit settings: ${depositResponse.status}`)
          }

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
        } catch (error) {
          console.error('Error fetching deposit settings:', error)
          // Set defaults on error
          setHasDeposit(false)
          setDepositType(null)
          setDepositValue(0)
        }

        // Fetch zone details for policies
        if (zoneId) {
          try {
            const zoneResponse = await fetch(`${baseUrl}/api/glamping/zones/${zoneId}`, {
              cache: 'no-store'
            })
            if (!zoneResponse.ok) {
              console.error('[Booking Form] Failed to fetch zone:', zoneResponse.status)
              throw new Error(`Failed to fetch zone: ${zoneResponse.status}`)
            }

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
          } catch (error) {
            console.error('Error fetching zone details:', error)
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
  }, [searchParams, router, t, isCartMode, cart, cartInitialized, bookingSubmitted])

  // Fetch pricing data
  useEffect(() => {
    const fetchPricingData = async () => {
      if (!bookingData) return

      try {
        const voucherCode = appliedVoucher?.code || ''

        // Cart mode: Use multi-item pricing API
        if (isCartMode && cart && cart.items.length > 0) {
          const itemsPayload = cart.items.map(item => ({
            itemId: item.itemId,
            checkIn: item.checkIn,
            checkOut: item.checkOut,
            adults: item.adults,
            children: item.children,
            parameterQuantities: item.parameterQuantities || {}
          }))

          const params = new URLSearchParams({
            items: JSON.stringify(itemsPayload),
          })

          if (voucherCode) params.append('discountCode', voucherCode)

          const response = await fetch(`/api/glamping/booking/calculate-multi-pricing?${params.toString()}`)
          const data = await response.json()

          if (!response.ok) {
            console.error('Error fetching multi-item pricing:', data.error)
            return
          }

          setPricingData(data)
        } else {
          // Single-item mode: Use existing API
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
        }
      } catch (error) {
        console.error('Error fetching pricing:', error)
      }
    }

    const timer = setTimeout(fetchPricingData, 300)
    return () => clearTimeout(timer)
  }, [bookingData, appliedVoucher, isCartMode, cart])

  // Voucher handlers
  const handleVoucherApplied = (voucher: AppliedVoucher) => {
    setAppliedVoucher(voucher)
    toast.success(t('voucher.applied', { code: voucher.code }))
  }

  const handleVoucherRemoved = () => {
    setAppliedVoucher(null)
    toast.success(t('voucher.removed'))
  }

  const onSubmit = async (data: BookingFormData) => {
    if (!bookingData) {
      toast.error(t('invalidBookingInfo'))
      return
    }

    setIsSubmitting(true)

    try {
      let bookingPayload: any = {}

      // Cart mode: Build multi-item payload
      if (isCartMode && cart && cart.items.length > 0) {
        // Build menu product selections for payload
        const menuProductSelectionsPayload = Object.entries(menuProductSelections)
          .filter(([_, selection]) => selection.quantity > 0)
          .map(([productId, selection]) => {
            return {
              id: productId,
              quantity: selection.quantity,
              price: selection.price,
              name: selection.name,
            }
          })

        // Build items array from cart (includes per-tent voucher + per-product vouchers)
        const itemsPayload = cart.items.map(item => {
          // Extract menu products with voucher info
          // Handles both flat format: Record<string, MenuProductSelection>
          // and per-night format: Record<number, Record<string, MenuProductSelection>>
          const itemMenuProducts: Array<{ id: string; quantity: number; price: number; name: string; voucher?: any; servingDate?: string }> = [];
          if (item.menuProducts && typeof item.menuProducts === 'object') {
            const entries = Object.entries(item.menuProducts);
            const isPerNight = entries.length > 0 && typeof Object.values(entries[0]?.[1] || {})[0] === 'object'
              && !('quantity' in (entries[0]?.[1] || {}));

            if (isPerNight) {
              // Per-night format: flatten to individual entries with servingDate
              for (const [nightIndexStr, nightProducts] of entries) {
                const nightIndex = parseInt(nightIndexStr);
                const nightMap = nightProducts as Record<string, { quantity: number; price: number; name: string; voucher?: any }>;
                // Calculate serving date from checkIn + nightIndex
                const checkInDate = new Date(item.checkIn);
                const servingDate = new Date(checkInDate);
                servingDate.setDate(servingDate.getDate() + nightIndex);
                const servingDateStr = servingDate.toISOString().split('T')[0];

                for (const [productId, sel] of Object.entries(nightMap)) {
                  if (sel && sel.quantity > 0) {
                    itemMenuProducts.push({
                      id: productId,
                      quantity: sel.quantity,
                      price: sel.price,
                      name: sel.name,
                      voucher: sel.voucher || undefined,
                      servingDate: servingDateStr,
                    });
                  }
                }
              }
            } else {
              // Flat format: Record<string, MenuProductSelection>
              const selections = item.menuProducts as Record<string, { quantity: number; price: number; name: string; voucher?: any }>;
              Object.entries(selections).forEach(([productId, sel]) => {
                if (sel && sel.quantity > 0) {
                  itemMenuProducts.push({
                    id: productId,
                    quantity: sel.quantity,
                    price: sel.price,
                    name: sel.name,
                    voucher: sel.voucher || undefined,
                  });
                }
              });
            }
          }

          return {
            itemId: item.itemId,
            checkInDate: item.checkIn,
            checkOutDate: item.checkOut,
            adults: item.adults,
            children: item.children,
            parameterQuantities: item.parameterQuantities || {},
            // Per-tent accommodation voucher
            accommodationVoucher: item.accommodationVoucher || null,
            // Menu products with per-product vouchers
            menuProducts: itemMenuProducts,
          };
        })

        bookingPayload = {
          // Multi-item booking
          items: itemsPayload,

          // Shared menu products (if any - applied to entire booking)
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

          // New customer info fields
          dateOfBirth: data.dateOfBirth,
          socialMediaUrl: data.socialMediaUrl,
          photoConsent: data.photoConsent,
          referralSource: data.referralSource,

          // Cart mode: per-item vouchers are inside items[].accommodationVoucher and items[].menuProducts[].voucher
          // Only send global discountCode as fallback if no per-item vouchers exist
          discountCode: appliedVoucher?.code,

          // Payment
          paymentMethod: data.paymentMethod,
        }
      } else {
        // Single-item mode: Build existing payload
        const menuProductSelectionsPayload = Object.entries(menuProductSelections)
          .filter(([_, selection]) => selection.quantity > 0)
          .map(([productId, selection]) => {
            return {
              id: productId,
              quantity: selection.quantity,
              price: selection.price,
              name: selection.name,
              voucher: selection.voucher || undefined,
            }
          })

        bookingPayload = {
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

          // New customer info fields
          dateOfBirth: data.dateOfBirth,
          socialMediaUrl: data.socialMediaUrl,
          photoConsent: data.photoConsent,
          referralSource: data.referralSource,

          // Voucher code
          discountCode: appliedVoucher?.code,

          // Payment
          paymentMethod: data.paymentMethod,
        }
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
            title: t('datesAlreadyBooked'),
            html: t('datesAlreadyBookedMessage'),
            confirmButtonText: t('confirmButton'),
          })
          return
        }

        throw new Error(error.error || t('bookingFailed'))
      }

      const result = await response.json()

      // Mark booking as submitted to prevent useEffect redirect loop
      setBookingSubmitted(true)

      // Clear cart if in cart mode
      if (isCartMode) {
        clearCart()
      }

      if (result.paymentRequired) {
        toast.success(t('bookingSuccessPayment'))
      } else {
        toast.success(t('bookingSuccess'))
      }

      // Redirect to payment page
      const redirectUrl = result.redirectUrl || `/glamping/booking/payment/${result.bookingId}`
      router.push(redirectUrl)

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

  // Show loading state while cart is initializing (for cart mode)
  if (isCartMode && !cartInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">{t('cart.loading')}</p>
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

        <div className="max-w-6xl mx-auto px-6 lg:px-12 py-8 space-y-6">
          {/* Cart Items List (only in cart mode) */}
          {isCartMode && cart && cart.items.length > 0 && (
            <CartItemsList />
          )}

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

          {/* Pricing Summary - Full Width */}
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
              cartItems={isCartMode && cart ? cart.items : undefined}
              isCartMode={isCartMode}
            />
          </div>

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
