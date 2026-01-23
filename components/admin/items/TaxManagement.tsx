'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Paperclip } from 'lucide-react';
import TaxSetupModal, { TaxData } from './TaxSetupModal';

interface TaxManagementProps {
  allItems?: Array<{ id: string; name: string }>;
  taxes?: Array<TaxData & { id: string; enabled: boolean }>;
  setTaxes?: (taxes: Array<TaxData & { id: string; enabled: boolean }> | ((prev: Array<TaxData & { id: string; enabled: boolean }>) => Array<TaxData & { id: string; enabled: boolean }>)) => void;
}

export default function TaxManagement({
  allItems = [],
  taxes: externalTaxes,
  setTaxes: externalSetTaxes
}: TaxManagementProps) {
  const t = useTranslations('admin.glamping.items.form');

  const [showTaxModal, setShowTaxModal] = useState(false);
  const [editingTax, setEditingTax] = useState<TaxData | null>(null);

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
          onClick={() => {/* TODO: Implement attach existing tax */}}
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
    </>
  );
}
