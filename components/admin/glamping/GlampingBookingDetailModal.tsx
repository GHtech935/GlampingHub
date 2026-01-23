"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimpleRichTextEditor } from "@/components/ui/SimpleRichTextEditor";
import {
  User,
  MapPin,
  Calendar,
  MessageSquare,
  Phone,
  Mail,
  Users,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  Check,
  Pencil,
  Package,
  DollarSign,
  History,
  Home,
} from "lucide-react";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { useAdminLocale } from "@/components/providers/AdminI18nProvider";
import { type MultilingualText, getLocalizedText } from "@/lib/i18n-utils";
import { GlampingBookingFinancialTab } from "./GlampingBookingFinancialTab";
import { GlampingBookingProductsTab } from "./GlampingBookingProductsTab";
import { GlampingBookingPaymentsTab } from "./GlampingBookingPaymentsTab";
import GlampingBookingEmailsSection from "./GlampingBookingEmailsSection";
import { GlampingForceEditStatusDialog } from "./GlampingForceEditStatusDialog";

// Types - aligned with camping booking statuses
type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
type PaymentStatus = 'pending' | 'deposit_paid' | 'fully_paid' | 'refund_pending' | 'refunded' | 'no_refund' | 'expired';

interface BookingItem {
  id: string;
  itemId: string;
  itemName: string;
  itemSku?: string;
  parameterId?: string;
  parameterName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  metadata?: any;
}

interface BookingPayment {
  id: string;
  paymentMethod: string;
  amount: number;
  status: string;
  transactionReference?: string;
  paidAt?: string;
  createdAt: string;
}

interface BookingHistoryRecord {
  id: string;
  action: string;
  description: string;
  created_at: string;
  actor_name: string | null;
  actor_type: string;
  payment_amount: number | null;
}

interface BookingDetail {
  id: string;
  bookingCode: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  dates: {
    checkIn: string;
    checkOut: string;
    checkInTime?: string;
    checkOutTime?: string;
    nights: number;
  };
  guests: Record<string, number>;
  totalGuests: number;
  pricing: {
    subtotalAmount: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    depositDue: number;
    balanceDue: number;
    currency: string;
  };
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone: string;
    country?: string;
    address?: string;
  };
  zone: {
    id: string;
    name: MultilingualText | string;
  } | null;
  items: BookingItem[];
  payments: BookingPayment[];
  parameters: Array<{
    id: string;
    parameterId: string;
    label: string;
    bookedQuantity: number;
    controlsInventory: boolean;
  }>;
  notes: {
    customer?: string;
    internal?: string;
  };
  invoiceNotes?: string;
  specialRequirements?: string;
  partyNames?: string;
  taxInvoiceRequired?: boolean;
  taxRate?: number;
  createdAt: string;
  updatedAt?: string;
  confirmedAt?: string;
  cancelledAt?: string;
}

interface CustomerBooking {
  id: string;
  booking_code: string;
  check_in_date: string;
  check_out_date: string;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  zone_name: string;
}

interface GlampingBookingDetailModalProps {
  bookingId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

// Status helpers
const getStatusVariant = (status: BookingStatus): "default" | "secondary" | "destructive" | "outline" => {
  const variants: Record<BookingStatus, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "secondary",
    confirmed: "default",
    checked_in: "default",
    checked_out: "default",
    cancelled: "destructive",
  };
  return variants[status] || "secondary";
};

const getStatusLabel = (status: BookingStatus, locale: string): string => {
  const labels: Record<BookingStatus, { vi: string; en: string }> = {
    pending: { vi: "Chờ xác nhận", en: "Pending" },
    confirmed: { vi: "Đã xác nhận", en: "Confirmed" },
    checked_in: { vi: "Đã check-in", en: "Checked In" },
    checked_out: { vi: "Đã check-out", en: "Checked Out" },
    cancelled: { vi: "Đã huỷ", en: "Cancelled" },
  };
  return labels[status]?.[locale as 'vi' | 'en'] || status;
};

const getPaymentStatusVariant = (status: PaymentStatus): "default" | "secondary" | "destructive" | "outline" => {
  const variants: Record<PaymentStatus, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "outline",
    deposit_paid: "secondary",
    fully_paid: "default",
    refund_pending: "secondary",
    refunded: "secondary",
    no_refund: "outline",
    expired: "destructive",
  };
  return variants[status] || "outline";
};

