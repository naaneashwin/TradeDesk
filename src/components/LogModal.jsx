import React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react'
import { Modal, uid } from './ui'
import { getCustomExitStrategies, addCustomExitStrategy } from '../lib/db'

function SymbolSearch({ value, onChange }) {
  const [query,   setQuery]   = useState(value)
  const [results, setResults] = useState([])
  const [open,    setOpen]    = useState(false)
  const [hi,      setHi]      = useState(-1)
  const [loading, setLoading] = useState(false)
  const ref      = useRef()
  const timerRef = useRef()

  useEffect(() => { setQuery(value) }, [value])

  const fetchResults = useCallback(async (q) => {
    if (!q || q.length < 1) { setResults([]); setOpen(false); return }
    // Skip symbol search in local development — Netlify functions aren't available
    if (import.meta.env.DEV) return
    setLoading(true)
    try {
      const res = await fetch(`/api/symbols?q=${encodeURIComponent(q)}`)
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      if (Array.isArray(data)) {
        setResults(data)
        setOpen(data.length > 0)
      }
    } catch {
      setResults([])
      setOpen(false)
    } finally {
      setLoading(false)
    }
    setHi(-1)
  }, [])

  useEffect(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => fetchResults(query), 300)
    return () => clearTimeout(timerRef.current)
  }, [query, fetchResults])

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const select = s => {
    setQuery(s.symbol)
    onChange(s.symbol)
    setOpen(false)
  }

  const onKey = e => {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => Math.min(h + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHi(h => Math.max(h - 1, 0)) }
    if (e.key === 'Enter' && hi >= 0) { e.preventDefault(); select(results[hi]) }
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        type="text"
        className="t-inp"
        value={query}
        placeholder="e.g. RELIANCE"
        onChange={e => { setQuery(e.target.value); onChange(e.target.value) }}
        onFocus={() => { if (results.length > 0 && query.length > 0) setOpen(true) }}
        onKeyDown={onKey}
        autoComplete="off"
      />
      {loading && (
        <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-3)' }}>…</span>
      )}
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 200,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.14)', overflow: 'hidden',
        }}>
          {results.map((s, i) => (
            <div key={`${s.symbol}-${i}`}
              onMouseDown={() => select(s)}
              onMouseEnter={() => setHi(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
                cursor: 'pointer', background: i === hi ? 'var(--surface-2)' : 'transparent',
                borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', minWidth: 110 }}>{s.symbol}</span>
              <span style={{ fontSize: 12, color: 'var(--text-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 6,
                background: s.exchange === 'NSE' ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)',
                color: s.exchange === 'NSE' ? '#3b82f6' : '#d97706',
                border: `1px solid ${s.exchange === 'NSE' ? 'rgba(59,130,246,0.25)' : 'rgba(245,158,11,0.25)'}`,
              }}>{s.exchange}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

const PRESET_EXIT_STRATEGIES = [
  'Target Hit',
  'Stop Loss',
  'Trailing Stop',
  'Partial Profit Booking',
  'Time-Based Exit',
  'Reversal Signal',
  'Manual / Discretionary',
]

const TODAY = new Date().toISOString().slice(0, 10)

export default function LogModal({ strategy, onSave, onUpdate, onClose, variant, score, trade: editTrade, prefill }) {
  const isEdit = !!editTrade
  const [customStrategies, setCustomStrategies] = useState([])

  useEffect(() => {
    getCustomExitStrategies().then(setCustomStrategies).catch(() => {})
  }, [])

  const [form, setForm] = useState({
    date:          isEdit ? editTrade.date        : TODAY,
    instrument:    isEdit ? editTrade.instrument  : (prefill?.instrument ?? ''),
    direction:     isEdit ? editTrade.direction   : 'long',
    entryPrice:    isEdit ? String(editTrade.entryPrice) : '',
    stopLoss:      isEdit ? (editTrade.initialSl != null ? String(editTrade.initialSl) : '') : '',
    qty:           isEdit ? String(editTrade.qty)        : '',
    commission:    isEdit ? (editTrade.commission != null ? String(editTrade.commission) : '') : '',
    screenshotUrl: isEdit ? (editTrade.screenshotUrl ?? '') : '',
    planThesis:    isEdit ? (editTrade.planThesis  ?? '') : (prefill?.planThesis ?? ''),
    planTarget:    isEdit ? (editTrade.planTarget  != null ? String(editTrade.planTarget) : '') : (prefill?.planTarget != null ? String(prefill.planTarget) : ''),
    planStop:      isEdit ? (editTrade.planStop    != null ? String(editTrade.planStop)   : '') : (prefill?.planStop   != null ? String(prefill.planStop)   : ''),
    notes:         isEdit ? (editTrade.notes || '')      : '',
    mock:          isEdit ? (editTrade.mock ?? false)    : false,
  })

  const defaultExits = isEdit && editTrade.exits?.length
    ? editTrade.exits.map(e => ({
        id:           e.id,
        exitDate:     e.exitDate || editTrade.date,
        exitPrice:    String(e.exitPrice),
        qty:          String(e.qty),
        exitStrategy: e.exitStrategy || '',
      }))
    : [{ id: uid(), exitPrice: '', qty: '', exitDate: TODAY, exitStrategy: '' }]

  const [exits, setExits] = useState(defaultExits)

  const fEntry = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const fExit  = (id, k, v) => setExits(prev => prev.map(e => e.id === id ? { ...e, [k]: v } : e))
  const addExit    = () => setExits(prev => [...prev, { id: uid(), exitPrice: '', qty: '', exitDate: TODAY, exitStrategy: '' }])
  const removeExit = id => setExits(prev => prev.filter(e => e.id !== id))

  const entryPrice = parseFloat(form.entryPrice) || 0
  const entryQty   = parseFloat(form.qty)        || 0
  const stopLoss   = parseFloat(form.stopLoss)   || 0
  const dir        = form.direction

  const initialRisk = entryPrice > 0 && stopLoss > 0
    ? Math.abs(entryPrice - stopLoss)
    : 0

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

  const pnlPerShare = entryQty > 0 && hasExits ? totalPnl / entryQty : null
  const rMult = pnlPerShare != null && initialRisk > 0
    ? Math.round((pnlPerShare / initialRisk) * 100) / 100
    : null

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
      mock:           form.mock,
      initialSl:      stopLoss || null,
      rMult,
      commission:     parseFloat(form.commission)  || null,
      screenshotUrl:  form.screenshotUrl.trim()    || null,
      planThesis:     form.planThesis.trim()       || null,
      planTarget:     parseFloat(form.planTarget)  || null,
      planStop:       parseFloat(form.planStop)    || null,
      exits: filledExits.map(e => ({
        id:           e.id,
        exitDate:     e.exitDate || form.date,
        exitPrice:    parseFloat(e.exitPrice) || 0,
        qty:          parseFloat(e.qty)       || 0,
        pnl:          e.pnlCalc ?? 0,
        exitStrategy: e.exitStrategy || '',
      })),
    }
  }

  const [checklistWarn, setChecklistWarn] = React.useState(false)

  const save = () => {
    if (!form.instrument.trim()) return

    // Checklist gate: require >50% completion (or a second click to override)
    if (!checklistWarn && score.total > 0 && score.done / score.total < 0.5) {
      setChecklistWarn(true)
      return
    }
    setChecklistWarn(false)

    const payload = buildPayload()
    // Persist any custom (non-preset) exit strategies entered by the user
    const newCustom = payload.exits
      .map(e => e.exitStrategy)
      .filter(s => s && !PRESET_EXIT_STRATEGIES.includes(s) && !customStrategies.includes(s))
    newCustom.forEach(label => {
      addCustomExitStrategy(label).catch(() => {})
    })
    if (newCustom.length) setCustomStrategies(prev => [...prev, ...newCustom])
    if (isEdit) onUpdate(payload)
    else        onSave(payload)
  }

  return (
    <Modal title={isEdit ? 'Edit Trade' : 'Log Trade'} subtitle={`${strategy.name}${variant ? ` · ${variant.toUpperCase()}` : ''} · Checklist ${score.done}/${score.total}`} onClose={onClose}>

      {/* ── Checklist warning ─────────────────────────────── */}
      {checklistWarn && (
        <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 8, background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.35)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#d97706' }}>Checklist incomplete ({score.done}/{score.total} items)</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>Less than 50% of checklist items are checked. Click Save again to log anyway.</div>
          </div>
          <button onClick={() => setChecklistWarn(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-3)', lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* ── Entry ─────────────────────────────────────────── */}
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Entry</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        <Field label="Date">
          <input type="date" className="t-inp" value={form.date} onChange={e => fEntry('date', e.target.value)}/>
        </Field>
        <Field label="Instrument">
          <SymbolSearch value={form.instrument} onChange={v => fEntry('instrument', v)} />
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
        <Field label="Stop Loss (₹)">
          <input type="number" className="t-inp font-mono" value={form.stopLoss} onChange={e => fEntry('stopLoss', e.target.value)} placeholder="0.00"/>
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
              <div style={{ marginTop: 10 }}>
                <Field label="Exit Strategy">
                  <input
                    list={`exit-strategy-list-${e.id}`}
                    className="t-inp"
                    value={e.exitStrategy}
                    onChange={ev => fExit(e.id, 'exitStrategy', ev.target.value)}
                    placeholder="Select or type a reason…"
                    autoComplete="off"
                  />
                  <datalist id={`exit-strategy-list-${e.id}`}>
                    {PRESET_EXIT_STRATEGIES.map(s => <option key={s} value={s}/>)}
                    {customStrategies.map(s => <option key={s} value={s}/>)}
                  </datalist>
                </Field>
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
            {rMult != null && (
              <p style={{ fontSize: 12, fontWeight: 700, color: rMult > 0 ? 'var(--green)' : 'var(--red)', margin: '4px 0 0', fontFamily: 'JetBrains Mono, monospace' }}>
                {rMult > 0 ? '+' : ''}{rMult}R
              </p>
            )}
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

      {/* ── Pre-Trade Plan ────────────────────────────────── */}
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Pre-Trade Plan</p>
      <Field label="Thesis / Reason to Trade">
        <textarea className="t-inp" style={{ height: 60, resize: 'vertical', marginBottom: 14 }} value={form.planThesis} onChange={e => fEntry('planThesis', e.target.value)} placeholder="Why are you entering this trade?"/>
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        <Field label="Target Price (₹)">
          <input type="number" className="t-inp font-mono" value={form.planTarget} onChange={e => fEntry('planTarget', e.target.value)} placeholder="0.00"/>
        </Field>
        <Field label="Planned Stop (₹)">
          <input type="number" className="t-inp font-mono" value={form.planStop} onChange={e => fEntry('planStop', e.target.value)} placeholder="0.00"/>
        </Field>
      </div>

      {/* ── Trade Details ─────────────────────────────────── */}
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Trade Details</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        <Field label="Commission / Brokerage (₹)">
          <input type="number" className="t-inp font-mono" value={form.commission} onChange={e => fEntry('commission', e.target.value)} placeholder="0.00"/>
        </Field>
        <Field label="Screenshot URL">
          <input type="url" className="t-inp" value={form.screenshotUrl} onChange={e => fEntry('screenshotUrl', e.target.value)} placeholder="https://…"/>
        </Field>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn-outline" style={{ padding: '9px 20px' }} onClick={onClose}>Cancel</button>
        <button
          className="btn-green"
          style={{ padding: '9px 22px', ...(checklistWarn ? { background: '#d97706', borderColor: '#d97706' } : {}) }}
          onClick={save}
        >
          {checklistWarn ? 'Save Anyway' : isEdit ? 'Update Trade' : 'Save Trade'}
        </button>
      </div>
    </Modal>
  )
}
