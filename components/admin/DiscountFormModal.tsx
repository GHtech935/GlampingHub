"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CurrencyInput } from "@/components/ui/currency-input";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { useTranslations } from "next-intl";
import { useClientLocale } from "@/components/providers/ClientI18nProvider";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Campsite {
  id: string;
  name: string | { en?: string; vi?: string };
}

// Helper function to get name string from multilingual object
const getNameString = (name: string | { en?: string; vi?: string } | undefined | null, locale: string = 'vi'): string => {
  if (!name) return '';
  if (typeof name === 'string') return name;
  return name[locale as keyof typeof name] || name.vi || name.en || '';
};

interface Pitch {
  id: string;
  name: string | { en?: string; vi?: string };
  campsiteId: string;
  campsiteName: string | { en?: string; vi?: string };
}

interface Product {
  id: string;
  name: string | { en?: string; vi?: string };
  pitch?: {
    id: string;
    name: string | { en?: string; vi?: string };
    slug: string;
  };
  campsite: {
    id: string;
    name: string | { en?: string; vi?: string };
    slug: string;
  };
}

interface DiscountFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  discount?: any;
}

export default function DiscountFormModal({
  isOpen,
  onClose,
  onSuccess,
  discount,
}: DiscountFormModalProps) {
  const t = useTranslations("admin.discountFormModal");
  const { locale } = useClientLocale();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [campsites, setCampsites] = useState<Campsite[]>([]);
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [applicabilityType, setApplicabilityType] = useState<'campsites' | 'pitches' | 'products'>('campsites');

  // State để track các field đang có lỗi validation
  const [errors, setErrors] = useState<{[key: string]: boolean}>({});

  const [formData, setFormData] = useState({
    categoryId: "",
    name: "",
    code: "",
    description: "",
    discountType: "percentage",
    discountValue: undefined as number | undefined,
    appliesTo: "total",
    maxDiscountAmount: undefined as number | undefined,
    minOrderAmount: undefined as number | undefined,
    usageLimit: "",
    usageLimitPerCustomer: "1",
    validFrom: undefined as Date | undefined,
    validUntil: undefined as Date | undefined,
    applicableDays: [] as string[],
    applicableCampsites: [] as string[],
    applicablePitchTypes: [] as string[],
    applicableProducts: [] as string[],
    isActive: true,
    appliesToAllCampsitePitch: false,
  });

  const selectedCategory = categories.find((c) => c.id === formData.categoryId);
  const isVoucher = selectedCategory?.slug === "vouchers";
  const isDiscount = selectedCategory?.slug === "discounts";

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetchCampsites();
      fetchProducts();
      fetchPitches();

      if (discount) {
        // Determine applicability type based on which array has values
        let appType: 'campsites' | 'pitches' | 'products' = 'campsites';
        if (discount.applicablePitchTypes && discount.applicablePitchTypes.length > 0) {
          appType = 'pitches';
        } else if (discount.applicableProducts && discount.applicableProducts.length > 0) {
          appType = 'products';
        }
        setApplicabilityType(appType);

        setFormData({
          categoryId: discount.category?.id || "",
          name: discount.name || "",
          code: discount.code || "",
          description: discount.description || "",
          discountType: discount.discountType || "percentage",
          discountValue: discount.discountValue || undefined,
          appliesTo: discount.appliesTo || "total",
          maxDiscountAmount: discount.maxDiscountAmount || undefined,
          minOrderAmount: discount.minOrderAmount || undefined,
          usageLimit: discount.usageLimit?.toString() || "",
          usageLimitPerCustomer: discount.usageLimitPerCustomer?.toString() || "1",
          validFrom: discount.validFrom ? new Date(discount.validFrom) : undefined,
          validUntil: discount.validUntil ? new Date(discount.validUntil) : undefined,
          applicableDays: discount.applicableDays || [],
          applicableCampsites: discount.applicableCampsites || [],
          applicablePitchTypes: discount.applicablePitchTypes || [],
          applicableProducts: discount.applicableProducts || [],
          isActive: discount.isActive !== undefined ? discount.isActive : true,
          appliesToAllCampsitePitch: discount.appliesToAllCampsitePitch || false,
        });
      } else {
        resetForm();
      }
    }
  }, [isOpen, discount]);

  const resetForm = () => {
    setFormData({
      categoryId: "",
      name: "",
      code: "",
      description: "",
      discountType: "percentage",
      discountValue: undefined,
      appliesTo: "total",
      maxDiscountAmount: undefined,
      minOrderAmount: undefined,
      usageLimit: "",
      usageLimitPerCustomer: "1",
      validFrom: undefined,
      validUntil: undefined,
      applicableDays: [],
      applicableCampsites: [],
      applicablePitchTypes: [],
      applicableProducts: [],
      isActive: true,
      appliesToAllCampsitePitch: false,
    });
    setErrors({}); // Clear all errors
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/admin/discount-categories");
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchCampsites = async () => {
    try {
      const res = await fetch("/api/admin/campsites");
      const data = await res.json();
      // API returns array directly, not wrapped in object
      setCampsites(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching campsites:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/admin/products?limit=1000");
      const data = await res.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchPitches = async () => {
    try {
      const res = await fetch("/api/admin/pitches");
      const data = await res.json();
      setPitches(data.pitches || []);
    } catch (error) {
      console.error("Error fetching pitches:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("Form submitted with data:", formData);

    // Reset errors
    const newErrors: {[key: string]: boolean} = {};

    // 1. Validate category selection
    if (!formData.categoryId || formData.categoryId === "") {
      newErrors.categoryId = true;
      toast.error(t("selectCategoryError"));
      console.log("Validation failed: No category selected");
      setErrors(newErrors);
      return;
    }

    // 2. Validate required fields
    if (!formData.name || formData.name.trim() === "") {
      newErrors.name = true;
      toast.error(t("fillRequiredError"));
      console.log("Validation failed: No name");
      setErrors(newErrors);
      return;
    }

    if (formData.discountValue === undefined || formData.discountValue === null || formData.discountValue <= 0) {
      newErrors.discountValue = true;
      toast.error(t("fillRequiredError"));
      console.log("Validation failed: Invalid discount value");
      setErrors(newErrors);
      return;
    }

    // 3. Validate voucher code
    if (isVoucher && (!formData.code || formData.code.trim() === "")) {
      newErrors.code = true;
      toast.error(t("voucherCodeRequired"));
      console.log("Validation failed: Voucher needs code");
      setErrors(newErrors);
      return;
    }

    // 4. Validate item selection for discounts and vouchers
    if (isDiscount || isVoucher) {
      // Skip validation for campsites/pitches if voucher has "apply to all" enabled
      const skipCampsitePitchValidation = isVoucher && formData.appliesToAllCampsitePitch;

      if (!skipCampsitePitchValidation) {
        if (applicabilityType === 'campsites' && formData.applicableCampsites.length === 0) {
          newErrors.applicableCampsites = true;
          toast.error(t("errorNoSelection"));
          console.log("Validation failed: No campsites selected");
          setErrors(newErrors);
          return;
        }
        if (applicabilityType === 'pitches' && formData.applicablePitchTypes.length === 0) {
          newErrors.applicablePitchTypes = true;
          toast.error(t("errorNoSelection"));
          console.log("Validation failed: No pitches selected");
          setErrors(newErrors);
          return;
        }
        if (applicabilityType === 'products' && formData.applicableProducts.length === 0) {
          newErrors.applicableProducts = true;
          toast.error(t("errorNoSelection"));
          console.log("Validation failed: No products selected");
          setErrors(newErrors);
          return;
        }
      }
    }

    console.log("Validation passed, submitting...");
    setErrors({}); // Clear all errors

    setLoading(true);

    try {
      const payload = {
        categoryId: formData.categoryId,
        name: formData.name,
        code: formData.code || null,
        description: formData.description || null,
        discountType: formData.discountType,
        discountValue: formData.discountValue || 0,
        appliesTo: formData.appliesTo,
        maxDiscountAmount: formData.maxDiscountAmount || null,
        minOrderAmount: formData.minOrderAmount || null,
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
        usageLimitPerCustomer: formData.usageLimitPerCustomer ? parseInt(formData.usageLimitPerCustomer) : 1,
        validFrom: formData.validFrom ? formData.validFrom.toISOString() : null,
        validUntil: formData.validUntil ? formData.validUntil.toISOString() : null,
        applicableDays: formData.applicableDays.length > 0 ? formData.applicableDays : null,
        applicableCampsites: formData.applicableCampsites.length > 0 ? formData.applicableCampsites : null,
        applicablePitchTypes: formData.applicablePitchTypes.length > 0 ? formData.applicablePitchTypes : null,
        applicableProducts: formData.applicableProducts.length > 0 ? formData.applicableProducts : null,
        isActive: formData.isActive,
        appliesToAllCampsitePitch: formData.appliesToAllCampsitePitch,
      };

      const url = discount
        ? `/api/admin/discounts/${discount.id}`
        : "/api/admin/discounts";

      const method = discount ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save discount");
      }

      toast.success(discount ? t("updateSuccess") : t("createSuccess"));
      onSuccess();
    } catch (error: any) {
      console.error("Error saving discount:", error);
      toast.error(error.message || t("saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  const toggleCampsite = (campsiteId: string) => {
    setFormData((prev) => ({
      ...prev,
      applicableCampsites: prev.applicableCampsites.includes(campsiteId)
        ? prev.applicableCampsites.filter((id) => id !== campsiteId)
        : [...prev.applicableCampsites, campsiteId],
    }));
    setErrors({ ...errors, applicableCampsites: false });
  };

  const togglePitch = (pitchId: string) => {
    setFormData((prev) => ({
      ...prev,
      applicablePitchTypes: prev.applicablePitchTypes.includes(pitchId)
        ? prev.applicablePitchTypes.filter((id) => id !== pitchId)
        : [...prev.applicablePitchTypes, pitchId],
    }));
    setErrors({ ...errors, applicablePitchTypes: false });
  };

  const toggleProduct = (productId: string) => {
    setFormData((prev) => ({
      ...prev,
      applicableProducts: prev.applicableProducts.includes(productId)
        ? prev.applicableProducts.filter((id) => id !== productId)
        : [...prev.applicableProducts, productId],
    }));
    setErrors({ ...errors, applicableProducts: false });
  };

  const handleApplicabilityChange = (type: 'campsites' | 'pitches' | 'products') => {
    setApplicabilityType(type);
    // Clear errors for applicability fields
    setErrors({
      ...errors,
      applicableCampsites: false,
      applicablePitchTypes: false,
      applicableProducts: false,
    });
    // Clear other two options when selecting one (exclusive selection)
    setFormData((prev) => ({
      ...prev,
      applicableCampsites: type === 'campsites' ? prev.applicableCampsites : [],
      applicablePitchTypes: type === 'pitches' ? prev.applicablePitchTypes : [],
      applicableProducts: type === 'products' ? prev.applicableProducts : [],
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {discount ? t("editTitle") : t("createTitle")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                {t("category")} <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => {
                  setFormData({ ...formData, categoryId: value });
                  setErrors({ ...errors, categoryId: false });
                }}
              >
                <SelectTrigger className={errors.categoryId ? "border-red-500 focus:border-red-500" : ""}>
                  <SelectValue placeholder={t("selectCategory")} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                {t("name")} <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  setErrors({ ...errors, name: false });
                }}
                placeholder={t("namePlaceholder")}
                className={errors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
            </div>
          </div>

          {isVoucher && (
            <div className="space-y-2">
              <Label>
                {t("voucherCode")} <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.code}
                onChange={(e) => {
                  setFormData({ ...formData, code: e.target.value.toUpperCase() });
                  setErrors({ ...errors, code: false });
                }}
                placeholder={t("voucherCodePlaceholder")}
                className={`font-mono ${errors.code ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>{t("description")}</Label>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder={t("descriptionPlaceholder")}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>
                {t("discountType")} <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.discountType}
                onValueChange={(value) =>
                  setFormData({ ...formData, discountType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">{t("percentage")}</SelectItem>
                  <SelectItem value="fixed_amount">{t("fixedAmount")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                {t("value")} <span className="text-red-500">*</span>
              </Label>
              {formData.discountType === "percentage" ? (
                <Input
                  type="number"
                  value={formData.discountValue || ""}
                  onChange={(e) => {
                    setFormData({ ...formData, discountValue: e.target.value ? parseFloat(e.target.value) : undefined });
                    setErrors({ ...errors, discountValue: false });
                  }}
                  placeholder={t("valuePlaceholder")}
                  className={errors.discountValue ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
              ) : (
                <CurrencyInput
                  value={formData.discountValue}
                  onValueChange={(value) => {
                    setFormData({ ...formData, discountValue: value });
                    setErrors({ ...errors, discountValue: false });
                  }}
                  placeholder={t("valuePlaceholder")}
                  className={errors.discountValue ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
              )}
            </div>

            {formData.discountType === "percentage" && (
              <div className="space-y-2">
                <Label>{t("maxDiscount")}</Label>
                <CurrencyInput
                  value={formData.maxDiscountAmount}
                  onValueChange={(value) =>
                    setFormData({ ...formData, maxDiscountAmount: value })
                  }
                  placeholder={t("maxDiscountPlaceholder")}
                />
              </div>
            )}
          </div>

          {isVoucher && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("usageLimit")}</Label>
                <Input
                  type="number"
                  value={formData.usageLimit}
                  onChange={(e) =>
                    setFormData({ ...formData, usageLimit: e.target.value })
                  }
                  placeholder={t("usageLimitPlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("minOrderAmount")}</Label>
                <CurrencyInput
                  value={formData.minOrderAmount}
                  onValueChange={(value) =>
                    setFormData({ ...formData, minOrderAmount: value })
                  }
                  placeholder={t("minOrderPlaceholder")}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("validFrom")}</Label>
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.validFrom ? format(formData.validFrom, "dd/MM/yyyy") : t("selectDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.validFrom}
                    onSelect={(date) => setFormData({ ...formData, validFrom: date })}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today;
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>{t("validUntil")}</Label>
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.validUntil ? format(formData.validUntil, "dd/MM/yyyy") : t("selectDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.validUntil}
                    onSelect={(date) => setFormData({ ...formData, validUntil: date })}
                    disabled={(date) => {
                      if (formData.validFrom) {
                        const validFromDate = new Date(formData.validFrom);
                        validFromDate.setHours(0, 0, 0, 0);
                        return date < validFromDate;
                      }
                      return false;
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {(isDiscount || isVoucher) && (
            <>
              {/* Checkbox "Áp dụng tất cả campsite-pitch" - CHỈ cho VOUCHER, đặt Ở TRÊN */}
              {isVoucher && (
                <div className="flex items-start space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Checkbox
                    id="appliesToAllCampsitePitch"
                    checked={formData.appliesToAllCampsitePitch}
                    onCheckedChange={(checked) => {
                      const isChecked = checked as boolean;
                      setFormData({
                        ...formData,
                        appliesToAllCampsitePitch: isChecked,
                        applicableCampsites: isChecked ? [] : formData.applicableCampsites,
                        applicablePitchTypes: isChecked ? [] : formData.applicablePitchTypes,
                      });
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label htmlFor="appliesToAllCampsitePitch" className="text-sm font-medium cursor-pointer">
                      {t("appliesToAllCampsitePitch")}
                    </label>
                    <p className="text-xs text-gray-600 mt-1">
                      {t("appliesToAllCampsitePitchHint")}
                    </p>
                  </div>
                </div>
              )}

              {/* Radio buttons - ẨN khi checkbox "apply all" được chọn */}
              {!formData.appliesToAllCampsitePitch && (
                <div className="space-y-3">
                  <Label>{t("applicabilityType")}</Label>
                  <RadioGroup
                    value={applicabilityType}
                    onValueChange={(value) => handleApplicabilityChange(value as 'campsites' | 'pitches' | 'products')}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="campsites" id="type-campsites" />
                      <label htmlFor="type-campsites" className="text-sm cursor-pointer font-medium">
                        {t("applicabilityTypeCampsites")}
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pitches" id="type-pitches" />
                      <label htmlFor="type-pitches" className="text-sm cursor-pointer font-medium">
                        {t("applicabilityTypePitches")}
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="products" id="type-products" />
                      <label htmlFor="type-products" className="text-sm cursor-pointer font-medium">
                        {t("applicabilityTypeProducts")}
                      </label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {!formData.appliesToAllCampsitePitch && applicabilityType === 'campsites' && (
                <div className="space-y-2">
                  <Label>{t("selectCampsites")}</Label>
                  <div className={`border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 ${errors.applicableCampsites ? "border-red-500" : ""}`}>
                    {campsites.length === 0 ? (
                      <p className="text-sm text-gray-500">{t("noCampsites")}</p>
                    ) : (
                      campsites.map((campsite) => (
                        <div key={campsite.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`campsite-${campsite.id}`}
                            checked={formData.applicableCampsites.includes(campsite.id)}
                            onCheckedChange={() => toggleCampsite(campsite.id)}
                          />
                          <label
                            htmlFor={`campsite-${campsite.id}`}
                            className="text-sm cursor-pointer"
                          >
                            {getNameString(campsite.name, locale)}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {!formData.appliesToAllCampsitePitch && applicabilityType === 'pitches' && (
                <div className="space-y-2">
                  <Label>{t("selectPitches")}</Label>
                  <div className={`border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 ${errors.applicablePitchTypes ? "border-red-500" : ""}`}>
                    {pitches.length === 0 ? (
                      <p className="text-sm text-gray-500">{t("noPitches")}</p>
                    ) : (
                      pitches.map((pitch) => (
                        <div key={pitch.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`pitch-${pitch.id}`}
                            checked={formData.applicablePitchTypes.includes(pitch.id)}
                            onCheckedChange={() => togglePitch(pitch.id)}
                          />
                          <label
                            htmlFor={`pitch-${pitch.id}`}
                            className="text-sm cursor-pointer"
                          >
                            {getNameString(pitch.name, locale)} ({getNameString(pitch.campsiteName, locale)})
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {!formData.appliesToAllCampsitePitch && applicabilityType === 'products' && (
                <div className="space-y-2">
                  <Label>{t("selectProducts")}</Label>
                  <div className={`border rounded-lg p-3 max-h-60 overflow-y-auto space-y-2 ${errors.applicableProducts ? "border-red-500" : ""}`}>
                    {products.length === 0 ? (
                      <p className="text-sm text-gray-500">{t("noProducts")}</p>
                    ) : (
                      products.map((product) => (
                        <div key={product.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`product-${product.id}`}
                            checked={formData.applicableProducts.includes(product.id)}
                            onCheckedChange={() => toggleProduct(product.id)}
                          />
                          <label
                            htmlFor={`product-${product.id}`}
                            className="text-sm cursor-pointer"
                          >
                            {getNameString(product.name, locale)} <span className="text-xs text-gray-500">({getNameString(product.campsite?.name, locale)}{product.pitch ? ` - ${getNameString(product.pitch.name, locale)}` : ''})</span>
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isActive: checked as boolean })
              }
            />
            <label htmlFor="isActive" className="text-sm cursor-pointer">
              {t("isActive")}
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("saving") : discount ? t("update") : t("create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
