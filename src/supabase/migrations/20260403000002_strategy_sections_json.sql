-- Re-add sections JSON column to strategies.
-- The sections column stores the checklist grouping for each strategy:
-- [{ id, name, color, neutral, items: [checklist_item_uuid, ...] }]
--
-- neutral = true  → reference/warning section (no checkbox, excluded from count)
-- neutral = false → actionable section (has checkboxes, counts toward total)
--
-- The strategy_checklist_items join table is still synced on every save
-- so that the "Used by" badge in ChecklistLibrary can query by item ID.

ALTER TABLE strategies
  ADD COLUMN IF NOT EXISTS sections jsonb NOT NULL DEFAULT '[]';
