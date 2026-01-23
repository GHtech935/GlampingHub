'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslations, useLocale } from 'next-intl';
import { Loader2, History } from 'lucide-react';
import { TaxSettingsForm } from './TaxSettingsForm';

interface TaxConfigurationProps {
  campsiteId: string;
}

interface TaxHistoryEntry {
  id: string;
  oldTaxEnabled: boolean;
  oldTaxRate: number | null;
  oldTaxName: any;
  newTaxEnabled: boolean;
  newTaxRate: number | null;
  newTaxName: any;
  changeReason: string;
  changedAt: string;
  changedByName: string;
  changedByEmail: string;
}

export function TaxConfiguration({ campsiteId }: TaxConfigurationProps) {
  const t = useTranslations('admin.taxConfiguration');
  const locale = useLocale();

  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<TaxHistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`/api/admin/campsites/${campsiteId}/tax-history`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const toggleHistory = () => {
    if (!showHistory && history.length === 0) {
      fetchHistory();
    }
    setShowHistory(!showHistory);
  };

  const handleFormSuccess = () => {
    // Refresh history if visible
    if (showHistory) {
      fetchHistory();
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('taxConfig')}</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleHistory}
        >
          <History className="w-4 h-4 mr-2" />
          {showHistory ? t('hideHistory') : t('viewHistory')}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tax Settings Form */}
        <TaxSettingsForm
          campsiteId={campsiteId}
          onSuccess={handleFormSuccess}
        />

        {/* History Section */}
        {showHistory && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-medium mb-4">{t('changeHistory')}</h4>
            {isLoadingHistory ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-gray-500 text-sm">{t('noChanges')}</p>
            ) : (
              <div className="space-y-4">
                {history.map((entry) => (
                  <div key={entry.id} className="border-l-2 border-gray-300 pl-4 pb-4">
                    <div className="space-y-2">
                      {/* What changed */}
                      <div className="space-y-1">
                        {entry.oldTaxEnabled !== entry.newTaxEnabled && (
                          <div className="text-sm">
                            {t('status')}: {entry.newTaxEnabled ? (
                              <Badge variant="default" className="ml-1">{t('enabled')}</Badge>
                            ) : (
                              <Badge variant="secondary" className="ml-1">{t('disabled')}</Badge>
                            )}
                          </div>
                        )}
                        {entry.oldTaxRate !== entry.newTaxRate && (
                          <div className="text-sm">
                            {t('rate')}: <del className="text-gray-500">{entry.oldTaxRate}%</del>
                            {' → '}
                            <strong>{entry.newTaxRate}%</strong>
                          </div>
                        )}
                        {JSON.stringify(entry.oldTaxName) !== JSON.stringify(entry.newTaxName) && (
                          <div className="text-sm">
                            {t('name')}: <del className="text-gray-500">{entry.oldTaxName?.vi}</del>
                            {' → '}
                            <strong>{entry.newTaxName?.vi}</strong>
                          </div>
                        )}
                      </div>

                      {/* Who and when */}
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">{entry.changedByName}</span>
                        {' '}({entry.changedByEmail})
                        {' • '}
                        <span>{new Date(entry.changedAt).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')}</span>
                      </div>

                      {/* Reason */}
                      {entry.changeReason && (
                        <div className="text-sm italic text-gray-700">
                          {t('reason')}: {entry.changeReason}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
