-- Migration: Add user_id (nullable) to strategies and trades
-- Run this first. user_id is nullable so existing rows are unaffected.
-- After you manually set user_id on all existing rows, run migration 20260329000002.

-- Add user_id to strategies (nullable)
ALTER TABLE strategies
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to trades (nullable)
ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_id     ON trades(user_id);
