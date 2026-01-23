'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TaxSettingsForm } from './TaxSettingsForm';
import { useTranslations } from 'next-intl';

interface TaxSettingsDialogProps {
  campsiteId: string;
  campsiteName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TaxSettingsDialog({
  campsiteId,
  campsiteName,
  open,
  onOpenChange,
  onSuccess
}: TaxSettingsDialogProps) {
  const t = useTranslations('admin.campsiteCard');

  const handleSuccess = () => {
    onSuccess?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('taxSettings')}</DialogTitle>
          <p className="text-sm text-gray-500">{campsiteName}</p>
        </DialogHeader>
        <TaxSettingsForm
          campsiteId={campsiteId}
          onSuccess={handleSuccess}
          compact
        />
      </DialogContent>
    </Dialog>
  );
}
