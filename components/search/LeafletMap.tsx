"use client"

import { useState, useEffect, useRef } from "react"
import "leaflet/dist/leaflet.css"
import { getLocalizedText, type MultilingualText } from "@/lib/i18n-utils"
import { useClientLocale } from "@/components/providers/ClientI18nProvider"

// Generic location interface for both campsites and glamping zones
interface MapLocation {
  id: string
  name: MultilingualText | string
  location?: string
  slug: string
  images: string[]
  basePrice: number
  latitude: number
  longitude: number
}

interface LeafletMapProps {
  // Support both old prop name (campsites) and new generic name (locations)
  campsites?: MapLocation[]
  locations?: MapLocation[]
  // Type determines the link destination
  type?: 'camping' | 'glamping'
  onCampsiteSelect?: (campsiteId: string) => void
  hoveredCampsiteId?: string | null
}

function LeafletMapContent({
  campsites,
  locations,
  type = 'camping',
  onCampsiteSelect,
  hoveredCampsiteId
}: LeafletMapProps) {
  const { locale } = useClientLocale()
  const [leaflet, setLeaflet] = useState<any>(null)
  const mapRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  // Support both prop names for backward compatibility
  const displayLocations = locations || campsites || []

  useEffect(() => {
    // Import leaflet on client side only
    import("leaflet").then((L) => {
      setLeaflet(L)

      // Fix default marker icon issue with webpack
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      })
    })
  }, [])

  // Initialize map
  useEffect(() => {
    if (!leaflet || !mapContainerRef.current) return

    // Prevent duplicate initialization
    if (mapRef.current) return

    // Calculate center from locations
    const center: [number, number] = displayLocations.length > 0
      ? [
          displayLocations.reduce((sum, c) => sum + c.latitude, 0) / displayLocations.length,
          displayLocations.reduce((sum, c) => sum + c.longitude, 0) / displayLocations.length,
        ]
      : [16.0544, 108.2022] // Vietnam center

    // Create map (disable default attribution to match other sites)
    const map = leaflet.map(mapContainerRef.current, {
      attributionControl: false
    }).setView(center, 10)

    // Add custom attribution control (without "Leaflet" prefix)
    leaflet.control.attribution({
      prefix: false
    }).addTo(map)

    mapRef.current = map

    // Get Mapbox access token from environment
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

    // Add tile layers with layer control
    if (mapboxToken) {
      // Mapbox base layers (3 options like camping sites)
      const baseLayers: { [key: string]: any } = {
        "Hiking": leaflet.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`, {
          attribution: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          tileSize: 512,
          zoomOffset: -1,
        }),
        "Satellite": leaflet.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`, {
          attribution: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a>',
          tileSize: 512,
          zoomOffset: -1,
        }),
        "Road": leaflet.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`, {
          attribution: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          tileSize: 512,
          zoomOffset: -1,
        }),
      }

      // Add default layer (Hiking - perfect for camping/glamping)
      baseLayers["Hiking"].addTo(map)

      // Add layer control (the platform switcher)
      leaflet.control.layers(baseLayers, null, {
        position: 'topright'
      }).addTo(map)
    } else {
      // Fallback to OpenStreetMap if no Mapbox token
      leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map)
    }

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [leaflet, displayLocations.length])

  // Add markers
  useEffect(() => {
    if (!leaflet || !mapRef.current || displayLocations.length === 0) return

    const markers: any[] = []

    // Determine link path based on type
    const getLinkPath = (slug: string) => {
      if (type === 'glamping') {
        return `/glamping/zones/${slug}`
      }
      return `/campsite/${slug}`
    }

    displayLocations.forEach((location) => {
      const isHovered = hoveredCampsiteId === location.id
      const bgColor = isHovered ? '#22c55e' : '#f97316'
      const scale = isHovered ? 'scale(1.2)' : 'scale(1)'
      const zIndex = isHovered ? '1000' : 'auto'

      // Get localized text for multilingual fields
      const localizedName = getLocalizedText(location.name, locale)
      const localizedLocation = getLocalizedText(location.location, locale)

      const icon = leaflet.divIcon({
        className: "custom-marker",
        html: `
          <div style="
            background-color: ${bgColor};
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 12px;
            border: 2px solid white;
            box-shadow: ${isHovered ? '0 4px 12px rgba(34, 197, 94, 0.5)' : '0 2px 4px rgba(0,0,0,0.3)'};
            white-space: nowrap;
            transform: ${scale};
            transition: all 0.3s ease;
            z-index: ${zIndex};
          ">
            ${(location.basePrice / 1000).toFixed(0)}k
          </div>
        `,
        iconSize: [60, 30],
        iconAnchor: [30, 15],
      })

      const marker = leaflet
        .marker([location.latitude, location.longitude], { icon })
        .addTo(mapRef.current)

      const popupContent = `
        <div class="p-2" style="width: 250px;">
          <div style="position: relative; height: 128px; margin-bottom: 8px; border-radius: 4px; overflow: hidden;">
            <img src="${location.images[0]}" alt="${localizedName}" style="width: 100%; height: 100%; object-fit: cover;" />
          </div>
          <h3 style="font-weight: 600; margin-bottom: 8px;">${localizedName}</h3>
          <p style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">${localizedLocation}</p>
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <span style="font-size: 12px; color: #6b7280;">Từ</span>
              <p style="font-weight: bold; color: #22c55e;">
                ${location.basePrice.toLocaleString('vi-VN')} VND
              </p>
            </div>
            <a href="${getLinkPath(location.slug)}" style="
              background-color: #22c55e;
              color: white;
              padding: 6px 16px;
              border-radius: 6px;
              text-decoration: none;
              font-size: 14px;
              font-weight: 500;
            ">
              Xem
            </a>
          </div>
        </div>
      `

      marker.bindPopup(popupContent, { maxWidth: 300, minWidth: 250 })

      if (onCampsiteSelect) {
        marker.on("click", () => onCampsiteSelect(location.id))
      }

      markers.push(marker)
    })

    // Fit bounds to show all markers
    if (markers.length > 0) {
      const group = leaflet.featureGroup(markers)
      mapRef.current.fitBounds(group.getBounds().pad(0.1))
    }

    // Cleanup markers
    return () => {
      markers.forEach((marker) => marker.remove())
    }
  }, [leaflet, displayLocations, type, onCampsiteSelect, hoveredCampsiteId, locale])

  if (!leaflet) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải bản đồ...</p>
        </div>
      </div>
    )
  }

  return <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
}

export function LeafletMap(props: LeafletMapProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải bản đồ...</p>
        </div>
      </div>
    )
  }

  return <LeafletMapContent {...props} />
}
