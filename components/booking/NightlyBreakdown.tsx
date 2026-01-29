"use client";

import { Calendar, Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ApplicableDiscount } from "./ActiveDiscountsSection";
import ActiveDiscountsSection from "./ActiveDiscountsSection";

interface NightlyBreakdownProps {
  checkIn: string;
  checkOut: string;
  basePrice: number;
  autoDiscounts: ApplicableDiscount[];
  locale: string;
  nightlyPricing?: Array<{
    date: string;
    basePitchPrice: number;
    extraAdults: { count: number; priceEach: number; total: number };
    extraChildren: { count: number; priceEach: number; total: number };
    subtotalBeforeDiscounts: number;
    discounts: Array<{ name: string; code: string | null; category: string; type: string; value: number; amount: number }>;
    subtotalAfterDiscounts: number;
    parameters?: Record<string, number>;
  }>;
  displayAutoDiscounts?: ApplicableDiscount[];
  parameters?: Array<{
    id: string;
    name: string | { vi?: string; en?: string };
    color_code?: string;
    quantity: number;
    counted_for_menu?: boolean;
  }>;
  parameterQuantities?: Record<string, number>;
}

interface NightDetail {
  date: string;
  displayDate: string;
  pricePerNight: number;
  applicableDiscounts: Array<{ discount: ApplicableDiscount; amount: number }>;
  finalPrice: number;
}

// Helper function to extract localized string from JSONB field
const getLocalizedString = (value: any, locale: string, fallback: string = ''): string => {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value[locale] || value.vi || value.en || fallback;
  }
  return fallback;
};

