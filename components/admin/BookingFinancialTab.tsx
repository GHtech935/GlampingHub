'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { TaxInvoiceToggle } from '@/components/admin/TaxInvoiceToggle';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getLocalizedText, type MultilingualText, type Locale } from '@/lib/i18n-utils';
import { DollarSign, Receipt, User, Clock, FileDown, FileText } from 'lucide-react';
import { downloadInvoicePDF } from '@/lib/invoice-generator';
import { PaidCheckoutDialog } from '@/components/admin/PaidCheckoutDialog';
import { SimpleRichTextEditor } from '@/components/ui/SimpleRichTextEditor';

interface BookingFinancialTabProps {
  booking: any;
  locale?: Locale;
  onPaidAndCheckout?: (paymentMethod: string) => void;
  onAddVatPayment?: (amount: number, paymentMethod: string) => void; // For recording VAT payment
  isUpdating?: boolean;
  canCheckout?: boolean;
  currentPaymentStatus?: string; // Pass current payment status directly
  currentStaffName?: string; // Name of currently logged-in staff
  onRefresh?: () => void; // Callback to refresh booking data after toggle VAT
}

interface ItemRow {
  id: string;
  type: 'accommodation' | 'product' | 'extra' | 'discount' | 'voucher';
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalWithTax: number;
  discounts?: Array<{
    name: string;
    amount: number;
  }>;
}

