/**
 * Dynamic icon renderer for Lucide React icons
 * Allows rendering icons from string names stored in database
 */

import * as LucideIcons from 'lucide-react';
import { LucideProps } from 'lucide-react';

/**
 * Render a Lucide icon dynamically from its string name
 * @param iconName - The name of the icon (e.g., "Heart", "Shield", "Star")
 * @param props - Lucide icon props (className, size, etc.)
 * @returns React element or null if icon not found
 */
export function renderIcon(iconName: string | undefined | null, props?: LucideProps) {
  if (!iconName) return null;

  const IconComponent = LucideIcons[iconName as keyof typeof LucideIcons];

  // Check if the component exists (Lucide icons are React forwardRef objects, not functions)
  if (!IconComponent) {
    console.warn(`Icon "${iconName}" not found in Lucide library`);
    return null;
  }

  // Check if it's a React component (not a utility function like createLucideIcon)
  if (iconName === 'createLucideIcon') {
    return null;
  }

  // Validate it's a valid React component (has $$typeof symbol for forwardRef)
  if (typeof IconComponent === 'object' && IconComponent !== null && '$$typeof' in IconComponent) {
    const Component = IconComponent as unknown as React.ComponentType<LucideProps>;
    return <Component {...props} />;
  }

  console.warn(`Icon "${iconName}" is not a valid React component`);
  return null;
}

/**
 * Check if an icon name is valid
 */
export function isValidIconName(iconName: string): boolean {
  if (iconName === 'createLucideIcon') return false;
  const icon = LucideIcons[iconName as keyof typeof LucideIcons];
  return icon !== undefined;
}

/**
 * Get all available icon names from Lucide React
 * Filters out non-icon exports (e.g., createLucideIcon, *Icon aliases)
 */
export function getAvailableIcons(): string[] {
  return Object.keys(LucideIcons)
    .filter(key => {
      // Exclude createLucideIcon and *Icon suffix aliases
      if (key === 'createLucideIcon' || key.endsWith('Icon')) {
        return false;
      }
      // Exclude Lucide* prefix aliases
      if (key.startsWith('Lucide')) {
        return false;
      }
      const component = LucideIcons[key as keyof typeof LucideIcons];
      // Only include valid React components (with $$typeof symbol)
      return component !== undefined &&
             typeof component === 'object' &&
             component !== null &&
             '$$typeof' in component;
    })
    .sort();
}
