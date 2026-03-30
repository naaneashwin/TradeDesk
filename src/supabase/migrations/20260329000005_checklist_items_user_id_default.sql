-- Fix: checklist_items.user_id should default to the current user so that
-- inserts from the Supabase JS client don't need to supply it explicitly.
-- auth.uid() is evaluated server-side from the JWT on every insert.

ALTER TABLE checklist_items
  ALTER COLUMN user_id SET DEFAULT auth.uid();
