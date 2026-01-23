// Core Types based on Database Schema

import type { BookingStatus, PaymentStatus } from '@/lib/booking-status';

export type { BookingStatus, PaymentStatus } from '@/lib/booking-status';
export type DepositType = 'percentage' | 'fixed_amount';

// Multilingual text type for JSONB fields
export interface MultilingualText {
  vi: string;
  en: string;
}

export interface Campsite {
  id: string;
  name: MultilingualText;
  slug: string;
  description?: MultilingualText;
  short_description?: MultilingualText;
  address?: string;
  city?: string;
  province?: string;
  latitude: number;
  longitude: number;
  phone?: string;
  email?: string;
  website?: string;
  check_in_time: string;
  check_out_time: string;
  min_stay_nights: number;
  cancellation_policy?: MultilingualText;
  house_rules?: MultilingualText;
  average_rating: number;
  review_count: number;
  is_active: boolean;
  is_featured: boolean;
  deposit_type: DepositType;
  deposit_value: number;
  created_at: string;
  updated_at: string;
}

// Geocoding response type
export interface LocationData {
  address: string;
  city: string;
  province: string;
  latitude: number;
  longitude: number;
}

export interface Pitch {
  id: string;
  campsite_id: string;
  name: string;
  slug: string;
  description?: string;
  max_guests: number;
  max_vehicles: number;
  max_dogs: number;
  pitch_size_width?: number;
  pitch_size_depth?: number;
  ground_type?: string;
  base_price: number;
  weekend_price?: number;
  holiday_price?: number;
  status: string;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  deposit_type?: DepositType | null;
  deposit_value?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  booking_reference: string;
  user_id?: string;
  campsite_id: string;
  pitch_id: string;
  guest_email?: string;
  guest_first_name?: string;
  guest_last_name?: string;
  guest_phone?: string;
  guest_country?: string;
  guest_address?: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  adults: number;
  children: number;
  infants: number;
  vehicles: number;
  dogs: number;
  type_of_visit?: string;
  vehicle_registration?: string;
  special_requirements?: string;
  accommodation_cost: number;
  products_cost: number;
  products_tax: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  deposit_percentage: number;
  deposit_amount: number;
  balance_amount: number;
  deposit_type?: DepositType | null;
  deposit_value?: number | null;
  discount_code?: string;
  discount_id?: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  internal_notes?: string;
  created_at: string;
  updated_at: string;
  confirmed_at?: string;
  checked_in_at?: string;
  checked_out_at?: string;
  cancelled_at?: string;
}

export interface Filter {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  is_popular: boolean;
  sort_order: number;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  country: string;
  address_line1?: string;
  city?: string;
  postal_code?: string;
  marketing_consent: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Admin {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: string;
  campsite_id?: string;
  permissions: Record<string, any>;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
}

// UI State Types
export interface SearchParams {
  location?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  adults?: number;
  children?: number;
  infants?: number;
}

export interface FilterState {
  accommodationTypes: string[];
  amenities: string[];
  priceRange: [number, number];
  guestRating?: number;
  rules: string[];
  nearby: string[];
  accessibility: string[];
}

// Campsite Features System Types
export interface CampsiteFeatureCategory {
  id: string;
  name: MultilingualText;
  slug: string;
  icon?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CampsiteFeatureTemplate {
  id: string;
  category_id: string;
  name: MultilingualText;
  description?: MultilingualText;
  icon?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Populated from JOIN
  category_name?: MultilingualText;
  category_slug?: string;
}

export interface CampsiteFeature {
  id: string;
  campsite_id: string;
  feature_template_id?: string; // null if custom feature
  custom_name?: MultilingualText; // only for custom features
  custom_category_id?: string; // only for custom features
  is_available: boolean; // true = check icon, false = cancel icon
  sort_order: number;
  created_at: string;
  // Populated from JOIN
  name?: MultilingualText; // from template or custom
  description?: MultilingualText;
  icon?: string;
  category_id?: string;
  category_name?: MultilingualText;
  category_slug?: string;
  is_custom?: boolean; // helper flag
  // API response camelCase variants (API transforms snake_case to camelCase)
  campsiteId?: string;
  featureTemplateId?: string;
  customName?: MultilingualText;
  customCategoryId?: string;
  isAvailable?: boolean;
  sortOrder?: number;
  createdAt?: string;
  categoryId?: string;
  categoryName?: MultilingualText;
  categorySlug?: string;
  isCustom?: boolean;
}

// Grouped categories with templates (for UI display)
export interface CampsiteFeaturesGrouped {
  category: CampsiteFeatureCategory;
  templates: CampsiteFeatureTemplate[];
}

// Feature selection state for forms
export interface CampsiteFeatureSelection {
  templateId?: string; // for template-based features
  customName?: MultilingualText; // for custom features
  customCategoryId?: string; // for custom features
  isAvailable: boolean; // whether feature is available at this campsite
}
