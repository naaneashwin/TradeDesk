-- Tracks which broker holdings/positions the user has marked as logged.
-- Uses a snapshot_key (symbol|exchange|qty) so marks auto-invalidate
-- when the position size changes (e.g. buying more shares).
create table if not exists logged_symbols (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  snapshot_key text not null,   -- "RELIANCE|NSE|100" — unique per position snapshot
  symbol       text not null,   -- for filtering / display
  exchange     text,
  qty          numeric,
  logged_at    timestamptz not null default now(),
  unique (user_id, snapshot_key)
);

alter table logged_symbols enable row level security;

create policy "Users can manage own logged symbols"
  on logged_symbols for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
