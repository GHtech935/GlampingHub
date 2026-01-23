/**
 * TypeScript interfaces for About page CMS content
 */

import { MultilingualText } from '@/lib/i18n-utils';
import { AboutColorName } from '@/lib/about-colors';

// ============================================================================
// Shared Types
// ============================================================================

export interface Badge {
  text: MultilingualText;
  icon: string; // Lucide icon name
}

export interface ImageData {
  url: string;
  public_id: string;
}

// ============================================================================
// Hero Section
// ============================================================================

export interface HeroSection {
  badge: Badge;
  heading: MultilingualText;
  description: MultilingualText;
}

// ============================================================================
// Why Choose Us Section
// ============================================================================

export interface WhyChooseUsCard {
  id: string; // UUID
  title: MultilingualText;
  description: MultilingualText;
  icon: string; // Lucide icon name
  color: AboutColorName;
}

export interface WhyChooseUsSection {
  heading: MultilingualText;
  description: MultilingualText;
  cards: WhyChooseUsCard[];
}

// ============================================================================
// Story Section
// ============================================================================

export interface StoryTimelineItem {
  id: string; // UUID
  type: 'year' | 'icon';
  displayValue: string; // Year text (e.g., "2024") or icon name (e.g., "Users")
  title: MultilingualText;
  description: MultilingualText;
  color: AboutColorName;
}

export interface StorySection {
  heading: MultilingualText;
  timeline: StoryTimelineItem[];
}

// ============================================================================
// Core Values Section
// ============================================================================

export interface CoreValue {
  id: string; // UUID
  title: MultilingualText;
  description: MultilingualText;
  icon: string; // Lucide icon name
  color: AboutColorName;
}

export interface CoreValuesSection {
  heading: MultilingualText;
  values: CoreValue[];
}

// ============================================================================
// Culinary Section
// ============================================================================

export interface FoodItemBadge {
  icon: string; // Lucide icon name
  text: MultilingualText;
}

export interface FoodItem {
  id: string; // UUID
  title: MultilingualText;
  image: ImageData;
  badge: FoodItemBadge;
}

export interface CulinaryFeature {
  id: string; // UUID
  title: MultilingualText;
  description: MultilingualText;
}

export interface CulinarySection {
  badge: Badge;
  heading: MultilingualText;
  description: MultilingualText;
  foodItems: FoodItem[];
  features: CulinaryFeature[];
}

// ============================================================================
// Testimonials Section
// ============================================================================

export interface Testimonial {
  id: string; // UUID
  customerName: MultilingualText;
  location: MultilingualText;
  quote: MultilingualText;
  initials: string; // 2 characters (e.g., "NA")
  color: AboutColorName;
}

export interface TestimonialsSection {
  heading: MultilingualText;
  description: MultilingualText;
  items: Testimonial[];
}

// ============================================================================
// CTA Section
// ============================================================================

export interface CTASection {
  badge: Badge;
  heading: MultilingualText;
  description: MultilingualText;
  primaryButton: MultilingualText;
  secondaryButton: MultilingualText;
  // Note: Button links (/search, /register) are hardcoded in frontend
}

// ============================================================================
// Complete About Page Content
// ============================================================================

export interface AboutPageContent {
  hero: HeroSection;
  whyChooseUs: WhyChooseUsSection;
  story: StorySection;
  coreValues: CoreValuesSection;
  culinary: CulinarySection;
  testimonials: TestimonialsSection;
  cta: CTASection;
}

// ============================================================================
// Helper Types for Forms
// ============================================================================

/**
 * Generic type for items that can be reordered
 */
export interface Reorderable {
  id: string;
}

/**
 * Generic type for items with colors
 */
export interface Colorable {
  color: AboutColorName;
}

/**
 * Generic type for items with icons
 */
export interface Iconable {
  icon: string;
}
