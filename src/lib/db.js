import { supabase } from './supabase'

// ── Strategies ──────────────────────────────────────────────

export async function getStrategies() {
  const { data, error } = await supabase
    .from('strategies')
    .select('*, strategy_checklist_items(checklist_item_id)')
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
    id:               row.id,
    name:             row.name,
    desc:             row.description,
    active:           row.active,
    variants:         row.variants  ?? [],
    totals:           row.totals    ?? {},
    sections:         row.sections  ?? [],
    userId:           row.user_id,
    checklistItemIds: (row.strategy_checklist_items ?? []).map(r => r.checklist_item_id),
  }
}

function strategyToRow(s) {
  // NOTE: `sections` is intentionally excluded — managed exclusively by saveStrategyChecklist
  const row = {
    id:          s.id,
    name:        s.name,
    description: s.desc,
    active:      s.active,
    variants:    s.variants,
    totals:      s.totals,
  }
  if (s.userId) row.user_id = s.userId
  return row
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
  return data.map(r => ({ id: r.id, title: r.title, description: r.description ?? null, note: r.note ?? null, color: r.color ?? 'gray' }))
}

export async function upsertChecklistItem(item) {
  const payload = { title: item.title, description: item.description ?? null, note: item.note ?? null, color: item.color ?? 'gray' }
  if (item.id) payload.id = item.id

  const { data, error } = await supabase
    .from('checklist_items')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single()

  if (error) throw error
  return { id: data.id, title: data.title, description: data.description ?? null, note: data.note ?? null, color: data.color ?? 'gray' }
}

export async function deleteChecklistItem(id) {
  const { error } = await supabase.from('checklist_items').delete().eq('id', id)
  if (error) throw error
}

// ── Strategy ↔ Checklist Links ───────────────────────────────

// Returns sections with expanded item data for the strategy edit modal.
// sections shape: [{ id, name, color, neutral, items: [{ id, label, detail, note, color }] }]
export async function getStrategyChecklistItemsForEdit(strategyId) {
  const { data: stData, error: stError } = await supabase
    .from('strategies')
    .select('sections')
    .eq('id', strategyId)
    .single()

  if (stError) throw stError

  const sections = stData.sections ?? []
  const allIds = sections.flatMap(s => s.items ?? [])
  if (!allIds.length) return sections.map(s => ({ ...s, items: [] }))

  const { data: ciData, error: ciError } = await supabase
    .from('checklist_items')
    .select('*')
    .in('id', allIds)

  if (ciError) throw ciError

  const ciMap = Object.fromEntries(ciData.map(r => [r.id, r]))

  return sections.map(sec => ({
    id:      sec.id,
    name:    sec.name ?? '',
    color:   sec.color ?? 'gray',
    neutral: sec.neutral ?? false,
    variant: sec.variant ?? null,
    items:   (sec.items ?? [])
      .map(id => ciMap[id])
      .filter(Boolean)
      .map(ci => ({
        id:     ci.id,
        label:  ci.title,
        detail: ci.description ?? null,
        note:   ci.note ?? null,
        color:  ci.color ?? 'gray',
      })),
  }))
}

// Returns sections array for Checklist.jsx.
// Reads from strategies.sections JSON, expands item UUIDs via checklist_items.
export async function getStrategyChecklistSections(strategyId) {
  const { data: stData, error: stError } = await supabase
    .from('strategies')
    .select('sections')
    .eq('id', strategyId)
    .single()

  if (stError) throw stError

  const sections = stData.sections ?? []
  const allIds = sections.flatMap(s => s.items ?? [])
  if (!allIds.length) return []

  const { data: ciData, error: ciError } = await supabase
    .from('checklist_items')
    .select('*')
    .in('id', allIds)

  if (ciError) throw ciError

  const ciMap = Object.fromEntries(ciData.map(r => [r.id, r]))

  return sections
    .map((sec, i) => ({
      id:      sec.id ?? `sec-${i}`,
      n:       i + 1,
      title:   sec.name || `Section ${i + 1}`,
      col:     sec.color ?? 'gray',
      neutral: sec.neutral ?? false,
      ref:     sec.neutral ?? false,   // Checklist.jsx reads .ref for no-checkbox logic
      variant: sec.variant ?? null,    // null = all variants; set = only shown for that variant
      items:   (sec.items ?? [])
        .map(id => ciMap[id])
        .filter(Boolean)
        .map(ci => ({
          id:     ci.id,
          label:  ci.title,
          detail: ci.description ?? null,
          note:   ci.note ?? null,
          color:  ci.color ?? 'gray',
          v:      null,
        })),
    }))
    .filter(sec => sec.items.length > 0)
}

// sections: [{ id, name, color, neutral, items: [uuid, ...] }]
// Saves the sections JSON to strategies.sections and syncs the join table
// (for Used-by badge queries). Passing null/undefined is a no-op.
export async function saveStrategyChecklist(strategyId, sections) {
  if (sections == null) return

  // Save structured sections JSON to the strategy row
  const { error: stError } = await supabase
    .from('strategies')
    .update({ sections })
    .eq('id', strategyId)
  if (stError) throw stError

  // Sync join table so checklistItemIds / Used-by badge stays accurate
  const { error: delError } = await supabase
    .from('strategy_checklist_items')
    .delete()
    .eq('strategy_id', strategyId)
  if (delError) throw delError

  const allItemIds = sections.flatMap(s => s.items ?? [])
  if (!allItemIds.length) return

  const rows = allItemIds.map((itemId, i) => ({
    strategy_id:       strategyId,
    checklist_item_id: itemId,
    position:          i,
  }))

  const { error } = await supabase.from('strategy_checklist_items').insert(rows)
  if (error) throw error
}