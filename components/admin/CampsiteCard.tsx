'use client';

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Tent,
  Edit,
  Eye,
  MoreVertical,
  DollarSign,
  Plus,
  Clock,
  Wallet,
  Receipt,
  Settings,
  User,
  Percent,
  Moon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";
import { type MultilingualText, getLocalizedText } from "@/lib/i18n-utils";
import { useAdminLocale } from "@/components/providers/AdminI18nProvider";
import { TaxSettingsDialog } from "./TaxSettingsDialog";

interface Owner {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface CampsiteCardProps {
  campsite: {
    id: string;
    name: MultilingualText | string;
    slug: string;
    city: string;
    province: string;
    address: string;
    is_active: boolean;
    is_featured: boolean;
    average_rating: number;
    review_count: number;
    pitch_count: number;
    active_bookings: number;
    total_revenue: number;
    image_url?: string;
    check_in_time: string;
    check_out_time: string;
    deposit_type: string;
    deposit_value: number;
    tax_enabled: boolean;
    tax_rate: number;
    commission_percentage: number;
    commission_type: string;
    min_stay_nights: number;
    owner?: Owner | null; // Single owner (1 campsite = 1 owner)
  };
  userRole?: string | null;
  onTaxUpdated?: () => void;
}

export function CampsiteCard({ campsite, userRole, onTaxUpdated }: CampsiteCardProps) {
  const t = useTranslations('admin.campsiteCard');
  const { locale } = useAdminLocale();
  const campsiteName = getLocalizedText(campsite.name, locale);
  const [taxDialogOpen, setTaxDialogOpen] = useState(false);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-0">
        {/* Image */}
        <div className="relative h-48 bg-gray-200 rounded-t-lg overflow-hidden">
          {campsite.image_url ? (
            <img
              src={campsite.image_url}
              alt={campsiteName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <Tent className="w-16 h-16 text-primary/40" />
            </div>
          )}

          {/* Status badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            {campsite.is_featured && (
              <Badge className="bg-orange-500 hover:bg-orange-600">
                {t('featured')}
              </Badge>
            )}
            <Badge
              variant={campsite.is_active ? "default" : "secondary"}
              className={
                campsite.is_active
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-gray-500 hover:bg-gray-600"
              }
            >
              {campsite.is_active ? t('active') : t('inactive')}
            </Badge>
          </div>

          {/* Actions menu and Add Pitch button */}
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            {/* Menu dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-md"
                >
                  <MoreVertical className="w-4 h-4 text-gray-700" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[1200]">
                {userRole !== 'owner' && (
                  <DropdownMenuItem asChild>
                    <Link href={`/admin-camping/campsites/${campsite.id}/edit`}>
                      <Edit className="w-4 h-4 mr-2" />
                      {t('edit')}
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href={`/campsite/${campsite.slug}`} target="_blank">
                    <Eye className="w-4 h-4 mr-2" />
                    {t('viewCustomerPage')}
                  </Link>
                </DropdownMenuItem>
                {userRole !== 'owner' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setTaxDialogOpen(true)}>
                      <Settings className="w-4 h-4 mr-2" />
                      {t('taxSettings')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Add Pitch button */}
            {userRole !== 'owner' && (
              <Link href={`/admin-camping/campsites/${campsite.id}/pitches/new`}>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 w-8 p-0 bg-green-500/90 hover:bg-green-500 shadow-md group"
                  title="Add Pitch"
                >
                  <Plus className="w-4 h-4 text-white" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Title and location */}
          <div className="mb-3">
            <h3 className="font-semibold text-lg text-gray-900 mb-1">
              {campsiteName}
            </h3>
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="w-4 h-4 mr-1" />
              {campsite.province || campsite.city || t('notUpdated')}
            </div>
          </div>

          {/* Owner */}
          <div className="mb-3">
            <div className="flex items-center text-sm text-gray-600">
              <User className="w-4 h-4 mr-1.5 text-indigo-500 flex-shrink-0" />
              <span className="truncate">
                {t('owner')}: <span className="font-medium text-gray-800">
                  {campsite.owner
                    ? `${campsite.owner.first_name} ${campsite.owner.last_name}`
                    : t('noOwner')}
                </span>
              </span>
            </div>
          </div>

          {/* Check-in/out and Deposit */}
          <div className="mb-3 space-y-1.5">
            {/* Check-in/out time */}
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="w-4 h-4 mr-1.5 text-blue-500" />
              <span>
                {t('checkIn')}: <span className="font-medium text-gray-800">{campsite.check_in_time?.slice(0, 5) || '15:00'}</span>
                {' - '}
                {t('checkOut')}: <span className="font-medium text-gray-800">{campsite.check_out_time?.slice(0, 5) || '11:00'}</span>
              </span>
            </div>
            {/* Deposit */}
            <div className="flex items-center text-sm text-gray-600">
              <Wallet className="w-4 h-4 mr-1.5 text-orange-500" />
              <span>
                {t('deposit')}: <span className="font-medium text-gray-800">
                  {!campsite.deposit_value || Number(campsite.deposit_value) === 0
                    ? t('noDeposit')
                    : campsite.deposit_type === 'percentage'
                      ? `${Math.round(Number(campsite.deposit_value))}%`
                      : `${Number(campsite.deposit_value).toLocaleString('vi-VN')} VND`}
                </span>
              </span>
            </div>
            {/* Tax */}
            <div className="flex items-center text-sm text-gray-600">
              <Receipt className="w-4 h-4 mr-1.5 text-purple-500" />
              <span>
                {t('tax')}: <span className="font-medium text-gray-800">
                  {campsite.tax_enabled ? `${campsite.tax_rate}%` : t('taxOff')}
                </span>
              </span>
            </div>
            {/* Commission */}
            <div className="flex items-center text-sm text-gray-600">
              <Percent className="w-4 h-4 mr-1.5 text-green-600" />
              <span>
                {t('commission')}: <span className="font-medium text-gray-800">
                  {campsite.commission_percentage}%
                </span>
              </span>
            </div>
            {/* Minimum Stay Nights */}
            <div className="flex items-center text-sm text-gray-600">
              <Moon className="w-4 h-4 mr-1.5 text-indigo-500" />
              <span>
                {t('minStayNights')}: <span className="font-medium text-gray-800">
                  {campsite.min_stay_nights || 1} {campsite.min_stay_nights === 1 ? t('night') : t('nights')}
                </span>
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Tent className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {campsite.pitch_count} {t('pitches')}
                </p>
                <p className="text-xs text-gray-500">
                  {campsite.active_bookings} {t('activeBookings')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {(campsite.total_revenue / 1000000).toFixed(1)}M VND
                </p>
                <p className="text-xs text-gray-500">{t('revenue')}</p>
              </div>
            </div>
          </div>

          {/* Action button */}
          <Link href={`/admin-camping/campsites/${campsite.id}`}>
            <Button className="w-full" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              {t('manageCampsite')}
            </Button>
          </Link>
        </div>
      </CardContent>

      {/* Tax Settings Dialog */}
      <TaxSettingsDialog
        campsiteId={campsite.id}
        campsiteName={campsiteName}
        open={taxDialogOpen}
        onOpenChange={setTaxDialogOpen}
        onSuccess={onTaxUpdated}
      />
    </Card>
  );
}
