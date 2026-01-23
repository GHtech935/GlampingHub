"use client"

import { useState, useEffect } from "react"
import { Users } from "lucide-react"
import { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useTranslations } from "next-intl"
import { PitchTypePopoverSelector } from "@/components/search/PitchTypePopoverSelector"
import { CampsiteSelector } from "@/components/search/CampsiteSelector"
import { ProvinceSelector } from "@/components/search/ProvinceSelector"

interface SearchWidgetProps {
  initialCampsiteId?: string
  initialCheckIn?: string
  initialCheckOut?: string
  initialAdults?: number
  initialChildren?: number
  initialPitchTypes?: string[]
  initialProvinces?: string[]
  onChange?: (params: {
    campsiteId: string
    checkIn?: Date
    checkOut?: Date
    adults: number
    children: number
    pitchTypes: string[]
    provinces: string[]
  }) => void
  variant?: "default" | "compact"
  type?: "camping" | "glamping" // New: determines which selectors to show
  hideGuests?: boolean // New: hide guest selector
}

export function SearchWidget({
  initialCampsiteId = "",
  initialCheckIn = "",
  initialCheckOut = "",
  initialAdults = 2,
  initialChildren = 0,
  initialPitchTypes = [],
  initialProvinces = [],
  onChange,
  variant = "compact",
  type = "camping",
  hideGuests = false,
}: SearchWidgetProps) {
  const t = useTranslations("home")
  const [selectedCampsiteId, setSelectedCampsiteId] = useState(initialCampsiteId)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (initialCheckIn && initialCheckOut) {
      return {
        from: new Date(initialCheckIn),
        to: new Date(initialCheckOut),
      }
    }
    return undefined
  })
  const [guests, setGuests] = useState({
    adults: initialAdults,
    children: initialChildren,
  })
  const [selectedPitchTypes, setSelectedPitchTypes] = useState<string[]>(initialPitchTypes)
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>(initialProvinces)
  const [campsites, setCampsites] = useState<any[]>([])
  const [glampingZones, setGlampingZones] = useState<any[]>([])
  const [isSyncingFromProps, setIsSyncingFromProps] = useState(false)

  // Update internal state when props change (without triggering onChange)
  useEffect(() => {
    // Only sync campsite ID for camping mode
    if (type === "camping") {
      setIsSyncingFromProps(true)
      setSelectedCampsiteId(initialCampsiteId)
    }
  }, [initialCampsiteId, type])

  useEffect(() => {
    setIsSyncingFromProps(true)
    if (initialCheckIn && initialCheckOut) {
      setDateRange({
        from: new Date(initialCheckIn),
        to: new Date(initialCheckOut),
      })
    } else {
      // Clear dates when props are empty (e.g., when user clears filters)
      setDateRange(undefined)
    }
  }, [initialCheckIn, initialCheckOut])

  useEffect(() => {
    setIsSyncingFromProps(true)
    setGuests({
      adults: initialAdults,
      children: initialChildren,
    })
  }, [initialAdults, initialChildren])

  useEffect(() => {
    // Only sync pitch types for camping mode
    if (type === "camping") {
      setIsSyncingFromProps(true)
      setSelectedPitchTypes(initialPitchTypes)
    }
  }, [initialPitchTypes, type])

  useEffect(() => {
    setIsSyncingFromProps(true)
    setSelectedProvinces(initialProvinces)
  }, [initialProvinces])

  // Fetch campsites for province derivation (camping mode)
  useEffect(() => {
    if (type === "camping") {
      const fetchCampsites = async () => {
        try {
          const response = await fetch('/api/campsites/list')
          const data = await response.json()
          setCampsites(Array.isArray(data) ? data : [])
        } catch (error) {
          console.error('Error fetching campsites:', error)
          setCampsites([])
        }
      }

      fetchCampsites()
    }
  }, [type])

  // Fetch glamping zones for province derivation (glamping mode)
  useEffect(() => {
    if (type === "glamping") {
      const fetchGlampingZones = async () => {
        try {
          const response = await fetch('/api/glamping/zones')
          const data = await response.json()
          setGlampingZones(Array.isArray(data) ? data : [])
        } catch (error) {
          console.error('Error fetching glamping zones:', error)
          setGlampingZones([])
        }
      }

      fetchGlampingZones()
    }
  }, [type])

  // Notify parent component when any value changes (but not during prop sync)
  useEffect(() => {
    if (isSyncingFromProps) {
      setIsSyncingFromProps(false)
      return
    }

    if (onChange) {
      onChange({
        campsiteId: selectedCampsiteId,
        checkIn: dateRange?.from,
        checkOut: dateRange?.to,
        adults: guests.adults,
        children: guests.children,
        pitchTypes: type === "camping" ? selectedPitchTypes : [],
        provinces: selectedProvinces,
      })
    }
    // Only include selectedPitchTypes in deps for camping mode
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    type === "camping" ? selectedCampsiteId : "",
    dateRange,
    guests.adults,
    guests.children,
    selectedProvinces,
    type === "camping" ? selectedPitchTypes.join(",") : ""
  ])

  const handleCampsiteChange = (campsiteId: string, _campsiteName: string) => {
    setSelectedCampsiteId(campsiteId)
  }

  if (variant === "compact") {
    return (
      <div className="flex flex-col gap-2 w-full">
        {/* Mobile: 2x2 grid layout */}
        <div className="grid grid-cols-2 gap-2 md:hidden">
          {/* Province Selector - Full width */}
          <div className="col-span-2">
            <ProvinceSelector
              selectedProvinces={selectedProvinces}
              onChange={setSelectedProvinces}
              campsites={type === "glamping" ? glampingZones : campsites}
              className="h-11 text-sm"
            />
          </div>

          {/* Campsite Selector - Full width (only for camping) */}
          {type === "camping" && (
            <div className="col-span-2">
              <CampsiteSelector
                value={selectedCampsiteId}
                onChange={handleCampsiteChange}
                selectedProvinces={selectedProvinces}
                placeholder={t('locationPlaceholder')}
                className="h-11 text-sm"
              />
            </div>
          )}

          {/* Date Range Picker */}
          <div className={hideGuests && type === "camping" ? "col-span-1" : "col-span-2"}>
            <DateRangePicker
              dateRange={dateRange}
              onSelect={setDateRange}
              placeholder={t('selectDates')}
              numberOfMonths={1}
              className="h-11 text-sm"
            />
          </div>

          {/* Guests Selector */}
          {!hideGuests && (
            <div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 justify-start text-left font-normal text-sm"
                  >
                    <Users className="mr-2 h-4 w-4 text-gray-400" />
                    <span>{guests.adults + guests.children}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72" align="start">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{t('adults')}</p>
                        <p className="text-xs text-muted-foreground">{t('adultsDesc')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => setGuests(g => ({ ...g, adults: Math.max(1, g.adults - 1) }))}
                          disabled={guests.adults <= 1}
                          className="h-9 w-9"
                        >
                          -
                        </Button>
                        <span className="w-8 text-center font-semibold text-sm">{guests.adults}</span>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => setGuests(g => ({ ...g, adults: g.adults + 1 }))}
                          className="h-9 w-9"
                        >
                          +
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{t('children')}</p>
                        <p className="text-xs text-muted-foreground">{t('childrenDesc')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => setGuests(g => ({ ...g, children: Math.max(0, g.children - 1) }))}
                          disabled={guests.children <= 0}
                          className="h-9 w-9"
                        >
                          -
                        </Button>
                        <span className="w-8 text-center font-semibold text-sm">{guests.children}</span>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => setGuests(g => ({ ...g, children: g.children + 1 }))}
                          className="h-9 w-9"
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Pitch Type Filter (only for camping) */}
          {type === "camping" && (
            <div>
              <PitchTypePopoverSelector
                selectedTypes={selectedPitchTypes}
                onChange={setSelectedPitchTypes}
                className="!h-11"
              />
            </div>
          )}
        </div>

        {/* Desktop: Horizontal layout */}
        <div className="hidden md:flex md:flex-row gap-3 w-full items-center">
          {/* Province Selector */}
          <div className="w-full md:w-[140px]">
            <ProvinceSelector
              selectedProvinces={selectedProvinces}
              onChange={setSelectedProvinces}
              campsites={type === "glamping" ? glampingZones : campsites}
              className="h-10 text-sm"
            />
          </div>

          {/* Campsite Selector (only for camping) */}
          {type === "camping" && (
            <div className="relative flex-1 min-w-0 md:min-w-[250px]">
              <CampsiteSelector
                value={selectedCampsiteId}
                onChange={handleCampsiteChange}
                selectedProvinces={selectedProvinces}
                placeholder={t('locationPlaceholder')}
                className="h-10 text-sm"
              />
            </div>
          )}

          {/* Date Range Picker */}
          <div className="flex-shrink-0 w-full md:w-auto md:min-w-[220px]">
            <DateRangePicker
              dateRange={dateRange}
              onSelect={setDateRange}
              placeholder={t('selectDates')}
              numberOfMonths={2}
              className="h-10 text-sm"
            />
          </div>

          {/* Guests Selector */}
          {!hideGuests && (
            <div className="flex-shrink-0 w-full md:w-[90px]">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-10 justify-start text-left font-normal text-sm"
                  >
                    <Users className="mr-2 h-4 w-4 text-gray-400" />
                    <span>{guests.adults + guests.children}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{t('adults')}</p>
                        <p className="text-xs text-muted-foreground">{t('adultsDesc')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => setGuests(g => ({ ...g, adults: Math.max(1, g.adults - 1) }))}
                          disabled={guests.adults <= 1}
                          className="h-8 w-8"
                        >
                          -
                        </Button>
                        <span className="w-8 text-center font-semibold text-sm">{guests.adults}</span>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => setGuests(g => ({ ...g, adults: g.adults + 1 }))}
                          className="h-8 w-8"
                        >
                          +
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{t('children')}</p>
                        <p className="text-xs text-muted-foreground">{t('childrenDesc')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => setGuests(g => ({ ...g, children: Math.max(0, g.children - 1) }))}
                          disabled={guests.children <= 0}
                          className="h-8 w-8"
                        >
                          -
                        </Button>
                        <span className="w-8 text-center font-semibold text-sm">{guests.children}</span>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => setGuests(g => ({ ...g, children: g.children + 1 }))}
                          className="h-8 w-8"
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Pitch Type Filter (only for camping) */}
          {type === "camping" && (
            <div className="flex-shrink-0 w-full md:w-auto">
              <PitchTypePopoverSelector
                selectedTypes={selectedPitchTypes}
                onChange={setSelectedPitchTypes}
                className="!h-10"
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  // Default variant (similar to homepage)
  return (
    <div className="bg-white rounded-lg shadow-2xl p-4 sm:p-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
        {/* Campsite Selector */}
        <div className="relative">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 text-left">
            {t('whereToGo')}
          </label>
          <CampsiteSelector
            value={selectedCampsiteId}
            onChange={handleCampsiteChange}
            placeholder={t('locationPlaceholder')}
            className="h-12 sm:h-14 text-sm sm:text-base"
          />
        </div>

        {/* Check-in Date */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 text-left">
            {t('checkIn')}
          </label>
          <DateRangePicker
            dateRange={dateRange}
            onSelect={setDateRange}
            placeholder={t('selectDates')}
            numberOfMonths={2}
            className="h-12 sm:h-14 text-sm sm:text-base"
          />
        </div>

        {/* Guests Selector */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 text-left">
            {t('guests')}
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 sm:h-14 justify-start text-left font-normal text-sm sm:text-base"
              >
                <Users className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                <span>
                  {guests.adults + guests.children} {t('guests')}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 sm:w-96" align="start">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm sm:text-base">{t('adults')}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{t('adultsDesc')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => setGuests(g => ({ ...g, adults: Math.max(1, g.adults - 1) }))}
                      disabled={guests.adults <= 1}
                      className="h-10 w-10 sm:h-12 sm:w-12"
                    >
                      -
                    </Button>
                    <span className="w-8 text-center font-semibold">{guests.adults}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => setGuests(g => ({ ...g, adults: g.adults + 1 }))}
                      className="h-10 w-10 sm:h-12 sm:w-12"
                    >
                      +
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm sm:text-base">{t('children')}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{t('childrenDesc')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => setGuests(g => ({ ...g, children: Math.max(0, g.children - 1) }))}
                      disabled={guests.children <= 0}
                      className="h-10 w-10 sm:h-12 sm:w-12"
                    >
                      -
                    </Button>
                    <span className="w-8 text-center font-semibold">{guests.children}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => setGuests(g => ({ ...g, children: g.children + 1 }))}
                      className="h-10 w-10 sm:h-12 sm:w-12"
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  )
}
