-- Extra fields on trades: commission, screenshot URL, pre-trade plan
alter table trades
  add column if not exists commission     numeric,
  add column if not exists screenshot_url text,
  add column if not exists plan_thesis    text,
  add column if not exists plan_target    numeric,
  add column if not exists plan_stop      numeric;

-- Extra fields on user_preferences: account size + daily loss limit
alter table user_preferences
  add column if not exists account_size      numeric,
  add column if not exists daily_loss_limit  numeric;
