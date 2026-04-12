-- Migration: scanners — Chartink scanner links attached to strategies

create table scanners (
  id          text primary key,
  strategy_id text references strategies(id) on delete cascade,
  user_id     uuid references auth.users(id)  on delete cascade,
  name        text not null,
  url         text not null,
  description text,
  tags        jsonb default '[]',
  created_at  timestamptz default now()
);

alter table scanners enable row level security;

create policy "users_own_scanners" on scanners
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
