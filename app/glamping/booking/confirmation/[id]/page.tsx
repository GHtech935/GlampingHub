'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ConfirmationItemsList, TentData } from '@/components/glamping-booking/ConfirmationItemsList';
import { toast } from 'sonner';
import { Clock, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

interface BookingData {
  success: boolean;
  booking: {
    id: string;
    booking_code: string;
    status: string;
    payment_status: string;
    check_in_date: string;
    check_out_date: string;
    subtotal_amount: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
    deposit_due: number;
    balance_due: number;
    guests: { adults: number; children: number };
    total_guests: number;
    special_requirements: string;
    currency: string;
    accommodation: {
      item_name: any;
      zone_name: any;
      zone_id: string;
    };
    customer: {
      email: string;
      first_name: string;
      last_name: string;
      phone: string;
      country: string;
      address_line1: string;
    };
  };
  tents: TentData[];
  parameters: Array<{
    label: string;
    booked_quantity: number;
    color_code: string;
  }>;
  menuProducts: Array<{
    id: string;
    menu_item_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    name: any;
    description: any;
    unit: any;
    image_url: string;
    category_name: any;
  }>;
  canEditMenu: boolean;
  hoursUntilCheckIn: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

function getPaymentStatusLabel(status: string): { label: string; color: string } {
  switch (status) {
    case 'pending':
      return { label: 'Chờ thanh toán', color: 'bg-orange-500 hover:bg-orange-600' };
    case 'deposit_paid':
      return { label: 'Đã đặt cọc', color: 'bg-blue-500 hover:bg-blue-600' };
    case 'fully_paid':
      return { label: 'Đã thanh toán đủ', color: 'bg-green-600 hover:bg-green-700' };
    case 'paid':
      return { label: 'Đã thanh toán', color: 'bg-green-600 hover:bg-green-700' };
    default:
      return { label: status, color: 'bg-gray-500' };
  }
}

function getBookingStatusLabel(status: string): { label: string; color: string } {
  switch (status) {
    case 'pending':
      return { label: 'Đang chờ xác nhận', color: '' };
    case 'confirmed':
      return { label: 'Đã xác nhận', color: 'bg-green-600 hover:bg-green-700' };
    case 'cancelled':
      return { label: 'Đã hủy', color: 'bg-red-600 hover:bg-red-700' };
    case 'completed':
      return { label: 'Hoàn thành', color: 'bg-purple-600 hover:bg-purple-700' };
    default:
      return { label: status, color: '' };
  }
}

export default function BookingConfirmationPage() {
  const params = useParams();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch booking details
  useEffect(() => {
    fetchBookingDetails();
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/glamping/bookings/${bookingId}/details`);
      const data = await response.json();

      if (data.success) {
        setBooking(data);
      } else {
        toast.error('Không tìm thấy booking');
      }
    } catch (error) {
      toast.error('Lỗi khi tải thông tin booking');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !booking) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <span className="ml-3 text-gray-600">Đang tải...</span>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Không tìm thấy booking</AlertDescription>
        </Alert>
      </div>
    );
  }

  const bookingStatus = getBookingStatusLabel(booking.booking.status);
  const paymentStatus = getPaymentStatusLabel(booking.booking.payment_status);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Chi tiết đặt phòng</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-gray-600 text-lg">#{booking.booking.booking_code}</p>
          <Badge
            variant={booking.booking.status === 'confirmed' ? 'default' : 'secondary'}
            className={bookingStatus.color}
          >
            {bookingStatus.label}
          </Badge>
          <Badge className={paymentStatus.color}>
            {paymentStatus.label}
          </Badge>
        </div>
      </div>

      {/* Edit Permission Alert */}
      {booking.canEditMenu ? (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Bạn có thể chỉnh sửa món ăn cho từng lều. Nhấn nút &quot;Chỉnh sửa&quot; bên cạnh mỗi lều để thay đổi.
          </AlertDescription>
        </Alert>
      ) : booking.booking.status === 'confirmed' && booking.booking.payment_status === 'pending' ? (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Vui lòng thanh toán đặt cọc để có thể chỉnh sửa món ăn.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Guest Information */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin khách hàng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Họ tên</p>
              <p className="font-medium">
                {booking.booking.customer.first_name} {booking.booking.customer.last_name}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{booking.booking.customer.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Số điện thoại</p>
              <p className="font-medium">{booking.booking.customer.phone || 'N/A'}</p>
            </div>
          </div>
          {booking.booking.special_requirements && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500">Yêu cầu đặc biệt</p>
              <p className="font-medium">{booking.booking.special_requirements}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Multi-Tent Items List - NEW */}
      {booking.tents && booking.tents.length > 0 ? (
        <ConfirmationItemsList
          tents={booking.tents}
          bookingId={bookingId}
          canEditMenu={booking.canEditMenu}
          onMenuUpdated={fetchBookingDetails}
        />
      ) : (
        /* Fallback: Old single accommodation view for legacy bookings */
        <Card>
          <CardHeader>
            <CardTitle>Chi tiết lưu trú</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Khu vực</p>
                <p className="font-medium">
                  {typeof booking.booking.accommodation?.zone_name === 'object'
                    ? booking.booking.accommodation.zone_name.vi || booking.booking.accommodation.zone_name.en
                    : booking.booking.accommodation?.zone_name || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Loại chỗ ở</p>
                <p className="font-medium">
                  {typeof booking.booking.accommodation?.item_name === 'object'
                    ? booking.booking.accommodation.item_name.vi || booking.booking.accommodation.item_name.en
                    : booking.booking.accommodation?.item_name || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Check-in</p>
                <p className="font-medium">
                  {new Date(booking.booking.check_in_date).toLocaleDateString('vi-VN', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Check-out</p>
                <p className="font-medium">
                  {new Date(booking.booking.check_out_date).toLocaleDateString('vi-VN', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Tổng thanh toán</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-gray-600">
            <span>Tạm tính:</span>
            <span>{formatCurrency(booking.booking.subtotal_amount)}</span>
          </div>
          {booking.booking.tax_amount > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Thuế:</span>
              <span>{formatCurrency(booking.booking.tax_amount)}</span>
            </div>
          )}
          {booking.booking.discount_amount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Giảm giá:</span>
              <span>-{formatCurrency(booking.booking.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Tổng cộng:</span>
            <span className="text-purple-600">{formatCurrency(booking.booking.total_amount)}</span>
          </div>
          {booking.booking.deposit_due > 0 && booking.booking.deposit_due !== booking.booking.total_amount && (
            <div className="flex justify-between text-blue-600">
              <span>Tiền cọc:</span>
              <span>{formatCurrency(booking.booking.deposit_due)}</span>
            </div>
          )}
          {booking.booking.balance_due > 0 && (
            <div className="flex justify-between text-orange-600 font-medium">
              <span>Còn thiếu:</span>
              <span>{formatCurrency(booking.booking.balance_due)}</span>
            </div>
          )}
          <div className="pt-2">
            <Badge className={paymentStatus.color}>
              {paymentStatus.label}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
