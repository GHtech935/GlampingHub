"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle } from "lucide-react";
import type { PaymentStatus } from "@/lib/booking-status";

interface CancelBookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, paymentStatus: PaymentStatus) => void;
  isLoading?: boolean;
  locale?: "vi" | "en";
}

const CANCEL_TYPES: { value: PaymentStatus; labelVi: string; labelEn: string; descriptionVi: string; descriptionEn: string }[] = [
  {
    value: "refund_pending",
    labelVi: "Chờ hoàn tiền",
    labelEn: "Refund Pending",
    descriptionVi: "Khách hàng sẽ được hoàn tiền sau khi xử lý",
    descriptionEn: "Customer will receive refund after processing",
  },
  {
    value: "refunded",
    labelVi: "Đã hoàn tiền",
    labelEn: "Refunded",
    descriptionVi: "Tiền đã được hoàn lại cho khách hàng",
    descriptionEn: "Money has been refunded to customer",
  },
  {
    value: "no_refund",
    labelVi: "Không hoàn tiền",
    labelEn: "No Refund",
    descriptionVi: "Huỷ theo chính sách không hoàn tiền",
    descriptionEn: "Cancelled under no-refund policy",
  },
];

export function CancelBookingDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  locale = "vi",
}: CancelBookingDialogProps) {
  const [reason, setReason] = useState("");
  const [cancelType, setCancelType] = useState<PaymentStatus>("no_refund");

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim(), cancelType);
  };

  const handleClose = () => {
    setReason("");
    setCancelType("no_refund");
    onClose();
  };

  const texts = {
    vi: {
      title: "Huỷ booking",
      reasonLabel: "Lý do huỷ",
      reasonPlaceholder: "Nhập lý do huỷ booking...",
      reasonRequired: "Vui lòng nhập lý do huỷ",
      typeLabel: "Loại huỷ",
      close: "Đóng",
      confirm: "Xác nhận huỷ",
      confirming: "Đang xử lý...",
      warning: "Hành động này không thể hoàn tác",
    },
    en: {
      title: "Cancel Booking",
      reasonLabel: "Cancellation Reason",
      reasonPlaceholder: "Enter cancellation reason...",
      reasonRequired: "Please enter a cancellation reason",
      typeLabel: "Cancellation Type",
      close: "Close",
      confirm: "Confirm Cancel",
      confirming: "Processing...",
      warning: "This action cannot be undone",
    },
  };

  const t = texts[locale];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {t.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          
          {/* Reason textarea */}
          <div className="space-y-2">
            <Label htmlFor="cancel-reason" className="text-sm font-medium">
              {t.reasonLabel} <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t.reasonPlaceholder}
              rows={3}
              className="resize-none"
            />
            {reason.trim() === "" && (
              <p className="text-xs text-muted-foreground">{t.reasonRequired}</p>
            )}
          </div>

          {/* Cancel type radio group */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t.typeLabel}</Label>
            <RadioGroup
              value={cancelType}
              onValueChange={(value) => setCancelType(value as PaymentStatus)}
              className="space-y-2"
            >
              {CANCEL_TYPES.map((type) => (
                <div
                  key={type.value}
                  className="flex items-start space-x-3 p-3 rounded-md border hover:bg-muted/50 cursor-pointer"
                  onClick={() => setCancelType(type.value)}
                >
                  <RadioGroupItem value={type.value} id={type.value} className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor={type.value} className="font-medium cursor-pointer">
                      {locale === "vi" ? type.labelVi : type.labelEn}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {locale === "vi" ? type.descriptionVi : type.descriptionEn}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            {t.close}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason.trim() || isLoading}
          >
            {isLoading ? t.confirming : t.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
