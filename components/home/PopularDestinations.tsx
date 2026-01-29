"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { useTranslations } from "next-intl"
import { useLocale } from "next-intl"
import { Skeleton } from "@/components/ui/skeleton"

interface FeaturedZone {
  id: string
  name: { vi: string; en: string } | string
  slug: string
  description: { vi: string; en: string } | string | null
  images: string[]
}

export function PopularDestinations() {
  const t = useTranslations('home')
  const locale = useLocale()
  const [zones, setZones] = useState<FeaturedZone[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchFeaturedZones() {
      try {
        const response = await fetch('/api/glamping/zones')
        if (response.ok) {
          const data = await response.json()
          // Take only first 4 zones as featured
          setZones(Array.isArray(data) ? data.slice(0, 4) : [])
        }
      } catch (error) {
        console.error('Error fetching featured zones:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchFeaturedZones()
  }, [])

  const getName = (name: { vi: string; en: string } | string): string => {
    if (typeof name === 'string') return name
    return locale === 'vi' ? (name.vi || name.en) : (name.en || name.vi)
  }

  const stripHtml = (html: string): string => {
    if (!html) return ''
    // Remove HTML tags and decode entities
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&')  // Decode &amp;
      .replace(/&lt;/g, '<')   // Decode &lt;
      .replace(/&gt;/g, '>')   // Decode &gt;
      .replace(/&quot;/g, '"') // Decode &quot;
      .replace(/&#39;/g, "'")  // Decode &#39;
      .trim()
  }

  const getDescription = (desc: { vi: string; en: string } | string | null): string => {
    if (!desc) return ''
    const rawDesc = typeof desc === 'string'
      ? desc
      : (locale === 'vi' ? (desc.vi || desc.en || '') : (desc.en || desc.vi || ''))
    return stripHtml(rawDesc)
  }

  if (loading) {
    return (
      <section className="py-16 bg-white">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-10">
            {t('popularDestinations')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="overflow-hidden border-0 shadow-md">
                <CardContent className="p-0">
                  <Skeleton className="aspect-square w-full" />
                  <div className="p-3">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (zones.length === 0) {
    return null
  }

  return (
    <section className="py-16 bg-white">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-10">
          {t('popularDestinations')}
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {zones.map((zone) => (
            <Link
              key={zone.id}
              href={`/glamping/zones/${zone.slug}`}
              className="group"
            >
              <Card className="overflow-hidden border-0 shadow-md hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-0">
                  <div className="relative aspect-square overflow-hidden">
                    {zone.images && zone.images.length > 0 ? (
                      <Image
                        src={zone.images[0]}
                        alt={getName(zone.name)}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <span className="text-muted-foreground text-sm">No image</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm mb-1">{getName(zone.name)}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {getDescription(zone.description)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
