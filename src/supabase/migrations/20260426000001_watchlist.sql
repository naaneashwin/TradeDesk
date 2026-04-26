-- Watchlist table
create table if not exists watchlist (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  symbol      text not null,
  reason      text,
  entry_notes text,
  target      numeric,
  stop        numeric,
  tags        text[] default '{}',
  status      text not null default 'watching' check (status in ('watching', 'entered', 'missed', 'removed')),
  added_at    date not null default current_date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table watchlist enable row level security;

create policy "Users can manage own watchlist"
  on watchlist for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
