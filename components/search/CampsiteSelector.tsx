'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { MapPin, ChevronDown, Check, X, Loader2, Search } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { useGeolocation } from '@/hooks/useGeolocation'

interface Campsite {
  id: string
  name: string
  slug: string
  city: string
  province: string
  pitch_count: number
}

interface NearbyCampsite extends Campsite {
  distance: string
  distanceKm: number
  latitude: number
  longitude: number
}

interface CampsiteSelectorProps {
  value?: string // campsite ID
  onChange: (campsiteId: string, campsiteName: string) => void
  placeholder?: string
  className?: string
  selectedProvince?: string // Single province filter (for backward compatibility)
  selectedProvinces?: string[] // Multiple provinces filter
}

// Stable empty array to prevent infinite re-renders
const EMPTY_PROVINCES: string[] = []

export function CampsiteSelector({
  value,
  onChange,
  placeholder,
  className,
  selectedProvince,
  selectedProvinces,
}: CampsiteSelectorProps) {
  // Use stable reference for empty array
  const provinces = selectedProvinces ?? EMPTY_PROVINCES
  const t = useTranslations('home')
  const tSelector = useTranslations('campsiteSelector')
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [popularityCampsites, setPopularityCampsites] = useState<Campsite[]>([])
  const [loadingPopularity, setLoadingPopularity] = useState(true)

  // Geolocation & nearby campsites
  const {
    latitude,
    longitude,
    isEnabled,
  } = useGeolocation()

  const [nearbyCampsites, setNearbyCampsites] = useState<NearbyCampsite[]>([])
  const [fetchingNearby, setFetchingNearby] = useState(false)
  const [nearbyError, setNearbyError] = useState(false)

  // Round coordinates to 6 decimal places (~11cm precision) to prevent infinite loops
  const roundedLat = useMemo(() =>
    latitude ? Math.round(latitude * 1000000) / 1000000 : null,
    [latitude]
  )
  const roundedLng = useMemo(() =>
    longitude ? Math.round(longitude * 1000000) / 1000000 : null,
    [longitude]
  )

  // Determine which data source to use
  const shouldUseNearMe = isEnabled && roundedLat && roundedLng

  // Fetch campsites based on data source
  useEffect(() => {
    const fetchCampsites = async () => {
      if (shouldUseNearMe) {
        // Near-me data will be fetched by separate useEffect
        setLoadingPopularity(false)
        return
      }

      // Fetch popularity-sorted campsites
      try {
        setLoadingPopularity(true)
        const params = new URLSearchParams()

        // Support both single province and multiple provinces
        const provinceList = provinces.length > 0 ? provinces : (selectedProvince ? [selectedProvince] : [])
        if (provinceList.length > 0) {
          params.append('provinces', provinceList.join(','))
        }

        const response = await fetch(`/api/campsites/by-popularity?${params}`)
        const data = await response.json()
        setPopularityCampsites(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Error fetching popular campsites:', error)
        setPopularityCampsites([])
      } finally {
        setLoadingPopularity(false)
      }
    }

    fetchCampsites()
  }, [selectedProvince, provinces, shouldUseNearMe])

  // Fetch nearby campsites when location is available
  useEffect(() => {
    if (!roundedLat || !roundedLng || !isEnabled) return

    const fetchNearbyCampsites = async () => {
      try {
        setFetchingNearby(true)
        setNearbyError(false)

        // Build params - NO radius needed, API returns top 10
        const params = new URLSearchParams({
          latitude: roundedLat.toString(),
          longitude: roundedLng.toString(),
        })

        // Add province filter if selected - support multiple provinces
        const provinceList = provinces.length > 0 ? provinces : (selectedProvince ? [selectedProvince] : [])
        if (provinceList.length > 0) {
          params.append('provinces', provinceList.join(','))
        }

        const response = await fetch(`/api/search/near-me?${params.toString()}`)
        const data = await response.json()

        if (data.success && Array.isArray(data.data?.campsites)) {
          setNearbyCampsites(data.data.campsites)  // API already returns top 10
        } else {
          setNearbyCampsites([])
        }
      } catch (error) {
        console.error('Error fetching nearby campsites:', error)
        setNearbyError(true)
        setNearbyCampsites([])
      } finally {
        setFetchingNearby(false)
      }
    }

    fetchNearbyCampsites()
  }, [roundedLat, roundedLng, isEnabled, selectedProvince, provinces])

  // Determine which campsites to show (single section)
  const displayCampsites = useMemo(() => {
    let campsites = shouldUseNearMe ? nearbyCampsites : popularityCampsites

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim()
      campsites = campsites.filter(c =>
        c.name.toLowerCase().includes(searchLower) ||
        c.city?.toLowerCase().includes(searchLower) ||
        c.province?.toLowerCase().includes(searchLower)
      )
    }

    return campsites
  }, [shouldUseNearMe, nearbyCampsites, popularityCampsites, searchTerm])

  // Clear selected campsite if province doesn't match
  useEffect(() => {
    const provinceList = provinces.length > 0 ? provinces : (selectedProvince ? [selectedProvince] : [])
    if (value && provinceList.length > 0) {
      const selectedCampsite = displayCampsites.find(c => c.id === value)
      if (selectedCampsite && !provinceList.includes(selectedCampsite.province)) {
        onChange('', '')  // Clear selection
      }
    }
  }, [selectedProvince, provinces, value, displayCampsites, onChange])

  // Find selected campsite from display list
  const selectedCampsite = useMemo(() => {
    return displayCampsites.find(c => c.id === value)
  }, [value, displayCampsites])

  const handleSelect = (campsite: Campsite | NearbyCampsite) => {
    onChange(campsite.id, campsite.name)
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('', '')
  }

  // Reset search when popover closes
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setSearchTerm('')
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal text-left",
            !selectedCampsite && "text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
            {selectedCampsite ? (
              <span className="truncate">{selectedCampsite.name}</span>
            ) : (
              <span>{placeholder || t('locationPlaceholder')}</span>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2">
            {selectedCampsite && (
              <div
                role="button"
                onClick={handleClear}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="h-4 w-4 text-gray-500" />
              </div>
            )}
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-full sm:w-[400px] p-0 max-w-[calc(100vw-40px)]"
        align="start"
        side="bottom"
        style={{ width: 'var(--radix-popover-trigger-width)' }}
      >
        {/* Search Input */}
        <div className="p-3 border-b sticky top-0 bg-white z-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder={tSelector('search') || 'Tìm kiếm...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        <div className="max-h-[50vh] sm:max-h-[350px] overflow-y-auto">
          {loadingPopularity || fetchingNearby ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2 text-green-600" />
              <span>{t('loading') || 'Đang tải...'}</span>
            </div>
          ) : displayCampsites.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              <MapPin className="h-6 w-6 text-gray-300 mx-auto mb-2" />
              <p>
                {selectedProvince
                  ? tSelector('noResultsInProvince')
                  : (t('noCampsites') || 'Không tìm thấy campsite')
                }
              </p>
            </div>
          ) : (
            <div className="py-1">
              {displayCampsites.map((campsite) => (
                <button
                  key={campsite.id}
                  onClick={() => handleSelect(campsite)}
                  className={cn(
                    "w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center justify-between transition-colors",
                    value === campsite.id && "bg-green-50"
                  )}
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-medium text-sm truncate">{campsite.name}</span>
                    <span className="text-xs text-gray-500 truncate">
                      {campsite.city && campsite.province
                        ? `${campsite.city}, ${campsite.province}`
                        : campsite.city || campsite.province || ''
                      }
                      {campsite.pitch_count > 0 && ` • ${campsite.pitch_count} slot${campsite.pitch_count > 1 ? 's' : ''}`}
                    </span>
                  </div>

                  {/* Show distance OR checkmark */}
                  <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                    {shouldUseNearMe && 'distance' in campsite && (
                      <span className="text-xs font-medium text-green-600">
                        {(campsite as NearbyCampsite).distance}
                      </span>
                    )}
                    {value === campsite.id && (
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
