'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GlampingMenuProductsSelector } from '@/components/glamping-booking/GlampingMenuProductsSelector';
import { toast } from 'sonner';
import { Edit, Clock, AlertCircle, Check, X, Loader2 } from 'lucide-react';

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
      item_name: any; // JSONB: {en: string, vi: string}
      zone_name: any; // JSONB: {en: string, vi: string}
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
    name: any; // JSONB: {en: string, vi: string}
    description: any; // JSONB: {en: string, vi: string}
    unit: any; // JSONB: {en: string, vi: string}
    image_url: string;
    category_name: any; // JSONB: {en: string, vi: string}
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

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getLocalizedString(value: any, locale: string = 'vi', fallback: string = ''): string {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value[locale] || value.vi || value.en || fallback;
  }
  return fallback;
}

export default function BookingConfirmationPage() {
  const params = useParams();
  const bookingCode = params.code as string;

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingMenu, setIsEditingMenu] = useState(false);
  const [menuSelections, setMenuSelections] = useState<Record<string, number>>({});
  const [availableMenuItems, setAvailableMenuItems] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // Fetch booking details
  useEffect(() => {
    fetchBookingDetails();
  }, [bookingCode]);

  const fetchBookingDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/glamping/bookings/code/${bookingCode}/details`);
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

  const handleEditClick = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/glamping/bookings/code/${bookingCode}/available-menu-items`);
      const data = await response.json();

      if (!data.success) {
        throw new Error('Không thể tải danh sách món ăn');
      }

      setAvailableMenuItems(data.menuItems);

      // Initialize selections from current booking
      const initialSelections: Record<string, number> = {};
      booking?.menuProducts.forEach((item) => {
        initialSelections[item.menu_item_id] = item.quantity;
      });
      setMenuSelections(initialSelections);
      setIsEditingMenu(true);
    } catch (error: any) {
      toast.error(error.message || 'Lỗi khi tải danh sách món ăn');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingMenu(false);
    setMenuSelections({});
    setAvailableMenuItems([]);
  };

  const handleSaveMenu = async () => {
    // Convert selections to API format
    const menuProducts = Object.entries(menuSelections)
      .filter(([id, qty]) => qty > 0)
      .map(([id, qty]) => {
        const item = availableMenuItems.find((i) => i.id === id);
        return {
          id,
          quantity: qty,
          price: item.price,
          name: item.name,
        };
      });

    setSaving(true);
    try {
      const response = await fetch(`/api/glamping/bookings/code/${bookingCode}/menu-products`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuProducts }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Không thể cập nhật món ăn');
      }

      toast.success('Đã cập nhật món ăn thành công!', {
        description: `Tổng tiền mới: ${formatCurrency(result.updated_total_amount)}`,
      });

      await fetchBookingDetails();
      setIsEditingMenu(false);
      setAvailableMenuItems([]);
      setMenuSelections({});
    } catch (error: any) {
      if (error.message.includes('24 hours')) {
        toast.error('Đã quá hạn chỉnh sửa', {
          description: 'Chỉ có thể sửa món ăn trước check-in 24 giờ',
        });
      } else {
        toast.error(error.message);
      }
    } finally {
      setSaving(false);
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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Chi tiết đặt phòng</h1>
        <div className="flex items-center gap-3">
          <p className="text-gray-600 text-lg">#{booking.booking.booking_code}</p>
          <Badge
            variant={booking.booking.status === 'confirmed' ? 'default' : 'secondary'}
            className={
              booking.booking.status === 'confirmed'
                ? 'bg-green-600 hover:bg-green-700'
                : ''
            }
          >
            {booking.booking.status === 'confirmed' ? 'Đã xác nhận' : booking.booking.status}
          </Badge>
        </div>
      </div>

      {/* 24-hour warning */}
      {booking.canEditMenu ? (
        <Alert className="bg-blue-50 border-blue-200">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Bạn có thể chỉnh sửa món ăn trong {Math.floor(booking.hoursUntilCheckIn - 24)} giờ nữa
            (đến 24h trước khi check-in)
          </AlertDescription>
        </Alert>
      ) : booking.booking.status === 'confirmed' ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {booking.hoursUntilCheckIn <= 0
              ? 'Đã qua ngày check-in, không thể chỉnh sửa món ăn'
              : 'Đã hết thời gian chỉnh sửa món ăn (chỉ được sửa trước check-in 24 giờ)'}
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
            <div>
              <p className="text-sm text-gray-500">Số khách</p>
              <p className="font-medium">
                {booking.booking.total_guests} người ({booking.booking.guests.adults} người lớn,{' '}
                {booking.booking.guests.children} trẻ em)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accommodation Details */}
      <Card>
        <CardHeader>
          <CardTitle>Chi tiết lưu trú</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Khu vực</p>
              <p className="font-medium">{getLocalizedString(booking.booking.accommodation.zone_name, 'vi')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Loại chỗ ở</p>
              <p className="font-medium">{getLocalizedString(booking.booking.accommodation.item_name, 'vi')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Check-in</p>
              <p className="font-medium">{formatDate(booking.booking.check_in_date)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Check-out</p>
              <p className="font-medium">{formatDate(booking.booking.check_out_date)}</p>
            </div>
          </div>
          {booking.booking.special_requirements && (
            <div className="mt-4">
              <p className="text-sm text-gray-500">Yêu cầu đặc biệt</p>
              <p className="font-medium">{booking.booking.special_requirements}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Parameters */}
      {booking.parameters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Lựa chọn</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {booking.parameters.map((param, idx) => (
                <Badge key={idx} variant="outline" className="text-sm">
                  {param.label}: {param.booked_quantity}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Menu Products - EDITABLE */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Món ăn & Đồ uống</CardTitle>
            {!isEditingMenu && booking.canEditMenu && (
              <Button onClick={handleEditClick} disabled={loading}>
                <Edit className="mr-2 h-4 w-4" />
                Chỉnh sửa món
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!isEditingMenu ? (
            <div className="space-y-2">
              {booking.menuProducts.length > 0 ? (
                booking.menuProducts.map((item) => (
                  <div key={item.id} className="flex justify-between py-2 border-b last:border-b-0">
                    <div>
                      <span className="font-medium">{getLocalizedString(item.name, 'vi')}</span>
                      <span className="text-gray-500 ml-2">x {item.quantity}</span>
                    </div>
                    <span className="font-medium">{formatCurrency(item.total_price)}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">Chưa chọn món ăn</p>
              )}
            </div>
          ) : (
            <>
              <GlampingMenuProductsSelector
                menuProducts={availableMenuItems.map((item) => ({
                  id: item.id,
                  name: item.name,
                  description: item.description,
                  price: item.price,
                  unit: item.unit,
                  image_url: item.image_url,
                  is_required: false,
                  display_order: 0,
                  category_id: item.category_id,
                  category_name: item.category_name,
                }))}
                selections={menuSelections}
                onChange={setMenuSelections}
              />
              <div className="flex gap-4 mt-6">
                <Button onClick={handleSaveMenu} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Lưu thay đổi
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleCancelEdit} disabled={saving}>
                  <X className="mr-2 h-4 w-4" />
                  Hủy
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
          {booking.booking.balance_due > 0 && (
            <div className="flex justify-between text-orange-600 font-medium">
              <span>Còn thiếu:</span>
              <span>{formatCurrency(booking.booking.balance_due)}</span>
            </div>
          )}
          <div className="pt-2">
            <Badge
              variant={booking.booking.payment_status === 'paid' ? 'default' : 'secondary'}
              className={
                booking.booking.payment_status === 'paid'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-orange-500 hover:bg-orange-600'
              }
            >
              {booking.booking.payment_status === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
