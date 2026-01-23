"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Check, HelpCircle, AlertTriangle, Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";

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

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [initialData, setInitialData] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    type: "seasonal",
    start_date: "",
    end_date: "",
    recurrence: "one_time",
    days_of_week: [] as number[],
    pricing_type: "base_price",
    status: "available",
    item_ids: [] as string[],
  });

  const [inventoryStatus, setInventoryStatus] = useState("available");
  const [eventType, setEventType] = useState("seasonal");
  const [priceType, setPriceType] = useState("base_price");
  const [recurrence, setRecurrence] = useState("one_time");
  const [removeEndDate, setRemoveEndDate] = useState(false);
  const [forceLength, setForceLength] = useState(false);
  const [applicableTimes, setApplicableTimes] = useState("all");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  useEffect(() => {
    fetchEventData();
    fetchCategoriesAndItems();
  }, [params.id]);

  useEffect(() => {
    // Track changes for unsaved warning
    if (initialData) {
      const hasChanges =
        formData.name !== initialData.name ||
        formData.type !== initialData.type ||
        formData.start_date !== (initialData.start_date || "") ||
        formData.end_date !== (initialData.end_date || "") ||
        formData.recurrence !== initialData.recurrence ||
        formData.pricing_type !== initialData.pricing_type ||
        formData.status !== initialData.status ||
        JSON.stringify(selectedItems.sort()) !== JSON.stringify((initialData.item_ids || []).sort());
      setHasUnsavedChanges(hasChanges);
    }
  }, [formData, selectedItems, initialData]);

  const fetchEventData = async () => {
    try {
      const response = await fetch(`/api/admin/glamping/events/${params.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch event');
      }

      const event = data.event;
      setInitialData(event);

      setFormData({
        name: event.name,
        type: event.type,
        start_date: event.start_date || "",
        end_date: event.end_date || "",
        recurrence: event.recurrence,
        days_of_week: event.days_of_week || [],
        pricing_type: event.pricing_type || "base_price",
        status: event.status,
        item_ids: event.item_ids || [],
      });

      setInventoryStatus(event.status);
      setEventType(event.type);
      setPriceType(event.pricing_type || "base_price");
      setRecurrence(event.recurrence);
      setRemoveEndDate(!event.end_date);
      setSelectedItems(event.item_ids || []);
    } catch (error: any) {
      console.error('Failed to fetch event:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

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
        title: "Error",
        description: "Failed to load categories and items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.type) {
      toast({
        title: "Error",
        description: "Please fill in required fields (Name and Type)",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/admin/glamping/events/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status: inventoryStatus,
          type: eventType,
          pricing_type: priceType,
          recurrence,
          end_date: removeEndDate ? null : formData.end_date,
          item_ids: selectedItems,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update event');
      }

      toast({
        title: "Success",
        description: "Event updated successfully",
      });

      setHasUnsavedChanges(false);
      router.push('/admin/events');
    } catch (error: any) {
      toast({
        title: "Error",
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
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar */}
      <div className="w-64 bg-white border-r p-6 space-y-4">
        {/* Warning Banner */}
        {hasUnsavedChanges && (
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="font-medium text-yellow-800">Unsaved Changes</span>
            </div>
          </div>
        )}

        {/* Save Button */}
        <Button
          className="w-full"
          onClick={handleSave}
          disabled={!hasUnsavedChanges || submitting}
        >
          <Check className="w-4 h-4 mr-2" />
          {submitting ? 'Saving...' : 'Save'}
        </Button>

        {/* Back Link */}
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => router.push('/admin/events')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Events
        </Button>

        {/* Tip Box */}
        <div className="bg-gray-50 p-4 rounded text-sm text-gray-600">
          <p className="font-medium mb-1">Tip:</p>
          <p>You can quickly close off a date or adjust inventory in your inventory calendar</p>
        </div>

        {/* Help Button */}
        <Button variant="ghost" className="w-full justify-start">
          <HelpCircle className="w-4 h-4 mr-2" />
          Help
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 max-w-4xl">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-2xl font-bold mb-2">Edit Item Event</h1>

          {/* Introduction */}
          <div className="text-gray-600 mb-6 space-y-2">
            <p>Item Events are used to modify the price or availability of your inventory items based on dates.</p>
            <p className="text-sm">Without events, your inventory items are simple bookable items available 365 days a year at a fixed (base) price.</p>
          </div>

          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            {/* 1. Inventory Status */}
            <div className="space-y-2">
              <Label>Inventory Status</Label>
              <RadioGroup value={inventoryStatus} onValueChange={(value) => {
                setInventoryStatus(value);
                setFormData({ ...formData, status: value });
              }}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="available" id="available" />
                  <Label htmlFor="available">Available</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="unavailable" id="unavailable" />
                  <Label htmlFor="unavailable">Unavailable</Label>
                </div>
              </RadioGroup>
              <p className="text-sm text-gray-500">
                Set the inventory status for this Item Event. This will override the default item status.
              </p>
            </div>

            {/* 2. Type */}
            <div className="space-y-2">
              <Label>Type</Label>
              <RadioGroup value={eventType} onValueChange={(value) => {
                setEventType(value);
                setFormData({ ...formData, type: value });
              }}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="seasonal" id="seasonal" />
                  <Label htmlFor="seasonal">Seasonal</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="special" id="special" />
                  <Label htmlFor="special">Special</Label>
                </div>
              </RadioGroup>
              <p className="text-sm text-gray-500">
                Special events override Seasonal
              </p>
            </div>

            {/* 3. Tên (Name) */}
            <div className="space-y-2">
              <Label>Tên</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Summer Season, Holiday Special"
                required
              />
              <p className="text-sm text-gray-500">
                This may be displayed on customer invoices
              </p>
            </div>

            {/* 4. Price (Tab buttons) */}
            <div className="space-y-2">
              <Label>Price</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={priceType === 'base_price' ? 'default' : 'outline'}
                  onClick={() => {
                    setPriceType('base_price');
                    setFormData({ ...formData, pricing_type: 'base_price' });
                  }}
                >
                  Base price
                </Button>
                <Button
                  type="button"
                  variant={priceType === 'new_price' ? 'default' : 'outline'}
                  onClick={() => {
                    setPriceType('new_price');
                    setFormData({ ...formData, pricing_type: 'new_price' });
                  }}
                >
                  Create new Price Point
                </Button>
                <Button
                  type="button"
                  variant={priceType === 'dynamic' ? 'default' : 'outline'}
                  onClick={() => {
                    setPriceType('dynamic');
                    setFormData({ ...formData, pricing_type: 'dynamic' });
                  }}
                >
                  Dynamic
                </Button>
                <Button
                  type="button"
                  variant={priceType === 'yield' ? 'default' : 'outline'}
                  onClick={() => {
                    setPriceType('yield');
                    setFormData({ ...formData, pricing_type: 'yield' });
                  }}
                >
                  Yield
                </Button>
              </div>
            </div>

            {/* 5. Recurrence */}
            <div className="space-y-2">
              <Label>Recurrence</Label>
              <Select value={recurrence} onValueChange={(value) => {
                setRecurrence(value);
                setFormData({ ...formData, recurrence: value });
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One time event</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                Set this as a reoccurring or one time event
              </p>
            </div>

            {/* 6. Start Date */}
            <div className="space-y-2">
              <Label>Start date</Label>
              <div className="relative">
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* 7. End Date */}
            <div className="space-y-2">
              <Label>End date</Label>
              <div className="relative">
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  disabled={removeEndDate}
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={removeEndDate}
                  onCheckedChange={(checked) => setRemoveEndDate(checked as boolean)}
                  id="remove-end-date"
                />
                <Label htmlFor="remove-end-date">Remove end date</Label>
              </div>
            </div>

            {/* 8. Force Item Length */}
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={forceLength}
                onCheckedChange={(checked) => setForceLength(checked as boolean)}
                id="force-length"
              />
              <Label htmlFor="force-length">Force item length to the above start and end dates</Label>
            </div>

            {/* 9. Applicable Times */}
            <div className="space-y-2">
              <Label>Applicable Times</Label>
              <Select value={applicableTimes} onValueChange={setApplicableTimes}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Times</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" variant="link" className="p-0 h-auto text-blue-600">
                + Add specific timeslots
              </Button>
            </div>

            {/* 10. Rules */}
            <div className="space-y-2">
              <Label>Rules</Label>
              <Select defaultValue="default">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" variant="link" className="p-0 h-auto text-blue-600">
                View Rules to apply to this Item Event
              </Button>
            </div>

            {/* 11. Áp dụng cho (Applied Items) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Áp dụng cho</Label>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleSelectAll}>
                    Chọn tất cả
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={handleSelectNone}>
                    Select None
                  </Button>
                </div>
              </div>

              {/* Collapsible Categories */}
              <div className="space-y-2">
                {categories.map(category => (
                  <Collapsible key={category.id}>
                    <div className="flex items-center gap-2 border-b pb-2">
                      <Checkbox
                        checked={isCategorySelected(category.id)}
                        onCheckedChange={() => toggleCategory(category.id)}
                      />
                      <CollapsibleTrigger className="flex-1 flex items-center justify-between hover:text-blue-600">
                        <span className="text-blue-600">
                          {category.name} ({category.items.length} items)
                        </span>
                        <ChevronDown className="w-4 h-4" />
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent className="pl-6 py-2 space-y-2">
                      {category.items.map(item => (
                        <div key={item.id} className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedItems.includes(item.id)}
                            onCheckedChange={() => toggleItem(item.id)}
                            id={`item-${item.id}`}
                          />
                          <Label htmlFor={`item-${item.id}`} className="text-sm cursor-pointer">
                            {item.name}
                          </Label>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={submitting}>
                {submitting ? 'Updating...' : 'Update Event'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
