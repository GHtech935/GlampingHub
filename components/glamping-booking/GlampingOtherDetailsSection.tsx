import { UseFormRegister, FieldErrors } from "react-hook-form"
import { useTranslations } from "next-intl"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SimpleRichTextEditor } from "@/components/ui/SimpleRichTextEditor"

interface OtherDetailsSectionProps {
  register: UseFormRegister<any>
  errors: FieldErrors
  locale: string
  invoiceNotes?: string
  onInvoiceNotesChange?: (value: string) => void
}

export function GlampingOtherDetailsSection({
  register,
  errors,
  locale,
  invoiceNotes = "",
  onInvoiceNotesChange,
}: OtherDetailsSectionProps) {
  const t = useTranslations('booking')
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Primary header */}
      <div className="bg-primary text-white px-6 py-3">
        <h2 className="text-lg font-semibold">{t('otherDetails')}</h2>
      </div>

      <div className="p-6 space-y-4">
        {/* Names of people in party */}
        <div className="space-y-2">
          <Label htmlFor="partyNames">{t('partyNames')}</Label>
          <Textarea
            id="partyNames"
            {...register("partyNames")}
            placeholder={t('partyNamesPlaceholder')}
            rows={2}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            {t('partyNamesHelper')}
          </p>
        </div>

        {/* Special requests */}
        <div className="space-y-2">
          <Label htmlFor="specialRequests">{t('specialRequestsLabel')}</Label>
          <Textarea
            id="specialRequests"
            {...register("specialRequests")}
            placeholder={t('specialRequestsPlaceholder')}
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            {t('specialRequestsHelper')}
          </p>
        </div>

        {/* Invoice notes */}
        <div className="space-y-2">
          <SimpleRichTextEditor
            id="invoiceNotes"
            label={locale === 'vi' ? 'Ghi chú xuất hoá đơn' : 'Invoice Notes'}
            value={invoiceNotes}
            onChange={onInvoiceNotesChange || (() => {})}
            placeholder={locale === 'vi'
              ? 'Nhập ghi chú nếu cần thiết khi xuất hoá đơn...'
              : 'Enter notes for invoice generation...'}
            minHeight={80}
          />
          <p className="text-xs text-muted-foreground">
            {locale === 'vi'
              ? 'Ghi chú này sẽ được in trên phiếu thu/hoá đơn VAT'
              : 'This note will be printed on receipts/VAT invoices'}
          </p>
        </div>
      </div>
    </div>
  )
}
