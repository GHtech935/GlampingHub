"use client";

import { useState, useEffect } from "react";
import { Plus, Landmark, RefreshCw, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import BankAccountTable from "@/components/admin/BankAccountTable";
import BankAccountForm from "@/components/admin/BankAccountForm";

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

export default function BankAccountsPage() {
  const t = useTranslations('admin.bankAccountsPage');
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);

  // Ensure SweetAlert appears on top of modals
  const ensureSwalOnTop = () => {
    const backdrop = document.querySelector('.swal2-container');
    if (backdrop) {
      (backdrop as HTMLElement).style.zIndex = '99999';
    }
  };

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<string>("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  // Fetch bank accounts
  const fetchAccounts = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
      });

      if (filterActive !== "all") {
        params.append("is_active", filterActive);
      }

      if (searchTerm) {
        params.append("search", searchTerm);
      }

      const response = await fetch(`/api/admin/bank-accounts?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch bank accounts");
      }

      setAccounts(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error("Error fetching bank accounts:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, filterActive]);

  // Handle search submit
  const handleSearch = () => {
    setCurrentPage(1);
    fetchAccounts();
  };

  // Handle edit
  const handleEdit = (account: BankAccount) => {
    setSelectedAccount(account);
    setIsFormOpen(true);
  };

  // Handle delete
  const handleDelete = async (accountId: string) => {
    try {
      const response = await fetch(`/api/admin/bank-accounts/${accountId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        // Extract count from error message if available (e.g., "used by 2 campsites/zones")
        const countMatch = data.error?.match(/(\d+)\s*campsites?\/zones?/i);
        const count = countMatch ? countMatch[1] : "0";

        Swal.fire({
          title: t('messages.deleteError'),
          text: t('messages.deleteErrorDesc', { count }),
          icon: "error",
          confirmButtonColor: "#ef4444",
          didOpen: ensureSwalOnTop,
        });
        return;
      }

      // Refresh list
      fetchAccounts();
    } catch (err) {
      console.error("Error deleting bank account:", err);
      Swal.fire({
        title: t('messages.deleteError'),
        text: t('messages.error'),
        icon: "error",
        confirmButtonColor: "#ef4444",
        didOpen: ensureSwalOnTop,
      });
    }
  };

  // Handle set default
  const handleSetDefault = async (accountId: string) => {
    try {
      const response = await fetch(`/api/admin/bank-accounts/${accountId}/set-default`, {
        method: "PUT",
      });

      const data = await response.json();

      if (!response.ok) {
        Swal.fire({
          title: t('messages.setDefaultError'),
          text: data.error || t('messages.setDefaultErrorDesc'),
          icon: "error",
          confirmButtonColor: "#ef4444",
          didOpen: ensureSwalOnTop,
        });
        return;
      }

      // Refresh list
      fetchAccounts();
    } catch (err) {
      console.error("Error setting default:", err);
      Swal.fire({
        title: t('messages.setDefaultError'),
        text: t('messages.setDefaultErrorDesc'),
        icon: "error",
        confirmButtonColor: "#ef4444",
        didOpen: ensureSwalOnTop,
      });
    }
  };

  // Handle form close
  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedAccount(null);
  };

  // Handle form save
  const handleFormSave = () => {
    setIsFormOpen(false);
    setSelectedAccount(null);
    fetchAccounts();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {t('title')}
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
          {t('subtitle')}
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('filters')}</CardTitle>
          <CardDescription>
            {t('filtersDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">{t('search')}</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder={t('searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleSearch} variant="secondary">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Active Filter */}
            <div className="space-y-2">
              <Label>{t('status')}</Label>
              <Select value={filterActive} onValueChange={setFilterActive}>
                <SelectTrigger>
                  <SelectValue placeholder={t('statusAll')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('statusAll')}</SelectItem>
                  <SelectItem value="true">{t('statusActive')}</SelectItem>
                  <SelectItem value="false">{t('statusInactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Label className="invisible">{t('actions')}</Label>
              <div className="flex gap-2">
                <Button onClick={() => setIsFormOpen(true)} className="flex-1">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('addAccount')}
                </Button>
                <Button onClick={fetchAccounts} variant="outline" size="icon">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bank Accounts Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Landmark className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t('accountsList')}</CardTitle>
              <CardDescription>
                {accounts.length} {t('accountsFound')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">{t('loading')}</span>
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-12">
              <Landmark className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                {t('noAccounts')}
              </p>
              <Button onClick={() => setIsFormOpen(true)} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                {t('addBankAccount')}
              </Button>
            </div>
          ) : (
            <>
              <BankAccountTable
                accounts={accounts}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSetDefault={handleSetDefault}
              />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t">
                  <p className="text-sm text-muted-foreground">
                    {t('page')} {currentPage} {t('of')} {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      {t('previous')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      {t('next')}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Bank Account Form Dialog */}
      {isFormOpen && (
        <BankAccountForm
          account={selectedAccount}
          onClose={handleFormClose}
          onSave={handleFormSave}
        />
      )}
    </div>
  );
}
