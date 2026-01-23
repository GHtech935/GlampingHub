"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  User,
  Phone,
  Mail,
  Users,
  DollarSign,
  Lock,
  Wrench,
  Unlock,
  StickyNote,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface DayDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  pitch: {
    pitch_id: string;
    pitch_name: string;
    pitch_slug: string;
    max_guests: number;
    ground_type: string;
    campsite_id: string;
    campsite_name: string;
  };
  date: string;
  dateData: {
    date: string;
    status: 'available' | 'booked' | 'blocked' | 'maintenance';
    price: number | null;
    notes: string | null;
    booking: {
      id: string;
      reference: string;
      guest_name: string;
      guest_email: string;
      guest_phone: string;
      adults: number;
      children: number;
      check_in_date: string;
      check_out_date: string;
      status: string;
      payment_status: string;
      selected_pitch_types: string[] | null;
      is_check_in_day: boolean;
      is_check_out_day: boolean;
    } | null;
  };
  onQuickAction: (action: 'block' | 'unblock' | 'maintenance' | 'add_note', notes?: string) => void;
}

export function DayDetailModal({
  isOpen,
  onClose,
  pitch,
  date,
  dateData,
  onQuickAction
}: DayDetailModalProps) {
  const t = useTranslations('admin.calendarPage');
  const [notes, setNotes] = useState(dateData.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper function to get payment display from payment_status
  const getPaymentDisplay = (paymentStatus: string): { variant: 'default' | 'outline'; label: string } => {
    switch (paymentStatus) {
      case 'fully_paid':
        return { variant: 'default', label: t('modal.paymentStatus.fullyPaid') };
      case 'deposit_paid':
        return { variant: 'default', label: t('modal.paymentStatus.depositPaid') };
      case 'expired':
        return { variant: 'outline', label: t('modal.paymentStatus.expired') };
      case 'pending':
      default:
        return { variant: 'outline', label: t('modal.paymentStatus.unpaid') };
    }
  };

  // Helper to extract pitch name from JSONB or string
  const getPitchName = (name: any): string => {
    if (typeof name === 'string') return name;
    if (typeof name === 'object' && name !== null) {
      return name.vi || name.en || 'Unknown';
    }
    return 'Unknown';
  };

  // Helper to extract ground type from JSONB or string
  const getGroundType = (type: any): string => {
    if (typeof type === 'string') return type;
    if (typeof type === 'object' && type !== null) {
      return type.vi || type.en || 'Unknown';
    }
    return 'Unknown';
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = t(`modal.dayNames.${dayKeys[date.getDay()]}`);
    return `${dayName}, ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  // Get status badge
  const getStatusBadge = () => {
    const { status, booking } = dateData;

    if (booking?.is_check_in_day) {
      return <Badge className="bg-blue-500">{t('status.checkIn')}</Badge>;
    }
    if (booking?.is_check_out_day) {
      return <Badge className="bg-orange-500">{t('status.checkOut')}</Badge>;
    }

    switch (status) {
      case 'available':
        return <Badge className="bg-green-500">{t('status.available')}</Badge>;
      case 'booked':
        return <Badge className="bg-red-500">{t('status.booked')}</Badge>;
      case 'blocked':
        return <Badge className="bg-gray-700">{t('status.blocked')}</Badge>;
      case 'maintenance':
        return <Badge className="bg-yellow-500">{t('status.maintenance')}</Badge>;
      default:
        return <Badge variant="outline">N/A</Badge>;
    }
  };

  // Handle quick action
  const handleQuickAction = async (action: 'block' | 'unblock' | 'maintenance' | 'add_note') => {
    setIsSubmitting(true);
    try {
      await onQuickAction(action, action === 'add_note' ? notes : undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {formatDate(date)}
          </DialogTitle>
          <DialogDescription>
            {getPitchName(pitch.pitch_name)} · {pitch.campsite_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Pitch Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">{t('modal.pitchInfo')}</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">{t('modal.capacity')}:</span>
                <span className="ml-2 font-medium">{pitch.max_guests} {t('grid.people')}</span>
              </div>
              <div>
                <span className="text-gray-600">{t('modal.pitchType')}:</span>
                <span className="ml-2 font-medium">
                  {dateData.booking?.selected_pitch_types?.join(', ') || getGroundType(pitch.ground_type)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">{t('modal.status')}:</span>
                <span className="ml-2">{getStatusBadge()}</span>
              </div>
              {dateData.price && (
                <div>
                  <span className="text-gray-600">{t('modal.price')}:</span>
                  <span className="ml-2 font-medium text-green-600">
                    {dateData.price.toLocaleString('vi-VN')}đ{t('grid.perNight')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Booking Information (if booked) */}
          {dateData.booking && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{t('modal.bookingInfo')}</h3>
                <Link
                  href={`/admin-camping/bookings?id=${dateData.booking.id}`}
                  target="_blank"
                  className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                >
                  {t('modal.viewDetails')}
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>

              <div className="space-y-3">
                {/* Booking reference */}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="font-mono font-semibold">{dateData.booking.reference}</span>
                  {(() => {
                    const paymentDisplay = getPaymentDisplay(dateData.booking.payment_status);
                    return (
                      <Badge variant={paymentDisplay.variant}>
                        {paymentDisplay.label}
                      </Badge>
                    );
                  })()}
                </div>

                {/* Guest information */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">{dateData.booking.guest_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <a
                      href={`mailto:${dateData.booking.guest_email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {dateData.booking.guest_email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <a
                      href={`tel:${dateData.booking.guest_phone}`}
                      className="text-blue-600 hover:underline"
                    >
                      {dateData.booking.guest_phone}
                    </a>
                  </div>
                </div>

                {/* Stay details */}
                <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t">
                  <div>
                    <span className="text-gray-600">{t('modal.checkIn')}:</span>
                    <span className="ml-2 font-medium">
                      {new Date(dateData.booking.check_in_date).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">{t('modal.checkOut')}:</span>
                    <span className="ml-2 font-medium">
                      {new Date(dateData.booking.check_out_date).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">{t('modal.guests')}:</span>
                    <span className="ml-2 font-medium">
                      {dateData.booking.adults} {t('modal.adults')}, {dateData.booking.children} {t('modal.children')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">{t('modal.bookingStatus')}:</span>
                    <span className="ml-2">
                      {(() => {
                        const status = dateData.booking.status;
                        const isConfirmed = status === 'confirmed' || status === 'checked_in' || status === 'checked_out';
                        let label = t('modal.bookingStatusLabels.other');
                        if (status === 'confirmed') label = t('modal.bookingStatusLabels.confirmed');
                        else if (status === 'pending') label = t('modal.bookingStatusLabels.pending');
                        else if (status === 'checked_in') label = t('modal.bookingStatusLabels.checkedIn');
                        else if (status === 'checked_out') label = t('modal.bookingStatusLabels.completed');
                        else if (status === 'cancelled') label = t('modal.bookingStatusLabels.cancelled');
                        return (
                          <Badge variant={isConfirmed ? 'default' : 'outline'}>
                            {label}
                          </Badge>
                        );
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('modal.notes')}
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('modal.notesPlaceholder')}
              rows={3}
              className="w-full"
            />
            {(notes || '') !== (dateData.notes || '') && (
              <Button
                onClick={() => handleQuickAction('add_note')}
                disabled={isSubmitting}
                size="sm"
                className="mt-2"
              >
                <StickyNote className="w-4 h-4 mr-2" />
                {t('modal.saveNotes')}
              </Button>
            )}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
