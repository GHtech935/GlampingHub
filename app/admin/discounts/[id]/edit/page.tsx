"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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

export default function EditDiscountPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [zoneId, setZoneId] = useState<string | null>(null);

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
    fetchDiscount();
  }, [params.id]);

  useEffect(() => {
    if (zoneId) {
      fetchCategories(zoneId);
    }
  }, [zoneId]);

  const fetchDiscount = async () => {
    try {
      const response = await fetch(`/api/admin/glamping/discounts/${params.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch discount');
      }

      setFormData({
        name: data.discount.name,
        code: data.discount.code || "",
        discount_type: data.discount.discount_type,
        discount_value: data.discount.discount_value,
        application_method: data.discount.application_method,
        recurrence: data.discount.recurrence,
        start_date: data.discount.start_date || "",
        end_date: data.discount.end_date || "",
        rules_id: data.discount.rules_id,
        status: data.discount.status,
      });

      setSelectedItems(data.discount.item_ids || []);
      setZoneId(data.discount.zone_id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      router.push('/admin/discounts');
    } finally {
      setFetching(false);
    }
  };

  const fetchCategories = async (zoneId: string) => {
    try {
      const response = await fetch(`/api/admin/glamping/categories?zone_id=${zoneId}`);
      const data = await response.json();

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
      setSelectedItems(prev =>
        prev.filter(id => !category.items.some(item => item.id === id))
      );
    } else {
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
        title: "Error",
        description: "Discount name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/admin/glamping/discounts/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          item_ids: selectedItems
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update discount');
      }

      toast({
        title: "Success",
        description: "Discount updated successfully",
      });

      router.push('/admin/discounts');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar */}
      <div className="w-64 bg-white border-r p-6 space-y-4">
        {/* Save Button */}
        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={loading || !formData.name}
        >
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Saving...' : 'Save'}
        </Button>

        {/* Back Link */}
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => router.push('/admin/discounts')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Discounts
        </Button>

        {/* Help Link */}
        <Button variant="ghost" className="w-full justify-start">
          <HelpCircle className="w-4 h-4 mr-2" />
          Help
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 max-w-4xl">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-2xl font-bold mb-2">Edit Discount</h1>

          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            {/* 1. Tên (Name) */}
            <div className="grid grid-cols-4 gap-4 items-start">
              <Label htmlFor="name" className="text-right pt-2 font-medium">
                Tên
              </Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Used for internal reporting.
                </p>
              </div>
            </div>

            {/* 2. Mã giảm giá (Discount Code) */}
            <div className="grid grid-cols-4 gap-4 items-start">
              <Label htmlFor="code" className="text-right pt-2 font-medium">
                Mã giảm giá
              </Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
                <p className="text-sm text-muted-foreground">
                  Discount code required to enable this price. Leave blank for an 'open discount'.
                </p>
              </div>
            </div>

            {/* 3. Discount Amount */}
            <div className="grid grid-cols-4 gap-4 items-start">
              <Label className="text-right pt-2 font-medium">
                Discount Amount
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
                      <SelectItem value="percentage">Percent</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
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
                      <SelectItem value="per_booking_after_tax">Per Booking, After Tax</SelectItem>
                      <SelectItem value="per_booking_before_tax">Per Booking, Before Tax</SelectItem>
                      <SelectItem value="per_item">Per Item</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-sm text-muted-foreground">
                  Per booking is applied on the total. Per item is calculated on items, prior to the sub-total.
                </p>
              </div>
            </div>

            {/* 4. Recurrence */}
            <div className="grid grid-cols-4 gap-4 items-start">
              <Label className="text-right pt-2 font-medium">
                Recurrence
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
                    <SelectItem value="always">Always (don't expire)</SelectItem>
                    <SelectItem value="one_time">One time</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Set this as a reoccurring or one time discount.
                </p>
              </div>
            </div>

            {/* 5. Rules */}
            <div className="grid grid-cols-4 gap-4 items-start">
              <Label className="text-right pt-2 font-medium">
                Rules
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
                      <SelectItem value="default">Default</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="link" className="text-blue-600">
                    View Ruleset
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Ruleset controlling this discount.
                </p>
              </div>
            </div>

            {/* 6. Áp dụng cho (Apply to) */}
            <div className="grid grid-cols-4 gap-4 items-start">
              <Label className="text-right pt-2 font-medium">
                Áp dụng cho
              </Label>
              <div className="col-span-3 space-y-4">
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleSelectAll}>
                    Chọn tất cả
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={handleSelectNone}>
                    Select None
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
                              {category.name} ({category.items.length} items)
                            </span>
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
