-- Migration: user_preferences — stores per-user calculator defaults (total investment, capital per trade)

create table user_preferences (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  total_investment  numeric,
  capital_per_trade numeric,
  updated_at        timestamptz default now()
);

alter table user_preferences enable row level security;

create policy "users_own_preferences" on user_preferences
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
