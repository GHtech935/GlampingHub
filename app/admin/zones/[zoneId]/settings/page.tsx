"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { MultilingualRichTextEditor, MultilingualValue } from "@/components/admin/MultilingualRichTextEditor";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface ZoneSettings {
  id: string;
  deposit_type: "percentage" | "fixed_amount";
  deposit_value: number;
  cancellation_policy: MultilingualValue;
  house_rules: MultilingualValue;
  enable_dinner_reminder_email: boolean;
  enable_single_person_surcharge_alert: boolean;
  single_person_surcharge_alert_text: MultilingualValue;
}

export default function ZoneSettingsPage({ params }: { params: Promise<{ zoneId: string }> }) {
  const { zoneId } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("admin.glamping.settings");
  const tCommon = useTranslations("admin.glamping.common");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Form state
  const [depositType, setDepositType] = useState<"percentage" | "fixed_amount">("percentage");
  const [depositValue, setDepositValue] = useState<string>("15");
  const [cancellationPolicy, setCancellationPolicy] = useState<MultilingualValue>({ vi: "", en: "" });
  const [houseRules, setHouseRules] = useState<MultilingualValue>({ vi: "", en: "" });
  const [enableDinnerReminderEmail, setEnableDinnerReminderEmail] = useState<boolean>(true);
  const [enableSinglePersonSurchargeAlert, setEnableSinglePersonSurchargeAlert] = useState<boolean>(false);
  const [singlePersonSurchargeAlertText, setSinglePersonSurchargeAlertText] = useState<MultilingualValue>({ vi: "Số tiền đã bao gồm phụ thu 1 người", en: "Price includes single person surcharge" });

  // Validation errors
  const [depositValueError, setDepositValueError] = useState<string>("");

  // Initial values for change detection
  const [initialValues, setInitialValues] = useState<ZoneSettings | null>(null);

  // Redirect to dashboard if "all" zones selected (not supported on this page)
  useEffect(() => {
    if (zoneId === "all") {
      router.replace("/admin/zones/all/dashboard");
    }
  }, [zoneId, router]);

  // Fetch zone settings
  useEffect(() => {
    if (zoneId !== "all") {
      fetchSettings();
    }
  }, [zoneId]);

  // Detect unsaved changes
  useEffect(() => {
    if (!initialValues) return;

    const hasChanges =
      depositType !== initialValues.deposit_type ||
      parseFloat(depositValue) !== initialValues.deposit_value ||
      JSON.stringify(cancellationPolicy) !== JSON.stringify(initialValues.cancellation_policy) ||
      JSON.stringify(houseRules) !== JSON.stringify(initialValues.house_rules) ||
      enableDinnerReminderEmail !== initialValues.enable_dinner_reminder_email ||
      enableSinglePersonSurchargeAlert !== initialValues.enable_single_person_surcharge_alert ||
      JSON.stringify(singlePersonSurchargeAlertText) !== JSON.stringify(initialValues.single_person_surcharge_alert_text);

    setHasUnsavedChanges(hasChanges);
  }, [depositType, depositValue, cancellationPolicy, houseRules, enableDinnerReminderEmail, enableSinglePersonSurchargeAlert, singlePersonSurchargeAlertText, initialValues]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`/api/admin/glamping/zones/${zoneId}/settings`);
      if (!response.ok) throw new Error("Failed to fetch settings");

      const data = await response.json();
      const zone = data.zone;

      setDepositType(zone.deposit_type || "percentage");
      setDepositValue(String(zone.deposit_value || 15));
      setCancellationPolicy(zone.cancellation_policy || { vi: "", en: "" });
      setHouseRules(zone.house_rules || { vi: "", en: "" });
      setEnableDinnerReminderEmail(zone.enable_dinner_reminder_email !== false);
      setEnableSinglePersonSurchargeAlert(zone.enable_single_person_surcharge_alert === true);
      setSinglePersonSurchargeAlertText(zone.single_person_surcharge_alert_text || { vi: "Số tiền đã bao gồm phụ thu 1 người", en: "Price includes single person surcharge" });

      // Save initial values
      setInitialValues({
        id: zone.id,
        deposit_type: zone.deposit_type || "percentage",
        deposit_value: zone.deposit_value || 15,
        cancellation_policy: zone.cancellation_policy || { vi: "", en: "" },
        house_rules: zone.house_rules || { vi: "", en: "" },
        enable_dinner_reminder_email: zone.enable_dinner_reminder_email !== false,
        enable_single_person_surcharge_alert: zone.enable_single_person_surcharge_alert === true,
        single_person_surcharge_alert_text: zone.single_person_surcharge_alert_text || { vi: "Số tiền đã bao gồm phụ thu 1 người", en: "Price includes single person surcharge" },
      });
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      toast({
        title: t("errorLoadTitle"),
        description: t("errorLoadDesc"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const validateDepositValue = (value: string, type: "percentage" | "fixed_amount"): boolean => {
    const numValue = parseFloat(value);

    if (isNaN(numValue)) {
      setDepositValueError(t("validation.depositRequired"));
      return false;
    }

    if (type === "percentage") {
      if (numValue < 0 || numValue > 100) {
        setDepositValueError(t("validation.depositPercentageRange"));
        return false;
      }
    } else {
      if (numValue < 0) {
        setDepositValueError(t("validation.depositFixedMin"));
        return false;
      }
    }

    setDepositValueError("");
    return true;
  };

  const handleDepositTypeChange = (value: "percentage" | "fixed_amount") => {
    setDepositType(value);
    validateDepositValue(depositValue, value);
  };

  const handleDepositValueChange = (value: string) => {
    setDepositValue(value);
    validateDepositValue(value, depositType);
  };

  const handleCurrencyValueChange = (value: number | undefined) => {
    const strValue = value !== undefined ? value.toString() : "";
    setDepositValue(strValue);
    validateDepositValue(strValue, depositType);
  };

  const handleSave = async () => {
    // Validate before saving
    if (!validateDepositValue(depositValue, depositType)) {
      toast({
        title: t("validation.invalidData"),
        description: t("validation.checkErrors"),
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/admin/glamping/zones/${zoneId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deposit_type: depositType,
          deposit_value: parseFloat(depositValue),
          cancellation_policy: cancellationPolicy,
          house_rules: houseRules,
          enable_dinner_reminder_email: enableDinnerReminderEmail,
          enable_single_person_surcharge_alert: enableSinglePersonSurchargeAlert,
          single_person_surcharge_alert_text: singlePersonSurchargeAlertText,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save settings");
      }

      const data = await response.json();

      // Update initial values
      setInitialValues({
        id: data.zone.id,
        deposit_type: data.zone.deposit_type,
        deposit_value: data.zone.deposit_value,
        cancellation_policy: data.zone.cancellation_policy,
        house_rules: data.zone.house_rules,
        enable_dinner_reminder_email: data.zone.enable_dinner_reminder_email !== false,
        enable_single_person_surcharge_alert: data.zone.enable_single_person_surcharge_alert === true,
        single_person_surcharge_alert_text: data.zone.single_person_surcharge_alert_text || { vi: "Số tiền đã bao gồm phụ thu 1 người", en: "Price includes single person surcharge" },
      });

      setHasUnsavedChanges(false);

      toast({
        title: t("successSaveTitle"),
        description: t("successSaveDesc"),
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast({
        title: t("errorSaveTitle"),
        description: error instanceof Error ? error.message : t("errorSaveDesc"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="text-sm text-gray-500 mt-1">{t("subtitle")}</p>
      </div>

      {/* Deposit Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t("deposit.title")}</CardTitle>
          <CardDescription>{t("deposit.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deposit-type">
                {t("deposit.typeLabel")}
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Select value={depositType} onValueChange={handleDepositTypeChange}>
                <SelectTrigger id="deposit-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">{t("deposit.typePercentage")}</SelectItem>
                  <SelectItem value="fixed_amount">{t("deposit.typeFixed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deposit-value">
                {t("deposit.valueLabel")}
                <span className="text-red-500 ml-1">*</span>
              </Label>
              {depositType === "percentage" ? (
                <Input
                  id="deposit-value"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={depositValue}
                  onChange={(e) => handleDepositValueChange(e.target.value)}
                  placeholder="15"
                />
              ) : (
                <CurrencyInput
                  id="deposit-value"
                  value={depositValue ? parseFloat(depositValue) : undefined}
                  onValueChange={handleCurrencyValueChange}
                  minValue={0}
                  placeholder="0"
                />
              )}
              {depositValueError && (
                <p className="text-sm text-red-500">{depositValueError}</p>
              )}
              <p className="text-sm text-gray-500">
                {depositType === "percentage"
                  ? t("deposit.helpTextPercentage")
                  : t("deposit.helpTextFixed")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cancellation Policy Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t("cancellation.title")}</CardTitle>
          <CardDescription>{t("cancellation.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <MultilingualRichTextEditor
            label={t("cancellation.contentLabel")}
            value={cancellationPolicy}
            onChange={setCancellationPolicy}
            placeholder={{
              vi: t("cancellation.placeholderVi"),
              en: t("cancellation.placeholderEn"),
            }}
          />
        </CardContent>
      </Card>

      {/* House Rules Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t("houseRules.title")}</CardTitle>
          <CardDescription>{t("houseRules.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <MultilingualRichTextEditor
            label={t("houseRules.contentLabel")}
            value={houseRules}
            onChange={setHouseRules}
            placeholder={{
              vi: t("houseRules.placeholderVi"),
              en: t("houseRules.placeholderEn"),
            }}
          />
        </CardContent>
      </Card>

      {/* Email Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t("email.title")}</CardTitle>
          <CardDescription>{t("email.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="dinner-reminder-toggle">
                {t("email.dinnerReminderLabel")}
              </Label>
              <p className="text-sm text-gray-500">
                {t("email.dinnerReminderDescription")}
              </p>
            </div>
            <Switch
              id="dinner-reminder-toggle"
              checked={enableDinnerReminderEmail}
              onCheckedChange={setEnableDinnerReminderEmail}
            />
          </div>
        </CardContent>
      </Card>

      {/* Single Person Surcharge Alert Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t("singlePersonSurcharge.title")}</CardTitle>
          <CardDescription>{t("singlePersonSurcharge.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="single-person-surcharge-toggle">
                {t("singlePersonSurcharge.enableLabel")}
              </Label>
              <p className="text-sm text-gray-500">
                {t("singlePersonSurcharge.enableDescription")}
              </p>
            </div>
            <Switch
              id="single-person-surcharge-toggle"
              checked={enableSinglePersonSurchargeAlert}
              onCheckedChange={setEnableSinglePersonSurchargeAlert}
            />
          </div>

          {enableSinglePersonSurchargeAlert && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="surcharge-text-vi">{t("singlePersonSurcharge.textViLabel")}</Label>
                <Input
                  id="surcharge-text-vi"
                  value={singlePersonSurchargeAlertText.vi}
                  onChange={(e) => setSinglePersonSurchargeAlertText(prev => ({ ...prev, vi: e.target.value }))}
                  placeholder="Số tiền đã bao gồm phụ thu 1 người"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="surcharge-text-en">{t("singlePersonSurcharge.textEnLabel")}</Label>
                <Input
                  id="surcharge-text-en"
                  value={singlePersonSurchargeAlertText.en}
                  onChange={(e) => setSinglePersonSurchargeAlertText(prev => ({ ...prev, en: e.target.value }))}
                  placeholder="Price includes single person surcharge"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button
          onClick={handleSave}
          disabled={!hasUnsavedChanges || saving || !!depositValueError}
          size="lg"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {tCommon("saving")}
            </>
          ) : (
            tCommon("save")
          )}
        </Button>
      </div>
    </div>
  );
}
