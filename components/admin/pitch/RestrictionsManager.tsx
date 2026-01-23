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
import { MultilingualTextarea, MultilingualValue } from "../MultilingualTextarea";

export interface PitchRestriction {
  id: string; // temp ID for UI, UUID after save
  restriction: MultilingualValue;
}

interface RestrictionTemplate {
  id: string;
  restriction: { vi: string; en: string };
  is_active: boolean;
  sort_order: number;
}

interface RestrictionsManagerProps {
  value: PitchRestriction[];
  onChange: (restrictions: PitchRestriction[]) => void;
}

export function RestrictionsManager({
  value,
  onChange,
}: RestrictionsManagerProps) {
  const t = useTranslations('pitch.restrictions');
  const [restrictionTemplates, setRestrictionTemplates] = useState<RestrictionTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  useEffect(() => {
    fetchRestrictionTemplates();
  }, []);

  const fetchRestrictionTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const response = await fetch("/api/admin/restriction-templates?is_active=true");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setRestrictionTemplates(data);
    } catch (error) {
      console.error("Error fetching restriction templates:", error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const addRestrictionFromTemplate = (template: RestrictionTemplate) => {
    const newRestriction: PitchRestriction = {
      id: `temp-${Date.now()}`,
      restriction: {
        vi: template.restriction.vi,
        en: template.restriction.en,
      },
    };

    onChange([...value, newRestriction]);
  };

  const addCustomRestriction = () => {
    const newRestriction: PitchRestriction = {
      id: `temp-${Date.now()}`,
      restriction: { vi: "", en: "" },
    };

    onChange([...value, newRestriction]);
  };

  const removeRestriction = (id: string) => {
    onChange(value.filter((r) => r.id !== id));
  };

  const updateRestriction = (id: string, restriction: MultilingualValue) => {
    onChange(
      value.map((r) => (r.id === id ? { ...r, restriction } : r))
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
        {/* Add restriction buttons */}
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
              ) : restrictionTemplates.length === 0 ? (
                <div className="p-2 text-sm text-gray-500">
                  {t('noTemplates')}
                </div>
              ) : (
                restrictionTemplates.map((template) => (
                  <DropdownMenuItem
                    key={template.id}
                    onClick={() => addRestrictionFromTemplate(template)}
                  >
                    {template.restriction.vi} / {template.restriction.en}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            type="button"
            variant="outline"
            onClick={addCustomRestriction}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('addCustom')}
          </Button>
        </div>

        {/* Restrictions list */}
        {value.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {t('noRestrictions')}
          </div>
        ) : (
          <div className="space-y-3">
            {value.map((restriction, index) => (
              <Card key={restriction.id} className="border-2">
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {/* Header with drag handle and delete */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                        <span className="text-sm font-medium text-gray-600">
                          {t('restrictionNumber', { number: index + 1 })}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRestriction(restriction.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>

                    {/* Restriction text (multilingual) */}
                    <MultilingualTextarea
                      label={t('content')}
                      value={restriction.restriction}
                      onChange={(val) =>
                        updateRestriction(restriction.id, val)
                      }
                      placeholder={{
                        vi: "VD: Không được dùng mái hiên",
                        en: "e.g., Awnings not allowed",
                      }}
                      rows={2}
                      required
                    />
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
