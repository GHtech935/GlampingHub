'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ItemFormWizard } from '../../_components/ItemFormWizard';

export default function EditItemPage({
  params
}: {
  params: Promise<{ zoneId: string; id: string }>
}) {
  const { zoneId, id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [itemData, setItemData] = useState<any>(null);

  const fetchItem = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/glamping/items/${id}`);
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
        // Transform YouTube URL and start time
        youtube_url: data.item.youtube_url || data.item.media?.find((m: any) => m.type === 'youtube')?.url || '',
        video_start_time: data.item.video_start_time || data.item.media?.find((m: any) => m.type === 'youtube')?.video_start_time || 0,
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
      router.push(`/admin/zones/${zoneId}/items`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchItem();
    }
  }, [id]);

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
      key={itemData?.updated_at || Date.now()} // Force re-mount when data changes to refresh pricing table
      mode="edit"
      zoneId={zoneId}
      itemId={id}
      initialData={itemData}
      onSuccess={async (itemId) => {
        // Stay on current page after save - no redirect
        // Refetch data to show updated values
        await fetchItem();
      }}
    />
  );
}
