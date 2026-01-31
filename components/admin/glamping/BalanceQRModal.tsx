'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import type { Locale } from '@/lib/i18n-utils';
import { Loader2, Copy, CheckCircle, QrCode, Download } from 'lucide-react';

interface PaymentInfo {
  bankName: string;
  bankId: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  description: string;
  qrCodeUrl: string;
}

interface BookingInfo {
  bookingCode: string;
  totalAmount: number;
  totalPaid: number;
  balanceDue: number;
}

interface BalanceQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  onPaymentReceived?: () => void;
  locale?: Locale;
}

const texts = {
  vi: {
    title: 'Thanh toán Balance',
    description: 'Khách hàng quét mã QR để thanh toán số tiền còn lại',
    loading: 'Đang tải thông tin thanh toán...',
    error: 'Không thể tải thông tin thanh toán',
    retry: 'Thử lại',
    close: 'Đóng',
    bankInfo: 'Thông tin chuyển khoản',
    bank: 'Ngân hàng',
    accountNumber: 'Số tài khoản',
    accountName: 'Chủ tài khoản',
    amount: 'Số tiền',
    transferContent: 'Nội dung CK',
    copy: 'Sao chép',
    copied: 'Đã sao chép!',
    scanQR: 'Quét mã QR để thanh toán',
    downloadQR: 'Tải mã QR',
    waitingPayment: 'Đang chờ thanh toán...',
    paymentReceived: 'Thanh toán thành công!',
    bookingInfo: 'Thông tin booking',
    totalAmount: 'Tổng tiền',
    paid: 'Đã thanh toán',
    remaining: 'Còn lại',
    pollingNote: 'Hệ thống sẽ tự động cập nhật khi nhận được thanh toán',
    notAvailable: 'QR thanh toán balance chỉ khả dụng cho booking đã đặt cọc',
    noBalance: 'Booking này không còn số dư cần thanh toán',
  },
  en: {
    title: 'Balance Payment',
    description: 'Customer scans QR code to pay the remaining amount',
    loading: 'Loading payment information...',
    error: 'Failed to load payment information',
    retry: 'Retry',
    close: 'Close',
    bankInfo: 'Bank Transfer Information',
    bank: 'Bank',
    accountNumber: 'Account Number',
    accountName: 'Account Holder',
    amount: 'Amount',
    transferContent: 'Transfer Content',
    copy: 'Copy',
    copied: 'Copied!',
    scanQR: 'Scan QR code to pay',
    downloadQR: 'Download QR',
    waitingPayment: 'Waiting for payment...',
    paymentReceived: 'Payment received!',
    bookingInfo: 'Booking Information',
    totalAmount: 'Total Amount',
    paid: 'Paid',
    remaining: 'Remaining',
    pollingNote: 'System will auto-update when payment is received',
    notAvailable: 'Balance payment QR only available for deposit-paid bookings',
    noBalance: 'This booking has no remaining balance',
  },
};

export function BalanceQRModal({
  isOpen,
  onClose,
  bookingId,
  onPaymentReceived,
  locale = 'vi',
}: BalanceQRModalProps) {
  const t = texts[locale];

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [bookingInfo, setBookingInfo] = useState<BookingInfo | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [paymentReceived, setPaymentReceived] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch payment info
  const fetchPaymentInfo = useCallback(async () => {
    if (!bookingId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/glamping/bookings/${bookingId}/balance-payment-info`);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 400) {
          setError(data.currentStatus === 'deposit_paid' ? t.noBalance : t.notAvailable);
        } else {
          setError(data.error || t.error);
        }
        return;
      }

      setPaymentInfo(data.paymentInfo);
      setBookingInfo(data.booking);
    } catch (err) {
      console.error('Error fetching balance payment info:', err);
      setError(t.error);
    } finally {
      setLoading(false);
    }
  }, [bookingId, t.error, t.noBalance, t.notAvailable]);

  // Check payment status (polling)
  const checkPaymentStatus = useCallback(async () => {
    if (!bookingId || paymentReceived) return;

    try {
      const response = await fetch(`/api/admin/glamping/bookings/${bookingId}`);
      if (response.ok) {
        const data = await response.json();

        // Check if payment status changed to fully_paid
        if (data.paymentStatus === 'fully_paid') {
          setPaymentReceived(true);
          toast.success(t.paymentReceived);
          onPaymentReceived?.();

          // Stop polling
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      }
    } catch (err) {
      console.error('Error checking payment status:', err);
    }
  }, [bookingId, paymentReceived, t.paymentReceived, onPaymentReceived]);

  // Fetch on open
  useEffect(() => {
    if (isOpen) {
      setPaymentReceived(false);
      fetchPaymentInfo();
    }
  }, [isOpen, fetchPaymentInfo]);

  // Start polling when modal is open and payment info is loaded
  useEffect(() => {
    if (isOpen && paymentInfo && !paymentReceived) {
      // Poll every 5 seconds
      pollingRef.current = setInterval(checkPaymentStatus, 5000);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isOpen, paymentInfo, paymentReceived, checkPaymentStatus]);

  // Handle close
  const handleClose = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setPaymentReceived(false);
    onClose();
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success(t.copied);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Download QR code
  const downloadQRCode = async () => {
    if (!paymentInfo?.qrCodeUrl || !bookingInfo?.bookingCode) return;

    try {
      const response = await fetch(paymentInfo.qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QR_${bookingInfo.bookingCode}_balance.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download QR:', err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {t.title}
          </DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
              <span className="mt-2 text-gray-500">{t.loading}</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8">
              <p className="text-red-500 text-center mb-4">{error}</p>
              <Button variant="outline" onClick={fetchPaymentInfo}>
                {t.retry}
              </Button>
            </div>
          ) : paymentReceived ? (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <p className="text-lg font-semibold text-green-600">{t.paymentReceived}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* QR Code */}
              {paymentInfo && (
                <div className="flex flex-col items-center">
                  <p className="text-sm text-gray-600 mb-2">{t.scanQR}</p>
                  <div className="border-2 border-amber-200 rounded-lg p-2 bg-white">
                    <img
                      src={paymentInfo.qrCodeUrl}
                      alt="VietQR Code"
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-gray-600"
                    onClick={downloadQRCode}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    {t.downloadQR}
                  </Button>
                </div>
              )}

              {/* Booking Info */}
              {bookingInfo && (
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">{t.bookingInfo}</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-500">{t.totalAmount}:</div>
                    <div className="font-medium text-right">{formatCurrency(bookingInfo.totalAmount)}</div>
                    <div className="text-gray-500">{t.paid}:</div>
                    <div className="font-medium text-green-600 text-right">{formatCurrency(bookingInfo.totalPaid)}</div>
                    <div className="text-gray-500">{t.remaining}:</div>
                    <div className="font-bold text-amber-600 text-right">{formatCurrency(bookingInfo.balanceDue)}</div>
                  </div>
                </div>
              )}

              {/* Bank Info - Compact */}
              {paymentInfo && (
                <div className="bg-amber-50 rounded-lg p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{paymentInfo.bankName}</span>
                    <span className="font-mono">{paymentInfo.accountNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">{t.transferContent}:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-medium text-amber-700">{paymentInfo.description}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(paymentInfo.description, 'description')}
                      >
                        {copiedField === 'description' ? (
                          <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Polling Note */}
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <span>{t.waitingPayment}</span>
              </div>
              <p className="text-xs text-center text-gray-400">{t.pollingNote}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={handleClose}>
            {t.close}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
