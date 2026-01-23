"use client";

import { Tag, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export interface ApplicableDiscount {
  id: string;
  code: string | null;
  name: string;
  description: string;
  discountType: "percentage" | "fixed_amount";
  discountValue: number;
  isStackable: boolean;
  appliesTo: "all" | "campsite" | "pitch" | "product" | null;
  appliesToId: string | null;
  appliesToName: string | null;
  validFrom: string;
  validUntil: string | null;
}

interface ActiveDiscountsSectionProps {
  discounts: ApplicableDiscount[];
  totalSavings: number;
  locale?: string;
}

export default function ActiveDiscountsSection({
  discounts,
  totalSavings,
  locale = 'vi',
}: ActiveDiscountsSectionProps) {
  if (discounts.length === 0) {
    return null;
  }

  // i18n labels
  const labels = {
    discountsApplied: locale === 'vi' ? 'ưu đãi đang áp dụng' : 'discounts applied',
    savings: locale === 'vi' ? 'Tiết kiệm' : 'Savings',
    discount: locale === 'vi' ? 'Giảm' : 'Discount',
    appliesTo: locale === 'vi' ? 'Áp dụng cho' : 'Applies to',
    totalSavings: locale === 'vi' ? 'Tổng tiết kiệm' : 'Total savings',
    all: locale === 'vi' ? 'TẤT CẢ' : 'ALL',
    campsite: 'CAMPSITE',
    pitch: 'PITCH',
    product: locale === 'vi' ? 'SẢN PHẨM' : 'PRODUCT',
    discountLabel: locale === 'vi' ? 'GIẢM GIÁ' : 'DISCOUNT',
  };

  const getBadgeVariant = (appliesTo: string | null) => {
    switch (appliesTo) {
      case "all":
        return "default";
      case "campsite":
        return "secondary";
      case "pitch":
        return "outline";
      case "product":
        return "destructive";
      default:
        return "default";
    }
  };

  const getBadgeLabel = (appliesTo: string | null) => {
    switch (appliesTo) {
      case "all":
        return labels.all;
      case "campsite":
        return labels.campsite;
      case "pitch":
        return labels.pitch;
      case "product":
        return labels.product;
      default:
        return labels.discountLabel;
    }
  };

  const formatDiscountValue = (discount: ApplicableDiscount) => {
    if (discount.discountType === "percentage") {
      return `${discount.discountValue}%`;
    }
    return formatCurrency(discount.discountValue);
  };

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircle2 className="h-5 w-5 text-green-600" />
        <div>
          <span className="font-semibold text-green-900">
            {discounts.length} {labels.discountsApplied}
          </span>
          <span className="text-green-700 mx-2">|</span>
          <span className="text-green-700 font-medium">
            {labels.savings}: {formatCurrency(totalSavings)}
          </span>
        </div>
      </div>

      {/* Discount Cards */}
      <div className="space-y-3">
        {discounts.map((discount) => (
          <div
            key={`${discount.id}-${discount.appliesToId}`}
            className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50"
          >
            {/* Discount Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary flex-shrink-0" />
                <Badge variant={getBadgeVariant(discount.appliesTo)} className="text-xs">
                  {getBadgeLabel(discount.appliesTo)}
                </Badge>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-primary">
                  {labels.discount} {formatDiscountValue(discount)}
                </div>
              </div>
            </div>

            {/* Discount Details */}
            <div className="space-y-1">
              <div className="font-medium text-gray-900">{discount.name}</div>
              {discount.description && (
                <p className="text-sm text-gray-600">{discount.description}</p>
              )}
              {discount.appliesToName && (
                <div className="text-sm text-gray-500">
                  <span className="font-medium">{labels.appliesTo}:</span> {discount.appliesToName}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Footer - Total Savings */}
        <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
          <span className="font-semibold text-gray-900">{labels.totalSavings}:</span>
          <span className="text-lg font-bold text-green-600">
            -{formatCurrency(totalSavings)}
          </span>
        </div>
      </div>
    </div>
  );
}
