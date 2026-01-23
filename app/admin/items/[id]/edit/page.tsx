'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ItemFormWizard } from '../../_components/ItemFormWizard';

export default function EditItemPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [itemData, setItemData] = useState(null);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const response = await fetch(`/api/admin/glamping/items/${params.id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch item');
        }

        // Transform API response to match form structure
        setItemData({
          ...data.item,
          // Pass full tag objects instead of just IDs (to eliminate timing issues)
          tags: data.item.tags || [],
          // Transform media array to images format
          images: data.item.media
            ?.filter((m: any) => m.type === 'image')
            .map((m: any) => ({
              url: m.url,
              preview: m.url,
              caption: m.caption || ''
            })) || [],
          // Transform YouTube URL
          youtube_url: data.item.media?.find((m: any) => m.type === 'youtube')?.url || '',
          // Transform parameters to expected format
          parameters: data.item.parameters?.map((p: any) => ({
            id: p.id,
            name: p.name,
            color_code: p.color_code,
            inventory: 'Controlled',
            visibility: 'Everyone',
            min_max: {
              min: p.min_quantity || 0,
              max: p.max_quantity || 0
            }
          })) || [],
        });
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

    if (params.id) {
      fetchItem();
    }
  }, [params.id, toast, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!itemData) {
    return null;
  }

  return (
    <ItemFormWizard
      mode="edit"
      itemId={params.id as string}
      initialData={itemData}
      onSuccess={(itemId) => {
        router.push(`/admin/items/${itemId}`);
      }}
    />
  );
}
