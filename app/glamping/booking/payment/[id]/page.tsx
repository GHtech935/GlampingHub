'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

interface PaymentStatus {
  success: boolean;
  payment_status: 'pending' | 'deposit_paid' | 'fully_paid' | 'refund_pending' | 'refunded' | 'no_refund' | 'expired';
  booking_code: string;
  is_expired: boolean;
  expires_at: string | null;
  transaction: {
    transaction_code: string;
    amount: number;
    description: string;
    transaction_date: string;
    bank_name: string;
  } | null;
  amounts: {
    total: number;
    deposit: number;
    balance: number;
    paid: number;
  };
}

interface PaymentInfo {
  bankName: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  description: string;
  qrCodeUrl: string;
}

export default function GlampingPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');

  // Fetch payment info
  useEffect(() => {
    async function fetchPaymentInfo() {
      try {
        const response = await fetch(`/api/glamping/bookings/${bookingId}/payment-info`);
        if (response.ok) {
          const data = await response.json();
          setPaymentInfo(data);
        }
      } catch (err) {
        console.error('Error fetching payment info:', err);
      }
    }

    fetchPaymentInfo();
  }, [bookingId]);

  // Polling payment status every 2 seconds
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    async function checkPaymentStatus() {
      try {
        const response = await fetch(`/api/glamping/bookings/${bookingId}/payment-status`);

        if (!response.ok) {
          throw new Error('Failed to check payment status');
        }

        const data: PaymentStatus = await response.json();
        setPaymentStatus(data);
        setLoading(false);

        // If payment is confirmed, redirect to confirmation page
        if (data.payment_status === 'fully_paid' || data.payment_status === 'deposit_paid') {
          clearInterval(intervalId);
          // Delay 2 seconds to show "Payment received" message
          setTimeout(() => {
            router.push(`/glamping/booking/confirmation/${bookingId}`);
          }, 2000);
        }

        // If expired, stop polling
        if (data.is_expired) {
          clearInterval(intervalId);
        }
      } catch (err) {
        console.error('Error checking payment status:', err);
        setError('Không thể kiểm tra trạng thái thanh toán');
        setLoading(false);
      }
    }

    // Check immediately
    checkPaymentStatus();

    // Then poll every 2 seconds
    intervalId = setInterval(checkPaymentStatus, 2000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [bookingId, router]);

  // Countdown timer
  useEffect(() => {
    if (!paymentStatus?.expires_at) return;

    const updateTimer = () => {
      const expiresAt = new Date(paymentStatus.expires_at!);
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Đã hết hạn');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);

    return () => clearInterval(intervalId);
  }, [paymentStatus?.expires_at]);

  // Auto-redirect when payment expires
  useEffect(() => {
    if (paymentStatus?.is_expired) {
      const timeoutId = setTimeout(() => {
        router.push('/glamping/search');
      }, 5000); // Redirect after 5 seconds

      return () => clearTimeout(timeoutId);
    }
  }, [paymentStatus?.is_expired, router]);

  if (loading && !paymentStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải thông tin thanh toán...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!paymentStatus) {
    return null;
  }

  // Determine if this is a deposit payment or full payment
  const isDepositPayment = paymentStatus.amounts.deposit > 0 && paymentStatus.amounts.balance > 0;
  const amountToPay = isDepositPayment ? paymentStatus.amounts.deposit : paymentStatus.amounts.total;

  // Use fetched payment info or create default
  const info: PaymentInfo = paymentInfo || {
    bankName: process.env.NEXT_PUBLIC_SEPAY_BANK_NAME || 'Vietcombank',
    accountNumber: process.env.NEXT_PUBLIC_SEPAY_BANK_ACCOUNT || '1234567890',
    accountName: process.env.NEXT_PUBLIC_SEPAY_ACCOUNT_HOLDER || 'GLAMPINGHUB',
    amount: amountToPay,
    description: `${paymentStatus.booking_code}${isDepositPayment ? ' DEPOSIT' : ' FULL'}`,
    qrCodeUrl: `https://img.vietqr.io/image/${process.env.NEXT_PUBLIC_SEPAY_BANK_ID || 'VCB'}-${process.env.NEXT_PUBLIC_SEPAY_BANK_ACCOUNT || '1234567890'}-compact.png?amount=${amountToPay}&addInfo=${encodeURIComponent(paymentStatus.booking_code)}&accountName=${encodeURIComponent(process.env.NEXT_PUBLIC_SEPAY_ACCOUNT_HOLDER || 'GLAMPINGHUB')}`,
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isDepositPayment ? 'Thanh toán đặt cọc' : 'Thanh toán đặt chỗ'}
          </h1>
          <p className="text-gray-600">
            Mã đặt chỗ: <span className="font-semibold">{paymentStatus.booking_code}</span>
          </p>
          {isDepositPayment && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg inline-block">
              <p className="text-sm text-blue-800">
                <strong>Lưu ý:</strong> Đây là tiền đặt cọc. Số tiền còn lại{' '}
                <span className="font-semibold">{paymentStatus.amounts.balance.toLocaleString('vi-VN')} VNĐ</span>
                {' '}sẽ thanh toán khi checkout.
              </p>
            </div>
          )}
        </div>

        {/* Payment status */}
        {paymentStatus.payment_status === 'fully_paid' || paymentStatus.payment_status === 'deposit_paid' ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-green-900">Đã nhận thanh toán!</h3>
                <p className="text-green-700">Đang chuyển đến trang xác nhận...</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Timer */}
            {!paymentStatus.is_expired && timeLeft && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-center">
                <p className="text-sm text-blue-800 mb-1">Thời gian còn lại để thanh toán</p>
                <p className="text-2xl font-bold text-blue-900">{timeLeft}</p>
              </div>
            )}

            {/* Expired warning */}
            {paymentStatus.is_expired && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="text-lg font-semibold text-red-900">Đã hết hạn thanh toán</h3>
                    <p className="text-red-700">Đang chuyển về trang tìm kiếm trong 5 giây...</p>
                  </div>
                </div>
              </div>
            )}

            {/* QR Code - only show when not expired */}
            {!paymentStatus.is_expired && (
            <div className="bg-white rounded-lg shadow-md p-8 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">
                Quét mã QR để thanh toán
              </h2>

              <div className="flex justify-center mb-6">
                <div className="relative w-64 h-64 bg-gray-100 rounded-lg overflow-hidden">
                  <Image
                    src={info.qrCodeUrl}
                    alt="QR Code thanh toán"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>

              <div className="text-center text-sm text-gray-600 mb-6">
                Mở app ngân hàng, quét mã QR và xác nhận thanh toán
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-900 mb-4">Hoặc chuyển khoản thủ công:</h3>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ngân hàng:</span>
                    <span className="font-semibold">{info.bankName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Số tài khoản:</span>
                    <span className="font-mono font-semibold">{info.accountNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Chủ tài khoản:</span>
                    <span className="font-semibold">{info.accountName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Số tiền:</span>
                    <span className="font-semibold text-green-600">
                      {info.amount.toLocaleString('vi-VN')} VNĐ
                    </span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-gray-600">Nội dung:</span>
                    <span className="font-mono font-semibold text-right bg-yellow-50 px-2 py-1 rounded">
                      {info.description}
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Lưu ý:</strong> Vui lòng nhập chính xác nội dung chuyển khoản để hệ thống tự động xác nhận thanh toán.
                  </p>
                </div>
              </div>
            </div>
            )}

            {/* Checking status indicator - only show when not expired */}
            {!paymentStatus.is_expired && (
            <div className="text-center">
              <div className="inline-flex items-center space-x-2 text-gray-600">
                <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full"></div>
                <span className="text-sm">Đang chờ xác nhận thanh toán...</span>
              </div>
            </div>
            )}
          </>
        )}

        {/* Help */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Gặp vấn đề? <a href="/contact" className="text-green-600 hover:underline">Liên hệ hỗ trợ</a>
          </p>
        </div>
      </div>
    </div>
  );
}
