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

// ── Checklist Items ──────────────────────────────────────────

export async function getChecklistItems() {
  const { data, error } = await supabase
    .from('checklist_items')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data.map(r => ({ id: r.id, title: r.title, description: r.description ?? null, note: r.note ?? null }))
}

export async function upsertChecklistItem(item) {
  const payload = { title: item.title, description: item.description ?? null, note: item.note ?? null }
  if (item.id) payload.id = item.id

  const { data, error } = await supabase
    .from('checklist_items')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single()

  if (error) throw error
  return { id: data.id, title: data.title, description: data.description ?? null, note: data.note ?? null }
}

export async function deleteChecklistItem(id) {
  const { error } = await supabase.from('checklist_items').delete().eq('id', id)
  if (error) throw error
}

// ── Strategy ↔ Checklist Links ───────────────────────────────

// Returns sections array in the same shape Checklist.jsx already expects:
// [{ id, n, title, col, ref, items: [{ id, label, detail, note, v }] }]
//
// Resolution order:
//   1. strategy_checklist_items (new DB-driven data)
//   2. strategies.sections JSON column (legacy data saved before the migration)
export async function getStrategyChecklistSections(strategyId) {
  const { data, error } = await supabase
    .from('strategy_checklist_items')
    .select('*, checklist_items(id, title, description, note)')
    .eq('strategy_id', strategyId)
    .order('position', { ascending: true })

  if (error) throw error

  // ── Use new DB data if any rows exist ────────────────────────
  if (data.length > 0) {
    const secMap = new Map()
    for (const row of data) {
      if (!secMap.has(row.section_title)) {
        secMap.set(row.section_title, {
          id:    `sec-${row.section_title}`,
          n:     secMap.size + 1,
          title: row.section_title,
          col:   row.section_col,
          ref:   row.is_reference,
          items: [],
        })
      }
      const ci = row.checklist_items
      if (ci) {
        secMap.get(row.section_title).items.push({
          id:     ci.id,
          label:  ci.title,
          detail: ci.description ?? null,
          note:   ci.note ?? null,
          v:      null,
        })
      }
    }
    return Array.from(secMap.values())
  }

  // ── Fall back to legacy sections JSON stored on the strategy row ─
  const { data: stData, error: stError } = await supabase
    .from('strategies')
    .select('sections')
    .eq('id', strategyId)
    .single()

  if (stError) throw stError
  return stData.sections ?? []
}

// entries: [{ checklistItemId, position, sectionTitle, sectionCol, isReference }]
// Passing null/undefined is a no-op (preserves existing associations).
export async function saveStrategyChecklist(strategyId, entries) {
  if (entries == null) return

  const { error: delError } = await supabase
    .from('strategy_checklist_items')
    .delete()
    .eq('strategy_id', strategyId)
  if (delError) throw delError

  if (!entries.length) return

  const rows = entries.map((e, i) => ({
    strategy_id:       strategyId,
    checklist_item_id: e.checklistItemId,
    position:          e.position ?? i,
    section_title:     e.sectionTitle  ?? 'Checklist',
    section_col:       e.sectionCol    ?? 'gray',
    is_reference:      e.isReference   ?? false,
  }))

  const { error } = await supabase.from('strategy_checklist_items').insert(rows)
  if (error) throw error
}