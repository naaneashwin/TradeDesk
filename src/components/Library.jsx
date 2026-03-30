import { useState, useEffect } from 'react'
import { uid } from './ui'
import { getStrategyChecklistSections } from '../lib/db'

function StrategyIcon({ active }) {
  return (
    <div style={{
      width: 48, height: 48, borderRadius: 12,
      background: active ? 'rgba(45,122,95,0.12)' : '#f3f4f6',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--green)' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    </div>
  )
}

function StatSummaryCard({ label, value, accent }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', flex: 1 }}>
      <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 700, color: accent ?? 'var(--text)', margin: 0 }}>{value}</p>
    </div>
  )
}

function ThreeDotMenu({ onEdit, onDelete, onToggle, active }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [open])
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '4px 6px', borderRadius: 6, fontSize: 18, lineHeight: 1 }}>
        ⋮
      </button>
      {open && (
        <div onClick={e => e.stopPropagation()} style={{
          position: 'absolute', right: 0, top: '100%', background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 100, minWidth: 160, padding: '4px 0',
        }}>
          {[
            { label: active ? 'Deactivate' : 'Activate', action: onToggle },
            { label: 'Edit', action: onEdit },
            { label: 'Delete', action: onDelete, danger: true },
          ].map(({ label, action, danger }) => (
            <button key={label} onClick={() => { action(); setOpen(false) }}
              style={{ display: 'block', width: '100%', padding: '9px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, color: danger ? 'var(--red)' : 'var(--text)', fontFamily: 'Inter, sans-serif' }}>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Library({ strats, trades, onOpen, onUpsert, onDelete, checklistItems = [], onUpsertChecklistItem }) {
  const [addModal,     setAddModal]     = useState(false)
  const [editTarget,   setEditTarget]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    const handler = () => setAddModal(true)
    document.addEventListener('td:new-strategy', handler)
    return () => document.removeEventListener('td:new-strategy', handler)
  }, [])

  const handleSaveStrategy = async ({ name, desc }, entries, isEdit) => {
    if (isEdit) {
      await onUpsert({ ...editTarget, name, desc }, entries)
      setEditTarget(null)
    } else {
      await onUpsert({ id: uid(), name, desc, active: true, variants: [], totals: {}, sections: [] }, entries)
      setAddModal(false)
    }
  }

  const doDelete = () => { onDelete(deleteTarget.id); setDeleteTarget(null) }

  const totalTrades = trades.length
  const activeCount = strats.filter(x => x.active).length

  return (
    <div>
      {/* Summary stat cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
        <StatSummaryCard label="Total Strategies"   value={strats.length} />
        <StatSummaryCard label="Active Strategies"  value={activeCount}   accent="var(--green)" />
        <StatSummaryCard label="Total Trades Logged" value={totalTrades}  />
      </div>

      {/* Strategy cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
        {strats.map(st => {
          const tt = trades.filter(t => t.strategyId === st.id)
          const wr = tt.length ? Math.round(tt.filter(t => t.outcome === 'win').length / tt.length * 100) : 0

          return (
            <div key={st.id} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 0,
              transition: 'box-shadow 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <StrategyIcon active={st.active}/>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
                    background: st.active ? 'var(--green)' : 'transparent',
                    color: st.active ? '#fff' : 'var(--text-2)',
                    border: st.active ? 'none' : '1px solid var(--border-2)',
                    letterSpacing: '0.04em',
                  }}>{st.active ? 'ACTIVE' : 'INACTIVE'}</span>
                  <ThreeDotMenu
                    active={st.active}
                    onToggle={() => onUpsert({ ...st, active: !st.active })}
                    onEdit={() => setEditTarget(st)}
                    onDelete={() => setDeleteTarget(st)}
                  />
                </div>
              </div>

              {/* Name */}
              <h3 style={{ fontSize: 18, fontWeight: 700, color: st.active ? 'var(--green)' : 'var(--text)', margin: '0 0 14px' }}>{st.name}</h3>

              {/* Description */}
              <div style={{ minHeight: 80, marginBottom: 24 }}>
                {st.desc
                  ? <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.5 }}>{st.desc}</p>
                  : <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0, fontStyle: 'italic' }}>No description — use Edit to add one.</p>
                }
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: 24, marginBottom: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                {[
                  { label: 'VARIANTS', icon: '⊞', val: st.variants?.length ?? 0 },
                  { label: 'TRADES',   icon: '↗', val: tt.length },
                  { label: 'WIN RATE', icon: '%', val: `${wr}%` },
                ].map(({ label, icon, val }) => (
                  <div key={label}>
                    <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 4, margin: 0 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{icon}</span>
                      {val}
                    </p>
                  </div>
                ))}
              </div>

              {/* CTA */}
              {st.active ? (
                <button className="btn-green" style={{ width: '100%', padding: '12px', fontSize: 14 }} onClick={() => onOpen(st)}>
                  Open Strategy →
                </button>
              ) : (
                <button className="btn-outline" style={{ width: '100%', padding: '12px', fontSize: 14 }} onClick={() => onUpsert({ ...st, active: true })}>
                  Activate Strategy →
                </button>
              )}
            </div>
          )
        })}

        {strats.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '64px 0', color: 'var(--text-3)' }}>
            <p style={{ fontSize: 14 }}>No strategies yet. Click "New Strategy" to add one.</p>
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      {addModal && (
        <StrategyModal
          checklistItems={checklistItems}
          onNewChecklistItem={onUpsertChecklistItem}
          onClose={() => setAddModal(false)}
          onSave={(data, entries) => handleSaveStrategy(data, entries, false)}
        />
      )}
      {editTarget && (
        <StrategyModal
          strategy={editTarget}
          checklistItems={checklistItems}
          onNewChecklistItem={onUpsertChecklistItem}
          onClose={() => setEditTarget(null)}
          onSave={(data, entries) => handleSaveStrategy(data, entries, true)}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <LightModal title="Delete Strategy" onClose={() => setDeleteTarget(null)}>
          <p style={{ fontSize: 14, color: 'var(--text)', marginBottom: 6 }}>Delete <strong>{deleteTarget.name}</strong>?</p>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 24 }}>This permanently removes the strategy and all associated trades.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn-outline" style={{ padding: '8px 18px' }} onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button style={{ padding: '8px 18px', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 }} onClick={doDelete}>Delete</button>
          </div>
        </LightModal>
      )}
    </div>
  )
}

