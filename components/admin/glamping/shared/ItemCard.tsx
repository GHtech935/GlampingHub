'use client';

import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { ColorScheme } from './ItemColorProvider';
import { Card } from '@/components/ui/card';

interface ItemCardProps {
  itemIndex: number;
  colorScheme: ColorScheme;
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  showBorder?: boolean;
}

export function ItemCard({
  itemIndex,
  colorScheme,
  children,
  className,
  padding = 'md',
  showBorder = true,
}: ItemCardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <Card
      className={cn(
        'relative overflow-hidden',
        showBorder && colorScheme.bg,
        showBorder && colorScheme.border,
        showBorder && 'border-l-4',
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </Card>
  );
}
