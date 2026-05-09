import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import LogModal from './LogModal'
import { expandSectionsForChecklist, getScanners, upsertScanner, deleteScanner } from '../lib/db'
import { uid } from './ui'

const COL = {
  purple: ['#1e2a4a','#c7c4f0'], indigo: ['#1e2a4a','#a8a4e8'], blue: ['#1e2a4a','#93c5fd'],
  teal:   ['#1e2a4a','#6ee7d4'], amber:  ['#1e2a4a','#fcd34d'], coral: ['#1e2a4a','#fca5a5'],
  red:    ['#1e2a4a','#fca5a5'], green:  ['#1e2a4a','#86efac'], gray:  ['#374151','#d1d5db'],
}

const ITEM_COLOR_HEX = {
  gray: '#d1d5db', indigo: '#a8a4e8', purple: '#c7c4f0',
  blue: '#93c5fd', teal:   '#6ee7d4', amber:  '#fcd34d',
  coral: '#fca5a5', green: '#86efac',
}

function Checkbox({ checked, onChange }) {
  return (
    <button role="checkbox" aria-checked={checked} onClick={onChange}
      style={{
        width: 20, height: 20, borderRadius: 4, border: `2px solid ${checked ? 'var(--green)' : '#d1d5db'}`,
        background: checked ? 'var(--green)' : 'var(--surface)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
        transition: 'all 0.15s',
      }}>
      {checked && (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="2 6 5 9 10 3"/>
        </svg>
      )}
    </button>
  )
}