// ── Strategy Modal (create + edit, Details + Checklist tabs) ────────────────

const SECTION_COLORS = [
  { id: 'gray',   label: 'Gray'   }, { id: 'indigo', label: 'Indigo' },
  { id: 'purple', label: 'Purple' }, { id: 'blue',   label: 'Blue'   },
  { id: 'teal',   label: 'Teal'   }, { id: 'amber',  label: 'Amber'  },
  { id: 'coral',  label: 'Coral'  }, { id: 'green',  label: 'Green'  },
]

function StrategyModal({ strategy, checklistItems, onClose, onSave, onNewChecklistItem }) {
  const isEdit = !!strategy
  const [tab, setTab] = useState('details')

  const [name, setName] = useState(strategy?.name ?? '')
  const [desc, setDesc] = useState(strategy?.desc ?? '')

  // selections: [{ checklistItemId, sectionTitle, sectionCol, isReference }]
  const [selections,        setSelections]        = useState([])
  const [checklistLoading,  setChecklistLoading]  = useState(isEdit)
  const [checklistTouched,  setChecklistTouched]  = useState(false)

  const [showNew,       setShowNew]       = useState(false)
  const [newTitle,      setNewTitle]      = useState('')
  const [newDesc,       setNewDesc]       = useState('')
  const [newNote,       setNewNote]       = useState('')
  const [newSection,    setNewSection]    = useState('Checklist')
  const [newSectionCol, setNewSectionCol] = useState('gray')
  const [creating,      setCreating]      = useState(false)
  const [saving,        setSaving]        = useState(false)

  useEffect(() => {
    if (!isEdit) return
    getStrategyChecklistSections(strategy.id)
      .then(sections => {
        const entries = []
        for (const sec of sections)
          for (const item of sec.items)
            entries.push({ checklistItemId: item.id, sectionTitle: sec.title, sectionCol: sec.col, isReference: sec.ref })
        setSelections(entries)
      })
      .catch(console.error)
      .finally(() => setChecklistLoading(false))
  }, [isEdit, strategy?.id])

  const toggleItem = id =>
    setSelections(prev =>
      prev.some(s => s.checklistItemId === id)
        ? prev.filter(s => s.checklistItemId !== id)
        : [...prev, { checklistItemId: id, sectionTitle: 'Checklist', sectionCol: 'gray', isReference: false }]
    )

  const updateSel = (id, patch) =>
    setSelections(prev => prev.map(s => s.checklistItemId === id ? { ...s, ...patch } : s))

  const handleCreateNew = async () => {
    if (!newTitle.trim() || creating) return
    setCreating(true)
    try {
      const item = await onNewChecklistItem({ title: newTitle.trim(), description: newDesc.trim() || null, note: newNote.trim() || null })
      setSelections(prev => [...prev, { checklistItemId: item.id, sectionTitle: newSection.trim() || 'Checklist', sectionCol: newSectionCol, isReference: false }])
      setShowNew(false)
      setNewTitle(''); setNewDesc(''); setNewNote(''); setNewSection('Checklist'); setNewSectionCol('gray')
    } catch (e) { console.error(e) }
    finally { setCreating(false) }
  }

  const openChecklist = () => { setTab('checklist'); setChecklistTouched(true) }

  const handleSave = async () => {
    if (!name.trim()) { setTab('details'); return }
    setSaving(true)
    try {
      const entries = checklistTouched ? selections.map((s, i) => ({ ...s, position: i })) : null
      await onSave({ name: name.trim(), desc: desc.trim() }, entries)
    } finally { setSaving(false) }
  }

  return (
    <LightModal title={isEdit ? 'Edit Strategy' : 'New Strategy'} onClose={onClose} wide>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 24, marginTop: -8 }}>
        {[['details', 'Strategy Details'], ['checklist', `Checklist${selections.length ? ` (${selections.length})` : ''}`]].map(([id, label]) => (
          <button key={id} onClick={() => id === 'checklist' ? openChecklist() : setTab(id)}
            style={{ padding: '8px 18px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === id ? 600 : 400, color: tab === id ? 'var(--green)' : 'var(--text-2)', borderBottom: tab === id ? '2px solid var(--green)' : '2px solid transparent', marginBottom: -1, fontFamily: 'Inter, sans-serif' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Details tab ── */}
      {tab === 'details' && <>
        <label style={lbl}>Strategy Name *</label>
        <input className="t-inp" style={{ marginBottom: 20, fontSize: 15, padding: '12px 14px' }}
          value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Resistance Breakout" autoFocus/>
        <label style={lbl}>Description (optional)</label>
        <textarea className="t-inp" style={{ height: 100, resize: 'vertical', marginBottom: 28, fontSize: 15, padding: '12px 14px' }}
          value={desc} onChange={e => setDesc(e.target.value)} placeholder="Briefly describe when you use this strategy…"/>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn-outline" style={{ padding: '11px 24px', fontSize: 15 }} onClick={onClose}>Cancel</button>
          <button className="btn-outline" style={{ padding: '11px 22px', fontSize: 15 }} onClick={openChecklist}>Attach Checklist →</button>
          <button className="btn-green" style={{ padding: '11px 28px', fontSize: 15 }} onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Strategy'}
          </button>
        </div>
      </>}

      {/* ── Checklist tab ── */}
      {tab === 'checklist' && <>
        {checklistLoading
          ? <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '32px 0' }}>Loading…</p>
          : <>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14 }}>
              Select checks from your library. Each check can be assigned to a named section.
            </p>

            {/* Library list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflowY: 'auto', marginBottom: 16, paddingRight: 4 }}>
              {checklistItems.length === 0 && !showNew && (
                <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '20px 0' }}>
                  Your checklist library is empty — create your first item below.
                </p>
              )}
              {checklistItems.map(item => {
                const sel = selections.find(s => s.checklistItemId === item.id)
                const on  = !!sel
                return (
                  <div key={item.id} style={{ borderRadius: 10, border: `1px solid ${on ? 'var(--green)' : 'var(--border)'}`, background: on ? 'rgba(45,122,95,0.04)' : 'var(--surface-2)', overflow: 'hidden', transition: 'border-color 0.15s' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', cursor: 'pointer' }} onClick={() => toggleItem(item.id)}>
                      <div style={{ width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 1, border: `2px solid ${on ? 'var(--green)' : '#d1d5db'}`, background: on ? 'var(--green)' : 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {on && <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 6 5 9 10 3"/></svg>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', margin: '0 0 2px' }}>
                          {item.title || <em style={{ color: 'var(--text-3)', fontStyle: 'italic', fontWeight: 400 }}>Untitled item</em>}
                        </p>
                        {item.description && <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0 }}>{item.description}</p>}
                      </div>
                    </div>
                    {on && (
                      <div style={{ display: 'flex', gap: 8, padding: '0 14px 12px', flexWrap: 'wrap', alignItems: 'flex-end' }} onClick={e => e.stopPropagation()}>
                        <div style={{ flex: 1, minWidth: 140 }}>
                          <label style={{ ...lbl, marginBottom: 4 }}>Section name</label>
                          <input className="t-inp" style={{ padding: '6px 10px', fontSize: 12 }} placeholder="e.g. Entry Conditions"
                            value={sel.sectionTitle} onChange={e => updateSel(item.id, { sectionTitle: e.target.value })}/>
                        </div>
                        <div>
                          <label style={{ ...lbl, marginBottom: 4 }}>Color</label>
                          <select className="t-inp" style={{ padding: '6px 10px', fontSize: 12 }}
                            value={sel.sectionCol} onChange={e => updateSel(item.id, { sectionCol: e.target.value })}>
                            {SECTION_COLORS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                          </select>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', paddingBottom: 4, fontSize: 12, color: 'var(--text-2)', userSelect: 'none' }}>
                          <input type="checkbox" checked={sel.isReference} onChange={e => updateSel(item.id, { isReference: e.target.checked })}/>
                          Reference only
                        </label>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Create new item inline */}
            {!showNew ? (
              <button onClick={() => setShowNew(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--green)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, padding: 0, marginBottom: 20, fontFamily: 'Inter, sans-serif' }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Create new checklist item
              </button>
            ) : (
              <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 16, border: '1px solid var(--border)', marginBottom: 20 }}>
                <p style={{ ...lbl, marginBottom: 12 }}>New Checklist Item</p>
                <input className="t-inp" style={{ marginBottom: 10 }} placeholder="Title *" value={newTitle} onChange={e => setNewTitle(e.target.value)} autoFocus/>
                <textarea className="t-inp" style={{ height: 72, resize: 'vertical', marginBottom: 10 }}
                  placeholder="Description — shown when the check is expanded" value={newDesc} onChange={e => setNewDesc(e.target.value)}/>
                <input className="t-inp" style={{ marginBottom: 10 }} placeholder="Note / hint (short tag)" value={newNote} onChange={e => setNewNote(e.target.value)}/>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ ...lbl, marginBottom: 4 }}>Section name</label>
                    <input className="t-inp" style={{ padding: '6px 10px', fontSize: 12 }} placeholder="e.g. Entry Conditions"
                      value={newSection} onChange={e => setNewSection(e.target.value)}/>
                  </div>
                  <div>
                    <label style={{ ...lbl, marginBottom: 4 }}>Color</label>
                    <select className="t-inp" style={{ padding: '6px 10px', fontSize: 12 }}
                      value={newSectionCol} onChange={e => setNewSectionCol(e.target.value)}>
                      {SECTION_COLORS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-outline" style={{ padding: '7px 14px', fontSize: 13 }}
                    onClick={() => { setShowNew(false); setNewTitle(''); setNewDesc(''); setNewNote(''); setNewSection('Checklist'); setNewSectionCol('gray') }}>Cancel</button>
                  <button className="btn-green" style={{ padding: '7px 14px', fontSize: 13 }}
                    onClick={handleCreateNew} disabled={creating || !newTitle.trim()}>
                    {creating ? 'Creating…' : 'Create & Attach'}
                  </button>
                </div>
              </div>
            )}
          </>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 20 }}>
          <button className="btn-outline" style={{ padding: '11px 22px', fontSize: 15 }} onClick={() => setTab('details')}>← Details</button>
          <button className="btn-green" style={{ padding: '11px 28px', fontSize: 15 }} onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Strategy'}
          </button>
        </div>
      </>}
    </LightModal>
  )
}

export function LightModal({ title, onClose, children, wide }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}
      onClick={onClose}>
      <div style={{ background: 'var(--surface)', borderRadius: 20, padding: '32px 36px', width: '100%', maxWidth: wide ? 640 : 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--text-3)', lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

const lbl = { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }
