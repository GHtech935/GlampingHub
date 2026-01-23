"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Edit, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface ItemDetail {
  id: string;
  name: string;
  sku: string;
  category_id: string;
  category_name: string;
  summary: string;
  inventory_quantity: number;
  unlimited_inventory: boolean;
  allocation_type: string;
  visibility: string;
  default_calendar_status: string;
  created_at: string;
  updated_at: string;
  tags: Array<{ id: string; name: string }>;
  parameters: Array<{
    id: string;
    name: string;
    color_code: string;
    min_quantity: number;
    max_quantity: number;
  }>;
  media: Array<{
    id: string;
    type: string;
    url: string;
    caption: string;
  }>;
}

export default function ViewItemPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchItem();
    }
  }, [params.id]);

  const fetchItem = async () => {
    try {
      const response = await fetch(`/api/admin/glamping/items/${params.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch item');
      }

      setItem(data.item);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      router.push('/admin/items');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/glamping/items/${params.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      toast({
        title: "Success",
        description: "Item deleted successfully",
      });

      router.push('/admin/items');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!item) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{item.name}</h1>
            <p className="text-gray-600 mt-1">SKU: {item.sku || 'N/A'}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/items/${item.id}/edit`)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="outline"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-base text-gray-900">{item.name}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">SKU</label>
                <p className="text-base text-gray-900">{item.sku || 'N/A'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Category</label>
                <p className="text-base text-gray-900">{item.category_name || 'None'}</p>
              </div>

              {item.tags.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Tags</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {item.tags.map((tag) => (
                      <Badge key={tag.id} variant="outline">{tag.name}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {item.summary && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Summary</label>
                  <p className="text-base text-gray-900 whitespace-pre-wrap">{item.summary}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Inventory & Attributes */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory & Attributes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Inventory</label>
                <p className="text-base text-gray-900">
                  {item.unlimited_inventory ? (
                    <Badge>Unlimited</Badge>
                  ) : (
                    `${item.inventory_quantity} units`
                  )}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Allocation Type</label>
                <p className="text-base text-gray-900 capitalize">
                  {item.allocation_type.replace('_', ' ')}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Visibility</label>
                <Badge variant={item.visibility === 'everyone' ? 'default' : 'secondary'}>
                  {item.visibility}
                </Badge>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Default Calendar Status</label>
                <Badge variant={item.default_calendar_status === 'available' ? 'default' : 'secondary'}>
                  {item.default_calendar_status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Parameters */}
          {item.parameters.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Parameters</CardTitle>
                <CardDescription>Pricing and inventory parameters</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Color</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Min/Max</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.parameters.map((param) => (
                        <tr key={param.id} className="border-b last:border-0">
                          <td className="px-4 py-3">{param.name}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded border"
                                style={{ backgroundColor: param.color_code }}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {param.min_quantity} - {param.max_quantity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Media */}
          {item.media.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Media</CardTitle>
                <CardDescription>Images and videos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {item.media.map((media) => (
                    <div key={media.id} className="border rounded-lg p-2">
                      <Badge variant="outline" className="mb-2">{media.type}</Badge>
                      <p className="text-sm text-gray-600 truncate">{media.url}</p>
                      {media.caption && (
                        <p className="text-xs text-gray-500 mt-1">{media.caption}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-sm text-gray-900">
                  {new Date(item.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-sm text-gray-900">
                  {new Date(item.updated_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Tags</label>
                <p className="text-sm text-gray-900">{item.tags.length}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Parameters</label>
                <p className="text-sm text-gray-900">{item.parameters.length}</p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push(`/admin/items/${item.id}/edit`)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Item
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                disabled
              >
                <Copy className="w-4 h-4 mr-2" />
                Duplicate Item
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-red-600 hover:text-red-700"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Item
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
