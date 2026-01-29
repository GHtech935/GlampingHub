'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Utensils,
  ShoppingBasket,
  Tag,
  CalendarDays,
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { type Locale } from '@/lib/i18n-utils';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import { ItemBadge, useItemColor } from './shared';

// Helper to safely extract string from potentially JSONB fields
const safeString = (value: any, locale: string = 'vi'): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value[locale] || value.vi || value.en || '';
  }
  return String(value);
};

/** Format a date/timestamp string to dd/MM/yyyy using locale */
const formatDateStr = (value: string | null | undefined, locale: string = 'vi'): string => {
  if (!value) return '';
  // Take only the date part (handles both "2026-01-27" and "2026-01-27T17:00:00.000Z")
  const datePart = value.substring(0, 10);
  const d = new Date(datePart + 'T12:00:00'); // noon avoids timezone shifts
  if (isNaN(d.getTime())) return value; // fallback to raw string
  return d.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
};

interface BookedProduct {
  id: string;
  menuItemId: string;
  bookingTentId: string | null; // null means shared/booking-level product
  productName: string;
  productDescription: string;
  productCategory: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productUnit: string | null;
  imageUrl: string | null;
  notes: string | null;
  createdAt: string;
  /** Per-product voucher discount */
  voucherCode: string | null;
  discountAmount: number;
  /** Per-night serving date (null = legacy aggregated or shared product) */
  servingDate: string | null;
  /** Tent info for grouping label */
  tentItemName: string | null;
  tentCheckIn: string | null;
  tentCheckOut: string | null;
  tentDisplayOrder: number | null;
}

interface GlampingBookingProductsTabProps {
  booking: {
    id: string;
    status: string;
    paymentStatus: string;
    items?: Array<{
      id: string;
      itemName: string;
      parameterName?: string;
    }>;
  };
  zoneId?: string;
  locale?: Locale;
  onRefresh: () => void;
  isUpdating?: boolean;
}

