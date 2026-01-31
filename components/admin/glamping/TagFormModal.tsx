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

interface Tag {
  id: string;
  name: string;
  weight: number;
  visibility: string;
}

interface TagFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  zoneId?: string; // Optional for zone-specific tags
  tag?: Tag | null; // For edit mode
}

export function TagFormModal({
  open,
  onOpenChange,
  onSuccess,
  zoneId,
  tag
}: TagFormModalProps) {
  const { toast } = useToast();
  const t = useTranslations("admin.glamping.tags.form");
  const tc = useTranslations("admin.glamping.common");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    weight: 0,
    visibility: "staff",
  });

  const isEditMode = !!tag;

  // Reset form when modal opens/closes or tag changes
  useEffect(() => {
    if (open) {
      if (tag) {
        // Edit mode: pre-fill form with tag data
        setFormData({
          name: tag.name,
          weight: tag.weight,
          visibility: tag.visibility,
        });
      } else {
        // Create mode: reset form
        setFormData({
          name: "",
          weight: 0,
          visibility: "staff",
        });
      }
    }
  }, [open, tag]);

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
        ? `/api/admin/glamping/tags/${tag.id}`
        : '/api/admin/glamping/tags';

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
        visibility: "staff",
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
              <Label htmlFor="visibility">{t("visibilityLabel")}</Label>
              <Select
                value={formData.visibility}
                onValueChange={(value) => setFormData({ ...formData, visibility: value })}
                disabled={loading}
              >
                <SelectTrigger id="visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">{t("visibilityStaff")}</SelectItem>
                  <SelectItem value="everyone">{t("visibilityEveryone")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {t("visibilityHelp")}
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
