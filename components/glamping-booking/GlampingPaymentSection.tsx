import { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from "react-hook-form"
import { useTranslations } from "next-intl"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { AlertCircle, CreditCard, Lock, Clock, Wallet } from "lucide-react"

interface PaymentSectionProps {
  register: UseFormRegister<any>
  errors: FieldErrors
  watch: UseFormWatch<any>
  setValue: UseFormSetValue<any>
  isSubmitting: boolean
  locale: string
  allowPayLater?: boolean
  depositType?: 'percentage' | 'fixed_amount'
  depositValue?: number // The raw value (percentage number or fixed amount)
  depositAmount?: number // The calculated deposit amount
  balanceAmount?: number
  grandTotal?: number
}

// Format currency helper
function formatCurrency(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function GlampingPaymentSection({
  register,
  errors,
  watch,
  setValue,
  isSubmitting,
  locale,
  allowPayLater = true,
  depositType = 'percentage',
  depositValue = 0,
  depositAmount = 0,
  balanceAmount = 0,
  grandTotal = 0,
}: PaymentSectionProps) {
  const t = useTranslations('booking')
  const agreeTerms = watch("agreeTerms")
  const paymentMethod = watch("paymentMethod") || "pay_now"

  // Check if deposit is required (value > 0)
  const hasDeposit = depositValue > 0

  // Check if deposit covers 100% of the total (no need for Pay Later option)
  // 1. If deposit is 100% percentage
  // 2. OR deposit amount >= grand total
  const isFullPaymentDeposit =
    (depositType === 'percentage' && depositValue >= 100) ||
    (grandTotal > 0 && depositAmount >= grandTotal)

  // Only show Pay Later if allowed by settings AND deposit is NOT 100%
  const showPayLater = allowPayLater && !isFullPaymentDeposit

  // Get deposit display text (for showing in UI labels)
  const getDepositLabel = () => {
    if (!hasDeposit) return ''
    if (depositType === 'percentage') {
      return locale === 'vi' ? `Đặt cọc ${depositValue}%` : `${depositValue}% deposit`
    }
    // fixed_amount
    return locale === 'vi' ? `Đặt cọc ${formatCurrency(depositValue, locale)}` : `${formatCurrency(depositValue, locale)} deposit`
  }

  // Get button text based on payment method
  const getButtonText = () => {
    if (isSubmitting) {
      return t('processing')
    }
    if (paymentMethod === "pay_later") {
      if (!hasDeposit) {
        return locale === 'vi' ? 'Đặt phòng ngay' : 'Book Now'
      }
      return locale === 'vi' ? `Thanh toán đặt cọc ${formatCurrency(depositAmount, locale)}` : `Pay Deposit ${formatCurrency(depositAmount, locale)}`
    }
    return locale === 'vi' ? `Thanh toán ${formatCurrency(grandTotal, locale)}` : `Pay ${formatCurrency(grandTotal, locale)}`
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-0 space-y-6 p-6">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <Wallet className="h-5 w-5 text-green-600" />
        {locale === 'vi' ? 'Phương thức thanh toán' : 'Payment Method'}
      </h3>

      {/* Payment Method Selection */}
      <RadioGroup
        value={paymentMethod}
        onValueChange={(value) => setValue("paymentMethod", value)}
        className="space-y-3"
      >
        {/* Pay Now Option */}
        <label
          htmlFor="pay_now"
          className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
            paymentMethod === "pay_now"
              ? "border-green-500 bg-green-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <RadioGroupItem value="pay_now" id="pay_now" className="mt-1" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-green-600" />
              <span className="font-medium text-gray-900">
                {locale === 'vi' ? 'Thanh toán ngay' : 'Pay Now'}
              </span>
              <span className="text-sm text-gray-500">(100%)</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {locale === 'vi'
                ? 'Thanh toán toàn bộ số tiền để hoàn tất đặt phòng'
                : 'Pay the full amount to complete your booking'}
            </p>
            {paymentMethod === "pay_now" && grandTotal > 0 && (
              <div className="mt-2 text-green-700 font-semibold">
                {locale === 'vi' ? 'Tổng thanh toán: ' : 'Total: '}
                {formatCurrency(grandTotal, locale)}
              </div>
            )}
          </div>
        </label>

        {/* Pay Later Option - Only show if allowed AND deposit is not 100% */}
        {showPayLater && (
          <label
            htmlFor="pay_later"
            className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              paymentMethod === "pay_later"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <RadioGroupItem value="pay_later" id="pay_later" className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-gray-900">
                  {locale === 'vi' ? 'Thanh toán sau' : 'Pay Later'}
                </span>
                {hasDeposit && (
                  <span className="text-sm text-gray-500">
                    ({getDepositLabel()})
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {hasDeposit
                  ? depositType === 'percentage'
                    ? locale === 'vi'
                      ? `Đặt cọc ${depositValue}% ngay, thanh toán phần còn lại khi trả phòng`
                      : `Pay ${depositValue}% deposit now, pay the rest at checkout`
                    : locale === 'vi'
                      ? `Đặt cọc ${formatCurrency(depositValue, locale)} ngay, thanh toán phần còn lại khi trả phòng`
                      : `Pay ${formatCurrency(depositValue, locale)} deposit now, pay the rest at checkout`
                  : locale === 'vi'
                    ? 'Thanh toán toàn bộ khi trả phòng'
                    : 'Pay the full amount at checkout'}
              </p>
              {paymentMethod === "pay_later" && (
                <div className="mt-3 p-3 bg-white rounded-md border border-blue-200 space-y-1">
                  {hasDeposit ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {locale === 'vi' ? 'Thanh toán ngay:' : 'Pay now:'}
                        </span>
                        <span className="font-semibold text-blue-700">
                          {formatCurrency(depositAmount, locale)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {locale === 'vi' ? 'Thanh toán sau:' : 'Pay later:'}
                        </span>
                        <span className="font-medium text-gray-700">
                          {formatCurrency(balanceAmount, locale)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {locale === 'vi' ? 'Thanh toán sau:' : 'Pay later:'}
                      </span>
                      <span className="font-semibold text-blue-700">
                        {formatCurrency(grandTotal, locale)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </label>
        )}
      </RadioGroup>

      {/* Terms and conditions */}
      <div className="space-y-3 pt-4 border-t">
        <div className="flex items-start gap-2">
          <Checkbox
            id="agreeTerms"
            checked={agreeTerms}
            onCheckedChange={(checked) => setValue("agreeTerms", checked as boolean)}
            className={errors.agreeTerms ? "border-red-500" : ""}
          />
          <label
            htmlFor="agreeTerms"
            className="text-sm leading-relaxed cursor-pointer"
          >
            {t('agreeTermsText')}{" "}
            <a href="/terms" target="_blank" className="text-blue-600 hover:underline">
              {t('termsAndConditions')}
            </a>
          </label>
        </div>
        {errors.agreeTerms && (
          <p className="text-sm text-red-500 flex items-center gap-1 ml-6">
            <AlertCircle className="h-4 w-4" />
            {errors.agreeTerms.message as string}
          </p>
        )}
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        disabled={!agreeTerms || isSubmitting}
        className={`w-full py-6 text-lg font-semibold ${
          paymentMethod === "pay_later"
            ? "bg-blue-600 hover:bg-blue-700"
            : "bg-green-600 hover:bg-green-700"
        } text-white`}
        size="lg"
      >
        {isSubmitting ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>{t('processing')}</span>
          </div>
        ) : (
          getButtonText()
        )}
      </Button>

      {/* Security badges */}
      <div className="flex items-center justify-center gap-4 pt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Lock className="h-3 w-3" />
          <span>{t('sslSecure')}</span>
        </div>
        <span>•</span>
        <span>{t('pciCompliant')}</span>
        <span>•</span>
        <span>{t('secure3d')}</span>
      </div>
    </div>
  )
}
