import { useState, useEffect } from 'react';

export interface AddonParameter {
  id: string;
  name: any; // MultilingualText | string
  color_code: string;
  min_quantity: number;
  max_quantity: number;
}

export interface ItemAddon {
  addon_item_id: string;
  name: any; // MultilingualText | string
  sku: string;
  price_percentage: number;
  is_required: boolean;
  dates_setting: string; // 'inherit_parent' | 'custom' | 'none'
  custom_start_date: string | null;
  custom_end_date: string | null;
  display_order: number;
  parameters: AddonParameter[];
  // Product Grouping fields
  is_product_group_parent?: boolean;
  product_group_children?: Array<{
    child_item_id: string;
    name: any;
    sku: string;
    base_price: number;
    parameters: AddonParameter[];
  }>;
  product_group_settings?: {
    show_child_prices_in_dropdown: boolean;
    show_unavailable_children: boolean;
    show_starting_price: boolean;
    display_price: number;
  };
}

interface UseItemAddonsReturn {
  addons: ItemAddon[];
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for fetching add-on items (common items) for a glamping item
 * @param itemId - The parent glamping item ID
 * @returns Addons data, loading state, and error
 */
export function useItemAddons(itemId: string | null): UseItemAddonsReturn {
  const [addons, setAddons] = useState<ItemAddon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!itemId) {
      setAddons([]);
      return;
    }

    const fetchAddons = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/glamping/items/${itemId}`);
        const data = await response.json();

        if (response.ok && data.item?.addons) {
          setAddons(data.item.addons);
        } else {
          setAddons([]);
        }
      } catch (err) {
        console.error('Error fetching item addons:', err);
        setError(err as Error);
        setAddons([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAddons();
  }, [itemId]);

  return { addons, loading, error };
}
