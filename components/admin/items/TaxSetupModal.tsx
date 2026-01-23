'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface TaxData {
  id?: string;
  name: string;
  amount: number;
  amount_type: 'percent' | 'fixed';
  account_number: string;
  apply_to: 'all_customers' | 'specific';
  is_compound: boolean;
  is_inclusive: boolean;
  is_inclusive_hidden: boolean;
  apply_by_default: boolean;
  selected_items: string[];
}

interface TaxSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (tax: TaxData) => void;
  initialData?: TaxData | null;
  allItems?: Array<{ id: string; name: string }>;
}

export default function TaxSetupModal({
  open,
  onOpenChange,
  onSave,
  initialData = null,
  allItems = []
}: TaxSetupModalProps) {
  const t = useTranslations('admin.glamping.items.form');

  const [formData, setFormData] = useState<TaxData>({
    name: '',
    amount: 0,
    amount_type: 'percent',
    account_number: '',
    apply_to: 'all_customers',
    is_compound: false,
    is_inclusive: false,
    is_inclusive_hidden: false,
    apply_by_default: true,
    selected_items: [],
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        name: '',
        amount: 0,
        amount_type: 'percent',
        account_number: '',
        apply_to: 'all_customers',
        is_compound: false,
        is_inclusive: false,
        is_inclusive_hidden: false,
        apply_by_default: true,
        selected_items: [],
      });
    }
  }, [initialData, open]);

  const handleSave = () => {
    onSave(formData);
    onOpenChange(false);
  };

  const handleSelectAll = () => {
    setFormData(prev => ({
      ...prev,
      selected_items: allItems.map(item => item.id)
    }));
  };

  const handleDeselectAll = () => {
    setFormData(prev => ({
      ...prev,
      selected_items: []
    }));
  };

  const toggleItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      selected_items: prev.selected_items.includes(itemId)
        ? prev.selected_items.filter(id => id !== itemId)
        : [...prev.selected_items, itemId]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('taxes.taxSetupTitle')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Tax Name */}
          <div className="grid grid-cols-[200px_1fr] items-start gap-4">
            <Label className="text-right pt-2">
              {t('taxes.taxName')} <span className="text-orange-500">*</span>
            </Label>
            <div>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder=""
                className="w-full"
              />
              <p className="text-sm text-gray-500 mt-1">
                {t('taxes.taxNameHint')}
              </p>
            </div>
          </div>

          {/* Amount */}
          <div className="grid grid-cols-[200px_1fr] items-start gap-4">
            <Label className="text-right pt-2">
              {t('taxes.amount')} <span className="text-orange-500">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                className="w-40"
                min="0"
              />
              <Select
                value={formData.amount_type}
                onValueChange={(value: 'percent' | 'fixed') => setFormData(prev => ({ ...prev, amount_type: value }))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">{t('taxes.percent')}</SelectItem>
                  <SelectItem value="fixed">{t('taxes.fixed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Account Number */}
          <div className="grid grid-cols-[200px_1fr] items-start gap-4">
            <Label className="text-right pt-2">{t('taxes.accountNumber')}</Label>
            <div>
              <Input
                value={formData.account_number}
                onChange={(e) => setFormData(prev => ({ ...prev, account_number: e.target.value }))}
                className="w-full"
              />
              <p className="text-sm text-gray-500 mt-1">
                {t('taxes.accountNumberHint')}
              </p>
            </div>
          </div>

          {/* Apply Tax To */}
          <div className="grid grid-cols-[200px_1fr] items-start gap-4">
            <Label className="text-right pt-2">{t('taxes.applyTaxTo')}</Label>
            <Select
              value={formData.apply_to}
              onValueChange={(value: 'all_customers' | 'specific') => setFormData(prev => ({ ...prev, apply_to: value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_customers">{t('taxes.allCustomers')}</SelectItem>
                <SelectItem value="specific">{t('taxes.specificCustomers')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Options */}
          <div className="grid grid-cols-[200px_1fr] items-start gap-4">
            <Label className="text-right pt-2">{t('taxes.options')}</Label>
            <div className="space-y-4">
              {/* Compound */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="compound"
                    checked={formData.is_compound}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_compound: checked as boolean }))}
                  />
                  <Label htmlFor="compound" className="cursor-pointer font-normal">
                    {t('taxes.compound')}
                  </Label>
                </div>
                <p className="text-sm text-gray-500 ml-6">
                  {t('taxes.compoundDesc')}
                </p>
              </div>

              {/* Inclusive */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="inclusive"
                    checked={formData.is_inclusive}
                    onCheckedChange={(checked) => {
                      setFormData(prev => ({
                        ...prev,
                        is_inclusive: checked as boolean,
                        is_inclusive_hidden: checked ? prev.is_inclusive_hidden : false
                      }));
                    }}
                  />
                  <Label htmlFor="inclusive" className="cursor-pointer font-normal">
                    {t('taxes.inclusive')}
                  </Label>
                </div>
                <p className="text-sm text-gray-500 ml-6">
                  {t('taxes.inclusiveDesc')}
                </p>

                {/* Inclusive Hidden to Guest */}
                <div className="ml-6 mt-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="inclusive-hidden"
                      checked={formData.is_inclusive_hidden}
                      disabled={!formData.is_inclusive}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_inclusive_hidden: checked as boolean }))}
                    />
                    <Label
                      htmlFor="inclusive-hidden"
                      className={`cursor-pointer font-normal ${!formData.is_inclusive ? 'text-gray-400' : ''}`}
                    >
                      {t('taxes.inclusiveHidden')}
                    </Label>
                  </div>
                  <p className={`text-sm mt-1 ml-6 ${!formData.is_inclusive ? 'text-gray-400' : 'text-gray-500'}`}>
                    {t('taxes.inclusiveHiddenDesc')}
                  </p>
                </div>
              </div>

              {/* Apply By Default */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="apply-default"
                    checked={formData.apply_by_default}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, apply_by_default: checked as boolean }))}
                  />
                  <Label htmlFor="apply-default" className="cursor-pointer font-normal">
                    {t('taxes.applyByDefault')}
                  </Label>
                </div>
                <p className="text-sm text-gray-500 ml-6">
                  {t('taxes.applyByDefaultDesc')}
                </p>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="grid grid-cols-[200px_1fr] items-start gap-4">
            <Label className="text-right pt-2">{t('taxes.items')}</Label>
            <div>
              <div className="flex gap-2 mb-4">
                <Button type="button" variant="outline" onClick={handleSelectAll}>
                  {t('taxes.selectAll')}
                </Button>
                <Button type="button" variant="outline" onClick={handleDeselectAll}>
                  {t('taxes.deselectAll')}
                </Button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-4">
                {allItems.length === 0 ? (
                  <p className="text-sm text-gray-500">{t('taxes.noItems')}</p>
                ) : (
                  allItems.map(item => (
                    <div key={item.id} className="flex items-center gap-2 py-1">
                      <Checkbox
                        id={`item-${item.id}`}
                        checked={formData.selected_items.includes(item.id)}
                        onCheckedChange={() => toggleItem(item.id)}
                      />
                      <Label htmlFor={`item-${item.id}`} className="cursor-pointer font-normal">
                        {item.name}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!formData.name || formData.amount === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {initialData ? t('taxes.updateTax') : t('taxes.createTax')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
