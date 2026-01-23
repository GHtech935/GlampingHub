"use client"

import { useState, useEffect, Suspense, useCallback, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Map, SlidersHorizontal, Loader2 } from "lucide-react"
import { GlampingZoneCard } from "@/components/search/GlampingZoneCard"
import { LeafletMap } from "@/components/search/LeafletMap"
import { SearchWidget } from "@/components/search/SearchWidget"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useClientLocale } from "@/components/providers/ClientI18nProvider"
import { type MultilingualText } from "@/lib/i18n-utils"

interface GlampingItem {
  id: string
  name: string
  category_name: string
  base_price: number
  sku?: string
  summary?: string
}

interface GlampingZone {
  id: string
  name: MultilingualText | string
  description?: MultilingualText | string
  location: string
  slug: string
  images: string[]
  basePrice: number
  features?: string[]
  items?: GlampingItem[]
  distance?: string
  latitude: number
  longitude: number
}

interface SearchResponse {
  success: boolean
  data: {
    zones: GlampingZone[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
    filters: {
      checkIn: string
      checkOut: string
      adults: number
      children: number
      guests: number
      provinces: string[]
      appliedFilters: string[]
      sort: string
    }
  }
}

function GlampingSearchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { locale } = useClientLocale()

  const [zones, setZones] = useState<GlampingZone[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [showMap, setShowMap] = useState(false) // Will be set based on screen size
  const [showFilters, setShowFilters] = useState(false)
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null)

  // Set showMap based on screen size on initial load (desktop: show, mobile: hide)
  useEffect(() => {
    const isDesktop = window.innerWidth >= 1024 // lg breakpoint
    setShowMap(isDesktop)
  }, [])

  // Get params from URL
  const checkIn = searchParams.get("checkIn") || ""
  const checkOut = searchParams.get("checkOut") || ""
  const adultsParam = searchParams.get("adults")
  const childrenParam = searchParams.get("children")
  const adults = adultsParam ? parseInt(adultsParam) : 2
  const children = childrenParam ? parseInt(childrenParam) : 0
  const guests = (adults + children).toString()
  const provinces = searchParams.get("provinces")?.split(",").filter(Boolean) || []
  const filters = searchParams.get("filters") || ""
  const sort = searchParams.get("sort") || "best-match"
  const page = searchParams.get("page") || "1"

  // Fetch zones from API
  const fetchZones = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (checkIn) params.set("checkIn", checkIn)
      if (checkOut) params.set("checkOut", checkOut)
      params.set("adults", adults.toString())
      params.set("children", children.toString())
      if (provinces.length > 0) params.set("provinces", provinces.join(","))
      if (filters) params.set("filters", filters)
      if (sort) params.set("sort", sort)
      if (page) params.set("page", page)

      const response = await fetch(`/api/glamping/search?${params.toString()}`)
      const result: SearchResponse = await response.json()

