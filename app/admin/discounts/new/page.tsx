"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';
import { ArrowLeft, Save, HelpCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

export default function NewDiscountPage() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('admin.glamping.discounts.new');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

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
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/glamping/categories');
      const data = await response.json();

      // Fetch items for each category
      const categoriesWithItems = await Promise.all(
        (data.categories || []).map(async (cat: any) => {
          const itemsRes = await fetch(`/api/admin/glamping/items?category_id=${cat.id}`);
          const itemsData = await itemsRes.json();
          return {
            ...cat,
            items: itemsData.items || []
          };
        })
      );

      setCategories(categoriesWithItems);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleItem = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const isCategorySelected = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return false;
    return category.items.every(item => selectedItems.includes(item.id));
  };

  const toggleCategoryItems = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    const allSelected = isCategorySelected(categoryId);
    if (allSelected) {
      // Deselect all items in category
      setSelectedItems(prev =>
        prev.filter(id => !category.items.some(item => item.id === id))
      );
    } else {
      // Select all items in category
      const newItems = category.items.map(item => item.id);
      setSelectedItems(prev => [...new Set([...prev, ...newItems])]);
    }
  };

  const handleSelectAll = () => {
    const allItemIds = categories.flatMap(cat => cat.items.map(item => item.id));
    setSelectedItems(allItemIds);
  };

  const handleSelectNone = () => {
    setSelectedItems([]);
  };

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

    setLoading(true);

    try {
      const response = await fetch('/api/admin/glamping/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          item_ids: selectedItems
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t('errorCreateFailed'));
      }

      toast({
        title: t('successTitle'),
        description: t('successCreated'),
      });

      router.push('/admin/discounts');
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
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8">
          {/* Header with Back and Save buttons */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/admin/discounts')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('backToDiscounts')}
              </Button>
              <h1 className="text-2xl font-bold">{t('title')}</h1>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading || !formData.name}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? t('saving') : t('save')}
            </Button>
          </div>

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
              <div className="col-span-3 space-y-1">
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
                <p className="text-sm text-muted-foreground">
                  {t('codeDesc')}
                </p>
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
                    step="0.01"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
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
                      <SelectItem value="per_booking_after_tax">{t('perBookingAfterTax')}</SelectItem>
                      <SelectItem value="per_booking_before_tax">{t('perBookingBeforeTax')}</SelectItem>
                      <SelectItem value="per_item">{t('perItem')}</SelectItem>
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
                    <SelectItem value="always">{t('alwaysDontExpire')}</SelectItem>
                    <SelectItem value="one_time">{t('oneTime')}</SelectItem>
                    <SelectItem value="weekly">{t('weekly')}</SelectItem>
                    <SelectItem value="monthly">{t('monthly')}</SelectItem>
                    <SelectItem value="yearly">{t('yearly')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {t('recurrenceDesc')}
                </p>
              </div>
            </div>

            {/* 5. Rules */}
            <div className="grid grid-cols-4 gap-4 items-start">
              <Label className="text-right pt-2 font-medium">
                {t('rulesLabel')}
              </Label>
              <div className="col-span-3 space-y-1">
                <div className="flex items-center gap-2">
                  <Select
                    value={formData.rules_id || "default"}
                    onValueChange={(value) => setFormData({ ...formData, rules_id: value === "default" ? null : value })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">{t('defaultRuleset')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="link" className="text-blue-600">
                    {t('viewRuleset')}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('rulesDesc')}
                </p>
              </div>
            </div>

            {/* 6. Áp dụng cho (Apply to) */}
            <div className="grid grid-cols-4 gap-4 items-start">
              <Label className="text-right pt-2 font-medium">
                {t('applyToLabel')}
              </Label>
              <div className="col-span-3 space-y-4">
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleSelectAll}>
                    {t('selectAll')}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={handleSelectNone}>
                    {t('selectNone')}
                  </Button>
                </div>

                {/* Collapsible Categories */}
                <div className="space-y-2">
                  {categories.map(category => (
                    <Collapsible
                      key={category.id}
                      open={expandedCategories.has(category.id)}
                      onOpenChange={() => toggleCategory(category.id)}
                    >
                      <div className="border rounded-lg">
                        <div className="flex items-center gap-2 p-3 bg-gray-50">
                          <Checkbox
                            checked={isCategorySelected(category.id)}
                            onCheckedChange={() => toggleCategoryItems(category.id)}
                          />
                          <CollapsibleTrigger className="flex-1 flex items-center justify-between hover:text-blue-600">
                            <span className="font-medium">
                              {category.name} ({t('itemsCount', { count: category.items.length })})</span>
                            {expandedCategories.has(category.id) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </CollapsibleTrigger>
                        </div>
                        <CollapsibleContent className="p-3 space-y-2">
                          {category.items.map(item => (
                            <div key={item.id} className="flex items-center gap-2 pl-6">
                              <Checkbox
                                checked={selectedItems.includes(item.id)}
                                onCheckedChange={() => toggleItem(item.id)}
                              />
                              <Label className="text-sm cursor-pointer">
                                {item.name}
                              </Label>
                            </div>
                          ))}
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}
                </div>
              </div>
            </div>

            {/* Hidden submit for Enter key */}
            <button type="submit" className="hidden" />
          </form>
        </div>
      </div>
    </div>
  );
}
