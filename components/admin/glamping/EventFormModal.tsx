"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import EventFormFields from "@/components/admin/events/EventFormFields";
import { AlertTriangle, Check, Loader2 } from "lucide-react";

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

interface EventFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  zoneId?: string; // Optional for zone-specific events
  event?: {
    id: string;
    name: string;
    type: 'seasonal' | 'special' | 'closure';
    status: 'available' | 'unavailable';
    pricing_type: 'base_price' | 'new_price' | 'dynamic' | 'yield';
    recurrence: 'one_time' | 'weekly' | 'monthly' | 'yearly' | 'always';
    start_date: string;
    end_date: string | null;
    days_of_week: number[] | null;
    active: boolean;
    dynamic_pricing?: {
      value: number;
      mode: 'percent' | 'fixed';
    };
    yield_thresholds?: Array<{ stock: number; rate_adjustment: number }>;
    item_ids?: string[];
  };
}

export function EventFormModal({
  open,
  onOpenChange,
  onSuccess,
  zoneId,
  event
}: EventFormModalProps) {
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
    applicable_times: "all",
    rules_id: null as string | null,
    active: true,
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
    if (open) {
      setLoading(true);
      fetchCategoriesAndItems();

      // Populate form when editing
      if (event) {
        // Helper function to format date for input[type="date"]
        const formatDateForInput = (dateString: string | null) => {
          if (!dateString) return null;
          // Extract YYYY-MM-DD from timestamp or ISO string
          return dateString.split('T')[0];
        };

        setFormData({
          name: event.name || "",
          type: event.type || "seasonal",
          recurrence: event.recurrence || "one_time",
          start_date: formatDateForInput(event.start_date) || "",
          end_date: formatDateForInput(event.end_date),
          days_of_week: event.days_of_week || [],
          pricing_type: event.pricing_type || "base_price",
          status: event.status || "available",
          applicable_times: "all",
          rules_id: null,
          active: event.active !== undefined ? event.active : true,
          dynamic_pricing: event.dynamic_pricing || {
            value: 0,
            mode: 'percent',
          },
          yield_thresholds: event.yield_thresholds || [
            { stock: 0, rate_adjustment: 0 }
          ],
        });
        setSelectedItems(event.item_ids || []);
      } else {
        // Reset form for create mode
        setFormData({
          name: "",
          type: "seasonal",
          recurrence: "one_time",
          start_date: "",
          end_date: null,
          days_of_week: [],
          pricing_type: "base_price",
          status: "available",
          applicable_times: "all",
          rules_id: null,
          active: true,
          dynamic_pricing: {
            value: 0,
            mode: 'percent',
          },
          yield_thresholds: [
            { stock: 0, rate_adjustment: 0 }
          ],
        });
        setSelectedItems([]);
      }
    }
  }, [open, zoneId, event]);

  useEffect(() => {
    // Track changes for unsaved warning
    if (event) {
      // Helper to format date for comparison
      const formatDate = (dateString: string | null) => {
        if (!dateString) return null;
        return dateString.split('T')[0];
      };

      // Edit mode: check if any field has changed from original
      const hasChanges =
        formData.name !== event.name ||
        formData.type !== event.type ||
        formData.status !== event.status ||
        formData.pricing_type !== event.pricing_type ||
        formData.recurrence !== event.recurrence ||
        formData.start_date !== formatDate(event.start_date) ||
        formData.end_date !== formatDate(event.end_date) ||
        formData.active !== event.active ||
        JSON.stringify(formData.days_of_week) !== JSON.stringify(event.days_of_week || []) ||
        JSON.stringify(selectedItems.sort()) !== JSON.stringify((event.item_ids || []).sort());
      setHasUnsavedChanges(hasChanges);
    } else {
      // Create mode: check if any field has been filled
      const hasChanges =
        formData.name !== "" ||
        formData.type !== "seasonal" ||
        formData.start_date !== "" ||
        formData.end_date !== "" ||
        selectedItems.length > 0;
      setHasUnsavedChanges(hasChanges);
    }
  }, [formData, selectedItems, event]);

  const fetchCategoriesAndItems = async () => {
    setLoading(true);
    try {
      const categoryUrl = zoneId
        ? `/api/admin/glamping/categories?zone_id=${zoneId}`
        : '/api/admin/glamping/categories';
      const itemsUrl = zoneId
        ? `/api/admin/glamping/items?zone_id=${zoneId}`
        : '/api/admin/glamping/items';

      const [categoriesRes, itemsRes] = await Promise.all([
        fetch(categoryUrl),
        fetch(itemsUrl)
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
  const handleFieldChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // Handle dynamic pricing changes
  const handleDynamicPricingChange = useCallback((data: { value: number; mode: 'percent' | 'fixed' }) => {
    setFormData(prev => ({
      ...prev,
      dynamic_pricing: data,
    }));
  }, []);

  // Handle yield thresholds changes
  const handleYieldThresholdsChange = useCallback((thresholds: Array<{ stock: number; rate_adjustment: number }>) => {
    setFormData(prev => ({
      ...prev,
      yield_thresholds: thresholds,
    }));
  }, []);

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
      const body = zoneId
        ? { ...formData, item_ids: selectedItems, zone_id: zoneId }
        : { ...formData, item_ids: selectedItems };

      const isEditing = !!event;
      const url = isEditing
        ? `/api/admin/glamping/events/${event.id}`
        : '/api/admin/glamping/events';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${isEditing ? 'update' : 'create'} event`);
      }

      toast({
        title: t('success'),
        description: isEditing ? t('successUpdated') : t('successCreated'),
      });

      // Reset form
      setFormData({
        name: "",
        type: "seasonal",
        recurrence: "one_time",
        start_date: "",
        end_date: null,
        days_of_week: [],
        pricing_type: "base_price",
        status: "available",
        applicable_times: "all",
        rules_id: null,
        active: true,
        dynamic_pricing: {
          value: 0,
          mode: 'percent',
        },
        yield_thresholds: [
          { stock: 0, rate_adjustment: 0 }
        ],
      });
      setSelectedItems([]);
      setHasUnsavedChanges(false);

      onSuccess();
      onOpenChange(false);
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

  const handleSelectionChange = useCallback((selectedIds: string[]) => {
    setSelectedItems(selectedIds);
  }, []);

  const isEditing = !!event;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('titleEdit') : t('title')}</DialogTitle>
          <DialogDescription>
            {t('introText')}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm text-gray-500">{t('loading')}</p>
          </div>
        ) : (
          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            {/* Event Form Fields Component */}
            <EventFormFields
              formData={formData}
              onChange={handleFieldChange}
              onDynamicPricingChange={handleDynamicPricingChange}
              onYieldThresholdsChange={handleYieldThresholdsChange}
              categories={categories}
              selectedItems={selectedItems}
              onSelectionChange={handleSelectionChange}
              hideTypeSelector={false}
              showItemSelector={true}
            />

            {/* Submit Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                {t('cancel') || 'Cancel'}
              </Button>
              <Button
                type="submit"
                disabled={submitting || !hasUnsavedChanges}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-2" />
                {submitting
                  ? (isEditing ? t('updating') : t('creating'))
                  : (isEditing ? t('update') : t('create'))
                }
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
