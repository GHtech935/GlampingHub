// Auto-generated types for Supabase database
// This will be generated automatically by Supabase CLI

import type { BookingStatus, PaymentStatus } from '@/lib/booking-status';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      campsites: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          short_description: string | null
          address: string | null
          city: string | null
          province: string | null
          latitude: number | null
          longitude: number | null
          phone: string | null
          email: string | null
          check_in_time: string
          check_out_time: string
          min_stay_nights: number
          cancellation_policy: string | null
          house_rules: string | null
          average_rating: number
          review_count: number
          is_active: boolean
          is_featured: boolean
          deposit_type: 'percentage' | 'fixed_amount'
          deposit_value: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          short_description?: string | null
          address?: string | null
          city?: string | null
          province?: string | null
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          email?: string | null
          check_in_time?: string
          check_out_time?: string
          min_stay_nights?: number
          cancellation_policy?: string | null
          house_rules?: string | null
          average_rating?: number
          review_count?: number
          is_active?: boolean
          is_featured?: boolean
          deposit_type?: 'percentage' | 'fixed_amount'
          deposit_value?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          short_description?: string | null
          address?: string | null
          city?: string | null
          province?: string | null
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          email?: string | null
          check_in_time?: string
          check_out_time?: string
          min_stay_nights?: number
          cancellation_policy?: string | null
          house_rules?: string | null
          average_rating?: number
          review_count?: number
          is_active?: boolean
          is_featured?: boolean
          deposit_type?: 'percentage' | 'fixed_amount'
          deposit_value?: number
          created_at?: string
          updated_at?: string
        }
      }
      pitches: {
        Row: {
          id: string
          campsite_id: string
          name: string
          slug: string
          description: string | null
          max_guests: number
          max_vehicles: number
          max_dogs: number
          pitch_size_width: number | null
          pitch_size_depth: number | null
          ground_type: string | null
          base_price: number
          weekend_price: number | null
          holiday_price: number | null
          status: string
          is_active: boolean
          is_featured: boolean
          sort_order: number
          deposit_type: 'percentage' | 'fixed_amount' | null
          deposit_value: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campsite_id: string
          name: string
          slug: string
          description?: string | null
          max_guests: number
          max_vehicles?: number
          max_dogs?: number
          pitch_size_width?: number | null
          pitch_size_depth?: number | null
          ground_type?: string | null
          base_price: number
          weekend_price?: number | null
          holiday_price?: number | null
          status?: string
          is_active?: boolean
          is_featured?: boolean
          sort_order?: number
          deposit_type?: 'percentage' | 'fixed_amount' | null
          deposit_value?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campsite_id?: string
          name?: string
          slug?: string
          description?: string | null
          max_guests?: number
          max_vehicles?: number
          max_dogs?: number
          pitch_size_width?: number | null
          pitch_size_depth?: number | null
          ground_type?: string | null
          base_price?: number
          weekend_price?: number | null
          holiday_price?: number | null
          status?: string
          is_active?: boolean
          is_featured?: boolean
          sort_order?: number
          deposit_type?: 'percentage' | 'fixed_amount' | null
          deposit_value?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          booking_reference: string
          user_id: string | null
          campsite_id: string
          pitch_id: string
          guest_email: string | null
          guest_first_name: string | null
          guest_last_name: string | null
          guest_phone: string | null
          guest_country: string | null
          guest_address: string | null
          check_in_date: string
          check_out_date: string
          nights: number
          adults: number
          children: number
          infants: number
          vehicles: number
          dogs: number
          type_of_visit: string | null
          vehicle_registration: string | null
          special_requirements: string | null
          accommodation_cost: number
          products_cost: number
          products_tax: number
          subtotal: number
          discount_amount: number
          tax_amount: number
          total_amount: number
          deposit_percentage: number
          deposit_amount: number
          balance_amount: number
          deposit_type: 'percentage' | 'fixed_amount' | null
          deposit_value: number | null
          discount_code: string | null
          discount_id: string | null
          status: BookingStatus
          payment_status: PaymentStatus
          internal_notes: string | null
          created_at: string
          updated_at: string
          confirmed_at: string | null
          checked_in_at: string | null
          checked_out_at: string | null
          cancelled_at: string | null
        }
        Insert: {
          id?: string
          booking_reference: string
          user_id?: string | null
          campsite_id: string
          pitch_id: string
          guest_email?: string | null
          guest_first_name?: string | null
          guest_last_name?: string | null
          guest_phone?: string | null
          guest_country?: string | null
          guest_address?: string | null
          check_in_date: string
          check_out_date: string
          adults?: number
          children?: number
          infants?: number
          vehicles?: number
          dogs?: number
          type_of_visit?: string | null
          vehicle_registration?: string | null
          special_requirements?: string | null
          accommodation_cost: number
          products_cost?: number
          products_tax?: number
          discount_amount?: number
          discount_code?: string | null
          discount_id?: string | null
          status?: BookingStatus
          payment_status?: PaymentStatus
          internal_notes?: string | null
          created_at?: string
          updated_at?: string
          confirmed_at?: string | null
          checked_in_at?: string | null
          checked_out_at?: string | null
          cancelled_at?: string | null
          deposit_percentage?: number
          deposit_type?: 'percentage' | 'fixed_amount' | null
          deposit_value?: number | null
        }
        Update: {
          id?: string
          booking_reference?: string
          user_id?: string | null
          campsite_id?: string
          pitch_id?: string
          guest_email?: string | null
          guest_first_name?: string | null
          guest_last_name?: string | null
          guest_phone?: string | null
          guest_country?: string | null
          guest_address?: string | null
          check_in_date?: string
          check_out_date?: string
          adults?: number
          children?: number
          infants?: number
          vehicles?: number
          dogs?: number
          type_of_visit?: string | null
          vehicle_registration?: string | null
          special_requirements?: string | null
          accommodation_cost?: number
          products_cost?: number
          products_tax?: number
          discount_amount?: number
          discount_code?: string | null
          discount_id?: string | null
          status?: BookingStatus
          payment_status?: PaymentStatus
          internal_notes?: string | null
          created_at?: string
          updated_at?: string
          confirmed_at?: string | null
          checked_in_at?: string | null
          checked_out_at?: string | null
          cancelled_at?: string | null
          deposit_percentage?: number
          deposit_type?: 'percentage' | 'fixed_amount' | null
          deposit_value?: number | null
        }
      }
      // Add other table types as needed...
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
