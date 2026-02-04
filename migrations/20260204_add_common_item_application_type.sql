-- Add 'common_item' to the application_type check constraint on glamping_discounts
ALTER TABLE glamping_discounts
  DROP CONSTRAINT glamping_discounts_application_type_check;

ALTER TABLE glamping_discounts
  ADD CONSTRAINT glamping_discounts_application_type_check
  CHECK (application_type IN ('tent', 'menu', 'common_item'));
