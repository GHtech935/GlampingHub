"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const PRESET_COLORS = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Gray', value: '#6b7280' },
];

export default function EditParameterPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    color_code: "#3b82f6",
    controls_inventory: false,
    sets_pricing: true,
    price_range: false,
    visibility: "everyone",
  });

  useEffect(() => {
    fetchParameter();
  }, [params.id]);

  const fetchParameter = async () => {
    try {
      const response = await fetch(`/api/admin/glamping/parameters/${params.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch parameter');
      }

      setFormData({
        name: data.parameter.name,
        color_code: data.parameter.color_code || "#3b82f6",
        controls_inventory: data.parameter.controls_inventory,
        sets_pricing: data.parameter.sets_pricing,
        price_range: data.parameter.price_range,
        visibility: data.parameter.visibility,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      router.push('/admin/parameters');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast({
        title: "Error",
        description: "Parameter name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/admin/glamping/parameters/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update parameter');
      }

      toast({
        title: "Success",
        description: "Parameter updated successfully",
      });

      router.push('/admin/parameters');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

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
        <h1 className="text-2xl font-bold text-gray-900">Edit Parameter</h1>
        <p className="text-gray-600 mt-1">Update parameter details</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Parameter Details</CardTitle>
            <CardDescription>
              Update the details for this parameter
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">
                Parameter Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Adults, Children, Pets"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <p className="text-sm text-gray-500">
                This name will be used for pricing and inventory calculations
              </p>
            </div>

            <div className="space-y-2">
              <Label>Color Code</Label>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color_code: color.value })}
                    className={`flex items-center gap-2 p-2 rounded border transition-colors ${
                      formData.color_code === color.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: color.value }}
                    />
                    <span className="text-sm">{color.name}</span>
                  </button>
                ))}
              </div>
              <Input
                type="text"
                placeholder="#3b82f6"
                value={formData.color_code}
                onChange={(e) => setFormData({ ...formData, color_code: e.target.value })}
                className="mt-2"
              />
              <p className="text-sm text-gray-500">
                Choose a preset color or enter a custom hex code
              </p>
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="controls_inventory"
                  checked={formData.controls_inventory}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, controls_inventory: checked as boolean })
                  }
                />
                <div className="flex flex-col">
                  <Label htmlFor="controls_inventory" className="cursor-pointer">
                    Controls Inventory
                  </Label>
                  <p className="text-sm text-gray-500">
                    This parameter affects available inventory quantity
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="sets_pricing"
                  checked={formData.sets_pricing}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, sets_pricing: checked as boolean })
                  }
                />
                <div className="flex flex-col">
                  <Label htmlFor="sets_pricing" className="cursor-pointer">
                    Sets Pricing
                  </Label>
                  <p className="text-sm text-gray-500">
                    This parameter is used to set different price points
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="price_range"
                  checked={formData.price_range}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, price_range: checked as boolean })
                  }
                />
                <div className="flex flex-col">
                  <Label htmlFor="price_range" className="cursor-pointer">
                    Price Range
                  </Label>
                  <p className="text-sm text-gray-500">
                    Enable pricing based on quantity ranges
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="visibility">Visibility</Label>
              <Select
                value={formData.visibility}
                onValueChange={(value) => setFormData({ ...formData, visibility: value })}
              >
                <SelectTrigger id="visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">Everyone</SelectItem>
                  <SelectItem value="staff">Staff Only</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                Staff-only parameters are hidden from customers
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-6">
          <Button type="submit" disabled={loading || !formData.name}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/parameters')}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
