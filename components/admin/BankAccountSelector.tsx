"use client";

import { useState, useEffect } from "react";
import { Landmark, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";

interface BankAccount {
  id: string;
  bank_name: string;
  bank_id: string;
  account_number: string;
  account_holder: string;
  is_default: boolean;
}

interface BankAccountSelectorProps {
  entityType: "campsite" | "glamping_zone";
  entityId: string;
  currentBankAccountId?: string | null;
  onSave?: () => void; // Optional callback after save
}

export function BankAccountSelector({
  entityType,
  entityId,
  currentBankAccountId,
  onSave,
}: BankAccountSelectorProps) {
  const t = useTranslations('admin.bankAccountSelector');
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    currentBankAccountId || null
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch bank accounts
  useEffect(() => {
    const fetchBankAccounts = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/admin/bank-accounts?is_active=true");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch bank accounts");
        }

        setBankAccounts(data.data || []);
      } catch (err) {
        console.error("Error fetching bank accounts:", err);
        setError(err instanceof Error ? err.message : "Failed to load bank accounts");
      } finally {
        setLoading(false);
      }
    };

    fetchBankAccounts();
  }, []);

  // Handle selection change
  const handleSelectionChange = (value: string) => {
    const newValue = value === "default" ? null : value;
    setSelectedAccountId(newValue);
    setHasChanges(newValue !== currentBankAccountId);
  };

  // Handle save
  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      // Determine API endpoint based on entity type
      const endpoint =
        entityType === "campsite"
          ? `/api/admin/campsites/${entityId}`
          : `/api/admin/glamping/zones/${entityId}`;

      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_account_id: selectedAccountId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update bank account");
      }

      toast.success(t('updateSuccess'));
      setHasChanges(false);

      // Call onSave callback if provided
      if (onSave) {
        onSave();
      }
    } catch (err) {
      console.error("Error saving bank account:", err);
      setError(err instanceof Error ? err.message : t('updateError'));
      toast.error(t('updateError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="w-5 h-5" />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get default account
  const defaultAccount = bankAccounts.find((acc) => acc.is_default);
  const selectedAccount = bankAccounts.find((acc) => acc.id === selectedAccountId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Landmark className="w-5 h-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Bank Account Selector */}
        <div className="space-y-2">
          <Label htmlFor="bank_account">{t('label')}</Label>
          <Select
            value={selectedAccountId || "default"}
            onValueChange={handleSelectionChange}
            disabled={saving}
          >
            <SelectTrigger id="bank_account">
              <SelectValue placeholder={t('placeholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">
                {t('useDefault')}
                {defaultAccount && (
                  <span className="text-muted-foreground ml-2">
                    ({defaultAccount.bank_name} - {defaultAccount.account_number})
                  </span>
                )}
              </SelectItem>
              {bankAccounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.bank_name} - {account.account_number}
                  <span className="text-muted-foreground ml-2">
                    ({account.account_holder})
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Current Selection Info */}
        {selectedAccountId ? (
          selectedAccount && (
            <Alert className="border-primary/20 bg-primary/5">
              <CheckCircle className="h-4 w-4 text-primary" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">{t('usingSpecific')}</p>
                  <div className="text-sm">
                    <p>{t('bank')}: {selectedAccount.bank_name} ({selectedAccount.bank_id})</p>
                    <p>{t('account')}: {selectedAccount.account_number}</p>
                    <p>{t('holder')}: {selectedAccount.account_holder}</p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )
        ) : (
          defaultAccount && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">{t('usingDefault')}</p>
                  <div className="text-sm">
                    <p>{t('bank')}: {defaultAccount.bank_name} ({defaultAccount.bank_id})</p>
                    <p>{t('account')}: {defaultAccount.account_number}</p>
                    <p>{t('holder')}: {defaultAccount.account_holder}</p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )
        )}

        {/* Save Button */}
        {hasChanges && (
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              {t('saveChanges')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
