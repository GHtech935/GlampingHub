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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { RefreshCcw } from "lucide-react";
import { useTranslations } from "next-intl";

interface CustomerFormModalProps {
  customerId?: string | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CustomerFormData {
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  country: string;
  address_line1: string;
  city: string;
  postal_code: string;
  marketing_consent: boolean;
}

export default function CustomerFormModal({
  customerId,
  open,
  onClose,
  onSuccess,
}: CustomerFormModalProps) {
  const t = useTranslations("admin.customerForm");
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<CustomerFormData>({
    email: "",
    phone: "",
    first_name: "",
    last_name: "",
    country: "Vietnam",
    address_line1: "",
    city: "",
    postal_code: "",
    marketing_consent: false,
  });

  const isEditMode = !!customerId;

  useEffect(() => {
    if (customerId && open) {
      fetchCustomerData();
    } else if (!customerId && open) {
      // Reset form for add mode
      setFormData({
        email: "",
        phone: "",
        first_name: "",
        last_name: "",
        country: "Vietnam",
        address_line1: "",
        city: "",
        postal_code: "",
        marketing_consent: false,
      });
    }
  }, [customerId, open]);

  const fetchCustomerData = async () => {
    if (!customerId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/customers/${customerId}`);
      const data = await response.json();

      if (data.success) {
        const customer = data.data.customer;
        setFormData({
          email: customer.email || "",
          phone: customer.phone || "",
          first_name: customer.first_name || "",
          last_name: customer.last_name || "",
          country: customer.country || "Vietnam",
          address_line1: customer.address_line1 || "",
          city: customer.city || "",
          postal_code: customer.postal_code || "",
          marketing_consent: customer.marketing_consent || false,
        });
      } else {
        toast({
          title: t("error"),
          description: t("fetchError"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching customer:", error);
      toast({
        title: t("error"),
        description: t("fetchError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.email || !formData.first_name || !formData.last_name) {
      toast({
        title: t("error"),
        description: t("validation.fillRequired"),
        variant: "destructive",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: t("error"),
        description: t("validation.emailInvalid"),
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const url = isEditMode
        ? `/api/admin/customers/${customerId}`
        : `/api/admin/customers`;

      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: t("success"),
          description: isEditMode
            ? t("updateSuccess")
            : t("createSuccess"),
        });
        onSuccess();
        onClose();
      } else {
        toast({
          title: t("error"),
          description: data.error || t("saveFailed"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving customer:", error);
      toast({
        title: t("error"),
        description: t("saveFailed"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field: keyof CustomerFormData, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t("editTitle") : t("addTitle")}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-12">
            <RefreshCcw className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Email */}
              <div>
                <Label htmlFor="email">
                  {t("email")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  required
                />
              </div>

              {/* Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">
                    {t("firstName")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleChange("first_name", e.target.value)}
                    placeholder={t("firstNamePlaceholder")}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">
                    {t("lastName")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleChange("last_name", e.target.value)}
                    placeholder={t("lastNamePlaceholder")}
                    required
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <Label htmlFor="phone">{t("phone")}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder={t("phonePlaceholder")}
                />
              </div>

              {/* Address */}
              <div>
                <Label htmlFor="address_line1">{t("address")}</Label>
                <Input
                  id="address_line1"
                  value={formData.address_line1}
                  onChange={(e) => handleChange("address_line1", e.target.value)}
                  placeholder={t("addressPlaceholder")}
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={onClose}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />
                    {t("saving")}
                  </>
                ) : isEditMode ? (
                  t("update")
                ) : (
                  t("create")
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
