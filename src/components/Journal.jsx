import { useState, useEffect, useRef } from 'react'
import LogModal from './LogModal'

// ── helpers ──────────────────────────────────────────────────
const typePill = dir => {
  const isLong = dir === 'long'
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: isLong ? 'var(--green)' : 'var(--red)', whiteSpace: 'nowrap' }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {isLong
          ? <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>
          : <><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></>}
      </svg>
      {isLong ? 'Long' : 'Short'}
    </span>
  )
}

const STATUS_MAP = {
  win:       { label: 'WON',       bg: 'rgba(45,122,95,0.1)',   color: 'var(--green)', border: 'rgba(45,122,95,0.25)' },
  loss:      { label: 'LOST',      bg: 'rgba(220,38,38,0.08)',  color: 'var(--red)',   border: 'rgba(220,38,38,0.2)' },
  breakeven: { label: 'BREAKEVEN', bg: 'var(--surface-2)',       color: 'var(--text-2)', border: 'var(--border)' },
  open:      { label: 'OPEN',      bg: 'rgba(59,130,246,0.08)', color: '#3b82f6',      border: 'rgba(59,130,246,0.2)' },
}
const statusPill = outcome => {
  const s = STATUS_MAP[outcome] ?? STATUS_MAP.breakeven
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>{s.label}</span>
}

const COLS = [
  { key: 'date',        label: 'DATE',     sortable: true  },
  { key: 'instrument',  label: 'ASSET',    sortable: true  },
  { key: 'strategy',    label: 'STRATEGY', sortable: false },
  { key: 'direction',   label: 'TYPE',     sortable: false },
  { key: 'entryPrice',  label: 'ENTRY',    sortable: true, right: true },
  { key: 'exitPrice',   label: 'EXIT',     sortable: true, right: true },
  { key: 'pnl',         label: 'PNL',      sortable: true, right: true },
  { key: 'rMult',       label: 'R-MULT',   sortable: true, right: true },
  { key: 'outcome',     label: 'STATUS',   sortable: false },
  { key: '_del',        label: '',         sortable: false },
]

