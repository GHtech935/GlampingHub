/**
 * @deprecated This component is deprecated. Use the dedicated page at
 * /admin/campsites/[campsiteId]/pitches/new instead.
 *
 * This file is kept for reference purposes only.
 */

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "react-hot-toast";

interface AddPitchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  campsiteId: string;
}

export function AddPitchDialog({
  isOpen,
  onClose,
  onSuccess,
  campsiteId,
}: AddPitchDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    maxGuests: "4",
    maxVehicles: "1",
    maxDogs: "0",
    pitchSizeWidth: "",
    pitchSizeDepth: "",
    groundType: "grass",
    basePrice: "",
    weekendPrice: "",
    holidayPrice: "",
    isActive: true,
    isFeatured: false,
    sortOrder: "0",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.basePrice) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    try {
      setLoading(true);

      // Generate slug from name
      const slug = formData.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");

      const payload = {
        name: formData.name,
        slug,
        description: formData.description || null,
        maxGuests: parseInt(formData.maxGuests),
        maxVehicles: parseInt(formData.maxVehicles),
        maxDogs: parseInt(formData.maxDogs),
        pitchSizeWidth: formData.pitchSizeWidth
          ? parseFloat(formData.pitchSizeWidth)
          : null,
        pitchSizeDepth: formData.pitchSizeDepth
          ? parseFloat(formData.pitchSizeDepth)
          : null,
        groundType: formData.groundType,
        basePrice: parseFloat(formData.basePrice),
        weekendPrice: formData.weekendPrice
          ? parseFloat(formData.weekendPrice)
          : null,
        holidayPrice: formData.holidayPrice
          ? parseFloat(formData.holidayPrice)
          : null,
        isActive: formData.isActive,
        isFeatured: formData.isFeatured,
        sortOrder: parseInt(formData.sortOrder),
      };

      const response = await fetch(
        `/api/admin/campsites/${campsiteId}/pitches`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create slot");
      }

      toast.success("Tạo slot thành công");
      onSuccess();
      onClose();

      // Reset form
      setFormData({
        name: "",
        description: "",
        maxGuests: "4",
        maxVehicles: "1",
        maxDogs: "0",
        pitchSizeWidth: "",
        pitchSizeDepth: "",
        groundType: "grass",
        basePrice: "",
        weekendPrice: "",
        holidayPrice: "",
        isActive: true,
        isFeatured: false,
        sortOrder: "0",
      });
    } catch (error) {
      console.error("Failed to create slot:", error);
      toast.error(
        error instanceof Error ? error.message : "Không thể tạo slot"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo slot mới</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-700">
              Thông tin cơ bản
            </h3>

            <div>
              <Label htmlFor="name">
                Tên pitch <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="VD: Slot tiêu chuẩn A1"
              />
            </div>

            <div>
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Mô tả chi tiết về slot..."
                rows={3}
              />
            </div>
          </div>

          {/* Capacity */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-700">Sức chứa</h3>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="maxGuests">
                  Số người tối đa <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="maxGuests"
                  type="number"
                  min="1"
                  value={formData.maxGuests}
                  onChange={(e) =>
                    setFormData({ ...formData, maxGuests: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="maxVehicles">Số xe tối đa</Label>
                <Input
                  id="maxVehicles"
                  type="number"
                  min="0"
                  value={formData.maxVehicles}
                  onChange={(e) =>
                    setFormData({ ...formData, maxVehicles: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="maxDogs">Số chó tối đa</Label>
                <Input
                  id="maxDogs"
                  type="number"
                  min="0"
                  value={formData.maxDogs}
                  onChange={(e) =>
                    setFormData({ ...formData, maxDogs: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* Physical Specifications */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-700">
              Thông số kỹ thuật
            </h3>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="pitchSizeWidth">Chiều rộng (m)</Label>
                <Input
                  id="pitchSizeWidth"
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.pitchSizeWidth}
                  onChange={(e) =>
                    setFormData({ ...formData, pitchSizeWidth: e.target.value })
                  }
                  placeholder="VD: 10"
                />
              </div>

              <div>
                <Label htmlFor="pitchSizeDepth">Chiều sâu (m)</Label>
                <Input
                  id="pitchSizeDepth"
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.pitchSizeDepth}
                  onChange={(e) =>
                    setFormData({ ...formData, pitchSizeDepth: e.target.value })
                  }
                  placeholder="VD: 10"
                />
              </div>

              <div>
                <Label htmlFor="groundType">Loại nền</Label>
                <Select
                  value={formData.groundType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, groundType: value })
                  }
                >
                  <SelectTrigger id="groundType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grass">Cỏ</SelectItem>
                    <SelectItem value="gravel">Sỏi</SelectItem>
                    <SelectItem value="hardstanding">Bê tông</SelectItem>
                    <SelectItem value="mixed">Hỗn hợp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-700">Giá</h3>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="basePrice">
                  Giá cơ bản (VND/đêm) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="basePrice"
                  type="number"
                  min="0"
                  step="10000"
                  value={formData.basePrice}
                  onChange={(e) =>
                    setFormData({ ...formData, basePrice: e.target.value })
                  }
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="weekendPrice">Giá cuối tuần (VND/đêm)</Label>
                <Input
                  id="weekendPrice"
                  type="number"
                  min="0"
                  step="10000"
                  value={formData.weekendPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, weekendPrice: e.target.value })
                  }
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="holidayPrice">Giá ngày lễ (VND/đêm)</Label>
                <Input
                  id="holidayPrice"
                  type="number"
                  min="0"
                  step="10000"
                  value={formData.holidayPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, holidayPrice: e.target.value })
                  }
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-700">Cài đặt</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
                <Label htmlFor="isActive">Kích hoạt</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="isFeatured"
                  checked={formData.isFeatured}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isFeatured: checked })
                  }
                />
                <Label htmlFor="isFeatured">Nổi bật</Label>
              </div>
            </div>

            <div>
              <Label htmlFor="sortOrder">Thứ tự hiển thị</Label>
              <Input
                id="sortOrder"
                type="number"
                min="0"
                value={formData.sortOrder}
                onChange={(e) =>
                  setFormData({ ...formData, sortOrder: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Đang tạo..." : "Tạo slot"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
