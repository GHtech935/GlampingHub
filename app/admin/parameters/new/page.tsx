"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ParameterForm } from "@/components/admin/ParameterForm";

export default function NewParameterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("admin.glamping.parameters.form");
  const tc = useTranslations("admin.glamping.common");
  const [loading, setLoading] = useState(false);

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
      const response = await fetch('/api/admin/glamping/parameters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create parameter');
      }

      toast({
        title: tc("success"),
        description: "Parameter created successfully",
      });

      router.push('/admin/parameters');
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
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/admin/parameters')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Parameters
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('createTitle')}</h1>
        <p className="text-gray-600 mt-1">{t('createDescription')}</p>
      </div>

      {/* Form */}
      <ParameterForm
        onSubmit={handleSubmit}
        onCancel={() => router.push('/admin/parameters')}
        loading={loading}
        showCard={true}
      />
    </div>
  );
}
