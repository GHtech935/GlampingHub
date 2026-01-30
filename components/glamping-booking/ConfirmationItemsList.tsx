"use client";

import React, { useState, useMemo } from 'react';
import { Edit2, ChevronDown, ChevronUp, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { GlampingMenuProductsSelector, MenuProduct, MenuProductSelection } from '@/components/glamping-booking/GlampingMenuProductsSelector';
import { format, addDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

// Types for tent data from API
export interface TentMenuProduct {
  id: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  servingDate?: string;
  name: any; // JSONB
  description?: any;
  unit?: any;
  imageUrl?: string;
  minGuests?: number | null;
  maxGuests?: number | null;
  categoryId?: string;
  categoryName?: any;
}

export interface TentParameter {
  id: string;
  parameterId: string;
  label: string;
  bookedQuantity: number;
  colorCode?: string;
  visibility?: string;
  countedForMenu?: boolean;
}

export interface TentData {
  id: string;
  itemId: string;
  itemName: any; // JSONB: {en, vi}
  zoneName: any; // JSONB: {en, vi}
  zoneId: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  subtotal: number;
  specialRequests?: string;
  displayOrder: number;
  parameters: TentParameter[];
  menuProducts: TentMenuProduct[];
}

interface ConfirmationItemsListProps {
  tents: TentData[];
  bookingCode: string;
  canEditMenu: boolean;
  onMenuUpdated: () => void;
  locale?: string;
}

// Helper function to extract localized string from JSONB field
function getLocalizedString(value: any, locale: string = 'vi', fallback: string = ''): string {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value[locale] || value.vi || value.en || fallback;
  }
  return fallback;
}

export function ConfirmationItemsList({
  tents,
  bookingCode,
  canEditMenu,
  onMenuUpdated,
  locale = 'vi',
}: ConfirmationItemsListProps) {
  const [expandedMenuItems, setExpandedMenuItems] = useState<Set<string>>(new Set());
  const [editingTentId, setEditingTentId] = useState<string | null>(null);
  const [menuSelections, setMenuSelections] = useState<Record<number, Record<string, MenuProductSelection>>>({});
  const [availableMenuItems, setAvailableMenuItems] = useState<MenuProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!tents || tents.length === 0) {
    return null;
  }

  const toggleMenuExpansion = (tentId: string) => {
    setExpandedMenuItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tentId)) {
        newSet.delete(tentId);
      } else {
        newSet.add(tentId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: vi });
    } catch {
      return dateString;
    }
  };

  const handleEditClick = async (tent: TentData) => {
    setLoading(true);
    try {
      // Fetch available menu items for this specific tent
      const response = await fetch(`/api/glamping/bookings/code/${bookingCode}/tents/${tent.id}/available-menu-items`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Cannot load menu items');
      }

      // Transform menu items to MenuProduct format
      const menuItems: MenuProduct[] = data.menuItems.map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        unit: item.unit,
        image_url: item.image_url,
        is_required: item.is_required || false,
        display_order: item.display_order || 0,
        category_id: item.category_id,
        category_name: item.category_name,
        min_guests: item.min_guests,
        max_guests: item.max_guests,
      }));

      setAvailableMenuItems(menuItems);

      // Initialize selections from current booking's menu products for this tent
      // Group by night (serving_date)
      const nightlySelections: Record<number, Record<string, MenuProductSelection>> = {};

      tent.menuProducts.forEach((mp) => {
        // Calculate night index from serving_date or default to 0
        let nightIndex = 0;
        if (mp.servingDate) {
          const checkIn = new Date(tent.checkInDate);
          const servingDate = new Date(mp.servingDate);
          nightIndex = Math.floor((servingDate.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
          if (nightIndex < 0) nightIndex = 0;
        }

        if (!nightlySelections[nightIndex]) {
          nightlySelections[nightIndex] = {};
        }

        nightlySelections[nightIndex][mp.menuItemId] = {
          quantity: mp.quantity,
          price: mp.unitPrice,
          name: getLocalizedString(mp.name, locale, 'Unknown'),
          voucher: null,
        };
      });

      // If no selections, initialize with empty object for night 0
      if (Object.keys(nightlySelections).length === 0) {
        nightlySelections[0] = {};
      }

      setMenuSelections(nightlySelections);
      setEditingTentId(tent.id);
    } catch (error: any) {
      toast.error(error.message || 'Error loading menu items');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingTentId(null);
    setMenuSelections({});
    setAvailableMenuItems([]);
  };

  const handleSaveMenu = async (tent: TentData) => {
    setSaving(true);
    try {
      // Convert per-night selections to API format
      const menuProducts: Array<{
        id: string;
        quantity: number;
        price: number;
        name: string;
        servingDate?: string;
      }> = [];

      Object.entries(menuSelections).forEach(([nightIndexStr, nightSelections]) => {
        const nightIndex = parseInt(nightIndexStr);
        const checkIn = new Date(tent.checkInDate);
        const servingDate = addDays(checkIn, nightIndex);

        Object.entries(nightSelections).forEach(([menuItemId, selection]) => {
          if (selection.quantity > 0) {
            menuProducts.push({
              id: menuItemId,
              quantity: selection.quantity,
              price: selection.price,
              name: selection.name,
              servingDate: format(servingDate, 'yyyy-MM-dd'),
            });
          }
        });
      });

      const response = await fetch(`/api/glamping/bookings/code/${bookingCode}/tents/${tent.id}/menu-products`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuProducts }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Cannot update menu');
      }

      toast.success('Menu updated successfully!', {
        description: `New total: ${formatCurrency(result.updated_total_amount)}`,
      });

      setEditingTentId(null);
      setMenuSelections({});
      setAvailableMenuItems([]);
      onMenuUpdated();
    } catch (error: any) {
      toast.error(error.message || 'Error updating menu');
    } finally {
      setSaving(false);
    }
  };

  // Calculate menu products total for a tent
  const calculateMenuTotal = (menuProducts: TentMenuProduct[]): number => {
    return menuProducts.reduce((sum, mp) => sum + mp.totalPrice, 0);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">
        Chi tiết lưu trú ({tents.length} {tents.length === 1 ? 'lều' : 'lều'})
      </h2>

      {tents.map((tent) => {
        const isMenuExpanded = expandedMenuItems.has(tent.id);
        const hasMenuProducts = tent.menuProducts && tent.menuProducts.length > 0;
        const isEditing = editingTentId === tent.id;
        const menuTotal = calculateMenuTotal(tent.menuProducts);

        return (
          <Card key={tent.id} className="overflow-hidden">
            <CardContent className="p-4">
              {/* Summary View */}
              <div className="flex gap-4">
                {/* Item Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">
                        {getLocalizedString(tent.itemName, locale)}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {getLocalizedString(tent.zoneName, locale)}
                      </p>
                    </div>
                  </div>

                  {/* Dates Info - Read Only */}
                  <div className="flex flex-wrap gap-2 mb-2 text-sm">
                    <Badge variant="secondary">
                      {formatDate(tent.checkInDate)} - {formatDate(tent.checkOutDate)}
                    </Badge>
                    <Badge variant="secondary">
                      {tent.nights} {tent.nights === 1 ? 'đêm' : 'đêm'}
                    </Badge>
                  </div>

                  {/* Parameters - Only show visibility = 'everyone' */}
                  {tent.parameters && tent.parameters.length > 0 && (
                    <div className="mb-2">
                      <div className="flex flex-wrap gap-2">
                        {tent.parameters
                          .filter((param) => param.visibility === 'everyone')
                          .map((param) => (
                            <Badge
                              key={param.id}
                              variant="outline"
                              style={{
                                borderColor: param.colorCode || undefined,
                                color: param.colorCode || undefined,
                              }}
                            >
                              {param.label}: {param.bookedQuantity}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Menu Products Section */}
                  {!isEditing && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => toggleMenuExpansion(tent.id)}
                          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {isMenuExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          <span>
                            Món ăn & đồ uống
                            {hasMenuProducts && (
                              <span className="ml-1 text-blue-600">
                                ({formatCurrency(menuTotal)})
                              </span>
                            )}
                          </span>
                        </button>

                        {canEditMenu && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(tent)}
                            disabled={loading}
                          >
                            {loading && editingTentId === null ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Edit2 className="h-4 w-4 mr-1" />
                            )}
                            Chỉnh sửa
                          </Button>
                        )}
                      </div>

                      {isMenuExpanded && hasMenuProducts && (
                        <div className="mt-2 pl-5 space-y-2">
                          {/* Group by serving date if available */}
                          {(() => {
                            // Group menu products by serving date
                            const byDate = new Map<string, TentMenuProduct[]>();
                            tent.menuProducts.forEach((mp) => {
                              const key = mp.servingDate || 'general';
                              if (!byDate.has(key)) byDate.set(key, []);
                              byDate.get(key)!.push(mp);
                            });

                            // If all have same key or no serving_date, show flat list
                            if (byDate.size <= 1 && !tent.menuProducts.some(mp => mp.servingDate)) {
                              return tent.menuProducts.map((mp) => (
                                <div key={mp.id} className="flex justify-between text-sm text-muted-foreground">
                                  <span>
                                    {getLocalizedString(mp.name, locale)} x {mp.quantity}
                                  </span>
                                  <span>{formatCurrency(mp.totalPrice)}</span>
                                </div>
                              ));
                            }

                            // Show grouped by date
                            return Array.from(byDate.entries()).map(([dateKey, products]) => {
                              const dateLabel = dateKey === 'general'
                                ? 'Chung'
                                : format(new Date(dateKey), 'dd/MM/yyyy');

                              return (
                                <div key={dateKey} className="border-l-2 border-blue-200 pl-3 mb-2">
                                  <div className="font-medium text-sm text-blue-700 mb-1">
                                    {dateLabel}
                                  </div>
                                  {products.map((mp) => (
                                    <div key={mp.id} className="flex justify-between text-sm text-muted-foreground">
                                      <span>
                                        {getLocalizedString(mp.name, locale)} x {mp.quantity}
                                      </span>
                                      <span>{formatCurrency(mp.totalPrice)}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}

                      {isMenuExpanded && !hasMenuProducts && (
                        <p className="mt-2 pl-5 text-sm text-gray-500">
                          Chưa chọn món ăn
                        </p>
                      )}
                    </div>
                  )}

                  {/* Subtotal for this tent */}
                  {!isEditing && (
                    <div className="flex justify-between items-center pt-3 border-t mt-3">
                      <span className="text-sm text-muted-foreground">Giá lều này:</span>
                      <span className="text-lg font-semibold text-blue-600">
                        {formatCurrency(tent.subtotal + menuTotal)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Inline Edit Form - Collapsible */}
              <Collapsible open={isEditing}>
                <CollapsibleContent>
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <h4 className="font-semibold mb-4">Chỉnh sửa món ăn & đồ uống</h4>

                    <GlampingMenuProductsSelector
                      menuProducts={availableMenuItems}
                      nightlySelections={menuSelections}
                      onChange={setMenuSelections}
                      nights={tent.nights}
                      checkInDate={new Date(tent.checkInDate)}
                      totalCountedGuests={
                        tent.parameters
                          ?.filter(p => p.countedForMenu)
                          .reduce((sum, p) => sum + (p.bookedQuantity || 0), 0) ||
                        tent.parameters?.reduce((sum, p) => sum + (p.bookedQuantity || 0), 0) || 0
                      }
                      locale={locale}
                    />

                    <div className="flex gap-4 mt-6">
                      <Button onClick={() => handleSaveMenu(tent)} disabled={saving}>
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Đang lưu...
                          </>
                        ) : (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Lưu thay đổi
                          </>
                        )}
                      </Button>
                      <Button variant="outline" onClick={handleCancelEdit} disabled={saving}>
                        <X className="mr-2 h-4 w-4" />
                        Hủy
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
