'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { ItemFormWizard } from '../_components/ItemFormWizard';

export default function NewItemPage({ params }: { params: Promise<{ zoneId: string }> }) {
  const { zoneId } = use(params);
  const router = useRouter();

  return (
    <ItemFormWizard
      mode="create"
      zoneId={zoneId}
      onSuccess={(itemId) => {
        router.push(`/admin/zones/${zoneId}/items`);
      }}
    />
  );
}
