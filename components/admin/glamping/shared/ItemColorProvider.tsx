'use client';

import React, { createContext, useContext, useMemo } from 'react';

export interface ColorScheme {
  bg: string;
  border: string;
  text: string;
  dot: string;
}

const ITEM_COLORS: ColorScheme[] = [
  { bg: 'bg-blue-50', border: 'border-l-blue-500', text: 'text-blue-700', dot: 'bg-blue-500' },
  { bg: 'bg-emerald-50', border: 'border-l-emerald-500', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  { bg: 'bg-amber-50', border: 'border-l-amber-500', text: 'text-amber-700', dot: 'bg-amber-500' },
  { bg: 'bg-purple-50', border: 'border-l-purple-500', text: 'text-purple-700', dot: 'bg-purple-500' },
  { bg: 'bg-rose-50', border: 'border-l-rose-500', text: 'text-rose-700', dot: 'bg-rose-500' },
];

interface ItemColorContextValue {
  getColorForItem: (itemIndex: number) => ColorScheme;
  getColorForItemId: (itemId: string) => ColorScheme;
  itemIdToIndex: Map<string, number>;
}

const ItemColorContext = createContext<ItemColorContextValue | undefined>(undefined);

interface ItemColorProviderProps {
  children: React.ReactNode;
  itemIds: string[];
}

export function ItemColorProvider({ children, itemIds }: ItemColorProviderProps) {
  const contextValue = useMemo(() => {
    const itemIdToIndex = new Map<string, number>();
    itemIds.forEach((id, index) => {
      itemIdToIndex.set(id, index);
    });

    return {
      getColorForItem: (itemIndex: number): ColorScheme => {
        return ITEM_COLORS[itemIndex % ITEM_COLORS.length];
      },
      getColorForItemId: (itemId: string): ColorScheme => {
        const index = itemIdToIndex.get(itemId) ?? 0;
        return ITEM_COLORS[index % ITEM_COLORS.length];
      },
      itemIdToIndex,
    };
  }, [itemIds]);

  return (
    <ItemColorContext.Provider value={contextValue}>
      {children}
    </ItemColorContext.Provider>
  );
}

export function useItemColor() {
  const context = useContext(ItemColorContext);
  if (!context) {
    throw new Error('useItemColor must be used within ItemColorProvider');
  }
  return context;
}

export { ITEM_COLORS };
