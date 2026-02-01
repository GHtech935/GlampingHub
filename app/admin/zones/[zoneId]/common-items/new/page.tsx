'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { ItemFormWizard } from '../../items/_components/ItemFormWizard';

export default function NewCommonItemPage({ params }: { params: Promise<{ zoneId: string }> }) {
  const { zoneId } = use(params);
  const router = useRouter();

  return (
    <ItemFormWizard
      mode="create"
      zoneId={zoneId}
      isTentCategory={false}
      basePath="common-items"
      onSuccess={(itemId) => {
        router.push(`/admin/zones/${zoneId}/common-items`);
      }}
    />
  );
}
