'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from 'next-intl';
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckboxTree, CheckboxTreeItem } from "@/components/ui/checkbox-tree";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface Category {
  id: string;
  name: string;
  item_count: number;
  items: Array<{
    id: string;
    name: string;
  }>;
}

interface RuleSet {
  id: string;
  name: string;
}

interface DiscountFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  zoneId: string;
  discountId?: string;  // Optional - if provided, edit mode
}

export function DiscountFormModal({
  open,
  onOpenChange,
  onSuccess,
  zoneId,
  discountId
}: DiscountFormModalProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('admin.glamping.discounts.form');
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [loadingDiscount, setLoadingDiscount] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Helper function to get localized name
  const getLocalizedName = useCallback((name: any): string => {
    if (!name) return '';
    if (typeof name === 'string') return name;
    // For JSON objects like {"vi": "Bữa sáng", "en": "Breakfast"}
    return name[locale] || name.vi || name.en || '';
  }, [locale]);

  // Tab and category states
  const [activeTab, setActiveTab] = useState<'tent' | 'menu' | 'common_item'>('tent');
  const [tentCategories, setTentCategories] = useState<Category[]>([]);
  const [menuCategories, setMenuCategories] = useState<Category[]>([]);
  const [commonItemCategories, setCommonItemCategories] = useState<Category[]>([]);

  // Separate selection states
  const [selectedTentItems, setSelectedTentItems] = useState<string[]>([]);
  const [selectedMenuItems, setSelectedMenuItems] = useState<string[]>([]);
  const [selectedCommonItems, setSelectedCommonItems] = useState<string[]>([]);

  const [ruleSets, setRuleSets] = useState<RuleSet[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: 0,
    application_method: "per_booking_after_tax",
    recurrence: "always",
    start_date: "",
    end_date: "",
    rules_id: null as string | null,
    status: "active",
    no_end_date: false,
    weekly_days: [] as number[],
  });

  useEffect(() => {
    setIsEditMode(!!discountId);
  }, [discountId]);

  useEffect(() => {
    if (open) {
      fetchTentCategories();
      fetchMenuCategories();
      fetchCommonItemCategories();
      fetchRuleSets();

      if (discountId) {
        fetchDiscountData(discountId);
      } else {
        // Reset form for create mode
        resetForm();
      }
    }
  }, [open, zoneId, discountId]);

  const fetchTentCategories = async () => {
    try {
      const response = await fetch(`/api/admin/glamping/categories?zone_id=${zoneId}&is_tent_category=true`);
      const data = await response.json();

      // Fetch items for each category
      const categoriesWithItems = await Promise.all(
        (data.categories || []).map(async (cat: any) => {
          const itemsRes = await fetch(`/api/admin/glamping/items?zone_id=${zoneId}&category_id=${cat.id}`);
          const itemsData = await itemsRes.json();
          return {
            ...cat,
            items: itemsData.items || []
          };
        })
      );

      setTentCategories(categoriesWithItems);
    } catch (error) {
      console.error('Failed to fetch tent categories:', error);
    }
  };

  const fetchMenuCategories = async () => {
    try {
      const categoriesRes = await fetch(
        `/api/admin/glamping/menu-categories?zone_id=${zoneId}`
      );
      const categoriesData = await categoriesRes.json();

      // Fetch menu items
      const itemsRes = await fetch(`/api/admin/glamping/menu?zone_id=${zoneId}`);
      const itemsData = await itemsRes.json();
      const menuItems = itemsData.menuItems || [];

      // Group menu items by category
      const categoriesWithItems = (categoriesData.categories || []).map((cat: any) => ({
        ...cat,
        items: menuItems.filter((item: any) => item.category_id === cat.id)
      }));

      setMenuCategories(categoriesWithItems);
    } catch (error) {
      console.error('Failed to fetch menu categories:', error);
    }
  };

  const fetchCommonItemCategories = async () => {
    try {
      const response = await fetch(`/api/admin/glamping/categories?zone_id=${zoneId}&is_tent_category=false`);
      const data = await response.json();

      // Fetch items for each category
      const categoriesWithItems = await Promise.all(
        (data.categories || []).map(async (cat: any) => {
          const itemsRes = await fetch(`/api/admin/glamping/items?zone_id=${zoneId}&category_id=${cat.id}`);
          const itemsData = await itemsRes.json();
          return {
            ...cat,
            items: itemsData.items || []
          };
        })
      );

      setCommonItemCategories(categoriesWithItems);
    } catch (error) {
      console.error('Failed to fetch common item categories:', error);
    }
  };

  const fetchRuleSets = async () => {
    try {
      const response = await fetch(`/api/admin/glamping/rules?zone_id=${zoneId}`);
      const data = await response.json();
      const ruleSets = data.ruleSets || [];
      setRuleSets(ruleSets);

      // Auto-select first rule set
      if (ruleSets.length > 0 && !formData.rules_id) {
        setFormData(prev => ({
          ...prev,
          rules_id: ruleSets[0].id
        }));
      }
    } catch (error) {
      console.error('Failed to fetch rule sets:', error);
    }
  };

  const fetchDiscountData = async (id: string) => {
    setLoadingDiscount(true);
    try {
      const response = await fetch(`/api/admin/glamping/discounts/${id}`);
      const data = await response.json();

      // Helper function to convert date to YYYY-MM-DD format for input
      const formatDateForInput = (dateStr: string) => {
        if (!dateStr) return "";

        console.log('Original date:', dateStr); // Debug log

        // If already in YYYY-MM-DD format, return as is
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          console.log('Already in correct format:', dateStr);
          return dateStr;
        }

        // Try to parse as Date object (handles ISO format)
        const dateObj = new Date(dateStr);
        if (!isNaN(dateObj.getTime())) {
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          const formatted = `${year}-${month}-${day}`;
          console.log('Converted from Date object:', formatted);
          return formatted;
        }

        // Convert from DD/M/YYYY to YYYY-MM-DD
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2];
          const formatted = `${year}-${month}-${day}`;
          console.log('Converted from DD/M/YYYY:', formatted);
          return formatted;
        }

        console.log('Could not convert date:', dateStr);
        return dateStr;
      };

      // Populate form with existing data
      setFormData({
        name: data.discount.name,
        code: data.discount.code || "",
        discount_type: data.discount.discount_type,
        discount_value: Math.round(data.discount.discount_value || 0),
        application_method: data.discount.application_method,
        recurrence: data.discount.recurrence,
        start_date: formatDateForInput(data.discount.start_date),
        end_date: formatDateForInput(data.discount.end_date),
        rules_id: data.discount.rules_id,
        status: data.discount.status,
        no_end_date: !data.discount.end_date,
        weekly_days: data.discount.weekly_days || [],
      });

      // Set active tab based on application_type
      const appType = data.discount.application_type || 'tent';
      setActiveTab(appType);

      // Load items into correct state
      setSelectedTentItems([]);
      setSelectedMenuItems([]);
      setSelectedCommonItems([]);
      if (appType === 'tent') {
        setSelectedTentItems(data.discount.item_ids || []);
      } else if (appType === 'menu') {
        setSelectedMenuItems(data.discount.item_ids || []);
      } else if (appType === 'common_item') {
        setSelectedCommonItems(data.discount.item_ids || []);
      }
    } catch (error) {
      console.error('Failed to fetch discount:', error);
      toast({
        title: t('errorTitle'),
        description: t('errorLoadFailed'),
        variant: "destructive",
      });
    } finally {
      setLoadingDiscount(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      discount_type: "percentage",
      discount_value: 0,
      application_method: "per_booking_after_tax",
      recurrence: "always",
      start_date: "",
      end_date: "",
      rules_id: null,
      status: "active",
      no_end_date: false,
      weekly_days: [],
    });
    setSelectedTentItems([]);
    setSelectedMenuItems([]);
    setSelectedCommonItems([]);
    setActiveTab('tent');
  };

  // Tab change handler
  const handleTabChange = useCallback((newTab: 'tent' | 'menu' | 'common_item') => {
    setActiveTab(newTab);
    // Clear non-active selections
    if (newTab !== 'tent') setSelectedTentItems([]);
    if (newTab !== 'menu') setSelectedMenuItems([]);
    if (newTab !== 'common_item') setSelectedCommonItems([]);
  }, []);

  // Tent selection handlers
  const handleSelectAllTents = useCallback(() => {
    const allItemIds = tentCategories.flatMap(cat => cat.items.map(item => item.id));
    setSelectedTentItems(allItemIds);
  }, [tentCategories]);

  const handleSelectNoneTents = useCallback(() => {
    setSelectedTentItems([]);
  }, []);

  // Menu selection handlers
  const handleSelectAllMenu = useCallback(() => {
    const allItemIds = menuCategories.flatMap(cat =>
      (cat.items || []).map(item => item.id)
    );
    setSelectedMenuItems(allItemIds);
  }, [menuCategories]);

  const handleSelectNoneMenu = useCallback(() => {
    setSelectedMenuItems([]);
  }, []);

  // Common item selection handlers
  const handleSelectAllCommonItems = useCallback(() => {
    const allItemIds = commonItemCategories.flatMap(cat => cat.items.map(item => item.id));
    setSelectedCommonItems(allItemIds);
  }, [commonItemCategories]);

  const handleSelectNoneCommonItems = useCallback(() => {
    setSelectedCommonItems([]);
  }, []);

  const toggleWeekday = useCallback((day: number) => {
    setFormData(prev => ({
      ...prev,
      weekly_days: prev.weekly_days.includes(day)
        ? prev.weekly_days.filter(d => d !== day)
        : [...prev.weekly_days, day]
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast({
        title: t('errorTitle'),
        description: t('errorNameRequired'),
        variant: "destructive",
      });
      return;
    }

    // Determine which items to submit based on active tab
    const itemsToSubmit = activeTab === 'tent'
      ? selectedTentItems
      : activeTab === 'menu'
        ? selectedMenuItems
        : selectedCommonItems;

    // Validation - at least one item must be selected
    if (itemsToSubmit.length === 0) {
      toast({
        title: t('errorTitle'),
        description: t('errorNoItemsSelected'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const url = isEditMode
        ? `/api/admin/glamping/discounts/${discountId}`
        : '/api/admin/glamping/discounts';

      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          end_date: formData.no_end_date ? null : formData.end_date,
          zone_id: zoneId,
          application_type: activeTab,
          item_ids: itemsToSubmit
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t(isEditMode ? 'errorUpdateFailed' : 'errorCreateFailed'));
      }

      toast({
        title: t('successTitle'),
        description: t(isEditMode ? 'successUpdated' : 'successCreated'),
      });

      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: t('errorTitle'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? t('editTitle') : t('title')}</DialogTitle>
        </DialogHeader>

        {loadingDiscount ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Tên (Name) */}
          <div className="grid grid-cols-4 gap-4 items-start">
            <Label htmlFor="name" className="text-right pt-2 font-medium">
              {t('nameLabel')}
            </Label>
            <div className="col-span-3 space-y-1">
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <p className="text-sm text-muted-foreground">
                {t('nameDesc')}
              </p>
            </div>
          </div>

          {/* 2. Mã giảm giá (Discount Code) */}
          <div className="grid grid-cols-4 gap-4 items-start">
            <Label htmlFor="code" className="text-right pt-2 font-medium">
              {t('codeLabel')}
            </Label>
            <div className="col-span-3">
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
          </div>

          {/* 3. Discount Amount */}
          <div className="grid grid-cols-4 gap-4 items-start">
            <Label className="text-right pt-2 font-medium">
              {t('discountAmountLabel')}
            </Label>
            <div className="col-span-3 space-y-1">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: parseInt(e.target.value) || 0 })}
                  className="w-32"
                />
                <Select
                  value={formData.discount_type}
                  onValueChange={(value: "percentage" | "fixed") => setFormData({ ...formData, discount_type: value })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">{t('percent')}</SelectItem>
                    <SelectItem value="fixed">{t('fixedAmount')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={formData.application_method}
                  onValueChange={(value) => setFormData({ ...formData, application_method: value })}
                >
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_item">{t('perItem')}</SelectItem>
                    <SelectItem value="per_booking_after_tax">{t('perBookingAfterTax')}</SelectItem>
                    <SelectItem value="per_booking_before_tax">{t('perBookingBeforeTax')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('discountAmountDesc')}
              </p>
            </div>
          </div>

          {/* 4. Recurrence */}
          <div className="grid grid-cols-4 gap-4 items-start">
            <Label className="text-right pt-2 font-medium">
              {t('recurrenceLabel')}
            </Label>
            <div className="col-span-3 space-y-1">
              <Select
                value={formData.recurrence}
                onValueChange={(value) => setFormData({ ...formData, recurrence: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">{t('oneTime')}</SelectItem>
                  <SelectItem value="weekly">{t('weekly')}</SelectItem>
                  <SelectItem value="always">{t('alwaysDontExpire')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {t('recurrenceDesc')}
              </p>
            </div>
          </div>

          {/* Weekly Recurrence Fields */}
          {formData.recurrence === 'weekly' && (
            <>
              {/* Days of Week */}
              <div className="grid grid-cols-4 gap-4 items-start">
                <Label className="text-right pt-2 font-medium">
                  {t('daysLabel', { defaultValue: 'Days' })}
                </Label>
                <div className="col-span-3 space-y-2">
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { day: 1, label: 'Th 2' },
                      { day: 2, label: 'Th 3' },
                      { day: 3, label: 'Th 4' },
                      { day: 4, label: 'Th 5' },
                      { day: 5, label: 'Th 6' },
                      { day: 6, label: 'Th 7' },
                      { day: 0, label: 'CN' },
                    ].map(({ day, label }) => (
                      <div key={day} className="flex items-center space-x-2">
                        <Checkbox
                          id={`day-${day}`}
                          checked={formData.weekly_days.includes(day)}
                          onCheckedChange={() => toggleWeekday(day)}
                        />
                        <label
                          htmlFor={`day-${day}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Start Date */}
              <div className="grid grid-cols-4 gap-4 items-start">
                <Label htmlFor="start_date" className="text-right pt-2 font-medium">
                  {t('startDateLabel', { defaultValue: 'Start Date' })}
                </Label>
                <div className="col-span-3">
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
              </div>

              {/* End Date */}
              <div className="grid grid-cols-4 gap-4 items-start">
                <Label htmlFor="end_date" className="text-right pt-2 font-medium">
                  {t('endDateLabel', { defaultValue: 'End Date' })}
                </Label>
                <div className="col-span-3 space-y-2">
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    disabled={formData.no_end_date}
                    min={formData.start_date || undefined}
                  />
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="no_end_date"
                      checked={formData.no_end_date}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, no_end_date: checked as boolean })
                      }
                    />
                    <label
                      htmlFor="no_end_date"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {t('noEndDateLabel', { defaultValue: 'No end date' })}
                    </label>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 5. Rules */}
          <div className="grid grid-cols-4 gap-4 items-start">
            <Label className="text-right pt-2 font-medium">
              {t('rulesLabel')}
            </Label>
            <div className="col-span-3 space-y-1">
              <div className="flex items-center gap-2">
                <Select
                  value={formData.rules_id || undefined}
                  onValueChange={(value) => setFormData({ ...formData, rules_id: value })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={t('defaultRuleset')} />
                  </SelectTrigger>
                  <SelectContent>
                    {ruleSets.map((ruleSet) => (
                      <SelectItem key={ruleSet.id} value={ruleSet.id}>
                        {ruleSet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="link"
                  className="text-blue-600"
                  onClick={() => window.open(`/admin/zones/${zoneId}/rules`, '_blank')}
                >
                  {t('viewRuleset')}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('rulesDesc')}
              </p>
            </div>
          </div>

          {/* 6. Enable/Disable */}
          <div className="grid grid-cols-4 gap-4 items-start">
            <Label className="text-right pt-2 font-medium">
              {t('statusLabel')}
            </Label>
            <div className="col-span-3 space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="status"
                  checked={formData.status === "active"}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      status: checked ? "active" : "inactive"
                    })
                  }
                />
                <label
                  htmlFor="status"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {t('enableLabel')}
                </label>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('statusDesc')}
              </p>
            </div>
          </div>

          {/* 7. Áp dụng cho (Apply to) */}
          <div className="grid grid-cols-4 gap-4 items-start">
            <Label className="text-right pt-2 text-sm">
              {t('applyToLabel')}
            </Label>
            <div className="col-span-3 space-y-4">
              <Tabs value={activeTab} onValueChange={(val) => handleTabChange(val as 'tent' | 'menu' | 'common_item')}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="tent">{t('tentTab')}</TabsTrigger>
                  <TabsTrigger value="menu">{t('menuTab')}</TabsTrigger>
                  <TabsTrigger value="common_item">{t('commonItemTab')}</TabsTrigger>
                </TabsList>

                {/* Tent Tab */}
                <TabsContent value="tent" className="space-y-4 mt-4">
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={handleSelectAllTents}>
                      {t('selectAll')}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={handleSelectNoneTents}>
                      {t('selectNone')}
                    </Button>
                  </div>

                  <div className="max-h-64 overflow-y-auto">
                    <CheckboxTree
                      items={tentCategories.map(cat => ({
                        id: cat.id,
                        label: `${getLocalizedName(cat.name)} (${t('itemsCount', { count: cat.items.length })})`,
                        children: cat.items.map(item => ({
                          id: item.id,
                          label: getLocalizedName(item.name)
                        }))
                      }))}
                      selectedIds={selectedTentItems}
                      onSelectionChange={setSelectedTentItems}
                    />
                  </div>
                </TabsContent>

                {/* Menu Tab */}
                <TabsContent value="menu" className="space-y-4 mt-4">
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={handleSelectAllMenu}>
                      {t('selectAll')}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={handleSelectNoneMenu}>
                      {t('selectNone')}
                    </Button>
                  </div>

                  <div className="max-h-64 overflow-y-auto">
                    <CheckboxTree
                      items={menuCategories.map(cat => ({
                        id: cat.id,
                        label: `${getLocalizedName(cat.name)} (${t('itemsCount', { count: cat.items?.length || 0 })})`,
                        children: (cat.items || []).map(item => ({
                          id: item.id,
                          label: getLocalizedName(item.name)
                        }))
                      }))}
                      selectedIds={selectedMenuItems}
                      onSelectionChange={setSelectedMenuItems}
                    />
                  </div>
                </TabsContent>

                {/* Common Item Tab */}
                <TabsContent value="common_item" className="space-y-4 mt-4">
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={handleSelectAllCommonItems}>
                      {t('selectAll')}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={handleSelectNoneCommonItems}>
                      {t('selectNone')}
                    </Button>
                  </div>

                  <div className="max-h-64 overflow-y-auto">
                    <CheckboxTree
                      items={commonItemCategories.map(cat => ({
                        id: cat.id,
                        label: `${getLocalizedName(cat.name)} (${t('itemsCount', { count: cat.items?.length || 0 })})`,
                        children: (cat.items || []).map(item => ({
                          id: item.id,
                          label: getLocalizedName(item.name)
                        }))
                      }))}
                      selectedIds={selectedCommonItems}
                      onSelectionChange={setSelectedCommonItems}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.name}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? t('saving') : t('save')}
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
