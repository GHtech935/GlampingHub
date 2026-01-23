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
import { SimpleRichTextEditor } from "@/components/ui/SimpleRichTextEditor";
import { Input } from "@/components/ui/input";
import {
  User,
  MapPin,
  Calendar,
  DollarSign,
  MessageSquare,
  Phone,
  Mail,
  Car,
  Users,
  Home,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  DoorOpen,
  LogOut,
  Check,
  Pencil,
  Tent,
  Truck,
  Bus,
} from "lucide-react";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { useAdminLocale } from "@/components/providers/AdminI18nProvider";
import { type MultilingualText, getLocalizedText } from "@/lib/i18n-utils";
import { getPaymentStatusLabel, getPaymentStatusVariant, type BookingStatus, type PaymentStatus } from "@/lib/booking-status";
import { BookingFinancialTab } from "@/components/admin/BookingFinancialTab";
import { BookingProductsTab } from "@/components/admin/BookingProductsTab";
import { BookingPaymentsTab } from "@/components/admin/BookingPaymentsTab";
import { CancelBookingDialog } from "@/components/admin/CancelBookingDialog";
import { ForceEditStatusDialog } from "@/components/admin/ForceEditStatusDialog";
import BookingEmailsSection from "@/components/admin/BookingEmailsSection";
import { useTranslations } from "next-intl";
import type { BookingHistoryRecord } from "@/lib/booking-history";
import { useAuth } from "@/hooks/useAuth";

interface BookingDetail {
  id: string;
  bookingReference: string;
  guest: {
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
    phone: string;
    country: string;
    address: string;
    customerId?: string;
  };
  campsite: {
    id: string;
    name: MultilingualText | string;
    slug: string;
    address: string;
    phone: string;
  };
  pitch: {
    id: string;
    name: MultilingualText | string;
    slug: string;
    maxGuests: number;
    selectedPitchTypes?: string[];
  };
  dates: {
    checkIn: string;
    checkOut: string;
    nights: number;
  };
  guests: {
    adults: number;
    children: number;
    infants: number;
    vehicles: number;
    dogs: number;
  };
  otherDetails: {
    typeOfVisit: string;
    vehicleRegistration: string;
    specialRequirements: string;
    partyNames: string;
  };
  pricing: {
    accommodationCost: number;
    productsCost: number;
    totalAmount: number;
    depositPercentage: number;
    depositAmount: number;
    balanceAmount: number;
    commissionAmount?: number;
    ownerEarnings?: number;
    commissionPercentage?: number;
  };
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    paymentType: string;
    paymentMethod: string;
    status: string;
    createdAt: string;
    processedAt: string;
  }>;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  internalNotes: string;
  invoiceNotes?: string;
  createdAt: string;
  confirmedAt: string;
  cancelledAt: string;
  checkedInAt: string;
  checkedOutAt: string;
  taxInvoiceRequired: boolean;
  taxRate: number;
  taxAmount: number;
  hasLatePayment?: boolean;
}

interface CustomerBooking {
  id: string;
  booking_reference: string;
  check_in_date: string;
  check_out_date: string;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  campsite_name: { vi?: string; en?: string } | string;
}

