-- Migration: Checklist items library + strategy ↔ checklist link table
-- Each user builds a library of reusable checklist items (checklist_items).
-- Each strategy can attach any subset of those items, grouped into sections,
-- via the strategy_checklist_items join table.

-- ── 1. Checklist items library ────────────────────────────────────────────────

create table checklist_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  title       text not null,
  description text,
  note        text,
  created_at  timestamptz default now()
);

alter table checklist_items enable row level security;

create policy "users_own_checklist_items" on checklist_items
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 2. Strategy ↔ checklist join table ───────────────────────────────────────
-- Each row attaches one checklist_item to one strategy, with ordering and
-- section grouping stored directly on the join row.

create table strategy_checklist_items (
  id                uuid primary key default gen_random_uuid(),
  strategy_id       text references strategies(id) on delete cascade not null,
  checklist_item_id uuid references checklist_items(id) on delete cascade not null,
  position          integer     not null default 0,
  section_title     text        not null default 'Checklist',
  section_col       text        not null default 'gray',
  is_reference      boolean     not null default false,
  unique (strategy_id, checklist_item_id)
);

alter table strategy_checklist_items enable row level security;

-- Access is governed by strategy ownership (same user_id)
create policy "users_own_strategy_checklist_items" on strategy_checklist_items
  for all
  using (
    exists (
      select 1 from strategies s
      where s.id = strategy_checklist_items.strategy_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from strategies s
      where s.id = strategy_checklist_items.strategy_id
        and s.user_id = auth.uid()
    )
  );
