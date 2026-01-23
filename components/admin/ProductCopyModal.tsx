"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "react-hot-toast";
import { Product } from "./ProductsTable";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, Copy, ArrowRight } from "lucide-react";

interface ProductCopyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preSelectedProduct?: Product | null;
}

interface Campsite {
  id: string;
  name: any;
}

export function ProductCopyModal({
  isOpen,
  onClose,
  onSuccess,
  preSelectedProduct,
}: ProductCopyModalProps) {
  const t = useTranslations("admin.productCopyModal");
  const locale = useLocale() as "vi" | "en";
  const [campsites, setCampsites] = useState<Campsite[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Source selection
  const [sourceCampsiteId, setSourceCampsiteId] = useState("");
  const [sourceProducts, setSourceProducts] = useState<Product[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
    new Set()
  );

  // Destination selection - now multi-select campsites instead of pitches
  const [destCampsiteIds, setDestCampsiteIds] = useState<Set<string>>(new Set());

  // Helper to get localized text
  const getLocalizedText = (text: any): string => {
    if (typeof text === "string") return text;
    if (!text) return "";
    return text[locale] || text.vi || text.en || "";
  };

  // Load campsites on open
  useEffect(() => {
    if (isOpen) {
      fetchCampsites();
    }
  }, [isOpen]);

  // Pre-fill if product is pre-selected (row-level copy)
  useEffect(() => {
    if (preSelectedProduct && isOpen) {
      const campsiteId = preSelectedProduct.campsite?.id || "";
      setSourceCampsiteId(campsiteId);
      setSelectedProductIds(new Set([preSelectedProduct.id]));
    }
  }, [preSelectedProduct, isOpen]);

  // Load products when source campsite changes
  useEffect(() => {
    if (sourceCampsiteId) {
      fetchSourceProducts();
    } else {
      setSourceProducts([]);
      setSelectedProductIds(new Set());
    }
  }, [sourceCampsiteId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSourceCampsiteId("");
      setSourceProducts([]);
      setSelectedProductIds(new Set());
      setDestCampsiteIds(new Set());
    }
  }, [isOpen]);

  const fetchCampsites = async () => {
    try {
      const response = await fetch("/api/admin/campsites");
      const result = await response.json();
      const campsitesData = Array.isArray(result)
        ? result
        : result.campsites || result.data || [];
      setCampsites(campsitesData);
    } catch (error) {
      console.error("Failed to fetch campsites:", error);
      toast.error(t("loadCampsitesFailed"));
    }
  };

  const fetchSourceProducts = async () => {
    try {
      setLoadingProducts(true);

      const params = new URLSearchParams();
      params.append("campsiteId", sourceCampsiteId);
      params.append("limit", "100"); // Load more products for copy

      const response = await fetch(`/api/admin/products?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch products");

      const data = await response.json();
      setSourceProducts(data.products || []);

      // If pre-selected product, keep it selected
      if (preSelectedProduct) {
        setSelectedProductIds(new Set([preSelectedProduct.id]));
      } else {
        setSelectedProductIds(new Set());
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
      toast.error(t("loadProductsFailed"));
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSourceCampsiteChange = (campsiteId: string) => {
    setSourceCampsiteId(campsiteId);
  };

  const toggleProductSelection = (productId: string) => {
    const newSet = new Set(selectedProductIds);
    if (newSet.has(productId)) {
      newSet.delete(productId);
    } else {
      newSet.add(productId);
    }
    setSelectedProductIds(newSet);
  };

  const toggleCampsiteSelection = (campsiteId: string) => {
    const newSet = new Set(destCampsiteIds);
    if (newSet.has(campsiteId)) {
      newSet.delete(campsiteId);
    } else {
      newSet.add(campsiteId);
    }
    setDestCampsiteIds(newSet);
  };

  const selectAllProducts = () => {
    setSelectedProductIds(new Set(sourceProducts.map((p) => p.id)));
  };

  const deselectAllProducts = () => {
    setSelectedProductIds(new Set());
  };

  const selectAllCampsites = () => {
    // Select all campsites except the source campsite
    const otherCampsites = campsites.filter((c) => c.id !== sourceCampsiteId);
    setDestCampsiteIds(new Set(otherCampsites.map((c) => c.id)));
  };

  const deselectAllCampsites = () => {
    setDestCampsiteIds(new Set());
  };

  const handleCopy = async () => {
    if (selectedProductIds.size === 0) {
      toast.error(t("selectProductsError"));
      return;
    }

    if (destCampsiteIds.size === 0) {
      toast.error(t("selectCampsitesError"));
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/admin/products/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: Array.from(selectedProductIds),
          destinationCampsiteIds: Array.from(destCampsiteIds),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to copy products");
      }

      const result = await response.json();
      toast.success(
        t("copySuccess", { count: result.copiedCount })
      );
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to copy products:", error);
      toast.error(t("copyFailed"));
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary
  const totalNewProducts = selectedProductIds.size * destCampsiteIds.size;

  const canCopy = selectedProductIds.size > 0 && destCampsiteIds.size > 0;

  // Filter destination campsites (exclude source campsite)
  const destinationCampsites = campsites.filter((c) => c.id !== sourceCampsiteId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-6">
            {/* SOURCE COLUMN */}
            <div className="space-y-4 border-r pr-6">
              <h3 className="font-semibold text-lg text-gray-700">
                {t("source")}
              </h3>

              {/* Source Campsite */}
              <div>
                <Label>{t("campsite")} <span className="text-red-500">*</span></Label>
                <Select
                  value={sourceCampsiteId}
                  onValueChange={handleSourceCampsiteChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectCampsite")} />
                  </SelectTrigger>
                  <SelectContent>
                    {campsites.map((campsite) => (
                      <SelectItem key={campsite.id} value={campsite.id}>
                        {getLocalizedText(campsite.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Products List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t("products")}</Label>
                  {sourceProducts.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={selectAllProducts}
                      >
                        {t("selectAll")}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={deselectAllProducts}
                      >
                        {t("deselectAll")}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="border rounded-lg h-72 overflow-y-auto">
                  {loadingProducts ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : !sourceCampsiteId ? (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                      {t("selectCampsiteFirst")}
                    </div>
                  ) : sourceProducts.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                      {t("noProducts")}
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {sourceProducts.map((product) => (
                        <div
                          key={product.id}
                          className={`flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer ${
                            selectedProductIds.has(product.id)
                              ? "bg-blue-50"
                              : ""
                          }`}
                          onClick={() => toggleProductSelection(product.id)}
                        >
                          <Checkbox
                            checked={selectedProductIds.has(product.id)}
                            onCheckedChange={() =>
                              toggleProductSelection(product.id)
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {getLocalizedText(product.name)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Intl.NumberFormat("vi-VN", {
                                style: "currency",
                                currency: "VND",
                              }).format(product.price)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {t("selectedProducts", { count: selectedProductIds.size })}
                </div>
              </div>
            </div>

            {/* DESTINATION COLUMN */}
            <div className="space-y-4 pl-2">
              <h3 className="font-semibold text-lg text-gray-700 flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                {t("destination")}
              </h3>

              {/* Destination Campsites (multi-select) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>
                    {t("campsites")} <span className="text-red-500">*</span>
                  </Label>
                  {destinationCampsites.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={selectAllCampsites}
                      >
                        {t("selectAll")}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={deselectAllCampsites}
                      >
                        {t("deselectAll")}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="border rounded-lg h-72 overflow-y-auto">
                  {!sourceCampsiteId ? (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                      {t("selectSourceFirst")}
                    </div>
                  ) : destinationCampsites.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                      {t("noCampsites")}
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {destinationCampsites.map((campsite) => (
                        <div
                          key={campsite.id}
                          className={`flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer ${
                            destCampsiteIds.has(campsite.id) ? "bg-green-50" : ""
                          }`}
                          onClick={() => toggleCampsiteSelection(campsite.id)}
                        >
                          <Checkbox
                            checked={destCampsiteIds.has(campsite.id)}
                            onCheckedChange={() =>
                              toggleCampsiteSelection(campsite.id)
                            }
                          />
                          <div className="font-medium">
                            {getLocalizedText(campsite.name)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {t("selectedCampsites", { count: destCampsiteIds.size })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mt-4">
          <div className="text-center">
            {canCopy ? (
              <span className="font-medium text-green-700">
                {t("summaryCampsites", {
                  products: selectedProductIds.size,
                  campsites: destCampsiteIds.size,
                  total: totalNewProducts,
                })}
              </span>
            ) : (
              <span className="text-gray-500">{t("summaryEmpty")}</span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button onClick={handleCopy} disabled={!canCopy || loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {t("copying")}
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                {t("copy")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
