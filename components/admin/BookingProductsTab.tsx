'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  Package,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getLocalizedText, type Locale, type MultilingualText } from '@/lib/i18n-utils';
import { toast } from 'react-hot-toast';
import { AddProductDialog } from '@/components/admin/AddProductDialog';
import { EditProductDialog } from '@/components/admin/EditProductDialog';
import { CancelProductDialog } from '@/components/admin/CancelProductDialog';

interface BookingProduct {
  id: string;
  campsiteProductId: string;
  productName: string;
  productCategory: string | null;
  quantity: number;
  unitPrice: number;
  originalUnitPrice: number;
  taxRate: number;
  taxAmount: number;
  totalPrice: number;
  notes: string | null;
  addedAt: string;
  status: 'active' | 'cancelled';
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancelledByName: string | null;
  cancellationReason: string | null;
  discount: {
    id: string;
    name: string;
    code: string | null;
    category: string;
    type: string;
    value: number;
    amount: number;
  } | null;
  productUnit: MultilingualText | null;
}

interface BookingProductsTabProps {
  booking: {
    id: string;
    campsite: {
      id: string;
      slug: string;
      name: MultilingualText | string;
    };
    status: string;
    paymentStatus: string;
  };
  locale?: Locale;
  onRefresh: () => void;
  isUpdating?: boolean;
}

