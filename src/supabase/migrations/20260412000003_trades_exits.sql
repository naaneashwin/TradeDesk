-- Add exits JSONB array to trades for partial-exit support
-- Each exit: { id, exitPrice, qty, pnl }
-- exitPrice at the top level stores the weighted average exit price for display

alter table trades add column if not exists exits jsonb default '[]';