interface BookingDetailModalProps {
  bookingId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export function BookingDetailModal({
  bookingId,
  isOpen,
  onClose,
  onUpdate,
}: BookingDetailModalProps) {
  const { locale } = useAdminLocale();
  const { user } = useAuth();
  const t = useTranslations('admin.bookingDetailModal');

  // Get current staff name for financial tab
  const currentStaffName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.email || 'Admin';
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [internalNotes, setInternalNotes] = useState("");
  const [status, setStatus] = useState<BookingStatus>("pending");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [forceEditDialogOpen, setForceEditDialogOpen] = useState(false);
  const [bookingHistory, setBookingHistory] = useState<BookingHistoryRecord[]>([]);
  const [customerBookings, setCustomerBookings] = useState<CustomerBooking[]>([]);
  const [loadingCustomerBookings, setLoadingCustomerBookings] = useState(false);

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
  const [editPartyNames, setEditPartyNames] = useState("");
  const [editSpecialRequirements, setEditSpecialRequirements] = useState("");
  const [editInvoiceNotes, setEditInvoiceNotes] = useState("");

  // Stay edit fields
  const [editAdults, setEditAdults] = useState(0);
  const [editChildren, setEditChildren] = useState(0);

  // Tab control
  const [activeTab, setActiveTab] = useState("admin");

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
      const response = await fetch(`/api/admin/bookings/${bookingId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch booking details");
      }

      const data = await response.json();
      setBooking(data);
      setInternalNotes(data.internalNotes || "");
      setStatus(data.status);
      setPaymentStatus(data.paymentStatus);

      // Fetch customer's booking history if customerId exists
      if (data.guest?.customerId) {
        fetchCustomerBookings(data.guest.customerId);
      } else {
        setCustomerBookings([]);
      }
    } catch (error) {
      console.error("Failed to fetch booking:", error);
      toast.error(t('fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const fetchBookingHistory = async () => {
    if (!bookingId) return;

    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/history`);
      if (response.ok) {
        const data = await response.json();
        setBookingHistory(data.history || []);
      }
    } catch (error) {
      console.error("Failed to fetch booking history:", error);
    }
  };

  const fetchCustomerBookings = async (customerId: string) => {
    if (!customerId) return;

    try {
      setLoadingCustomerBookings(true);
      const response = await fetch(`/api/admin/customers/${customerId}`);
      if (response.ok) {
        const data = await response.json();
        setCustomerBookings(data.data?.bookings || []);
      }
    } catch (error) {
      console.error("Failed to fetch customer bookings:", error);
    } finally {
      setLoadingCustomerBookings(false);
    }
  };

  const handleUpdateBooking = async () => {
    if (!bookingId) return;

    try {
      setUpdating(true);

      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
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

      toast.success(t('updateSuccess'));
      onUpdate?.();
      fetchBookingDetails(); // Refresh data
      fetchBookingHistory();
    } catch (error) {
      console.error("Failed to update booking:", error);
      toast.error(t('updateError'));
    } finally {
      setUpdating(false);
    }
  };

  // Handle status transition (confirm, check-in, check-out)
  const handleStatusTransition = async (newStatus: BookingStatus) => {
    if (!bookingId) return;

    // If trying to checkout but payment not complete, switch to financial tab
    if (newStatus === 'checked_out' && paymentStatus !== 'fully_paid') {
      setActiveTab('financial');
      toast(locale === 'vi'
        ? 'Khách chưa thanh toán đủ. Vui lòng xác nhận thanh toán trước khi checkout.'
        : 'Payment not complete. Please confirm payment before checkout.',
        { icon: '⚠️' }
      );
      return;
    }

    try {
      setUpdating(true);

      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
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

      toast.success(t('updateSuccess'));
      setStatus(newStatus);
      onUpdate?.();
      fetchBookingDetails();
      fetchBookingHistory();
    } catch (error) {
      console.error("Failed to update booking status:", error);
      toast.error(t('updateError'));
    } finally {
      setUpdating(false);
    }
  };

  // Handle paid and checkout (from financial tab)
  const handlePaidAndCheckout = async (paymentMethod: string) => {
    if (!bookingId) return;

    try {
      setUpdating(true);

      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: 'checked_out',
          paymentStatus: 'fully_paid',
          createPaymentRecord: true,
          paymentMethod: paymentMethod,
          internalNotes,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to checkout");
      }

      toast.success(locale === 'vi' ? 'Đã checkout và xác nhận thanh toán' : 'Checked out and payment confirmed');
      setStatus('checked_out');
      setPaymentStatus('fully_paid');
      setActiveTab('admin');
      onUpdate?.();
      fetchBookingDetails();
      fetchBookingHistory();
    } catch (error) {
      console.error("Failed to paid and checkout:", error);
      toast.error(locale === 'vi' ? 'Không thể checkout' : 'Failed to checkout');
    } finally {
      setUpdating(false);
    }
  };

  // Handle add VAT payment (from financial tab)
  const handleAddVatPayment = async (amount: number, paymentMethod: string) => {
    if (!bookingId) return;

    try {
      setUpdating(true);

      const response = await fetch(`/api/admin/bookings/${bookingId}/add-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          paymentMethod,
          paymentType: 'vat_payment',
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add payment");
      }

      toast.success(locale === 'vi' ? 'Đã ghi nhận thanh toán VAT' : 'VAT payment recorded');
      onUpdate?.();
      fetchBookingDetails();
      fetchBookingHistory();
    } catch (error) {
      console.error("Failed to add VAT payment:", error);
      toast.error(locale === 'vi' ? 'Không thể ghi nhận thanh toán' : 'Failed to record payment');
    } finally {
      setUpdating(false);
    }
  };

  // Handle cancel booking
  const handleCancelBooking = async (reason: string, cancelPaymentStatus: PaymentStatus) => {
    if (!bookingId) return;

    try {
      setUpdating(true);

      // Format cancellation note
      const now = new Date();
      const dateStr = now.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const cancelNote = `[${dateStr}] ${locale === 'vi' ? 'Huỷ booking - Lý do' : 'Booking cancelled - Reason'}: ${reason}`;
      const updatedNotes = internalNotes ? `${internalNotes}\n\n${cancelNote}` : cancelNote;

      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: 'cancelled' as BookingStatus,
          paymentStatus: cancelPaymentStatus,
          internalNotes: updatedNotes,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to cancel booking");
      }

      toast.success(locale === 'vi' ? 'Đã huỷ booking' : 'Booking cancelled');
      setStatus('cancelled');
      setPaymentStatus(cancelPaymentStatus);
      setInternalNotes(updatedNotes);
      setCancelDialogOpen(false);
      onUpdate?.();
      fetchBookingDetails();
      fetchBookingHistory();
    } catch (error) {
      console.error("Failed to cancel booking:", error);
      toast.error(locale === 'vi' ? 'Không thể huỷ booking' : 'Failed to cancel booking');
    } finally {
      setUpdating(false);
    }
  };

  // Calculate payment totals from actual payment records
  const calculatePaymentTotals = () => {
    if (!booking) return { totalPaid: 0, remaining: 0, total: 0 };

    // total_amount is a generated column that already includes tax when taxInvoiceRequired=true
    const total = booking.pricing.totalAmount;

    const totalPaid = booking.payments
      .filter((p: { status: string }) => p.status === 'successful' || p.status === 'completed' || p.status === 'success')
      .reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);

    const remaining = Math.max(0, total - totalPaid);

    return { totalPaid, remaining, total };
  };

  // Handle force edit status
  const handleForceEditStatus = async (newStatus: BookingStatus, newPaymentStatus: PaymentStatus) => {
    if (!bookingId) return;

    try {
      setUpdating(true);

      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          paymentStatus: newPaymentStatus,
          internalNotes,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to force update booking");
      }

      toast.success(locale === 'vi' ? 'Đã cập nhật trạng thái' : 'Status updated');
      setStatus(newStatus);
      setPaymentStatus(newPaymentStatus);
      setForceEditDialogOpen(false);
      onUpdate?.();
      fetchBookingDetails();
      fetchBookingHistory();
    } catch (error) {
      console.error("Failed to force update booking:", error);
      toast.error(locale === 'vi' ? 'Không thể cập nhật' : 'Failed to update');
    } finally {
      setUpdating(false);
    }
  };

  // Guest edit handlers
  const startEditGuest = () => {
    if (!booking) return;
    setEditFirstName(booking.guest.firstName || "");
    setEditLastName(booking.guest.lastName || "");
    setEditPhone(booking.guest.phone || "");
    setEditCountry(booking.guest.country || "");
    setEditAddress(booking.guest.address || "");
    setEditPartyNames(booking.otherDetails.partyNames || "");
    setEditSpecialRequirements(booking.otherDetails.specialRequirements || "");
    setEditInvoiceNotes(booking.invoiceNotes || "");
    setIsEditingGuest(true);
  };

  const cancelEditGuest = () => {
    setIsEditingGuest(false);
  };

  // Invoice notes edit handlers
  const startEditInvoiceNotes = () => {
    if (!booking) return;
    setEditInvoiceNotes(booking.invoiceNotes || "");
    setIsEditingInvoiceNotes(true);
  };

  const cancelEditInvoiceNotes = () => {
    setIsEditingInvoiceNotes(false);
  };

  const saveInvoiceNotes = async () => {
    if (!bookingId) return;

    try {
      setUpdating(true);
      const response = await fetch(`/api/admin/bookings/${bookingId}/guest`, {
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

  const saveGuestInfo = async () => {
    if (!bookingId) return;

    try {
      setUpdating(true);
      const response = await fetch(`/api/admin/bookings/${bookingId}/guest`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editFirstName,
          lastName: editLastName,
          phone: editPhone,
          country: editCountry,
          address: editAddress,
          partyNames: editPartyNames,
          specialRequirements: editSpecialRequirements,
          invoiceNotes: editInvoiceNotes,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update guest info");
      }

      toast.success(locale === 'vi' ? 'Đã cập nhật thông tin khách' : 'Guest info updated');
      setIsEditingGuest(false);
      fetchBookingDetails();
      fetchBookingHistory();
      onUpdate?.();
    } catch (error) {
      console.error("Failed to update guest info:", error);
      toast.error(locale === 'vi' ? 'Không thể cập nhật' : 'Failed to update');
    } finally {
      setUpdating(false);
    }
  };

  // Stay edit handlers
  const startEditStay = () => {
    if (!booking) return;
    setEditAdults(booking.guests.adults || 0);
    setEditChildren(booking.guests.children || 0);
    setIsEditingStay(true);
  };

  const cancelEditStay = () => {
    setIsEditingStay(false);
  };

  const saveStayInfo = async () => {
    if (!bookingId) return;

    try {
      setUpdating(true);
      const response = await fetch(`/api/admin/bookings/${bookingId}/stay`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adults: editAdults,
          children: editChildren,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update stay info");
      }

      toast.success(locale === 'vi' ? 'Đã cập nhật thông tin lưu trú' : 'Stay info updated');
      setIsEditingStay(false);
      fetchBookingDetails();
      fetchBookingHistory();
      onUpdate?.();
    } catch (error) {
      console.error("Failed to update stay info:", error);
      toast.error(locale === 'vi' ? 'Không thể cập nhật' : 'Failed to update');
    } finally {
      setUpdating(false);
    }
  };

  // Get next status for action button
  const getNextStatusAction = () => {
    const transitions: Record<BookingStatus, { nextStatus: BookingStatus; labelVi: string; labelEn: string } | null> = {
      pending: { nextStatus: 'confirmed', labelVi: 'Xác nhận', labelEn: 'Confirm' },
      confirmed: { nextStatus: 'checked_in', labelVi: 'Check-in', labelEn: 'Check-in' },
      checked_in: { nextStatus: 'checked_out', labelVi: 'Check-out', labelEn: 'Check-out' },
      checked_out: null,
      completed: null,
      no_show: null,
      cancelled: null,
    };
    return transitions[status];
  };

  if (loading || !booking) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('loading')}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Extract localized text for multilingual fields
  const campsiteName = getLocalizedText(booking.campsite.name, locale);
  const pitchName = getLocalizedText(booking.pitch.name, locale);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {t('title', { reference: booking.bookingReference })}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="admin">{t('tabs.admin')}</TabsTrigger>
            <TabsTrigger value="guest">{t('tabs.guest')}</TabsTrigger>
            <TabsTrigger value="stay">{t('tabs.stay')}</TabsTrigger>
            <TabsTrigger value="products">{locale === 'vi' ? 'Sản phẩm' : 'Products'}</TabsTrigger>
            <TabsTrigger value="payments">{locale === 'vi' ? 'Thanh toán' : 'Payments'}</TabsTrigger>
            <TabsTrigger value="financial">{t('tabs.financial')}</TabsTrigger>
          </TabsList>

          {/* Guest Information Tab */}
          <TabsContent value="guest" className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t('guestInfo.title')}
                </h3>
                {!isEditingGuest ? (
                  <Button variant="ghost" size="sm" onClick={startEditGuest}>
                    <Pencil className="h-4 w-4 mr-1" />
                    {locale === 'vi' ? 'Sửa' : 'Edit'}
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={cancelEditGuest} disabled={updating}>
                      {locale === 'vi' ? 'Huỷ' : 'Cancel'}
                    </Button>
                    <Button size="sm" onClick={saveGuestInfo} disabled={updating}>
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
                      <label className="text-sm text-gray-600">{t('guestInfo.fullName')}</label>
                      <p className="font-medium">{booking.guest.fullName}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">{t('guestInfo.country')}</label>
                      <p className="font-medium">{booking.guest.country}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{booking.guest.email}</span>
                    </div>
                    {booking.guest.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{booking.guest.phone}</span>
                      </div>
                    )}
                    {booking.guest.address && (
                      <div className="flex items-start gap-2">
                        <Home className="h-4 w-4 text-gray-400 mt-1" />
                        <span className="text-sm">{booking.guest.address}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">{locale === 'vi' ? 'Họ' : 'First Name'}</label>
                      <Input
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">{locale === 'vi' ? 'Tên' : 'Last Name'}</label>
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
                    <span>{booking.guest.email}</span>
                    <span className="text-xs text-gray-400">({locale === 'vi' ? 'không thể sửa' : 'cannot edit'})</span>
                  </div>
                </div>
              )}
            </div>

            {/* Thông tin khác */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
              <h3 className="font-semibold text-gray-900">{t('guestInfo.otherInfo')}</h3>

              {!isEditingGuest ? (
                <>
                  <div>
                    <label className="text-sm text-gray-600">{t('guestInfo.partyNames')}</label>
                    <p className="text-sm mt-1 whitespace-pre-line">
                      {booking.otherDetails.partyNames || <span className="text-gray-400 italic">{t('guestInfo.noData')}</span>}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600">{t('guestInfo.specialRequirements')}</label>
                    <p className="text-sm mt-1 whitespace-pre-line">
                      {booking.otherDetails.specialRequirements || <span className="text-gray-400 italic">{t('guestInfo.noData')}</span>}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-sm text-gray-600">{t('guestInfo.partyNames')}</label>
                    <Textarea
                      value={editPartyNames}
                      onChange={(e) => setEditPartyNames(e.target.value)}
                      className="mt-1"
                      rows={3}
                      placeholder={locale === 'vi' ? 'Tên các thành viên trong nhóm...' : 'Names of party members...'}
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-600">{t('guestInfo.specialRequirements')}</label>
                    <Textarea
                      value={editSpecialRequirements}
                      onChange={(e) => setEditSpecialRequirements(e.target.value)}
                      className="mt-1"
                      rows={3}
                      placeholder={locale === 'vi' ? 'Yêu cầu đặc biệt...' : 'Special requirements...'}
                    />
                  </div>
                </>
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
                        <span className="text-xs">{locale === 'vi' ? 'Huỷ' : 'Cancel'}</span>
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
                      <span className="text-gray-400 italic">{t('guestInfo.noData')}</span>
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

            {/* Booking History */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">
                {t('guestInfo.bookingHistory')}
              </h3>
              {loadingCustomerBookings ? (
                <p className="text-sm text-gray-500">{locale === 'vi' ? 'Đang tải...' : 'Loading...'}</p>
              ) : customerBookings.length === 0 ? (
                <p className="text-sm text-gray-600">
                  {t('guestInfo.firstBooking')}
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {customerBookings.map((cb) => {
                    const campsiteName = typeof cb.campsite_name === 'object'
                      ? (locale === 'vi' ? cb.campsite_name.vi : cb.campsite_name.en) || cb.campsite_name.vi || cb.campsite_name.en
                      : cb.campsite_name;
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
                            {cb.booking_reference}
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
                            {cb.status === 'pending' ? (locale === 'vi' ? 'Chờ xử lý' : 'Pending') :
                             cb.status === 'confirmed' ? (locale === 'vi' ? 'Đã xác nhận' : 'Confirmed') :
                             cb.status === 'checked_in' ? (locale === 'vi' ? 'Đã check-in' : 'Checked in') :
                             cb.status === 'checked_out' ? (locale === 'vi' ? 'Đã check-out' : 'Checked out') :
                             cb.status === 'cancelled' ? (locale === 'vi' ? 'Đã huỷ' : 'Cancelled') :
                             cb.status}
                          </Badge>
                        </div>
                        <p className="text-gray-600 mt-1">{campsiteName}</p>
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

            {/* Email History */}
            <BookingEmailsSection bookingId={booking.id} />
          </TabsContent>

          {/* Stay Details Tab */}
          <TabsContent value="stay" className="space-y-4">
            {/* Campsite Info */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <MapPin className="h-5 w-5" />
                {t('stayInfo.campsiteTitle')}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Left: Campsite details */}
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-lg">{campsiteName}</p>
                    <p className="text-sm text-gray-600">{pitchName}</p>
                  </div>

                  {booking.campsite.address && (
                    <p className="text-sm text-gray-600">
                      {booking.campsite.address}
                    </p>
                  )}
                  {booking.campsite.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{booking.campsite.phone}</span>
                    </div>
                  )}
                </div>

                {/* Right: Pitch types */}
                {booking.pitch.selectedPitchTypes && booking.pitch.selectedPitchTypes.length > 0 && (
                  <div className="border-l border-gray-200 pl-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      {locale === 'vi' ? 'Loại lều' : 'Accommodation Type'}
                    </p>
                    <div className="space-y-2">
                      {booking.pitch.selectedPitchTypes.map((pitchType) => {
                        const pitchTypeConfig: Record<string, { icon: React.ReactNode; labelVi: string; labelEn: string }> = {
                          tent: { icon: <Tent className="h-5 w-5" />, labelVi: 'Lều', labelEn: 'Tent' },
                          roof_tent: { icon: <Tent className="h-5 w-5" />, labelVi: 'Lều nóc xe', labelEn: 'Roof tent' },
                          trailer_tent: { icon: <Tent className="h-5 w-5" />, labelVi: 'Lều kéo', labelEn: 'Trailer tent' },
                          campervan: { icon: <Truck className="h-5 w-5" />, labelVi: 'Campervan', labelEn: 'Campervan' },
                          motorhome: { icon: <Truck className="h-5 w-5" />, labelVi: 'Motorhome', labelEn: 'Motorhome' },
                          touring_caravan: { icon: <Bus className="h-5 w-5" />, labelVi: 'Caravan du lịch', labelEn: 'Touring caravan' },
                        };
                        const config = pitchTypeConfig[pitchType];
                        if (!config) return null;
                        return (
                          <div key={pitchType} className="flex items-center gap-2 text-gray-700">
                            <span className="text-primary">{config.icon}</span>
                            <span className="text-sm">{locale === 'vi' ? config.labelVi : config.labelEn}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t('stayInfo.datesTitle')}
              </h3>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-gray-600">{t('stayInfo.checkIn')}</label>
                  <p className="font-medium">
                    {formatDate(booking.dates.checkIn)}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">{t('stayInfo.checkOut')}</label>
                  <p className="font-medium">
                    {formatDate(booking.dates.checkOut)}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">{t('stayInfo.nights')}</label>
                  <p className="font-medium">{t('stayInfo.nightsCount', { count: booking.dates.nights })}</p>
                </div>
              </div>
            </div>

            {/* Guests */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t('stayInfo.guestsTitle')}
                </h3>
                {!isEditingStay ? (
                  <Button variant="ghost" size="sm" onClick={startEditStay}>
                    <Pencil className="h-4 w-4 mr-1" />
                    {locale === 'vi' ? 'Sửa' : 'Edit'}
                  </Button>
                ) : (
                  (() => {
                    const maxGuests = booking.pitch.maxGuests || 10;
                    const totalGuests = editAdults + editChildren;
                    const isInvalid = editAdults < 1 || totalGuests > maxGuests;

                    return (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={cancelEditStay} disabled={updating}>
                          {locale === 'vi' ? 'Huỷ' : 'Cancel'}
                        </Button>
                        <Button size="sm" onClick={saveStayInfo} disabled={updating || isInvalid}>
                          {updating ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1" />
                          ) : null}
                          {locale === 'vi' ? 'Lưu' : 'Save'}
                        </Button>
                      </div>
                    );
                  })()
                )}
              </div>

              {!isEditingStay ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">{t('stayInfo.adults')}</label>
                      <p className="font-medium">{booking.guests.adults}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">{t('stayInfo.children')}</label>
                      <p className="font-medium">{booking.guests.children}</p>
                    </div>
                  </div>

                  {(booking.guests.infants > 0 || booking.guests.vehicles > 0 || booking.guests.dogs > 0) && (
                    <div className="grid grid-cols-3 gap-4">
                      {booking.guests.infants > 0 && (
                        <div>
                          <label className="text-sm text-gray-600">{locale === 'vi' ? 'Trẻ sơ sinh' : 'Infants'}</label>
                          <p className="font-medium">{booking.guests.infants}</p>
                        </div>
                      )}
                      {booking.guests.vehicles > 0 && (
                        <div>
                          <label className="text-sm text-gray-600">{locale === 'vi' ? 'Xe' : 'Vehicles'}</label>
                          <p className="font-medium">{booking.guests.vehicles}</p>
                        </div>
                      )}
                      {booking.guests.dogs > 0 && (
                        <div>
                          <label className="text-sm text-gray-600">{locale === 'vi' ? 'Chó' : 'Dogs'}</label>
                          <p className="font-medium">{booking.guests.dogs}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {booking.otherDetails.vehicleRegistration && (
                    <div className="flex items-center gap-2 mt-2">
                      <Car className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">
                        {t('stayInfo.vehicleRegistration')}: {booking.otherDetails.vehicleRegistration}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                (() => {
                  const maxGuests = booking.pitch.maxGuests || 10;
                  const totalGuests = editAdults + editChildren;
                  const isOverLimit = totalGuests > maxGuests;
                  const isInvalid = editAdults < 1 || isOverLimit;

                  return (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-gray-600">{t('stayInfo.adults')}</label>
                          <Input
                            type="number"
                            min="1"
                            max={maxGuests}
                            value={editAdults}
                            onChange={(e) => setEditAdults(parseInt(e.target.value) || 0)}
                            className={`mt-1 ${editAdults < 1 ? 'border-red-500' : ''}`}
                          />
                          {editAdults < 1 && (
                            <p className="text-xs text-red-500 mt-1">
                              {locale === 'vi' ? 'Tối thiểu 1 người lớn' : 'At least 1 adult required'}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">{t('stayInfo.children')}</label>
                          <Input
                            type="number"
                            min="0"
                            max={maxGuests - 1}
                            value={editChildren}
                            onChange={(e) => setEditChildren(parseInt(e.target.value) || 0)}
                            className="mt-1"
                          />
                        </div>
                      </div>

                      {/* Total and Max info */}
                      <div className={`text-sm ${isOverLimit ? 'text-red-500' : 'text-gray-500'}`}>
                        {locale === 'vi'
                          ? `Tổng: ${totalGuests}/${maxGuests} khách`
                          : `Total: ${totalGuests}/${maxGuests} guests`}
                        {isOverLimit && (
                          <span className="ml-2 font-medium">
                            {locale === 'vi' ? '(Vượt quá giới hạn!)' : '(Exceeds limit!)'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <BookingProductsTab
                booking={booking}
                locale={locale}
                onRefresh={fetchBookingDetails}
                isUpdating={updating}
              />
            </div>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <BookingPaymentsTab
                booking={booking}
                locale={locale}
                onRefresh={fetchBookingDetails}
                isUpdating={updating}
              />
            </div>
          </TabsContent>

          {/* Financial Breakdown Tab */}
          <TabsContent value="financial" className="space-y-6">
            {/* New Financial Tab Component */}
            <BookingFinancialTab
              booking={booking}
              locale={locale}
              onPaidAndCheckout={handlePaidAndCheckout}
              onAddVatPayment={handleAddVatPayment}
              isUpdating={updating}
              canCheckout={status === 'checked_in'}
              currentPaymentStatus={paymentStatus}
              currentStaffName={currentStaffName}
              onRefresh={fetchBookingDetails}
            />
          </TabsContent>

          {/* Admin Actions Tab */}
          <TabsContent value="admin" className="space-y-4">
            {/* Status Stepper */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-4">
              <h3 className="font-semibold text-gray-900">{t('adminActions.statusTitle')}</h3>

              {/* Stepper */}
              {(() => {
                const STATUS_FLOW = [
                  { status: 'pending' as BookingStatus, icon: Clock, labelVi: 'Chờ xác nhận', labelEn: 'Pending' },
                  { status: 'confirmed' as BookingStatus, icon: CheckCircle, labelVi: 'Đã xác nhận', labelEn: 'Confirmed' },
                  { status: 'checked_in' as BookingStatus, icon: DoorOpen, labelVi: 'Đã check-in', labelEn: 'Checked In' },
                  { status: 'checked_out' as BookingStatus, icon: LogOut, labelVi: 'Đã check-out', labelEn: 'Checked Out' },
                ];

                const isCancelled = status === 'cancelled';
                const currentIndex = isCancelled ? -1 : STATUS_FLOW.findIndex(s => s.status === status);

                return (
                  <div className="relative">
                    {/* Cancelled Badge */}
                    {isCancelled && (
                      <div className="flex items-center justify-center mb-4">
                        <Badge variant="destructive" className="text-sm px-4 py-1">
                          <XCircle className="h-4 w-4 mr-2" />
                          {locale === 'vi' ? 'Đã huỷ' : 'Cancelled'}
                        </Badge>
                      </div>
                    )}

                    {/* Stepper Container */}
                    <div className="flex items-center justify-between">
                      {STATUS_FLOW.map((step, index) => {
                        const Icon = step.icon;
                        const isCompleted = !isCancelled && index < currentIndex;
                        const isActive = !isCancelled && index === currentIndex;
                        const isUpcoming = isCancelled || index > currentIndex;

                        return (
                          <div key={step.status} className="flex-1 relative">
                            <div className="flex flex-col items-center">
                              {/* Icon Circle */}
                              <div
                                className={`
                                  w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all
                                  ${isCompleted ? 'bg-green-500 border-green-500 text-white' : ''}
                                  ${isActive ? 'bg-blue-500 border-blue-500 text-white' : ''}
                                  ${isUpcoming ? 'bg-gray-100 border-gray-300 text-gray-400' : ''}
                                `}
                              >
                                {isCompleted ? (
                                  <Check className="h-5 w-5" />
                                ) : (
                                  <Icon className="h-5 w-5" />
                                )}
                              </div>
                              {/* Label */}
                              <span
                                className={`
                                  mt-2 text-xs font-medium text-center
                                  ${isCompleted || isActive ? 'text-gray-900' : 'text-gray-400'}
                                `}
                              >
                                {locale === 'vi' ? step.labelVi : step.labelEn}
                              </span>
                            </div>

                            {/* Connector Line */}
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
                  {/* Cancel Button - Left */}
                  <Button
                    variant="outline"
                    onClick={() => setCancelDialogOpen(true)}
                    disabled={updating}
                    className="text-destructive border-destructive hover:bg-destructive/10"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {locale === 'vi' ? 'Huỷ booking' : 'Cancel'}
                  </Button>

                  {/* Next Status Button - Right */}
                  {(() => {
                    const nextAction = getNextStatusAction();
                    if (!nextAction) return null;

                    return (
                      <Button
                        onClick={() => handleStatusTransition(nextAction.nextStatus)}
                        disabled={updating}
                      >
                        {updating ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        ) : null}
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

            {/* Payment Information */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {locale === 'vi' ? 'Thông tin thanh toán' : 'Payment Information'}
              </h3>

              {(() => {
                const { totalPaid, remaining, total } = calculatePaymentTotals();
                const paymentVariant = getPaymentStatusVariant(paymentStatus);

                return (
                  <div className="space-y-3">
                    {/* Payment Status Badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {locale === 'vi' ? 'Trạng thái' : 'Status'}
                      </span>
                      <Badge variant={paymentVariant}>
                        {getPaymentStatusLabel(paymentStatus, locale)}
                      </Badge>
                    </div>

                    {/* Payment Details */}
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

                    {/* Progress Bar */}
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
                {t('adminActions.internalNotes')}
              </h3>

              <Textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder={t('adminActions.notesPlaceholder')}
                rows={4}
                className="w-full"
              />
            </div>

            {/* Booking History Timeline */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
              <h3 className="font-semibold text-gray-900">{t('adminActions.communicationLog')}</h3>

              <div className="space-y-3">
                {bookingHistory.length > 0 ? (
                  bookingHistory.map((entry, index) => {
                    // Determine icon and color based on action
                    const getActionStyle = () => {
                      switch (entry.action) {
                        case 'created':
                          return { icon: <Calendar className="h-4 w-4" />, color: 'text-blue-500', bg: 'bg-blue-50' };
                        case 'payment_received':
                          return { icon: <CreditCard className="h-4 w-4" />, color: 'text-green-500', bg: 'bg-green-50' };
                        case 'status_changed':
                          return { icon: <CheckCircle className="h-4 w-4" />, color: 'text-blue-500', bg: 'bg-blue-50' };
                        case 'payment_status_changed':
                          return { icon: <CreditCard className="h-4 w-4" />, color: 'text-orange-500', bg: 'bg-orange-50' };
                        case 'cancelled':
                          return { icon: <XCircle className="h-4 w-4" />, color: 'text-red-500', bg: 'bg-red-50' };
                        case 'note_added':
                          return { icon: <MessageSquare className="h-4 w-4" />, color: 'text-gray-500', bg: 'bg-gray-50' };
                        default:
                          return { icon: <CheckCircle className="h-4 w-4" />, color: 'text-gray-500', bg: 'bg-gray-50' };
                      }
                    };

                    const style = getActionStyle();
                    const isLast = index === bookingHistory.length - 1;

                    return (
                      <div key={entry.id} className="relative flex gap-3">
                        {/* Timeline line */}
                        {!isLast && (
                          <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-gray-200" />
                        )}

                        {/* Icon */}
                        <div className={`relative z-10 flex-shrink-0 w-6 h-6 rounded-full ${style.bg} ${style.color} flex items-center justify-center`}>
                          {style.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pb-3">
                          <p className="text-sm font-medium text-gray-900">
                            {entry.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-gray-500">
                              {new Date(entry.created_at).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                            {entry.actor_name && entry.actor_type !== 'customer' && (
                              <span className="text-xs text-gray-400">•</span>
                            )}
                            {entry.actor_name && entry.actor_type !== 'customer' && (
                              <p className="text-xs text-gray-500">{entry.actor_name}</p>
                            )}
                          </div>
                          {entry.payment_amount && (
                            <p className="text-xs text-green-600 mt-1">
                              {formatCurrency(entry.payment_amount)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    {locale === 'vi' ? 'Chưa có lịch sử' : 'No history yet'}
                  </p>
                )}
              </div>
            </div>

            {/* Commission Breakdown - Admin and Owner */}
            {(user?.type === 'staff' && (user.role === 'admin' || user.role === 'owner')) && ((booking.pricing?.commissionAmount || 0) > 0 || (booking.pricing?.ownerEarnings || 0) > 0) && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
                <h3 className="font-semibold text-gray-900">
                  {user?.type === 'staff' && user.role === 'owner'
                    ? (locale === 'vi' ? 'Thông tin thu nhập' : 'Earnings Information')
                    : (locale === 'vi' ? 'Chi tiết hoa hồng' : 'Commission Breakdown')
                  }
                </h3>
                <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {locale === 'vi' ? 'Số tiền đã trả:' : 'Paid Amount:'}
                    </span>
                    <span className="font-mono font-medium">
                      {paymentStatus === 'deposit_paid'
                        ? formatCurrency(booking.pricing?.depositAmount || 0)
                        : paymentStatus === 'fully_paid'
                        ? formatCurrency(booking.pricing.totalAmount)
                        : formatCurrency(0)
                      }
                    </span>
                  </div>

                  <div className={cn(
                    "flex justify-between",
                    user?.role === 'admin' ? "text-blue-600" : "text-gray-500"
                  )}>
                    <span>
                      {locale === 'vi' ? 'Hoa hồng hệ thống' : 'System Commission'} ({booking.pricing?.commissionPercentage || 0}%):
                    </span>
                    <span className={cn(
                      "font-mono",
                      user?.role === 'admin' ? "font-semibold" : "font-medium"
                    )}>
                      {formatCurrency(booking.pricing?.commissionAmount || 0)}
                    </span>
                  </div>

                  <div className="flex justify-between text-green-600 font-medium border-t border-gray-300 pt-2">
                    <span>{locale === 'vi' ? 'Thu nhập chủ sở hữu:' : 'Owner Earnings:'}</span>
                    <span className="font-mono font-semibold">
                      {formatCurrency(booking.pricing?.ownerEarnings || 0)}
                    </span>
                  </div>
                </div>

                {booking.status === 'cancelled' && (
                  <div className="text-xs text-gray-500 italic bg-gray-100 p-2 rounded">
                    ℹ️ {locale === 'vi' ? 'Booking đã bị huỷ. Không có hoa hồng.' : 'This booking is cancelled. No commission is earned.'}
                  </div>
                )}

                {paymentStatus === 'pending' && (
                  <div className="text-xs text-yellow-700 italic bg-yellow-50 p-2 rounded">
                    ⏳ {locale === 'vi' ? 'Hoa hồng sẽ được tính khi nhận được thanh toán.' : 'Commission will be calculated when payment is received.'}
                  </div>
                )}
              </div>
            )}

            {/* Save Changes Button */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose}>
                {t('adminActions.close')}
              </Button>
              <Button
                onClick={handleUpdateBooking}
                disabled={updating}
              >
                {updating ? t('adminActions.saving') : t('adminActions.saveChanges')}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Cancel Booking Dialog */}
        <CancelBookingDialog
          isOpen={cancelDialogOpen}
          onClose={() => setCancelDialogOpen(false)}
          onConfirm={handleCancelBooking}
          isLoading={updating}
          locale={locale}
        />

        {/* Force Edit Status Dialog */}
        <ForceEditStatusDialog
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
