'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SimpleRichTextEditor } from '@/components/ui/SimpleRichTextEditor';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { type Locale } from '@/lib/i18n-utils';
import { DollarSign, Receipt, User, Clock, FileDown, FileText, CalendarDays, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { downloadInvoicePDF } from '@/lib/invoice-generator';
import { ItemFinancialBreakdown } from './tabs/ItemFinancialBreakdown';
import { useItemColor } from './shared';
import { AddAdditionalCostModal } from './AddAdditionalCostModal';
import type { BookingItem, BookingPeriod, BookingAdditionalCost } from './types';

interface GlampingBookingFinancialTabProps {
  booking: {
    id: string;
    bookingCode: string;
    status: string;
    paymentStatus: string;
    pricing: {
      subtotalAmount: number;
      taxAmount: number;
      discountAmount: number;
      totalAmount: number;
      depositDue: number;
      balanceDue: number;
    };
    payments: Array<{
      id: string;
      amount: number;
      status: string;
    }>;
    customer?: {
      firstName: string;
      lastName: string;
      fullName: string;
      email: string;
      phone: string;
      country?: string;
      address?: string;
    };
    zone?: {
      id: string;
      name: any;
    };
    createdAt: string;
    taxInvoiceRequired?: boolean;
    taxRate?: number;
    invoiceNotes?: string;
    specialRequirements?: string;
    items?: BookingItem[];
  };
  bookingPeriods?: BookingPeriod[];
  locale?: Locale;
  onPaidAndCheckout?: (amount: number, paymentMethod: string) => void;
  onAddVatPayment?: (amount: number, paymentMethod: string) => void;
  isUpdating?: boolean;
  canCheckout?: boolean;
  currentPaymentStatus?: string;
  currentStaffName?: string;
  onRefresh?: () => void;
}

interface PricingItem {
  id: string;
  type: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  taxRate: number; // Per-item tax rate
  taxAmount: number;
  totalWithTax: number;
  bookingTentId?: string | null; // For grouping by tent
  voucherCode?: string | null;
  discountAmount?: number;
  servingDate?: string | null; // Per-night serving date
}

export function GlampingBookingFinancialTab({
  booking,
  bookingPeriods = [],
  locale = 'vi',
  onPaidAndCheckout,
  onAddVatPayment,
  isUpdating = false,
  canCheckout = false,
  currentPaymentStatus,
  currentStaffName,
  onRefresh,
}: GlampingBookingFinancialTabProps) {
  const paymentStatus = currentPaymentStatus || booking.paymentStatus;

  // Color context for multi-item display
  let getColorForItemId: (itemId: string) => any;
  try {
    const colorContext = useItemColor();
    getColorForItemId = colorContext.getColorForItemId;
  } catch {
    // Fallback if not inside ItemColorProvider
    const defaultColor = { bg: 'bg-gray-50', border: 'border-l-gray-500', text: 'text-gray-700', dot: 'bg-gray-500' };
    getColorForItemId = () => defaultColor;
  }

  const texts = {
    vi: {
      itemDetails: 'Chi tiết hạng mục',
      no: 'STT',
      item: 'Hàng mục',
      qty: 'SL',
      unitPrice: 'Đơn giá',
      amount: 'Thành tiền',
      paymentInfo: 'Thông tin thanh toán',
      staff: 'Nhân viên:',
      bookingTime: 'Thời gian đặt:',
      subtotal: 'Tạm tính',
      discount: 'Giảm giá',
      vatTax: 'Thuế VAT',
      totalToPay: 'Tổng tiền phải trả',
      alreadyPaid: 'Đã thanh toán',
      remaining: 'Còn cần trả',
      exportInvoice: 'Xuất hoá đơn',
      exportVatInvoice: 'Xuất hoá đơn VAT',
      exportReceipt: 'Xuất phiếu thu',
      paidCheckout: 'Đã trả tiền - Hoàn thành',
      recordVatPayment: 'Ghi nhận thanh toán VAT',
      vatPaid: 'Khách hàng đã thanh toán tiền thuế VAT',
      vatAmountToCollect: 'Số tiền VAT cần thu',
      paymentMethod: 'Phương thức thanh toán',
      cash: 'Tiền mặt',
      bankTransfer: 'Chuyển khoản',
      cancel: 'Hủy',
      confirmReceived: 'Xác nhận đã nhận tiền',
      vatToggle: 'Xuất hoá đơn VAT',
      vatToggleDesc: 'Bật để tính thêm thuế VAT',
      exportInvoiceModalTitle: 'Xác nhận xuất hoá đơn',
      invoiceNotes: 'Ghi chú trên hoá đơn',
      invoiceNotesPlaceholder: 'Nhập ghi chú nếu cần...',
      export: 'Xuất',
      additionalCosts: 'Chi phí phát sinh',
      addAdditionalCost: 'Thêm chi phí phát sinh',
    },
    en: {
      itemDetails: 'Item Details',
      no: 'No.',
      item: 'Item',
      qty: 'Qty',
      unitPrice: 'Unit Price',
      amount: 'Amount',
      paymentInfo: 'Payment Information',
      staff: 'Staff:',
      bookingTime: 'Booking Time:',
      subtotal: 'Subtotal',
      discount: 'Discount',
      vatTax: 'VAT Tax',
      totalToPay: 'Total Amount',
      alreadyPaid: 'Already Paid',
      remaining: 'Remaining',
      exportInvoice: 'Export Invoice',
      exportVatInvoice: 'Export VAT Invoice',
      exportReceipt: 'Export Receipt',
      paidCheckout: 'Mark as Paid - Complete',
      recordVatPayment: 'Record VAT Payment',
      vatPaid: 'Customer has paid the VAT amount',
      vatAmountToCollect: 'VAT Amount to Collect',
      paymentMethod: 'Payment Method',
      cash: 'Cash',
      bankTransfer: 'Bank Transfer',
      cancel: 'Cancel',
      confirmReceived: 'Confirm Payment Received',
      vatToggle: 'VAT Invoice Required',
      vatToggleDesc: 'Enable to add VAT tax',
      exportInvoiceModalTitle: 'Confirm Export Invoice',
      invoiceNotes: 'Notes on Invoice',
      invoiceNotesPlaceholder: 'Enter notes if needed...',
      export: 'Export',
      additionalCosts: 'Additional Costs',
      addAdditionalCost: 'Add Additional Cost',
    },
  };

  const t = texts[locale];

  const [taxInvoiceRequired, setTaxInvoiceRequired] = useState(booking.taxInvoiceRequired || false);
  const [items, setItems] = useState<PricingItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  // Per-tent discount data from pricing-details API
  const [tentDiscounts, setTentDiscounts] = useState<Array<{
    tentId: string;
    itemId: string;
    voucherCode: string;
    discountAmount: number;
  }>>([]);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [showVatPaymentDialog, setShowVatPaymentDialog] = useState(false);
  const [vatPaymentMethod, setVatPaymentMethod] = useState<string>('cash');
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<string>('cash');
  const [togglingVat, setTogglingVat] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [editableInvoiceNotes, setEditableInvoiceNotes] = useState<string>(booking.invoiceNotes || '');
  const [showAddCostModal, setShowAddCostModal] = useState(false);
  const [additionalCosts, setAdditionalCosts] = useState<BookingAdditionalCost[]>([]);

  // Fetch pricing details
  useEffect(() => {
    const fetchPricingDetails = async () => {
      setLoadingItems(true);
      try {
        const response = await fetch(`/api/admin/glamping/bookings/${booking.id}/pricing-details`);
        if (response.ok) {
          const data = await response.json();
          console.log('[Financial Tab] Pricing data:', data);

          const itemsList: PricingItem[] = [];
          let counter = 0;
          const isTaxEnabled = data.booking?.taxEnabled || false;

          // Add accommodation items (using per-item taxRate from API)
          if (data.nightlyPricing && data.nightlyPricing.length > 0) {
            data.nightlyPricing.forEach((night: any) => {
              const subtotal = night.subtotalAfterDiscounts || 0;
              const itemTaxRate = isTaxEnabled ? (night.taxRate || 0) : 0;
              const taxAmount = isTaxEnabled ? (night.taxAmount || 0) : 0;
              itemsList.push({
                id: `item-${counter++}`,
                type: 'accommodation',
                name: night.itemName || 'Lưu trú',
                description: night.parameterName || night.zoneName || '',
                quantity: night.quantity || 1,
                unitPrice: night.unitPrice || subtotal,
                subtotal: subtotal,
                taxRate: itemTaxRate,
                taxAmount,
                totalWithTax: subtotal + taxAmount,
                bookingTentId: night.bookingTentId || null,
              });
            });
          } else if (booking.pricing.subtotalAmount > 0) {
            // Fallback: if no nightly pricing but booking has subtotal, show it
            const subtotal = booking.pricing.subtotalAmount;
            itemsList.push({
              id: `item-${counter++}`,
              type: 'accommodation',
              name: 'Lưu trú',
              description: '',
              quantity: 1,
              unitPrice: subtotal,
              subtotal: subtotal,
              taxRate: 0,
              taxAmount: 0,
              totalWithTax: subtotal,
            });
          }

          // Add products (using per-product taxRate from API)
          if (data.products && data.products.length > 0) {
            data.products.forEach((product: any) => {
              const subtotal = product.subtotal || 0;
              const productTaxRate = isTaxEnabled ? (product.taxRate || 0) : 0;
              const taxAmount = isTaxEnabled ? (product.taxAmount || 0) : 0;
              itemsList.push({
                id: `item-${counter++}`,
                type: 'product',
                name: product.name || 'Sản phẩm',
                description: product.category || '',
                quantity: product.quantity || 1,
                unitPrice: product.originalUnitPrice || 0,
                subtotal: subtotal,
                taxRate: productTaxRate,
                taxAmount: taxAmount,
                totalWithTax: subtotal + taxAmount,
                bookingTentId: product.bookingTentId || null,
                voucherCode: product.voucherCode || null,
                discountAmount: product.discountAmount || 0,
                servingDate: product.servingDate || null,
              });
            });
          }

          setItems(itemsList);
          setTaxInvoiceRequired(isTaxEnabled);

          // Store per-tent discount data
          if (data.tentDiscounts && data.tentDiscounts.length > 0) {
            setTentDiscounts(data.tentDiscounts);
          }
        } else {
          console.error('[Financial Tab] API error:', response.status);
        }

        // Fetch additional costs
        const additionalCostsResponse = await fetch(`/api/admin/glamping/bookings/${booking.id}/additional-costs`);
        if (additionalCostsResponse.ok) {
          const additionalCostsData = await additionalCostsResponse.json();
          setAdditionalCosts(additionalCostsData.additionalCosts || []);
        }
      } catch (error) {
        console.error('[Financial Tab] Error fetching pricing details:', error);
      } finally {
        setLoadingItems(false);
      }
    };

    fetchPricingDetails();
  }, [booking.id, booking.pricing.subtotalAmount, booking.taxRate]);

  // Calculate totals (including additional costs)
  const additionalCostsSubtotal = additionalCosts.reduce((sum, c) => sum + c.totalPrice, 0);
  const additionalCostsTax = additionalCosts.reduce((sum, c) => sum + c.taxAmount, 0);
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0) + additionalCostsSubtotal;
  const totalTax = items.reduce((sum, item) => sum + item.taxAmount, 0) + additionalCostsTax;
  const discountAmount = booking.pricing.discountAmount || 0;
  const calculatedTotal = subtotal - discountAmount + totalTax;

  // Group items by booking_tent_id and calculate breakdowns
  const groupedByTent: Record<string, PricingItem[]> = {};
  const sharedItems: PricingItem[] = [];

  items.forEach(item => {
    if (item.bookingTentId) {
      if (!groupedByTent[item.bookingTentId]) {
        groupedByTent[item.bookingTentId] = [];
      }
      groupedByTent[item.bookingTentId].push(item);
    } else {
      sharedItems.push(item);
    }
  });

  // Calculate financial breakdown for visualization (using booking periods)
  const itemBreakdowns = bookingPeriods?.map(period => {
    // Use tentId directly from period (populated by tentsToBookingPeriods)
    const tentId = period.tentId;

    const tentPricingItems = tentId ? (groupedByTent[tentId] || []) : [];

    const itemSubtotal = tentPricingItems.reduce((sum, item) => sum + item.subtotal, 0);
    const itemTax = tentPricingItems.reduce((sum, item) => sum + item.taxAmount, 0);
    const itemTotal = itemSubtotal + itemTax;
    const percentage = calculatedTotal > 0 ? (itemTotal / calculatedTotal) * 100 : 0;

    return {
      itemId: period.itemId,
      itemName: period.itemName,
      total: itemTotal,
      percentage,
      tentId,
    };
  }) || [];

  // Calculate actual paid amount from payments
  const totalPaid = booking.payments
    ?.filter((p) => ['successful', 'completed', 'paid'].includes(p.status))
    .reduce((sum, p) => sum + p.amount, 0) || 0;

  const actualRemaining = Math.max(0, calculatedTotal - totalPaid);

  // Handle VAT toggle
  const handleVatToggle = async (newValue: boolean) => {
    setTogglingVat(true);
    try {
      const response = await fetch(`/api/admin/glamping/bookings/${booking.id}/toggle-tax-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taxInvoiceRequired: newValue }),
      });

      if (response.ok) {
        setTaxInvoiceRequired(newValue);
        toast.success(locale === 'vi' ? 'Đã cập nhật' : 'Updated');
        onRefresh?.();
      } else {
        throw new Error('Failed to toggle VAT');
      }
    } catch (error) {
      toast.error(locale === 'vi' ? 'Không thể cập nhật' : 'Failed to update');
    } finally {
      setTogglingVat(false);
    }
  };

  // Handle paid and checkout
  const handlePaidAndCheckout = () => {
    setShowCheckoutDialog(false);
    onPaidAndCheckout?.(actualRemaining, checkoutPaymentMethod);
  };

  // Handle VAT payment
  const handleVatPayment = () => {
    setShowVatPaymentDialog(false);
    onAddVatPayment?.(actualRemaining, vatPaymentMethod);
  };

  // Sync editableInvoiceNotes when booking data changes
  useEffect(() => {
    setEditableInvoiceNotes(booking.invoiceNotes || '');
  }, [booking.invoiceNotes]);

  // Handle export invoice
  const handleExportInvoice = (invoiceNotes?: string) => {
    const invoiceItems = items.map(item => {
      return {
        name: item.name,
        description: item.description || '',
        quantity: item.quantity,
        originalUnitPrice: item.unitPrice,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        discount: 0,
        finalPrice: item.subtotal,
        taxRate: item.taxRate,
        taxAmount: item.taxAmount,
        total: item.totalWithTax,
        totalWithTax: item.totalWithTax,
      };
    });

    // Add additional costs to invoice items
    const additionalCostItems = additionalCosts.map(cost => {
      return {
        name: cost.name,
        description: cost.notes || '',
        quantity: cost.quantity,
        originalUnitPrice: cost.unitPrice,
        unitPrice: cost.unitPrice,
        subtotal: cost.totalPrice,
        discount: 0,
        finalPrice: cost.totalPrice,
        taxRate: cost.taxRate,
        taxAmount: cost.taxAmount,
        total: cost.totalPrice + cost.taxAmount,
        totalWithTax: cost.totalPrice + cost.taxAmount,
      };
    });

    const allInvoiceItems = [...invoiceItems, ...additionalCostItems];

    downloadInvoicePDF({
      bookingReference: booking.bookingCode,
      createdAt: booking.createdAt,
      guest: {
        fullName: booking.customer?.fullName || '',
        email: booking.customer?.email || '',
        phone: booking.customer?.phone || '',
        address: booking.customer?.address || '',
      },
      campsite: {
        name: typeof booking.zone?.name === 'string' ? booking.zone.name : (booking.zone?.name?.vi || booking.zone?.name?.en || 'Glamping Zone'),
        address: '',
        phone: '',
        taxId: '',
      },
      items: allInvoiceItems,
      taxInvoiceRequired,
      totals: {
        subtotalBeforeDiscounts: subtotal,
        totalDiscounts: discountAmount,
        subtotalAfterDiscounts: subtotal - discountAmount,
        totalTax,
        grandTotal: calculatedTotal,
      },
      specialRequests: booking.specialRequirements || '',
      invoiceNotes: invoiceNotes || '',
    });
  };

  // Handle open export modal
  const handleOpenExportModal = () => {
    setEditableInvoiceNotes(booking.invoiceNotes || '');
    setShowExportModal(true);
  };

  // Handle confirm export from modal
  const handleConfirmExport = () => {
    handleExportInvoice(editableInvoiceNotes);
    setShowExportModal(false);
  };

  // Handle additional cost saved
  const handleAdditionalCostSaved = async () => {
    setShowAddCostModal(false);
    // Refetch additional costs
    try {
      const response = await fetch(`/api/admin/glamping/bookings/${booking.id}/additional-costs`);
      if (response.ok) {
        const data = await response.json();
        setAdditionalCosts(data.additionalCosts || []);
      }
    } catch (error) {
      console.error('Error refetching additional costs:', error);
    }
    onRefresh?.();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* LEFT: Items Table (60% width) */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              {t.itemDetails}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddCostModal(true)}
              className="text-amber-600 border-amber-300 hover:bg-amber-50"
            >
              <Plus className="h-4 w-4 mr-1" />
              {t.addAdditionalCost}
            </Button>
          </CardHeader>
          <CardContent>
            {loadingItems ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">{t.no}</th>
                      <th className="px-3 py-2 text-left font-semibold">{t.item}</th>
                      <th className="px-3 py-2 text-center font-semibold">{t.qty}</th>
                      <th className="px-3 py-2 text-right font-semibold">{t.unitPrice}</th>
                      <th className="px-3 py-2 text-right font-semibold">{t.amount}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Render per-tent sections if multi-tent booking */}
                    {bookingPeriods && bookingPeriods.length > 0 ? (
                      <>
                        {bookingPeriods.map((period, tentIndex) => {
                          const periodKey = `${period.itemId}|${period.checkInDate}|${period.checkOutDate}`;
                          const colorScheme = getColorForItemId(periodKey);

                          // Use tentId directly from period
                          const tentId = period.tentId;

                          // Collect all pricing items for this tent
                          const tentPricingItems = tentId ? (groupedByTent[tentId] || []) : [];

                          const itemSubtotal = tentPricingItems.reduce((sum, item) => sum + item.subtotal, 0);
                          const itemProductDiscounts = tentPricingItems.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
                          const itemTax = tentPricingItems.reduce((sum, item) => sum + item.taxAmount, 0);
                          const itemTotal = itemSubtotal + itemTax;

                          return (
                            <React.Fragment key={periodKey}>
                              {/* Section Header */}
                              <tr className={cn('border-t-2', colorScheme.bg, colorScheme.border)}>
                                <td colSpan={5} className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <div className={cn('w-2 h-2 rounded-full', colorScheme.dot)} />
                                    <span className="font-semibold text-sm">
                                      {locale === 'vi' ? 'Lều' : 'Tent'} {tentIndex + 1}: {period.itemName}
                                    </span>
                                  </div>
                                </td>
                              </tr>

                              {/* Tent pricing rows */}
                              {tentPricingItems.length > 0 ? (
                                (() => {
                                  // Check if any product items have servingDate
                                  const hasServingDates = tentPricingItems.some(i => i.type === 'product' && i.servingDate);
                                  const accommodationItems = tentPricingItems.filter(i => i.type === 'accommodation');
                                  const productItems = tentPricingItems.filter(i => i.type === 'product');

                                  // Group products by servingDate if per-night data exists
                                  const dateGroups: Record<string, PricingItem[]> = {};
                                  if (hasServingDates) {
                                    productItems.forEach(p => {
                                      const key = p.servingDate || '_no_date';
                                      if (!dateGroups[key]) dateGroups[key] = [];
                                      dateGroups[key].push(p);
                                    });
                                  }

                                  let rowIndex = 0;

                                  return (
                                    <>
                                      {/* Accommodation items first */}
                                      {accommodationItems.map((item) => {
                                        rowIndex++;
                                        return (
                                          <React.Fragment key={item.id}>
                                            <tr className="bg-white">
                                              <td className="px-3 py-2 text-gray-600 text-xs">{rowIndex}</td>
                                              <td className="px-3 py-2">
                                                <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                                                {item.description && (
                                                  <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                                                )}
                                              </td>
                                              <td className="px-3 py-2 text-center text-sm">{item.quantity}</td>
                                              <td className="px-3 py-2 text-right text-sm">{formatCurrency(item.unitPrice)}</td>
                                              <td className="px-3 py-2 text-right font-medium text-sm">{formatCurrency(item.subtotal)}</td>
                                            </tr>
                                            {taxInvoiceRequired && item.taxAmount > 0 && (
                                              <tr className="bg-blue-50">
                                                <td></td>
                                                <td colSpan={3} className="px-3 py-1 pl-8 text-xs text-blue-600">
                                                  ↳ VAT ({item.taxRate}%)
                                                </td>
                                                <td className="px-3 py-1 text-right text-xs text-blue-600">
                                                  {formatCurrency(item.taxAmount)}
                                                </td>
                                              </tr>
                                            )}
                                          </React.Fragment>
                                        );
                                      })}

                                      {/* Product items - grouped by date if per-night, or flat */}
                                      {hasServingDates ? (
                                        Object.entries(dateGroups)
                                          .sort(([a], [b]) => a.localeCompare(b))
                                          .map(([dateKey, dateProducts]) => {
                                            const dateLabel = dateKey === '_no_date'
                                              ? (locale === 'vi' ? 'Không xác định ngày' : 'No date')
                                              : new Date(dateKey.substring(0, 10) + 'T12:00:00').toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
                                                  day: '2-digit', month: '2-digit', year: 'numeric'
                                                });

                                            return (
                                              <React.Fragment key={dateKey}>
                                                <tr className="bg-gray-50">
                                                  <td></td>
                                                  <td colSpan={4} className="px-3 py-1.5 text-xs font-medium text-gray-600">
                                                    <span className="inline-flex items-center gap-1">
                                                      <CalendarDays className="h-3 w-3" />
                                                      {dateLabel}
                                                    </span>
                                                  </td>
                                                </tr>
                                                {dateProducts.map((item) => {
                                                  rowIndex++;
                                                  return (
                                                    <React.Fragment key={item.id}>
                                                      <tr className="bg-white">
                                                        <td className="px-3 py-2 text-gray-600 text-xs">{rowIndex}</td>
                                                        <td className="px-3 py-2">
                                                          <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                                                          {item.description && (
                                                            <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                                                          )}
                                                        </td>
                                                        <td className="px-3 py-2 text-center text-sm">{item.quantity}</td>
                                                        <td className="px-3 py-2 text-right text-sm">{formatCurrency(item.unitPrice)}</td>
                                                        <td className="px-3 py-2 text-right font-medium text-sm">{formatCurrency(item.subtotal)}</td>
                                                      </tr>
                                                      {item.voucherCode && item.discountAmount && item.discountAmount > 0 && (
                                                        <tr className="bg-green-50">
                                                          <td></td>
                                                          <td colSpan={3} className="px-3 py-1 pl-8 text-xs text-green-600">
                                                            <span className="inline-flex items-center gap-1">
                                                              ↳ Voucher
                                                              <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded font-mono">
                                                                {item.voucherCode}
                                                              </span>
                                                            </span>
                                                          </td>
                                                          <td className="px-3 py-1 text-right text-xs font-medium text-green-600">
                                                            -{formatCurrency(item.discountAmount)}
                                                          </td>
                                                        </tr>
                                                      )}
                                                      {taxInvoiceRequired && item.taxAmount > 0 && (
                                                        <tr className="bg-blue-50">
                                                          <td></td>
                                                          <td colSpan={3} className="px-3 py-1 pl-8 text-xs text-blue-600">
                                                            ↳ VAT ({item.taxRate}%)
                                                          </td>
                                                          <td className="px-3 py-1 text-right text-xs text-blue-600">
                                                            {formatCurrency(item.taxAmount)}
                                                          </td>
                                                        </tr>
                                                      )}
                                                    </React.Fragment>
                                                  );
                                                })}
                                              </React.Fragment>
                                            );
                                          })
                                      ) : (
                                        productItems.map((item) => {
                                          rowIndex++;
                                          return (
                                            <React.Fragment key={item.id}>
                                              <tr className="bg-white">
                                                <td className="px-3 py-2 text-gray-600 text-xs">{rowIndex}</td>
                                                <td className="px-3 py-2">
                                                  <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                                                  {item.description && (
                                                    <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                                                  )}
                                                </td>
                                                <td className="px-3 py-2 text-center text-sm">{item.quantity}</td>
                                                <td className="px-3 py-2 text-right text-sm">{formatCurrency(item.unitPrice)}</td>
                                                <td className="px-3 py-2 text-right font-medium text-sm">{formatCurrency(item.subtotal)}</td>
                                              </tr>
                                              {item.voucherCode && item.discountAmount && item.discountAmount > 0 && (
                                                <tr className="bg-green-50">
                                                  <td></td>
                                                  <td colSpan={3} className="px-3 py-1 pl-8 text-xs text-green-600">
                                                    <span className="inline-flex items-center gap-1">
                                                      ↳ Voucher
                                                      <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded font-mono">
                                                        {item.voucherCode}
                                                      </span>
                                                    </span>
                                                  </td>
                                                  <td className="px-3 py-1 text-right text-xs font-medium text-green-600">
                                                    -{formatCurrency(item.discountAmount)}
                                                  </td>
                                                </tr>
                                              )}
                                              {taxInvoiceRequired && item.taxAmount > 0 && (
                                                <tr className="bg-blue-50">
                                                  <td></td>
                                                  <td colSpan={3} className="px-3 py-1 pl-8 text-xs text-blue-600">
                                                    ↳ VAT ({item.taxRate}%)
                                                  </td>
                                                  <td className="px-3 py-1 text-right text-xs text-blue-600">
                                                    {formatCurrency(item.taxAmount)}
                                                  </td>
                                                </tr>
                                              )}
                                            </React.Fragment>
                                          );
                                        })
                                      )}
                                    </>
                                  );
                                })()
                              ) : (
                                <tr className="bg-white">
                                  <td colSpan={5} className="px-3 py-2 text-center text-sm text-gray-500 italic">
                                    {locale === 'vi' ? 'Không có chi phí' : 'No charges'}
                                  </td>
                                </tr>
                              )}

                              {/* Item Subtotal/Tax/Total - Calculate discount conditions for footer display */}
                              {(() => {
                                const tentDiscountInfo = tentDiscounts.find(td => td.tentId === tentId);
                                const hasTentVoucher = tentDiscountInfo && tentDiscountInfo.discountAmount > 0;
                                const hasVat = taxInvoiceRequired && itemTax > 0;
                                const tentDiscountAmount = tentDiscountInfo?.discountAmount || 0;

                                return (
                                  <>
                                    {/* Subtotal row - chỉ hiển thị nếu có voucher hoặc VAT */}
                                    {(hasTentVoucher || hasVat) && (
                                      <tr className={cn('border-t', colorScheme.bg)}>
                                        <td colSpan={4} className="px-3 py-2 text-right font-medium text-sm">
                                          {locale === 'vi' ? 'Tổng' : 'Subtotal'}:
                                        </td>
                                        <td className="px-3 py-2 text-right font-semibold text-sm">
                                          {formatCurrency(itemSubtotal - itemProductDiscounts)}
                                        </td>
                                      </tr>
                                    )}

                                    {/* Tent voucher discount row */}
                                    {hasTentVoucher && (
                                      <tr className={cn(colorScheme.bg)}>
                                        <td colSpan={4} className="px-3 py-1 text-right text-sm text-green-600">
                                          <span className="inline-flex items-center gap-1">
                                            Voucher
                                            <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded font-mono">
                                              {tentDiscountInfo!.voucherCode}
                                            </span>
                                          </span>
                                        </td>
                                        <td className="px-3 py-1 text-right font-medium text-sm text-green-600">
                                          -{formatCurrency(tentDiscountAmount)}
                                        </td>
                                      </tr>
                                    )}

                                    {/* VAT row */}
                                    {hasVat && (() => {
                                      const uniqueRates = [...new Set(tentPricingItems.filter(i => i.taxRate > 0).map(i => i.taxRate))];
                                      const vatLabel = uniqueRates.length === 1
                                        ? `VAT ${uniqueRates[0]}%:`
                                        : (locale === 'vi' ? 'Tổng thuế VAT:' : 'Total VAT:');
                                      return (
                                        <tr className={cn(colorScheme.bg)}>
                                          <td colSpan={4} className="px-3 py-1 text-right text-sm text-blue-600">
                                            {vatLabel}
                                          </td>
                                          <td className="px-3 py-1 text-right font-medium text-sm text-blue-600">
                                            {formatCurrency(itemTax)}
                                          </td>
                                        </tr>
                                      );
                                    })()}

                                    {/* Final total row - luôn hiển thị */}
                                    <tr className={cn('border-b-2', hasTentVoucher || hasVat ? '' : 'border-t', colorScheme.bg)}>
                                      <td colSpan={4} className="px-3 py-2 text-right font-semibold">
                                        {locale === 'vi' ? 'Tổng' : 'Total'}:
                                      </td>
                                      <td className={cn('px-3 py-2 text-right font-bold', colorScheme.text)}>
                                        {formatCurrency(itemTotal - tentDiscountAmount - itemProductDiscounts)}
                                      </td>
                                    </tr>
                                  </>
                                );
                              })()}
                            </React.Fragment>
                          );
                        })}

                        {/* Shared items section */}
                        {sharedItems.length > 0 && (
                          <>
                            <tr className="bg-slate-100 border-t-2 border-slate-400">
                              <td colSpan={5} className="px-3 py-2">
                                <span className="font-semibold text-sm">
                                  {locale === 'vi' ? 'Sản phẩm chung' : 'Shared Items'}
                                </span>
                              </td>
                            </tr>
                            {sharedItems.map((item, index) => (
                              <React.Fragment key={item.id}>
                                <tr className="bg-white">
                                  <td className="px-3 py-2 text-gray-600 text-xs">{index + 1}</td>
                                  <td className="px-3 py-2">
                                    <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                                    {item.description && (
                                      <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-center text-sm">{item.quantity}</td>
                                  <td className="px-3 py-2 text-right text-sm">{formatCurrency(item.unitPrice)}</td>
                                  <td className="px-3 py-2 text-right font-medium text-sm">{formatCurrency(item.subtotal)}</td>
                                </tr>
                              </React.Fragment>
                            ))}
                          </>
                        )}

                        {/* Additional Costs Section */}
                        {additionalCosts.length > 0 && (
                          <>
                            <tr className="bg-amber-50 border-t-2 border-amber-400">
                              <td colSpan={5} className="px-3 py-2">
                                <span className="font-semibold text-sm text-amber-700">
                                  {t.additionalCosts}
                                </span>
                              </td>
                            </tr>
                            {additionalCosts.map((cost, index) => (
                              <React.Fragment key={cost.id}>
                                <tr className="bg-white">
                                  <td className="px-3 py-2 text-gray-600 text-xs">{index + 1}</td>
                                  <td className="px-3 py-2">
                                    <div className="font-medium text-gray-900 text-sm">{cost.name}</div>
                                    {cost.notes && (
                                      <div className="text-xs text-gray-500 mt-0.5">{cost.notes}</div>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-center text-sm">{cost.quantity}</td>
                                  <td className="px-3 py-2 text-right text-sm">{formatCurrency(cost.unitPrice)}</td>
                                  <td className="px-3 py-2 text-right font-medium text-sm">{formatCurrency(cost.totalPrice)}</td>
                                </tr>
                                {taxInvoiceRequired && cost.taxAmount > 0 && (
                                  <tr className="bg-blue-50">
                                    <td></td>
                                    <td colSpan={3} className="px-3 py-1 pl-8 text-xs text-blue-600">
                                      ↳ VAT ({cost.taxRate}%)
                                    </td>
                                    <td className="px-3 py-1 text-right text-xs text-blue-600">
                                      {formatCurrency(cost.taxAmount)}
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                            {/* Additional Costs Subtotal */}
                            <tr className="bg-amber-50">
                              <td colSpan={4} className="px-3 py-2 text-right font-medium text-sm text-amber-700">
                                {locale === 'vi' ? 'Tổng chi phí phát sinh' : 'Additional Costs Total'}:
                              </td>
                              <td className="px-3 py-2 text-right font-semibold text-sm text-amber-700">
                                {formatCurrency(additionalCostsSubtotal + additionalCostsTax)}
                              </td>
                            </tr>
                          </>
                        )}
                      </>
                    ) : (
                      /* Fallback: Simple flat list if no booking items */
                      items.map((item, index) => (
                        <React.Fragment key={item.id}>
                          <tr className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-3 py-3 text-gray-600">{index + 1}</td>
                            <td className="px-3 py-3">
                              <div className="font-medium text-gray-900">{item.name}</div>
                              {item.description && (
                                <div className="text-xs text-gray-500 mt-1">{item.description}</div>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center">{item.quantity}</td>
                            <td className="px-3 py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                            <td className="px-3 py-3 text-right font-medium">{formatCurrency(item.subtotal)}</td>
                          </tr>

                          {taxInvoiceRequired && item.taxAmount > 0 && (
                            <tr className="bg-blue-50 border-t border-blue-100">
                              <td></td>
                              <td colSpan={3} className="px-3 py-2 pl-8 text-sm text-blue-600">
                                ↳ VAT ({item.taxRate}%)
                              </td>
                              <td className="px-3 py-2 text-right text-blue-600">
                                {formatCurrency(item.taxAmount)}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))
                    )}

                    {/* Additional Costs Section (for fallback view) */}
                    {!(bookingPeriods && bookingPeriods.length > 0) && additionalCosts.length > 0 && (
                      <>
                        <tr className="bg-amber-50 border-t-2 border-amber-400">
                          <td colSpan={5} className="px-3 py-2">
                            <span className="font-semibold text-sm text-amber-700">
                              {t.additionalCosts}
                            </span>
                          </td>
                        </tr>
                        {additionalCosts.map((cost, index) => (
                          <React.Fragment key={cost.id}>
                            <tr className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-3 py-3 text-gray-600">{index + 1}</td>
                              <td className="px-3 py-3">
                                <div className="font-medium text-gray-900">{cost.name}</div>
                                {cost.notes && (
                                  <div className="text-xs text-gray-500 mt-1">{cost.notes}</div>
                                )}
                              </td>
                              <td className="px-3 py-3 text-center">{cost.quantity}</td>
                              <td className="px-3 py-3 text-right">{formatCurrency(cost.unitPrice)}</td>
                              <td className="px-3 py-3 text-right font-medium">{formatCurrency(cost.totalPrice)}</td>
                            </tr>
                            {taxInvoiceRequired && cost.taxAmount > 0 && (
                              <tr className="bg-blue-50 border-t border-blue-100">
                                <td></td>
                                <td colSpan={3} className="px-3 py-2 pl-8 text-sm text-blue-600">
                                  ↳ VAT ({cost.taxRate}%)
                                </td>
                                <td className="px-3 py-2 text-right text-blue-600">
                                  {formatCurrency(cost.taxAmount)}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* RIGHT: Payment Panel (40% width) */}
      <div className="lg:col-span-1">
        <Card className="sticky top-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t.paymentInfo}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Metadata */}
            <div className="text-sm space-y-2 pb-3 border-b">
              <div className="flex items-center gap-2 text-gray-600">
                <User className="h-4 w-4" />
                <span>{t.staff}</span>
                <span className="font-medium text-gray-900">{currentStaffName || 'Admin'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-4 w-4" />
                <span>{t.bookingTime}</span>
                <span className="font-medium text-gray-900">{formatDate(booking.createdAt)}</span>
              </div>
            </div>

            {/* Pricing Summary */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t.subtotal}</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>{t.discount}</span>
                  <span className="font-medium">-{formatCurrency(discountAmount)}</span>
                </div>
              )}
            </div>

            {/* VAT Toggle */}
            <div className="border-t border-b py-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">{t.vatToggle}</Label>
                  <p className="text-xs text-gray-500">{t.vatToggleDesc}</p>
                </div>
                <Switch
                  checked={taxInvoiceRequired}
                  onCheckedChange={handleVatToggle}
                  disabled={togglingVat || paymentStatus === 'fully_paid'}
                />
              </div>
            </div>

            {/* VAT Tax Amount */}
            {taxInvoiceRequired && totalTax > 0 && (
              <div className="flex justify-between text-sm text-blue-600">
                <span>{t.vatTax}</span>
                <span className="font-medium">+{formatCurrency(totalTax)}</span>
              </div>
            )}

            {/* Payment Summary */}
            <div className="pt-3 border-t space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">{t.totalToPay}</span>
                <span className="font-bold">{formatCurrency(calculatedTotal)}</span>
              </div>

              {totalPaid > 0 && (
                <div className="flex justify-between items-center">
                  <span className="font-medium">{t.alreadyPaid}</span>
                  <span className="font-bold text-green-600">{formatCurrency(totalPaid)}</span>
                </div>
              )}

              {actualRemaining > 0 && (
                <div className="flex justify-between items-center text-orange-600">
                  <span className="font-medium">{t.remaining}</span>
                  <span className="font-bold">{formatCurrency(actualRemaining)}</span>
                </div>
              )}

              {actualRemaining === 0 && totalPaid > 0 && (
                <div className="flex justify-center">
                  <Badge className="bg-green-100 text-green-800 px-4 py-1">
                    {locale === 'vi' ? 'Đã thanh toán đủ' : 'Paid in Full'}
                  </Badge>
                </div>
              )}
            </div>

            {/* Paid and Checkout Button */}
            {actualRemaining > 0 && canCheckout && onPaidAndCheckout && paymentStatus !== 'fully_paid' && (
              <div>
                <Button
                  onClick={() => setShowCheckoutDialog(true)}
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={isUpdating}
                >
                  {isUpdating && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />}
                  {t.paidCheckout}
                </Button>
              </div>
            )}

            {/* VAT Payment Button */}
            {paymentStatus === 'fully_paid' && actualRemaining > 0 && taxInvoiceRequired && onAddVatPayment && (
              <div>
                <Button
                  onClick={() => setShowVatPaymentDialog(true)}
                  className="w-full bg-orange-500 hover:bg-orange-600"
                  disabled={isUpdating}
                >
                  {`${t.recordVatPayment} (${formatCurrency(actualRemaining)})`}
                </Button>
              </div>
            )}

            {/* Export Invoice Button */}
            <div>
              <Button
                onClick={handleOpenExportModal}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={items.length === 0}
              >
                <FileDown className="h-4 w-4 mr-2" />
                {taxInvoiceRequired ? t.exportVatInvoice : t.exportReceipt}
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Checkout Dialog */}
      <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.paidCheckout}</DialogTitle>
            <DialogDescription>
              {locale === 'vi' ? 'Xác nhận đã nhận thanh toán và hoàn thành booking' : 'Confirm payment received and complete booking'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">{t.remaining}</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(actualRemaining)}</p>
            </div>
            <div className="space-y-2">
              <Label>{t.paymentMethod}</Label>
              <RadioGroup value={checkoutPaymentMethod} onValueChange={setCheckoutPaymentMethod}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cash" id="checkout-cash" />
                  <Label htmlFor="checkout-cash" className="font-normal">{t.cash}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bank_transfer" id="checkout-bank" />
                  <Label htmlFor="checkout-bank" className="font-normal">{t.bankTransfer}</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckoutDialog(false)} disabled={isUpdating}>
              {t.cancel}
            </Button>
            <Button onClick={handlePaidAndCheckout} disabled={isUpdating} className="bg-green-600 hover:bg-green-700">
              {isUpdating && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />}
              {t.confirmReceived}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VAT Payment Dialog */}
      <Dialog open={showVatPaymentDialog} onOpenChange={setShowVatPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.recordVatPayment}</DialogTitle>
            <DialogDescription>{t.vatPaid}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">{t.vatAmountToCollect}</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(actualRemaining)}</p>
            </div>
            <div className="space-y-2">
              <Label>{t.paymentMethod}</Label>
              <RadioGroup value={vatPaymentMethod} onValueChange={setVatPaymentMethod}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cash" id="vat-cash" />
                  <Label htmlFor="vat-cash" className="font-normal">{t.cash}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bank_transfer" id="vat-bank" />
                  <Label htmlFor="vat-bank" className="font-normal">{t.bankTransfer}</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVatPaymentDialog(false)} disabled={isUpdating}>
              {t.cancel}
            </Button>
            <Button onClick={handleVatPayment} disabled={isUpdating} className="bg-orange-500 hover:bg-orange-600">
              {isUpdating && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />}
              {t.confirmReceived}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Invoice Modal */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t.exportInvoiceModalTitle}
            </DialogTitle>
            <DialogDescription>
              {taxInvoiceRequired ? t.exportVatInvoice : t.exportReceipt}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="mb-2 block">{t.invoiceNotes}</Label>
              <SimpleRichTextEditor
                value={editableInvoiceNotes}
                onChange={setEditableInvoiceNotes}
                placeholder={t.invoiceNotesPlaceholder}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowExportModal(false)}
            >
              {t.cancel}
            </Button>
            <Button
              onClick={handleConfirmExport}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <FileDown className="h-4 w-4 mr-2" />
              {t.export}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Additional Cost Modal */}
      <AddAdditionalCostModal
        isOpen={showAddCostModal}
        onClose={() => setShowAddCostModal(false)}
        onSave={handleAdditionalCostSaved}
        bookingId={booking.id}
        locale={locale}
      />
    </div>
  );
}
