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
  Package,
  Utensils,
  AlertCircle,
  ShoppingBasket,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { type Locale } from '@/lib/i18n-utils';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

// Helper to safely extract string from potentially JSONB fields
const safeString = (value: any, locale: string = 'vi'): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value[locale] || value.vi || value.en || '';
  }
  return String(value);
};

interface BookedProduct {
  id: string;
  menuItemId: string;
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
}

interface GlampingBookingProductsTabProps {
  booking: {
    id: string;
    status: string;
    paymentStatus: string;
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
      subtitle: 'Các sản phẩm/dịch vụ khách đã đặt trong booking này',
      noProducts: 'Khách chưa đặt thêm sản phẩm nào',
      productName: 'Tên sản phẩm',
      category: 'Danh mục',
      qty: 'SL',
      unitPrice: 'Đơn giá',
      total: 'Thành tiền',
      loadError: 'Không thể tải danh sách sản phẩm',
      itemProducts: 'Sản phẩm của item',
      productsTotal: 'Tổng sản phẩm',
      notes: 'Ghi chú',
    },
    en: {
      title: 'Ordered Products',
      subtitle: 'Products/services ordered with this booking',
      noProducts: 'No products ordered yet',
      productName: 'Product Name',
      category: 'Category',
      qty: 'Qty',
      unitPrice: 'Unit Price',
      total: 'Total',
      loadError: 'Failed to load products',
      itemProducts: 'Item Products',
      productsTotal: 'Products Total',
      notes: 'Notes',
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

  // Group products by category (ensure category is a string)
  const groupedProducts = products.reduce((acc, product) => {
    const category = safeString(product.productCategory, locale) || (locale === 'vi' ? 'Khác' : 'Other');
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(product);
    return acc;
  }, {} as Record<string, BookedProduct[]>);

  // Ensure itemName is a string
  const displayItemName = safeString(itemName, locale);

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
        {displayItemName && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Package className="h-3 w-3" />
            {displayItemName}
          </Badge>
        )}
      </div>

      {/* Products List */}
      {products.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          <Utensils className="h-12 w-12 mx-auto mb-2 text-gray-300" />
          <p>{t.noProducts}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedProducts).map(([categoryName, categoryProducts]) => (
            <div key={categoryName}>
              <h4 className="font-medium text-gray-700 mb-3 text-sm uppercase tracking-wide flex items-center gap-2">
                {categoryName}
                <Badge variant="secondary" className="text-xs font-normal">
                  {categoryProducts.reduce((sum, p) => sum + p.quantity, 0)} {locale === 'vi' ? 'sp' : 'items'}
                </Badge>
              </h4>
              <div className="border rounded-lg overflow-hidden">
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
                    {categoryProducts.map((product) => (
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
                        <TableCell className="text-right font-medium text-primary">
                          {formatCurrency(product.totalPrice)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}

          {/* Total Summary */}
          {productsTotal > 0 && (
            <div className="flex justify-end">
              <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-2">
                <span className="text-gray-700">{t.productsTotal}:</span>
                <span className="font-bold text-primary ml-2">{formatCurrency(productsTotal)}</span>
              </div>
            </div>
          )}

          {/* Info Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              {locale === 'vi'
                ? 'Danh sách sản phẩm khách hàng đã chọn khi đặt phòng. Giá được tính vào tổng hóa đơn.'
                : 'Products selected by the customer during booking. Prices are included in the total invoice.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
