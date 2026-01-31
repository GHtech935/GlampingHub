'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Save } from 'lucide-react'
import { CustomerSearchSelect } from './CustomerSearchSelect'
import { SimpleRichTextEditor } from '@/components/ui/SimpleRichTextEditor'
import { formatCurrency } from '@/lib/utils'
import { getLocalizedText } from '@/lib/i18n-utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AdminTentItem } from './AdminTentTabContent'

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

interface AdminBookingSummaryTabProps {
  tents: AdminTentItem[]
  zoneId: string
  locale: string
  // Customer state
  selectedCustomerId: string
  onCustomerSelect: (customerId: string, customer?: Customer) => void
  newCustomerData: NewCustomerData | null
  onNewCustomerData: (data: NewCustomerData | null) => void
  preselectedCustomer: Customer | null
  // Guest info
  partyNames: string
  onPartyNamesChange: (v: string) => void
  specialRequirements: string
  onSpecialRequirementsChange: (v: string) => void
  invoiceNotes: string
  onInvoiceNotesChange: (v: string) => void
  // Customer additional info
  dateOfBirth: string
  onDateOfBirthChange: (v: string) => void
  socialMediaUrl: string
  onSocialMediaUrlChange: (v: string) => void
  photoConsent: boolean
  onPhotoConsentChange: (v: boolean) => void
  referralSource: string
  onReferralSourceChange: (v: string) => void
  // Notes & payment
  internalNotes: string
  onInternalNotesChange: (v: string) => void
  paymentMethod: 'pay_now' | 'pay_later'
  onPaymentMethodChange: (v: 'pay_now' | 'pay_later') => void
  // Pricing
  pricingData: any
  pricingLoading: boolean
  // Submit
  onSubmit: () => void
  submitting: boolean
  validateForm: () => string | null
}

