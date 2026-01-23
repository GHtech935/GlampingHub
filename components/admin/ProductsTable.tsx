"use client";

import { Edit, Trash2, Package, MapPin, Copy, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { useTranslations, useLocale } from "next-intl";

export interface Product {
  id: string;
  name: string | { vi: string; en: string };
  description: string | { vi: string; en: string } | null;
  price: number;
  unit: string | { vi: string; en: string };
  taxRate: number;
  isAvailable: boolean;
  maxQuantity: number;
  stock: number | null; // null = unlimited
  requiresAdvanceBooking: boolean;
  advanceHours: number;
  sortOrder: number;
  campsite: {
    id: string;
    name: string | { vi: string; en: string };
    slug: string;
  };
  category?: {
    id: string;
    name: { vi: string; en: string };
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface ProductsTableProps {
  products: Product[];
  loading: boolean;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onCopy?: (product: Product) => void;
}

export function ProductsTable({
  products,
  loading,
  onEdit,
  onDelete,
  onCopy,
}: ProductsTableProps) {
  const t = useTranslations('admin.productsPage');
  const locale = useLocale() as 'vi' | 'en';

  // Helper to get localized text
  const getLocalizedText = (text: any): string => {
    if (typeof text === 'string') return text;
    if (!text) return '';
    return text[locale] || text.vi || text.en || '';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-gray-600">{t('loading')}</span>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">{t('noProducts')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('product')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('campsite')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('category')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('price')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('tax')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('stock')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('status')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.map((product) => (
              <tr
                key={product.id}
                className="hover:bg-gray-50 transition-colors"
              >
                {/* Product Name */}
                <td className="px-4 py-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {getLocalizedText(product.name)}
                    </div>
                    {product.description && (
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {getLocalizedText(product.description)}
                      </div>
                    )}
                  </div>
                </td>

                {/* Campsite */}
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="text-sm font-medium text-gray-900">
                      {getLocalizedText(product.campsite.name)}
                    </div>
                  </div>
                </td>

                {/* Category */}
                <td className="px-4 py-4 whitespace-nowrap">
                  {product.category ? (
                    <div className="flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-sm text-gray-700">
                        {getLocalizedText(product.category.name)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </td>

                {/* Price */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm font-semibold text-gray-900">
                    {formatCurrency(product.price)}
                  </div>
                  <div className="text-xs text-gray-500">/{getLocalizedText(product.unit)}</div>
                </td>

                {/* Tax */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {product.taxRate}%
                  </div>
                </td>

                {/* Stock */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    {product.stock === null ? (
                      <span className="text-gray-600">∞ {t('unlimited')}</span>
                    ) : product.stock === 0 ? (
                      <span className="text-red-600 font-medium">{t('outOfStock')}</span>
                    ) : (
                      <span className="text-gray-900">{product.stock}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {t('maxQuantity')}: {product.maxQuantity}
                  </div>
                  {product.requiresAdvanceBooking && (
                    <div className="text-xs text-orange-600">
                      {t('advanceBooking', { hours: product.advanceHours })}
                    </div>
                  )}
                </td>

                {/* Status */}
                <td className="px-4 py-4 whitespace-nowrap">
                  {product.isAvailable ? (
                    <Badge variant="default" className="text-xs">
                      {t('available')}
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      {t('unavailable')}
                    </Badge>
                  )}
                </td>

                {/* Actions */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {onCopy && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onCopy(product)}
                        className="flex items-center gap-1"
                        title={t('copy')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(product)}
                      className="flex items-center gap-1"
                    >
                      <Edit className="h-3 w-3" />
                      {t('edit')}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onDelete(product.id)}
                      className="flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      {t('delete')}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