const STAT_ICONS = {
  variants:  { bg: '#e8f0fe', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f6ef7" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> },
  trades:    { bg: '#e6f9f0', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> },
  winrate:   { bg: '#f0eaff', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg> },
  duration:  { bg: '#fff4e6', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
  profit:    { bg: '#e6f9f0', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/></svg> },
  drawdown:  { bg: '#fef2f2', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg> },
}

function ChecklistStatCard({ iconKey, label, value }) {
  const { bg, icon } = STAT_ICONS[iconKey]
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{value}</p>
      </div>
    </div>
  )
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmt(d) { return d.toISOString().slice(0,10) }
function addMonths(d, n) { const r = new Date(d); r.setMonth(r.getMonth() + n); return r }

function BacktestingTab({ trades, strategyId }) {
  const today = new Date()
  const [startDate, setStartDate] = useState(fmt(addMonths(today, -12)))
  const [endDate,   setEndDate]   = useState(fmt(today))
  const [result,    setResult]    = useState(null)

  const presets = [
    { label: '1M', months: 1 }, { label: '3M', months: 3 },
    { label: '6M', months: 6 }, { label: '1Y', months: 12 },
  ]

  function applyPreset(months) {
    setEndDate(fmt(today))
    setStartDate(fmt(addMonths(today, -months)))
  }

  function runBacktest() {
    const s = new Date(startDate), e = new Date(endDate)
    const filtered = trades.filter(t => {
      if (t.strategyId !== strategyId) return false
      const d = new Date(t.date ?? t.created_at)
      return d >= s && d <= e
    }).sort((a, b) => new Date(a.date ?? a.created_at) - new Date(b.date ?? b.created_at))

    if (!filtered.length) { setResult({ empty: true }); return }

    let equity = 0, peak = 0, maxDD = 0
    const wins = filtered.filter(t => t.outcome === 'win')
    const pnls = filtered.map(t => t.pnl ?? 0)
    const totalPnl = pnls.reduce((a, b) => a + b, 0)
    const grossWin  = pnls.filter(p => p > 0).reduce((a, b) => a + b, 0)
    const grossLoss = Math.abs(pnls.filter(p => p < 0).reduce((a, b) => a + b, 0))
    const pf = grossLoss > 0 ? (grossWin / grossLoss).toFixed(2) : '∞'

    // Build monthly equity curve
    const byMonth = {}
    filtered.forEach(t => {
      const d = new Date(t.date ?? t.created_at)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      byMonth[key] = (byMonth[key] ?? 0) + (Number(t.pnl) || 0)
    })

    // Fill all months in range
    const curve = []
    let cur = new Date(s.getFullYear(), s.getMonth(), 1)
    const end = new Date(e.getFullYear(), e.getMonth(), 1)
    while (cur <= end) {
      const key = `${cur.getFullYear()}-${cur.getMonth()}`
      equity += byMonth[key] ?? 0
      if (equity > peak) peak = equity
      const dd = peak > 0 ? (equity - peak) / peak * 100 : 0
      if (dd < maxDD) maxDD = dd
      curve.push({ month: `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}`, label: MONTHS[cur.getMonth()], equity: Math.round(equity) })
      cur = addMonths(cur, 1)
    }

    setResult({
      totalPnl, winRate: filtered.length ? Math.round(wins.length / filtered.length * 100) : 0,
      pf, trades: filtered.length, maxDD: maxDD.toFixed(1), curve,
    })
  }

  const activePreset = presets.find(p => {
    const expected = fmt(addMonths(today, -p.months))
    return startDate === expected && endDate === fmt(today)
  })?.label

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Run Simulation card */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px' }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Run Simulation</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          {/* Start date */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              style={{ padding: '9px 12px', border: '1px solid var(--border-2)', borderRadius: 8, fontSize: 13, color: 'var(--text)', background: 'var(--surface)', fontFamily: 'Inter, sans-serif', cursor: 'pointer', outline: 'none' }}/>
          </div>
          {/* End date */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              style={{ padding: '9px 12px', border: '1px solid var(--border-2)', borderRadius: 8, fontSize: 13, color: 'var(--text)', background: 'var(--surface)', fontFamily: 'Inter, sans-serif', cursor: 'pointer', outline: 'none' }}/>
          </div>
          {/* Quick presets */}
          <div style={{ display: 'flex', gap: 6 }}>
            {presets.map(p => (
              <button key={p.label} onClick={() => applyPreset(p.months)}
                style={{
                  padding: '9px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  border: '1px solid var(--border-2)', fontFamily: 'Inter, sans-serif',
                  background: activePreset === p.label ? 'var(--surface-2)' : 'transparent',
                  color: activePreset === p.label ? 'var(--text)' : 'var(--text-2)',
                  transition: 'all 0.15s',
                }}>{p.label}</button>
            ))}
          </div>
          {/* Run button */}
          <button onClick={runBacktest}
            style={{
              marginLeft: 'auto', padding: '9px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'var(--green)', color: '#fff', fontSize: 13, fontWeight: 600,
              fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: 8,
            }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Run Backtest
          </button>
        </div>
      </div>

      {/* Results */}
      {result && !result.empty && (
        <>
          {/* Stat row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 140px), 1fr))', gap: 10 }}>
            {[
              { label: 'TOTAL PNL',     value: `${result.totalPnl >= 0 ? '+' : ''}₹${result.totalPnl.toLocaleString()}`, col: result.totalPnl >= 0 ? 'var(--green)' : 'var(--red)' },
              { label: 'WIN RATE',      value: `${result.winRate}%`,   col: 'var(--text)' },
              { label: 'PROFIT FACTOR', value: result.pf,              col: 'var(--text)' },
              { label: 'TRADES',        value: result.trades,          col: 'var(--text)' },
              { label: 'MAX DD',        value: `${result.maxDD}%`,     col: 'var(--red)'  },
            ].map(({ label, value, col }) => (
              <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{label}</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: col, margin: 0, fontFamily: 'JetBrains Mono, monospace' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Equity curve */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>Simulated Equity Curve</p>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={result.curve} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--green)" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="var(--green)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="month" tickFormatter={v => v.split('-')[1] ? MONTHS[parseInt(v.split('-')[1])-1] : v} tick={{ fontSize: 12, fill: 'var(--text-3)' }} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} tick={{ fontSize: 12, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} width={52}/>
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    const val = payload[0]?.value ?? payload[0]?.payload?.equity ?? 0
                    const [yr, mo] = label.split('-')
                    const displayLabel = mo ? `${MONTHS[parseInt(mo)-1]} ${yr}` : label
                    return (
                      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                        <p style={{ color: 'var(--text-2)', marginBottom: 4 }}>{displayLabel}</p>
                        <p style={{ color: 'var(--green)', fontWeight: 600 }}>₹{Number(val).toLocaleString('en-IN')}</p>
                      </div>
                    )
                  }}
                />
                <Area type="monotoneX" dataKey="equity" stroke="var(--green)" strokeWidth={2.5}
                  fill="url(#eqGrad)" dot={false} activeDot={{ r: 4, fill: 'var(--green)' }}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {result?.empty && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '40px 24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>No trades found in this date range for this strategy.</p>
        </div>
      )}
    </div>
  )
}

// ── Tag color palette ─────────────────────────────────────────
const TAG_COLORS = [
  { bg: 'rgba(79,110,247,0.1)',  border: 'rgba(79,110,247,0.3)',  text: '#4f6ef7'        },
  { bg: 'rgba(45,122,95,0.1)',   border: 'rgba(45,122,95,0.3)',   text: 'var(--green)'   },
  { bg: 'rgba(217,119,6,0.1)',   border: 'rgba(217,119,6,0.3)',   text: '#d97706'        },
  { bg: 'rgba(139,92,246,0.1)',  border: 'rgba(139,92,246,0.3)',  text: '#8b5cf6'        },
  { bg: 'rgba(236,72,153,0.1)',  border: 'rgba(236,72,153,0.3)',  text: '#ec4899'        },
  { bg: 'rgba(6,182,212,0.1)',   border: 'rgba(6,182,212,0.3)',   text: '#06b6d4'        },
  { bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.3)',  text: '#f97316'        },
  { bg: 'rgba(168,162,232,0.12)',border: 'rgba(168,162,232,0.4)', text: '#a8a4e8'        },
]
function tagStyle(tag) {
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  const c = TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
  return c
}

// ── Scanner form / modal ──────────────────────────────────────
function ScannerModal({ initial, onSave, onClose }) {
  const [name, setName]         = useState(initial?.name        ?? '')
  const [url,  setUrl]          = useState(initial?.url         ?? '')
  const [desc, setDesc]         = useState(initial?.description ?? '')
  const [tags, setTags]         = useState(initial?.tags        ?? [])
  const [tagInput, setTagInput] = useState('')
  const [error, setError]       = useState('')

  const addTag = () => {
    const t = tagInput.trim()
    if (!t || tags.includes(t)) { setTagInput(''); return }
    setTags(prev => [...prev, t])
    setTagInput('')
  }
  const removeTag = (t) => setTags(prev => prev.filter(x => x !== t))

  const handleSave = () => {
    if (!name.trim()) { setError('Name is required.'); return }
    if (!url.trim())  { setError('URL is required.'); return }
    try { new URL(url.trim()) } catch { setError('Please enter a valid URL (include https://).'); return }
    onSave({ name: name.trim(), url: url.trim(), description: desc.trim(), tags })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{initial ? 'Edit Scanner' : 'Add Scanner'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--text-3)', padding: '0 4px', lineHeight: 1 }}>×</button>
        </div>

        {error && <p style={{ fontSize: 13, color: 'var(--red)', marginBottom: 14, padding: '8px 12px', background: 'rgba(220,38,38,0.07)', borderRadius: 8 }}>{error}</p>}

        {/* Name */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Scanner Name *</label>
          <input className="t-inp" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. 52-Week Breakout" style={{ width: '100%' }}/>
        </div>

        {/* URL */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Chartink URL *</label>
          <input className="t-inp" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://chartink.com/screener/..." style={{ width: '100%' }}/>
        </div>

        {/* Description */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Description <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
          <textarea className="t-inp" value={desc} onChange={e => setDesc(e.target.value)} placeholder="What does this scanner look for?" rows={2} style={{ width: '100%', resize: 'vertical' }}/>
        </div>

        {/* Tags */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Tags</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            {tags.map(t => {
              const c = tagStyle(t)
              return (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
                  {t}
                  <button onClick={() => removeTag(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, padding: 0, fontSize: 13, lineHeight: 1, opacity: 0.7 }}>×</button>
                </span>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="t-inp" value={tagInput} onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
              placeholder="Type tag + Enter  (e.g. momentum, breakout…)" style={{ flex: 1 }}/>
            <button onClick={addTag}
              style={{ padding: '9px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-2)', fontFamily: 'Inter, sans-serif' }}>Add</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn-outline" style={{ padding: '9px 20px' }} onClick={onClose}>Cancel</button>
          <button className="btn-green"   style={{ padding: '9px 20px' }} onClick={handleSave}>{initial ? 'Save Changes' : 'Add Scanner'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Scanners tab ──────────────────────────────────────────────
function ScannersTab({ strategyId }) {
  const [scanners,    setScanners]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showModal,   setShowModal]   = useState(false)
  const [editTarget,  setEditTarget]  = useState(null)
  const [deleteId,    setDeleteId]    = useState(null)

  useEffect(() => {
    setLoading(true)
    getScanners(strategyId)
      .then(setScanners)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [strategyId])

  const handleSave = async (data) => {
    const scanner = { id: editTarget?.id ?? uid(), strategyId, ...data }
    await upsertScanner(scanner)
    setScanners(prev => {
      const i = prev.findIndex(s => s.id === scanner.id)
      return i >= 0 ? prev.map(s => s.id === scanner.id ? { ...s, ...scanner } : s) : [...prev, scanner]
    })
    setShowModal(false)
    setEditTarget(null)
  }

  const handleDelete = async (id) => {
    await deleteScanner(id)
    setScanners(prev => prev.filter(s => s.id !== id))
    setDeleteId(null)
  }

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0 }}>
            Chartink scanners linked to this strategy. Click any scanner to open it.
          </p>
        </div>
        <button className="btn-green" style={{ padding: '9px 18px', display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}
          onClick={() => { setEditTarget(null); setShowModal(true) }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Scanner
        </button>
      </div>

      {loading && (
        <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '40px 0' }}>Loading scanners…</p>
      )}

      {!loading && scanners.length === 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>No scanners yet</p>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 18 }}>Add a Chartink scanner to quickly jump into your watchlist.</p>
          <button className="btn-green" style={{ padding: '9px 20px' }} onClick={() => { setEditTarget(null); setShowModal(true) }}>Add your first scanner</button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {scanners.map(sc => (
          <div key={sc.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', transition: 'box-shadow 0.15s, border-color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = 'var(--border-2)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border)' }}>
            <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              {/* Icon */}
              <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(45,122,95,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: sc.description || sc.tags.length ? 8 : 0 }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{sc.name}</p>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => { setEditTarget(sc); setShowModal(true) }}
                      style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600, borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                      Edit
                    </button>
                    <button onClick={() => setDeleteId(sc.id)}
                      style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600, borderRadius: 7, border: '1px solid rgba(220,38,38,0.3)', background: 'transparent', color: 'var(--red)', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                      Delete
                    </button>
                  </div>
                </div>
                {sc.description && (
                  <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 10px', lineHeight: 1.5 }}>{sc.description}</p>
                )}
                {sc.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                    {sc.tags.map(t => {
                      const c = tagStyle(t)
                      return (
                        <span key={t} style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20, background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>{t}</span>
                      )
                    })}
                  </div>
                )}
                <a href={sc.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 16px', background: 'var(--green)', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none', transition: 'opacity 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  Open Scanner
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit modal */}
      {showModal && (
        <ScannerModal
          initial={editTarget}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditTarget(null) }}
        />
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setDeleteId(null) }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 380 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Delete Scanner</h3>
            <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 24 }}>This scanner will be permanently removed from this strategy.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-outline" style={{ padding: '9px 18px' }} onClick={() => setDeleteId(null)}>Cancel</button>
              <button style={{ padding: '9px 18px', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
                onClick={() => handleDelete(deleteId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Checklist({ strategy, trades = [], checklistItems = [], onLogTrade, onBack }) {
  const [variant, setVariant]     = useState(strategy.variants?.[0]?.id ?? null)
  const [activeTab, setActiveTab] = useState('checklist')

  // Sections expanded in-memory from strategy.sections + checklistItems (no DB call)
  const sections        = expandSectionsForChecklist(strategy.sections ?? [], checklistItems)
  const sectionsLoading = false

  const st_trades   = trades.filter(t => t.strategyId === strategy.id)
  const trades_count = st_trades.length
  const wins_count   = st_trades.filter(t => t.outcome === 'win').length
  const wr_display   = trades_count ? `${Math.round(wins_count / trades_count * 100)}%` : '—'

  // Profit Factor
  const pnls_all   = st_trades.map(t => Number(t.pnl) || 0)
  const grossWin_s  = pnls_all.filter(p => p > 0).reduce((a, b) => a + b, 0)
  const grossLoss_s = Math.abs(pnls_all.filter(p => p < 0).reduce((a, b) => a + b, 0))
  const pf_display  = trades_count
    ? (grossLoss_s > 0 ? (grossWin_s / grossLoss_s).toFixed(2) : grossWin_s > 0 ? '∞' : '—')
    : '—'

  // Max Drawdown — monthly equity curve (same formula as BacktestingTab)
  const byMonth_s = {}
  st_trades.forEach(t => {
    const d = new Date(t.date)
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}`
    byMonth_s[key] = (byMonth_s[key] ?? 0) + (Number(t.pnl) || 0)
  })
  let eq_s = 0, peak_s = 0, maxDD_pct = 0
  Object.keys(byMonth_s).sort().forEach(key => {
    eq_s += byMonth_s[key]
    if (eq_s > peak_s) peak_s = eq_s
    const dd = peak_s > 0 ? (eq_s - peak_s) / peak_s * 100 : 0
    if (dd < maxDD_pct) maxDD_pct = dd
  })
  const dd_display = trades_count && maxDD_pct < 0
    ? `${maxDD_pct.toFixed(1)}%`
    : '—'

  // Avg Duration — entry date → latest exit date, averaged across closed trades
  const durations_s = st_trades.map(t => {
    const exits = t.exits ?? []
    if (!exits.length) return null
    const latestExit = exits.reduce((a, b) => new Date(a.exitDate) > new Date(b.exitDate) ? a : b)
    const days = Math.round((new Date(latestExit.exitDate) - new Date(t.date)) / 86400000)
    return days >= 0 ? days : null
  }).filter(d => d !== null)
  const avgDur_s    = durations_s.length ? Math.round(durations_s.reduce((a, b) => a + b, 0) / durations_s.length) : null
  const dur_display = avgDur_s !== null ? (avgDur_s === 0 ? '<1d' : `${avgDur_s}d`) : '—'

  const [chk, setChk]           = useState({})
  const [exp, setExp]           = useState({})
  const [entry, setEntry]       = useState('')
  const [atr, setAtr]           = useState('')
  const [logModal, setLogModal] = useState(false)

  useEffect(() => {
    const handler = () => setLogModal(true)
    document.addEventListener('td:log-trade', handler)
    return () => document.removeEventListener('td:log-trade', handler)
  }, [])

  const toggle    = id => setChk(c => ({ ...c, [id]: !c[id] }))
  const toggleExp = id => setExp(e => ({ ...e, [id]: !e[id] }))
  const reset     = ()  => { setChk({}); setEntry(''); setAtr(''); setExp({}) }

  const allIds      = sections.flatMap(sec => sec.items.filter(i => i.detail).map(i => i.id))
  const allExpanded = allIds.length > 0 && allIds.every(id => exp[id])
  const toggleAll   = () => allExpanded ? setExp({}) : setExp(Object.fromEntries(allIds.map(id => [id, true])))

  const visItems = sections
    .filter(sec => !sec.ref && (!sec.variant || sec.variant === variant))
    .flatMap(sec => sec.items.filter(i => !i.v || i.v === variant))
  const done     = visItems.filter(i => chk[i.id]).length
  const total    = visItems.length
  const pct      = total ? Math.round(done / total * 100) : 0

  const statusCol = pct === 100 ? 'var(--green)' : pct >= 60 ? '#d97706' : '#dc2626'
  const vTxt      = pct === 100 ? `✓ All ${total} checks passed — valid to enter`
                  : pct >= 85   ? 'Almost there — review remaining checks'
                  : pct >= 60   ? 'Several checks missing — do not enter yet'
                  :               'Too many checks missing — skip this trade'

  const eN = parseFloat(entry), aN = parseFloat(atr)
  let atrR = null
  if (eN > 0 && aN > 0) {
    const d = 1.5 * aN, p = d / eN * 100
    atrR = { sl: (eN - d).toFixed(2), dist: d.toFixed(2), pct: p.toFixed(2), pass: p <= 5 }
  }

  const vColMap = { a: 'purple', b: 'amber', c: 'teal', d: 'blue' }

  // Circular progress
  const r = 20, circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  // Subtitle from variants
  const subtitle = strategy.variants?.length
    ? strategy.variants.map(v => v.label.replace(/^Type [A-Z] — /, '')).join(' · ')
    : sections.flatMap(s => s.items ?? []).filter(i => !i.detail).slice(0, 4).map(i => i.label).join(' · ')

  const tabs = [
    { id: 'checklist',  label: 'Checklist & Rules' },
    { id: 'scanners',   label: 'Scanners' },
    { id: 'backtesting', label: 'Backtesting' },
  ]

  return (
    <div>
      {/* Back breadcrumb */}
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: 13, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}>
        ← Back to Strategies
      </button>

      {/* Header card */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', rowGap: 12 }}>
          <div style={{ flex: '1 1 200px', minWidth: 0 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>{strategy.name}</h1>
            {subtitle && <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</p>}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn-green" style={{ padding: '8px 18px' }} onClick={() => setLogModal(true)}>Log Trade</button>
            <button className="btn-outline" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 5 }} onClick={toggleAll}>
              {allExpanded ? 'Collapse' : 'Expand'}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points={allExpanded ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}/></svg>
            </button>
            <button className="btn-outline" style={{ padding: '8px 14px' }} onClick={reset}>Reset</button>
            <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 22, lineHeight: 1, padding: '4px' }}>×</button>
          </div>
        </div>
      </div>

      {/* Stat cards grid */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>All-time statistics</p>
        <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>Across all logged trades · use Backtesting tab for date-filtered analysis</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 160px), 1fr))', gap: 12, marginBottom: 20 }}>
        <ChecklistStatCard iconKey="variants" label="Variants" value={strategy.variants?.length ?? 0}/>
        <ChecklistStatCard iconKey="trades"   label="Trades"   value={trades_count}/>
        <ChecklistStatCard iconKey="winrate"  label="Win Rate" value={wr_display}/>
        <ChecklistStatCard iconKey="duration" label="Avg Duration" value={dur_display}/>
        <ChecklistStatCard iconKey="profit"   label="Profit Factor" value={pf_display}/>
        <ChecklistStatCard iconKey="drawdown" label="Max Drawdown" value={dd_display}/>
      </div>

      {/* Tabs */}
      <div className="scroll-x" style={{ borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{
              padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: activeTab === t.id ? 600 : 400,
              color: activeTab === t.id ? 'var(--green)' : 'var(--text-2)',
              borderBottom: activeTab === t.id ? '2px solid var(--green)' : '2px solid transparent',
              marginBottom: -1, fontFamily: 'Inter, sans-serif', transition: 'color 0.15s',
            }}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'backtesting' && <BacktestingTab trades={trades} strategyId={strategy.id}/>}

      {activeTab === 'scanners' && <ScannersTab strategyId={strategy.id}/>}

      {activeTab === 'checklist' && <>
      {/* Variant selector */}
      {strategy.variants?.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px', marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>Select breakout type:</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {strategy.variants.map(v => {
              const on = variant === v.id
              return (
                <button key={v.id} onClick={() => setVariant(v.id)}
                  style={{
                    padding: '10px 20px', borderRadius: 24, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    border: `1px solid ${on ? 'transparent' : 'var(--border-2)'}`,
                    background: on ? 'var(--navy)' : 'transparent',
                    color: on ? '#fff' : 'var(--text-2)',
                    fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
                  }}>{v.label}</button>
              )
            })}
          </div>
        </div>
      )}

      {/* Checklist sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {sectionsLoading && (
          <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '32px 0' }}>Loading checklist…</p>
        )}
        {!sectionsLoading && sections.length === 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '32px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 8 }}>No checklist items attached yet.</p>
            <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Go to Strategies → Edit this strategy to attach checklist items from your library.</p>
          </div>
        )}
        {sections.map(sec => {
          // Hide sections locked to a different variant
          if (sec.variant && sec.variant !== variant) return null
          const sc  = sec.variantSec ? (COL[vColMap[variant] ?? 'purple'] ?? COL.purple) : (COL[sec.col] ?? COL.gray)
          const vis = sec.items.filter(i => !i.v || i.v === variant)
          if (!vis.length) return null
          const secDone = vis.filter(i => chk[i.id]).length
          const variantLabel = sec.variant ? strategy.variants?.find(v => v.id === sec.variant)?.label : null
          return (
            <div key={sec.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              {/* Section header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', background: sc[0] }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: sc[1], color: sc[0], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{sec.n}</div>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: sc[1] }}>{sec.title}</span>
                {variantLabel && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#4f6ef7', background: 'rgba(79,110,247,0.12)', border: '1px solid rgba(79,110,247,0.25)', padding: '2px 8px', borderRadius: 20 }}>
                    {variantLabel}
                  </span>
                )}
                {!sec.ref && <span style={{ fontSize: 11, color: `${sc[1]}99`, fontFamily: 'JetBrains Mono, monospace' }}>{secDone}/{vis.length}</span>}
                {sec.ref && <span style={{ fontSize: 11, color: `${sc[1]}80`, border: `1px solid ${sc[1]}40`, padding: '2px 8px', borderRadius: 4 }}>reference</span>}
              </div>
              {/* Items */}
              {vis.map((item, idx) => {
                const isChk = chk[item.id], isExp = exp[item.id]
                const itemDotColor = ITEM_COLOR_HEX[item.color ?? 'gray'] ?? '#d1d5db'
                return (
                  <div key={item.id} style={{
                    display: 'flex', gap: 14, padding: '14px 20px',
                    borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                    background: isChk && !sec.ref ? 'rgba(45,122,95,0.04)' : 'transparent',
                  }}>
                    {sec.ref
                      ? <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--border-2)', marginTop: 6, flexShrink: 0 }}/>
                      : <Checkbox checked={!!isChk} onChange={() => toggle(item.id)}/>
                    }
                    <div style={{ flex: 1, cursor: item.detail ? 'pointer' : 'default' }} onClick={() => item.detail && toggleExp(item.id)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <p style={{ fontSize: 14, color: isChk && !sec.ref ? 'var(--green)' : 'var(--text)', fontWeight: isChk ? 500 : 400, margin: 0, lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: itemDotColor, flexShrink: 0, display: 'inline-block', marginTop: 1 }}/>
                          {item.label}
                        </p>
                        {item.detail && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}>
                            <polyline points={isExp ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}/>
                          </svg>
                        )}
                      </div>
                      {isExp && item.detail && (
                        <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
                          {item.detail}
                        </div>
                      )}
                      {item.note && (
                        <span style={{ display: 'inline-block', marginTop: 6, padding: '3px 8px', background: 'var(--surface-2)', borderRadius: 6, fontSize: 11, color: 'var(--text-2)', fontFamily: 'JetBrains Mono, monospace' }}>{item.note}</span>
                      )}
                      {sec.atrCalc && (
                        <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 16, marginTop: 12 }} onClick={e => e.stopPropagation()}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>ATR Stop Loss Calculator</p>
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                            <div>
                              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-2)', marginBottom: 4 }}>Entry price (₹)</label>
                              <input className="t-inp" style={{ width: 140 }} type="number" placeholder="e.g. 500" value={entry} onChange={e => setEntry(e.target.value)}/>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-2)', marginBottom: 4 }}>ATR(14) value (₹)</label>
                              <input className="t-inp" style={{ width: 140 }} type="number" placeholder="e.g. 12" value={atr} onChange={e => setAtr(e.target.value)}/>
                            </div>
                          </div>
                          {atrR
                            ? <p style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', padding: '8px 12px', borderRadius: 8, background: atrR.pass ? 'rgba(45,122,95,0.1)' : 'rgba(220,38,38,0.08)', color: atrR.pass ? 'var(--green)' : 'var(--red)' }}>
                                SL = ₹{atrR.sl} · Distance ₹{atrR.dist} ({atrR.pct}%) {atrR.pass ? '✓ Valid' : '✗ Skip'}
                              </p>
                            : <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Enter values above to calculate.</p>
                          }
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Footer progress bar */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div>
          <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', marginBottom: 2 }}>Checks passed</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: statusCol, margin: 0, fontFamily: 'JetBrains Mono, monospace' }}>{done} / {total}</p>
        </div>
        <div style={{ flex: 1, height: 6, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: statusCol, transition: 'width 0.4s' }}/>
        </div>
        <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
          <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 48 48">
            <circle cx="24" cy="24" r={r} fill="none" stroke="var(--border)" strokeWidth="4"/>
            <circle cx="24" cy="24" r={r} fill="none" stroke={statusCol} strokeWidth="4" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.4s' }}/>
          </svg>
          <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: statusCol, fontFamily: 'JetBrains Mono, monospace' }}>{pct}</span>
        </div>
        <p style={{ fontSize: 13, fontWeight: 500, color: statusCol }}>{vTxt}</p>
      </div>

      </> }

      {logModal && (
        <LogModal strategy={strategy} onSave={trade => { onLogTrade(trade); setLogModal(false) }} onClose={() => setLogModal(false)} variant={variant} score={{ done, total }}/>
      )}
    </div>
  )
}
