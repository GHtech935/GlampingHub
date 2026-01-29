"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";

interface TransactionDetail {
  id: string;
  bookingCode: string;
  bookingId: string;
  customerName: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  amount: number;
  status: string;
  paymentMethod: string;
  note?: string | null;
  createdBy?: string | null;
  createdAt: string;
  transactionReference?: string | null;
  sepayRef?: string | null;
  sepayAccount?: string | null;
  sepayContent?: string | null;
}

interface TransactionDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionDetail | null;
  t: (key: string) => string;
  formatCurrency: (val: number) => string;
  formatDate: (val: string) => string;
}

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-green-100 text-green-800",
  refunded: "bg-purple-100 text-purple-800",
  pending: "bg-yellow-100 text-yellow-800",
  failed: "bg-red-100 text-red-800",
};

export function TransactionDetailModal({
  open,
  onOpenChange,
  transaction,
  t,
  formatCurrency,
  formatDate,
}: TransactionDetailModalProps) {
  if (!transaction) return null;

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: t("transactionId"), value: transaction.transactionReference || transaction.id },
    {
      label: t("bookingCode"),
      value: (
        <a
          href={`/admin/zones/all/bookings?search=${transaction.bookingCode}`}
          className="text-blue-600 hover:underline font-medium"
          target="_blank"
          rel="noopener noreferrer"
        >
          {transaction.bookingCode}
        </a>
      ),
    },
    { label: t("customer"), value: transaction.customerName || "-" },
    { label: t("email"), value: transaction.customerEmail || "-" },
    { label: t("phone"), value: transaction.customerPhone || "-" },
    {
      label: t("amount"),
      value: (
        <span className="font-semibold text-green-700">
          {formatCurrency(transaction.amount)}
        </span>
      ),
    },
    { label: t("method"), value: transaction.paymentMethod?.replace(/_/g, " ") || "-" },
    {
      label: t("status"),
      value: (
        <Badge className={`${STATUS_COLORS[transaction.status] || "bg-gray-100 text-gray-800"} text-xs`}>
          {transaction.status}
        </Badge>
      ),
    },
    { label: t("note"), value: transaction.note || "-" },
    {
      label: t("createdBy"),
      value: transaction.createdBy ? (
        <span className="inline-flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 text-gray-400" />
          {transaction.createdBy}
        </span>
      ) : "-",
    },
    { label: t("createdAt"), value: transaction.createdAt ? formatDate(transaction.createdAt) : "-" },
  ];

  if (transaction.sepayRef) {
    rows.push({ label: t("sepayRef"), value: transaction.sepayRef });
  }
  if (transaction.sepayAccount) {
    rows.push({ label: t("sepayAccount"), value: transaction.sepayAccount });
  }
  if (transaction.sepayContent) {
    rows.push({ label: t("sepayContent"), value: transaction.sepayContent });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {rows.map((row, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-sm text-gray-500 w-36 flex-shrink-0">{row.label}</span>
              <span className="text-sm text-gray-900 flex-1">{row.value}</span>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="bg-blue-600 hover:bg-blue-700">
            {t("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
