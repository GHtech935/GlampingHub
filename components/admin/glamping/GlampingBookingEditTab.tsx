"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "react-hot-toast";
import type { Locale } from "@/lib/i18n-utils";
import type { TentEditData, ProductEditData } from "./types";
import { GlampingEditTentModal } from "./GlampingEditTentModal";
import { GlampingEditMenuProductModal } from "./GlampingEditMenuProductModal";

interface TentItem {
  id: string;
  itemId: string;
  itemName: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  adults: number;
  children: number;
  totalGuests: number;
  subtotal: number;
  taxAmount: number;
  specialRequests?: string;
  voucherCode?: string | null;
  discountType?: string | null;
  discountValue?: number;
  discountAmount: number;
  parameters: Array<{
    parameterId: string;
    parameterName: string;
    quantity: number;
    unitPrice: number;
  }>;
}

interface MenuProductItem {
  id: string;
  menuItemId: string;
  productName: string;
  categoryName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxAmount: number;
  servingDate?: string | null;
  bookingTentId?: string | null;
  voucherCode?: string | null;
  discountAmount: number;
}

interface EditItemsData {
  tents: TentItem[];
  menuProducts: MenuProductItem[];
  totals: {
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    grandTotal: number;
  };
  taxEnabled: boolean;
  taxRate: number;
}

interface GlampingBookingEditTabProps {
  booking: {
    id: string;
    status: string;
    paymentStatus: string;
  };
  locale?: Locale;
  onRefresh: () => void;
  isUpdating?: boolean;
}

const texts = {
  vi: {
    loading: 'Đang tải...',
    noItems: 'Không có mục nào',
    tents: 'Lều / Phòng',
    menuProducts: 'Sản phẩm menu',
    item: 'Mục',
    qty: 'SL',
    date: 'Ngày',
    tax: 'Thuế',
    total: 'Thành tiền',
    actions: 'Thao tác',
    edit: 'Thay đổi',
    delete: 'Xoá',
    subtotal: 'Tạm tính',
    discount: 'Giảm giá',
    taxTotal: 'Thuế',
    grandTotal: 'Tổng cộng',
    confirmDeleteTitle: 'Xác nhận xoá',
    confirmDeleteTent: 'Bạn có chắc muốn xoá lều này? Tất cả sản phẩm menu liên quan cũng sẽ bị xoá.',
    confirmDeleteProduct: 'Bạn có chắc muốn xoá sản phẩm menu này?',
    cancel: 'Huỷ',
    confirm: 'Xoá',
    deleteSuccess: 'Đã xoá thành công',
    deleteFailed: 'Không thể xoá',
    guests: 'khách',
    nights: 'đêm',
    voucher: 'Voucher',
  },
  en: {
    loading: 'Loading...',
    noItems: 'No items',
    tents: 'Tents / Rooms',
    menuProducts: 'Menu Products',
    item: 'Item',
    qty: 'Qty',
    date: 'Date',
    tax: 'Tax',
    total: 'Total',
    actions: 'Actions',
    edit: 'Edit',
    delete: 'Delete',
    subtotal: 'Subtotal',
    discount: 'Discount',
    taxTotal: 'Tax',
    grandTotal: 'Grand Total',
    confirmDeleteTitle: 'Confirm Delete',
    confirmDeleteTent: 'Are you sure you want to delete this tent? All associated menu products will also be deleted.',
    confirmDeleteProduct: 'Are you sure you want to delete this menu product?',
    cancel: 'Cancel',
    confirm: 'Delete',
    deleteSuccess: 'Deleted successfully',
    deleteFailed: 'Failed to delete',
    guests: 'guests',
    nights: 'nights',
    voucher: 'Voucher',
  },
};

