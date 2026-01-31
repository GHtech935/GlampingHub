"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";

interface Category {
  id: string;
  name: string;
  weight: number;
  status: string;
}

interface CategoryFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  zoneId?: string; // Optional for zone-specific categories
  category?: Category | null; // For edit mode
}

export function CategoryFormModal({
  open,
  onOpenChange,
  onSuccess,
  zoneId,
  category
}: CategoryFormModalProps) {
  const { toast } = useToast();
  const t = useTranslations("admin.glamping.categories.form");
  const tc = useTranslations("admin.glamping.common");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    weight: 0,
    status: "active",
  });

  const isEditMode = !!category;

  // Reset form when modal opens/closes or category changes
  useEffect(() => {
    if (open) {
      if (category) {
        // Edit mode: pre-fill form with category data
        setFormData({
          name: category.name,
          weight: category.weight,
          status: category.status,
        });
      } else {
        // Create mode: reset form and fetch next weight
        setFormData({
          name: "",
          weight: 0,
          status: "active",
        });
        fetchNextWeight();
      }
    }
  }, [open, category, zoneId]);

  const fetchNextWeight = async () => {
    try {
      const url = zoneId
        ? `/api/admin/glamping/categories?zone_id=${zoneId}`
        : '/api/admin/glamping/categories';

      const response = await fetch(url);
      const data = await response.json();

      if (data.categories && data.categories.length > 0) {
        // Find max weight and add 1
        const maxWeight = Math.max(...data.categories.map((c: any) => c.weight || 0));
        setFormData(prev => ({ ...prev, weight: maxWeight + 1 }));
      } else {
        // First category, start at 0
        setFormData(prev => ({ ...prev, weight: 0 }));
      }
    } catch (error) {
      console.error('Failed to fetch categories for weight:', error);
      // Default to 0 on error
      setFormData(prev => ({ ...prev, weight: 0 }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast({
        title: tc("error"),
        description: t("nameRequired"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const body = zoneId
        ? { ...formData, zone_id: zoneId }
        : formData;

      const url = isEditMode
        ? `/api/admin/glamping/categories/${category.id}`
        : '/api/admin/glamping/categories';

      const response = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || (isEditMode ? t("updateFailed") : t("createFailed")));
      }

      toast({
        title: tc("success"),
        description: isEditMode ? t("updateSuccess") : t("createSuccess"),
      });

      // Reset form
      setFormData({
        name: "",
        weight: 0,
        status: "active",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: tc("error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? t("editModalTitle") : t("modalTitle")}</DialogTitle>
          <DialogDescription>
            {isEditMode ? t("editModalDescription") : t("modalDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                {t("nameLabel")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder={t("namePlaceholder")}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                {t("nameHelp")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">{t("weightLabel")}</Label>
              <Input
                id="weight"
                type="number"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) || 0 })}
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                {t("weightHelp")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">{t("statusLabel")}</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
                disabled={loading}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("statusActive")}</SelectItem>
                  <SelectItem value="hidden">{t("statusHidden")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {t("statusHelp")}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={loading || !formData.name}>
              {loading ? tc("loading") : (isEditMode ? t("updateButton") : t("createButton"))}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
