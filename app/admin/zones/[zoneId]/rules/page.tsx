"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, HelpCircle, Save, Trash2, ChevronDown, Check, Info, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { DAY_NAMES } from "@/lib/days-of-week";

interface Rule {
  id: string;
  rule_type: string;
  value: number | null;
  unit: string;
  apply_to_customer: boolean;
  apply_to_staff: boolean;
  is_strict: boolean;
  status: 'active' | 'disabled';
}

interface RuleSet {
  id: string;
  name: string;
  is_default: boolean;
  zone_id: string;
  rules: Rule[];
  active_rules_count?: number;
}

// Days of week for start_day_of_week rule
const DAYS_OF_WEEK = DAY_NAMES.map((name, index) => ({ value: index, label: name }));

// Rules that only work in default ruleset
const DEFAULT_ONLY_RULES = ['max_subtotal_value', 'min_subtotal_value'];

export default function RulesPage({ params }: { params: Promise<{ zoneId: string }> }) {
  const { zoneId } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("admin.glamping.rules");
  const tCommon = useTranslations("common");
  const tDays = useTranslations("admin.glamping.rules.daysOfWeek");

  const [ruleSets, setRuleSets] = useState<RuleSet[]>([]);
  const [selectedRuleSet, setSelectedRuleSet] = useState<RuleSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNewRuleSetDialog, setShowNewRuleSetDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newRuleSetName, setNewRuleSetName] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [localRules, setLocalRules] = useState<Rule[]>([]);

  // Redirect to dashboard if "all" zones selected
  useEffect(() => {
    if (zoneId === "all") {
      router.replace("/admin/zones/all/dashboard");
    }
  }, [zoneId, router]);

  // Fetch rule sets
  const fetchRuleSets = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/glamping/rules?zone_id=${zoneId}`);
      const data = await response.json();
      setRuleSets(data.ruleSets || []);

      // Auto-select default rule set or first one
      if (data.ruleSets && data.ruleSets.length > 0) {
        const defaultSet = data.ruleSets.find((rs: RuleSet) => rs.is_default);
        if (defaultSet) {
          await fetchRuleSetDetails(defaultSet.id);
        } else {
          await fetchRuleSetDetails(data.ruleSets[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch rule sets:', error);
      toast({
        title: t("error"),
        description: t("errorFetchRuleSets"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [zoneId, t, toast]);

  // Fetch single rule set with rules
  const fetchRuleSetDetails = async (ruleSetId: string) => {
    try {
      const response = await fetch(`/api/admin/glamping/rules/${ruleSetId}`);
      const data = await response.json();
      setSelectedRuleSet(data.ruleSet);
      setLocalRules(data.ruleSet.rules || []);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to fetch rule set details:', error);
    }
  };

  useEffect(() => {
    if (zoneId !== "all") {
      fetchRuleSets();
    }
  }, [zoneId, fetchRuleSets]);

  // Handle rule set selection
  const handleRuleSetChange = async (ruleSetId: string) => {
    if (ruleSetId === "new") {
      setShowNewRuleSetDialog(true);
      return;
    }
    await fetchRuleSetDetails(ruleSetId);
  };

  // Create new rule set
  const handleCreateRuleSet = async () => {
    if (!newRuleSetName.trim()) {
      toast({
        title: t("error"),
        description: t("errorNameRequired"),
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/admin/glamping/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRuleSetName,
          zone_id: zoneId,
          is_default: ruleSets.length === 0
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create rule set');
      }

      const data = await response.json();
      toast({
        title: t("success"),
        description: t("ruleSetCreated"),
      });

      setShowNewRuleSetDialog(false);
      setNewRuleSetName("");
      await fetchRuleSets();
      await fetchRuleSetDetails(data.ruleSet.id);
    } catch (error) {
      console.error('Failed to create rule set:', error);
      toast({
        title: t("error"),
        description: t("errorCreateRuleSet"),
        variant: "destructive",
      });
    }
  };

  // Update local rule
  const updateLocalRule = (ruleType: string, updates: Partial<Rule>) => {
    setLocalRules(prev => prev.map(rule =>
      rule.rule_type === ruleType ? { ...rule, ...updates } : rule
    ));
    setHasChanges(true);
  };

  // Save rules
  const handleSave = async () => {
    if (!selectedRuleSet) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/glamping/rules/${selectedRuleSet.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rules: localRules.map(rule => ({
            rule_type: rule.rule_type,
            value: rule.value,
            apply_to_customer: rule.apply_to_customer,
            apply_to_staff: rule.apply_to_staff,
            is_strict: rule.is_strict,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save rules');
      }

      const data = await response.json();
      setSelectedRuleSet(data.ruleSet);
      setLocalRules(data.ruleSet.rules);
      setHasChanges(false);

      toast({
        title: t("success"),
        description: t("rulesSaved"),
      });

      // Refresh rule sets list
      fetchRuleSets();
    } catch (error) {
      console.error('Failed to save rules:', error);
      toast({
        title: t("error"),
        description: t("errorSaveRules"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete rule set
  const handleDeleteRuleSet = async () => {
    if (!selectedRuleSet) return;

    try {
      const response = await fetch(`/api/admin/glamping/rules/${selectedRuleSet.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete rule set');
      }

      toast({
        title: t("success"),
        description: t("ruleSetDeleted"),
      });

      setShowDeleteDialog(false);
      setSelectedRuleSet(null);
      await fetchRuleSets();
    } catch (error: any) {
      console.error('Failed to delete rule set:', error);
      toast({
        title: t("error"),
        description: error.message || t("errorDeleteRuleSet"),
        variant: "destructive",
      });
    }
  };

  // Get rule name and description from translations
  const getRuleInfo = (ruleType: string) => {
    return {
      name: t(`ruleTypes.${ruleType}.name`),
      description: t(`ruleTypes.${ruleType}.description`),
    };
  };

  // Sort rules: active first, then by rule_type
  const sortedRules = [...localRules].sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (a.status !== 'active' && b.status === 'active') return 1;
    return a.rule_type.localeCompare(b.rule_type);
  });

  // Check if rule is default-only and current ruleset is not default
  const isRuleDisabled = (ruleType: string) => {
    if (!selectedRuleSet) return false;
    return DEFAULT_ONLY_RULES.includes(ruleType) && !selectedRuleSet.is_default;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">{tCommon("loading")}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <Button variant="ghost" size="sm">
          <HelpCircle className="w-4 h-4" />
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground">{t("ruleSet")}:</Label>
          <Select
            value={selectedRuleSet?.id || ""}
            onValueChange={handleRuleSetChange}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder={t("selectRuleSet")} />
            </SelectTrigger>
            <SelectContent>
              {ruleSets.map((rs) => (
                <SelectItem key={rs.id} value={rs.id}>
                  {rs.name} {rs.is_default && `(${t("default")})`}
                </SelectItem>
              ))}
              <SelectItem value="new">
                <span className="flex items-center gap-2 text-primary">
                  <Plus className="w-4 h-4" />
                  {t("newRuleSet")}
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedRuleSet && !selectedRuleSet.is_default && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {t("deleteRuleSet")}
          </Button>
        )}

        <div className="flex-1" />

        <Button
          onClick={handleSave}
          disabled={!hasChanges || saving}
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? t("saving") : tCommon("save")}
        </Button>
      </div>

      {/* Info Panel */}
      {selectedRuleSet && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">{t("infoTitle")}</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>{t("infoActivate")}</li>
                <li>{t("infoDisable")}</li>
                {!selectedRuleSet.is_default && (
                  <li className="text-amber-700">{t("infoDefaultOverride")}</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Rules Table */}
      {selectedRuleSet ? (
        <div className="bg-white border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-24">{t("status")}</TableHead>
                <TableHead className="max-w-md">{t("rule")}</TableHead>
                <TableHead className="w-40">{t("value")}</TableHead>
                <TableHead className="w-72">{t("applyTo")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRules.map((rule, index) => {
                const ruleInfo = getRuleInfo(rule.rule_type);
                const isDisabled = isRuleDisabled(rule.rule_type);
                const isActive = rule.value !== null && rule.value !== undefined;

                return (
                  <TableRow
                    key={rule.id}
                    className={cn(
                      index % 2 === 1 ? 'bg-gray-50' : '',
                      isDisabled && 'opacity-50'
                    )}
                  >
                    <TableCell>
                      {isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          {t("active")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                          {t("disabled")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{ruleInfo.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {ruleInfo.description}
                        </p>
                        {isDisabled && (
                          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {t("defaultOnlyWarning")}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {rule.rule_type === 'start_day_of_week' ? (
                        <Select
                          value={rule.value !== null && rule.value !== undefined ? rule.value.toString() : "none"}
                          onValueChange={(val) => updateLocalRule(rule.rule_type, {
                            value: val === "none" ? null : parseInt(val)
                          })}
                          disabled={isDisabled}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder={t("selectDay")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-</SelectItem>
                            {DAYS_OF_WEEK.map((day) => (
                              <SelectItem key={day.value} value={day.value.toString()}>
                                {tDays(day.label)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type="number"
                          value={rule.value ?? ""}
                          onChange={(e) => updateLocalRule(rule.rule_type, {
                            value: e.target.value ? parseInt(e.target.value) : null
                          })}
                          placeholder="-"
                          className="w-24"
                          disabled={isDisabled}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`customer-${rule.id}`}
                              checked={rule.apply_to_customer}
                              onCheckedChange={(checked) =>
                                updateLocalRule(rule.rule_type, { apply_to_customer: !!checked })
                              }
                              disabled={isDisabled}
                            />
                            <Label htmlFor={`customer-${rule.id}`} className="text-sm">
                              {t("customer")}
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`staff-${rule.id}`}
                              checked={rule.apply_to_staff}
                              onCheckedChange={(checked) =>
                                updateLocalRule(rule.rule_type, { apply_to_staff: !!checked })
                              }
                              disabled={isDisabled}
                            />
                            <Label htmlFor={`staff-${rule.id}`} className="text-sm">
                              {t("staff")}
                            </Label>
                          </div>
                        </div>
                        {rule.rule_type === 'max_duration_per_item' && (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`strict-${rule.id}`}
                              checked={rule.is_strict}
                              onCheckedChange={(checked) =>
                                updateLocalRule(rule.rule_type, { is_strict: !!checked })
                              }
                              disabled={isDisabled}
                            />
                            <Label htmlFor={`strict-${rule.id}`} className="text-sm text-amber-600">
                              {t("strict")}
                            </Label>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          {ruleSets.length === 0 ? (
            <div>
              <p className="mb-4">{t("noRuleSets")}</p>
              <Button onClick={() => setShowNewRuleSetDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t("createDefaultRuleSet")}
              </Button>
            </div>
          ) : (
            <p>{t("selectRuleSetPrompt")}</p>
          )}
        </div>
      )}

      {/* New Rule Set Dialog */}
      <Dialog open={showNewRuleSetDialog} onOpenChange={setShowNewRuleSetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("newRuleSetTitle")}</DialogTitle>
            <DialogDescription>{t("newRuleSetDescription")}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="ruleset-name">{t("ruleSetName")}</Label>
            <Input
              id="ruleset-name"
              value={newRuleSetName}
              onChange={(e) => setNewRuleSetName(e.target.value)}
              placeholder={t("ruleSetNamePlaceholder")}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewRuleSetDialog(false)}>
              {tCommon("cancel")}
            </Button>
            <Button onClick={handleCreateRuleSet}>
              {t("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteRuleSetTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteRuleSetConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRuleSet}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
