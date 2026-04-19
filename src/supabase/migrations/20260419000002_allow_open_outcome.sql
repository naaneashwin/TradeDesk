-- Allow 'open' as a valid outcome for in-progress trades
alter table trades drop constraint if exists trades_outcome_check;
alter table trades add constraint trades_outcome_check
  check (outcome in ('win', 'loss', 'breakeven', 'open'));
