"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ReactNode } from 'react';

interface AboutSectionCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  icon?: ReactNode;
}

/**
 * Wrapper card component for About page sections
 * Provides consistent styling and layout for section forms
 */
export function AboutSectionCard({
  title,
  description,
  children,
  icon
}: AboutSectionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {children}
      </CardContent>
    </Card>
  );
}
