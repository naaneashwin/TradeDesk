import { useState } from 'react'
import { Modal, uid } from './ui'

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

const TODAY = new Date().toISOString().slice(0, 10)

export default function LogModal({ strategy, onSave, onUpdate, onClose, variant, score, trade: editTrade }) {
  const isEdit = !!editTrade

  const [form, setForm] = useState({
    date:        isEdit ? editTrade.date        : TODAY,
    instrument:  isEdit ? editTrade.instrument  : '',
    direction:   isEdit ? editTrade.direction   : 'long',
    entryPrice:  isEdit ? String(editTrade.entryPrice) : '',
    qty:         isEdit ? String(editTrade.qty)        : '',
    notes:       isEdit ? (editTrade.notes || '')      : '',
    mock:        isEdit ? (editTrade.mock ?? false)    : false,
  })

  const defaultExits = isEdit && editTrade.exits?.length
    ? editTrade.exits.map(e => ({
        id:        e.id,
        exitDate:  e.exitDate || editTrade.date,
        exitPrice: String(e.exitPrice),
        qty:       String(e.qty),
      }))
    : [{ id: uid(), exitPrice: '', qty: '', exitDate: TODAY }]

  const [exits, setExits] = useState(defaultExits)

  const fEntry = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const fExit  = (id, k, v) => setExits(prev => prev.map(e => e.id === id ? { ...e, [k]: v } : e))
  const addExit    = () => setExits(prev => [...prev, { id: uid(), exitPrice: '', qty: '', exitDate: TODAY }])
  const removeExit = id => setExits(prev => prev.filter(e => e.id !== id))

  const entryPrice = parseFloat(form.entryPrice) || 0
  const entryQty   = parseFloat(form.qty)        || 0
  const dir        = form.direction

  const exitsCalc = exits.map(e => {
    const ep  = parseFloat(e.exitPrice) || 0
    const qty = parseFloat(e.qty)       || 0
    const pnl = (ep && qty && entryPrice) ? (ep - entryPrice) * qty * (dir === 'short' ? -1 : 1) : null
    return { ...e, pnlCalc: pnl }
  })

  const totalExitQty    = exitsCalc.reduce((s, e) => s + (parseFloat(e.qty) || 0), 0)
  const totalPnl        = exitsCalc.reduce((s, e) => s + (e.pnlCalc ?? 0), 0)
  const hasExits        = exitsCalc.some(e => e.exitPrice && e.qty)
  const weightedAvgExit = totalExitQty > 0
    ? exitsCalc.reduce((s, e) => s + (parseFloat(e.exitPrice) || 0) * (parseFloat(e.qty) || 0), 0) / totalExitQty
    : 0
  const outcome   = hasExits ? (totalPnl > 0 ? 'win' : totalPnl < 0 ? 'loss' : 'breakeven') : 'open'
  const pnlColor  = totalPnl > 0 ? 'var(--green)' : totalPnl < 0 ? 'var(--red)' : 'var(--text-2)'
  const exitedPct = entryQty > 0 ? Math.min((totalExitQty / entryQty) * 100, 100) : 0

  const buildPayload = () => {
    const filledExits = exitsCalc.filter(e => e.exitPrice && e.qty)
    return {
      id:             isEdit ? editTrade.id : uid(),
      strategyId:     isEdit ? editTrade.strategyId     : strategy.id,
      variant:        isEdit ? editTrade.variant        : variant,
      checklistScore: isEdit ? editTrade.checklistScore : score,
      date:           form.date,
      instrument:     form.instrument.trim(),
      direction:      dir,
      notes:          form.notes,
      entryPrice,
      qty:            entryQty,
      exitPrice:      weightedAvgExit,
      pnl:            hasExits ? totalPnl : 0,
      outcome,
      mock: form.mock,
      exits: filledExits.map(e => ({
        id:        e.id,
        exitDate:  e.exitDate || form.date,
        exitPrice: parseFloat(e.exitPrice) || 0,
        qty:       parseFloat(e.qty)       || 0,
        pnl:       e.pnlCalc ?? 0,
      })),
    }
  }

  const save = () => {
    if (!form.instrument.trim()) return
    if (isEdit) onUpdate(buildPayload())
    else        onSave(buildPayload())
  }

  return (
    <Modal title={isEdit ? 'Edit Trade' : 'Log Trade'} subtitle={`${strategy.name}${variant ? ` · ${variant.toUpperCase()}` : ''} · Checklist ${score.done}/${score.total}`} onClose={onClose}>

      {/* ── Entry ─────────────────────────────────────────── */}
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Entry</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        <Field label="Date">
          <input type="date" className="t-inp" value={form.date} onChange={e => fEntry('date', e.target.value)}/>
        </Field>
        <Field label="Instrument">
          <input type="text" className="t-inp" value={form.instrument} onChange={e => fEntry('instrument', e.target.value)} placeholder="e.g. RELIANCE"/>
        </Field>
        <Field label="Direction">
          <select className="t-inp" value={form.direction} onChange={e => fEntry('direction', e.target.value)}>
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </Field>
        <Field label="Entry Price (₹)">
          <input type="number" className="t-inp font-mono" value={form.entryPrice} onChange={e => fEntry('entryPrice', e.target.value)} placeholder="0.00"/>
        </Field>
        <Field label="Total Quantity">
          <input type="number" className="t-inp font-mono" value={form.qty} onChange={e => fEntry('qty', e.target.value)} placeholder="0"/>
        </Field>
      </div>

      {/* ── Exits ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: entryQty > 0 ? 8 : 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Exits</p>
          {entryQty > 0 && (
            <span style={{ fontSize: 11, color: exitedPct >= 100 ? 'var(--green)' : 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>
              {totalExitQty} / {entryQty} qty
            </span>
          )}
        </div>
        <button onClick={addExit} style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', color: 'var(--text-2)', fontFamily: 'Inter, sans-serif' }}>
          + Add Exit
        </button>
      </div>

      {/* Qty progress bar */}
      {entryQty > 0 && (
        <div style={{ height: 3, borderRadius: 3, background: 'var(--border)', overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ height: '100%', width: `${exitedPct}%`, background: exitedPct >= 100 ? 'var(--green)' : '#3b82f6', borderRadius: 3, transition: 'width 0.3s' }}/>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {exitsCalc.map((e, i) => {
          const pL = e.pnlCalc
          const pC = pL != null ? (pL > 0 ? 'var(--green)' : pL < 0 ? 'var(--red)' : 'var(--text-2)') : 'var(--text-3)'
          return (
            <div key={e.id} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: `1fr 1fr 1fr 80px${exits.length > 1 ? ' 28px' : ''}`, gap: 12, alignItems: 'end' }}>
                <Field label={`Exit ${i + 1} — Qty`}>
                  <input type="number" className="t-inp font-mono" value={e.qty} onChange={ev => fExit(e.id, 'qty', ev.target.value)} placeholder="0"/>
                </Field>
                <Field label="Exit Price (₹)">
                  <input type="number" className="t-inp font-mono" value={e.exitPrice} onChange={ev => fExit(e.id, 'exitPrice', ev.target.value)} placeholder="0.00"/>
                </Field>
                <Field label="Exit Date">
                  <input type="date" className="t-inp" value={e.exitDate} onChange={ev => fExit(e.id, 'exitDate', ev.target.value)}/>
                </Field>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>P&L</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: pC, fontFamily: 'JetBrains Mono, monospace', margin: 0, whiteSpace: 'nowrap' }}>
                    {pL != null ? `${pL >= 0 ? '+' : ''}₹${pL.toFixed(0)}` : '—'}
                  </p>
                </div>
                {exits.length > 1 && (
                  <button onClick={() => removeExit(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-3)', lineHeight: 1, padding: 0, alignSelf: 'center', marginTop: 10 }}>×</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Total P&L summary — only when at least one exit is filled */}
      {hasExits && (
        <div style={{
          background: totalPnl > 0 ? 'var(--green-light)' : totalPnl < 0 ? 'rgba(220,38,38,0.06)' : 'var(--surface-2)',
          border: `1px solid ${totalPnl > 0 ? 'rgba(45,122,95,0.2)' : totalPnl < 0 ? 'rgba(220,38,38,0.2)' : 'var(--border)'}`,
          borderRadius: 10, padding: '14px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 14,
        }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>
              Total Realized P&L{exits.filter(e => e.exitPrice && e.qty).length > 1 ? ` · ${exits.filter(e => e.exitPrice && e.qty).length} exits` : ''}
            </p>
            <p style={{ fontSize: 20, fontWeight: 800, color: pnlColor, margin: 0, fontFamily: 'JetBrains Mono, monospace' }}>
              {totalPnl >= 0 ? '+' : ''}₹{totalPnl.toFixed(2)}
            </p>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
            background: totalPnl > 0 ? 'rgba(45,122,95,0.12)' : totalPnl < 0 ? 'rgba(220,38,38,0.12)' : 'var(--surface)',
            color: pnlColor,
            border: `1px solid ${totalPnl > 0 ? 'rgba(45,122,95,0.3)' : totalPnl < 0 ? 'rgba(220,38,38,0.3)' : 'var(--border)'}`,
          }}>
            {outcome.toUpperCase()}
          </span>
        </div>
      )}

      {/* Mock trade toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, padding: '12px 14px', background: form.mock ? 'rgba(217,119,6,0.06)' : 'var(--surface-2)', border: `1px solid ${form.mock ? 'rgba(217,119,6,0.25)' : 'var(--border)'}`, borderRadius: 10, cursor: 'pointer' }}
        onClick={() => fEntry('mock', !form.mock)}>
        <div style={{ display: 'flex', gap: 10 }}>
          {['real', 'mock'].map(opt => {
            const active = (opt === 'mock') === form.mock
            return (
              <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 500, color: active ? (opt === 'mock' ? '#d97706' : 'var(--green)') : 'var(--text-2)' }}
                onClick={e => { e.stopPropagation(); fEntry('mock', opt === 'mock') }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${active ? (opt === 'mock' ? '#d97706' : 'var(--green)') : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {active && <div style={{ width: 7, height: 7, borderRadius: '50%', background: opt === 'mock' ? '#d97706' : 'var(--green)' }}/>}
                </div>
                {opt === 'real' ? 'Real Trade' : 'Mock / Paper Trade'}
              </label>
            )
          })}
        </div>
        {form.mock && <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#d97706', background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.25)', padding: '2px 9px', borderRadius: 20 }}>MOCK</span>}
      </div>

      <Field label="Notes">
        <textarea className="t-inp" style={{ height: 72, resize: 'vertical', marginBottom: 20 }} value={form.notes} onChange={e => fEntry('notes', e.target.value)} placeholder="What went right? What went wrong?"/>
      </Field>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn-outline" style={{ padding: '9px 20px' }} onClick={onClose}>Cancel</button>
        <button className="btn-green" style={{ padding: '9px 22px' }} onClick={save}>{isEdit ? 'Update Trade' : 'Save Trade'}</button>
      </div>
    </Modal>
  )
}
