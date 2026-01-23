"use client";

import { useEffect, useState } from "react";
import { Plus, GripVertical, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface Parameter {
  id: string;
  name: string;
  color_code: string;
  controls_inventory: boolean;
  sets_pricing: boolean;
  price_range: boolean;
  visibility: string;
  min_value?: number;
  max_value?: number;
}

export default function ParametersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("admin.glamping.parameters");
  const tc = useTranslations("admin.glamping.common");
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchParameters();
  }, []);

  const fetchParameters = async () => {
    try {
      const response = await fetch('/api/admin/glamping/parameters');
      const data = await response.json();
      setParameters(data.parameters || []);
    } catch (error) {
      console.error('Failed to fetch parameters:', error);
      toast({
        title: tc("error"),
        description: tc("error"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-gray-600 mt-1">{t("subtitle")}</p>
        </div>
        <Button onClick={() => router.push('/admin/parameters/new')}>
          <Plus className="w-4 h-4 mr-2" />
          {t("addNew")}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">{tc("loading")}</div>
        </div>
      ) : parameters.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-gray-500 mb-4">No parameters yet</p>
            <Button onClick={() => router.push('/admin/parameters/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Create your first parameter
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white border rounded-lg divide-y">
          {parameters.map((param) => {
            const features = [];

            // Build features list
            if (param.visibility === 'guest' || !param.visibility) {
              features.push('Guest');
            }
            if (param.sets_pricing) {
              features.push('Set Pricing');
            }
            if (param.price_range) {
              features.push('Show Range');
            }
            if (param.controls_inventory) {
              features.push('Inventory Control');
            }
            // Add Required if needed
            // features.push('Required');
            // Add Hidden if visibility is staff
            if (param.visibility === 'staff') {
              features.push('Hidden');
            }
            // Add default value if available
            if (param.min_value !== undefined) {
              features.push(`Default: ${param.min_value}`);
            }

            return (
              <div
                key={param.id}
                className="flex items-center gap-3 p-2 hover:bg-gray-50"
              >
                {/* Drag Handle */}
                <GripVertical className="w-4 h-4 text-gray-400 cursor-move flex-shrink-0" />

                {/* Parameter Name and Features */}
                <div className="flex-1 min-w-0 text-sm">
                  <button
                    onClick={() => router.push(`/admin/parameters/${param.id}/edit`)}
                    className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                  >
                    {param.name}
                  </button>
                  <span className="text-gray-600 ml-2">
                    {features.join(', ')}
                  </span>
                </div>

                {/* Edit Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/admin/parameters/${param.id}/edit`)}
                >
                  <Edit className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
