"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';
import { ArrowLeft, Check, HelpCircle, AlertTriangle, Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import EventFormFields from "@/components/admin/events/EventFormFields";

interface Category {
  id: string;
  name: string;
  items: Item[];
}

interface Item {
  id: string;
  name: string;
  category_id: string;
}

export default function NewEventPage() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('events.new');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    type: "seasonal" as 'seasonal' | 'special' | 'closure',
    recurrence: "one_time" as 'one_time' | 'weekly' | 'monthly' | 'yearly' | 'always',
    start_date: "",
    end_date: null as string | null,
    days_of_week: [] as number[],
    pricing_type: "base_price" as 'base_price' | 'new_price' | 'dynamic' | 'yield',
    status: "available" as 'available' | 'unavailable',
    active: true,
    applicable_times: "all",
    rules_id: null as string | null,
    dynamic_pricing: {
      value: 0,
      mode: 'percent' as 'percent' | 'fixed',
    },
    yield_thresholds: [
      { stock: 0, rate_adjustment: 0 }
    ],
  });

  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  useEffect(() => {
    fetchCategoriesAndItems();
  }, []);

  useEffect(() => {
    // Track changes for unsaved warning
    const hasChanges =
      formData.name !== "" ||
      formData.type !== "seasonal" ||
      formData.start_date !== "" ||
      formData.end_date !== "" ||
      selectedItems.length > 0;
    setHasUnsavedChanges(hasChanges);
  }, [formData, selectedItems]);

  const fetchCategoriesAndItems = async () => {
    try {
      const [categoriesRes, itemsRes] = await Promise.all([
        fetch('/api/admin/glamping/categories'),
        fetch('/api/admin/glamping/items')
      ]);

      const categoriesData = await categoriesRes.json();
      const itemsData = await itemsRes.json();

      // Group items by category
      const categoryMap = new Map<string, Category>();

      categoriesData.categories.forEach((cat: any) => {
        categoryMap.set(cat.id, { ...cat, items: [] });
      });

      itemsData.items.forEach((item: any) => {
        const category = categoryMap.get(item.category_id);
        if (category) {
          category.items.push(item);
        }
      });

      setCategories(Array.from(categoryMap.values()));
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast({
        title: t('error'),
        description: t('errorLoadData'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle field changes
  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle dynamic pricing changes
  const handleDynamicPricingChange = (data: { value: number; mode: 'percent' | 'fixed' }) => {
    setFormData(prev => ({
      ...prev,
      dynamic_pricing: data,
    }));
  };

  // Handle yield thresholds changes
  const handleYieldThresholdsChange = (thresholds: Array<{ stock: number; rate_adjustment: number }>) => {
    setFormData(prev => ({
      ...prev,
      yield_thresholds: thresholds,
    }));
  };

  const handleSave = async () => {
    if (!formData.name || !formData.type) {
      toast({
        title: t('error'),
        description: t('errorRequiredFields'),
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/admin/glamping/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          item_ids: selectedItems,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create event');
      }

      toast({
        title: t('success'),
        description: t('successCreated'),
      });

      setHasUnsavedChanges(false);
      router.push('/admin/events');
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleItem = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const toggleCategory = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    const categoryItemIds = category.items.map(item => item.id);
    const allSelected = categoryItemIds.every(id => selectedItems.includes(id));

    if (allSelected) {
      setSelectedItems(prev => prev.filter(id => !categoryItemIds.includes(id)));
    } else {
      setSelectedItems(prev => [...new Set([...prev, ...categoryItemIds])]);
    }
  };

  const isCategorySelected = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category || category.items.length === 0) return false;
    return category.items.every(item => selectedItems.includes(item.id));
  };

  const handleSelectAll = () => {
    const allItemIds = categories.flatMap(cat => cat.items.map(item => item.id));
    setSelectedItems(allItemIds);
  };

  const handleSelectNone = () => {
    setSelectedItems([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">{t('loading')}</p>
      </div>
    );
  }

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
                onClick={() => router.push('/admin/events')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('backToEvents')}
              </Button>
              <h1 className="text-2xl font-bold">{t('title')}</h1>
            </div>

            <Button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || submitting}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4 mr-2" />
              {submitting ? t('saving') : t('save')}
            </Button>
          </div>

          {/* Warning Banner */}
          {hasUnsavedChanges && (
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <span className="font-medium text-yellow-800">{t('unsavedChanges')}</span>
              </div>
            </div>
          )}

          {/* Introduction */}
          <div className="text-gray-600 mb-6 space-y-2">
            <p>{t('introText')}</p>
            <p className="text-sm">{t('introSubText')}</p>
          </div>

          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            {/* Event Form Fields Component */}
            <EventFormFields
              formData={formData}
              onChange={handleFieldChange}
              onDynamicPricingChange={handleDynamicPricingChange}
              onYieldThresholdsChange={handleYieldThresholdsChange}
              categories={categories}
              selectedItems={selectedItems}
              onToggleItem={toggleItem}
              onToggleCategory={toggleCategory}
              onSelectAll={handleSelectAll}
              onSelectNone={handleSelectNone}
              hideTypeSelector={false}
              showItemSelector={true}
            />

            {/* Submit Button */}
            <div className="pt-4">
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={submitting}>
                {submitting ? t('creating') : t('create')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
