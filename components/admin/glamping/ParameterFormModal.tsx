"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { ParameterForm } from "@/components/admin/ParameterForm";

interface ParameterFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  zoneId?: string; // Optional for zone-specific parameters
  parameterId?: string; // Optional - if provided, edit mode
}

export function ParameterFormModal({
  open,
  onOpenChange,
  onSuccess,
  zoneId,
  parameterId
}: ParameterFormModalProps) {
  const { toast } = useToast();
  const t = useTranslations("admin.glamping.parameters.form");
  const tc = useTranslations("admin.glamping.common");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [parameterData, setParameterData] = useState<any>(null);

  useEffect(() => {
    setIsEditMode(!!parameterId);
  }, [parameterId]);

  useEffect(() => {
    if (open) {
      if (parameterId) {
        fetchParameterData(parameterId);
      } else {
        // Reset form for create mode
        resetForm();
      }
    }
  }, [open, parameterId]);

  const fetchParameterData = async (id: string) => {
    setLoadingData(true);
    try {
      const response = await fetch(`/api/admin/glamping/parameters/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch parameter');
      }

      setParameterData(data.parameter);
    } catch (error: any) {
      console.error('Failed to fetch parameter:', error);
      toast({
        title: tc("error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const resetForm = () => {
    setParameterData(null);
  };

  const handleSubmit = async (formData: any) => {
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
        ? `/api/admin/glamping/parameters/${parameterId}`
        : '/api/admin/glamping/parameters';

      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || (isEditMode ? 'Failed to update parameter' : 'Failed to create parameter'));
      }

      toast({
        title: tc("success"),
        description: isEditMode ? t("updateSuccess") : t("createSuccess"),
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t("editTitle") : t("createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? t("editDescription") : t("createDescription")}
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <ParameterForm
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            loading={loading}
            showCard={false}
            initialData={parameterData}
            isEditing={isEditMode}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
