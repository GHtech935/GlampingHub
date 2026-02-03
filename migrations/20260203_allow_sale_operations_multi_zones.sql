-- Allow 'sale' role in user_glamping_zones table (in addition to 'glamping_owner' and 'operations')
-- This enables sale and operations users to be assigned to multiple glamping zones

ALTER TABLE user_glamping_zones DROP CONSTRAINT IF EXISTS user_glamping_zones_role_check;
ALTER TABLE user_glamping_zones ADD CONSTRAINT user_glamping_zones_role_check
  CHECK (role IN ('glamping_owner', 'operations', 'sale'));
