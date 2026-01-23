"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Trash2, GripVertical, ChevronDown } from "lucide-react";
import { MultilingualInput, MultilingualValue } from "../MultilingualInput";
import { MultilingualTextarea } from "../MultilingualTextarea";

export interface PitchFeature {
  id: string; // temp ID for UI, UUID after save
  name: MultilingualValue;
  value: MultilingualValue;
  warning: MultilingualValue;
}

interface FeatureTemplate {
  id: string;
  name: { vi: string; en: string };
  value?: { vi: string; en: string };
  warning?: { vi: string; en: string };
  is_active: boolean;
  sort_order: number;
}

interface FeaturesManagerProps {
  value: PitchFeature[];
  onChange: (features: PitchFeature[]) => void;
}

export function FeaturesManager({ value, onChange }: FeaturesManagerProps) {
  const t = useTranslations('pitch.features');
  const [featureTemplates, setFeatureTemplates] = useState<FeatureTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  useEffect(() => {
    fetchFeatureTemplates();
  }, []);

  const fetchFeatureTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const response = await fetch("/api/admin/feature-templates?is_active=true");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setFeatureTemplates(data);
    } catch (error) {
      console.error("Error fetching feature templates:", error);
    } finally {
      setLoadingTemplates(false);
    }
  };
  const addFeatureFromTemplate = (template: FeatureTemplate) => {
    const newFeature: PitchFeature = {
      id: `temp-${Date.now()}`,
      name: {
        vi: template.name.vi,
        en: template.name.en,
      },
      value: {
        vi: template.value?.vi || "",
        en: template.value?.en || "",
      },
      warning: {
        vi: template.warning?.vi || "",
        en: template.warning?.en || "",
      },
    };

    onChange([...value, newFeature]);
  };

  const addCustomFeature = () => {
    const newFeature: PitchFeature = {
      id: `temp-${Date.now()}`,
      name: { vi: "", en: "" },
      value: { vi: "", en: "" },
      warning: { vi: "", en: "" },
    };

    onChange([...value, newFeature]);
  };

  const removeFeature = (id: string) => {
    onChange(value.filter((f) => f.id !== id));
  };

  const updateFeature = (id: string, updates: Partial<PitchFeature>) => {
    onChange(
      value.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <p className="text-sm text-gray-500">
          {t('description')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add feature buttons */}
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="flex-1 justify-between"
              >
                <span>{t('selectPredefined')}</span>
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[calc(100vw-32px)] sm:w-[400px]">
              {loadingTemplates ? (
                <div className="p-2 text-sm text-gray-500">{t('loading')}</div>
              ) : featureTemplates.length === 0 ? (
                <div className="p-2 text-sm text-gray-500">
                  {t('noTemplates')}
                </div>
              ) : (
                featureTemplates.map((template) => (
                  <DropdownMenuItem
                    key={template.id}
                    onClick={() => addFeatureFromTemplate(template)}
                  >
                    {template.name.vi} / {template.name.en}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            type="button"
            variant="outline"
            onClick={addCustomFeature}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('addCustom')}
          </Button>
        </div>

        {/* Features list */}
        {value.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {t('noFeatures')}
          </div>
        ) : (
          <div className="space-y-4">
            {value.map((feature, index) => (
              <Card key={feature.id} className="border-2">
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    {/* Header with drag handle and delete */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                        <span className="text-sm font-medium text-gray-600">
                          {t('featureNumber', { number: index + 1 })}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFeature(feature.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>

                    {/* Row 1: Name (full width) */}
                    <MultilingualInput
                      label={t('featureName')}
                      value={feature.name}
                      onChange={(val) =>
                        updateFeature(feature.id, { name: val })
                      }
                      placeholder={{
                        vi: "VD: Điện 10 amp",
                        en: "e.g., Electric: 10 amp",
                      }}
                      required
                    />

                    {/* Row 2: Value + Warning */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <MultilingualTextarea
                        label={t('includedMax')}
                        value={feature.value}
                        onChange={(val) =>
                          updateFeature(feature.id, { value: val })
                        }
                        placeholder={{
                          vi: "VD: Đã có 2, Tối đa 3",
                          en: "e.g., Included: 2, Max: 3",
                        }}
                        rows={2}
                        requiredLocales={[]}
                      />

                      <MultilingualTextarea
                        label={t('warning')}
                        value={feature.warning}
                        onChange={(val) =>
                          updateFeature(feature.id, { warning: val })
                        }
                        placeholder={{
                          vi: "Cảnh báo (nếu có)",
                          en: "Warning (if any)",
                        }}
                        rows={2}
                        requiredLocales={[]}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
