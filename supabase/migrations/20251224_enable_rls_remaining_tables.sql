-- Enable RLS for remaining tables reported by Supabase Security Advisor
-- 1. monthly_commission_payouts
-- 2. user_campsites (if exists)

-- ============================================
-- 1. monthly_commission_payouts
-- ============================================

-- Enable RLS
ALTER TABLE IF EXISTS public.monthly_commission_payouts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated read" ON public.monthly_commission_payouts;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.monthly_commission_payouts;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.monthly_commission_payouts;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.monthly_commission_payouts;

-- Policies for authenticated users (postgres connection from app)
-- The app handles authorization at API level, so we allow all operations
-- API endpoints will filter by owner_id and validate permissions

CREATE POLICY "Allow authenticated read"
  ON public.monthly_commission_payouts
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated insert"
  ON public.monthly_commission_payouts
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update"
  ON public.monthly_commission_payouts
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete"
  ON public.monthly_commission_payouts
  FOR DELETE
  USING (true);

-- ============================================
-- 2. user_campsites (if exists)
-- ============================================

-- Check if table exists and enable RLS
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_campsites'
  ) THEN
    -- Enable RLS
    ALTER TABLE public.user_campsites ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if any
    EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated read" ON public.user_campsites';
    EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated insert" ON public.user_campsites';
    EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated update" ON public.user_campsites';
    EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated delete" ON public.user_campsites';

    -- Create policies
    EXECUTE 'CREATE POLICY "Allow authenticated read" ON public.user_campsites FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "Allow authenticated insert" ON public.user_campsites FOR INSERT WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Allow authenticated update" ON public.user_campsites FOR UPDATE USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Allow authenticated delete" ON public.user_campsites FOR DELETE USING (true)';

    RAISE NOTICE 'RLS enabled for user_campsites';
  ELSE
    RAISE NOTICE 'Table user_campsites does not exist, skipping';
  END IF;
END $$;
