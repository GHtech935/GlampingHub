'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Transaction {
  id: string;
  transaction_code: string;
  amount: string | number;
  description: string;
  transaction_date: string;
  bank_name: string;
  status: string;
}

interface ManualMatchTransactionModalProps {
  transaction: Transaction | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ManualMatchTransactionModal({
  transaction,
  open,
  onClose,
  onSuccess,
}: ManualMatchTransactionModalProps) {
  const [bookingReference, setBookingReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingPreview, setBookingPreview] = useState<any>(null);

  // Reset state when modal closes
  const handleClose = () => {
    setBookingReference('');
    setError(null);
    setBookingPreview(null);
    onClose();
  };

  // Validate booking reference format (GH + 8 digits)
  const isValidReference = (ref: string) => {
    return /^GH\d{8}$/i.test(ref);
  };

  // Search for booking by reference
  const handleSearchBooking = async () => {
    if (!bookingReference || !isValidReference(bookingReference)) {
      setError('Mã booking không hợp lệ. Định dạng: GH + 8 chữ số (vd: GH25000001)');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/bookings/search?reference=${bookingReference.toUpperCase()}`);
      const data = await response.json();

      if (data.success && data.booking) {
        setBookingPreview(data.booking);
      } else {
        setError(`Không tìm thấy booking: ${bookingReference.toUpperCase()}`);
        setBookingPreview(null);
      }
    } catch (err: any) {
      setError('Lỗi khi tìm kiếm booking');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle manual match
  const handleMatch = async () => {
    if (!transaction || !bookingReference) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/sepay-transactions/${transaction.id}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingReference: bookingReference.toUpperCase() }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Đã ghép giao dịch thành công!');
        onSuccess();
        handleClose();
      } else {
        setError(data.error || 'Không thể ghép giao dịch');
      }
    } catch (err: any) {
      setError('Lỗi khi ghép giao dịch');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!transaction) return null;

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(Number(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ghép giao dịch thủ công</DialogTitle>
          <DialogDescription>
            Liên kết giao dịch Sepay với booking trong hệ thống
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Transaction Details */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <h4 className="font-semibold text-sm text-gray-700">Thông tin giao dịch</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Mã GD:</span>
                <span className="ml-2 font-mono">{transaction.transaction_code}</span>
              </div>
              <div>
                <span className="text-gray-600">Số tiền:</span>
                <span className="ml-2 font-semibold text-green-600">
                  {formatCurrency(transaction.amount)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Ngân hàng:</span>
                <span className="ml-2">{transaction.bank_name}</span>
              </div>
              <div>
                <span className="text-gray-600">Ngày GD:</span>
                <span className="ml-2">{formatDate(transaction.transaction_date)}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Nội dung:</span>
                <p className="ml-2 text-gray-900 font-mono text-xs mt-1">
                  {transaction.description}
                </p>
              </div>
            </div>
          </div>

          {/* Booking Reference Input */}
          <div className="space-y-2">
            <Label htmlFor="bookingReference">Mã đặt chỗ (Booking Reference)</Label>
            <div className="flex gap-2">
              <Input
                id="bookingReference"
                placeholder="GH25000001"
                value={bookingReference}
                onChange={(e) => {
                  setBookingReference(e.target.value.toUpperCase());
                  setError(null);
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchBooking();
                  }
                }}
                className="font-mono uppercase"
                maxLength={10}
              />
              <Button
                onClick={handleSearchBooking}
                disabled={!bookingReference || loading}
                variant="outline"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Tìm kiếm'
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Định dạng: GH + 8 chữ số (ví dụ: GH25000001)
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Booking Preview */}
          {bookingPreview && (
            <div className="bg-blue-50 p-4 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold text-sm text-gray-700">Tìm thấy booking</h4>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Mã booking:</span>
                  <span className="ml-2 font-mono font-semibold">
                    {bookingPreview.booking_reference}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Khách hàng:</span>
                  <span className="ml-2">
                    {bookingPreview.guest_first_name} {bookingPreview.guest_last_name}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Tổng tiền:</span>
                  <span className="ml-2 font-semibold">
                    {formatCurrency(bookingPreview.total_amount)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Tiền cọc:</span>
                  <span className="ml-2 font-semibold">
                    {formatCurrency(bookingPreview.deposit_amount)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Trạng thái:</span>
                  <Badge variant="outline" className="ml-2">
                    {bookingPreview.payment_status}
                  </Badge>
                </div>
              </div>

              {/* Payment Type Detection */}
              <div className="border-t pt-3 mt-3">
                <PaymentTypeIndicator
                  paidAmount={Number(transaction.amount)}
                  depositAmount={Number(bookingPreview.deposit_amount)}
                  totalAmount={Number(bookingPreview.total_amount)}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Hủy
          </Button>
          <Button
            onClick={handleMatch}
            disabled={!bookingReference || !bookingPreview || loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              'Xác nhận ghép'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper component to show payment type
function PaymentTypeIndicator({
  paidAmount,
  depositAmount,
  totalAmount,
}: {
  paidAmount: number;
  depositAmount: number;
  totalAmount: number;
}) {
  const tolerance = 0.01; // 1%
  const isDeposit = Math.abs(paidAmount - depositAmount) / depositAmount < tolerance;
  const isFull = Math.abs(paidAmount - totalAmount) / totalAmount < tolerance;

  let type: 'full' | 'deposit' | 'mismatch';
  let message: string;
  let bgColor: string;

  if (isFull) {
    type = 'full';
    message = '✓ Thanh toán đủ (Full payment)';
    bgColor = 'bg-green-100 text-green-800';
  } else if (isDeposit) {
    type = 'deposit';
    message = '✓ Thanh toán cọc (Deposit)';
    bgColor = 'bg-blue-100 text-blue-800';
  } else {
    type = 'mismatch';
    message = '⚠ Số tiền không khớp - Cần xem xét';
    bgColor = 'bg-yellow-100 text-yellow-800';
  }

  return (
    <div className={`p-3 rounded-md ${bgColor}`}>
      <p className="text-sm font-semibold">{message}</p>
      {type === 'mismatch' && (
        <p className="text-xs mt-1">
          Số tiền giao dịch ({paidAmount.toLocaleString('vi-VN')} đ) không khớp với
          tiền cọc ({depositAmount.toLocaleString('vi-VN')} đ) hoặc
          tổng tiền ({totalAmount.toLocaleString('vi-VN')} đ)
        </p>
      )}
    </div>
  );
}
