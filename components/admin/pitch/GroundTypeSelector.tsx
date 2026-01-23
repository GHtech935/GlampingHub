"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "react-hot-toast";
import { MultilingualInput, MultilingualValue } from "@/components/admin/MultilingualInput";

interface GroundTypeTemplate {
  id: string;
  name: { vi: string; en: string };
  is_active: boolean;
  sort_order: number;
}

interface GroundTypeSelectorProps {
  value: string[]; // Array of selected ground type IDs
  onChange: (ids: string[]) => void;
  required?: boolean;
}

export function GroundTypeSelector({
  value,
  onChange,
  required = false,
}: GroundTypeSelectorProps) {
  const [templates, setTemplates] = useState<GroundTypeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newGroundType, setNewGroundType] = useState<MultilingualValue>({ vi: "", en: "" });
  const locale = useLocale() as 'vi' | 'en';
  const t = useTranslations('pitch.form');

  useEffect(() => {
    fetchGroundTypes();
  }, []);

  const fetchGroundTypes = async () => {
    try {
      const response = await fetch("/api/admin/ground-type-templates?is_active=true");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error("Error fetching ground type templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id: string) => {
    if (value.includes(id)) {
      // Remove ground type
      onChange(value.filter((t) => t !== id));
    } else {
      // Add ground type
      onChange([...value, id]);
    }
  };

  const handleCreateNew = async () => {
    // Validation
    if (!newGroundType.vi || !newGroundType.en) {
      toast.error(t('groundTypeNameRequired'));
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/admin/ground-type-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGroundType,
          isActive: true,
          sortOrder: templates.length,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create");
      }

      const created = await response.json();

      // Add to templates list
      setTemplates([...templates, created]);

      // Auto-select the newly created ground type
      onChange([...value, created.id]);

      // Reset and close modal
      setNewGroundType({ vi: "", en: "" });
      setIsModalOpen(false);
      toast.success(t('groundTypeCreateSuccess'));
    } catch (error) {
      console.error("Failed to create ground type:", error);
      toast.error(error instanceof Error ? error.message : t('groundTypeCreateError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('groundTypes')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">{t('groundTypeLoading')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {t('groundTypes')}
                {required && <span className="text-red-500">*</span>}
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {t('selectGroundTypes')}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t('groundTypeCreateNew')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              {t('groundTypeEmpty')}
            </p>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => {
                const isSelected = value.includes(template.id);

                return (
                  <div
                    key={template.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Checkbox
                      id={`ground-type-${template.id}`}
                      checked={isSelected}
                      onCheckedChange={() => handleToggle(template.id)}
                    />
                    <Label
                      htmlFor={`ground-type-${template.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{template.name.vi}</span>
                        <span className="text-sm text-gray-500">
                          ({template.name.en})
                        </span>
                      </div>
                    </Label>
                  </div>
                );
              })}
            </div>
          )}

          {/* Validation message */}
          {required && value.length === 0 && (
            <p className="text-sm text-red-500 mt-2">
              {t('groundTypeValidation')}
            </p>
          )}

          {/* Selected count */}
          {value.length > 0 && (
            <p className="text-sm text-gray-600 mt-4">
              {t('groundTypeSelected', { count: value.length })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Create New Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('groundTypeModalTitle')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <MultilingualInput
              label={t('groundTypeModalLabel')}
              value={newGroundType}
              onChange={setNewGroundType}
              placeholder={{
                vi: "VD: Cỏ",
                en: "e.g., Grass",
              }}
              required
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setNewGroundType({ vi: "", en: "" });
              }}
              disabled={saving}
            >
              {t('groundTypeModalCancel')}
            </Button>
            <Button
              type="button"
              onClick={handleCreateNew}
              disabled={saving}
            >
              {saving ? t('groundTypeModalCreating') : t('groundTypeModalCreate')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