export default function NightlyBreakdown({
  checkIn,
  checkOut,
  basePrice,
  autoDiscounts,
  locale,
  nightlyPricing,
  displayAutoDiscounts,
  parameters,
  parameterQuantities,
}: NightlyBreakdownProps) {
  // Check if this is glamping pricing (has parameters)
  const isGlampingPricing = nightlyPricing?.some(n => n.parameters && Object.keys(n.parameters).length > 0);

  // Generate array of nights
  const generateNights = (): NightDetail[] => {
    // Use API data if available
    if (nightlyPricing && nightlyPricing.length > 0) {
      return nightlyPricing.map(night => {
        const nightDate = new Date(night.date);
        const displayDate = nightDate.toLocaleDateString(
          locale === "vi" ? "vi-VN" : "en-US",
          { day: "2-digit", month: "2-digit", year: "numeric" }
        );

        return {
          date: night.date,
          displayDate,
          pricePerNight: night.subtotalBeforeDiscounts,
          applicableDiscounts: night.discounts.map(d => ({
            discount: {
              id: '',
              code: d.code,
              name: d.name,
              description: '',
              discountType: d.type as 'percentage' | 'fixed_amount',
              discountValue: d.value,
              isStackable: false,
              appliesTo: null,
              appliesToId: null,
              appliesToName: null,
              validFrom: '',
              validUntil: null,
            },
            amount: d.amount,
          })),
          finalPrice: night.subtotalAfterDiscounts,
        };
      });
    }

    // Fallback to client-side calculation
    const nights: NightDetail[] = [];
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const totalNights = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const pricePerNight = basePrice / totalNights;

    // Filter only pitch/campsite discounts (not product discounts)
    const pitchDiscounts = autoDiscounts.filter(
      (d) =>
        d.appliesTo === "pitch" ||
        d.appliesTo === "campsite" ||
        d.appliesTo === "all"
    );

    for (let i = 0; i < totalNights; i++) {
      const nightDate = new Date(checkInDate);
      nightDate.setDate(checkInDate.getDate() + i);
      const dateStr = nightDate.toISOString().split("T")[0]; // YYYY-MM-DD

      // Format display date
      const displayDate = nightDate.toLocaleDateString(
        locale === "vi" ? "vi-VN" : "en-US",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }
      );

      // Find applicable discounts for this night
      const applicableDiscounts: Array<{
        discount: ApplicableDiscount;
        amount: number;
      }> = [];
      let currentPrice = pricePerNight;

      pitchDiscounts.forEach((discount) => {
        // Check if discount is valid on this date
        const discountFrom = new Date(discount.validFrom);
        const discountUntil = discount.validUntil
          ? new Date(discount.validUntil)
          : new Date("9999-12-31");

        if (nightDate >= discountFrom && nightDate <= discountUntil) {
          // Calculate discount amount
          let discountAmount = 0;
          if (discount.discountType === "percentage") {
            discountAmount = currentPrice * (discount.discountValue / 100);
          } else {
            discountAmount = Math.min(discount.discountValue, currentPrice);
          }

          applicableDiscounts.push({
            discount,
            amount: discountAmount,
          });
          currentPrice -= discountAmount;
        }
      });

      nights.push({
        date: dateStr,
        displayDate,
        pricePerNight,
        applicableDiscounts,
        finalPrice: currentPrice,
      });
    }

    return nights;
  };

  const nights = generateNights();
  const totalFinalPrice = nights.reduce((sum, night) => sum + night.finalPrice, 0);
  const totalBeforeDiscounts = nights.reduce((sum, night) => sum + night.pricePerNight, 0);
  const totalSavings = totalBeforeDiscounts - totalFinalPrice;

  // i18n labels
  const labels = {
    nightlyDetails: locale === 'vi' ? 'Chi tiết theo đêm' : 'Nightly breakdown',
    nights: locale === 'vi' ? 'đêm' : 'nights',
    savings: locale === 'vi' ? 'Tiết kiệm' : 'Savings',
    activeDiscounts: locale === 'vi' ? 'Ưu đãi đang áp dụng' : 'Active discounts',
    night: locale === 'vi' ? 'Đêm' : 'Night',
    basePitchPrice: locale === 'vi' ? 'Giá slot cơ bản' : 'Base slot price',
    adults: locale === 'vi' ? 'Người lớn' : 'Adults',
    children: locale === 'vi' ? 'Trẻ em' : 'Children',
    discount: locale === 'vi' ? 'Giảm' : 'Discount',
    priceAfterDiscount: locale === 'vi' ? 'Giá sau giảm' : 'Price after discount',
    total: locale === 'vi' ? 'Tổng' : 'Total',
    savingsCompared: locale === 'vi' ? 'Tiết kiệm {amount} so với giá gốc' : 'Savings of {amount} compared to original price',
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-primary" />
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <span className="font-semibold text-gray-900">
              {labels.nightlyDetails} ({nights.length} {labels.nights}): {formatCurrency(totalFinalPrice)}
            </span>
            {totalSavings > 0 && (
              <>
                <span className="text-gray-600">|</span>
                <span className="text-green-600 font-medium">
                  {labels.savings}: {formatCurrency(totalSavings)}
                </span>
              </>
            )}
          </div>
          {displayAutoDiscounts && displayAutoDiscounts.length > 0 && (
            <Dialog>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center p-1 hover:bg-gray-100 rounded"
                >
                  <Info className="h-4 w-4 text-primary hover:text-primary/80 cursor-pointer" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{labels.activeDiscounts}</DialogTitle>
                </DialogHeader>
                <ActiveDiscountsSection
                  discounts={displayAutoDiscounts}
                  totalSavings={totalSavings}
                  locale={locale}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Always Visible Content */}
      <div className="bg-white">
        <div className="p-4 space-y-4">
            {nights.map((night, idx) => (
              <div
                key={night.date}
                className={`${
                  idx > 0 ? "pt-4 border-t border-gray-100" : ""
                }`}
              >
                {/* Night Header */}
                <div className="mb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">
                        📅 {labels.night} {night.displayDate}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(night.pricePerNight)}
                    </span>
                  </div>

                  {/* Breakdown of price components if from API */}
                  {nightlyPricing && nightlyPricing.length > 0 && (() => {
                    const apiNight = nightlyPricing.find(n => n.date === night.date);
                    if (apiNight) {
                      // GLAMPING MODE: Show parameter breakdown
                      if (isGlampingPricing && apiNight.parameters && parameters) {
                        return (
                          <div className="ml-6 mt-1 space-y-0.5 text-xs text-gray-600">
                            {Object.entries(apiNight.parameters).map(([paramId, price]) => {
                              const paramMeta = parameters.find(p => p.id === paramId);
                              const quantity = parameterQuantities?.[paramId] || paramMeta?.quantity || 1;

                              if (!paramMeta) return null;

                              return (
                                <div key={paramId} className="flex justify-between">
                                  <div className="flex items-center gap-1.5">
                                    {paramMeta.color_code && (
                                      <div
                                        className="w-2.5 h-2.5 rounded-full border border-gray-300 flex-shrink-0"
                                        style={{ backgroundColor: paramMeta.color_code }}
                                      />
                                    )}
                                    <span>• {getLocalizedString(paramMeta.name, locale)} x {quantity}:</span>
                                  </div>
                                  <span>{formatCurrency(price * quantity)}</span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }

                      // CAMPSITE MODE: Show old display (basePitchPrice, extraAdults, etc.)
                      return (
                        <div className="ml-6 mt-1 space-y-0.5 text-xs text-gray-600">
                          <div className="flex justify-between">
                            <span>• {labels.basePitchPrice}:</span>
                            <span>{formatCurrency(apiNight.basePitchPrice)}</span>
                          </div>
                          {apiNight.extraAdults.count > 0 && (
                            <div className="flex justify-between">
                              <span>• {labels.adults} ({apiNight.extraAdults.count} × {formatCurrency(apiNight.extraAdults.priceEach)}):</span>
                              <span>{formatCurrency(apiNight.extraAdults.total)}</span>
                            </div>
                          )}
                          {apiNight.extraChildren.count > 0 && (
                            <div className="flex justify-between">
                              <span>• {labels.children} ({apiNight.extraChildren.count} × {formatCurrency(apiNight.extraChildren.priceEach)}):</span>
                              <span>{formatCurrency(apiNight.extraChildren.total)}</span>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Discount details */}
                {night.applicableDiscounts.length > 0 && (
                  <div className="ml-6 space-y-1">
                    {night.applicableDiscounts.map((item, discIdx) => (
                      <div
                        key={`${night.date}-${discIdx}`}
                        className="flex items-center justify-between text-sm text-green-600"
                      >
                        <span>
                          ✓ {labels.discount}{" "}
                          {item.discount.discountType === "percentage"
                            ? `${item.discount.discountValue}%`
                            : formatCurrency(item.discount.discountValue)}{" "}
                          - {item.discount.name}
                        </span>
                        <span>-{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>

        {/* Footer - Total */}
        <div className="border-t border-gray-300 bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-gray-900">
              {labels.total} {nights.length} {labels.nights}:
            </span>
            <span className="text-lg font-bold text-primary">
              {formatCurrency(totalFinalPrice)}
            </span>
          </div>
          {totalSavings > 0 && (
            <div className="text-sm text-green-600 text-right mt-1">
              ({labels.savingsCompared.replace('{amount}', formatCurrency(totalSavings))})
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
