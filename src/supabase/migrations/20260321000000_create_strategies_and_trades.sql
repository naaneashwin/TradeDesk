-- supabase/migrations/20260321000000_create_strategies_and_trades.sql

create table strategies (
  id          text primary key,
  name        text not null,
  description text,
  active      boolean default true,
  variants    jsonb default '[]',
  totals      jsonb default '{}',
  sections    jsonb default '[]',
  created_at  timestamptz default now()
);

create table trades (
  id               text primary key,
  strategy_id      text references strategies(id) on delete cascade,
  variant          text,
  checklist_score  jsonb,
  date             date not null,
  instrument       text not null,
  direction        text check (direction in ('long','short')),
  entry_price      numeric,
  exit_price       numeric,
  qty              numeric,
  outcome          text check (outcome in ('win','loss','breakeven')),
  pnl              numeric,
  notes            text,
  created_at       timestamptz default now()
);

alter table strategies enable row level security;
alter table trades enable row level security;

create policy "allow_all_strategies" on strategies for all using (true) with check (true);
create policy "allow_all_trades"     on trades     for all using (true) with check (true);