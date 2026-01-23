"use client";

import { useEffect, useState } from "react";
import { Edit, MapPin, Package, DollarSign, TrendingUp, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  zone_id: string;
  zone_name: string;
}

export default function AllZonesParametersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("admin.glamping.parameters");
  const tc = useTranslations("admin.glamping.common");
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchZones();
    fetchParameters();
  }, []);

  const fetchZones = async () => {
    try {
      const response = await fetch("/api/admin/glamping/zones");
      const data = await response.json();
      if (data.zones) {
        setZones(data.zones.map((z: any) => ({ id: z.id, name: z.name.vi })));
      }
    } catch (error) {
      console.error("Failed to fetch zones:", error);
    }
  };

  const fetchParameters = async () => {
    try {
      const response = await fetch("/api/admin/glamping/parameters");
      const data = await response.json();
      setParameters(data.parameters || []);
    } catch (error) {
      console.error("Failed to fetch parameters:", error);
      toast({
        title: tc("error"),
        description: tc("error"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredParameters = parameters.filter(
    (param) => zoneFilter === "all" || param.zone_id === zoneFilter
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("allParametersTitle")}</h1>
          <p className="text-gray-600 mt-1">{t("allParametersSubtitle")}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">{t("zoneFilter")}</label>
        <Select value={zoneFilter} onValueChange={setZoneFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allZones")}</SelectItem>
            {zones.map((zone) => (
              <SelectItem key={zone.id} value={zone.id}>
                {zone.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Parameters Table */}
      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-12"></TableHead>
              <TableHead className="font-semibold">{t("table.parameterName")}</TableHead>
              <TableHead className="font-semibold">{t("table.zone")}</TableHead>
              <TableHead className="text-center font-semibold">
                <div className="flex items-center justify-center gap-1">
                  <Package className="w-4 h-4" />
                  {t("table.inventory")}
                </div>
              </TableHead>
              <TableHead className="text-center font-semibold">
                <div className="flex items-center justify-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  {t("table.pricing")}
                </div>
              </TableHead>
              <TableHead className="font-semibold">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  {t("table.priceRange")}
                </div>
              </TableHead>
              <TableHead className="font-semibold">{t("table.visibility")}</TableHead>
              <TableHead className="text-right">{tc("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredParameters.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                  {tc("noData")}
                </TableCell>
              </TableRow>
            ) : (
              filteredParameters.map((param, index) => (
                <TableRow key={param.id} className={index % 2 === 1 ? "bg-gray-50/50" : ""}>
                  {/* Color Indicator */}
                  <TableCell>
                    <div
                      className="w-6 h-6 rounded-md border border-gray-200"
                      style={{ backgroundColor: param.color_code || "#cccccc" }}
                      title={param.color_code}
                    />
                  </TableCell>

                  {/* Parameter Name */}
                  <TableCell>
                    <button
                      onClick={() =>
                        router.push(
                          `/admin/zones/${param.zone_id}/parameters/${param.id}/edit`
                        )
                      }
                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {param.name}
                    </button>
                  </TableCell>

                  {/* Zone */}
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm text-gray-700">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{param.zone_name}</span>
                    </div>
                  </TableCell>

                  {/* Controls Inventory */}
                  <TableCell className="text-center">
                    {param.controls_inventory ? (
                      <Check className="w-5 h-5 text-green-600 mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-gray-300 mx-auto" />
                    )}
                  </TableCell>

                  {/* Sets Pricing */}
                  <TableCell className="text-center">
                    {param.sets_pricing ? (
                      <Check className="w-5 h-5 text-green-600 mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-gray-300 mx-auto" />
                    )}
                  </TableCell>

                  {/* Price Range */}
                  <TableCell>
                    {param.price_range && param.min_value !== undefined && param.max_value !== undefined ? (
                      <span className="text-sm font-medium text-gray-700">
                        {param.min_value?.toLocaleString()} - {param.max_value?.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </TableCell>

                  {/* Visibility */}
                  <TableCell>
                    <Badge
                      variant={param.visibility === "everyone" ? "default" : "secondary"}
                    >
                      {t(`visibility.${param.visibility}`)}
                    </Badge>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        router.push(
                          `/admin/zones/${param.zone_id}/parameters/${param.id}/edit`
                        )
                      }
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
