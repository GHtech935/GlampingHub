"use client"

import { useState, useEffect } from "react"
import { Search } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

// Background images for hero slideshow
const backgroundImages = [
  "/images/bg/bg_1.jpg",
  "/images/bg/bg_2.jpg",
  "/images/bg/bg_3.jpg",
  "/images/bg/bg_4.jpg",
  "/images/bg/bg_5.jpg",
  "/images/bg/bg_6.jpg",
]

export function HeroSection() {
  const t = useTranslations('home')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const [glampingDateRange, setGlampingDateRange] = useState<any>()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // Auto-rotate background images
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % backgroundImages.length)
    }, 5000) // Change image every 5 seconds

    return () => clearInterval(interval)
  }, [])

  const handleGlampingSearch = () => {
    const params = new URLSearchParams()
    if (glampingDateRange?.from) params.append("checkIn", glampingDateRange.from.toISOString())
    if (glampingDateRange?.to) params.append("checkOut", glampingDateRange.to.toISOString())
    router.push(`/glamping/search?${params.toString()}`)
  }

  return (
    <div className="relative h-[calc(100vh-64px)] min-h-[500px] flex items-center justify-center py-12 md:py-0">
      {/* Background Image Slideshow */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {backgroundImages.map((src, index) => (
          <div
            key={src}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentImageIndex ? "opacity-100" : "opacity-0"
            }`}
          >
            <Image
              src={src}
              alt={`Glamping background ${index + 1}`}
              fill
              priority={index === 0}
              className="object-cover"
              sizes="100vw"
            />
          </div>
        ))}
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full md:w-fit mx-auto px-4 text-center">
        {/* Heading */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 md:mb-8 drop-shadow-lg">
          {t('heroTitle')}
        </h1>

        {/* Search Widget - Glamping Only */}
        <div className="max-w-2xl mx-auto">
          {/* Glamping Search */}
          <div className="bg-white rounded-lg shadow-2xl p-4 sm:p-6 flex flex-col justify-center">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900">
              {t('glampingSearch')}
            </h2>
            <div className="space-y-4">
              {/* Date Range Picker */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  {t('selectDates')}
                </label>
                <DateRangePicker
                  dateRange={glampingDateRange}
                  onSelect={setGlampingDateRange}
                  placeholder={t('selectDates')}
                  numberOfMonths={2}
                  className="h-12 sm:h-14 text-sm sm:text-base"
                />
              </div>

              {/* Search Button */}
              <Button
                size="lg"
                className="w-full h-12 sm:h-14 text-sm sm:text-base font-semibold"
                onClick={handleGlampingSearch}
              >
                <Search className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                {t('searchGlamping')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
