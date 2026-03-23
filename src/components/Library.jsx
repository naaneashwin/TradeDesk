import { useState, useEffect } from 'react'
import { uid } from './ui'

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

export default function Library({ strats, trades, onOpen, onUpsert, onDelete }) {
  const [addModal,     setAddModal]     = useState(false)
  const [editTarget,   setEditTarget]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState({ name: '', desc: '', rules: [''] })
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  useEffect(() => {
    const handler = () => { setForm({ name: '', desc: '', rules: [''] }); setAddModal(true) }
    document.addEventListener('td:new-strategy', handler)
    return () => document.removeEventListener('td:new-strategy', handler)
  }, [])

  const saveAdd = () => {
    if (!form.name.trim()) return
    const rules = form.rules.filter(r => r.trim())
    const sections = rules.length ? [{ id: 'rules', n: 1, title: 'Rules', col: 'gray', items: rules.map((r, i) => ({ id: `r${i}`, label: r })) }] : []
    onUpsert({ id: uid(), name: form.name, desc: form.desc, active: true, variants: [], totals: {}, sections })
    setAddModal(false)
  }
  const saveEdit = () => { if (!form.name.trim()) return; onUpsert({ ...editTarget, name: form.name, desc: form.desc }); setEditTarget(null) }
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
          const tt  = trades.filter(t => t.strategyId === st.id)
          const wr  = tt.length ? Math.round(tt.filter(t => t.outcome === 'win').length / tt.length * 100) : 0
          const rules = (st.sections ?? []).flatMap(s => s.items ?? []).filter(i => !i.detail).slice(0, 5)

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
                    onEdit={() => { setForm({ name: st.name, desc: st.desc ?? '' }); setEditTarget(st) }}
                    onDelete={() => setDeleteTarget(st)}
                  />
                </div>
              </div>

              {/* Name */}
              <h3 style={{ fontSize: 18, fontWeight: 700, color: st.active ? 'var(--green)' : 'var(--text)', margin: '0 0 14px' }}>{st.name}</h3>

              {/* Rule tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24, minHeight: 80 }}>
                {rules.map((item, i) => (
                  <span key={i} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border)', color: 'var(--text-2)', background: 'var(--surface-2)' }}>
                    {item.label}
                  </span>
                ))}
                {rules.length === 0 && st.desc && (
                  <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0 }}>{st.desc}</p>
                )}
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

      {/* Add modal */}
      {addModal && <CreateModal form={form} setForm={setForm} f={f} onClose={() => setAddModal(false)} onSave={saveAdd}/>}
      {editTarget && <FormModal title="Edit Strategy" form={form} f={f} onClose={() => setEditTarget(null)} onSave={saveEdit} saveLabel="Save"/>}
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

function CreateModal({ form, setForm, f, onClose, onSave }) {
  const setRule = (i, v) => setForm(p => { const r = [...p.rules]; r[i] = v; return { ...p, rules: r } })
  const addRule = () => setForm(p => ({ ...p, rules: [...p.rules, ''] }))
  const removeRule = i => setForm(p => ({ ...p, rules: p.rules.filter((_, j) => j !== i) }))
  return (
    <LightModal title="Create New Strategy" onClose={onClose} wide>
      <label style={lbl}>Strategy Name</label>
      <input className="t-inp" style={{ marginBottom: 20, fontSize: 15, padding: '12px 14px' }} value={form.name} onChange={f('name')} placeholder="e.g. Resistance Breakout" autoFocus/>
      <label style={lbl}>Description</label>
      <textarea className="t-inp" style={{ height: 100, resize: 'vertical', marginBottom: 20, fontSize: 15, padding: '12px 14px' }} value={form.desc} onChange={f('desc')} placeholder="Briefly describe the strategy..."/>
      <label style={lbl}>Initial Rules</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
        {form.rules.map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input className="t-inp" style={{ fontSize: 15, padding: '12px 14px' }} value={r} onChange={e => setRule(i, e.target.value)} placeholder={`Rule ${i + 1}`}/>
            {form.rules.length > 1 && (
              <button onClick={() => removeRule(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 20, lineHeight: 1, padding: '0 4px', flexShrink: 0 }}>×</button>
            )}
          </div>
        ))}
      </div>
      <button onClick={addRule} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--green)', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, padding: 0, marginBottom: 28, fontFamily: 'Inter, sans-serif' }}>
        <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add another rule
      </button>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn-outline" style={{ padding: '11px 24px', fontSize: 15 }} onClick={onClose}>Cancel</button>
        <button className="btn-green" style={{ padding: '11px 28px', fontSize: 15 }} onClick={onSave}>Create Strategy</button>
      </div>
    </LightModal>
  )
}

function FormModal({ title, form, f, onClose, onSave, saveLabel }) {
  return (
    <LightModal title={title} onClose={onClose}>
      <label style={lbl}>Strategy name *</label>
      <input className="t-inp" style={{ marginBottom: 16 }} value={form.name} onChange={f('name')} placeholder="e.g. Resistance Breakout" autoFocus/>
      <label style={lbl}>Description (optional)</label>
      <textarea className="t-inp" style={{ height: 80, resize: 'vertical', marginBottom: 20 }} value={form.desc} onChange={f('desc')} placeholder="When do you use this strategy?"/>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn-outline" style={{ padding: '8px 18px' }} onClick={onClose}>Cancel</button>
        <button className="btn-green" style={{ padding: '8px 20px' }} onClick={onSave}>{saveLabel}</button>
      </div>
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