export function AdminBookingSummaryTab({
  tents,
  zoneId,
  locale,
  selectedCustomerId,
  onCustomerSelect,
  newCustomerData,
  onNewCustomerData,
  preselectedCustomer,
  partyNames,
  onPartyNamesChange,
  specialRequirements,
  onSpecialRequirementsChange,
  invoiceNotes,
  onInvoiceNotesChange,
  dateOfBirth,
  onDateOfBirthChange,
  socialMediaUrl,
  onSocialMediaUrlChange,
  photoConsent,
  onPhotoConsentChange,
  referralSource,
  onReferralSourceChange,
  internalNotes,
  onInternalNotesChange,
  paymentMethod,
  onPaymentMethodChange,
  pricingData,
  pricingLoading,
  onSubmit,
  submitting,
  validateForm,
}: AdminBookingSummaryTabProps) {
  const handleCustomerSelect = (customerId: string, customer: Customer) => {
    onCustomerSelect(customerId, customer)
  }

  const handleNewCustomerData = (data: NewCustomerData) => {
    onNewCustomerData(data)
  }

  return (
    <div className="space-y-6 py-4">
      {/* Section 1: Customer */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-sm">1</span>
          {locale === 'vi' ? 'Khách Hàng' : 'Customer'}
          <span className="text-red-500">*</span>
        </h3>
        <CustomerSearchSelect
          selectedCustomerId={selectedCustomerId}
          onCustomerSelect={handleCustomerSelect}
          onNewCustomerData={handleNewCustomerData}
          preselectedCustomer={preselectedCustomer || undefined}
          locale={locale}
        />
      </div>

      {/* Section 3: Guest Requirements */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-sm">2</span>
          {locale === 'vi' ? 'Yêu Cầu Của Khách' : 'Guest Requirements'}
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="party-names">
              {locale === 'vi' ? 'Tên các thành viên trong đoàn' : 'Party member names'}
            </Label>
            <Textarea
              id="party-names"
              placeholder={locale === 'vi' ? 'Nhập tên các thành viên...' : 'Enter party member names...'}
              value={partyNames}
              onChange={(e) => onPartyNamesChange(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="special-requirements">
              {locale === 'vi' ? 'Yêu cầu đặc biệt' : 'Special requirements'}
            </Label>
            <Textarea
              id="special-requirements"
              placeholder={locale === 'vi' ? 'Yêu cầu đặc biệt của khách...' : 'Special customer requirements...'}
              value={specialRequirements}
              onChange={(e) => onSpecialRequirementsChange(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="invoice-notes">
            {locale === 'vi' ? 'Ghi chú hoá đơn' : 'Invoice notes'}
          </Label>
          <SimpleRichTextEditor
            value={invoiceNotes}
            onChange={onInvoiceNotesChange}
            placeholder={locale === 'vi' ? 'Ghi chú khi xuất hoá đơn...' : 'Notes for invoice...'}
            minHeight={100}
          />
        </div>
      </div>

      {/* Section 3: Customer Additional Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-sm">3</span>
          {locale === 'vi' ? 'Thông Tin Bổ Sung Của Khách' : 'Customer Additional Info'}
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Date of Birth */}
          <div className="space-y-2">
            <Label htmlFor="date-of-birth">
              {locale === 'vi' ? 'Ngày sinh/tháng sinh' : 'Date of Birth'}
            </Label>
            <Input
              id="date-of-birth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => onDateOfBirthChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {locale === 'vi'
                ? 'Để có thể nhận các ưu đãi vào ngày sinh nhật cùng Trại trong tương lai'
                : 'To receive birthday offers in the future'
              }
            </p>
          </div>

          {/* Social Media URL */}
          <div className="space-y-2">
            <Label htmlFor="social-media-url">
              {locale === 'vi' ? 'Đường dẫn Facebook/Instagram' : 'Facebook/Instagram URL'}
            </Label>
            <Input
              id="social-media-url"
              type="text"
              placeholder="https://facebook.com/yourprofile"
              value={socialMediaUrl}
              onChange={(e) => onSocialMediaUrlChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {locale === 'vi'
                ? 'Trại sẽ gửi thông báo xác nhận đến khách qua MXH trước ngày check in'
                : 'We will send confirmation via social media before check-in'
              }
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Photo Consent */}
          <div className="space-y-2">
            <Label htmlFor="photo-consent">
              {locale === 'vi' ? 'Lưu trữ lại kỷ niệm cùng Trại (chụp ngẫu nhiên)' : 'Photo Consent (random photos)'}
            </Label>
            <Select
              value={photoConsent ? 'true' : 'false'}
              onValueChange={(v) => onPhotoConsentChange(v === 'true')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">{locale === 'vi' ? 'Đồng ý' : 'Agree'}</SelectItem>
                <SelectItem value="false">{locale === 'vi' ? 'Không đồng ý' : 'Disagree'}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {locale === 'vi'
                ? 'Trại sẽ chụp tặng những tấm ảnh kỷ niệm, các hình ảnh sẽ được chia sẻ lên fanpage'
                : 'We will take memorable photos, images will be shared on fanpage'
              }
            </p>
          </div>

          {/* Referral Source */}
          <div className="space-y-2">
            <Label>
              {locale === 'vi' ? 'Bạn biết đến Trại qua đâu?' : 'How did you hear about us?'}
            </Label>
            <Select
              value={referralSource}
              onValueChange={(v) => onReferralSourceChange(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={locale === 'vi' ? 'Chọn nguồn' : 'Select source'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="tiktok">Tiktok</SelectItem>
                <SelectItem value="referral">{locale === 'vi' ? 'Người quen giới thiệu' : 'Referral'}</SelectItem>
                <SelectItem value="returning">{locale === 'vi' ? 'Khách cũ quay lại' : 'Returning customer'}</SelectItem>
                <SelectItem value="panorama">{locale === 'vi' ? 'Từ Panorama Glamping' : 'From Panorama Glamping'}</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="other">{locale === 'vi' ? 'Khác' : 'Other'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Section 4: Internal Notes & Payment */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-sm">4</span>
          {locale === 'vi' ? 'Ghi Chú Nội Bộ & Thanh Toán' : 'Internal Notes & Payment'}
        </h3>

        <div className="space-y-2">
          <Label htmlFor="internal-notes">
            {locale === 'vi' ? 'Ghi chú nội bộ (chỉ admin thấy)' : 'Internal notes (admin only)'}
          </Label>
          <Textarea
            id="internal-notes"
            placeholder={locale === 'vi' ? 'Ghi chú nội bộ...' : 'Internal notes...'}
            value={internalNotes}
            onChange={(e) => onInternalNotesChange(e.target.value)}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment-method">
            {locale === 'vi' ? 'Phương thức thanh toán' : 'Payment method'}
            <span className="text-red-500">*</span>
          </Label>
          <Select value={paymentMethod} onValueChange={(v) => onPaymentMethodChange(v as 'pay_now' | 'pay_later')}>
            <SelectTrigger>
              <SelectValue placeholder={locale === 'vi' ? 'Chọn phương thức' : 'Select method'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pay_now">
                {locale === 'vi' ? 'Thanh toán ngay' : 'Pay Now'}
              </SelectItem>
              <SelectItem value="pay_later">
                {locale === 'vi' ? 'Thanh toán sau' : 'Pay Later'}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Section 5: Pricing Summary */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-sm">5</span>
          {locale === 'vi' ? 'Tổng Kết Giá' : 'Pricing Summary'}
        </h3>

        {/* Per-tent breakdown cards */}
        {tents.filter(t => t.itemId).map((tent, i) => (
          <Card key={tent.id} className="bg-gray-50">
            <CardContent className="p-3">
              <h4 className="font-medium text-sm mb-2">
                {locale === 'vi' ? `Lều ${i + 1}` : `Tent ${i + 1}`}
                {tent.itemName && `: ${tent.itemName}`}
              </h4>
              <div className="space-y-1 text-sm">
                {tent.checkIn && tent.checkOut && (
                  <div className="flex justify-between text-gray-600">
                    <span>{tent.checkIn} → {tent.checkOut} ({tent.nights} {locale === 'vi' ? 'đêm' : 'nights'})</span>
                  </div>
                )}
                {tent.pricingBreakdown && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{locale === 'vi' ? 'Lưu trú' : 'Accommodation'}</span>
                      <span>{formatCurrency(tent.pricingBreakdown.accommodationCost, locale)}</span>
                    </div>
                    {tent.pricingBreakdown.menuProductsCost > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">{locale === 'vi' ? 'Menu items' : 'Menu items'}</span>
                        <span>{formatCurrency(tent.pricingBreakdown.menuProductsCost, locale)}</span>
                      </div>
                    )}
                    {tent.accommodationVoucher && tent.accommodationVoucher.discountAmount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>{locale === 'vi' ? 'Voucher lưu trú' : 'Accommodation voucher'}</span>
                        <span>-{formatCurrency(tent.accommodationVoucher.discountAmount, locale)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Aggregated total pricing card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            {pricingLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : pricingData ? (
              (() => {
                // Compute totals client-side from tents data to include voucher discounts & menu products
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
                const totalDiscount = totalAccDiscount + totalMenuDiscount
                const grandTotal = totalAccommodation - totalAccDiscount + totalMenuProducts - totalMenuDiscount

                return (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{locale === 'vi' ? 'Tiền lưu trú' : 'Accommodation'}</span>
                      <span className="font-semibold">
                        {formatCurrency(totalAccommodation, locale)}
                      </span>
                    </div>
                    {totalMenuProducts > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>{locale === 'vi' ? 'Menu items' : 'Menu products'}</span>
                        <span className="font-semibold">
                          {formatCurrency(totalMenuProducts, locale)}
                        </span>
                      </div>
                    )}
                    {totalDiscount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>{locale === 'vi' ? 'Giảm giá' : 'Discount'}</span>
                        <span>-{formatCurrency(totalDiscount, locale)}</span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between text-lg font-bold">
                      <span>{locale === 'vi' ? 'Tổng cộng' : 'Total'}</span>
                      <span className="text-blue-600">
                        {formatCurrency(grandTotal, locale)}
                      </span>
                    </div>
                  </div>
                )
              })()
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                {locale === 'vi'
                  ? 'Chọn item và ngày ở các tab lều để xem giá'
                  : 'Select items and dates in tent tabs to view pricing'
                }
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Submit button */}
      <div className="pt-4 border-t">
        <Button
          onClick={onSubmit}
          disabled={submitting || !!validateForm()}
          className="w-full"
          size="lg"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {locale === 'vi' ? 'Tạo Booking' : 'Create Booking'}
        </Button>
      </div>
    </div>
  )
}
