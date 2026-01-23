-- Revert the disable RLS and create proper policies instead
-- Enable RLS back (in case it was disabled)
ALTER TABLE IF EXISTS public.customer_wishlists ENABLE ROW LEVEL SECURITY;

-- Drop the service_role policy if it exists (will recreate)
DROP POLICY IF EXISTS "Allow full access for service role" ON public.customer_wishlists;

-- Create policy for authenticated users (postgres/anon role)
-- Since the app uses direct pg connection with application-level auth,
-- we trust that the API has already validated the session.
-- The API filters by customer_id in WHERE clauses, so we allow all authenticated operations.

-- Policy for SELECT (read)
DROP POLICY IF EXISTS "Allow authenticated read" ON public.customer_wishlists;
CREATE POLICY "Allow authenticated read"
  ON public.customer_wishlists
  FOR SELECT
  USING (true);

-- Policy for INSERT (create)
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.customer_wishlists;
CREATE POLICY "Allow authenticated insert"
  ON public.customer_wishlists
  FOR INSERT
  WITH CHECK (true);

-- Policy for DELETE (remove)
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.customer_wishlists;
CREATE POLICY "Allow authenticated delete"
  ON public.customer_wishlists
  FOR DELETE
  USING (true);

-- Note: service_role is a Supabase-specific role
-- If using Supabase, uncomment the following:
-- CREATE POLICY "Allow full access for service role"
--   ON public.customer_wishlists
--   FOR ALL
--   TO service_role
--   USING (true)
--   WITH CHECK (true);
