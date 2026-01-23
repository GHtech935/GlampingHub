'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ChevronDown, ChevronUp, Calendar, Package, Tag, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BookingPricingBreakdownProps {
  bookingId: string;
  locale?: string;
}

interface NightlyDiscount {
  name: string;
  code: string | null;
  category: 'discounts' | 'vouchers';
  type: 'percentage' | 'fixed_amount';
  value: number;
  originalAmount: number;
  amount: number;
}

interface NightlyPricing {
  date: string;
  basePitchPrice: number;
  extraAdults: {
    count: number;
    priceEach: number;
    total: number;
  };
  extraChildren: {
    count: number;
    priceEach: number;
    total: number;
  };
  subtotalBeforeDiscounts: number;
  discounts: NightlyDiscount[];
  totalDiscounts: number;
  subtotalAfterDiscounts: number;
}

interface ProductDiscount {
  name: string;
  code: string | null;
  category: 'discounts' | 'vouchers';
  type: 'percentage' | 'fixed_amount';
  value: number;
  amount: number;
}

interface Product {
  name: string;
  category: string;
  quantity: number;
  originalUnitPrice: number;
  discount: ProductDiscount | null;
  finalUnitPrice: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

interface PricingData {
  booking: {
    id: string;
    reference: string;
    campsiteName: string;
    pitchName: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    adults: number;
    children: number;
    taxRate: number;
  };
  nightlyPricing: NightlyPricing[];
  products: Product[];
  voucherApplied: {
    code: string;
    name: string;
    amount: number;
  } | null;
  cancellationPolicy: any;
  totals: {
    accommodationBeforeDiscount: number;
    accommodationDiscounts: number;
    accommodationAfterDiscount: number;
    productsBeforeDiscount: number;
    productsDiscounts: number;
    productsAfterDiscount: number;
    productsTax: number;
    subtotal: number;
    accommodationTax: number;
    totalTax: number;
    totalDiscount: number;
    grandTotal: number;
  };
}

export function BookingPricingBreakdown({ bookingId, locale = 'vi' }: BookingPricingBreakdownProps) {
  const [data, setData] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedNights, setExpandedNights] = useState<Set<string>>(new Set());
  const [showAllNights, setShowAllNights] = useState(false);

  useEffect(() => {
    fetchPricingDetails();
  }, [bookingId]);