export function GlampingBookingProductsTab({
  booking,
  locale = 'vi',
  onRefresh,
  isUpdating = false,
}: GlampingBookingProductsTabProps) {
  const [products, setProducts] = useState<BookedProduct[]>([]);
  const [productsTotal, setProductsTotal] = useState(0);
  const [itemName, setItemName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const texts = {
    vi: {
      title: 'Sản phẩm đã đặt',
      subtitle: 'Sản phẩm được nhóm theo từng lều/phòng',
      noProducts: 'Khách chưa đặt thêm sản phẩm nào',
      productName: 'Tên sản phẩm',
      category: 'Danh mục',
      qty: 'SL',
      unitPrice: 'Đơn giá',
      total: 'Thành tiền',
      loadError: 'Không thể tải danh sách sản phẩm',
      itemProducts: 'Sản phẩm của item',
      productsTotal: 'Tổng cộng',
      notes: 'Ghi chú',
      subtotal: 'Tổng phụ',
      grandTotal: 'Tổng',
    },
    en: {
      title: 'Ordered Products',
      subtitle: 'Products grouped by tent/room',
      noProducts: 'No products ordered yet',
      productName: 'Product Name',
      category: 'Category',
      qty: 'Qty',
      unitPrice: 'Unit Price',
      total: 'Total',
      loadError: 'Failed to load products',
      itemProducts: 'Item Products',
      productsTotal: 'Total',
      notes: 'Notes',
      subtotal: 'Subtotal',
      grandTotal: 'Total',
    },
  };

  const t = texts[locale];

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/glamping/bookings/${booking.id}/products`);
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        const data = await response.json();
        setProducts(data.products || []);
        setProductsTotal(data.productsTotal || 0);
        setItemName(data.itemName || '');
      } catch (error) {
        console.error('Error fetching products:', error);
        toast.error(t.loadError);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [booking.id, t.loadError]);

  // Get item color context (will use default if outside provider)
  let getColorForItem: (index: number) => any;

  try {
    const colorContext = useItemColor();
    getColorForItem = colorContext.getColorForItem;
  } catch {
    // Fallback if not inside ItemColorProvider
    const defaultColor = { bg: 'bg-gray-50', border: 'border-l-gray-500', text: 'text-gray-700', dot: 'bg-gray-500' };
    getColorForItem = () => defaultColor;
  }

  // Group products by booking_tent_id
  const tentProducts = products.reduce((acc, product) => {
    const groupKey = product.bookingTentId;
    if (groupKey) {
      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(product);
    }
    return acc;
  }, {} as Record<string, BookedProduct[]>);

  // Get tent label from the first product in a tent group (all share the same tent info)
  const getTentLabel = (tentProductList: BookedProduct[]) => {
    const first = tentProductList[0];
    if (!first) return { name: locale === 'vi' ? 'Lều không xác định' : 'Unknown Tent', dates: '', index: 0 };
    const name = first.tentItemName || (locale === 'vi' ? 'Lều không xác định' : 'Unknown Tent');
    const dates = first.tentCheckIn && first.tentCheckOut
      ? `${formatDateStr(first.tentCheckIn, locale)} → ${formatDateStr(first.tentCheckOut, locale)}`
      : '';
    return { name, dates, index: first.tentDisplayOrder ?? 0 };
  };

  // Render products table
  const renderProductsTable = (productList: BookedProduct[]) => (
    <div className="border rounded-lg overflow-hidden bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>{t.productName}</TableHead>
            <TableHead className="text-center w-[60px]">{t.qty}</TableHead>
            <TableHead className="text-right w-[120px]">{t.unitPrice}</TableHead>
            <TableHead className="text-right w-[130px]">{t.total}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {productList.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                {product.imageUrl ? (
                  <div className="relative w-10 h-10 rounded overflow-hidden">
                    <Image
                      src={product.imageUrl}
                      alt={safeString(product.productName, locale) || 'Product'}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                    <Utensils className="h-5 w-5 text-gray-400" />
                  </div>
                )}
              </TableCell>
              <TableCell>
                <div>
                  <span className="font-medium">{safeString(product.productName, locale)}</span>
                  {product.productDescription && (
                    <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">
                      {safeString(product.productDescription, locale)}
                    </p>
                  )}
                  {product.notes && (
                    <p className="text-xs text-gray-400 mt-1 italic">
                      {t.notes}: {safeString(product.notes, locale)}
                    </p>
                  )}
                  {/* Per-product voucher badge */}
                  {product.voucherCode && product.discountAmount > 0 && (
                    <div className="mt-1 flex items-center gap-1">
                      <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 text-xs px-1.5 py-0">
                        <Tag className="h-3 w-3 mr-0.5" />
                        {product.voucherCode}
                      </Badge>
                      <span className="text-xs text-green-600 font-medium">
                        -{formatCurrency(product.discountAmount)}
                      </span>
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center font-medium">
                {product.quantity}
              </TableCell>
              <TableCell className="text-right">
                <span className="text-gray-600">
                  {formatCurrency(product.unitPrice)}
                </span>
                {product.productUnit && (
                  <span className="text-gray-400 text-xs">
                    /{safeString(product.productUnit, locale)}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <span className="font-medium text-primary">
                  {formatCurrency(product.totalPrice)}
                </span>
                {product.discountAmount > 0 && (
                  <div className="text-xs text-green-600">
                    -{formatCurrency(product.discountAmount)}
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <ShoppingBasket className="h-5 w-5" />
            {t.title}
          </h3>
          <p className="text-sm text-gray-500 mt-1">{t.subtitle}</p>
        </div>
      </div>

      {/* Products List */}
      {products.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          <Utensils className="h-12 w-12 mx-auto mb-2 text-gray-300" />
          <p>{t.noProducts}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Per-Tent Products */}
          {Object.entries(tentProducts).map(([tentId, tentProductList]) => {
            const tentLabel = getTentLabel(tentProductList);
            const colorScheme = getColorForItem(tentLabel.index);
            const subtotal = tentProductList.reduce((sum, p) => sum + p.totalPrice - (p.discountAmount || 0), 0);

            // Check if any products have servingDate (per-night data)
            const hasServingDates = tentProductList.some(p => p.servingDate);

            // Group by servingDate if per-night data exists
            const dateGroups: Record<string, BookedProduct[]> = {};
            if (hasServingDates) {
              tentProductList.forEach(p => {
                const key = p.servingDate || '_no_date';
                if (!dateGroups[key]) dateGroups[key] = [];
                dateGroups[key].push(p);
              });
            }

            return (
              <div
                key={tentId}
                className={cn(
                  'border rounded-lg overflow-hidden',
                  colorScheme.bg,
                  colorScheme.border,
                  'border-l-4'
                )}
              >
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <ItemBadge
                      itemIndex={tentLabel.index}
                      colorScheme={colorScheme}
                      size="md"
                      label={`${locale === 'vi' ? 'Lều' : 'Tent'} ${tentLabel.index + 1}`}
                    />
                    <div>
                      <p className="font-semibold">{tentLabel.name}</p>
                      {tentLabel.dates && (
                        <p className="text-sm text-gray-600">{tentLabel.dates}</p>
                      )}
                    </div>
                  </div>

                  {hasServingDates ? (
                    // Per-night grouped display
                    <div className="space-y-3">
                      {Object.entries(dateGroups)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([dateKey, dateProducts]) => {
                          const dateLabel = dateKey === '_no_date'
                            ? (locale === 'vi' ? 'Không xác định ngày' : 'No date')
                            : formatDateStr(dateKey, locale);

                          return (
                            <div key={dateKey}>
                              <div className="flex items-center gap-1.5 mb-1.5 px-1">
                                <CalendarDays className="h-3.5 w-3.5 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700">{dateLabel}</span>
                              </div>
                              {renderProductsTable(dateProducts)}
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    // Legacy display (no per-night data)
                    renderProductsTable(tentProductList)
                  )}

                  {/* Subtotal */}
                  <div className="flex justify-end mt-2">
                    <div className={cn('px-3 py-1.5 rounded', colorScheme.bg)}>
                      <span className="text-sm text-gray-700">{t.subtotal}:</span>
                      <span className={cn('font-semibold ml-2', colorScheme.text)}>
                        {formatCurrency(subtotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Grand Total */}
          {/* Grand total only when multiple groups */}
          {productsTotal > 0 && Object.keys(tentProducts).length > 1 && (() => {
            const totalAfterDiscounts = products.reduce((sum, p) => sum + p.totalPrice - (p.discountAmount || 0), 0);
            return (
              <div className="flex justify-end">
                <div className="bg-primary/10 border-2 border-primary rounded-lg px-6 py-3">
                  <span className="text-gray-700 font-medium">{t.grandTotal}:</span>
                  <span className="font-bold text-primary ml-2 text-lg">{formatCurrency(totalAfterDiscounts)}</span>
                </div>
              </div>
            );
          })()}

        </div>
      )}
    </div>
  );
}
