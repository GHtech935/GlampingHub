'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Paperclip } from 'lucide-react';
import TaxSetupModal, { TaxData } from './TaxSetupModal';

interface TaxManagementProps {
  allItems?: Array<{ id: string; name: string }>;
  taxes?: Array<TaxData & { id: string; enabled: boolean }>;
  setTaxes?: (taxes: Array<TaxData & { id: string; enabled: boolean }> | ((prev: Array<TaxData & { id: string; enabled: boolean }>) => Array<TaxData & { id: string; enabled: boolean }>)) => void;
}

interface ExistingTax {
  id: string;
  name: string;
  amount: number;
  is_percentage: boolean;
  status: boolean;
  apply_to: string;
  type: string;
}

export default function TaxManagement({
  allItems = [],
  taxes: externalTaxes,
  setTaxes: externalSetTaxes
}: TaxManagementProps) {
  const t = useTranslations('admin.glamping.items.form');

  const [showTaxModal, setShowTaxModal] = useState(false);
  const [editingTax, setEditingTax] = useState<TaxData | null>(null);

  // Attach existing tax dialog state
  const [showAttachDialog, setShowAttachDialog] = useState(false);
  const [availableTaxes, setAvailableTaxes] = useState<ExistingTax[]>([]);
  const [selectedTaxIds, setSelectedTaxIds] = useState<string[]>([]);
  const [loadingTaxes, setLoadingTaxes] = useState(false);

  // Use external state if provided, otherwise use internal state
  const [internalTaxes, setInternalTaxes] = useState<Array<TaxData & { id: string; enabled: boolean }>>([]);

  const taxes = externalTaxes ?? internalTaxes;
  const setTaxes = externalSetTaxes ?? setInternalTaxes;

  const handleCreateTax = () => {
    setEditingTax(null);
    setShowTaxModal(true);
  };

  const handleEditTax = (tax: TaxData & { id: string; enabled: boolean }) => {
    setEditingTax(tax);
    setShowTaxModal(true);
  };

  const handleSaveTax = (taxData: TaxData) => {
    if (editingTax) {
      // Update existing tax
      setTaxes((prev: Array<TaxData & { id: string; enabled: boolean }>) => prev.map(t =>
        t.id === editingTax.id
          ? { ...t, ...taxData }
          : t
      ));
    } else {
      // Create new tax
      const newTax = {
        ...taxData,
        id: `tax_${Date.now()}`,
        enabled: true,  // Default to enabled
      };
      setTaxes((prev: Array<TaxData & { id: string; enabled: boolean }>) => [...prev, newTax]);
    }
  };

  const handleToggleTax = (taxId: string) => {
    setTaxes((prev: Array<TaxData & { id: string; enabled: boolean }>) => prev.map(t =>
      t.id === taxId
        ? { ...t, enabled: !t.enabled }
        : t
    ));
  };

  const formatAmount = (tax: TaxData & { id: string; enabled: boolean }) => {
    if (tax.amount_type === 'percent') {
      return `${tax.amount}%`;
    }
    return `${tax.amount.toLocaleString()} đ`;
  };

  const formatApplyTo = (applyTo: string) => {
    if (applyTo === 'all_customers') {
      return t('taxes.allCustomers');
    }
    return t('taxes.specificCustomers');
  };

  // Fetch all existing taxes from DB
  const fetchAvailableTaxes = useCallback(async () => {
    setLoadingTaxes(true);
    try {
      const response = await fetch('/api/admin/glamping/taxes');
      if (response.ok) {
        const data = await response.json();
        setAvailableTaxes(data.taxes || []);
      }
    } catch (error) {
      console.error('Error fetching taxes:', error);
    } finally {
      setLoadingTaxes(false);
    }
  }, []);

  const handleOpenAttachDialog = () => {
    setSelectedTaxIds([]);
    setShowAttachDialog(true);
    fetchAvailableTaxes();
  };

  const handleToggleSelectTax = (taxId: string) => {
    setSelectedTaxIds(prev =>
      prev.includes(taxId)
        ? prev.filter(id => id !== taxId)
        : [...prev, taxId]
    );
  };

  const handleAttachSelected = () => {
    const attachedIds = taxes.map(t => t.id);
    const toAttach = availableTaxes.filter(
      at => selectedTaxIds.includes(at.id) && !attachedIds.includes(at.id)
    );

    const newTaxes: Array<TaxData & { id: string; enabled: boolean }> = toAttach.map(at => ({
      id: at.id,
      name: at.name,
      amount: at.amount,
      amount_type: at.is_percentage ? 'percent' as const : 'fixed' as const,
      account_number: '',
      apply_to: (at.apply_to || 'all_customers') as 'all_customers' | 'specific',
      is_compound: false,
      is_inclusive: false,
      is_inclusive_hidden: false,
      apply_by_default: true,
      selected_items: [],
      enabled: at.status,
    }));

    if (newTaxes.length > 0) {
      setTaxes((prev: Array<TaxData & { id: string; enabled: boolean }>) => [...prev, ...newTaxes]);
    }

    setShowAttachDialog(false);
    setSelectedTaxIds([]);
  };

  // Filter out already-attached taxes
  const attachedIds = taxes.map(t => t.id);
  const unattachedTaxes = availableTaxes.filter(at => !attachedIds.includes(at.id));

  return (
    <>
      <div className="border rounded-lg overflow-hidden mb-6 bg-white">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                {t('table.name')}
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                {t('taxes.options')}
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                {t('table.optIn')}
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                {t('table.amount')}
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                {t('table.details')}
              </th>
            </tr>
          </thead>
          <tbody>
            {taxes.map((tax) => (
              <tr key={tax.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">{tax.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {t('taxes.normal')}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {formatApplyTo(tax.apply_to)}
                </td>
                <td className="px-4 py-3 text-sm">{formatAmount(tax)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={tax.enabled}
                      onCheckedChange={() => handleToggleTax(tax.id)}
                    />
                    <span className={`text-xs font-medium ${tax.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                      {tax.enabled ? t('taxes.on') : t('taxes.off')}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditTax(tax)}
                  >
                    {t('taxes.edit')}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create New Tax Button */}
      <div className="mb-6 flex gap-2">
        <Button
          type="button"
          onClick={handleCreateTax}
        >
          {t('taxes.createNewTax')}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleOpenAttachDialog}
        >
          <Paperclip className="w-4 h-4 mr-2" />
          {t('taxes.attachExistingTax')}
        </Button>
      </div>

      {/* Tax Setup Modal */}
      <TaxSetupModal
        open={showTaxModal}
        onOpenChange={setShowTaxModal}
        onSave={handleSaveTax}
        initialData={editingTax}
        allItems={allItems}
      />

      {/* Attach Existing Tax Dialog */}
      <Dialog open={showAttachDialog} onOpenChange={setShowAttachDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('taxes.attachExistingTaxTitle')}</DialogTitle>
            <DialogDescription>{t('taxes.attachExistingTaxDescription')}</DialogDescription>
          </DialogHeader>

          <div className="py-4 max-h-[400px] overflow-y-auto">
            {loadingTaxes ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : availableTaxes.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                {t('taxes.noAvailableTaxes')}
              </p>
            ) : (
              <div className="space-y-2">
                {availableTaxes.map(tax => {
                  const isAttached = attachedIds.includes(tax.id);
                  return (
                    <label
                      key={tax.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg ${
                        isAttached
                          ? 'opacity-40 cursor-not-allowed bg-gray-50'
                          : 'hover:bg-gray-50 cursor-pointer'
                      }`}
                    >
                      <Checkbox
                        checked={isAttached || selectedTaxIds.includes(tax.id)}
                        onCheckedChange={() => !isAttached && handleToggleSelectTax(tax.id)}
                        disabled={isAttached}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">
                          {tax.name}
                          {isAttached && (
                            <span className="ml-2 text-xs text-gray-400 font-normal">
                              (Đã đính kèm)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {tax.is_percentage ? `${tax.amount}%` : `${tax.amount.toLocaleString()} đ`}
                          {' · '}
                          {tax.status ? 'BẬT' : 'TẮT'}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAttachDialog(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleAttachSelected}
              disabled={selectedTaxIds.length === 0}
            >
              {t('taxes.attachSelectedTaxes', { count: selectedTaxIds.length })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
