-- Add custom_exit_strategies array to user_preferences
-- Stores user-defined exit strategy labels as a JSONB array of strings

alter table user_preferences
  add column if not exists custom_exit_strategies jsonb default '[]'::jsonb;