export function GlampingBookingEditTab({
  booking,
  locale = 'vi',
  onRefresh,
  isUpdating = false,
}: GlampingBookingEditTabProps) {
  const t = texts[locale];

  const [data, setData] = useState<EditItemsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTent, setEditingTent] = useState<TentEditData | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductEditData | null>(null);
  const [deletingItem, setDeletingItem] = useState<{
    type: 'tent' | 'menu_product';
    id: string;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/glamping/bookings/${booking.id}/edit-items`);
      if (!res.ok) throw new Error('Failed to fetch');
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch edit items:', error);
      toast.error(locale === 'vi' ? 'Không thể tải dữ liệu' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [booking.id]);

  const handleDelete = async () => {
    if (!deletingItem) return;

    try {
      setDeleting(true);
      const endpoint = deletingItem.type === 'tent'
        ? `/api/admin/glamping/bookings/${booking.id}/tents/${deletingItem.id}`
        : `/api/admin/glamping/bookings/${booking.id}/menu-products/${deletingItem.id}`;

      const res = await fetch(endpoint, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');

      toast.success(t.deleteSuccess);
      setDeletingItem(null);
      fetchItems();
      onRefresh();
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error(t.deleteFailed);
    } finally {
      setDeleting(false);
    }
  };

  const handleTentSaved = () => {
    setEditingTent(null);
    fetchItems();
    onRefresh();
  };

  const handleProductSaved = () => {
    setEditingProduct(null);
    fetchItems();
    onRefresh();
  };

  const openTentEdit = (tent: TentItem) => {
    setEditingTent({
      id: tent.id,
      bookingId: booking.id,
      itemId: tent.itemId,
      itemName: tent.itemName,
      checkInDate: tent.checkInDate,
      checkOutDate: tent.checkOutDate,
      nights: tent.nights,
      adults: tent.adults,
      children: tent.children,
      totalGuests: tent.totalGuests,
      subtotal: tent.subtotal,
      specialRequests: tent.specialRequests,
      voucherCode: tent.voucherCode,
      discountAmount: tent.discountAmount,
      parameters: tent.parameters,
    });
  };

  const openProductEdit = (product: MenuProductItem) => {
    setEditingProduct({
      id: product.id,
      bookingId: booking.id,
      menuItemId: product.menuItemId,
      productName: product.productName,
      categoryName: product.categoryName,
      quantity: product.quantity,
      unitPrice: product.unitPrice,
      totalPrice: product.totalPrice,
      servingDate: product.servingDate,
      bookingTentId: product.bookingTentId,
      voucherCode: product.voucherCode,
      discountAmount: product.discountAmount,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <span className="ml-3 text-sm text-gray-500">{t.loading}</span>
      </div>
    );
  }

  if (!data || (data.tents.length === 0 && data.menuProducts.length === 0)) {
    return (
      <div className="text-center py-8 text-gray-500">{t.noItems}</div>
    );
  }

  const paymentStatusVariant = (ps: string) => {
    const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      deposit_paid: "secondary",
      fully_paid: "default",
      refund_pending: "secondary",
      refunded: "secondary",
      expired: "destructive",
    };
    return map[ps] || "outline";
  };

  return (
    <div className="space-y-4">
      {/* Tents Section */}
      {data.tents.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <h3 className="font-semibold text-gray-900">{t.tents}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="text-left px-4 py-2 font-medium text-gray-600">{t.item}</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600">{t.qty}</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">{t.date}</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">{t.total}</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {data.tents.map((tent) => (
                  <tr key={tent.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{tent.itemName}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {tent.parameters.map(p => `${p.parameterName}: ${p.quantity}`).join(', ')}
                      </div>
                      {tent.voucherCode && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {t.voucher}: {tent.voucherCode} (-{formatCurrency(tent.discountAmount)})
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-gray-900">{tent.totalGuests} {t.guests}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-gray-900">
                        {formatDate(tent.checkInDate)} - {formatDate(tent.checkOutDate)}
                      </div>
                      <div className="text-xs text-gray-500">{tent.nights} {t.nights}</div>
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-gray-900">
                      {formatCurrency(tent.subtotal - tent.discountAmount)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => openTentEdit(tent)}
                          disabled={isUpdating}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          {t.edit}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeletingItem({ type: 'tent', id: tent.id, name: tent.itemName })}
                          disabled={isUpdating}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Menu Products Section */}
      {data.menuProducts.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <h3 className="font-semibold text-gray-900">{t.menuProducts}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="text-left px-4 py-2 font-medium text-gray-600">{t.item}</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600">{t.qty}</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">{t.date}</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">{t.total}</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {data.menuProducts.map((product) => (
                  <tr key={product.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{product.productName}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{product.categoryName}</div>
                      {product.voucherCode && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {t.voucher}: {product.voucherCode} (-{formatCurrency(product.discountAmount)})
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center text-gray-900">
                      {product.quantity}
                    </td>
                    <td className="px-3 py-3 text-gray-900">
                      {product.servingDate ? formatDate(product.servingDate) : '-'}
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-gray-900">
                      {formatCurrency(product.totalPrice - product.discountAmount)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => openProductEdit(product)}
                          disabled={isUpdating}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          {t.edit}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeletingItem({ type: 'menu_product', id: product.id, name: product.productName })}
                          disabled={isUpdating}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Totals Summary */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{t.subtotal}</span>
            <span className="text-gray-900">{formatCurrency(data.totals.subtotal)}</span>
          </div>
          {data.totals.discountTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t.discount}</span>
              <span className="text-red-600">-{formatCurrency(data.totals.discountTotal)}</span>
            </div>
          )}
          {data.taxEnabled && data.totals.taxTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t.taxTotal} ({data.taxRate}%)</span>
              <span className="text-gray-900">{formatCurrency(data.totals.taxTotal)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-base pt-2 border-t">
            <span className="text-gray-900">{t.grandTotal}</span>
            <span className="text-gray-900">{formatCurrency(data.totals.grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Edit Modals */}
      {editingTent && (
        <GlampingEditTentModal
          isOpen={!!editingTent}
          onClose={() => setEditingTent(null)}
          onSave={handleTentSaved}
          tent={editingTent}
          locale={locale}
        />
      )}

      {editingProduct && (
        <GlampingEditMenuProductModal
          isOpen={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={handleProductSaved}
          product={editingProduct}
          locale={locale}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.confirmDeleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingItem?.type === 'tent' ? t.confirmDeleteTent : t.confirmDeleteProduct}
              <br />
              <span className="font-medium mt-2 block">{deletingItem?.name}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : null}
              {t.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
