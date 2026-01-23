import Image from "next/image"
import { Calendar, Users, MapPin } from "lucide-react"
import { useTranslations } from "next-intl"
import { useClientLocale } from "@/components/providers/ClientI18nProvider"
import { formatDate } from "@/lib/utils"

interface BookingData {
  pitchId: string
  campsiteSlug: string
  campsiteName: string
  pitchName: string
  checkIn: string
  checkOut: string
  adults: number
  children: number
  basePrice: number
  pitchImageUrl?: string
  campsiteAddress?: string
  city?: string
  province?: string
}

interface BookingSummaryHeaderProps {
  bookingData: BookingData
}

export function GlampingBookingSummaryHeader({
  bookingData,
}: BookingSummaryHeaderProps) {
  const t = useTranslations('booking')
  const { locale } = useClientLocale()

  return (
    <div className="bg-primary text-white sticky top-16 z-[1000]">
      <div className="w-full mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          {/* Left: Campsite Info */}
          <div className="flex gap-4 items-start">
            {/* Pitch Image */}
            <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-white/10">
              <Image
                src={bookingData.pitchImageUrl || `https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=200&h=200&fit=crop`}
                alt={bookingData.pitchName}
                fill
                className="object-cover"
              />
            </div>

            {/* Campsite Details */}
            <div>
              <h1 className="text-xl font-semibold mb-1">
                {bookingData.pitchName}
              </h1>
              <div className="flex items-center gap-2 text-sm text-white/90 mb-2">
                <MapPin className="h-4 w-4" />
                <span>
                  {[bookingData.campsiteAddress, bookingData.city, bookingData.province]
                    .filter(Boolean)
                    .join(', ') || "Vietnam"}
                </span>
              </div>
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-white/90">{bookingData.campsiteName}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Booking Summary */}
          <div className="flex flex-col gap-3 md:gap-0 md:flex-row md:gap-8 text-sm w-full md:w-auto">
            {/* Dates and Guests - Always in a row */}
            <div className="flex flex-row justify-between w-full md:w-auto md:justify-start md:gap-8">
              {/* Arrive */}
              <div className="flex items-start gap-1.5 md:gap-2">
                <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-xs md:text-sm">{t('arrive')}</div>
                  <div className="text-white/90 text-xs md:text-sm">
                    {formatDate(bookingData.checkIn, "dd/MM")}
                  </div>
                </div>
              </div>

              {/* Depart */}
              <div className="flex items-start gap-1.5 md:gap-2">
                <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-xs md:text-sm">{t('depart')}</div>
                  <div className="text-white/90 text-xs md:text-sm">
                    {formatDate(bookingData.checkOut, "dd/MM")}
                  </div>
                </div>
              </div>

              {/* Guests */}
              <div className="flex items-start gap-1.5 md:gap-2">
                <Users className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-xs md:text-sm">{t('guests')}</div>
                  <div className="text-white/90 text-xs md:text-sm">
                    {bookingData.adults + bookingData.children} {bookingData.adults + bookingData.children === 1 ? t('guest') : t('guests')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
