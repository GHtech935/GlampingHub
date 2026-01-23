"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface VietQRBank {
  id: number;
  name: string;
  shortName: string;
  code: string;
  bin: string;
  logo: string;
}

interface BankAccount {
  id: string;
  bank_name: string;
  bank_id: string;
  account_number: string;
  account_holder: string;
  is_default: boolean;
  is_active: boolean;
  notes?: string;
}

interface BankAccountFormProps {
  account: BankAccount | null;
  onClose: () => void;
  onSave: () => void;
}

export default function BankAccountForm({
  account,
  onClose,
  onSave,
}: BankAccountFormProps) {
  const t = useTranslations('admin.bankAccountsPage.form');
  const tMsg = useTranslations('admin.bankAccountsPage.messages');
  const isEdit = !!account;

  const [formData, setFormData] = useState({
    bank_name: "",
    bank_id: "",
    account_number: "",
    account_holder: "",
    is_default: false,
    is_active: true,
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banks, setBanks] = useState<VietQRBank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [bankSearch, setBankSearch] = useState("");
  const [openBankPopover, setOpenBankPopover] = useState(false);

  // Fetch banks list from VietQR API
  useEffect(() => {
    const fetchBanks = async () => {
      setLoadingBanks(true);
      try {
        const res = await fetch('/api/vietqr/banks');
        const data = await res.json();
        if (data.success) {
          setBanks(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch banks:', error);
      } finally {
        setLoadingBanks(false);
      }
    };
    fetchBanks();
  }, []);

  // Initialize form data
  useEffect(() => {
    if (account) {
      setFormData({
        bank_name: account.bank_name,
        bank_id: account.bank_id,
        account_number: account.account_number,
        account_holder: account.account_holder,
        is_default: account.is_default,
        is_active: account.is_active,
        notes: account.notes || "",
      });
    }
  }, [account]);

  // In edit mode, if bank not found in list, add it as custom option
  useEffect(() => {
    if (account && banks.length > 0) {
      const bankExists = banks.find(b => b.code === account.bank_id);
      if (!bankExists) {
        // Add current bank as custom option
        setBanks([
          ...banks,
          {
            id: 0,
            name: account.bank_name,
            shortName: account.bank_name,
            code: account.bank_id,
            bin: '',
            logo: '',
          }
        ]);
      }
    }
  }, [account, banks]);


  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = isEdit
        ? `/api/admin/bank-accounts/${account.id}`
        : "/api/admin/bank-accounts";

      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${isEdit ? "update" : "create"} bank account`);
      }

      onSave();
    } catch (err) {
      console.error("Error saving bank account:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('editTitle') : t('createTitle')}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t('editTitle')
              : t('createTitle')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Bank Selection with Search */}
            <div className="space-y-2">
              <Label htmlFor="bank">{t('selectBank')} *</Label>
              {loadingBanks ? (
                <div className="flex items-center justify-center py-3 border rounded-md">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">{t('loadingBanks')}</span>
                </div>
              ) : (
                <Popover open={openBankPopover} onOpenChange={setOpenBankPopover}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                        !formData.bank_id && "text-muted-foreground"
                      )}
                      disabled={loading}
                      onClick={() => setOpenBankPopover(!openBankPopover)}
                    >
                      {formData.bank_id ? (
                        <div className="flex items-center gap-2">
                          {banks.find(b => b.code === formData.bank_id)?.logo && (
                            <img
                              src={banks.find(b => b.code === formData.bank_id)?.logo}
                              alt=""
                              className="w-5 h-5 object-contain"
                            />
                          )}
                          <span>{formData.bank_name}</span>
                          <span className="text-xs text-muted-foreground">({formData.bank_id})</span>
                        </div>
                      ) : (
                        t('selectBankPlaceholder')
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[500px] p-0 z-[1200]" align="start">
                    <div className="p-2 border-b">
                      <Input
                        placeholder={t('searchBank')}
                        value={bankSearch}
                        onChange={(e) => setBankSearch(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-1">
                      {banks
                        .filter((bank) => {
                          const search = bankSearch.toLowerCase();
                          return (
                            bank.name.toLowerCase().includes(search) ||
                            bank.shortName.toLowerCase().includes(search) ||
                            bank.code.toLowerCase().includes(search)
                          );
                        })
                        .map((bank) => (
                          <button
                            key={bank.code}
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                bank_name: bank.name,
                                bank_id: bank.code,
                              });
                              setBankSearch("");
                              setOpenBankPopover(false);
                            }}
                            className={cn(
                              "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                              formData.bank_id === bank.code && "bg-accent"
                            )}
                          >
                            <div className="flex items-center gap-2 flex-1">
                              {bank.logo && (
                                <img src={bank.logo} alt={bank.name} className="w-6 h-6 object-contain" />
                              )}
                              <div className="flex flex-col items-start">
                                <span className="font-medium">{bank.shortName}</span>
                                <span className="text-xs text-muted-foreground">{bank.code}</span>
                              </div>
                            </div>
                            {formData.bank_id === bank.code && (
                              <Check className="h-4 w-4 ml-2" />
                            )}
                          </button>
                        ))}
                      {banks.filter((bank) => {
                        const search = bankSearch.toLowerCase();
                        return (
                          bank.name.toLowerCase().includes(search) ||
                          bank.shortName.toLowerCase().includes(search) ||
                          bank.code.toLowerCase().includes(search)
                        );
                      }).length === 0 && (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          {t('noBanksFound')}
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Account Number */}
            <div className="space-y-2">
              <Label htmlFor="account_number">{t('accountNumber')} *</Label>
              <Input
                id="account_number"
                value={formData.account_number}
                onChange={(e) =>
                  setFormData({ ...formData, account_number: e.target.value })
                }
                placeholder={t('accountNumberPlaceholder')}
                required
                disabled={loading}
              />
            </div>

            {/* Account Holder */}
            <div className="space-y-2">
              <Label htmlFor="account_holder">{t('accountHolder')} *</Label>
              <Input
                id="account_holder"
                value={formData.account_holder}
                onChange={(e) =>
                  setFormData({ ...formData, account_holder: e.target.value })
                }
                placeholder={t('accountHolderPlaceholder')}
                required
                disabled={loading}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">{t('notes')}</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder={t('notesPlaceholder')}
                rows={3}
                disabled={loading}
              />
            </div>

            {/* Checkboxes */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_default: checked as boolean })
                  }
                  disabled={loading}
                />
                <Label
                  htmlFor="is_default"
                  className="text-sm font-normal cursor-pointer"
                >
                  {t('isDefault')}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked as boolean })
                  }
                  disabled={loading}
                />
                <Label
                  htmlFor="is_active"
                  className="text-sm font-normal cursor-pointer"
                >
                  {t('isActive')}
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {loading ? (isEdit ? t('updating') : t('creating')) : (isEdit ? t('update') : t('create'))}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
