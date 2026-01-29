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
import { Home, AlertCircle } from 'lucide-react'
import { type MultilingualText, getLocalizedText } from '@/lib/i18n-utils'
import { Alert, AlertDescription } from '@/components/ui/alert'

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

        const response = await fetch(`/api/admin/glamping/items?zone_id=${zoneId}`)

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

  const handleItemChange = (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (item) {
      onItemChange(itemId, item)
    }
  }

  const selectedItem = items.find(i => i.id === selectedItemId)

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
      <Select
        value={selectedItemId}
        onValueChange={handleItemChange}
        disabled={loading || items.length === 0}
      >
        <SelectTrigger id="item-select">
          {selectedItem ? (
            <span className="truncate">
              {getLocalizedText(selectedItem.name, locale as 'vi' | 'en')}
              {selectedItem.sku && (
                <span className="ml-2 text-xs text-gray-500">({selectedItem.sku})</span>
              )}
            </span>
          ) : (
            <SelectValue placeholder={
              loading
                ? (locale === 'vi' ? 'Đang tải...' : 'Loading...')
                : (locale === 'vi' ? 'Chọn item' : 'Select item')
            } />
          )}
        </SelectTrigger>
        <SelectContent>
          {items.map(item => {
            const isAvailable = item.status === 'available' &&
              (item.unlimited_inventory || item.inventory_quantity > 0)

            return (
              <SelectItem
                key={item.id}
                value={item.id}
                disabled={!isAvailable}
              >
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
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>

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
