'use client'

import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Building2, MapPin } from 'lucide-react'
import { type MultilingualText, getLocalizedText } from '@/lib/i18n-utils'

interface Campsite {
  id: string
  name: MultilingualText | string
  city: string
  province: string
  pitch_count: number
}

interface Pitch {
  id: string
  name: MultilingualText | string
  campsiteId: string
  campsiteSlug?: string
  maxGuests: number
}

interface CampsitePitchSelectorProps {
  selectedCampsiteId?: string
  selectedPitchId?: string
  onCampsiteChange: (campsiteId: string) => void
  onPitchChange: (pitchId: string, pitchData: Pitch) => void
  locale?: string
}

export function CampsitePitchSelector({
  selectedCampsiteId,
  selectedPitchId,
  onCampsiteChange,
  onPitchChange,
  locale = 'vi'
}: CampsitePitchSelectorProps) {
  const [campsites, setCampsites] = useState<Campsite[]>([])
  const [allPitches, setAllPitches] = useState<Pitch[]>([])
  const [filteredPitches, setFilteredPitches] = useState<Pitch[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch campsites and pitches on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch campsites
        const campsitesRes = await fetch('/api/admin/campsites')
        const campsitesData = await campsitesRes.json()

        // Fetch all pitches
        const pitchesRes = await fetch('/api/admin/pitches')
        const pitchesData = await pitchesRes.json()

        // API trả về trực tiếp array, không wrap trong object
        setCampsites(Array.isArray(campsitesData) ? campsitesData : [])
        setAllPitches(pitchesData.pitches || [])
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filter pitches when campsite changes
  useEffect(() => {
    if (selectedCampsiteId) {
      const filtered = allPitches.filter(
        pitch => pitch.campsiteId === selectedCampsiteId
      )
      setFilteredPitches(filtered)

      // Reset pitch selection if currently selected pitch not in new campsite
      if (selectedPitchId && !filtered.find(p => p.id === selectedPitchId)) {
        // Pitch selection will be cleared by parent component
      }
    } else {
      setFilteredPitches([])
    }
  }, [selectedCampsiteId, allPitches, selectedPitchId])

  const handleCampsiteChange = (campsiteId: string) => {
    onCampsiteChange(campsiteId)
  }

  const handlePitchChange = (pitchId: string) => {
    const pitch = filteredPitches.find(p => p.id === pitchId)
    if (pitch) {
      onPitchChange(pitchId, pitch)
    }
  }

  const selectedCampsite = campsites.find(c => c.id === selectedCampsiteId)

  return (
    <div className="grid grid-cols-2 gap-4 pt-2">
      {/* Campsite Selector */}
      <div className="space-y-2">
        <Label htmlFor="campsite-select" className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          {locale === 'vi' ? 'Chọn Campsite' : 'Select Campsite'}
          <span className="text-red-500">*</span>
        </Label>
        <Select
          value={selectedCampsiteId}
          onValueChange={handleCampsiteChange}
          disabled={loading}
        >
          <SelectTrigger id="campsite-select">
            {selectedCampsite ? (
              <span className="truncate">{getLocalizedText(selectedCampsite.name, locale as 'vi' | 'en')}</span>
            ) : (
              <SelectValue placeholder={
                loading
                  ? (locale === 'vi' ? 'Đang tải...' : 'Loading...')
                  : (locale === 'vi' ? 'Chọn campsite' : 'Select campsite')
              } />
            )}
          </SelectTrigger>
          <SelectContent>
            {campsites.map(campsite => (
              <SelectItem key={campsite.id} value={campsite.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{getLocalizedText(campsite.name, locale as 'vi' | 'en')}</span>
                  <span className="text-xs text-gray-500">
                    {campsite.city && campsite.province
                      ? `${campsite.city}, ${campsite.province}`
                      : campsite.city || campsite.province || ''
                    }
                    {campsite.pitch_count > 0 && ` • ${campsite.pitch_count} pitches`}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Pitch Selector */}
      <div className="space-y-2">
        <Label htmlFor="pitch-select" className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          {locale === 'vi' ? 'Chọn Slot' : 'Select Slot'}
          <span className="text-red-500">*</span>
          {selectedCampsite && filteredPitches.length > 0 && (
            <span className="text-sm text-gray-500 font-normal">
              ({filteredPitches.length} {locale === 'vi' ? 'slot có sẵn' : 'available'})
            </span>
          )}
        </Label>
        <Select
          value={selectedPitchId}
          onValueChange={handlePitchChange}
          disabled={!selectedCampsiteId || filteredPitches.length === 0}
        >
          <SelectTrigger id="pitch-select">
            <SelectValue placeholder={
              !selectedCampsiteId
                ? (locale === 'vi' ? 'Chọn campsite trước' : 'Select campsite first')
                : filteredPitches.length === 0
                ? (locale === 'vi' ? 'Không có slot nào' : 'No slots available')
                : (locale === 'vi' ? 'Chọn slot' : 'Select slot')
            } />
          </SelectTrigger>
          <SelectContent>
            {filteredPitches.map(pitch => (
              <SelectItem key={pitch.id} value={pitch.id}>
                <div className="flex items-center justify-between gap-3 w-full">
                  <span className="font-medium">{getLocalizedText(pitch.name, locale as 'vi' | 'en')}</span>
                  <span className="text-xs text-gray-500">
                    {locale === 'vi' ? 'Tối đa' : 'Max'} {pitch.maxGuests} {locale === 'vi' ? 'khách' : 'guests'}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