const getPaymentStatusLabel = (status: PaymentStatus, locale: string): string => {
  const labels: Record<PaymentStatus, { vi: string; en: string }> = {
    pending: { vi: "Chờ thanh toán", en: "Pending" },
    deposit_paid: { vi: "Đã đặt cọc", en: "Deposit Paid" },
    fully_paid: { vi: "Đã thanh toán đủ", en: "Fully Paid" },
    refund_pending: { vi: "Chờ hoàn tiền", en: "Refund Pending" },
    refunded: { vi: "Đã hoàn tiền", en: "Refunded" },
    no_refund: { vi: "Không hoàn tiền", en: "No Refund" },
    expired: { vi: "Hết hạn thanh toán", en: "Expired" },
  };
  return labels[status]?.[locale as 'vi' | 'en'] || status;
};

export function GlampingBookingDetailModal({
  bookingId,
  isOpen,
  onClose,
  onUpdate,
}: GlampingBookingDetailModalProps) {
  const { locale } = useAdminLocale();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [internalNotes, setInternalNotes] = useState("");
  const [status, setStatus] = useState<BookingStatus>("pending");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending");
  const [activeTab, setActiveTab] = useState("admin");
  const [bookingHistory, setBookingHistory] = useState<BookingHistoryRecord[]>([]);

  // Edit mode states
  const [isEditingGuest, setIsEditingGuest] = useState(false);
  const [isEditingStay, setIsEditingStay] = useState(false);
  const [isEditingInvoiceNotes, setIsEditingInvoiceNotes] = useState(false);

  // Guest edit fields
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editSpecialRequirements, setEditSpecialRequirements] = useState("");
  const [editInvoiceNotes, setEditInvoiceNotes] = useState("");

  // Stay edit fields
  const [editTotalGuests, setEditTotalGuests] = useState(0);

  // Customer booking history
  const [customerBookings, setCustomerBookings] = useState<CustomerBooking[]>([]);
  const [loadingCustomerBookings, setLoadingCustomerBookings] = useState(false);

  // Force edit status dialog
  const [forceEditDialogOpen, setForceEditDialogOpen] = useState(false);

  useEffect(() => {
    if (bookingId && isOpen) {
      fetchBookingDetails();
      fetchBookingHistory();
    }
  }, [bookingId, isOpen]);

  const fetchBookingDetails = async () => {
    if (!bookingId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/glamping/bookings/${bookingId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch booking details");
      }

      const data = await response.json();
      setBooking(data);
      setInternalNotes(data.notes?.internal || "");
      setStatus(data.status);
      setPaymentStatus(data.paymentStatus);

      // Fetch customer booking history if customer exists
      if (data.customer?.id) {
        fetchCustomerBookings(data.customer.id);
      } else {
        setCustomerBookings([]);
      }
    } catch (error) {
      console.error("Failed to fetch booking:", error);
      toast.error(locale === 'vi' ? 'Không thể tải thông tin booking' : 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerBookings = async (customerId: string) => {
    if (!customerId) return;

    try {
      setLoadingCustomerBookings(true);
      const response = await fetch(`/api/admin/glamping/customers/${customerId}/bookings`);
      if (response.ok) {
        const data = await response.json();
        setCustomerBookings(data.bookings || []);
      }
    } catch (error) {
      console.error("Failed to fetch customer bookings:", error);
    } finally {
      setLoadingCustomerBookings(false);
    }
  };

  const fetchBookingHistory = async () => {
    if (!bookingId) return;

    try {
      const response = await fetch(`/api/admin/glamping/bookings/${bookingId}/history`);
      if (response.ok) {
        const data = await response.json();
        setBookingHistory(data.history || []);
      }
    } catch (error) {
      console.error("Failed to fetch booking history:", error);
    }
  };

  const handleUpdateBooking = async () => {
    if (!bookingId) return;

    try {
      setUpdating(true);

      const response = await fetch(`/api/admin/glamping/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          paymentStatus,
          internalNotes,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update booking");
      }

      toast.success(locale === 'vi' ? 'Đã cập nhật booking' : 'Booking updated');
      onUpdate?.();
      fetchBookingDetails();
      fetchBookingHistory();
    } catch (error) {
      console.error("Failed to update booking:", error);
      toast.error(locale === 'vi' ? 'Không thể cập nhật' : 'Failed to update');
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusTransition = async (newStatus: BookingStatus) => {
    if (!bookingId) return;

    try {
      setUpdating(true);

      const response = await fetch(`/api/admin/glamping/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          paymentStatus,
          internalNotes,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update booking status");
      }

      toast.success(locale === 'vi' ? 'Đã cập nhật trạng thái' : 'Status updated');
      setStatus(newStatus);
      onUpdate?.();
      fetchBookingDetails();
      fetchBookingHistory();
    } catch (error) {
      console.error("Failed to update booking status:", error);
      toast.error(locale === 'vi' ? 'Không thể cập nhật' : 'Failed to update');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveGuestInfo = async () => {
    if (!bookingId) return;

    try {
      setUpdating(true);
      const response = await fetch(`/api/admin/glamping/bookings/${bookingId}/guest`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editFirstName,
          lastName: editLastName,
          phone: editPhone,
          country: editCountry,
          address: editAddress,
          specialRequirements: editSpecialRequirements,
          invoiceNotes: editInvoiceNotes,
        }),
      });

      if (!response.ok) throw new Error("Failed to update guest info");

      toast.success(locale === 'vi' ? 'Đã cập nhật thông tin khách' : 'Guest info updated');
      setIsEditingGuest(false);
      fetchBookingDetails();
      fetchBookingHistory();
      onUpdate?.();
    } catch (error) {
      toast.error(locale === 'vi' ? 'Không thể cập nhật' : 'Failed to update');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveStayInfo = async () => {
    if (!bookingId) return;

    try {
      setUpdating(true);
      const response = await fetch(`/api/admin/glamping/bookings/${bookingId}/stay`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalGuests: editTotalGuests,
        }),
      });

      if (!response.ok) throw new Error("Failed to update stay info");

      toast.success(locale === 'vi' ? 'Đã cập nhật thông tin lưu trú' : 'Stay info updated');
      setIsEditingStay(false);
      fetchBookingDetails();
    } catch (error) {
      toast.error(locale === 'vi' ? 'Không thể cập nhật' : 'Failed to update');
    } finally {
      setUpdating(false);
    }
  };

  const startEditingGuest = () => {
    if (booking) {
      setEditFirstName(booking.customer.firstName || '');
      setEditLastName(booking.customer.lastName || '');
      setEditPhone(booking.customer.phone || '');
      setEditCountry(booking.customer.country || '');
      setEditAddress(booking.customer.address || '');
      setEditSpecialRequirements(booking.specialRequirements || '');
      setEditInvoiceNotes(booking.invoiceNotes || '');
      setIsEditingGuest(true);
    }
  };

  // Invoice notes edit handlers
  const startEditInvoiceNotes = () => {
    if (booking) {
      setEditInvoiceNotes(booking.invoiceNotes || '');
      setIsEditingInvoiceNotes(true);
    }
  };

  const cancelEditInvoiceNotes = () => {
    setIsEditingInvoiceNotes(false);
  };

  const saveInvoiceNotes = async () => {
    if (!bookingId) return;

    try {
      setUpdating(true);
      const response = await fetch(`/api/admin/glamping/bookings/${bookingId}/guest`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNotes: editInvoiceNotes,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update invoice notes");
      }

      toast.success(locale === 'vi' ? 'Đã cập nhật ghi chú' : 'Invoice notes updated');
      setIsEditingInvoiceNotes(false);
      fetchBookingDetails();
      fetchBookingHistory();
      onUpdate?.();
    } catch (error) {
      console.error("Failed to update invoice notes:", error);
      toast.error(locale === 'vi' ? 'Không thể cập nhật' : 'Failed to update');
    } finally {
      setUpdating(false);
    }
  };

  const startEditingStay = () => {
    if (booking) {
      setEditTotalGuests(booking.totalGuests || 0);
      setIsEditingStay(true);
    }
  };

  // Get next status action
  const getNextStatusAction = () => {
    const transitions: Record<BookingStatus, { nextStatus: BookingStatus; labelVi: string; labelEn: string } | null> = {
      pending: { nextStatus: 'confirmed', labelVi: 'Xác nhận', labelEn: 'Confirm' },
      confirmed: { nextStatus: 'checked_in', labelVi: 'Check-in', labelEn: 'Check In' },
      checked_in: { nextStatus: 'checked_out', labelVi: 'Check-out', labelEn: 'Check Out' },
      checked_out: null,
      cancelled: null,
    };
    return transitions[status];
  };

  // Calculate payment totals
  const calculatePaymentTotals = () => {
    if (!booking) return { totalPaid: 0, remaining: 0, total: 0 };

    const total = booking.pricing.totalAmount;
    const totalPaid = booking.payments
      .filter((p) => p.status === 'paid' || p.status === 'successful' || p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);
    const remaining = Math.max(0, total - totalPaid);

    return { totalPaid, remaining, total };
  };

  // Handle paid and checkout
  const handlePaidAndCheckout = async (paymentMethod: string) => {
    if (!bookingId || !booking) return;

    try {
      setUpdating(true);

      // Add payment
      const { remaining } = calculatePaymentTotals();
      if (remaining > 0) {
        await fetch(`/api/admin/glamping/bookings/${bookingId}/add-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: remaining,
            paymentMethod,
            paymentType: 'balance',
          }),
        });
      }

      // Update status to checked_out
      await fetch(`/api/admin/glamping/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'checked_out',
          paymentStatus: 'fully_paid',
          internalNotes,
        }),
      });

      toast.success(locale === 'vi' ? 'Đã check-out booking' : 'Booking checked out');
      onUpdate?.();
      fetchBookingDetails();
      fetchBookingHistory();
    } catch (error) {
      toast.error(locale === 'vi' ? 'Không thể cập nhật' : 'Failed to update');
    } finally {
      setUpdating(false);
    }
  };

  // Handle VAT payment
  const handleAddVatPayment = async (amount: number, paymentMethod: string) => {
    if (!bookingId) return;

    try {
      setUpdating(true);

      await fetch(`/api/admin/glamping/bookings/${bookingId}/add-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          paymentMethod,
          paymentType: 'vat_payment',
        }),
      });

      toast.success(locale === 'vi' ? 'Đã ghi nhận thanh toán VAT' : 'VAT payment recorded');
      onUpdate?.();
      fetchBookingDetails();
      fetchBookingHistory();
    } catch (error) {
      toast.error(locale === 'vi' ? 'Không thể ghi nhận' : 'Failed to record');
    } finally {
      setUpdating(false);
    }
  };

  // Handle force edit status
  const handleForceEditStatus = async (newStatus: BookingStatus, newPaymentStatus: PaymentStatus) => {
    if (!bookingId) return;

    try {
      setUpdating(true);

      const response = await fetch(`/api/admin/glamping/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          paymentStatus: newPaymentStatus,
          internalNotes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      toast.success(locale === 'vi' ? 'Đã cập nhật trạng thái' : 'Status updated');
      setStatus(newStatus);
      setPaymentStatus(newPaymentStatus);
      setForceEditDialogOpen(false);
      onUpdate?.();
      fetchBookingDetails();
      fetchBookingHistory();
    } catch (error) {
      console.error('Failed to force edit status:', error);
      toast.error(locale === 'vi' ? 'Không thể cập nhật' : 'Failed to update');
    } finally {
      setUpdating(false);
    }
  };

  if (loading || !booking) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{locale === 'vi' ? 'Đang tải...' : 'Loading...'}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const zoneName = booking.zone ? getLocalizedText(booking.zone.name, locale) : '-';
  const canModify = ['pending', 'confirmed', 'checked_in'].includes(booking.status);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {locale === 'vi' ? 'Chi tiết booking' : 'Booking Details'} #{booking.bookingCode}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="admin">{locale === 'vi' ? 'Quản lý' : 'Admin'}</TabsTrigger>
            <TabsTrigger value="guest">{locale === 'vi' ? 'Khách hàng' : 'Guest'}</TabsTrigger>
            <TabsTrigger value="stay">{locale === 'vi' ? 'Lưu trú' : 'Stay'}</TabsTrigger>
            <TabsTrigger value="products">{locale === 'vi' ? 'Sản phẩm' : 'Products'}</TabsTrigger>
            <TabsTrigger value="payments">{locale === 'vi' ? 'Thanh toán' : 'Payments'}</TabsTrigger>
            <TabsTrigger value="financial">{locale === 'vi' ? 'Tài chính' : 'Financial'}</TabsTrigger>
          </TabsList>

          {/* Admin Tab */}
          <TabsContent value="admin" className="space-y-4">
            {/* Status Stepper */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-4">
              <h3 className="font-semibold text-gray-900">
                {locale === 'vi' ? 'Trạng thái booking' : 'Booking Status'}
              </h3>

              {/* Stepper */}
              {(() => {
                const STATUS_FLOW = [
                  { status: 'pending' as BookingStatus, icon: Clock, labelVi: 'Chờ xác nhận', labelEn: 'Pending' },
                  { status: 'confirmed' as BookingStatus, icon: CheckCircle, labelVi: 'Đã xác nhận', labelEn: 'Confirmed' },
                  { status: 'checked_in' as BookingStatus, icon: Calendar, labelVi: 'Đã check-in', labelEn: 'Checked In' },
                  { status: 'checked_out' as BookingStatus, icon: Check, labelVi: 'Đã check-out', labelEn: 'Checked Out' },
                ];

                const isCancelled = status === 'cancelled';
                const currentIndex = isCancelled ? -1 : STATUS_FLOW.findIndex(s => s.status === status);

                return (
                  <div className="relative">
                    {isCancelled && (
                      <div className="flex items-center justify-center mb-4">
                        <Badge variant="destructive" className="text-sm px-4 py-1">
                          <XCircle className="h-4 w-4 mr-2" />
                          {locale === 'vi' ? 'Đã hủy' : 'Cancelled'}
                        </Badge>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      {STATUS_FLOW.map((step, index) => {
                        const Icon = step.icon;
                        const isCompleted = !isCancelled && index < currentIndex;
                        const isActive = !isCancelled && index === currentIndex;
                        const isUpcoming = isCancelled || index > currentIndex;

                        return (
                          <div key={step.status} className="flex-1 relative">
                            <div className="flex flex-col items-center">
                              <div
                                className={`
                                  w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all
                                  ${isCompleted ? 'bg-green-500 border-green-500 text-white' : ''}
                                  ${isActive ? 'bg-blue-500 border-blue-500 text-white' : ''}
                                  ${isUpcoming ? 'bg-gray-100 border-gray-300 text-gray-400' : ''}
                                `}
                              >
                                {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                              </div>
                              <span
                                className={`
                                  mt-2 text-xs font-medium text-center
                                  ${isCompleted || isActive ? 'text-gray-900' : 'text-gray-400'}
                                `}
                              >
                                {locale === 'vi' ? step.labelVi : step.labelEn}
                              </span>
                            </div>

                            {index < STATUS_FLOW.length - 1 && (
                              <div
                                className={`
                                  absolute top-5 left-1/2 w-full h-0.5 -translate-y-1/2
                                  ${!isCancelled && index < currentIndex ? 'bg-green-500' : 'bg-gray-300'}
                                `}
                                style={{ left: '55%', width: 'calc(100% - 10%)' }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Action Buttons */}
              {status !== 'cancelled' && status !== 'checked_out' && (
                <div className="flex justify-between items-center pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => handleStatusTransition('cancelled')}
                    disabled={updating}
                    className="text-destructive border-destructive hover:bg-destructive/10"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {locale === 'vi' ? 'Hủy booking' : 'Cancel'}
                  </Button>

                  {(() => {
                    const nextAction = getNextStatusAction();
                    if (!nextAction) return null;

                    return (
                      <Button
                        onClick={() => handleStatusTransition(nextAction.nextStatus)}
                        disabled={updating}
                      >
                        {updating && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />}
                        {locale === 'vi' ? nextAction.labelVi : nextAction.labelEn}
                      </Button>
                    );
                  })()}
                </div>
              )}

              {/* Force Edit Link - subtle, bottom right */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setForceEditDialogOpen(true)}
                  className="text-xs text-gray-400 hover:text-gray-600 hover:underline"
                >
                  {locale === 'vi' ? 'Sửa thủ công' : 'Manual edit'}
                </button>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {locale === 'vi' ? 'Thông tin thanh toán' : 'Payment Information'}
              </h3>

              {(() => {
                const { totalPaid, remaining, total } = calculatePaymentTotals();

                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {locale === 'vi' ? 'Trạng thái' : 'Status'}
                      </span>
                      <Badge variant={getPaymentStatusVariant(paymentStatus)}>
                        {getPaymentStatusLabel(paymentStatus, locale)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">
                          {locale === 'vi' ? 'Đã thanh toán' : 'Paid'}
                        </p>
                        <p className="font-semibold text-green-600">
                          {formatCurrency(totalPaid)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">
                          {locale === 'vi' ? 'Còn lại' : 'Remaining'}
                        </p>
                        <p className={`font-semibold ${remaining > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                          {formatCurrency(remaining)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">
                          {locale === 'vi' ? 'Tổng cộng' : 'Total'}
                        </p>
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(total)}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (totalPaid / total) * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1 text-right">
                        {Math.round((totalPaid / total) * 100)}% {locale === 'vi' ? 'đã thanh toán' : 'paid'}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Internal Notes */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {locale === 'vi' ? 'Ghi chú nội bộ' : 'Internal Notes'}
              </h3>

              <Textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder={locale === 'vi' ? 'Thêm ghi chú nội bộ...' : 'Add internal notes...'}
                rows={4}
                className="w-full"
              />
            </div>

            {/* Booking History */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <History className="h-5 w-5" />
                {locale === 'vi' ? 'Lịch sử' : 'History'}
              </h3>

              {bookingHistory.length === 0 ? (
                <p className="text-sm text-gray-500">{locale === 'vi' ? 'Chưa có lịch sử' : 'No history yet'}</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {bookingHistory.slice(0, 10).map((record) => (
                    <div key={record.id} className="flex items-start gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-gray-700">{record.description}</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(record.created_at)}
                          {record.actor_name && ` • ${record.actor_name}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose}>
                {locale === 'vi' ? 'Đóng' : 'Close'}
              </Button>
              <Button onClick={handleUpdateBooking} disabled={updating}>
                {updating
                  ? (locale === 'vi' ? 'Đang lưu...' : 'Saving...')
                  : (locale === 'vi' ? 'Lưu thay đổi' : 'Save Changes')}
              </Button>
            </div>
          </TabsContent>

          {/* Guest Tab */}
          <TabsContent value="guest" className="space-y-4">
            {/* Guest Information Card */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {locale === 'vi' ? 'Thông tin khách hàng' : 'Customer Information'}
                </h3>
                {!isEditingGuest ? (
                  <Button variant="ghost" size="sm" onClick={startEditingGuest}>
                    <Pencil className="h-4 w-4 mr-1" />
                    {locale === 'vi' ? 'Sửa' : 'Edit'}
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsEditingGuest(false)} disabled={updating}>
                      {locale === 'vi' ? 'Hủy' : 'Cancel'}
                    </Button>
                    <Button size="sm" onClick={handleSaveGuestInfo} disabled={updating}>
                      {updating ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1" />
                      ) : null}
                      {locale === 'vi' ? 'Lưu' : 'Save'}
                    </Button>
                  </div>
                )}
              </div>

              {!isEditingGuest ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">{locale === 'vi' ? 'Họ tên' : 'Full Name'}</label>
                      <p className="font-medium">{booking.customer.fullName || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">{locale === 'vi' ? 'Quốc gia' : 'Country'}</label>
                      <p className="font-medium">{booking.customer.country || '-'}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{booking.customer.email || '-'}</span>
                    </div>
                    {booking.customer.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{booking.customer.phone}</span>
                      </div>
                    )}
                    {booking.customer.address && (
                      <div className="flex items-start gap-2">
                        <Home className="h-4 w-4 text-gray-400 mt-1" />
                        <span className="text-sm">{booking.customer.address}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">{locale === 'vi' ? 'Tên' : 'First Name'}</label>
                      <Input
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">{locale === 'vi' ? 'Họ' : 'Last Name'}</label>
                      <Input
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">{locale === 'vi' ? 'Quốc gia' : 'Country'}</label>
                      <Input
                        value={editCountry}
                        onChange={(e) => setEditCountry(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">{locale === 'vi' ? 'Điện thoại' : 'Phone'}</label>
                      <Input
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600">{locale === 'vi' ? 'Địa chỉ' : 'Address'}</label>
                    <Input
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Mail className="h-4 w-4" />
                    <span>{booking.customer.email}</span>
                    <span className="text-xs text-gray-400">({locale === 'vi' ? 'không thể sửa' : 'cannot edit'})</span>
                  </div>
                </div>
              )}
            </div>

            {/* Other Details Card */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
              <h3 className="font-semibold text-gray-900">{locale === 'vi' ? 'Thông tin khác' : 'Other Information'}</h3>

              {/* Customer Notes (read-only) */}
              <div>
                <label className="text-sm text-gray-600">{locale === 'vi' ? 'Ghi chú của khách' : 'Customer Notes'}</label>
                <p className="text-sm mt-1 whitespace-pre-line">
                  {booking.notes.customer || <span className="text-gray-400 italic">{locale === 'vi' ? 'Không có' : 'None'}</span>}
                </p>
              </div>

              {/* Special Requirements */}
              {!isEditingGuest ? (
                <div>
                  <label className="text-sm text-gray-600">{locale === 'vi' ? 'Yêu cầu đặc biệt' : 'Special Requirements'}</label>
                  <p className="text-sm mt-1 whitespace-pre-line">
                    {booking.specialRequirements || <span className="text-gray-400 italic">{locale === 'vi' ? 'Không có' : 'None'}</span>}
                  </p>
                </div>
              ) : (
                <div>
                  <label className="text-sm text-gray-600">{locale === 'vi' ? 'Yêu cầu đặc biệt' : 'Special Requirements'}</label>
                  <Textarea
                    value={editSpecialRequirements}
                    onChange={(e) => setEditSpecialRequirements(e.target.value)}
                    className="mt-1"
                    rows={3}
                    placeholder={locale === 'vi' ? 'Yêu cầu đặc biệt...' : 'Special requirements...'}
                  />
                </div>
              )}

              {/* Invoice Notes - separate edit section */}
              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-600">
                    {locale === 'vi' ? 'Ghi chú xuất hoá đơn' : 'Invoice Notes'}
                  </label>
                  {!isEditingInvoiceNotes && !isEditingGuest ? (
                    <Button variant="ghost" size="sm" className="h-7 px-2" onClick={startEditInvoiceNotes}>
                      <Pencil className="h-3 w-3 mr-1" />
                      <span className="text-xs">{locale === 'vi' ? 'Sửa' : 'Edit'}</span>
                    </Button>
                  ) : isEditingInvoiceNotes ? (
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="h-7 px-2" onClick={cancelEditInvoiceNotes} disabled={updating}>
                        <span className="text-xs">{locale === 'vi' ? 'Hủy' : 'Cancel'}</span>
                      </Button>
                      <Button size="sm" className="h-7 px-2" onClick={saveInvoiceNotes} disabled={updating}>
                        {updating ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1" />
                        ) : null}
                        <span className="text-xs">{locale === 'vi' ? 'Lưu' : 'Save'}</span>
                      </Button>
                    </div>
                  ) : null}
                </div>

                {!isEditingInvoiceNotes && !isEditingGuest ? (
                  booking.invoiceNotes ? (
                    <div
                      className="text-sm prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: booking.invoiceNotes }}
                    />
                  ) : (
                    <p className="text-sm">
                      <span className="text-gray-400 italic">{locale === 'vi' ? 'Không có' : 'None'}</span>
                    </p>
                  )
                ) : isEditingInvoiceNotes ? (
                  <SimpleRichTextEditor
                    value={editInvoiceNotes}
                    onChange={setEditInvoiceNotes}
                    placeholder={locale === 'vi'
                      ? 'Nhập ghi chú xuất hoá đơn...'
                      : 'Enter invoice notes...'}
                    minHeight={80}
                  />
                ) : isEditingGuest ? (
                  <SimpleRichTextEditor
                    value={editInvoiceNotes}
                    onChange={setEditInvoiceNotes}
                    placeholder={locale === 'vi'
                      ? 'Nhập ghi chú xuất hoá đơn...'
                      : 'Enter invoice notes...'}
                    minHeight={80}
                  />
                ) : null}
              </div>
            </div>

            {/* Customer Booking History */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">
                {locale === 'vi' ? 'Lịch sử booking' : 'Booking History'}
              </h3>
              {loadingCustomerBookings ? (
                <p className="text-sm text-gray-500">{locale === 'vi' ? 'Đang tải...' : 'Loading...'}</p>
              ) : customerBookings.length === 0 ? (
                <p className="text-sm text-gray-600">
                  {locale === 'vi' ? 'Đây là booking đầu tiên của khách' : 'This is the customer\'s first booking'}
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {customerBookings.map((cb) => {
                    const isCurrentBooking = cb.id === booking.id;
                    return (
                      <div
                        key={cb.id}
                        className={cn(
                          "p-2 rounded border text-sm",
                          isCurrentBooking
                            ? "border-primary bg-primary/5"
                            : "border-gray-100 hover:bg-gray-50"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">
                            {cb.booking_code}
                            {isCurrentBooking && (
                              <span className="ml-2 text-xs text-primary">
                                ({locale === 'vi' ? 'hiện tại' : 'current'})
                              </span>
                            )}
                          </span>
                          <Badge
                            variant={
                              cb.status === 'checked_out' ? 'secondary' :
                              cb.status === 'cancelled' ? 'destructive' :
                              cb.status === 'confirmed' || cb.status === 'checked_in' ? 'default' :
                              'outline'
                            }
                            className="text-xs"
                          >
                            {cb.status === 'pending' ? (locale === 'vi' ? 'Chờ xác nhận' : 'Pending') :
                             cb.status === 'confirmed' ? (locale === 'vi' ? 'Đã xác nhận' : 'Confirmed') :
                             cb.status === 'checked_in' ? (locale === 'vi' ? 'Đã check-in' : 'Checked In') :
                             cb.status === 'checked_out' ? (locale === 'vi' ? 'Đã check-out' : 'Checked Out') :
                             cb.status === 'cancelled' ? (locale === 'vi' ? 'Đã huỷ' : 'Cancelled') :
                             cb.status}
                          </Badge>
                        </div>
                        <p className="text-gray-600 mt-1">{cb.zone_name}</p>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {formatDate(cb.check_in_date)} - {formatDate(cb.check_out_date)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
              {customerBookings.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  {locale === 'vi'
                    ? `Tổng: ${customerBookings.length} booking`
                    : `Total: ${customerBookings.length} booking${customerBookings.length > 1 ? 's' : ''}`}
                </p>
              )}
            </div>

            {/* Emails Section */}
            <GlampingBookingEmailsSection bookingId={booking.id} />
          </TabsContent>

          {/* Stay Tab */}
          <TabsContent value="stay" className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {locale === 'vi' ? 'Thông tin lưu trú' : 'Stay Information'}
                </h3>
                {canModify && !isEditingStay && (
                  <Button variant="ghost" size="sm" onClick={startEditingStay}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-gray-600">{locale === 'vi' ? 'Nhận phòng' : 'Check-in'}</label>
                  <p className="font-medium">{formatDate(booking.dates.checkIn)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">{locale === 'vi' ? 'Trả phòng' : 'Check-out'}</label>
                  <p className="font-medium">{formatDate(booking.dates.checkOut)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">{locale === 'vi' ? 'Số đêm' : 'Nights'}</label>
                  <p className="font-medium">{booking.dates.nights}</p>
                </div>
              </div>

              {/* Zone Info */}
              <div className="pt-3 border-t">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium">{zoneName}</span>
                </div>
              </div>

              {/* Guests */}
              {isEditingStay ? (
                <div className="pt-3 border-t space-y-4">
                  <div className="space-y-2">
                    <Label>{locale === 'vi' ? 'Số khách' : 'Total Guests'}</Label>
                    <Input
                      type="number"
                      min="1"
                      value={editTotalGuests}
                      onChange={(e) => setEditTotalGuests(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setIsEditingStay(false)} disabled={updating}>
                      {locale === 'vi' ? 'Hủy' : 'Cancel'}
                    </Button>
                    <Button onClick={handleSaveStayInfo} disabled={updating}>
                      {updating ? (locale === 'vi' ? 'Đang lưu...' : 'Saving...') : (locale === 'vi' ? 'Lưu' : 'Save')}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Guest Parameters */}
                  {booking.parameters.length > 0 && (
                    <div className="pt-3 border-t">
                      <label className="text-sm text-gray-600 mb-2 block">
                        {locale === 'vi' ? 'Chi tiết khách' : 'Guest Details'}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {booking.parameters.map((param) => (
                          <Badge key={param.id} variant="outline">
                            {param.label}: {param.bookedQuantity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Booked Items */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Package className="h-5 w-5" />
                {locale === 'vi' ? 'Phòng/Lều đặt' : 'Booked Rooms/Tents'}
              </h3>

              {booking.items.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  {locale === 'vi' ? 'Không có sản phẩm' : 'No items'}
                </p>
              ) : (
                <div className="space-y-3">
                  {booking.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{item.itemName || '-'}</p>
                        {item.parameterName && (
                          <p className="text-sm text-gray-600">{item.parameterName}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {item.quantity} x {formatCurrency(item.unitPrice)}
                        </p>
                      </div>
                      <p className="font-semibold">{formatCurrency(item.totalPrice)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            <GlampingBookingProductsTab
              booking={{
                id: booking.id,
                status: booking.status,
                paymentStatus: booking.paymentStatus,
              }}
              zoneId={booking.zone?.id}
              locale={locale}
              onRefresh={fetchBookingDetails}
              isUpdating={updating}
            />
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            <GlampingBookingPaymentsTab
              booking={{
                id: booking.id,
                status: booking.status,
                paymentStatus: booking.paymentStatus,
                pricing: {
                  totalAmount: booking.pricing.totalAmount,
                },
              }}
              locale={locale}
              onRefresh={fetchBookingDetails}
              isUpdating={updating}
            />
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-4">
            <GlampingBookingFinancialTab
              booking={{
                id: booking.id,
                bookingCode: booking.bookingCode,
                status: booking.status,
                paymentStatus: booking.paymentStatus,
                pricing: booking.pricing,
                payments: booking.payments,
                customer: booking.customer,
                zone: booking.zone || undefined,
                createdAt: booking.createdAt,
                taxInvoiceRequired: booking.taxInvoiceRequired,
                taxRate: booking.taxRate,
                invoiceNotes: booking.invoiceNotes,
                specialRequirements: booking.specialRequirements,
              }}
              locale={locale}
              onPaidAndCheckout={handlePaidAndCheckout}
              onAddVatPayment={handleAddVatPayment}
              isUpdating={updating}
              canCheckout={status === 'checked_in'}
              currentPaymentStatus={paymentStatus}
              currentStaffName="Admin"
              onRefresh={fetchBookingDetails}
            />
          </TabsContent>
        </Tabs>

        {/* Force Edit Status Dialog */}
        <GlampingForceEditStatusDialog
          isOpen={forceEditDialogOpen}
          onClose={() => setForceEditDialogOpen(false)}
          onConfirm={handleForceEditStatus}
          currentStatus={status}
          currentPaymentStatus={paymentStatus}
          isLoading={updating}
          locale={locale}
        />
      </DialogContent>
    </Dialog>
  );
}
