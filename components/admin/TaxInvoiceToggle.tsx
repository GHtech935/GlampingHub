'use client';

import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Check } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TaxInvoiceToggleProps {
  bookingId: string;
  initialValue: boolean;
  subtotalBeforeTax: number;
  calculatedTax: number; // Tax amount already calculated from items
  onToggle?: (newValue: boolean, newTotal: number) => void;
  paymentStatus?: string; // To check if fully paid
}

export function TaxInvoiceToggle({
  bookingId,
  initialValue,
  subtotalBeforeTax,
  calculatedTax,
  onToggle,
  paymentStatus,
}: TaxInvoiceToggleProps) {
  const isFullyPaid = paymentStatus === 'fully_paid';
  const [taxInvoiceRequired, setTaxInvoiceRequired] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleToggle = async (checked: boolean) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const response = await fetch(`/api/admin/bookings/${bookingId}/toggle-tax-invoice`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taxInvoiceRequired: checked,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to toggle tax invoice');
      }

      const data = await response.json();

      setTaxInvoiceRequired(checked);
      setSuccess(true);

      // Call callback if provided
      if (onToggle) {
        onToggle(checked, data.booking.totalAmount);
      }

      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);

    } catch (err: any) {
      setError(err.message);
      console.error('Error toggling tax invoice:', err);
    } finally {
      setLoading(false);
    }
  };

  // Use calculated tax from items when VAT is enabled, otherwise 0
  const taxAmount = taxInvoiceRequired ? calculatedTax : 0;
  const grandTotal = subtotalBeforeTax + taxAmount;

  return (
    <div className="space-y-4">
      {/* Toggle Switch */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="tax-invoice-toggle" className="text-base font-semibold">
                Tiền thuế VAT
              </Label>
            </div>
            <Switch
              id="tax-invoice-toggle"
              checked={taxInvoiceRequired}
              onCheckedChange={handleToggle}
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tax Amount Display - Only show when NOT fully paid */}
      {!isFullyPaid && taxInvoiceRequired && (
        <div className="space-y-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Tổng tiền (chưa thuế)</span>
            <span className="font-medium">{formatCurrency(subtotalBeforeTax)}</span>
          </div>
          <div className="flex justify-between text-sm text-blue-600">
            <span>Tiền thuế VAT</span>
            <span className="font-medium">{formatCurrency(taxAmount)}</span>
          </div>
        </div>
      )}

      {!isFullyPaid && !taxInvoiceRequired && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-xs text-gray-500">
            Khách hàng không yêu cầu hóa đơn đỏ → không tính thuế VAT
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Message */}
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Đã cập nhật thành công!
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
