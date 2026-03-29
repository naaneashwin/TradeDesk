-- Migration: Make user_id NOT NULL on strategies and trades
-- Run this ONLY after you have manually set user_id on all existing rows.
-- Verify first: SELECT COUNT(*) FROM strategies WHERE user_id IS NULL;
--               SELECT COUNT(*) FROM trades     WHERE user_id IS NULL;
-- Both counts must be 0 before running this migration.

ALTER TABLE strategies
  ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE trades
  ALTER COLUMN user_id SET NOT NULL;
