/**
 * Color palette for About page CMS
 * Predefined Tailwind colors to maintain design consistency
 */

export type AboutColorName =
  | 'emerald'
  | 'blue'
  | 'purple'
  | 'amber'
  | 'green'
  | 'red'
  | 'pink'
  | 'orange';

export interface AboutColorConfig {
  bg: string;
  bgGradient: string;
  border: string;
  text: string;
  icon: string;
  bubble: string;
  preview: string; // hex color for preview circle
}

export const ABOUT_COLOR_PALETTE: Record<AboutColorName, AboutColorConfig> = {
  emerald: {
    bg: 'bg-emerald-100',
    bgGradient: 'from-emerald-50',
    border: 'border-emerald-100',
    text: 'text-emerald-600',
    icon: 'text-emerald-600',
    bubble: 'bg-emerald-100',
    preview: '#10b981'
  },
  blue: {
    bg: 'bg-blue-100',
    bgGradient: 'from-blue-50',
    border: 'border-blue-100',
    text: 'text-blue-600',
    icon: 'text-blue-600',
    bubble: 'bg-blue-100',
    preview: '#3b82f6'
  },
  purple: {
    bg: 'bg-purple-100',
    bgGradient: 'from-purple-50',
    border: 'border-purple-100',
    text: 'text-purple-600',
    icon: 'text-purple-600',
    bubble: 'bg-purple-100',
    preview: '#a855f7'
  },
  amber: {
    bg: 'bg-amber-100',
    bgGradient: 'from-amber-50',
    border: 'border-amber-100',
    text: 'text-amber-600',
    icon: 'text-amber-600',
    bubble: 'bg-amber-100',
    preview: '#f59e0b'
  },
  green: {
    bg: 'bg-green-100',
    bgGradient: 'from-green-50',
    border: 'border-green-100',
    text: 'text-green-600',
    icon: 'text-green-600',
    bubble: 'bg-green-100',
    preview: '#22c55e'
  },
  red: {
    bg: 'bg-red-100',
    bgGradient: 'from-red-50',
    border: 'border-red-100',
    text: 'text-red-600',
    icon: 'text-red-600',
    bubble: 'bg-red-100',
    preview: '#ef4444'
  },
  pink: {
    bg: 'bg-pink-100',
    bgGradient: 'from-pink-50',
    border: 'border-pink-100',
    text: 'text-pink-600',
    icon: 'text-pink-600',
    bubble: 'bg-pink-100',
    preview: '#ec4899'
  },
  orange: {
    bg: 'bg-orange-100',
    bgGradient: 'from-orange-50',
    border: 'border-orange-100',
    text: 'text-orange-600',
    icon: 'text-orange-600',
    bubble: 'bg-orange-100',
    preview: '#f97316'
  }
};

/**
 * Get Tailwind color classes for a given color name
 * Returns emerald as default fallback for invalid colors
 */
export function getColorClasses(color: string): AboutColorConfig {
  return ABOUT_COLOR_PALETTE[color as AboutColorName] || ABOUT_COLOR_PALETTE.emerald;
}

/**
 * Get all available color names
 */
export function getAvailableColors(): AboutColorName[] {
  return Object.keys(ABOUT_COLOR_PALETTE) as AboutColorName[];
}