// ── Filter panel ─────────────────────────────────────────────
function FilterPanel({ strats, filters, setFilters, onClose }) {
  const ref = useRef()
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  return (
    <div ref={ref} style={{
      position: 'absolute', top: '100%', left: 0, marginTop: 6, zIndex: 100,
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)', padding: 16, minWidth: 260,
    }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Outcome</p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {['all', 'win', 'loss', 'breakeven'].map(v => (
          <button key={v} onClick={() => setFilters(f => ({ ...f, outcome: v }))}
            style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              background: filters.outcome === v ? 'var(--green)' : 'var(--surface-2)',
              color: filters.outcome === v ? '#fff' : 'var(--text-2)',
              border: `1px solid ${filters.outcome === v ? 'var(--green)' : 'var(--border)'}` }}>
            {v === 'all' ? 'All' : STATUS_MAP[v]?.label}
          </button>
        ))}
      </div>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Direction</p>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {['all', 'long', 'short'].map(v => (
          <button key={v} onClick={() => setFilters(f => ({ ...f, direction: v }))}
            style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              background: filters.direction === v ? 'var(--green)' : 'var(--surface-2)',
              color: filters.direction === v ? '#fff' : 'var(--text-2)',
              border: `1px solid ${filters.direction === v ? 'var(--green)' : 'var(--border)'}` }}>
            {v === 'all' ? 'All' : v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Strategy</p>
      <select value={filters.strategyId} onChange={e => setFilters(f => ({ ...f, strategyId: e.target.value }))}
        style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text)', background: 'var(--surface-2)', outline: 'none', fontFamily: 'Inter, sans-serif' }}>
        <option value="all">All Strategies</option>
        {strats.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
      </select>
      <button onClick={() => { setFilters({ outcome: 'all', direction: 'all', strategyId: 'all' }); onClose() }}
        style={{ marginTop: 14, width: '100%', padding: '8px', borderRadius: 8, border: '1px solid var(--border)', background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-2)', fontFamily: 'Inter, sans-serif' }}>
        Clear Filters
      </button>
    </div>
  )
}

// ── Date range panel ─────────────────────────────────────────
function DatePanel({ dateRange, setDateRange, onClose }) {
  const ref = useRef()
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])
  return (
    <div ref={ref} style={{
      position: 'absolute', top: '100%', left: 0, marginTop: 6, zIndex: 100,
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)', padding: 16, minWidth: 280,
    }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>From</label>
          <input type="date" value={dateRange.from} onChange={e => setDateRange(d => ({ ...d, from: e.target.value }))}
            style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text)', background: 'var(--surface-2)', outline: 'none', fontFamily: 'Inter, sans-serif' }}/>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>To</label>
          <input type="date" value={dateRange.to} onChange={e => setDateRange(d => ({ ...d, to: e.target.value }))}
            style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text)', background: 'var(--surface-2)', outline: 'none', fontFamily: 'Inter, sans-serif' }}/>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[
          { label: 'Last 7d',  days: 7  },
          { label: 'Last 30d', days: 30 },
          { label: 'Last 90d', days: 90 },
          { label: 'All time', days: 0  },
        ].map(({ label, days }) => (
          <button key={label} onClick={() => {
            if (days === 0) { setDateRange({ from: '', to: '' }); return }
            const to = new Date(), from = new Date()
            from.setDate(from.getDate() - days)
            setDateRange({ from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) })
          }}
            style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif', background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function Journal({ trades, strats, onDelete, onLogTrade }) {
  const [search,    setSearch]    = useState('')
  const [filters,   setFilters]   = useState({ outcome: 'all', direction: 'all', strategyId: 'all' })
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const [sort,      setSort]      = useState({ key: 'date', dir: 'desc' })
  const [toDelete,  setToDelete]  = useState(null)
  const [logModal,  setLogModal]  = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [showDate,   setShowDate]   = useState(false)

  useEffect(() => {
    const h = () => setLogModal(true)
    document.addEventListener('td:journal-log', h)
    return () => document.removeEventListener('td:journal-log', h)
  }, [])

  const sm = Object.fromEntries(strats.map(st => [st.id, st]))

  const activeFilterCount = [
    filters.outcome !== 'all', filters.direction !== 'all',
    filters.strategyId !== 'all', dateRange.from || dateRange.to,
  ].filter(Boolean).length

  const processed = [...trades]
    .filter(t => {
      if (search && !t.instrument?.toLowerCase().includes(search.toLowerCase())) return false
      if (filters.outcome !== 'all' && t.outcome !== filters.outcome) return false
      if (filters.direction !== 'all' && t.direction !== filters.direction) return false
      if (filters.strategyId !== 'all' && t.strategyId !== filters.strategyId) return false
      if (dateRange.from && t.date < dateRange.from) return false
      if (dateRange.to   && t.date > dateRange.to)   return false
      return true
    })
    .sort((a, b) => {
      let av = a[sort.key], bv = b[sort.key]
      if (sort.key === 'date') { av = new Date(av); bv = new Date(bv) }
      if (sort.key === 'instrument') { av = av?.toLowerCase(); bv = bv?.toLowerCase() }
      if (av < bv) return sort.dir === 'asc' ? -1 : 1
      if (av > bv) return sort.dir === 'asc' ? 1 : -1
      return 0
    })

  const maxPnl = Math.max(...trades.map(t => Math.abs(t.pnl || 0)), 1)

  const toggleSort = key => setSort(s => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }))

  const SortIcon = ({ col }) => {
    if (!col.sortable) return null
    const active = sort.key === col.key
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--green)' : 'var(--text-3)'} strokeWidth="2.5" style={{ marginLeft: 4, flexShrink: 0 }}>
        {active && sort.dir === 'asc'
          ? <polyline points="18 15 12 9 6 15"/>
          : <polyline points="6 9 12 15 18 9"/>}
      </svg>
    )
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '0 0 240px' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ticker..."
            style={{ width: '100%', padding: '8px 12px 8px 30px', border: '1px solid var(--border)', borderRadius: 9, fontSize: 13, color: 'var(--text)', background: 'var(--surface)', outline: 'none', fontFamily: 'Inter, sans-serif' }}/>
        </div>

        {/* Filter */}
        <div style={{ position: 'relative' }}>
          <button className="btn-outline" onClick={() => { setShowFilter(v => !v); setShowDate(false) }}
            style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 9, position: 'relative' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            Filter
            {activeFilterCount > 0 && (
              <span style={{ position: 'absolute', top: -6, right: -6, width: 16, height: 16, borderRadius: '50%', background: 'var(--green)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{activeFilterCount}</span>
            )}
          </button>
          {showFilter && <FilterPanel strats={strats} filters={filters} setFilters={setFilters} onClose={() => setShowFilter(false)}/>}
        </div>

        {/* Date Range */}
        <div style={{ position: 'relative' }}>
          <button className="btn-outline" onClick={() => { setShowDate(v => !v); setShowFilter(false) }}
            style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 9, color: (dateRange.from || dateRange.to) ? 'var(--green)' : undefined, borderColor: (dateRange.from || dateRange.to) ? 'var(--green)' : undefined }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {dateRange.from ? `${dateRange.from}${dateRange.to ? ` → ${dateRange.to}` : ''}` : 'Date Range'}
          </button>
          {showDate && <DatePanel dateRange={dateRange} setDateRange={setDateRange} onClose={() => setShowDate(false)}/>}
        </div>

        <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 4 }}>{processed.length} trade{processed.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      {processed.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '64px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
          {trades.length === 0 ? 'No trades logged yet.' : 'No trades match your filters.'}
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {COLS.map(col => (
                  <th key={col.key}
                    onClick={() => col.sortable && toggleSort(col.key)}
                    style={{ padding: '13px 16px', textAlign: col.right ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: sort.key === col.key ? 'var(--green)' : 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', cursor: col.sortable ? 'pointer' : 'default', userSelect: 'none' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      {col.label}<SortIcon col={col}/>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {processed.map((t, i) => {
                const pnlPct   = t.entryPrice && t.exitPrice ? ((t.exitPrice - t.entryPrice) / t.entryPrice * (t.direction === 'short' ? -1 : 1) * 100) : null
                const barW     = Math.min(Math.abs(t.pnl || 0) / maxPnl * 100, 100)
                const pnlColor = t.pnl > 0 ? 'var(--green)' : t.pnl < 0 ? 'var(--red)' : 'var(--text-2)'
                return (
                  <tr key={t.id} style={{ borderBottom: i < processed.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '16px 16px', fontSize: 13, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{t.date}</td>
                    <td style={{ padding: '16px 16px', fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>{t.instrument}</td>
                    <td style={{ padding: '16px 16px' }}>
                      <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                        {sm[t.strategyId]?.name ?? '—'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 16px' }}>{typePill(t.direction)}</td>
                    <td style={{ padding: '16px 16px', fontSize: 13, textAlign: 'right', color: 'var(--text)' }}>{t.entryPrice?.toFixed(2)}</td>
                    <td style={{ padding: '16px 16px', fontSize: 13, textAlign: 'right', color: 'var(--text)' }}>{t.exitPrice ? t.exitPrice.toFixed(2) : '—'}</td>
                    <td style={{ padding: '16px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                          {pnlPct !== null && <span style={{ fontSize: 11, color: pnlColor }}>{pnlPct > 0 ? '+' : ''}{pnlPct.toFixed(2)}%</span>}
                          <span style={{ fontSize: 15, fontWeight: 700, color: pnlColor }}>{t.pnl > 0 ? '+' : ''}{t.pnl?.toFixed(0)}</span>
                        </div>
                        <div style={{ width: 48, height: 3, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${barW}%`, background: pnlColor, borderRadius: 2 }}/>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 16px', fontSize: 13, textAlign: 'right', color: 'var(--text-2)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {t.rMult != null ? `${t.rMult > 0 ? '+' : ''}${t.rMult}R` : '—'}
                    </td>
                    <td style={{ padding: '16px 16px' }}>{statusPill(t.outcome)}</td>
                    <td style={{ padding: '16px 16px' }}>
                      {toDelete === t.id ? (
                        <span style={{ display: 'flex', gap: 6 }}>
                          <button style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: 'var(--red)', color: '#fff', border: 'none', cursor: 'pointer' }} onClick={() => { onDelete(t.id); setToDelete(null) }}>Del</button>
                          <button className="btn-outline" style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6 }} onClick={() => setToDelete(null)}>✕</button>
                        </span>
                      ) : (
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-3)', lineHeight: 1 }} onClick={() => setToDelete(t.id)}>×</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {logModal && strats.length > 0 && (
        <LogModal strategy={strats[0]} onSave={trade => { onLogTrade(trade); setLogModal(false) }} onClose={() => setLogModal(false)} variant={null} score={{ done: 0, total: 0 }}/>
      )}
    </div>
  )
}
