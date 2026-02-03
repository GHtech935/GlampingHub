'use client'

import { useState, useEffect, useRef } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Home, AlertCircle, ChevronsUpDown, Check, Search } from 'lucide-react'
import { type MultilingualText, getLocalizedText } from '@/lib/i18n-utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

interface GlampingItem {
  id: string
  name: MultilingualText | string
  sku: string
  category_name: MultilingualText | string
  inventory_quantity: number
  unlimited_inventory: boolean
  status: string
}

interface GlampingItemSelectorProps {
  zoneId: string
  selectedItemId?: string
  onItemChange: (itemId: string, itemData: GlampingItem) => void
  locale?: string
}

export function GlampingItemSelector({
  zoneId,
  selectedItemId,
  onItemChange,
  locale = 'vi'
}: GlampingItemSelectorProps) {
  const [items, setItems] = useState<GlampingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Fetch items when zoneId changes
  useEffect(() => {
    const fetchItems = async () => {
      if (!zoneId) {
        setItems([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/admin/glamping/items?zone_id=${zoneId}&is_tent=true`)

        if (!response.ok) {
          throw new Error('Failed to fetch items')
        }

        const data = await response.json()
        setItems(data.items || [])
      } catch (err) {
        console.error('Error fetching glamping items:', err)
        setError(locale === 'vi'
          ? 'Không thể tải danh sách items'
          : 'Failed to load items'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchItems()
  }, [zoneId, locale])

  // Focus search input when popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => searchInputRef.current?.focus(), 0)
    } else {
      setSearchTerm('')
    }
  }, [open])

  const handleItemSelect = (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (item) {
      onItemChange(itemId, item)
      setOpen(false)
    }
  }

  const selectedItem = items.find(i => i.id === selectedItemId)

  // Filter items by search term
  const filteredItems = items.filter(item => {
    if (!searchTerm) return true
    const name = getLocalizedText(item.name, locale as 'vi' | 'en').toLowerCase()
    const sku = (item.sku || '').toLowerCase()
    const term = searchTerm.toLowerCase()
    return name.includes(term) || sku.includes(term)
  })

  // Show error if any
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  // Show message if no items available
  if (!loading && items.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {locale === 'vi'
            ? 'Không có item nào trong zone này'
            : 'No items available in this zone'
          }
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="item-select" className="flex items-center gap-2">
        <Home className="h-4 w-4" />
        {locale === 'vi' ? 'Chọn Item' : 'Select Item'}
        <span className="text-red-500">*</span>
      </Label>

      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={loading || items.length === 0}
            className="w-full justify-between font-normal"
          >
            {selectedItem ? (
              <span className="truncate">
                {getLocalizedText(selectedItem.name, locale as 'vi' | 'en')}
                {selectedItem.sku && (
                  <span className="ml-2 text-xs text-gray-500">({selectedItem.sku})</span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">
                {loading
                  ? (locale === 'vi' ? 'Đang tải...' : 'Loading...')
                  : (locale === 'vi' ? 'Chọn item' : 'Select item')
                }
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="z-[9999] w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <div className="flex items-center border-b px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              ref={searchInputRef}
              placeholder={locale === 'vi' ? 'Tìm kiếm item...' : 'Search items...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 border-0 p-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto p-1">
            {filteredItems.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {locale === 'vi' ? 'Không tìm thấy item' : 'No items found'}
              </div>
            ) : (
              filteredItems.map(item => {
                const isAvailable = item.status === 'available' &&
                  (item.unlimited_inventory || item.inventory_quantity > 0)
                const isSelected = item.id === selectedItemId

                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => handleItemSelect(item.id)}
                    className={cn(
                      'relative flex w-full cursor-pointer select-none items-start rounded-sm px-2 py-1.5 text-left text-sm outline-none',
                      isSelected && 'bg-accent',
                      !isAvailable && 'opacity-50 cursor-not-allowed',
                      isAvailable && !isSelected && 'hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Check
                      className={cn(
                        'mr-2 mt-0.5 h-4 w-4 shrink-0',
                        isSelected ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {getLocalizedText(item.name, locale as 'vi' | 'en')}
                        </span>
                        {!isAvailable && (
                          <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">
                            {locale === 'vi' ? 'Không có sẵn' : 'Unavailable'}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {item.sku && `SKU: ${item.sku}`}
                        {item.category_name && ` • ${typeof item.category_name === 'string' ? item.category_name : getLocalizedText(item.category_name, locale as 'vi' | 'en')}`}
                        {!item.unlimited_inventory && ` • ${locale === 'vi' ? 'Còn' : 'Stock'}: ${item.inventory_quantity}`}
                        {item.unlimited_inventory && ` • ${locale === 'vi' ? 'Không giới hạn' : 'Unlimited'}`}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {selectedItem && (
        <p className="text-xs text-gray-600">
          {selectedItem.category_name && (
            <>
              {locale === 'vi' ? 'Loại' : 'Category'}: {typeof selectedItem.category_name === 'string' ? selectedItem.category_name : getLocalizedText(selectedItem.category_name, locale as 'vi' | 'en')}
              {' • '}
            </>
          )}
          {selectedItem.unlimited_inventory ? (
            locale === 'vi' ? 'Không giới hạn số lượng' : 'Unlimited inventory'
          ) : (
            `${locale === 'vi' ? 'Còn' : 'Available'}: ${selectedItem.inventory_quantity}`
          )}
        </p>
      )}
    </div>
  )
}