export function BookingProductsTab({
  booking,
  locale = 'vi',
  onRefresh,
  isUpdating = false,
}: BookingProductsTabProps) {
  const [products, setProducts] = useState<BookingProduct[]>([]);
  const [canModify, setCanModify] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<BookingProduct | null>(null);

  const texts = {
    vi: {
      title: 'Sản phẩm đã đặt',
      addProduct: 'Thêm sản phẩm',
      noProducts: 'Chưa có sản phẩm nào',
      productName: 'Tên sản phẩm',
      quantity: 'Số lượng',
      unitPrice: 'Đơn giá',
      discount: 'Giảm giá',
      total: 'Thành tiền',
      status: 'Trạng thái',
      actions: 'Thao tác',
      active: 'Hoạt động',
      cancelled: 'Đã huỷ',
      edit: 'Sửa',
      cancel: 'Huỷ',
      cannotModify: 'Không thể thay đổi sản phẩm cho booking này',
      cancelReason: 'Lý do huỷ',
      loadError: 'Không thể tải danh sách sản phẩm',
      unit: 'Đơn vị',
    },
    en: {
      title: 'Booked Products',
      addProduct: 'Add Product',
      noProducts: 'No products yet',
      productName: 'Product Name',
      quantity: 'Quantity',
      unitPrice: 'Unit Price',
      discount: 'Discount',
      total: 'Total',
      status: 'Status',
      actions: 'Actions',
      active: 'Active',
      cancelled: 'Cancelled',
      edit: 'Edit',
      cancel: 'Cancel',
      cannotModify: 'Cannot modify products for this booking',
      cancelReason: 'Cancellation reason',
      loadError: 'Failed to load products',
      unit: 'Unit',
    },
  };

  const t = texts[locale];

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/bookings/${booking.id}/products`);
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        const data = await response.json();
        setProducts(data.products || []);
        setCanModify(data.canModify || false);
      } catch (error) {
        console.error('Error fetching products:', error);
        toast.error(t.loadError);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [booking.id, t.loadError]);

  const handleAddProduct = async (campsiteProductId: string, quantity: number) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/bookings/${booking.id}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campsiteProductId, quantity }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add product');
      }

      const result = await response.json();
      toast.success(locale === 'vi' ? 'Đã thêm sản phẩm' : 'Product added');
      setShowAddDialog(false);

      // Refresh products list
      const productsResponse = await fetch(`/api/admin/bookings/${booking.id}/products`);
      const productsData = await productsResponse.json();
      setProducts(productsData.products || []);

      // Refresh parent to update totals
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditProduct = async (productId: string, quantity: number) => {
    setActionLoading(true);
    try {
      const response = await fetch(
        `/api/admin/bookings/${booking.id}/products/${productId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update product');
      }

      toast.success(locale === 'vi' ? 'Đã cập nhật số lượng' : 'Quantity updated');
      setShowEditDialog(false);
      setSelectedProduct(null);

      // Refresh products list
      const productsResponse = await fetch(`/api/admin/bookings/${booking.id}/products`);
      const productsData = await productsResponse.json();
      setProducts(productsData.products || []);

      // Refresh parent to update totals
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelProduct = async (productId: string, reason: string) => {
    setActionLoading(true);
    try {
      const response = await fetch(
        `/api/admin/bookings/${booking.id}/products/${productId}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel product');
      }

      toast.success(locale === 'vi' ? 'Đã huỷ sản phẩm' : 'Product cancelled');
      setShowCancelDialog(false);
      setSelectedProduct(null);

      // Refresh products list
      const productsResponse = await fetch(`/api/admin/bookings/${booking.id}/products`);
      const productsData = await productsResponse.json();
      setProducts(productsData.products || []);

      // Refresh parent to update totals
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openEditDialog = (product: BookingProduct) => {
    setSelectedProduct(product);
    setShowEditDialog(true);
  };

  const openCancelDialog = (product: BookingProduct) => {
    setSelectedProduct(product);
    setShowCancelDialog(true);
  };

  // Calculate totals for active products
  const activeProducts = products.filter(p => p.status === 'active');
  // Calculate subtotal (before tax) for active products
  const totalAmount = activeProducts.reduce((sum, p) => sum + (p.unitPrice * p.quantity), 0);

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
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Package className="h-5 w-5" />
          {t.title}
        </h3>
        {canModify ? (
          <Button
            size="sm"
            onClick={() => setShowAddDialog(true)}
            disabled={isUpdating || actionLoading}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t.addProduct}
          </Button>
        ) : (
          <Badge variant="secondary" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {t.cannotModify}
          </Badge>
        )}
      </div>

      {/* Products Table */}
      {products.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
          <p>{t.noProducts}</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.productName}</TableHead>
                <TableHead className="text-center">{t.quantity}</TableHead>
                <TableHead className="text-right">{t.unitPrice}</TableHead>
                <TableHead className="text-right">{t.discount}</TableHead>
                <TableHead className="text-right">{t.total}</TableHead>
                {canModify && <TableHead className="text-right">{t.actions}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => {
                const isCancelled = product.status === 'cancelled';
                const unit = product.productUnit
                  ? getLocalizedText(product.productUnit, locale)
                  : '';

                return (
                  <TableRow
                    key={product.id}
                    className={isCancelled ? 'bg-gray-50 opacity-60' : ''}
                  >
                    <TableCell>
                      <div className={isCancelled ? 'line-through text-gray-400' : ''}>
                        <span className="font-medium">{product.productName}</span>
                        {unit && (
                          <span className="text-sm text-gray-500 ml-1">({unit})</span>
                        )}
                        {product.productCategory && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {product.productCategory}
                          </Badge>
                        )}
                        {isCancelled && (
                          <Badge variant="destructive" className="ml-2 text-xs">
                            {t.cancelled}
                          </Badge>
                        )}
                      </div>
                      {isCancelled && product.cancellationReason && (
                        <div className="text-xs text-red-600 mt-1">
                          {t.cancelReason}: {product.cancellationReason}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={isCancelled ? 'line-through' : ''}>
                        {product.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={isCancelled ? 'line-through' : ''}>
                        {formatCurrency(product.originalUnitPrice)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {product.discount && product.discount.amount > 0 ? (
                        <span className="text-green-600">
                          -{formatCurrency(product.discount.amount * product.quantity)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={isCancelled ? 'line-through text-gray-400' : 'font-medium'}>
                        {formatCurrency(product.unitPrice * product.quantity)}
                      </span>
                    </TableCell>
                    {canModify && (
                      <TableCell className="text-right">
                        {!isCancelled && (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(product)}
                              disabled={actionLoading}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openCancelDialog(product)}
                              disabled={actionLoading}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Total (before tax) */}
      {activeProducts.length > 0 && (
        <div className="flex justify-end">
          <div className="bg-gray-50 px-4 py-2 rounded-lg">
            <span className="text-gray-600">
              {locale === 'vi' ? 'Tổng sản phẩm (chưa thuế):' : 'Products Total (before tax):'}
            </span>
            <span className="font-bold ml-2">{formatCurrency(totalAmount)}</span>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <AddProductDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onConfirm={handleAddProduct}
        campsiteSlug={booking.campsite.slug}
        locale={locale}
        isLoading={actionLoading}
      />

      {selectedProduct && (
        <>
          <EditProductDialog
            isOpen={showEditDialog}
            onClose={() => {
              setShowEditDialog(false);
              setSelectedProduct(null);
            }}
            onConfirm={(quantity) => handleEditProduct(selectedProduct.id, quantity)}
            product={selectedProduct}
            locale={locale}
            isLoading={actionLoading}
          />

          <CancelProductDialog
            isOpen={showCancelDialog}
            onClose={() => {
              setShowCancelDialog(false);
              setSelectedProduct(null);
            }}
            onConfirm={(reason) => handleCancelProduct(selectedProduct.id, reason)}
            product={selectedProduct}
            paymentStatus={booking.paymentStatus}
            locale={locale}
            isLoading={actionLoading}
          />
        </>
      )}
    </div>
  );
}
