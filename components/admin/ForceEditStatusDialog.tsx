"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import { type BookingStatus, type PaymentStatus } from "@/lib/booking-status";

interface ForceEditStatusDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (status: BookingStatus, paymentStatus: PaymentStatus) => void;
  currentStatus: BookingStatus;
  currentPaymentStatus: PaymentStatus;
  isLoading: boolean;
  locale: string;
}

const STATUS_OPTIONS: { value: BookingStatus; labelVi: string; labelEn: string }[] = [
  { value: 'pending', labelVi: 'Chờ xác nhận', labelEn: 'Pending' },
  { value: 'confirmed', labelVi: 'Đã xác nhận', labelEn: 'Confirmed' },
  { value: 'checked_in', labelVi: 'Đã check-in', labelEn: 'Checked In' },
  { value: 'checked_out', labelVi: 'Đã check-out', labelEn: 'Checked Out' },
  { value: 'cancelled', labelVi: 'Đã huỷ', labelEn: 'Cancelled' },
];

const PAYMENT_STATUS_OPTIONS: { value: PaymentStatus; labelVi: string; labelEn: string }[] = [
  { value: 'pending', labelVi: 'Chờ thanh toán', labelEn: 'Pending' },
  { value: 'deposit_paid', labelVi: 'Đã đặt cọc', labelEn: 'Deposit Paid' },
  { value: 'fully_paid', labelVi: 'Đã thanh toán đủ', labelEn: 'Fully Paid' },
  { value: 'refund_pending', labelVi: 'Chờ hoàn tiền', labelEn: 'Refund Pending' },
  { value: 'refunded', labelVi: 'Đã hoàn tiền', labelEn: 'Refunded' },
  { value: 'no_refund', labelVi: 'Không hoàn tiền', labelEn: 'No Refund' },
  { value: 'expired', labelVi: 'Hết hạn thanh toán', labelEn: 'Expired' },
];

export function ForceEditStatusDialog({
  isOpen,
  onClose,
  onConfirm,
  currentStatus,
  currentPaymentStatus,
  isLoading,
  locale,
}: ForceEditStatusDialogProps) {
  const [status, setStatus] = useState<BookingStatus>(currentStatus);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(currentPaymentStatus);

  // Reset to current values when dialog opens
  useEffect(() => {
    if (isOpen) {
      setStatus(currentStatus);
      setPaymentStatus(currentPaymentStatus);
    }
  }, [isOpen, currentStatus, currentPaymentStatus]);

  const handleConfirm = () => {
    onConfirm(status, paymentStatus);
  };

  const hasChanges = status !== currentStatus || paymentStatus !== currentPaymentStatus;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {locale === 'vi' ? 'Sửa trạng thái thủ công' : 'Manual Status Edit'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
            <p className="text-sm text-amber-800">
              {locale === 'vi'
                ? 'Cảnh báo: Thay đổi trạng thái thủ công có thể ảnh hưởng đến flow booking. Chỉ sử dụng khi thật sự cần thiết.'
                : 'Warning: Manual status changes may affect the booking flow. Use only when absolutely necessary.'}
            </p>
          </div>

          {/* Status Select */}
          <div className="space-y-2">
            <Label>{locale === 'vi' ? 'Trạng thái booking' : 'Booking Status'}</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as BookingStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {locale === 'vi' ? option.labelVi : option.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Status Select */}
          <div className="space-y-2">
            <Label>{locale === 'vi' ? 'Trạng thái thanh toán' : 'Payment Status'}</Label>
            <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as PaymentStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {locale === 'vi' ? option.labelVi : option.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {locale === 'vi' ? 'Huỷ' : 'Cancel'}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || !hasChanges}
            variant="default"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            ) : null}
            {locale === 'vi' ? 'Lưu thay đổi' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
