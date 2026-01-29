"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ParameterFormData {
  name: string;
  default_value: number;
  display_order: number;
  link_to_guests: boolean;
  controls_inventory: boolean;
  sets_pricing: boolean;
  price_range: boolean;
  required: boolean;
  visibility: 'everyone' | 'staff' | 'hidden';
  counted_for_menu: boolean;
}

interface ParameterFormProps {
  onSubmit: (data: ParameterFormData) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  showCard?: boolean;
  initialData?: Partial<ParameterFormData>;
  isEditing?: boolean;
}

export function ParameterForm({ onSubmit, onCancel, loading = false, showCard = true, initialData, isEditing = false }: ParameterFormProps) {
  const t = useTranslations("admin.glamping.parameters.form");

  const [formData, setFormData] = useState<ParameterFormData>({
    name: initialData?.name || "",
    default_value: initialData?.default_value || 1,
    display_order: initialData?.display_order || 0,
    link_to_guests: initialData?.link_to_guests || false,
    controls_inventory: initialData?.controls_inventory || false,
    sets_pricing: initialData?.sets_pricing !== undefined ? initialData.sets_pricing : true,
    price_range: initialData?.price_range || false,
    required: initialData?.required || false,
    visibility: initialData?.visibility || "everyone",
    counted_for_menu: initialData?.counted_for_menu || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const FormContent = (
    <div className="space-y-6">
      {/* 1. Name Field */}
      <div className="space-y-2">
        <Label htmlFor="name">
          {t('name')} <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          placeholder={t('namePlaceholder')}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        <p className="text-sm text-gray-500">
          {t('nameDescription')}
        </p>
      </div>

      {/* 2. Default Value Field */}
      <div className="space-y-2">
        <Label htmlFor="default_value">{t('defaultValue')}</Label>
        <Input
          id="default_value"
          type="number"
          min="0"
          value={formData.default_value}
          onChange={(e) => setFormData({ ...formData, default_value: parseInt(e.target.value) || 0 })}
        />
        <p className="text-sm text-gray-500">
          {t('defaultValueHint')}
        </p>
      </div>

      {/* 3. Display Order Field */}
      <div className="space-y-2">
        <Label htmlFor="display_order">{t('displayOrder')}</Label>
        <Input
          id="display_order"
          type="number"
          min="0"
          value={formData.display_order}
          onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
        />
        <p className="text-sm text-gray-500">
          {t('displayOrderHint')}
        </p>
      </div>

      {/* 4. Guest Section */}
      <div className="flex items-start space-x-2">
        <Checkbox
          id="link_to_guests"
          checked={formData.link_to_guests}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, link_to_guests: checked as boolean })
          }
        />
        <div className="flex flex-col">
          <Label htmlFor="link_to_guests" className="cursor-pointer">
            {t('linkToGuests')}
          </Label>
          <p className="text-sm text-gray-500">
            {t('linkToGuestsDescription')}
          </p>
        </div>
      </div>

      {/* 4.5 Counted for Menu Section */}
      <div className="flex items-start space-x-2">
        <Checkbox
          id="counted_for_menu"
          checked={formData.counted_for_menu}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, counted_for_menu: checked as boolean })
          }
        />
        <div className="flex flex-col">
          <Label htmlFor="counted_for_menu" className="cursor-pointer">
            Được chọn món ăn
          </Label>
          <p className="text-sm text-gray-500">
            Khách với tham số này sẽ được tính vào việc chọn menu combo
          </p>
        </div>
      </div>

      {/* 5. Pricing Section */}
      <div className="flex items-start space-x-2">
        <Checkbox
          id="sets_pricing"
          checked={formData.sets_pricing}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, sets_pricing: checked as boolean })
          }
        />
        <div className="flex flex-col">
          <Label htmlFor="sets_pricing" className="cursor-pointer">
            {t('setsPricing')}
          </Label>
          <p className="text-sm text-gray-500">
            {t('pricingDescription')}
          </p>
        </div>
      </div>

      {/* 6. Range Section */}
      <div className="flex items-start space-x-2">
        <Checkbox
          id="price_range"
          checked={formData.price_range}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, price_range: checked as boolean })
          }
        />
        <div className="flex flex-col">
          <Label htmlFor="price_range" className="cursor-pointer">
            {t('priceRange')}
          </Label>
          <p className="text-sm text-gray-500">
            {t('rangeDescription')} <span className="text-gray-400">{t('rangeExample')}</span>
          </p>
        </div>
      </div>

      {/* 7. Controls Inventory Section */}
      <div className="flex items-start space-x-2">
        <Checkbox
          id="controls_inventory"
          checked={formData.controls_inventory}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, controls_inventory: checked as boolean })
          }
        />
        <div className="flex flex-col">
          <Label htmlFor="controls_inventory" className="cursor-pointer">
            {t('controlsInventory')}
          </Label>
          <p className="text-sm text-gray-500">
            {t('controlsInventoryDescription')} <span className="text-gray-400">{t('inventoryNote')}</span>
          </p>
        </div>
      </div>

      {/* 8. Required Section */}
      <div className="flex items-start space-x-2">
        <Checkbox
          id="required"
          checked={formData.required}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, required: checked as boolean })
          }
        />
        <div className="flex flex-col">
          <Label htmlFor="required" className="cursor-pointer">
            {t('required')}
          </Label>
          <p className="text-sm text-gray-500">
            {t('requiredNote')}
          </p>
        </div>
      </div>

      {/* 9. Visibility Section (3 buttons) */}
      <div className="space-y-2">
        <Label>{t('visibility')}</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={formData.visibility === 'everyone' ? 'default' : 'outline'}
            onClick={() => setFormData({ ...formData, visibility: 'everyone' })}
            className="flex-1"
          >
            {t('visibilityCustomersAndStaff')}
          </Button>
          <Button
            type="button"
            variant={formData.visibility === 'staff' ? 'default' : 'outline'}
            onClick={() => setFormData({ ...formData, visibility: 'staff' })}
            className="flex-1"
          >
            {t('visibilityStaffOnly')}
          </Button>
          <Button
            type="button"
            variant={formData.visibility === 'hidden' ? 'default' : 'outline'}
            onClick={() => setFormData({ ...formData, visibility: 'hidden' })}
            className="flex-1"
          >
            {t('visibilityHidden')}
          </Button>
        </div>
        <p className="text-sm text-gray-500">
          {t('visibilityDescription')}
        </p>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit}>
      {showCard ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>
              {t('description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {FormContent}
          </CardContent>
        </Card>
      ) : (
        FormContent
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 mt-6">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            {t('cancel')}
          </Button>
        )}
        <Button type="submit" disabled={loading || !formData.name}>
          {loading
            ? (isEditing ? t('updating') || 'Đang cập nhật...' : t('creating'))
            : (isEditing ? t('updateParameter') || 'Cập nhật tham số' : t('createParameter'))
          }
        </Button>
      </div>
    </form>
  );
}
