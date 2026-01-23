"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { MapPin, ChevronLeft, ChevronRight, Heart, Home, Tent } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { type MultilingualText, getLocalizedText } from "@/lib/i18n-utils"
import { useClientLocale } from "@/components/providers/ClientI18nProvider"
import { useWishlist } from "@/hooks/useWishlist"
import { LoginModal } from "@/components/auth/LoginModal"

interface GlampingItem {
  id: string
  name: string
  category_name: string
  base_price: number
  sku?: string
  summary?: string
}

interface GlampingZoneCardProps {
  id: string
  name: MultilingualText | string
  location: string
  slug: string
  images: string[]
  description?: MultilingualText | string
  basePrice: number
  features?: string[]
  distance?: string
  items?: GlampingItem[]
  isHovered?: boolean
  onHoverChange?: (id: string | null) => void
}

// Category icon mapping
const categoryIcons: Record<string, any> = {
  tent: Tent,
  villa: Home,
  cabin: Home,
  dome: Tent,
  bungalow: Home,
  default: Home,
}

export function GlampingZoneCard({
  id,
  name,
  location,
  slug,
  images,
  description,
  basePrice,
  features,
  distance,
  items = [],
  isHovered = false,
  onHoverChange,
}: GlampingZoneCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isImageHovered, setIsImageHovered] = useState(false)
  const { locale } = useClientLocale()
  const {
    isInWishlist,
    toggleWishlist,
    loginModalOpen,
    setLoginModalOpen,
    handleLoginSuccess,
  } = useWishlist()

  const isWishlisted = isInWishlist(id)

  const displayImages = images.length > 0 ? images : ["https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&q=80"]
  const localizedName = getLocalizedText(name, locale)
  const localizedDescription = getLocalizedText(description, locale)

  const goToPrevious = (e: React.MouseEvent) => {
    e.preventDefault()
    setCurrentImageIndex((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1))
  }

  const goToNext = (e: React.MouseEvent) => {
    e.preventDefault()
    setCurrentImageIndex((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1))
  }

  return (
    <Card
      className={`overflow-hidden transition-all duration-300 ${
        isHovered ? 'shadow-2xl scale-[1.02] ring-2 ring-primary' : 'hover:shadow-lg'
      }`}
      onMouseEnter={() => onHoverChange?.(id)}
      onMouseLeave={() => onHoverChange?.(null)}
    >
      <CardContent className="p-0">
        {/* Image Carousel */}
        <div
          className="relative h-48 sm:h-56 md:h-64 bg-gray-200"
          onMouseEnter={() => setIsImageHovered(true)}
          onMouseLeave={() => setIsImageHovered(false)}
        >
          <Link href={`/glamping/zones/${slug}`}>
            <Image
              src={displayImages[currentImageIndex]}
              alt={`${localizedName} - ${currentImageIndex + 1}`}
              fill
              className="object-cover"
            />
          </Link>

          {/* Wishlist Heart Button */}
          <button
            className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white transition-colors z-10"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              toggleWishlist(id)
            }}
          >
            <Heart
              className={`h-5 w-5 transition-colors ${
                isWishlisted
                  ? 'fill-red-500 text-red-500'
                  : 'text-gray-700 hover:text-red-500'
              }`}
            />
          </button>

          {/* Navigation Arrows */}
          {displayImages.length > 1 && isImageHovered && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/90 hover:bg-white transition-all z-10"
              >
                <ChevronLeft className="h-5 w-5 text-gray-800" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/90 hover:bg-white transition-all z-10"
              >
                <ChevronRight className="h-5 w-5 text-gray-800" />
              </button>
            </>
          )}

          {/* Image Counter */}
          <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-black/60 text-white text-sm font-medium">
            {currentImageIndex + 1}/{displayImages.length}
          </div>

          {/* Dots Indicator */}
          {displayImages.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {displayImages.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    idx === currentImageIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-3 sm:p-4">
          {/* Title & Location */}
          <div className="mb-2 sm:mb-3">
            <Link href={`/glamping/zones/${slug}`}>
              <h3 className="font-bold text-base sm:text-lg md:text-xl hover:text-primary transition-colors line-clamp-1 mb-1">
                {localizedName}
              </h3>
            </Link>
            <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground mb-1.5 sm:mb-2">
              <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="line-clamp-1">{location}</span>
              {distance && <span className="flex-shrink-0">• {distance}</span>}
            </div>

            {/* Description */}
            {localizedDescription && (
              <div
                className="text-xs sm:text-sm text-muted-foreground line-clamp-2 prose prose-sm max-w-none [&_p]:mb-0 [&_p]:inline [&_strong]:font-semibold [&_br]:hidden"
                dangerouslySetInnerHTML={{ __html: localizedDescription }}
              />
            )}
          </div>

          {/* Items with their categories and prices */}
          {items.length > 0 && (
            <div className="space-y-1 mb-2 sm:mb-3 pt-2 sm:pt-3 border-t">
              {items.map((item) => {
                // Get category icon
                const categoryKey = item.category_name.toLowerCase()
                const Icon = categoryIcons[categoryKey] || categoryIcons.default

                return (
                  <div key={item.id} className="space-y-1">
                    {/* Item Name with Category */}
                    <div className="flex items-center justify-between text-xs sm:text-sm gap-2 py-0.5 sm:py-1 border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center gap-1 sm:gap-1.5 flex-1 min-w-0">
                        <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-600 flex-shrink-0" />
                        <span className="text-gray-800 font-medium line-clamp-1">
                          {item.name}
                        </span>
                        <span className="text-gray-500 text-[10px] sm:text-xs">
                          ({item.category_name})
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                        {item.base_price > 0 ? (
                          <>
                            <span className="font-semibold text-green-600 whitespace-nowrap">
                              ₫{(item.base_price / 1000).toFixed(0)}k
                            </span>
                            <span className="text-muted-foreground whitespace-nowrap text-[10px] sm:text-xs">
                              / {locale === 'vi' ? 'đêm' : 'night'}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground text-[10px] sm:text-xs">
                            {locale === 'vi' ? 'Liên hệ' : 'Contact'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Fallback Price if no items */}
          {items.length === 0 && (
            <div className="flex items-center justify-between pt-2 sm:pt-3 border-t">
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {locale === 'vi' ? 'Từ' : 'From'}
                </p>
                {basePrice > 0 ? (
                  <>
                    <p className="text-lg sm:text-xl font-bold text-green-600">
                      ₫{(basePrice / 1000).toFixed(0)}k
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      {locale === 'vi' ? '1 đêm' : '1 night'}
                    </p>
                  </>
                ) : (
                  <p className="text-sm sm:text-base text-muted-foreground">
                    {locale === 'vi' ? 'Liên hệ để biết giá' : 'Contact for pricing'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>

      {/* Login Modal */}
      <LoginModal
        open={loginModalOpen}
        onOpenChange={setLoginModalOpen}
        onSuccess={handleLoginSuccess}
      />
    </Card>
  )
}
