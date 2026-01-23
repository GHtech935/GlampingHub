-- Migration: Enable RLS on all public tables
-- This enables Row Level Security to satisfy Supabase security requirements
-- while allowing full access through service role (used by our backend)

-- Enable RLS on all tables
ALTER TABLE IF EXISTS public.pitch_type_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pricing_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.discount_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.booking_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.discount_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.availability_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.filter_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.campsite_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.search_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pitch_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pitch_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pitch_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pitch_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.campsite_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.restriction_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pitch_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feature_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pitch_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.campsite_feature_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.campsite_feature_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.campsite_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pitch_ground_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ground_type_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.booking_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pricing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pitches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.permission_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.campsite_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.campsites ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tax_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.booking_nightly_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.booking_nightly_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sepay_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.booking_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cron_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cron_job_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customer_wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies to allow full access for service role and postgres role
-- These policies allow our backend (which uses direct connection) to work normally

-- Helper function to create bypass policies for a table
DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'pitch_type_prices', 'pricing_calendar', 'discounts', 'discount_categories',
        'bookings', 'booking_status_history', 'discount_usage', 'availability_calendar',
        'filter_categories', 'filters', 'campsite_filters', 'payments', 'reviews',
        'media', 'search_queries', 'users', 'customers', 'pitch_types', 'extras',
        'pitch_restrictions', 'pitch_extras', 'pitch_products', 'campsite_images',
        'restriction_templates', 'pitch_features', 'feature_templates', 'pitch_images',
        'campsite_feature_categories', 'campsite_feature_templates', 'campsite_features',
        'pitch_ground_types', 'ground_type_templates', 'booking_sequences',
        'product_categories', 'pricing_history', 'pitches', 'activity_logs',
        'login_history', 'permission_presets', 'email_automation_rules', 'email_logs',
        'email_queue', 'campsite_products', 'campsites', 'tax_history',
        'booking_nightly_pricing', 'booking_nightly_discounts', 'sepay_transactions',
        'booking_products', 'admin_settings', 'cron_jobs', 'cron_job_logs',
        'customer_wishlists', 'notifications'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        -- Check if table exists before creating policy
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            -- Drop existing policies if any
            EXECUTE format('DROP POLICY IF EXISTS "Allow full access for service role" ON public.%I', tbl);
            EXECUTE format('DROP POLICY IF EXISTS "Allow read access for anon" ON public.%I', tbl);

            -- Create policy for service role (full access)
            EXECUTE format('CREATE POLICY "Allow full access for service role" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', tbl);

            -- Create read-only policy for public data (campsites, pitches, reviews, etc.)
            IF tbl IN ('campsites', 'pitches', 'campsite_images', 'pitch_images', 'reviews',
                       'filters', 'filter_categories', 'campsite_filters', 'pitch_types',
                       'extras', 'pitch_extras', 'campsite_features', 'campsite_feature_categories',
                       'campsite_feature_templates', 'feature_templates', 'pitch_features',
                       'ground_type_templates', 'pitch_ground_types', 'restriction_templates',
                       'pitch_restrictions', 'campsite_products', 'product_categories',
                       'pitch_type_prices', 'pricing_calendar', 'availability_calendar') THEN
                EXECUTE format('CREATE POLICY "Allow read access for anon" ON public.%I FOR SELECT TO anon USING (true)', tbl);
            END IF;
        END IF;
    END LOOP;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
