import { supabase } from './supabase'

// ── Strategies ──────────────────────────────────────────────

export async function getStrategies() {
  const { data, error } = await supabase
    .from('strategies')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw error
  // Map snake_case DB columns → camelCase app fields
  return data.map(rowToStrategy)
}

export async function upsertStrategy(strategy) {
  const { error } = await supabase
    .from('strategies')
    .upsert(strategyToRow(strategy), { onConflict: 'id' })

  if (error) throw error
}

export async function deleteStrategy(id) {
  const { error } = await supabase
    .from('strategies')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ── Trades ──────────────────────────────────────────────────

export async function getTrades() {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .order('date', { ascending: false })

  if (error) throw error
  return data.map(rowToTrade)
}

export async function insertTrade(trade) {
  const { error } = await supabase
    .from('trades')
    .insert(tradeToRow(trade))

  if (error) throw error
}

export async function updateTrade(trade) {
  const { error } = await supabase
    .from('trades')
    .update(tradeToRow(trade))
    .eq('id', trade.id)

  if (error) throw error
}

export async function deleteTrade(id) {
  const { error } = await supabase
    .from('trades')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ── Mappers (DB ↔ App) ───────────────────────────────────────

function rowToStrategy(row) {
  return {
    id:       row.id,
    name:     row.name,
    desc:     row.description,
    active:   row.active,
    variants: row.variants  ?? [],
    totals:   row.totals    ?? {},
    sections: row.sections  ?? [],
  }
}

function strategyToRow(s) {
  return {
    id:          s.id,
    name:        s.name,
    description: s.desc,
    active:      s.active,
    variants:    s.variants,
    totals:      s.totals,
    sections:    s.sections,
  }
}

function rowToTrade(row) {
  return {
    id:             row.id,
    strategyId:     row.strategy_id,
    variant:        row.variant,
    checklistScore: row.checklist_score,
    date:           row.date,
    instrument:     row.instrument,
    direction:      row.direction,
    entryPrice:     Number(row.entry_price),
    exitPrice:      Number(row.exit_price),
    qty:            Number(row.qty),
    outcome:        row.outcome,
    pnl:            Number(row.pnl),
    notes:          row.notes,
  }
}

function tradeToRow(t) {
  return {
    id:              t.id,
    strategy_id:     t.strategyId,
    variant:         t.variant,
    checklist_score: t.checklistScore,
    date:            t.date,
    instrument:      t.instrument,
    direction:       t.direction,
    entry_price:     t.entryPrice,
    exit_price:      t.exitPrice,
    qty:             t.qty,
    outcome:         t.outcome,
    pnl:             t.pnl,
    notes:           t.notes,
  }
}