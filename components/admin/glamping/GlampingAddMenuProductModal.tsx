"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Plus, Minus, Tent } from "lucide-react";
import { toast } from "react-hot-toast";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import type { Locale } from "@/lib/i18n-utils";
import VoucherInput, { type AppliedVoucher } from "@/components/booking/VoucherInput";

interface TentItem {
  id: string;
  itemId: string;
  itemName: string;
  checkInDate: string;
  checkOutDate: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  unit: string | null;
  imageUrl: string | null;
  maxQuantity: number | null;
  categoryId: string | null;
  categoryName: string | null;
}

interface TentWithMenuItems {
  tentId: string;
  tentName: string;
  itemId: string;
  checkInDate: string;
  checkOutDate: string;
  menuItems: MenuItem[];
}

interface GlampingAddMenuProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  bookingId: string;
  tents: TentItem[];
  locale?: Locale;
}

const texts = {
  vi: {
    title: 'Thêm sản phẩm',
    searchProduct: 'Tìm sản phẩm...',
    noProductsFound: 'Không tìm thấy sản phẩm',
    quantity: 'Số lượng',
    unitPrice: 'Đơn giá',
    servingDate: 'Ngày phục vụ',
    voucher: 'Voucher',
    summary: 'Tổng tiền',
    product: 'Sản phẩm',
    discount: 'Giảm giá',
    total: 'Tổng cộng',
    cancel: 'Huỷ',
    add: 'Thêm sản phẩm',
    adding: 'Đang thêm...',
    addSuccess: 'Đã thêm sản phẩm thành công',
    addFailed: 'Không thể thêm sản phẩm',
    selectProductFirst: 'Vui lòng chọn sản phẩm',
    loading: 'Đang tải...',
    noTents: 'Chưa có lều nào trong booking',
  },
  en: {
    title: 'Add Product',
    searchProduct: 'Search products...',
    noProductsFound: 'No products found',
    quantity: 'Quantity',
    unitPrice: 'Unit Price',
    servingDate: 'Serving Date',
    voucher: 'Voucher',
    summary: 'Summary',
    product: 'Product',
    discount: 'Discount',
    total: 'Total',
    cancel: 'Cancel',
    add: 'Add Product',
    adding: 'Adding...',
    addSuccess: 'Product added successfully',
    addFailed: 'Failed to add product',
    selectProductFirst: 'Please select a product',
    loading: 'Loading...',
    noTents: 'No tents in this booking',
  },
};

