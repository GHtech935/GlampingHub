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
  CreditCard,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { type Locale } from '@/lib/i18n-utils';
import { toast } from 'react-hot-toast';
import { AddPaymentDialog } from '@/components/admin/AddPaymentDialog';
import { EditPaymentDialog } from '@/components/admin/EditPaymentDialog';
import { DeletePaymentDialog } from '@/components/admin/DeletePaymentDialog';
import { PaymentAllocationInfo } from './tabs/PaymentAllocationInfo';
import type { BookingItem } from './types';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  paymentType: string;
  paymentMethod: string;
  status: string;
  notes: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  processedAt: string | null;
}

interface GlampingBookingPaymentsTabProps {
  booking: {
    id: string;
    status: string;
    paymentStatus: string;
    pricing: {
      totalAmount: number;
    };
    items?: BookingItem[];
  };
  locale?: Locale;
  onRefresh: () => void;
  isUpdating?: boolean;
}

export function GlampingBookingPaymentsTab({
  booking,
  locale = 'vi',
  onRefresh,
  isUpdating = false,
}: GlampingBookingPaymentsTabProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [canModify, setCanModify] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const texts = {
    vi: {
      title: 'Lịch sử thanh toán',
      addPayment: 'Thêm thanh toán',
      noPayments: 'Chưa có thanh toán nào',
      date: 'Ngày',
      amount: 'Số tiền',
      type: 'Loại',
      method: 'Phương thức',
      status: 'Trạng thái',
      createdBy: 'Người tạo',
      actions: 'Thao tác',
      cash: 'Tiền mặt',
      bankTransfer: 'Chuyển khoản',
      card: 'Thẻ',
      online: 'Online',
      deposit: 'Đặt cọc',
      balance: 'Thanh toán dư',
      vatPayment: 'Thanh toán VAT',
      additional: 'Bổ sung',
      pending: 'Chờ xử lý',
      completed: 'Hoàn thành',
      failed: 'Thất bại',
      refunded: 'Đã hoàn',
      cancelled: 'Đã huỷ',
      totalPaid: 'Tổng đã thanh toán',
      remaining: 'Còn lại',
      cannotModify: 'Không thể thay đổi thanh toán cho booking này',
      loadError: 'Không thể tải lịch sử thanh toán',
      addSuccess: 'Đã thêm thanh toán',
      editSuccess: 'Đã cập nhật thanh toán',
      deleteSuccess: 'Đã xoá thanh toán',
    },
    en: {
      title: 'Payment History',
      addPayment: 'Add Payment',
      noPayments: 'No payments yet',
      date: 'Date',
      amount: 'Amount',
      type: 'Type',
      method: 'Method',
      status: 'Status',
      createdBy: 'Created By',
      actions: 'Actions',
      cash: 'Cash',
      bankTransfer: 'Bank Transfer',
      card: 'Card',
      online: 'Online',
      deposit: 'Deposit',
      balance: 'Balance',
      vatPayment: 'VAT Payment',
      additional: 'Additional',
      pending: 'Pending',
      completed: 'Completed',
      failed: 'Failed',
      refunded: 'Refunded',
      cancelled: 'Cancelled',
      totalPaid: 'Total Paid',
      remaining: 'Remaining',
      cannotModify: 'Cannot modify payments for this booking',
      loadError: 'Failed to load payment history',
      addSuccess: 'Payment added',
      editSuccess: 'Payment updated',
      deleteSuccess: 'Payment deleted',
    },
  };

  const t = texts[locale];

  // Method labels
  const getMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      cash: t.cash,
      bank_transfer: t.bankTransfer,
      card: t.card,
      online: t.online,
    };
    return methods[method] || method;
  };

  // Status badge variant
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'secondary', label: t.pending },
      completed: { variant: 'default', label: t.completed },
      paid: { variant: 'default', label: t.completed },
      successful: { variant: 'default', label: t.completed },
      failed: { variant: 'destructive', label: t.failed },
      refunded: { variant: 'outline', label: t.refunded },
      cancelled: { variant: 'destructive', label: t.cancelled },
    };
    const config = variants[status] || { variant: 'secondary' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Fetch payments
  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/glamping/bookings/${booking.id}/payments`);
        if (!response.ok) {
          throw new Error('Failed to fetch payments');
        }
        const data = await response.json();
        setPayments(data.payments || []);
        setTotalPaid(data.totalPaid || 0);
        setCanModify(data.canModify || false);
      } catch (error) {
        console.error('Error fetching payments:', error);
        toast.error(t.loadError);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [booking.id, t.loadError]);

  // Add payment handler
  const handleAddPayment = async (data: { amount: number; paymentMethod: string; notes: string }) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/glamping/bookings/${booking.id}/add-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          paymentType: 'additional',
          notes: data.notes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add payment');
      }

      toast.success(t.addSuccess);
      setShowAddDialog(false);

      // Refresh payments list
      const paymentsResponse = await fetch(`/api/admin/glamping/bookings/${booking.id}/payments`);
      const paymentsData = await paymentsResponse.json();
      setPayments(paymentsData.payments || []);
      setTotalPaid(paymentsData.totalPaid || 0);

      // Refresh parent to update totals
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Edit payment handler
  const handleEditPayment = async (data: { amount: number; paymentMethod: string; notes: string }) => {
    if (!selectedPayment) return;

    setActionLoading(true);
    try {
      const response = await fetch(
        `/api/admin/glamping/bookings/${booking.id}/payments/${selectedPayment.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update payment');
      }

      toast.success(t.editSuccess);
      setShowEditDialog(false);
      setSelectedPayment(null);

      // Refresh payments list
      const paymentsResponse = await fetch(`/api/admin/glamping/bookings/${booking.id}/payments`);
      const paymentsData = await paymentsResponse.json();
      setPayments(paymentsData.payments || []);
      setTotalPaid(paymentsData.totalPaid || 0);

      // Refresh parent to update totals
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete payment handler
  const handleDeletePayment = async (reason: string) => {
    if (!selectedPayment) return;

    setActionLoading(true);
    try {
      const response = await fetch(
        `/api/admin/glamping/bookings/${booking.id}/payments/${selectedPayment.id}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete payment');
      }

      toast.success(t.deleteSuccess);
      setShowDeleteDialog(false);
      setSelectedPayment(null);

      // Refresh payments list
      const paymentsResponse = await fetch(`/api/admin/glamping/bookings/${booking.id}/payments`);
      const paymentsData = await paymentsResponse.json();
      setPayments(paymentsData.payments || []);
      setTotalPaid(paymentsData.totalPaid || 0);

      // Refresh parent to update totals
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openEditDialog = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowEditDialog(true);
  };

  const openDeleteDialog = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowDeleteDialog(true);
  };

  const totalAmount = booking.pricing.totalAmount;
  const remainingBalance = totalAmount - totalPaid;

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
          <CreditCard className="h-5 w-5" />
          {t.title}
        </h3>
        {canModify ? (
          <Button
            size="sm"
            onClick={() => setShowAddDialog(true)}
            disabled={isUpdating || actionLoading}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t.addPayment}
          </Button>
        ) : (
          <Badge variant="secondary" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {t.cannotModify}
          </Badge>
        )}
      </div>

      {/* Payments Table */}
      {payments.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          <CreditCard className="h-12 w-12 mx-auto mb-2 text-gray-300" />
          <p>{t.noPayments}</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.date}</TableHead>
                <TableHead className="text-right">{t.amount}</TableHead>
                <TableHead>{t.method}</TableHead>
                <TableHead>{t.status}</TableHead>
                {canModify && <TableHead className="text-right">{t.actions}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="text-sm">
                    {formatDate(payment.createdAt)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell>{getMethodLabel(payment.paymentMethod)}</TableCell>
                  <TableCell>{getStatusBadge(payment.status)}</TableCell>
                  {canModify && (
                    <TableCell className="text-right">
                      {payment.status !== 'cancelled' && payment.status !== 'deleted' && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(payment)}
                            disabled={actionLoading}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(payment)}
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
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Summary */}
      <div className="flex justify-end gap-4">
        <div className="bg-green-50 px-4 py-2 rounded-lg">
          <span className="text-green-700">{t.totalPaid}:</span>
          <span className="font-bold text-green-900 ml-2">{formatCurrency(totalPaid)}</span>
        </div>
        {remainingBalance > 0 && (
          <div className="bg-amber-50 px-4 py-2 rounded-lg">
            <span className="text-amber-700">{t.remaining}:</span>
            <span className="font-bold text-amber-900 ml-2">{formatCurrency(remainingBalance)}</span>
          </div>
        )}
      </div>

      {/* Payment Allocation by Tent */}
      {booking.items && booking.items.length > 0 && (
        <PaymentAllocationInfo
          items={booking.items}
          totalPaid={totalPaid}
          totalAmount={booking.pricing.totalAmount}
          locale={locale}
        />
      )}

      {/* Dialogs */}
      <AddPaymentDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onConfirm={handleAddPayment}
        remainingBalance={remainingBalance}
        locale={locale}
        isLoading={actionLoading}
      />

      {selectedPayment && (
        <>
          <EditPaymentDialog
            isOpen={showEditDialog}
            onClose={() => {
              setShowEditDialog(false);
              setSelectedPayment(null);
            }}
            onConfirm={handleEditPayment}
            payment={selectedPayment}
            maxAllowedAmount={selectedPayment.amount + remainingBalance}
            locale={locale}
            isLoading={actionLoading}
          />

          <DeletePaymentDialog
            isOpen={showDeleteDialog}
            onClose={() => {
              setShowDeleteDialog(false);
              setSelectedPayment(null);
            }}
            onConfirm={handleDeletePayment}
            payment={selectedPayment}
            locale={locale}
            isLoading={actionLoading}
          />
        </>
      )}
    </div>
  );
}
