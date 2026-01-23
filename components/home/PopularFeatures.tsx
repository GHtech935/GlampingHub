"use client"

import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { useTranslations } from "next-intl"

const features = [
  {
    key: "electricHookup",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
    slug: "electric-hookup"
  },
  {
    key: "dogFriendly",
    image: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400&q=80",
    slug: "dog-friendly"
  },
  {
    key: "beaches",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80",
    slug: "beaches"
  },
  {
    key: "indoorPool",
    image: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=400&q=80",
    slug: "indoor-pool"
  },
  {
    key: "barClubhouse",
    image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&q=80",
    slug: "bar-clubhouse"
  },
  {
    key: "playground",
    image: "https://images.unsplash.com/photo-1578307985320-bf2e2b7e4824?w=400&q=80",
    slug: "playground"
  },
  {
    key: "bikeHire",
    image: "https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=400&q=80",
    slug: "bike-hire"
  },
  {
    key: "restaurant",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80",
    slug: "restaurant"
  },
  {
    key: "freeWifi",
    image: "https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=400&q=80",
    slug: "free-wifi"
  },
  {
    key: "campfiresAllowed",
    image: "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=400&q=80",
    slug: "campfires-allowed"
  },
  {
    key: "bbqArea",
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80",
    slug: "bbq-area"
  },
  {
    key: "entertainment",
    image: "https://images.unsplash.com/photo-1533873984035-25970ab07461?w=400&q=80",
    slug: "entertainment"
  },
]

export function PopularFeatures() {
  const t = useTranslations('home')

  return (
    <section className="py-16 bg-gray-50">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-10">
          {t('popularFeatures')}
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {features.map((feature) => (
            <Link
              key={feature.slug}
              href={`/glamping/search?feature=${feature.slug}`}
              className="group"
            >
              <Card className="overflow-hidden border-0 shadow-md hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-0">
                  <div className="relative aspect-square">
                    <Image
                      src={feature.image}
                      alt={t(`popularFeaturesList.${feature.key}`)}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h3 className="font-semibold text-white text-sm text-center">
                        {t(`popularFeaturesList.${feature.key}`)}
                      </h3>
                    </div>
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