export function GlampingAddMenuProductModal({
  isOpen,
  onClose,
  onSave,
  bookingId,
  tents,
  locale = 'vi',
}: GlampingAddMenuProductModalProps) {
  const t = texts[locale];

  // Form state
  const [selectedTentId, setSelectedTentId] = useState<string>('');
  const [tentsWithMenuItems, setTentsWithMenuItems] = useState<TentWithMenuItems[]>([]);
  const [loadingMenuItems, setLoadingMenuItems] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [servingDate, setServingDate] = useState('');
  const [voucher, setVoucher] = useState<{
    code: string;
    id: string;
    discountAmount: number;
    discountType: string;
    discountValue: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedTentId('');
      setTentsWithMenuItems([]);
      setSearchQuery('');
      setSelectedProduct(null);
      setQuantity(1);
      setServingDate('');
      setVoucher(null);
    }
  }, [isOpen]);

  // Fetch all menu items for all tents when modal opens
  useEffect(() => {
    if (!isOpen || tents.length === 0) {
      setTentsWithMenuItems([]);
      return;
    }

    const fetchAllMenuItems = async () => {
      setLoadingMenuItems(true);
      try {
        const response = await fetch(
          `/api/admin/glamping/bookings/${bookingId}/available-menu-items?locale=${locale}`
        );
        if (!response.ok) throw new Error('Failed to fetch menu items');

        const data = await response.json();
        // Map API response to our tents with additional info
        const tentsData: TentWithMenuItems[] = (data.tents || []).map((t: any) => {
          const tentInfo = tents.find(tent => tent.id === t.tentId);
          return {
            tentId: t.tentId,
            tentName: t.tentName || tentInfo?.itemName || '',
            itemId: t.itemId || tentInfo?.itemId || '',
            checkInDate: tentInfo?.checkInDate || '',
            checkOutDate: tentInfo?.checkOutDate || '',
            menuItems: t.menuItems || [],
          };
        });
        setTentsWithMenuItems(tentsData);
      } catch (error) {
        console.error('Error fetching menu items:', error);
        toast.error(locale === 'vi' ? 'Không thể tải danh sách sản phẩm' : 'Failed to load products');
      } finally {
        setLoadingMenuItems(false);
      }
    };

    fetchAllMenuItems();
  }, [isOpen, bookingId, locale, tents]);

  // Set default serving date when tent is selected
  useEffect(() => {
    if (selectedTentId) {
      const tentData = tentsWithMenuItems.find(t => t.tentId === selectedTentId);
      if (tentData?.checkInDate) {
        setServingDate(tentData.checkInDate.substring(0, 10));
      }
    }
  }, [selectedTentId, tentsWithMenuItems]);

  // Filter tents with menu items by search query
  const filteredTentsWithMenuItems = useMemo(() => {
    if (!searchQuery.trim()) return tentsWithMenuItems;
    const query = searchQuery.toLowerCase();
    return tentsWithMenuItems.map(tent => ({
      ...tent,
      menuItems: tent.menuItems.filter(item =>
        item.name.toLowerCase().includes(query) ||
        (item.categoryName && item.categoryName.toLowerCase().includes(query))
      ),
    })).filter(tent => tent.menuItems.length > 0);
  }, [tentsWithMenuItems, searchQuery]);

  // Group menu items by category within each tent
  const getGroupedMenuItems = (menuItems: MenuItem[]) => {
    const groups: Record<string, MenuItem[]> = {};
    menuItems.forEach(item => {
      const category = item.categoryName || (locale === 'vi' ? 'Khác' : 'Other');
      if (!groups[category]) groups[category] = [];
      groups[category].push(item);
    });
    return groups;
  };

  // Handle product selection - also set the tent
  const handleSelectProduct = (product: MenuItem, tentId: string) => {
    setSelectedProduct(product);
    setSelectedTentId(tentId);
  };

  // Calculate total
  const productTotal = selectedProduct ? selectedProduct.price * quantity : 0;
  const discountAmount = voucher?.discountAmount || 0;
  const finalTotal = Math.max(0, productTotal - discountAmount);

  const handleVoucherApplied = (v: AppliedVoucher) => {
    setVoucher({
      code: v.code,
      id: v.id,
      discountAmount: v.discountAmount,
      discountType: v.discountType,
      discountValue: v.discountValue,
    });
  };

  const handleVoucherRemoved = () => {
    setVoucher(null);
  };

  const handleSubmit = async () => {
    if (!selectedProduct || !selectedTentId) {
      toast.error(t.selectProductFirst);
      return;
    }

    setSubmitting(true);
    try {
      // Use the menu-products endpoint to add the product
      const response = await fetch(
        `/api/glamping/bookings/${bookingId}/tents/${selectedTentId}/menu-products`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            menuProducts: [{
              id: selectedProduct.id,
              quantity,
              price: selectedProduct.price,
              servingDate: servingDate || null,
            }],
          }),
        }
      );

      // If the PUT doesn't work (requires all products), use an alternative approach
      if (!response.ok) {
        // Try using admin endpoint to add single product
        const addResponse = await fetch(
          `/api/admin/glamping/bookings/${bookingId}/menu-products`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bookingTentId: selectedTentId,
              menuItemId: selectedProduct.id,
              quantity,
              unitPrice: selectedProduct.price,
              servingDate: servingDate || null,
              voucherCode: voucher?.code || null,
            }),
          }
        );

        if (!addResponse.ok) {
          const errorData = await addResponse.json();
          throw new Error(errorData.error || 'Failed to add product');
        }
      }

      toast.success(t.addSuccess);
      onSave();
      onClose();
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error(error instanceof Error ? error.message : t.addFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {tents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t.noTents}
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t.searchProduct}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Product List grouped by Tents */}
              {loadingMenuItems ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-sm text-gray-500">{t.loading}</span>
                </div>
              ) : filteredTentsWithMenuItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  {t.noProductsFound}
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto border rounded-lg">
                  {filteredTentsWithMenuItems.map((tent, tentIndex) => {
                    const groupedItems = getGroupedMenuItems(tent.menuItems);
                    return (
                      <div key={tent.tentId}>
                        {/* Tent Header */}
                        <div className="px-3 py-2 bg-blue-50 border-b border-blue-100 sticky top-0 z-10">
                          <div className="flex items-center gap-2">
                            <Tent className="h-4 w-4 text-blue-600" />
                            <span className="font-semibold text-sm text-blue-800">
                              {tents.length > 1 ? `${locale === 'vi' ? 'Lều' : 'Tent'} ${tentIndex + 1}: ` : ''}
                              {tent.tentName}
                            </span>
                            <span className="text-xs text-blue-600">
                              ({format(new Date(tent.checkInDate), 'dd/MM')} - {format(new Date(tent.checkOutDate), 'dd/MM')})
                            </span>
                          </div>
                        </div>

                        {/* Categories and Products for this tent */}
                        {Object.entries(groupedItems).map(([category, items]) => (
                          <div key={`${tent.tentId}-${category}`}>
                            <div className="px-3 py-1.5 bg-gray-50 text-xs font-medium text-gray-600 border-b">
                              {category}
                            </div>
                            {items.map((item) => {
                              const isSelected = selectedProduct?.id === item.id && selectedTentId === tent.tentId;
                              return (
                                <div
                                  key={`${tent.tentId}-${item.id}`}
                                  onClick={() => handleSelectProduct(item, tent.tentId)}
                                  className={`px-3 py-2 cursor-pointer hover:bg-blue-50 border-b last:border-b-0 flex items-center justify-between ${
                                    isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                                  }`}
                                >
                                  <div>
                                    <div className="font-medium text-sm text-gray-900">{item.name}</div>
                                    {item.description && (
                                      <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                                    )}
                                  </div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {formatCurrency(item.price)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Quantity & Details */}
              {selectedProduct && (
                <div className="space-y-4">

                  {/* Selected Product Display */}
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{selectedProduct.name}</div>
                        <div className="text-xs text-gray-500">{selectedProduct.categoryName}</div>
                      </div>
                      <Badge variant="secondary">{formatCurrency(selectedProduct.price)}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Quantity */}
                    <div>
                      <Label>{t.quantity}</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 w-9 p-0"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          disabled={quantity <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          min={1}
                          max={selectedProduct.maxQuantity || 99}
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="h-9 w-16 text-center"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 w-9 p-0"
                          onClick={() => setQuantity(quantity + 1)}
                          disabled={selectedProduct.maxQuantity ? quantity >= selectedProduct.maxQuantity : false}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Serving Date */}
                    <div>
                      <Label>{t.servingDate}</Label>
                      <Input
                        type="date"
                        value={servingDate}
                        onChange={(e) => setServingDate(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Voucher */}
                  <div>
                    <Label>{t.voucher}</Label>
                    <div className="mt-1">
                      <VoucherInput
                        totalAmount={productTotal}
                        locale={locale}
                        validationEndpoint="/api/glamping/validate-voucher"
                        applicationType="menu_only"
                        appliedVoucher={
                          voucher
                            ? {
                                id: voucher.id,
                                code: voucher.code,
                                name: '',
                                description: '',
                                discountType: voucher.discountType,
                                discountValue: voucher.discountValue,
                                discountAmount: voucher.discountAmount,
                                isStackable: false,
                              }
                            : null
                        }
                        onVoucherApplied={handleVoucherApplied}
                        onVoucherRemoved={handleVoucherRemoved}
                      />
                    </div>
                  </div>

                  {/* Summary */}
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-sm mb-3">{t.summary}</h4>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            {t.product} x {quantity}
                          </span>
                          <span className="font-medium">{formatCurrency(productTotal)}</span>
                        </div>
                        {voucher && discountAmount > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>{t.discount} ({voucher.code})</span>
                            <span>-{formatCurrency(discountAmount)}</span>
                          </div>
                        )}
                        <div className="border-t border-green-300 pt-2 mt-2 flex justify-between font-bold text-base">
                          <span>{t.total}</span>
                          <span className="text-green-700">{formatCurrency(finalTotal)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t.cancel}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !selectedProduct || !selectedTentId || tents.length === 0}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t.adding}
              </>
            ) : (
              t.add
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
