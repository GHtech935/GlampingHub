import { notFound } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { ItemDetailContent } from './_components/ItemDetailContent';

export const dynamic = 'force-dynamic';

async function getItemDetails(itemId: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/glamping/items/${itemId}/details`,
      {
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch item details:', error);
    return null;
  }
}

export default async function GlampingItemDetailPage({
  params,
}: {
  params: Promise<{ zoneId: string; id: string }>;
}) {
  const { zoneId, id: itemId } = await params;
  const locale = (await getLocale()) as 'vi' | 'en';

  const itemDetails = await getItemDetails(itemId);

  if (!itemDetails) {
    notFound();
  }

  return (
    <ItemDetailContent
      item={itemDetails.item}
      parameters={itemDetails.parameters}
      tags={itemDetails.tags}
      images={itemDetails.images}
      media={itemDetails.media}
      zoneId={zoneId}
      locale={locale}
    />
  );
}
