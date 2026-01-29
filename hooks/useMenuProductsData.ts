import { useState, useEffect } from 'react';
import type { MenuProduct } from '@/components/glamping-booking/GlampingMenuProductsSelector';

interface UseMenuProductsDataReturn {
  menuProducts: MenuProduct[];
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for fetching menu products for a glamping item
 * @param itemId - The glamping item ID
 * @returns Menu products data, loading state, and error
 */
export function useMenuProductsData(itemId: string | null): UseMenuProductsDataReturn {
  const [menuProducts, setMenuProducts] = useState<MenuProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!itemId) {
      setMenuProducts([]);
      return;
    }

    const fetchMenuProducts = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/glamping/items/${itemId}`);
        const data = await response.json();

        if (response.ok && data.item?.menu_products) {
          setMenuProducts(data.item.menu_products);
        } else {
          setMenuProducts([]);
        }
      } catch (err) {
        console.error('Error fetching menu products:', err);
        setError(err as Error);
        setMenuProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuProducts();
  }, [itemId]);

  return { menuProducts, loading, error };
}