      if (result.success) {
        setZones(result.data.zones)
        setTotal(result.data.pagination.total)
      } else {
        console.error("Search failed:", result)
        setZones([])
        setTotal(0)
      }
    } catch (error) {
      console.error("Failed to fetch zones:", error)
      setZones([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  // Fetch when params change
  useEffect(() => {
    fetchZones()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkIn, checkOut, guests, provinces.join(","), filters, sort, page])

  // Update URL params
  const updateParams = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    // Reset to page 1 when changing filters/sort
    if (key !== "page") {
      params.set("page", "1")
    }
    router.push(`/glamping/search?${params.toString()}`)
  }

  const handleSortChange = (newSort: string) => {
    updateParams("sort", newSort)
  }

  const handlePageChange = (newPage: number) => {
    updateParams("page", newPage.toString())
  }

  const handleFilterApply = (selectedFilters: Set<string>) => {
    const filtersStr = Array.from(selectedFilters).join(",")
    updateParams("filters", filtersStr)
    setShowFilters(false)
  }

  // Debounced search handler
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const handleSearchChange = useCallback((params: {
    campsiteId: string
    checkIn?: Date
    checkOut?: Date
    adults: number
    children: number
    pitchTypes: string[]
    provinces: string[]
  }) => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      const urlParams = new URLSearchParams(searchParams.toString())

      // Update dates
      if (params.checkIn) {
        urlParams.set("checkIn", params.checkIn.toISOString())
      } else {
        urlParams.delete("checkIn")
      }

      if (params.checkOut) {
        urlParams.set("checkOut", params.checkOut.toISOString())
      } else {
        urlParams.delete("checkOut")
      }

      // Update guests
      urlParams.set("adults", params.adults.toString())
      urlParams.set("children", params.children.toString())

      // Update provinces
      if (params.provinces.length > 0) {
        urlParams.set("provinces", params.provinces.join(","))
      } else {
        urlParams.delete("provinces")
      }

      // Reset to page 1 when search changes
      urlParams.set("page", "1")

      router.push(`/glamping/search?${urlParams.toString()}`)
    }, 500) // 500ms debounce delay
  }, [searchParams, router])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const totalPages = Math.ceil(total / 12)
  const currentPage = parseInt(page)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b sticky top-16 z-20">
        <div className="mx-auto px-3 sm:px-4 py-3">
          {/* Mobile Layout: Stack vertically */}
          <div className="flex flex-col gap-3 lg:hidden">
            {/* Row 1: Search Widget (full width on mobile) */}
            <div className="w-full">
              <SearchWidget
                initialCheckIn={checkIn}
                initialCheckOut={checkOut}
                initialAdults={adults}
                initialChildren={children}
                initialProvinces={provinces}
                onChange={handleSearchChange}
                variant="compact"
                type="glamping"
                hideGuests={true}
              />
            </div>

            {/* Row 2: Filter, Results, Sort, Map */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {/* TODO: Add FilterSidebar when glamping features are ready */}
                <p className="text-sm text-muted-foreground whitespace-nowrap">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span><span className="font-semibold">{total}</span> kết quả</span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Select value={sort} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-auto min-w-[100px] h-10 text-sm px-3">
                    <SelectValue placeholder="Sắp xếp" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="best-match">Phù hợp nhất</SelectItem>
                    <SelectItem value="price-low">Giá thấp</SelectItem>
                    <SelectItem value="price-high">Giá cao</SelectItem>
                    <SelectItem value="rating">Đánh giá</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  variant={showMap ? "default" : "outline"}
                  onClick={() => setShowMap(!showMap)}
                  className="h-10 w-10 touch-manipulation p-0 flex-shrink-0"
                >
                  <Map className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Desktop Layout: Flex with Wrap */}
          <div className="hidden lg:flex flex-wrap min-[1350px]:flex-nowrap items-center gap-3">
            {/* Filter Button + Results Count */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* TODO: Add FilterSidebar when glamping features are ready */}
              <p className="text-sm text-muted-foreground whitespace-nowrap">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Đang tìm...</span>
                  </span>
                ) : (
                  <span><span className="font-semibold">{total}</span> kết quả</span>
                )}
              </p>
            </div>

            {/* Sort + Map Toggle */}
            <div className="flex items-center gap-3 flex-shrink-0 ml-auto min-[1350px]:ml-0">
              <Select value={sort} onValueChange={handleSortChange}>
                <SelectTrigger className="w-auto min-w-[140px] max-w-[180px] h-10 text-sm">
                  <SelectValue placeholder="Sắp xếp" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="best-match">Phù hợp nhất</SelectItem>
                  <SelectItem value="price-low">Giá: Thấp → Cao</SelectItem>
                  <SelectItem value="price-high">Giá: Cao → Thấp</SelectItem>
                  <SelectItem value="rating">Đánh giá cao</SelectItem>
                </SelectContent>
              </Select>

              <Button
                size="sm"
                variant={showMap ? "default" : "outline"}
                onClick={() => setShowMap(!showMap)}
                className="h-10 touch-manipulation"
              >
                <Map className="h-4 w-4" />
                <span className="ml-2">Bản đồ</span>
              </Button>
            </div>

            {/* Search Widget (full width on wrap, grows on nowrap) */}
            <div className="w-full min-[1350px]:w-auto min-[1350px]:flex-1 min-[1350px]:min-w-0 order-last min-[1350px]:order-none">
              <SearchWidget
                initialCheckIn={checkIn}
                initialCheckOut={checkOut}
                initialAdults={adults}
                initialChildren={children}
                initialProvinces={provinces}
                onChange={handleSearchChange}
                variant="compact"
                type="glamping"
                hideGuests={true}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex min-h-[calc(100vh-180px)] sm:min-h-[calc(100vh-140px)] lg:h-[calc(100vh-120px)]">
        {/* Zone Cards - 60% width when map is shown */}
        <div className={`overflow-y-auto transition-all ${showMap ? 'w-full lg:w-3/5' : 'w-full'}`}>
          <div className="mx-auto px-3 py-4 sm:p-4 md:p-6">
            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12 md:py-16">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-sm sm:text-base text-muted-foreground">Đang tìm kiếm khu glamping...</p>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && zones.length === 0 && (
              <div className="flex items-center justify-center py-12 md:py-16">
                <div className="text-center max-w-md px-4">
                  <p className="text-base sm:text-lg font-semibold mb-2">Không tìm thấy kết quả</p>
                  <p className="text-sm sm:text-base text-muted-foreground mb-4">
                    Thử thay đổi bộ lọc hoặc tìm kiếm địa điểm khác
                  </p>
                  <Button onClick={() => router.push("/glamping/search")} className="touch-manipulation">
                    Xóa bộ lọc
                  </Button>
                </div>
              </div>
            )}

            {/* Cards Grid */}
            {!loading && zones.length > 0 && (
              <>
                <div className={`grid gap-4 sm:gap-5 mb-6 sm:mb-8 ${
                  showMap
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3'
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                }`}>
                  {zones.map((zone) => (
                    <GlampingZoneCard
                      key={zone.id}
                      {...zone}
                      isHovered={hoveredZoneId === zone.id}
                      onHoverChange={setHoveredZoneId}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center py-4 sm:py-6">
                    <Pagination>
                      <PaginationContent className="gap-1 sm:gap-2">
                        {currentPage > 1 && (
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => handlePageChange(currentPage - 1)}
                              className="cursor-pointer touch-manipulation h-9 sm:h-10"
                            />
                          </PaginationItem>
                        )}

                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = i + 1
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                onClick={() => handlePageChange(pageNum)}
                                isActive={pageNum === currentPage}
                                className="cursor-pointer touch-manipulation h-9 w-9 sm:h-10 sm:w-10 text-sm sm:text-base"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          )
                        })}

                        {currentPage < totalPages && (
                          <PaginationItem>
                            <PaginationNext
                              onClick={() => handlePageChange(currentPage + 1)}
                              className="cursor-pointer touch-manipulation h-9 sm:h-10"
                            />
                          </PaginationItem>
                        )}
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Map Panel (Right Side) - 40% width on desktop */}
        {showMap && zones.length > 0 && (
          <div className="hidden lg:block lg:w-2/5 sticky top-0 h-full border-l">
            <LeafletMap
              locations={zones}
              type="glamping"
              hoveredCampsiteId={hoveredZoneId}
            />
          </div>
        )}
      </div>

      {/* Mobile Map Overlay */}
      {showMap && zones.length > 0 && (
        <>
          <div className="lg:hidden fixed inset-x-0 top-16 bottom-0 z-40 bg-white">
            <div className="h-full w-full">
              <LeafletMap
                locations={zones}
                type="glamping"
                hoveredCampsiteId={hoveredZoneId}
              />
            </div>
          </div>
          {/* Close button - separate fixed element with very high z-index */}
          <button
            onClick={() => setShowMap(false)}
            className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-white text-gray-800 font-medium px-6 py-3 rounded-full shadow-xl border-2 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            Đóng bản đồ
          </button>
        </>
      )}
    </div>
  )
}

export default function GlampingSearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div>Loading...</div></div>}>
      <GlampingSearchContent />
    </Suspense>
  )
}
