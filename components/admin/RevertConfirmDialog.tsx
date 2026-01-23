"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";

interface RevertConfirmDialogProps {
  operationId: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function RevertConfirmDialog({
  operationId,
  isOpen,
  onClose,
  onConfirm,
}: RevertConfirmDialogProps) {
  const t = useTranslations('admin.pricingPage.revertDialog');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-orange-600 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <h4 className="font-semibold text-orange-900 mb-1">{t('warningHeading')}</h4>
                <p className="text-sm text-orange-800">
                  {t('warningMessage')}
                </p>
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-600 space-y-2">
            <p>{t('actionIntro')}</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>{t('action1')}</li>
              <li>{t('action2')}</li>
              <li>{t('action3')}</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              {t('tip')}
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors"
          >
            {t('confirmRevert')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
