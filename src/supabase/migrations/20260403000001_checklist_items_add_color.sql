-- Comprehensive checklist schema cleanup
-- Apply this as a single migration to Supabase.

-- 1. Add per-item colour to checklist_items.
--    Color names match the COL map in Checklist.jsx:
--    gray | indigo | purple | blue | teal | amber | coral | green
ALTER TABLE checklist_items
  ADD COLUMN color text NOT NULL DEFAULT 'gray';

-- 2. Drop the legacy inline JSON column from strategies.
--    Checklist data is now exclusively in the strategy_checklist_items join table.
ALTER TABLE strategies
  DROP COLUMN IF EXISTS sections;

-- 3. Simplify the join table: drop section grouping metadata that is no longer used.
--    Items are now stored as a flat ordered list; color lives on checklist_items.
ALTER TABLE strategy_checklist_items
  DROP COLUMN IF EXISTS section_title,
  DROP COLUMN IF EXISTS section_col,
  DROP COLUMN IF EXISTS is_reference;
