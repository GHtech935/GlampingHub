'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

interface TaxSettingsFormProps {
  campsiteId: string;
  onSuccess?: () => void;
  compact?: boolean;
}

export function TaxSettingsForm({ campsiteId, onSuccess, compact = false }: TaxSettingsFormProps) {
  const t = useTranslations('admin.taxConfiguration');

  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxRate, setTaxRate] = useState('10.00');
  const [taxNameVi, setTaxNameVi] = useState('VAT');
  const [taxNameEn, setTaxNameEn] = useState('VAT');
  const [changeReason, setChangeReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTaxConfig();
  }, [campsiteId]);

  const fetchTaxConfig = async () => {
    try {
      const response = await fetch(`/api/admin/campsites/${campsiteId}/tax`);
      if (response.ok) {
        const data = await response.json();
        const { campsite } = data;
        setTaxEnabled(campsite.taxEnabled);
        setTaxRate(campsite.taxRate.toString());
        setTaxNameVi(campsite.taxName?.vi || 'VAT');
        setTaxNameEn(campsite.taxName?.en || 'VAT');
      }
    } catch (error) {
      console.error('Error fetching tax config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!changeReason.trim()) {
      toast.error(t('reasonRequired') || 'Please provide a reason for this change');
      return;
    }

    const rateNum = parseFloat(taxRate);
    if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
      toast.error(t('rateInvalid') || 'Tax rate must be between 0 and 100');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/campsites/${campsiteId}/tax`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taxEnabled,
          taxRate: rateNum,
          taxName: {
            vi: taxNameVi,
            en: taxNameEn
          },
          changeReason
        })
      });

      if (response.ok) {
        toast.success(t('updateSuccess') || 'Tax configuration updated successfully');
        setChangeReason('');
        onSuccess?.();
      } else {
        const data = await response.json();
        toast.error(data.error || t('updateFailed') || 'Failed to update tax configuration');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(t('error') || 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${compact ? '' : ''}`}>
      {/* Enable/Disable Tax */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-0.5">
          <Label htmlFor="tax-enabled" className="text-base font-medium">
            {t('enableTax')}
          </Label>
          <p className="text-sm text-gray-500">
            {t('applyToAll')}
          </p>
        </div>
        <Switch
          id="tax-enabled"
          checked={taxEnabled}
          onCheckedChange={setTaxEnabled}
        />
      </div>

      {/* Only show form fields when tax is enabled */}
      {taxEnabled && (
        <>
          {/* Tax Rate */}
          <div className="space-y-2">
            <Label htmlFor="tax-rate">{t('taxRate')}</Label>
            <Input
              id="tax-rate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              placeholder="10.00"
            />
            <p className="text-xs text-gray-500">
              {t('taxRateExample')}
            </p>
          </div>

          {/* Tax Name - Vietnamese */}
          <div className="space-y-2">
            <Label htmlFor="tax-name-vi">{t('taxNameVi')}</Label>
            <Input
              id="tax-name-vi"
              value={taxNameVi}
              onChange={(e) => setTaxNameVi(e.target.value)}
              placeholder="VAT"
            />
          </div>

          {/* Tax Name - English */}
          <div className="space-y-2">
            <Label htmlFor="tax-name-en">{t('taxNameEn')}</Label>
            <Input
              id="tax-name-en"
              value={taxNameEn}
              onChange={(e) => setTaxNameEn(e.target.value)}
              placeholder="VAT"
            />
          </div>

          {/* Change Reason */}
          <div className="space-y-2">
            <Label htmlFor="change-reason">
              {t('changeReason')} <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="change-reason"
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder={t('changeReasonPlaceholder')}
              rows={compact ? 2 : 3}
            />
            <p className="text-xs text-gray-500">
              {t('requiredForAudit')}
            </p>
          </div>

          {/* Current Configuration Display */}
          <div className="p-4 bg-gray-50 rounded-md space-y-2">
            <h4 className="font-medium text-sm">{t('currentConfig')}:</h4>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">{t('status')}:</span>
                <Badge variant={taxEnabled ? "default" : "secondary"}>
                  {taxEnabled ? t('enabled') : t('disabled')}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">{t('rate')}:</span>
                <strong>{taxRate}%</strong>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">{t('name')}:</span>
                <strong>{taxNameVi} / {taxNameEn}</strong>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSave}
              disabled={isSaving || !changeReason.trim()}
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isSaving ? t('saving') : t('save')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
