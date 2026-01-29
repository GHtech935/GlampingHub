'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { ColorScheme } from './ItemColorProvider';

interface ItemBadgeProps {
  itemIndex: number;
  colorScheme: ColorScheme;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  label?: string;
}

export function ItemBadge({
  itemIndex,
  colorScheme,
  size = 'md',
  showDot = true,
  label
}: ItemBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  const dotSizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        colorScheme.bg,
        colorScheme.text,
        sizeClasses[size]
      )}
    >
      {showDot && (
        <span className={cn('rounded-full', colorScheme.dot, dotSizeClasses[size])} />
      )}
      <span>{label || `ITEM ${itemIndex + 1}`}</span>
    </span>
  );
}
