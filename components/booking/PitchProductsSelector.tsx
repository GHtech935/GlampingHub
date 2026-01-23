import React from 'react';

export interface PitchProduct {
  id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
}

export interface SelectedProduct {
  productId: string;
  quantity: number;
  price: number;
  name: string;
  voucherCode?: string;
  voucherDiscount?: number;
}

interface PitchProductsSelectorProps {
  pitchId?: string;
  products?: PitchProduct[];
  selectedProducts?: SelectedProduct[] | Record<string, SelectedProduct>;
  onProductsChange?: (products: Record<string, SelectedProduct>) => void;
  locale?: string;
  campsiteId?: string;
  checkIn?: string;
  checkOut?: string;
  customerId?: string;
}

/**
 * PitchProductsSelector component
 * Allows users to select products/add-ons for a pitch booking
 */
export default function PitchProductsSelector({
  pitchId,
  products = [],
  selectedProducts = {},
  onProductsChange,
  locale = 'vi',
  campsiteId,
  checkIn,
  checkOut,
  customerId
}: PitchProductsSelectorProps) {
  // Convert selectedProducts to array if it's a Record
  const selectedProductsArray = Array.isArray(selectedProducts)
    ? selectedProducts
    : Object.values(selectedProducts);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Add-ons & Products</h3>

      {!pitchId && !campsiteId ? (
        <p className="text-sm text-gray-500">Select a pitch first to see available products</p>
      ) : (
        <div className="space-y-2">
          {products.length === 0 ? (
            <p className="text-sm text-gray-600">
              No products available for this pitch.
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              {products.length} product(s) available
            </p>
          )}
        </div>
      )}

      {selectedProductsArray.length > 0 && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Selected Products:</h4>
          <ul className="space-y-1">
            {selectedProductsArray.map((product, index) => (
              <li key={index} className="text-sm flex justify-between">
                <span>{product.name} x {product.quantity}</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: 'VND'
                  }).format(product.price * product.quantity)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
