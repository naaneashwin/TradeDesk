-- Add initial stop loss and R-multiple to trades
alter table trades add column if not exists initial_sl numeric;
alter table trades add column if not exists r_mult     numeric;
