import { useState, useEffect } from 'react';

export interface GlampingParameter {
  id: string;
  parameter_id: string;
  name: any; // MultilingualText | string
  color_code: string;
  controls_inventory: boolean;
  sets_pricing: boolean;
  counted_for_menu?: boolean; // For menu validation
  min_quantity?: number;
  max_quantity?: number;
}

interface UseGlampingParametersReturn {
  parameters: GlampingParameter[];
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for fetching parameters for a glamping item
 * @param itemId - The glamping item ID
 * @returns Parameters data, loading state, and error
 */
export function useGlampingParameters(itemId: string | null): UseGlampingParametersReturn {
  const [parameters, setParameters] = useState<GlampingParameter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!itemId) {
      setParameters([]);
      return;
    }

    const fetchParameters = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/glamping/items/${itemId}/details`);
        const data = await response.json();

        if (response.ok && data.parameters) {
          setParameters(data.parameters);
        } else {
          setParameters([]);
        }
      } catch (err) {
        console.error('Error fetching parameters:', err);
        setError(err as Error);
        setParameters([]);
      } finally {
        setLoading(false);
      }
    };

    fetchParameters();
  }, [itemId]);

  return { parameters, loading, error };
}
