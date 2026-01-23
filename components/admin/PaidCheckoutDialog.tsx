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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle, Banknote, Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface PaidCheckoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paymentMethod: string) => void;
  balanceAmount: number;
  isLoading?: boolean;
  locale?: "vi" | "en";
  showVatNote?: boolean; // Show VAT note only when VAT toggle is ON
}

const PAYMENT_METHODS = [
  {
    value: "cash",
    labelVi: "Tiền mặt",
    labelEn: "Cash",
    descriptionVi: "Khách trả tiền mặt trực tiếp",
    descriptionEn: "Customer pays cash directly",
    icon: Banknote,
  },
  {
    value: "bank_transfer",
    labelVi: "Chuyển khoản",
    labelEn: "Bank Transfer",
    descriptionVi: "Khách chuyển khoản ngân hàng",
    descriptionEn: "Customer transfers via bank",
    icon: Building2,
  },
];

export function PaidCheckoutDialog({
  isOpen,
  onClose,
  onConfirm,
  balanceAmount,
  isLoading = false,
  locale = "vi",
  showVatNote = false,
}: PaidCheckoutDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const handleConfirm = () => {
    onConfirm(paymentMethod);
  };

  const handleClose = () => {
    setPaymentMethod("cash");
    onClose();
  };

  const texts = {
    vi: {
      title: "Xác nhận thanh toán & Checkout",
      amountLabel: "Số tiền cần thanh toán",
      amountNote: "Đã bao gồm thuế VAT nếu có",
      methodLabel: "Phương thức thanh toán",
      close: "Huỷ",
      confirm: "Xác nhận thanh toán",
      confirming: "Đang xử lý...",
    },
    en: {
      title: "Confirm Payment & Checkout",
      amountLabel: "Amount to be paid",
      amountNote: "Including VAT if applicable",
      methodLabel: "Payment Method",
      close: "Cancel",
      confirm: "Confirm Payment",
      confirming: "Processing...",
    },
  };

  const t = texts[locale];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            {t.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Amount display */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">{t.amountLabel}</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(balanceAmount)}
            </p>
            {showVatNote && (
              <p className="text-xs text-gray-500 mt-1">{t.amountNote}</p>
            )}
          </div>

          {/* Payment method radio group */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t.methodLabel}</Label>
            <RadioGroup
              value={paymentMethod}
              onValueChange={setPaymentMethod}
              className="space-y-2"
            >
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                return (
                  <div
                    key={method.value}
                    className={`flex items-center space-x-3 p-3 rounded-md border cursor-pointer transition-colors ${
                      paymentMethod === method.value
                        ? "border-green-500 bg-green-50"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => setPaymentMethod(method.value)}
                  >
                    <RadioGroupItem value={method.value} id={method.value} />
                    <Icon className="h-5 w-5 text-gray-500" />
                    <div className="flex-1">
                      <Label htmlFor={method.value} className="font-medium cursor-pointer">
                        {locale === "vi" ? method.labelVi : method.labelEn}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {locale === "vi" ? method.descriptionVi : method.descriptionEn}
                      </p>
                    </div>
                  </div>
                );
              })}
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            {t.close}
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? t.confirming : t.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