  const fetchPricingDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/bookings/${bookingId}/pricing-details`);

      if (!response.ok) {
        throw new Error('Failed to fetch pricing details');
      }

      const data = await response.json();
      setData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleNightExpanded = (date: string) => {
    const newExpanded = new Set(expandedNights);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedNights(newExpanded);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">Đang tải chi tiết giá...</div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            Không thể tải chi tiết giá: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayNights = showAllNights ? data.nightlyPricing : data.nightlyPricing.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Nightly Pricing Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Chi tiết giá theo đêm
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {displayNights.map((night) => {
            const isExpanded = expandedNights.has(night.date);

            return (
              <div key={night.date} className="border rounded-lg p-4">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleNightExpanded(night.date)}
                >
                  <div>
                    <div className="font-semibold">{formatDate(night.date)}</div>
                    <div className="text-sm text-gray-500">
                      {night.discounts.length > 0 && (
                        <span className="text-green-600">
                          {night.discounts.length} giảm giá áp dụng
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {night.totalDiscounts > 0 && (
                      <div className="text-right">
                        <div className="text-sm text-gray-500 line-through">
                          {formatCurrency(night.subtotalBeforeDiscounts)}
                        </div>
                        <div className="font-semibold text-green-600">
                          {formatCurrency(night.subtotalAfterDiscounts)}
                        </div>
                      </div>
                    )}
                    {night.totalDiscounts === 0 && (
                      <div className="font-semibold">
                        {formatCurrency(night.subtotalBeforeDiscounts)}
                      </div>
                    )}
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 space-y-2 border-t pt-4">
                    {/* Base Price */}
                    <div className="flex justify-between text-sm">
                      <span>Giá pitch cơ bản</span>
                      <span>{formatCurrency(night.basePitchPrice)}</span>
                    </div>

                    {/* Extra Adults */}
                    {night.extraAdults.count > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>
                          Người lớn thêm ({night.extraAdults.count} × {formatCurrency(night.extraAdults.priceEach)})
                        </span>
                        <span>{formatCurrency(night.extraAdults.total)}</span>
                      </div>
                    )}

                    {/* Extra Children */}
                    {night.extraChildren.count > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>
                          Trẻ em thêm ({night.extraChildren.count} × {formatCurrency(night.extraChildren.priceEach)})
                        </span>
                        <span>{formatCurrency(night.extraChildren.total)}</span>
                      </div>
                    )}

                    <Separator />

                    <div className="flex justify-between text-sm font-medium">
                      <span>Tạm tính trước giảm giá</span>
                      <span>{formatCurrency(night.subtotalBeforeDiscounts)}</span>
                    </div>

                    {/* Discounts */}
                    {night.discounts.map((discount, index) => (
                      <div key={index} className="flex justify-between text-sm text-green-600">
                        <span className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {discount.category === 'discounts' ? 'Auto' : 'Voucher'}
                          </Badge>
                          {discount.name}
                          {discount.code && ` (${discount.code})`}
                          <span className="text-gray-500">
                            {discount.type === 'percentage'
                              ? `${discount.value}%`
                              : formatCurrency(discount.value)}
                          </span>
                        </span>
                        <span>-{formatCurrency(discount.amount)}</span>
                      </div>
                    ))}

                    {night.totalDiscounts > 0 && (
                      <>
                        <Separator />
                        <div className="flex justify-between font-semibold text-green-600">
                          <span>Giá sau giảm</span>
                          <span>{formatCurrency(night.subtotalAfterDiscounts)}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {data.nightlyPricing.length > 3 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllNights(!showAllNights)}
              className="w-full"
            >
              {showAllNights
                ? 'Thu gọn'
                : `Xem thêm ${data.nightlyPricing.length - 3} đêm nữa`}
            </Button>
          )}

          <Separator />

          <div className="flex justify-between font-bold text-lg">
            <span>Tổng lưu trú ({data.booking.nights} đêm)</span>
            <span>{formatCurrency(data.totals.accommodationAfterDiscount)}</span>
          </div>

          {data.totals.accommodationDiscounts > 0 && (
            <div className="text-sm text-green-600">
              Tiết kiệm: {formatCurrency(data.totals.accommodationDiscounts)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Products Breakdown */}
      {data.products.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Sản phẩm & Dịch vụ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.products.map((product, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-semibold">{product.name}</div>
                    <div className="text-sm text-gray-500">
                      Số lượng: {product.quantity} × {formatCurrency(product.finalUnitPrice)}
                    </div>

                    {product.discount && (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">
                          {product.discount.category === 'discounts' ? 'Auto Discount' : 'Voucher'}
                        </Badge>
                        <span className="text-sm text-green-600 ml-2">
                          {product.discount.name}
                          {product.discount.code && ` (${product.discount.code})`}
                          {' - '}
                          {product.discount.type === 'percentage'
                            ? `${product.discount.value}%`
                            : formatCurrency(product.discount.value)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    {product.discount && (
                      <div className="text-sm text-gray-500 line-through">
                        {formatCurrency(product.originalUnitPrice * product.quantity)}
                      </div>
                    )}
                    <div className="font-semibold">{formatCurrency(product.subtotal)}</div>
                    {product.taxRate > 0 && (
                      <div className="text-xs text-gray-500">
                        +VAT {product.taxRate}%: {formatCurrency(product.taxAmount)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Tổng sản phẩm (trước thuế)</span>
                <span>{formatCurrency(data.totals.productsAfterDiscount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Thuế sản phẩm</span>
                <span>{formatCurrency(data.totals.productsTax)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Tổng sản phẩm (sau thuế)</span>
                <span>
                  {formatCurrency(data.totals.productsAfterDiscount + data.totals.productsTax)}
                </span>
              </div>

              {data.totals.productsDiscounts > 0 && (
                <div className="text-sm text-green-600">
                  Tiết kiệm: {formatCurrency(data.totals.productsDiscounts)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voucher Applied */}
      {data.voucherApplied && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Mã giảm giá
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <Badge className="mb-2">{data.voucherApplied.code}</Badge>
                <div className="text-sm text-gray-600">{data.voucherApplied.name}</div>
              </div>
              <div className="text-lg font-semibold text-green-600">
                -{formatCurrency(data.voucherApplied.amount)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancellation Policy Snapshot */}
      {data.cancellationPolicy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Chính sách hủy (Snapshot)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">
              {data.cancellationPolicy.description?.[locale] || 'Không có thông tin'}
            </div>
            {data.cancellationPolicy.rules && (
              <div className="mt-4 space-y-2">
                {data.cancellationPolicy.rules.map((rule: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>
                      Hủy trước {rule.hours_before_checkin} giờ
                    </span>
                    <span className="font-medium">
                      Hoàn {rule.refund_percentage}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Total Summary */}
      <Card className="bg-gray-50">
        <CardContent className="p-6 space-y-3">
          <div className="flex justify-between text-sm">
            <span>Tổng lưu trú</span>
            <span>{formatCurrency(data.totals.accommodationAfterDiscount)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span>Tổng sản phẩm</span>
            <span>
              {formatCurrency(data.totals.productsAfterDiscount + data.totals.productsTax)}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span>Thuế lưu trú ({data.booking.taxRate}%)</span>
            <span>{formatCurrency(data.totals.accommodationTax)}</span>
          </div>

          {data.totals.totalDiscount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Tổng tiết kiệm</span>
              <span>-{formatCurrency(data.totals.totalDiscount)}</span>
            </div>
          )}

          <Separator />

          <div className="flex justify-between text-lg font-bold">
            <span>TỔNG CỘNG</span>
            <span>{formatCurrency(data.totals.grandTotal)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
