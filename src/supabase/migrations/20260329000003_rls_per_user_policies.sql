-- Migration: Replace permissive RLS policies with per-user policies
-- After this migration, each user can only see and modify their own rows.
-- auth.uid() returns the UUID of the currently logged-in user from the JWT token.

-- ── Strategies ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "allow_all_strategies" ON strategies;

CREATE POLICY "users_own_strategies" ON strategies
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Trades ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "allow_all_trades" ON trades;

CREATE POLICY "users_own_trades" ON trades
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
