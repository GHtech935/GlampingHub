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
import { X, Plus, Info } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminTentTabContent, createEmptyTent, type AdminTentItem } from './AdminTentTabContent'
import { AdminBookingSummaryTab } from './AdminBookingSummaryTab'
import { AdminPaymentQRModal } from './AdminPaymentQRModal'
import { getLocalizedText } from '@/lib/i18n-utils'
import { addDays, parseISO, format } from 'date-fns'

// ========== LOCALSTORAGE CONSTANTS ==========
const ADMIN_BOOKING_DRAFT_KEY = 'admin_booking_draft'
const DRAFT_EXPIRATION_HOURS = 24
const DRAFT_VERSION = '1.0'

interface AdminBookingDraft {
  version: string
  zoneId: string
  tents: AdminTentItem[]
  activeTabId: string
  selectedCustomerId: string
  newCustomerData: NewCustomerData | null
  preselectedCustomer: Customer | null // Store full customer object for display
  partyNames: string
  specialRequirements: string
  invoiceNotes: string
  internalNotes: string
  paymentMethod: 'pay_now' | 'pay_later'
  dateOfBirth: string
  socialMediaUrl: string
  photoConsent: boolean
  referralSource: string
  lastUpdated: number
  expiresAt: number
}

interface AdminGlampingBookingFormModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  zoneId: string
  locale?: string
  initialData?: {
    itemId?: string
    checkIn?: string
    checkOut?: string
  } | null
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
  locale = 'vi',
  initialData,
}: AdminGlampingBookingFormModalProps) {
  const { toast } = useToast()

  // ========== TENTS STATE ==========
  const [tents, setTents] = useState<AdminTentItem[]>(() => [createEmptyTent()])
  const [activeTabId, setActiveTabId] = useState<string>('')

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

  // ========== CUSTOMER ADDITIONAL INFO STATE ==========
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [socialMediaUrl, setSocialMediaUrl] = useState('')
  const [photoConsent, setPhotoConsent] = useState(true)
  const [referralSource, setReferralSource] = useState('')

  // ========== PRICING STATE ==========
  const [multiPricingData, setMultiPricingData] = useState<any>(null)
  const [pricingLoading, setPricingLoading] = useState(false)

  // ========== DEPOSIT SETTINGS STATE ==========
  const [depositSettings, setDepositSettings] = useState<{
    hasDeposit: boolean
    depositType: 'percentage' | 'fixed_amount' | null
    depositValue: number
  }>({
    hasDeposit: false,
    depositType: null,
    depositValue: 0,
  })

  // ========== QR MODAL STATE ==========
  const [showPaymentQRModal, setShowPaymentQRModal] = useState(false)
  const [createdBookingCode, setCreatedBookingCode] = useState<string>('')

  // ========== LOCALSTORAGE PERSISTENCE STATE ==========
  const [isInitialized, setIsInitialized] = useState(false)
  const [hasDraftRestored, setHasDraftRestored] = useState(false)

  // Initialize activeTabId when tents are first created
  useEffect(() => {
    if (tents.length > 0 && !activeTabId) {
      setActiveTabId(tents[0].id)
    }
  }, [tents, activeTabId])

  // ========== LOAD DRAFT FROM LOCALSTORAGE ==========
  useEffect(() => {
    if (!open) return // Only load when modal opens

    // If initialData is provided, skip draft restoration
    if (initialData?.itemId || initialData?.checkIn || initialData?.checkOut) {
      setIsInitialized(true)
      return
    }

    try {
      const storedDraft = localStorage.getItem(ADMIN_BOOKING_DRAFT_KEY)
      if (storedDraft) {
        const draft: AdminBookingDraft = JSON.parse(storedDraft)

        // Check expiration
        if (draft.expiresAt && Date.now() > draft.expiresAt) {
          localStorage.removeItem(ADMIN_BOOKING_DRAFT_KEY)
          setIsInitialized(true)
          return
        }

        // Check zoneId match - only restore if same zone
        if (draft.zoneId !== zoneId) {
          setIsInitialized(true)
          return
        }

        // Check version compatibility
        if (draft.version !== DRAFT_VERSION) {
          localStorage.removeItem(ADMIN_BOOKING_DRAFT_KEY)
          setIsInitialized(true)
          return
        }

        // Restore all state from draft
        if (draft.tents && draft.tents.length > 0) {
          // Hydrate Date objects from serialized strings
          const hydratedTents = draft.tents.map(tent => ({
            ...tent,
            dateRange: tent.dateRange ? {
              from: tent.dateRange.from ? new Date(tent.dateRange.from) : undefined,
              to: tent.dateRange.to ? new Date(tent.dateRange.to) : undefined,
            } : undefined,
          }))
          setTents(hydratedTents)
        }
        if (draft.activeTabId) {
          setActiveTabId(draft.activeTabId)
        }
        if (draft.selectedCustomerId) {
          setSelectedCustomerId(draft.selectedCustomerId)
        }
        if (draft.newCustomerData) {
          setNewCustomerData(draft.newCustomerData)
        }
        if (draft.preselectedCustomer) {
          setPreselectedCustomer(draft.preselectedCustomer)
        }
        setPartyNames(draft.partyNames || '')
        setSpecialRequirements(draft.specialRequirements || '')
        setInvoiceNotes(draft.invoiceNotes || '')
        setInternalNotes(draft.internalNotes || '')
        setPaymentMethod(draft.paymentMethod || 'pay_later')
        setDateOfBirth(draft.dateOfBirth || '')
        setSocialMediaUrl(draft.socialMediaUrl || '')
        setPhotoConsent(draft.photoConsent ?? true)
        setReferralSource(draft.referralSource || '')

        setHasDraftRestored(true)
      }
    } catch (error) {
      console.error('Error loading draft from localStorage:', error)
      localStorage.removeItem(ADMIN_BOOKING_DRAFT_KEY)
    }
    setIsInitialized(true)
  }, [open, zoneId, initialData])

  // ========== APPLY INITIAL DATA FROM PROPS ==========
  useEffect(() => {
    if (!open || !initialData) return
    if (!initialData.itemId && !initialData.checkIn && !initialData.checkOut) return

    // Apply initialData to the first tent
    setTents(prev => {
      const firstTent = prev[0] || createEmptyTent()
      const updatedTent = { ...firstTent }

      // Set item ID if provided - the item details will be loaded by AdminTentTabContent
      if (initialData.itemId) {
        updatedTent.itemId = initialData.itemId
      }

      // Set dates if provided
      if (initialData.checkIn && initialData.checkOut) {
        const checkInDate = parseISO(initialData.checkIn)
        const checkOutDate = parseISO(initialData.checkOut)
        updatedTent.dateRange = {
          from: checkInDate,
          to: checkOutDate,
        }
        updatedTent.checkIn = initialData.checkIn
        updatedTent.checkOut = initialData.checkOut
        // Calculate nights
        const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
        updatedTent.nights = nights
      }

      return [updatedTent, ...prev.slice(1)]
    })
  }, [open, initialData])

  // ========== SAVE DRAFT TO LOCALSTORAGE ==========
  useEffect(() => {
    if (!isInitialized || !open) return

    try {
      const draft: AdminBookingDraft = {
        version: DRAFT_VERSION,
        zoneId,
        tents,
        activeTabId,
        selectedCustomerId,
        newCustomerData,
        preselectedCustomer,
        partyNames,
        specialRequirements,
        invoiceNotes,
        internalNotes,
        paymentMethod,
        dateOfBirth,
        socialMediaUrl,
        photoConsent,
        referralSource,
        lastUpdated: Date.now(),
        expiresAt: Date.now() + DRAFT_EXPIRATION_HOURS * 60 * 60 * 1000,
      }

      localStorage.setItem(ADMIN_BOOKING_DRAFT_KEY, JSON.stringify(draft))
    } catch (error) {
      console.error('Error saving draft to localStorage:', error)
    }
  }, [
    isInitialized,
    open,
    zoneId,
    tents,
    activeTabId,
    selectedCustomerId,
    newCustomerData,
    preselectedCustomer,
    partyNames,
    specialRequirements,
    invoiceNotes,
    internalNotes,
    paymentMethod,
    dateOfBirth,
    socialMediaUrl,
    photoConsent,
    referralSource,
  ])

  // ========== CLEAR DRAFT FUNCTION ==========
  const clearDraft = useCallback(() => {
    localStorage.removeItem(ADMIN_BOOKING_DRAFT_KEY)
    setHasDraftRestored(false)
    // Reset form to initial state
    const newTent = createEmptyTent()
    setTents([newTent])
    setActiveTabId(newTent.id)
    setSelectedCustomerId('')
    setNewCustomerData(null)
    setPreselectedCustomer(null)
    setPartyNames('')
    setSpecialRequirements('')
    setInvoiceNotes('')
    setInternalNotes('')
    setPaymentMethod('pay_later')
    setDateOfBirth('')
    setSocialMediaUrl('')
    setPhotoConsent(true)
    setReferralSource('')
    setMultiPricingData(null)
  }, [])

  // ========== TENT MANAGEMENT ==========
  const addTent = useCallback(() => {
    const newTent = createEmptyTent()

    // Copy dates from first tent if available
    const firstTent = tents[0]
    if (firstTent && firstTent.dateRange?.from && firstTent.dateRange?.to) {
      newTent.dateRange = { ...firstTent.dateRange }
      newTent.checkIn = firstTent.checkIn
      newTent.checkOut = firstTent.checkOut
      newTent.nights = firstTent.nights
    }

    setTents(prev => [...prev, newTent])
    setActiveTabId(newTent.id)
  }, [tents])

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

              // Calculate accommodation cost locally (not from API totals which may have qty=0 bug)
              // This ensures qty=0 parameters contribute 0 to the total
              let calculatedAccommodationCost = 0
              if (itemPricing.parameterPricing && tent.itemParameters.length > 0) {
                tent.itemParameters.forEach((param) => {
                  const paramId = param.parameter_id || param.id
                  const qty = tent.parameterQuantities[paramId] || 0
                  const pricePerUnitAllNights = itemPricing.parameterPricing?.[paramId] || 0
                  const pricingMode = itemPricing.parameterPricingModes?.[paramId] || 'per_person'
                  const isPerGroup = pricingMode === 'per_group'

                  // per_group: fixed price, per_person: price × quantity
                  calculatedAccommodationCost += isPerGroup ? pricePerUnitAllNights : pricePerUnitAllNights * qty
                })
              } else {
                // Fallback to API value if no parameter pricing available
                calculatedAccommodationCost = itemPricing.accommodationCost || 0
              }

              const addonCost = Object.values(tent.addonSelections || {}).reduce((sum, sel) => {
                if (!sel || !sel.selected) return sum
                return sum + (sel.totalPrice || 0)
              }, 0)

              return {
                ...tent,
                pricingBreakdown: {
                  accommodationCost: calculatedAccommodationCost,
                  menuProductsCost: menuCost,
                  addonsCost: addonCost,
                  subtotal: calculatedAccommodationCost + menuCost + addonCost,
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

  // ========== FETCH DEPOSIT SETTINGS ==========
  useEffect(() => {
    const fetchDepositSettings = async () => {
      // Find first tent with itemId
      const firstTentWithItem = tents.find(t => t.itemId)
      if (!firstTentWithItem?.itemId) {
        setDepositSettings({
          hasDeposit: false,
          depositType: null,
          depositValue: 0,
        })
        return
      }

      try {
        const res = await fetch(`/api/glamping/items/${firstTentWithItem.itemId}/deposit-settings`)
        if (res.ok) {
          const data = await res.json()
          setDepositSettings({
            hasDeposit: data.hasDeposit,
            depositType: data.depositType,
            depositValue: data.depositValue,
          })
        }
      } catch (error) {
        console.error('Error fetching deposit settings:', error)
      }
    }

    fetchDepositSettings()
  }, [tents.map(t => t.itemId).filter(Boolean).join(',')])

  // ========== GRAND TOTAL CALCULATION ==========
  const calculateGrandTotal = useCallback(() => {
    const totalAccommodation = tents.reduce((sum, t) => sum + (t.pricingBreakdown?.accommodationCost || 0), 0)
    const totalAccDiscount = tents.reduce((sum, t) => sum + (t.accommodationVoucher?.discountAmount || 0), 0)
    const totalMenuProducts = tents.reduce((sum, t) => {
      return sum + Object.values(t.menuProducts || {}).reduce((s, nightSels) => {
        if (!nightSels) return s
        return s + Object.values(nightSels)
          .filter((p: any) => p.quantity > 0)
          .reduce((s2, p: any) => s2 + p.price * p.quantity, 0)
      }, 0)
    }, 0)
    const totalMenuDiscount = tents.reduce((sum, t) => {
      return sum + Object.values(t.menuProducts || {}).reduce((s, nightSels) => {
        if (!nightSels) return s
        return s + Object.values(nightSels)
          .filter((p: any) => p.quantity > 0 && p.voucher?.discountAmount)
          .reduce((s2, p: any) => s2 + (p.voucher?.discountAmount || 0), 0)
      }, 0)
    }, 0)
    const totalAddonsCost = tents.reduce((sum, t) => {
      return sum + Object.values(t.addonSelections || {}).reduce((s, sel) => {
        if (!sel || !sel.selected) return s
        const effectivePrice = sel.usePriceOverride && sel.priceOverride !== undefined
          ? sel.priceOverride
          : (sel.totalPrice || 0)
        return s + effectivePrice
      }, 0)
    }, 0)
    const totalAddonsDiscount = tents.reduce((sum, t) => {
      return sum + Object.values(t.addonSelections || {}).reduce((s, sel) => {
        if (!sel || !sel.selected) return s
        // For regular addons, voucher is on the addon itself
        let discount = sel.voucher?.discountAmount || 0
        // For product group parents, vouchers are on child items
        if (sel.isProductGroupParent && sel.selectedChildren) {
          Object.values(sel.selectedChildren).forEach((child) => {
            discount += child?.voucher?.discountAmount || 0
          })
        }
        return s + discount
      }, 0)
    }, 0)

    return totalAccommodation - totalAccDiscount + totalMenuProducts - totalMenuDiscount + totalAddonsCost - totalAddonsDiscount
  }, [tents])

  const grandTotal = calculateGrandTotal()

  // ========== DEPOSIT AMOUNT CALCULATION ==========
  const calculateDepositAmount = useCallback(() => {
    if (!depositSettings.hasDeposit || !depositSettings.depositValue) {
      return 0
    }

    if (depositSettings.depositType === 'percentage') {
      return Math.round(grandTotal * (depositSettings.depositValue / 100))
    }

    // fixed_amount
    return Math.min(depositSettings.depositValue, grandTotal)
  }, [depositSettings, grandTotal])

  const depositAmount = calculateDepositAmount()
  const balanceAmount = grandTotal - depositAmount

  // ========== CUSTOMER HANDLING ==========
  const handleCustomerSelect = useCallback((customerId: string, customer?: Customer) => {
    setSelectedCustomerId(customerId)
    setNewCustomerData(null)
    // Set preselectedCustomer: to customer if provided, null if clearing
    setPreselectedCustomer(customer || null)
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
  // Returns booking code on success, null on failure
  const handleSubmit = async (showQRAfter: boolean = false): Promise<string | null> => {
    const validationError = validateForm()
    if (validationError) {
      toast({
        title: locale === 'vi' ? 'Lỗi' : 'Error',
        description: validationError,
        variant: 'destructive'
      })
      // Scroll to email field if error is email-related
      if (validationError.includes('email') || validationError.includes('Email')) {
        const el = document.getElementById('new-email')
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.focus()
        }
      }
      return null
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

        const addonPayload = Object.values(t.addonSelections || {})
          .filter(sel => sel.selected)
          .map(sel => ({
            addonItemId: sel.addonItemId,
            quantity: sel.quantity,
            parameterQuantities: sel.parameterQuantities,
            dates: sel.dates || undefined,
            totalPrice: sel.totalPrice || 0,
            parameterPricing: sel.parameterPricing || {},
            voucher: sel.voucher ? { ...sel.voucher } : undefined,
            // Add override if set
            ...(sel.usePriceOverride && sel.priceOverride !== undefined && {
              priceOverride: sel.priceOverride
            }),
            // Product group fields
            ...(sel.isProductGroupParent && {
              isProductGroupParent: true,
              selectedChildren: sel.selectedChildren,
            }),
          }))

        return {
          itemId: t.itemId,
          checkInDate: t.checkIn,
          checkOutDate: t.checkOut,
          adults: t.adults,
          children: t.children,
          parameterQuantities: t.parameterQuantities,
          accommodationVoucher: t.accommodationVoucher || undefined,
          menuProducts: flatMenuProducts,
          addons: addonPayload,
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
        // Customer additional info
        dateOfBirth: dateOfBirth || undefined,
        socialMediaUrl: socialMediaUrl || undefined,
        photoConsent,
        referralSource: referralSource || undefined,
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
        // Clear draft on successful submission
        localStorage.removeItem(ADMIN_BOOKING_DRAFT_KEY)
        setHasDraftRestored(false)

        // If showing QR modal after, don't show toast, don't call onSuccess yet
        // onSuccess will be called when user closes the QR modal
        if (showQRAfter) {
          setCreatedBookingCode(result.bookingCode)
          setShowPaymentQRModal(true)
          return result.bookingCode
        }

        // For free bookings (no QR needed), show toast and close
        toast({
          title: locale === 'vi' ? 'Thành công' : 'Success',
          description: locale === 'vi'
            ? `Booking ${result.bookingCode} đã được tạo`
            : `Booking ${result.bookingCode} created successfully`
        })
        onSuccess()
        handleClose()
        return result.bookingCode
      } else if (response.status === 409 && result.errorCode === 'DATES_NOT_AVAILABLE') {
        // Specific handling for availability conflict
        toast({
          title: locale === 'vi' ? 'Lều không khả dụng' : 'Item Not Available',
          description: result.error || (locale === 'vi'
            ? 'Lều đã được đặt hết trong khoảng thời gian này. Vui lòng chọn ngày khác.'
            : 'This item is fully booked for the selected dates. Please choose different dates.'),
          variant: 'destructive'
        })
        return null
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
      return null
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
    // Reset customer additional info
    setDateOfBirth('')
    setSocialMediaUrl('')
    setPhotoConsent(true)
    setReferralSource('')
    // Reset localStorage persistence state
    setIsInitialized(false)
    setHasDraftRestored(false)
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

        {/* Draft Restored Notification */}
        {hasDraftRestored && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-md px-4 py-2 text-sm text-blue-800">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span>
                {locale === 'vi'
                  ? 'Đã khôi phục dữ liệu từ phiên làm việc trước'
                  : 'Restored data from previous session'}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearDraft}
              className="h-7 px-2 text-blue-800 hover:text-blue-900 hover:bg-blue-100"
            >
              {locale === 'vi' ? 'Xóa' : 'Clear'}
            </Button>
          </div>
        )}

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
              dateOfBirth={dateOfBirth}
              onDateOfBirthChange={setDateOfBirth}
              socialMediaUrl={socialMediaUrl}
              onSocialMediaUrlChange={setSocialMediaUrl}
              photoConsent={photoConsent}
              onPhotoConsentChange={setPhotoConsent}
              referralSource={referralSource}
              onReferralSourceChange={setReferralSource}
              internalNotes={internalNotes}
              onInternalNotesChange={setInternalNotes}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              pricingData={multiPricingData}
              pricingLoading={pricingLoading}
              depositSettings={depositSettings}
              grandTotal={grandTotal}
              depositAmount={depositAmount}
              balanceAmount={balanceAmount}
              onShowPaymentModal={async () => {
                // If grand total is 0, skip QR modal and create booking directly
                if (grandTotal === 0) {
                  await handleSubmit(false)
                } else {
                  // Create booking first, then show QR modal with actual booking code
                  await handleSubmit(true)
                }
              }}
              submitting={submitting}
              validateForm={validateForm}
            />
          </TabsContent>
        </Tabs>

        {/* Payment QR Modal */}
        <AdminPaymentQRModal
          isOpen={showPaymentQRModal}
          onClose={() => {
            setShowPaymentQRModal(false)
            setCreatedBookingCode('')
            // Now trigger onSuccess to refresh data, then close the main modal
            onSuccess()
            handleClose()
          }}
          locale={locale}
          paymentMethod={paymentMethod}
          grandTotal={grandTotal}
          depositAmount={depositAmount}
          zoneId={zoneId}
          bookingCode={createdBookingCode}
        />
      </DialogContent>
    </Dialog>
  )
}
