"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { MultilingualInput, MultilingualValue } from "../MultilingualInput";
import {
  CampsiteFeatureCategory,
  CampsiteFeatureTemplate,
  CampsiteFeatureSelection,
} from "@/types";
import { useTranslations } from "next-intl";

interface CampsiteFeaturesManagerProps {
  value: CampsiteFeatureSelection[];
  onChange: (features: CampsiteFeatureSelection[]) => void;
}

export function CampsiteFeaturesManager({
  value,
  onChange,
}: CampsiteFeaturesManagerProps) {
  const t = useTranslations('admin.campsiteFeaturesManager');
  const [categories, setCategories] = useState<CampsiteFeatureCategory[]>([]);
  const [templates, setTemplates] = useState<CampsiteFeatureTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customFeature, setCustomFeature] = useState<{
    name: MultilingualValue;
    categoryId: string;
  }>({
    name: { vi: "", en: "" },
    categoryId: "",
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "/api/admin/campsite-feature-templates?is_active=true"
      );
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setCategories(data.categories || []);
      setTemplates(data.templates || []);
    } catch (error) {
      console.error("Error fetching campsite feature templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const isFeatureSelected = (templateId: string): boolean => {
    return value.some((f) => f.templateId === templateId);
  };

  const toggleFeature = (templateId: string) => {
    if (isFeatureSelected(templateId)) {
      // Remove feature
      onChange(value.filter((f) => f.templateId !== templateId));
    } else {
      // Add feature with isAvailable = true by default
      onChange([
        ...value,
        {
          templateId,
          isAvailable: true,
        },
      ]);
    }
  };

  const toggleAvailability = (templateId: string) => {
    onChange(
      value.map((f) =>
        f.templateId === templateId
          ? { ...f, isAvailable: !f.isAvailable }
          : f
      )
    );
  };

  const getFeatureAvailability = (templateId: string): boolean => {
    const feature = value.find((f) => f.templateId === templateId);
    return feature?.isAvailable ?? true;
  };

  const addCustomFeature = () => {
    if (!customFeature.name.vi || !customFeature.name.en || !customFeature.categoryId) {
      alert(t('validationError'));
      return;
    }

    onChange([
      ...value,
      {
        customName: customFeature.name,
        customCategoryId: customFeature.categoryId,
        isAvailable: true,
      },
    ]);

    // Reset form
    setCustomFeature({
      name: { vi: "", en: "" },
      categoryId: "",
    });
    setShowCustomDialog(false);
  };

  const getTemplatesByCategory = (categoryId: string) => {
    return templates.filter((t) => t.category_id === categoryId);
  };

  const getCustomFeaturesByCategory = (categoryId: string) => {
    return value.filter((f) => f.customName && f.customCategoryId === categoryId);
  };

  const getSelectedCount = (categoryId: string) => {
    const categoryTemplates = getTemplatesByCategory(categoryId);
    const customFeatures = getCustomFeaturesByCategory(categoryId);
    return categoryTemplates.filter((t) => isFeatureSelected(t.id)).length + customFeatures.length;
  };

  const isCustomFeatureSelected = (customName: MultilingualValue): boolean => {
    return value.some((f) =>
      f.customName &&
      f.customName.vi === customName.vi &&
      f.customName.en === customName.en
    );
  };

  const toggleCustomFeature = (customName: MultilingualValue) => {
    onChange(value.filter((f) =>
      !(f.customName &&
        f.customName.vi === customName.vi &&
        f.customName.en === customName.en)
    ));
  };

  const toggleCustomAvailability = (customName: MultilingualValue) => {
    onChange(
      value.map((f) =>
        f.customName &&
        f.customName.vi === customName.vi &&
        f.customName.en === customName.en
          ? { ...f, isAvailable: !f.isAvailable }
          : f
      )
    );
  };

  const getCustomFeatureAvailability = (customName: MultilingualValue): boolean => {
    const feature = value.find((f) =>
      f.customName &&
      f.customName.vi === customName.vi &&
      f.customName.en === customName.en
    );
    return feature?.isAvailable ?? true;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">{t('loading')}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('title')}</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {t('description')}
            </p>
          </div>
          <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                {t('addCustom')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('addCustomFeatureTitle')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t('category')}</Label>
                  <Select
                    value={customFeature.categoryId}
                    onValueChange={(val) =>
                      setCustomFeature({ ...customFeature, categoryId: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectCategory')} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name.vi} / {cat.name.en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <MultilingualInput
                  label={t('featureName')}
                  value={customFeature.name}
                  onChange={(val) =>
                    setCustomFeature({ ...customFeature, name: val })
                  }
                  placeholder={{
                    vi: t('featureNamePlaceholder.vi'),
                    en: t('featureNamePlaceholder.en'),
                  }}
                  required
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCustomDialog(false)}
                >
                  {t('cancel')}
                </Button>
                <Button type="button" onClick={addCustomFeature}>
                  {t('add')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {categories.map((category) => {
            const categoryTemplates = getTemplatesByCategory(category.id);
            const selectedCount = getSelectedCount(category.id);

            return (
              <AccordionItem key={category.id} value={category.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <span className="font-medium">
                      {category.name.vi} / {category.name.en}
                    </span>
                    <span className="text-sm text-gray-500">
                      {selectedCount}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {/* Template features */}
                    {categoryTemplates.length === 0 && getCustomFeaturesByCategory(category.id).length === 0 ? (
                      <p className="text-sm text-gray-500 pl-6">
                        {t('noFeaturesInCategory')}
                      </p>
                    ) : (
                      <>
                        {categoryTemplates.map((template) => {
                          const isSelected = isFeatureSelected(template.id);
                          const isAvailable = getFeatureAvailability(template.id);

                          return (
                            <div
                              key={template.id}
                              className="flex items-start gap-3 pl-6"
                            >
                              <Checkbox
                                id={`feature-${template.id}`}
                                checked={isSelected}
                                onCheckedChange={() => toggleFeature(template.id)}
                              />
                              <div className="flex-1">
                                <Label
                                  htmlFor={`feature-${template.id}`}
                                  className="text-sm font-normal cursor-pointer"
                                >
                                  {template.name.vi} / {template.name.en}
                                </Label>
                                {template.description && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {template.description.vi}
                                  </p>
                                )}
                              </div>
                              {isSelected && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">
                                    {isAvailable ? t('has') : t('doesNotHave')}
                                  </span>
                                  <Checkbox
                                    id={`available-${template.id}`}
                                    checked={isAvailable}
                                    onCheckedChange={() =>
                                      toggleAvailability(template.id)
                                    }
                                  />
                                  <Label
                                    htmlFor={`available-${template.id}`}
                                    className="text-xs text-gray-600 cursor-pointer"
                                  >
                                    {t('available')}
                                  </Label>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Custom features */}
                        {getCustomFeaturesByCategory(category.id).map((feature, idx) => {
                          const customName = feature.customName!;
                          const isAvailable = getCustomFeatureAvailability(customName);
                          const uniqueId = `custom-${category.id}-${idx}`;

                          return (
                            <div
                              key={uniqueId}
                              className="flex items-start gap-3 pl-6 bg-emerald-50 p-2 rounded"
                            >
                              <Checkbox
                                id={uniqueId}
                                checked={true}
                                onCheckedChange={() => toggleCustomFeature(customName)}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Label
                                    htmlFor={uniqueId}
                                    className="text-sm font-normal cursor-pointer"
                                  >
                                    {customName.vi} / {customName.en}
                                  </Label>
                                  <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">
                                    {t('customBadge')}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">
                                  {isAvailable ? t('has') : t('doesNotHave')}
                                </span>
                                <Checkbox
                                  id={`available-${uniqueId}`}
                                  checked={isAvailable}
                                  onCheckedChange={() =>
                                    toggleCustomAvailability(customName)
                                  }
                                />
                                <Label
                                  htmlFor={`available-${uniqueId}`}
                                  className="text-xs text-gray-600 cursor-pointer"
                                >
                                  {t('available')}
                                </Label>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        <div className="mt-4 text-sm text-gray-600">
          <p>
            <strong>{t('total')}</strong> {value.length} {t('featuresSelected')}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {t('legend')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
