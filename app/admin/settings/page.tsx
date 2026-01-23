"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Settings, CreditCard, Share2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";

interface Setting {
  id: string;
  key: string;
  value: boolean | string | number | object;
  description: string;
  updated_at: string;
}

export default function AdminSettingsPage() {
  const t = useTranslations("admin");
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/admin/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      const data = await response.json();
      setSettings(data.settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Không thể tải cài đặt");
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: unknown) => {
    setUpdating(key);
    try {
      const response = await fetch(`/api/admin/settings/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });

      if (!response.ok) throw new Error("Failed to update setting");

      const data = await response.json();

      // Update local state
      setSettings(prev =>
        prev.map(s => (s.key === key ? { ...s, value: data.setting.value, updated_at: data.setting.updated_at } : s))
      );

      toast.success("Đã cập nhật cài đặt");
    } catch (error) {
      console.error("Error updating setting:", error);
      toast.error("Không thể cập nhật cài đặt");
    } finally {
      setUpdating(null);
    }
  };

  const getSettingValue = (key: string): boolean => {
    const setting = settings.find(s => s.key === key);
    if (!setting) return true; // default
    // Handle both boolean and string "true"/"false"
    if (typeof setting.value === "boolean") return setting.value;
    if (typeof setting.value === "string") return setting.value === "true";
    return true;
  };

  const getStringSettingValue = (key: string): string => {
    const setting = settings.find(s => s.key === key);
    if (!setting) return "";
    if (typeof setting.value === "string") return setting.value;
    return "";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Cài đặt hệ thống
        </h1>
        <p className="text-gray-500 mt-1">Quản lý các cấu hình chung của hệ thống</p>
      </div>

      {/* Payment Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Cài đặt thanh toán
          </CardTitle>
          <CardDescription>Cấu hình các tùy chọn thanh toán cho khách hàng</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Allow Pay Later */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="allow_pay_later" className="text-base font-medium">
                Cho phép trả tiền sau
              </Label>
              <p className="text-sm text-gray-500">
                Khi bật, khách hàng có thể chọn chỉ thanh toán tiền cọc và trả phần còn lại khi checkout.
                <br />
                Khi tắt, khách hàng phải thanh toán 100% trước khi booking được xác nhận.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {updating === "allow_pay_later" && <Loader2 className="w-4 h-4 animate-spin" />}
              <Switch
                id="allow_pay_later"
                checked={getSettingValue("allow_pay_later")}
                onCheckedChange={checked => updateSetting("allow_pay_later", checked)}
                disabled={updating === "allow_pay_later"}
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900">Lưu ý về thuế VAT</h4>
            <p className="text-sm text-blue-700 mt-1">
              Tất cả giá hiển thị trên booking form đều <strong>chưa bao gồm thuế VAT</strong>.
              Thuế chỉ được tính khi khách hàng yêu cầu xuất hóa đơn đỏ (admin bật toggle trong chi tiết booking).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Social Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Cài đặt mạng xã hội
          </CardTitle>
          <CardDescription>Quản lý links đến các trang mạng xã hội hiển thị ở footer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Facebook URL */}
          <div className="space-y-2">
            <Label htmlFor="social_facebook_url" className="text-sm font-medium">
              Facebook URL
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="social_facebook_url"
                type="url"
                placeholder="https://facebook.com/yourpage"
                value={getStringSettingValue("social_facebook_url")}
                onChange={e => {
                  const newValue = e.target.value;
                  setSettings(prev =>
                    prev.map(s => (s.key === "social_facebook_url" ? { ...s, value: newValue } : s))
                  );
                }}
                onBlur={e => updateSetting("social_facebook_url", e.target.value)}
                disabled={updating === "social_facebook_url"}
                className="flex-1"
              />
              {updating === "social_facebook_url" && <Loader2 className="w-4 h-4 animate-spin" />}
            </div>
            <p className="text-xs text-gray-500">Để trống nếu không muốn hiển thị icon Facebook</p>
          </div>

          {/* Twitter URL */}
          <div className="space-y-2">
            <Label htmlFor="social_twitter_url" className="text-sm font-medium">
              Twitter URL
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="social_twitter_url"
                type="url"
                placeholder="https://twitter.com/yourhandle"
                value={getStringSettingValue("social_twitter_url")}
                onChange={e => {
                  const newValue = e.target.value;
                  setSettings(prev =>
                    prev.map(s => (s.key === "social_twitter_url" ? { ...s, value: newValue } : s))
                  );
                }}
                onBlur={e => updateSetting("social_twitter_url", e.target.value)}
                disabled={updating === "social_twitter_url"}
                className="flex-1"
              />
              {updating === "social_twitter_url" && <Loader2 className="w-4 h-4 animate-spin" />}
            </div>
            <p className="text-xs text-gray-500">Để trống nếu không muốn hiển thị icon Twitter</p>
          </div>

          {/* Instagram URL */}
          <div className="space-y-2">
            <Label htmlFor="social_instagram_url" className="text-sm font-medium">
              Instagram URL
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="social_instagram_url"
                type="url"
                placeholder="https://instagram.com/yourprofile"
                value={getStringSettingValue("social_instagram_url")}
                onChange={e => {
                  const newValue = e.target.value;
                  setSettings(prev =>
                    prev.map(s => (s.key === "social_instagram_url" ? { ...s, value: newValue } : s))
                  );
                }}
                onBlur={e => updateSetting("social_instagram_url", e.target.value)}
                disabled={updating === "social_instagram_url"}
                className="flex-1"
              />
              {updating === "social_instagram_url" && <Loader2 className="w-4 h-4 animate-spin" />}
            </div>
            <p className="text-xs text-gray-500">Để trống nếu không muốn hiển thị icon Instagram</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
