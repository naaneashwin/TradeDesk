# Supabase Migrations — TradeDesk

A step-by-step guide to managing your database schema using the Supabase CLI.

---

## Prerequisites

- [Homebrew](https://brew.sh) installed on your Mac
- A Supabase project already created at [supabase.com](https://supabase.com)
- Node.js (any version ≥ 18)

---

## 1. Install the Supabase CLI

```bash
brew install supabase/tap/supabase

# Verify
supabase --version
```

---

## 2. Login to Supabase

```bash
supabase login
# Opens your browser — authorise with your Supabase account
```

---

## 3. Initialise Supabase in your project

Run this once, inside your `TradeDesk` project root:

```bash
supabase init
```

This creates a `supabase/` folder:

```
TradeDesk/
└── supabase/
    ├── config.toml       ← local dev config (auto-generated)
    ├── seed.sql          ← initial data (you create this)
    └── migrations/       ← all schema migration files live here
```

---

## 4. Link to your remote Supabase project

```bash
supabase link --project-ref bzvxzwghljupgggdrtga
# It will prompt for your DB password.
# Find/reset it at: Supabase Dashboard → Project Settings → Database
```

---

## 5. Create your first migration

```bash
supabase migration new create_strategies_and_trades
```

This creates a timestamped file:

```
supabase/migrations/20260321000000_create_strategies_and_trades.sql
```

Open that file and paste your schema SQL:

```sql
-- Create strategies table
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

-- Create trades table
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

-- Enable Row Level Security
alter table strategies enable row level security;
alter table trades enable row level security;

-- RLS Policies (allow all for personal use)
create policy "allow_all_strategies" on strategies for all using (true) with check (true);
create policy "allow_all_trades"     on trades     for all using (true) with check (true);
```

---

## 6. Create your seed file

`supabase/seed.sql` is for initial data — it's separate from migrations and only run manually.

```sql
-- supabase/seed.sql

insert into strategies (id, name, description, active, variants, totals, sections)
values (
  'rb',
  'Resistance Breakout',
  'Descending trendline · Horizontal resistance · Triangle/wedge · Ascending trendline',
  true,
  '[
    {"id":"a","label":"Type A — Descending trendline","col":"purple"},
    {"id":"b","label":"Type B — Horizontal resistance","col":"amber"},
    {"id":"c","label":"Type C — Triangle / wedge","col":"teal"},
    {"id":"d","label":"Type D — Ascending trendline","col":"blue"}
  ]',
  '{"a":19,"b":20,"c":20,"d":20}',
  '[]'
)
on conflict (id) do nothing;
```

---

## 7. Push migration to remote Supabase

```bash
supabase db push
```

This applies all pending migration files to your live Supabase database.
Supabase tracks which files have already run — it will never apply the same migration twice.

---

## 8. Run the seed (one time only)

The easiest way for a personal project — paste `seed.sql` directly into the Supabase SQL Editor:

**Supabase Dashboard → SQL Editor → New query → paste → Run**

Or via CLI:

```bash
supabase db execute --file supabase/seed.sql
```

---

## 9. Adding future migrations

Whenever you need to change the schema (add a column, new table, etc.):

```bash
# 1. Create a new migration file
supabase migration new add_tags_to_trades

# 2. Edit the generated file in supabase/migrations/
#    Example:
#    alter table trades add column tags text[] default '{}';

# 3. Push to remote
supabase db push
```

> **Never edit an existing migration file** that has already been pushed.
> Always create a new migration for every change.

---

## 10. Check migration status

```bash
supabase migration list
```

Shows which migrations have been applied to remote and which are pending.

---

## Quick reference

| Command | What it does |
|---|---|
| `supabase login` | Authenticate with your Supabase account |
| `supabase init` | Initialise Supabase in the project (run once) |
| `supabase link --project-ref <ref>` | Link CLI to your remote Supabase project |
| `supabase migration new <name>` | Create a new migration file |
| `supabase db push` | Apply all pending migrations to remote DB |
| `supabase migration list` | See applied vs pending migrations |
| `supabase db execute --file <file>` | Run any SQL file against remote DB |

---

## What runs where

| | Migrations | Seed | App code |
|---|---|---|---|
| **Your machine** | `supabase db push` | `supabase db execute` | `npm run dev` |
| **Supabase** | ✅ Schema lives here | ✅ Data lives here | ❌ |
| **Netlify** | ❌ Never | ❌ Never | ✅ Serves the React app |

---

## Project structure (final)

```
TradeDesk/
├── supabase/
│   ├── config.toml
│   ├── seed.sql
│   └── migrations/
│       └── 20260321000000_create_strategies_and_trades.sql
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── data/
│   │   └── strategies.js
│   └── lib/
│       ├── supabase.js
│       └── db.js
├── index.html
├── .env                  ← never commit this
├── .env.example          ← commit this
├── .gitignore
├── netlify.toml
├── package.json
└── vite.config.js
```

---

## .gitignore — make sure .env is excluded

```
node_modules/
dist/
.env
.DS_Store
```