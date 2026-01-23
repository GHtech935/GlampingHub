'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Package } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getLocalizedText, type Locale, type MultilingualText } from '@/lib/i18n-utils';

interface AvailableProduct {
  id: string;
  name: MultilingualText;
  description: MultilingualText;
  unit: MultilingualText;
  price: number;
  tax_rate: number;
  available_quantity: number;
}

interface AddProductDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (productId: string, quantity: number) => void;
  campsiteSlug: string;
  locale?: Locale;
  isLoading?: boolean;
}

export function AddProductDialog({
  isOpen,
  onClose,
  onConfirm,
  campsiteSlug,
  locale = 'vi',
  isLoading = false,
}: AddProductDialogProps) {
  const [products, setProducts] = useState<AvailableProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);

  const texts = {
    vi: {
      title: 'Thêm sản phẩm',
      selectProduct: 'Chọn sản phẩm',
      selectPlaceholder: 'Chọn sản phẩm...',
      quantity: 'Số lượng',
      unitPrice: 'Đơn giá',
      total: 'Thành tiền',
      cancel: 'Huỷ',
      add: 'Thêm',
      adding: 'Đang thêm...',
      noProducts: 'Không có sản phẩm khả dụng',
      loading: 'Đang tải...',
    },
    en: {
      title: 'Add Product',
      selectProduct: 'Select Product',
      selectPlaceholder: 'Select a product...',
      quantity: 'Quantity',
      unitPrice: 'Unit Price',
      total: 'Total',
      cancel: 'Cancel',
      add: 'Add',
      adding: 'Adding...',
      noProducts: 'No products available',
      loading: 'Loading...',
    },
  };

  const t = texts[locale];

  // Fetch available products when dialog opens
  useEffect(() => {
    if (isOpen && campsiteSlug) {
      const fetchProducts = async () => {
        setLoading(true);
        try {
          const response = await fetch(`/api/campsite/${campsiteSlug}/products`);
          if (response.ok) {
            const data = await response.json();
            setProducts(data.products || []);
          }
        } catch (error) {
          console.error('Error fetching products:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchProducts();
    }
  }, [isOpen, campsiteSlug]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedProductId('');
      setQuantity(1);
    }
  }, [isOpen]);

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const totalPrice = selectedProduct ? selectedProduct.price * quantity : 0;

  const handleConfirm = () => {
    if (!selectedProductId || quantity < 1) return;
    onConfirm(selectedProductId, quantity);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {t.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
              {t.loading}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>{t.noProducts}</p>
            </div>
          ) : (
            <>
              {/* Product Select */}
              <div className="space-y-2">
                <Label>{t.selectProduct}</Label>
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.selectPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => {
                      const name = getLocalizedText(product.name, locale);
                      const unit = getLocalizedText(product.unit, locale);
                      return (
                        <SelectItem key={product.id} value={product.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{name}</span>
                            <span className="text-sm text-gray-500 ml-2">
                              {formatCurrency(product.price)}/{unit}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity Input */}
              <div className="space-y-2">
                <Label>{t.quantity}</Label>
                <Input
                  type="number"
                  min={1}
                  max={selectedProduct?.available_quantity || 99}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>

              {/* Price Preview */}
              {selectedProduct && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t.unitPrice}:</span>
                    <span>{formatCurrency(selectedProduct.price)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>{t.total}:</span>
                    <span className="text-lg">{formatCurrency(totalPrice)}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t.cancel}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedProductId || quantity < 1 || isLoading || loading}
          >
            {isLoading ? t.adding : t.add}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
