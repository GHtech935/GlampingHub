'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Loader2, Copy, CheckCircle, QrCode, Download, Info } from 'lucide-react';

interface PaymentInfo {
  bankName: string;
  bankId: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  description: string;
  qrCodeUrl: string;
}

interface AdminPaymentQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale: string;
  paymentMethod: 'pay_now' | 'pay_later';
  grandTotal: number;
  depositAmount: number;
  zoneId: string;
  bookingCode: string; // Actual booking code after booking is created
}

const texts = {
  vi: {
    title: 'Thanh Toán QR',
    description: 'Quét mã QR để thanh toán',
    loading: 'Đang tải thông tin thanh toán...',
    error: 'Không thể tải thông tin thanh toán',
    retry: 'Thử lại',
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
    close: 'Đóng',
    adminNote: 'QR này dùng để gửi cho khách hàng. Sau khi khách chuyển khoản, hệ thống sẽ tự động cập nhật trạng thái thanh toán.',
    bookingCreated: 'Booking đã được tạo thành công!',
  },
  en: {
    title: 'QR Payment',
    description: 'Scan QR code to pay',
    loading: 'Loading payment information...',
    error: 'Failed to load payment information',
    retry: 'Retry',
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
    close: 'Close',
    adminNote: 'This QR is for sending to customers. After the customer transfers, the system will automatically update the payment status.',
    bookingCreated: 'Booking created successfully!',
  },
};

export function AdminPaymentQRModal({
  isOpen,
  onClose,
  locale,
  paymentMethod,
  grandTotal,
  depositAmount,
  zoneId,
  bookingCode,
}: AdminPaymentQRModalProps) {
  const t = texts[locale as keyof typeof texts] || texts.vi;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Calculate the amount to pay based on payment method
  const amountToPay = paymentMethod === 'pay_later' ? depositAmount : grandTotal;

  // Fetch bank account info and generate QR
  const fetchPaymentInfo = useCallback(async () => {
    if (!zoneId || !bookingCode) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/glamping/zones/${zoneId}/bank-account`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t.error);
        return;
      }

      const bankAccount = data;
      const isDeposit = paymentMethod === 'pay_later';
      const paymentType = isDeposit ? 'DEPOSIT' : 'FULL';
      const description = `${bookingCode} ${paymentType}`;

      // Generate QR URL using VietQR
      const qrUrl = `https://img.vietqr.io/image/${bankAccount.bank_id}-${bankAccount.account_number}-compact.png?` +
        `amount=${amountToPay}&` +
        `addInfo=${encodeURIComponent(description)}&` +
        `accountName=${encodeURIComponent(bankAccount.account_holder)}`;

      setPaymentInfo({
        bankName: bankAccount.bank_name,
        bankId: bankAccount.bank_id,
        accountNumber: bankAccount.account_number,
        accountName: bankAccount.account_holder,
        amount: amountToPay,
        description,
        qrCodeUrl: qrUrl,
      });
    } catch (err) {
      console.error('Error fetching bank account info:', err);
      setError(t.error);
    } finally {
      setLoading(false);
    }
  }, [zoneId, amountToPay, paymentMethod, t.error, bookingCode]);

  // Fetch on open
  useEffect(() => {
    if (isOpen && bookingCode) {
      fetchPaymentInfo();
    }
  }, [isOpen, bookingCode, fetchPaymentInfo]);

  // Copy to clipboard
  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Download QR code
  const downloadQRCode = async () => {
    if (!paymentInfo?.qrCodeUrl || !bookingCode) return;

    try {
      const response = await fetch(paymentInfo.qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QR_${bookingCode}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download QR:', err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {t.title}
          </DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Success message */}
          <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">{t.bookingCreated}</p>
              <p className="text-sm text-green-700">Mã booking: <span className="font-mono font-bold">{bookingCode}</span></p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="mt-2 text-gray-500">{t.loading}</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8">
              <p className="text-red-500 text-center mb-4">{error}</p>
              <Button variant="outline" onClick={fetchPaymentInfo}>
                {t.retry}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* QR Code */}
              {paymentInfo && (
                <div className="flex flex-col items-center">
                  <p className="text-sm text-gray-600 mb-2">{t.scanQR}</p>
                  <div className="border-2 border-blue-200 rounded-lg p-2 bg-white">
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

              {/* Bank Info */}
              {paymentInfo && (
                <div className="bg-blue-50 rounded-lg p-3 space-y-2 text-sm">
                  <h4 className="text-sm font-medium text-gray-700">{t.bankInfo}</h4>
                  <div className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1.5">
                    <span className="text-gray-500">{t.bank}:</span>
                    <span className="font-medium">{paymentInfo.bankName}</span>

                    <span className="text-gray-500">{t.accountNumber}:</span>
                    <span className="font-mono">{paymentInfo.accountNumber}</span>

                    <span className="text-gray-500">{t.accountName}:</span>
                    <span className="font-medium">{paymentInfo.accountName}</span>

                    <span className="text-gray-500">{t.amount}:</span>
                    <span className="font-bold text-blue-700">{formatCurrency(paymentInfo.amount, locale)}</span>

                    <span className="text-gray-500">{t.transferContent}:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-medium text-blue-700">{paymentInfo.description}</span>
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

              {/* Admin Note */}
              <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{t.adminNote}</span>
              </div>

              {/* Close Button */}
              <Button
                onClick={onClose}
                variant="outline"
                className="w-full"
                size="lg"
              >
                {t.close}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
