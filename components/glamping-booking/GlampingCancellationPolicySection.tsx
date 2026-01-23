import { useTranslations } from "next-intl"

interface CancellationPolicySectionProps {
  locale: string
  cancellationPolicy?: { vi: string; en: string }
  houseRules?: { vi: string; en: string }
}

export function GlampingCancellationPolicySection({
  locale,
  cancellationPolicy,
  houseRules,
}: CancellationPolicySectionProps) {
  const t = useTranslations('booking')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Cancellation Policy */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Primary header */}
        <div className="bg-primary text-white px-6 py-3">
          <h2 className="text-lg font-semibold">{t('cancellationPolicy')}</h2>
        </div>

        {/* Content */}
        <div className="p-6 text-sm">
          {cancellationPolicy && cancellationPolicy[locale as 'vi' | 'en'] ? (
            <div
              dangerouslySetInnerHTML={{
                __html: cancellationPolicy[locale as 'vi' | 'en']
              }}
              className="prose prose-sm max-w-none"
            />
          ) : (
            <div className="space-y-4">
              <p>
                <strong>{t('cancellationPolicyText.refund')}</strong>
              </p>
              <p>
                {t('cancellationPolicyText.noRefund')}
              </p>
              <p>
                {t('cancellationPolicyText.notLiable')}
              </p>
              <p>
                {t('cancellationPolicyText.cancelReschedule')}
              </p>
              <p>
                <strong>{t('cancellationPolicyText.nonRefundable')}</strong>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* House Rules - Zone Rules for Glamping */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Primary header */}
        <div className="bg-primary text-white px-6 py-3">
          <h2 className="text-lg font-semibold">
            {locale === 'vi' ? 'Nội quy Khu Glamping' : 'Zone Rules'}
          </h2>
        </div>

        {/* Content */}
        <div className="p-6 text-sm">
          {houseRules && houseRules[locale as 'vi' | 'en'] ? (
            <div
              dangerouslySetInnerHTML={{
                __html: houseRules[locale as 'vi' | 'en']
              }}
              className="prose prose-sm max-w-none"
            />
          ) : (
            <p className="text-gray-500 italic">
              {locale === 'vi' ? 'Không có nội quy' : 'No rules available'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
