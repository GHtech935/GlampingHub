'use client';

import { useRouter } from 'next/navigation';
import { ItemFormWizard } from '../_components/ItemFormWizard';

export default function NewItemPage() {
  const router = useRouter();

  return (
    <ItemFormWizard
      mode="create"
      onSuccess={(itemId) => {
        router.push('/admin/items');
      }}
    />
  );
}