export function BookingFinancialTab({
  booking,
  locale = 'vi',
  onPaidAndCheckout,
  onAddVatPayment,
  isUpdating = false,
  canCheckout = false,
  currentPaymentStatus,
  currentStaffName,
  onRefresh,
}: BookingFinancialTabProps) {
  // Use currentPaymentStatus prop if provided, otherwise fall back to booking.paymentStatus
  const paymentStatus = currentPaymentStatus || booking.paymentStatus;

  const texts = {
    vi: {
      itemDetails: 'Chi tiết hạng mục',
      no: 'STT',
      item: 'Hàng mục',
      qty: 'SL',
      unitPrice: 'Đơn giá',
      amount: 'Thành tiền',
      totalWithTax: 'Tổng có thuế',
      noTax: 'Không có thuế',
      paymentInfo: 'Thông tin thanh toán',
      staff: 'Nhân viên:',
      bookingTime: 'Thời gian đặt:',
      totalBeforeDiscount: 'Tổng tiền (trước giảm giá)',
      autoDiscounts: 'Giảm giá tự động',
      subtotalAfterDiscount: 'Tạm tính (sau giảm giá)',
      totalToPay: 'Tổng tiền phải trả',
      alreadyPaid: 'Đã thanh toán',
      remaining: 'Còn cần trả',
      exportVatInvoice: 'Xuất hoá đơn VAT',
      exportReceipt: 'Xuất phiếu thu',
      paidCheckout: 'Đã trả tiền - Checkout',
      recordVatPayment: 'Ghi nhận thanh toán VAT',
      vatPaid: 'Khách hàng đã thanh toán tiền thuế VAT',
      vatAmountToCollect: 'Số tiền VAT cần thu',
      paymentMethod: 'Phương thức thanh toán',
      cash: 'Tiền mặt',
      bankTransfer: 'Chuyển khoản',
      cancel: 'Hủy',
      confirmReceived: 'Xác nhận đã nhận tiền',
      vatTax: 'Thuế VAT',
      exportInvoiceModalTitle: 'Xác nhận xuất hoá đơn',
      invoiceNotes: 'Ghi chú trên hoá đơn',
      invoiceNotesPlaceholder: 'Nhập ghi chú nếu cần...',
      export: 'Xuất',
    },
    en: {
      itemDetails: 'Item Details',
      no: 'No.',
      item: 'Item',
      qty: 'Qty',
      unitPrice: 'Unit Price',
      amount: 'Amount',
      totalWithTax: 'Total with Tax',
      noTax: 'No tax',
      paymentInfo: 'Payment Information',
      staff: 'Staff:',
      bookingTime: 'Booking Time:',
      totalBeforeDiscount: 'Total (before discount)',
      autoDiscounts: 'Auto-discounts',
      subtotalAfterDiscount: 'Subtotal (after discount)',
      totalToPay: 'Total Amount',
      alreadyPaid: 'Already Paid',
      remaining: 'Remaining',
      exportVatInvoice: 'Export VAT Invoice',
      exportReceipt: 'Export Receipt',
      paidCheckout: 'Mark as Paid - Checkout',
      recordVatPayment: 'Record VAT Payment',
      vatPaid: 'Customer has paid the VAT amount',
      vatAmountToCollect: 'VAT Amount to Collect',
      paymentMethod: 'Payment Method',
      cash: 'Cash',
      bankTransfer: 'Bank Transfer',
      cancel: 'Cancel',
      confirmReceived: 'Confirm Payment Received',
      vatTax: 'VAT Tax',
      exportInvoiceModalTitle: 'Confirm Export Invoice',
      invoiceNotes: 'Notes on Invoice',
      invoiceNotesPlaceholder: 'Enter notes if needed...',
      export: 'Export',
    },
  };

  const t = texts[locale];
  const [taxInvoiceRequired, setTaxInvoiceRequired] = useState(
    booking.taxInvoiceRequired || false
  );
  const [items, setItems] = useState<ItemRow[]>([]);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [showVatPaymentDialog, setShowVatPaymentDialog] = useState(false);
  const [vatPaymentMethod, setVatPaymentMethod] = useState<string>('cash');
  const [showExportModal, setShowExportModal] = useState(false);
  const [editableInvoiceNotes, setEditableInvoiceNotes] = useState<string>(booking.invoiceNotes || '');

  // Sync taxInvoiceRequired state when booking data changes
  useEffect(() => {
    setTaxInvoiceRequired(booking.taxInvoiceRequired || false);
  }, [booking.taxInvoiceRequired]);

  // Sync editableInvoiceNotes when booking data changes
  useEffect(() => {
    setEditableInvoiceNotes(booking.invoiceNotes || '');
  }, [booking.invoiceNotes]);

  // Fetch nightly pricing and build items list
  useEffect(() => {
    const fetchItems = async () => {
      try {
        // Fetch detailed pricing from API
        const response = await fetch(
          `/api/admin/bookings/${booking.id}/pricing-details`
        );
        const data = await response.json();

        const itemsList: ItemRow[] = [];
        let itemCounter = 0; // Global counter for unique IDs

        // Add accommodation (nightly)
        if (data.nightlyPricing) {
          data.nightlyPricing.forEach((night: any) => {
            const taxRate = data.booking.taxRate || 0;

            // Use price BEFORE discounts for base price
            const basePrice = night.subtotalBeforeDiscounts;
            const priceAfterDiscounts = night.subtotalAfterDiscounts;

            const taxAmount = taxInvoiceRequired
              ? priceAfterDiscounts * (taxRate / 100)
              : 0;

            // Extract localized pitch name
            const pitchName = getLocalizedText(data.booking.pitchName, locale);

            itemsList.push({
              id: `item-${itemCounter++}`,
              type: 'accommodation',
              name: pitchName,
              description: `${formatDate(night.date)}`,
              quantity: 1,
              unitPrice: basePrice,
              subtotal: basePrice,
              taxRate,
              taxAmount,
              totalWithTax: priceAfterDiscounts + taxAmount,
              discounts: night.discounts?.map((d: any) => ({
                name: getLocalizedText(d.name, locale),
                amount: d.amount
              })) || []
            });
          });
        }

        // Add products
        if (data.products) {
          data.products.forEach((product: any) => {
            // Use original price for base, final price after discount
            const baseSubtotal = product.originalUnitPrice * product.quantity;
            const finalSubtotal = product.subtotal;

            const taxAmount = taxInvoiceRequired
              ? finalSubtotal * (product.taxRate / 100)
              : 0;

            // Extract localized product name
            const productName = getLocalizedText(product.name, locale);

            itemsList.push({
              id: `item-${itemCounter++}`,
              type: 'product',
              name: productName,
              quantity: product.quantity,
              unitPrice: product.originalUnitPrice,
              subtotal: baseSubtotal,
              taxRate: product.taxRate,
              taxAmount,
              totalWithTax: finalSubtotal + taxAmount,
              discounts: product.discount ? [{
                name: getLocalizedText(product.discount.name, locale),
                amount: product.discount.amount * product.quantity
              }] : []
            });
          });
        }

        // Add voucher as separate line item (if applied)
        if (data.voucherApplied) {
          const voucherName = getLocalizedText(data.voucherApplied.name, locale);
          itemsList.push({
            id: `item-${itemCounter++}`,
            type: 'voucher',
            name: `Voucher: ${data.voucherApplied.code}`,
            description: voucherName,
            quantity: 1,
            unitPrice: -data.voucherApplied.amount,
            subtotal: -data.voucherApplied.amount,
            taxRate: 0,
            taxAmount: 0,
            totalWithTax: -data.voucherApplied.amount,
          });
        }

        setItems(itemsList);
      } catch (error) {
        console.error('Error fetching items:', error);
      }
    };

    fetchItems();
  }, [booking.id, taxInvoiceRequired]);

  // Calculate totals
  const subtotalBeforeDiscounts = items
    .filter(item => item.type !== 'voucher')
    .reduce((sum, item) => sum + item.subtotal, 0);

  const totalDiscounts = items.reduce((sum, item) => {
    const itemDiscounts = item.discounts?.reduce((s, d) => s + d.amount, 0) || 0;
    return sum + itemDiscounts;
  }, 0);

  const voucherAmount = items
    .filter(item => item.type === 'voucher')
    .reduce((sum, item) => sum + Math.abs(item.subtotal), 0);

  const subtotalAfterDiscounts = subtotalBeforeDiscounts - totalDiscounts - voucherAmount;
  const totalTax = items.reduce((sum, item) => sum + item.taxAmount, 0);
  const calculatedTotal = subtotalAfterDiscounts + totalTax;

  // Calculate actual paid amount from payments
  const totalPaid = booking.payments
    ?.filter((p: any) => ['successful', 'completed', 'success'].includes(p.status))
    .reduce((sum: number, p: any) => sum + p.amount, 0) || 0;

  // Calculate actual remaining (handles VAT case where fully_paid but VAT added later)
  const actualRemaining = Math.max(0, calculatedTotal - totalPaid);

  // grandTotal for display - use actualRemaining if there's VAT to pay, otherwise based on status
  const grandTotal = paymentStatus === 'fully_paid' && actualRemaining === 0 ? 0 : actualRemaining;

  // Handle export invoice
  const handleExportInvoice = (invoiceNotes?: string) => {
    const invoiceItems = items
      .filter(item => item.type !== 'voucher')
      .map(item => {
        // Calculate discounted unit price from totalWithTax - taxAmount
        const discountedSubtotal = item.totalWithTax - item.taxAmount;
        const discountedUnitPrice = discountedSubtotal / item.quantity;

        return {
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          originalUnitPrice: item.unitPrice, // Giá gốc (chưa giảm)
          unitPrice: discountedUnitPrice, // Đơn giá (đã giảm)
          taxRate: item.taxRate,
          taxAmount: item.taxAmount,
          subtotal: discountedSubtotal, // Thành tiền = giá đã giảm * SL
          totalWithTax: item.totalWithTax,
        };
      });

    downloadInvoicePDF({
      bookingReference: booking.bookingReference,
      createdAt: booking.createdAt,
      guest: {
        fullName: booking.guest?.fullName || `${booking.guest?.firstName || ''} ${booking.guest?.lastName || ''}`.trim(),
        email: booking.guest?.email || '',
        phone: booking.guest?.phone,
        address: booking.guest?.address,
      },
      campsite: {
        name: typeof booking.campsite?.name === 'object'
          ? getLocalizedText(booking.campsite.name, locale)
          : (booking.campsite?.name || ''),
        address: booking.campsite?.address,
        phone: booking.campsite?.phone,
        taxId: booking.campsite?.taxId,
      },
      items: invoiceItems,
      taxInvoiceRequired,
      totals: {
        subtotalBeforeDiscounts,
        totalDiscounts: totalDiscounts + voucherAmount,
        subtotalAfterDiscounts,
        totalTax,
        grandTotal: calculatedTotal, // Use actual total for invoice, not remaining
      },
      invoiceNotes: invoiceNotes,
      specialRequests: booking.otherDetails?.specialRequirements,
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* LEFT: Items Table (60% width) */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              {t.itemDetails}
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                  {items.map((item, index) => (
                    <React.Fragment key={item.id}>
                      {/* Main row */}
                      <tr
                        className={
                          item.type === 'voucher'
                            ? 'bg-yellow-50'
                            : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }
                      >
                        <td className="px-3 py-3 text-gray-600">{index + 1}</td>
                        <td className="px-3 py-3">
                          <div className={`font-medium ${item.type === 'voucher' ? 'text-yellow-900' : 'text-gray-900'}`}>
                            {item.name}
                          </div>
                          {item.description && (
                            <div className="text-xs text-gray-500 mt-1">
                              {item.description}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">{item.quantity}</td>
                        <td className="px-3 py-3 text-right">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className={`px-3 py-3 text-right font-medium ${item.type === 'voucher' ? 'text-yellow-900' : ''}`}>
                          {formatCurrency(item.subtotal)}
                        </td>
                      </tr>

                      {/* Discount sub-rows */}
                      {item.discounts && item.discounts.length > 0 && item.discounts.map((discount, dIdx) => (
                        <tr key={`${item.id}-discount-${dIdx}`} className="bg-orange-50 border-t border-orange-100">
                          <td></td>
                          <td colSpan={3} className="px-3 py-2 pl-8 text-sm text-orange-700">
                            ↳ {discount.name}
                          </td>
                          <td className="px-3 py-2 text-right text-orange-700 font-medium">
                            -{formatCurrency(discount.amount)}
                          </td>
                        </tr>
                      ))}

                      {/* Tax sub-rows (when toggle ON and not voucher) */}
                      {taxInvoiceRequired && item.type !== 'voucher' && item.taxRate > 0 && (
                        <>
                          <tr className="bg-blue-50 border-t border-blue-100">
                            <td></td>
                            <td colSpan={3} className="px-3 py-2 pl-8 text-sm text-blue-600">
                              ↳ VAT ({item.taxRate}%)
                            </td>
                            <td className="px-3 py-2 text-right text-blue-600">
                              {formatCurrency(item.taxAmount)}
                            </td>
                          </tr>
                          <tr className="bg-green-50 border-t border-green-100">
                            <td></td>
                            <td colSpan={3} className="px-3 py-2 pl-8 text-sm font-semibold">
                              ↳ {t.totalWithTax}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold">
                              {formatCurrency(item.totalWithTax)}
                            </td>
                          </tr>
                        </>
                      )}

                      {/* No tax indicator */}
                      {taxInvoiceRequired && item.type !== 'voucher' && item.taxRate === 0 && (
                        <tr className="bg-gray-50">
                          <td></td>
                          <td colSpan={4} className="px-3 py-2 pl-8 text-sm text-gray-500 italic">
                            ↳ {t.noTax}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
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
                <span className="font-medium text-gray-900">
                  {currentStaffName || 'Admin'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-4 w-4" />
                <span>{t.bookingTime}</span>
                <span className="font-medium text-gray-900">
                  {formatDate(booking.createdAt)}
                </span>
              </div>
            </div>

            {/* Pricing Summary */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t.totalBeforeDiscount}</span>
                <span className="font-medium">{formatCurrency(subtotalBeforeDiscounts)}</span>
              </div>

              {totalDiscounts > 0 && (
                <div className="flex justify-between text-sm text-orange-600">
                  <span>{t.autoDiscounts}</span>
                  <span className="font-medium">-{formatCurrency(totalDiscounts)}</span>
                </div>
              )}

              {voucherAmount > 0 && (
                <div className="flex justify-between text-sm text-yellow-600">
                  <span>Voucher</span>
                  <span className="font-medium">-{formatCurrency(voucherAmount)}</span>
                </div>
              )}

              {(totalDiscounts > 0 || voucherAmount > 0) && (
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-gray-600">{t.subtotalAfterDiscount}</span>
                  <span className="font-medium">{formatCurrency(subtotalAfterDiscounts)}</span>
                </div>
              )}
            </div>

            {/* Tax Invoice Toggle */}
            <div className="border-t border-b py-3">
              <TaxInvoiceToggle
                bookingId={booking.id}
                initialValue={taxInvoiceRequired}
                subtotalBeforeTax={subtotalAfterDiscounts}
                calculatedTax={totalTax}
                onToggle={(newValue) => {
                  setTaxInvoiceRequired(newValue);
                  // Refresh booking data to update total_amount in Admin tab
                  onRefresh?.();
                }}
                paymentStatus={paymentStatus}
              />
            </div>

            {/* VAT Tax Amount - shown when toggle is ON */}
            {taxInvoiceRequired && totalTax > 0 && (
              <div className="flex justify-between text-sm text-blue-600">
                <span>{t.vatTax}</span>
                <span className="font-medium">+{formatCurrency(totalTax)}</span>
              </div>
            )}

            {/* Payment Summary */}
            <div className="pt-3 border-t space-y-2">
              {/* Total to Pay */}
              <div className="flex justify-between items-center">
                <span className="font-medium">{t.totalToPay}</span>
                <span className="font-bold">{formatCurrency(calculatedTotal)}</span>
              </div>

              {/* Already Paid */}
              {totalPaid > 0 && (
                <div className="flex justify-between items-center">
                  <span className="font-medium">{t.alreadyPaid}</span>
                  <span className="font-bold">{formatCurrency(totalPaid)}</span>
                </div>
              )}

              {/* Remaining */}
              {actualRemaining > 0 && (
                <div className="flex justify-between items-center text-orange-600">
                  <span className="font-medium">{t.remaining}</span>
                  <span className="font-bold">{formatCurrency(actualRemaining)}</span>
                </div>
              )}

              {/* Fully Paid indicator */}
              {actualRemaining === 0 && totalPaid > 0 && (
                <div className="flex justify-center">
                  <Badge className="bg-green-100 text-green-800 px-4 py-1">
                    {locale === 'vi' ? 'Đã thanh toán đủ' : 'Paid in Full'}
                  </Badge>
                </div>
              )}
            </div>

            {/* Paid and Checkout Button - only show when has remaining balance, can checkout, and NOT already fully paid */}
            {grandTotal > 0 && canCheckout && onPaidAndCheckout && paymentStatus !== 'fully_paid' && (
              <div className="">
                <Button
                  onClick={() => setShowCheckoutDialog(true)}
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  ) : null}
                  {t.paidCheckout}
                </Button>
              </div>
            )}

            {/* Paid Checkout Dialog */}
            <PaidCheckoutDialog
              isOpen={showCheckoutDialog}
              onClose={() => setShowCheckoutDialog(false)}
              onConfirm={(paymentMethod) => {
                setShowCheckoutDialog(false);
                onPaidAndCheckout?.(paymentMethod);
              }}
              balanceAmount={grandTotal}
              isLoading={isUpdating}
              locale={locale}
              showVatNote={taxInvoiceRequired}
            />

            {/* VAT Payment Button - Show when fully_paid but has VAT remaining */}
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

            {/* VAT Payment Dialog */}
            <Dialog open={showVatPaymentDialog} onOpenChange={setShowVatPaymentDialog}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {t.recordVatPayment}
                  </DialogTitle>
                  <DialogDescription>
                    {t.vatPaid}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">
                      {t.vatAmountToCollect}
                    </p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(actualRemaining)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.paymentMethod}</Label>
                    <RadioGroup value={vatPaymentMethod} onValueChange={setVatPaymentMethod}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cash" id="vat-cash" />
                        <Label htmlFor="vat-cash" className="font-normal">
                          {t.cash}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="bank_transfer" id="vat-bank" />
                        <Label htmlFor="vat-bank" className="font-normal">
                          {t.bankTransfer}
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowVatPaymentDialog(false)}
                    disabled={isUpdating}
                  >
                    {t.cancel}
                  </Button>
                  <Button
                    onClick={() => {
                      onAddVatPayment?.(actualRemaining, vatPaymentMethod);
                      setShowVatPaymentDialog(false);
                    }}
                    disabled={isUpdating}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    {isUpdating ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    ) : null}
                    {t.confirmReceived}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
