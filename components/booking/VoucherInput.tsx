import React from 'react';

export interface AppliedVoucher {
  code: string;
  discountAmount: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
}

interface VoucherInputProps {
  onVoucherApplied?: (voucher: AppliedVoucher) => void;
  onVoucherRemoved?: () => void;
  appliedVoucher?: AppliedVoucher | null;
  campsiteId?: string;
  zoneId?: string;
  itemId?: string;
  checkIn?: string;
  checkOut?: string;
  totalAmount?: number;
  customerId?: string;
  locale?: string;
  validationEndpoint?: string;
}

/**
 * VoucherInput component
 * Allows users to apply discount vouchers to their booking
 */
export default function VoucherInput({
  onVoucherApplied,
  onVoucherRemoved,
  appliedVoucher,
  campsiteId,
  zoneId,
  itemId,
  checkIn,
  checkOut,
  totalAmount,
  customerId,
  locale = 'vi',
  validationEndpoint
}: VoucherInputProps) {
  const [voucherCode, setVoucherCode] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) {
      setError('Please enter a voucher code');
      return;
    }

    setLoading(true);
    setError('');

    // TODO: Implement voucher validation API call
    // For now, just show a placeholder message
    setTimeout(() => {
      setLoading(false);
      setError('Voucher validation not implemented yet');
    }, 500);
  };

  const handleRemoveVoucher = () => {
    setVoucherCode('');
    setError('');
    onVoucherRemoved?.();
  };

  return (
    <div className="space-y-2">
      {appliedVoucher ? (
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div>
            <p className="text-sm font-medium text-green-800">
              Voucher Applied: {appliedVoucher.code}
            </p>
            <p className="text-xs text-green-600">
              Discount: {new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
              }).format(appliedVoucher.discountAmount)}
            </p>
          </div>
          <button
            onClick={handleRemoveVoucher}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
              placeholder="Enter voucher code"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
              disabled={loading}
            />
            <button
              onClick={handleApplyVoucher}
              disabled={loading || !voucherCode.trim()}
              className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Checking...' : 'Apply'}
            </button>
          </div>
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
