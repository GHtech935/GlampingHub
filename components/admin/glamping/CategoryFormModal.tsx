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

interface CategoryFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  zoneId?: string; // Optional for zone-specific categories
}

export function CategoryFormModal({
  open,
  onOpenChange,
  onSuccess,
  zoneId
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

  // Fetch next available weight when modal opens
  useEffect(() => {
    if (open) {
      fetchNextWeight();
    }
  }, [open, zoneId]);

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

      const response = await fetch('/api/admin/glamping/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t("createFailed"));
      }

      toast({
        title: tc("success"),
        description: t("createSuccess"),
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
          <DialogTitle>{t("modalTitle")}</DialogTitle>
          <DialogDescription>
            {t("modalDescription")}
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
              {loading ? tc("loading") : t("createButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
