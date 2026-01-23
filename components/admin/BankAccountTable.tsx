"use client";

import { useState } from "react";
import { Edit, Trash, Star, Users, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BankAccount {
  id: string;
  bank_name: string;
  bank_id: string;
  account_number: string;
  account_holder: string;
  is_default: boolean;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  _usage?: {
    campsite_count: number;
    glamping_zone_count: number;
    transaction_count: number;
    total_amount: number;
  };
}

interface BankAccountTableProps {
  accounts: BankAccount[];
  onEdit: (account: BankAccount) => void;
  onDelete: (accountId: string) => void;
  onSetDefault: (accountId: string) => void;
}

export default function BankAccountTable({
  accounts,
  onEdit,
  onDelete,
  onSetDefault,
}: BankAccountTableProps) {
  const t = useTranslations('admin.bankAccountsPage.table');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<BankAccount | null>(null);

  const handleDeleteClick = (account: BankAccount) => {
    setAccountToDelete(account);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (accountToDelete) {
      onDelete(accountToDelete.id);
    }
    setDeleteDialogOpen(false);
    setAccountToDelete(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('bankName')}</TableHead>
              <TableHead>{t('accountNumber')}</TableHead>
              <TableHead>{t('accountHolder')}</TableHead>
              <TableHead>{t('status')}</TableHead>
              <TableHead>{t('usage')}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id}>
                {/* Bank */}
                <TableCell>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{account.bank_name}</span>
                      {account.is_default && (
                        <Badge variant="default" className="text-xs">
                          <Star className="w-3 h-3 mr-1" />
                          {t('default')}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {account.bank_id}
                    </span>
                  </div>
                </TableCell>

                {/* Account Number */}
                <TableCell>
                  <code className="text-sm bg-muted px-2 py-1 rounded">
                    {account.account_number}
                  </code>
                </TableCell>

                {/* Account Holder */}
                <TableCell>
                  <span className="text-sm">{account.account_holder}</span>
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge
                    variant={account.is_active ? "success" : "secondary"}
                  >
                    {account.is_active ? t('active') : t('inactive')}
                  </Badge>
                </TableCell>

                {/* Usage */}
                <TableCell>
                  <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{account._usage?.campsite_count || 0} {t('campsites')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{account._usage?.glamping_zone_count || 0} {t('glampingZones')}</span>
                    </div>
                    {account._usage && account._usage.transaction_count > 0 && (
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        <span>
                          {account._usage.transaction_count} {t('transactions')} ({formatCurrency(account._usage.total_amount)})
                        </span>
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {!account.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSetDefault(account.id)}
                        title={t('setDefault')}
                      >
                        <Star className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(account)}
                      title={t('edit')}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {!account.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(account)}
                        title={t('delete')}
                      >
                        <Trash className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground">
                {t('confirmDeleteDesc')}{" "}
                <strong>{accountToDelete?.bank_name} - {accountToDelete?.account_number}</strong>?
                <br />
                <br />
                {t('deleteWarning')}
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>{t('deleteRule1')}</li>
                  <li>{t('deleteRule2')}</li>
                  <li>{t('deleteRule3')}</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
