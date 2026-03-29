import { useState, useEffect, useRef } from 'react'
import { Routes, Route, useNavigate, useParams, Navigate, useLocation } from 'react-router-dom'
import { getStrategies, upsertStrategy, deleteStrategy, getTrades, insertTrade, deleteTrade } from './lib/db'
import { BUILT_IN_SECTIONS } from './data/strategies'
import Library      from './components/Library'
import Checklist    from './components/Checklist'
import Journal      from './components/Journal'
import StatsView    from './components/StatsView'
import Calculator   from './components/Calculator'

function hydrateStrategy(s) {
  return { ...s, sections: BUILT_IN_SECTIONS[s.id] ?? s.sections ?? [] }
}

const NAV_ITEMS = [
  { id: 'strategies',  label: 'Strategies',  path: '/tradedesk/strategies'  },
  { id: 'journal',     label: 'Journal',     path: '/tradedesk/journal'     },
  { id: 'stats',       label: 'Stats',       path: '/tradedesk/stats'       },
  { id: 'calculator',  label: 'Calculator',  path: '/tradedesk/calculator'  },
]

const PAGE_TITLES = {
  strategies: 'My Strategies', journal: 'Trading Journal',
  stats: 'Statistics', calculator: 'Calculator',
}

const REQUIRED_COLS = ['Date','Strategy','Variant','Score','Instrument','Direction','Entry','Exit','Qty','Outcome','PnL','Notes']

// ── SVG icon set ──────────────────────────────────────────────
function Icon({ name, size = 18, color = 'currentColor', strokeWidth = 2 }) {
  const s = { width: size, height: size, flexShrink: 0 }
  const p = { fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (name) {
    case 'strategies': return <svg {...s} viewBox="0 0 24 24" {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
    case 'journal':    return <svg {...s} viewBox="0 0 24 24" {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
    case 'stats':      return <svg {...s} viewBox="0 0 24 24" {...p}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
    case 'position':   return <svg {...s} viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
    case 'menu':       return <svg {...s} viewBox="0 0 24 24" {...p}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    case 'sun':        return <svg {...s} viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
    case 'moon':       return <svg {...s} viewBox="0 0 24 24" {...p}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
    case 'download':   return <svg {...s} viewBox="0 0 24 24" {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    case 'upload':     return <svg {...s} viewBox="0 0 24 24" {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
    case 'plus':       return <svg {...s} viewBox="0 0 24 24" {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    case 'check':      return <svg {...s} viewBox="0 0 24 24" {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
    case 'settings':   return <svg {...s} viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    case 'calculator': return <svg {...s} viewBox="0 0 24 24" {...p}><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/><line x1="14" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="10" y2="18"/><line x1="14" y1="18" x2="16" y2="18"/></svg>
    case 'logo':       return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
    case 'search':     return <svg {...s} viewBox="0 0 24 24" {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    case 'chevron-left': return <svg {...s} viewBox="0 0 24 24" {...p}><polyline points="15 18 9 12 15 6"/></svg>
    default: return null
  }
}

function ChecklistRoute({ strats, trades, onLogTrade }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const strategy = strats.find(s => s.id === id)
  if (!strategy) return <Navigate to="/tradedesk/strategies" replace />
  return <Checklist strategy={strategy} trades={trades} onLogTrade={onLogTrade} onBack={() => navigate('/tradedesk/strategies')}/>
}

export default function App() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [strats,      setStrats]      = useState([])
  const [trades,      setTrades]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [syncStatus,  setSyncStatus]  = useState('idle')
  const [collapsed,   setCollapsed]   = useState(false)
  const [dark,        setDark]        = useState(() => localStorage.getItem('td-theme') === 'dark')
  const [importError, setImportError] = useState(null)
  const impRef = useRef(null)

  const tab = location.pathname.split('/')[2] ?? 'strategies'

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('td-theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    Promise.all([getStrategies(), getTrades()])
      .then(([sv, tv]) => { setStrats(sv.map(hydrateStrategy)); setTrades(tv) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const withSync = fn => async (...args) => {
    setSyncStatus('saving')
    try { await fn(...args); setSyncStatus('saved') }
    catch { setSyncStatus('error') }
    setTimeout(() => setSyncStatus('idle'), 2000)
  }

  const handleUpsertStrategy = withSync(async st => {
    await upsertStrategy(st)
    setStrats(prev => { const i = prev.findIndex(x => x.id === st.id); return i >= 0 ? prev.map(x => x.id === st.id ? st : x) : [...prev, st] })
  })
  const handleDeleteStrategy = withSync(async id => { await deleteStrategy(id); setStrats(prev => prev.filter(x => x.id !== id)) })
  const handleInsertTrade    = withSync(async trade => { await insertTrade(trade); setTrades(prev => [trade, ...prev]) })
  const handleDeleteTrade    = withSync(async id => { await deleteTrade(id); setTrades(prev => prev.filter(t => t.id !== id)) })

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ strats, trades }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'tradedeck-backup.json'; a.click()
    URL.revokeObjectURL(url)
  }

  const importData = e => {
    const file = e.target.files[0]; if (!file) return
    setImportError(null)
    const r = new FileReader()
    r.onload = ev => {
      const text = ev.target.result
      const rows = text.trim().split('\n')
      const headers = rows[0].split(',').map(h => h.replace(/^"|"$/g, '').trim())

      // Column validation
      const missing = REQUIRED_COLS.filter(c => !headers.includes(c))
      if (missing.length) {
        setImportError(`Incompatible file. Missing columns: ${missing.join(', ')}`)
        e.target.value = ''
        return
      }

      const col = (cells, k) => cells[headers.indexOf(k)]?.replace(/^"|"$/g, '').trim() ?? ''
      const parseNum = v => parseFloat(v.replace(/[₹,\s]/g, '')) || 0
      const errors = []
      const tradesToInsert = []

      rows.slice(1).forEach((row, i) => {
        if (!row.trim()) return
        const cells = []; let cur = '', inQ = false
        for (const ch of row) {
          if (ch === '"') { inQ = !inQ }
          else if (ch === ',' && !inQ) { cells.push(cur); cur = '' }
          else cur += ch
        }
        cells.push(cur)

        const rowNum = i + 2
        const get = k => col(cells, k)

        const strategyId = strats.find(s => s.id === get('Strategy'))?.id
        if (!strategyId)        { errors.push(`Row ${rowNum}: Strategy "${get('Strategy')}" not found`); return }
        if (!get('Variant'))    { errors.push(`Row ${rowNum}: Variant is empty`); return }
        if (!get('Date'))       { errors.push(`Row ${rowNum}: Date is empty`); return }
        if (!get('Instrument')) { errors.push(`Row ${rowNum}: Instrument is empty`); return }
        const dir = get('Direction').toLowerCase()
        if (!['long','short'].includes(dir)) { errors.push(`Row ${rowNum}: Direction must be long or short`); return }
        const outcome = get('Outcome').toLowerCase()
        if (!['win','loss','breakeven'].includes(outcome)) { errors.push(`Row ${rowNum}: Outcome must be win, loss, or breakeven`); return }
        if (!parseNum(get('Entry'))) { errors.push(`Row ${rowNum}: Entry price is invalid`); return }
        if (!parseNum(get('Exit')))  { errors.push(`Row ${rowNum}: Exit price is invalid`); return }
        if (!parseNum(get('Qty')))   { errors.push(`Row ${rowNum}: Qty is invalid`); return }

        const [d, m, y] = get('Date').split('/')
        const fullYear = y?.length === 2 ? `20${y}` : y
        const scoreParts = get('Score').split('/')

        tradesToInsert.push({
          id:             crypto.randomUUID(),
          strategyId,
          variant:        get('Variant'),
          checklistScore: { done: parseInt(scoreParts[0]) || 0, total: parseInt(scoreParts[1]) || 0 },
          date:           `${fullYear}-${m?.padStart(2,'0')}-${d?.padStart(2,'0')}`,
          instrument:     get('Instrument'),
          direction:      dir,
          entryPrice:     parseNum(get('Entry')),
          exitPrice:      parseNum(get('Exit')),
          qty:            parseNum(get('Qty')),
          outcome,
          pnl:            parseNum(get('PnL')),
          notes:          get('Notes'),
        })
      })

      if (errors.length) { setImportError(errors.join('\n')); e.target.value = ''; return }
      tradesToInsert.forEach(handleInsertTrade)
      e.target.value = ''
    }
    r.readAsText(file)
  }

  const sideW = collapsed ? 64 : 240

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'var(--text-2)', fontSize: 14 }}>Loading…</span>
    </div>
  )

  const navIconName = { strategies: 'strategies', journal: 'journal', stats: 'stats', calculator: 'calculator' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: sideW, minHeight: '100vh', background: 'var(--surface)',
        borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, zIndex: 40,
        transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)', overflow: 'hidden',
      }}>
        {/* Logo row */}
        <div style={{ padding: collapsed ? '18px 0' : '18px 20px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', minHeight: 64 }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="logo" size={18}/>
              </div>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', whiteSpace: 'nowrap' }}>TradeDesk</span>
            </div>
          )}
          {collapsed && (
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="logo" size={18}/>
            </div>
          )}
        </div>

        {/* Search — only when expanded */}
        {!collapsed && (
          <div style={{ padding: '10px 12px' }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', display: 'flex' }}>
                <Icon name="search" size={13} color="var(--text-3)"/>
              </span>
              <input placeholder="Search..." style={{ width: '100%', padding: '7px 10px 7px 28px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text)', background: 'var(--surface-2)', outline: 'none', fontFamily: 'Inter, sans-serif' }}/>
            </div>
          </div>
        )}

        {/* Nav items */}
        <nav style={{ flex: 1, padding: collapsed ? '8px 0' : '4px 8px' }}>
          {NAV_ITEMS.map(({ id, label, path }) => {
            const isActive = tab === id
            const iconName = navIconName[id]
            return (
              <button key={id}
                onClick={() => navigate(path)}
                title={collapsed ? label : undefined}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  gap: collapsed ? 0 : 10,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  padding: collapsed ? '10px 0' : '9px 12px',
                  borderRadius: collapsed ? 0 : 8, border: 'none', cursor: 'pointer',
                  background: isActive ? 'var(--green-light)' : 'transparent',
                  color: isActive ? 'var(--green)' : 'var(--text-2)',
                  fontWeight: isActive ? 600 : 400, fontSize: 14,
                  fontFamily: 'Inter, sans-serif', marginBottom: 2,
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                <Icon name={iconName} size={18} color={isActive ? 'var(--green)' : 'var(--text-3)'}/>
                {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: collapsed ? '12px 0' : '14px 16px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: collapsed ? 'center' : 'flex-start', gap: 10 }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="check" size={14} color="var(--green)"/>
              <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500, whiteSpace: 'nowrap' }}>Supabase Connected</span>
            </div>
          )}
          <button title={collapsed ? 'Settings' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: collapsed ? '6px 0' : '6px 0', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: 13, fontFamily: 'Inter, sans-serif', width: '100%', justifyContent: collapsed ? 'center' : 'flex-start' }}>
            <Icon name="settings" size={16} color="var(--text-3)"/>
            {!collapsed && <span>Settings</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ marginLeft: sideW, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', transition: 'margin-left 0.22s cubic-bezier(0.4,0,0.2,1)' }}>

        {/* Top bar */}
        <header style={{
          height: 64, background: 'var(--surface)', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 28px', position: 'sticky', top: 0, zIndex: 30,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={() => setCollapsed(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', padding: 4, display: 'flex', alignItems: 'center' }}>
              <Icon name="menu" size={18} color="var(--text-2)"/>
            </button>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              {PAGE_TITLES[tab] ?? 'Strategy'}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {syncStatus !== 'idle' && (
              <span style={{ fontSize: 12, color: syncStatus === 'saved' ? 'var(--green)' : syncStatus === 'error' ? 'var(--red)' : 'var(--text-3)' }}>
                {{ saving: 'Saving…', saved: 'Saved ✓', error: 'Error' }[syncStatus]}
              </span>
            )}

            <button onClick={() => setDark(v => !v)}
              style={{ background: 'none', border: '1px solid var(--border-2)', borderRadius: 8, cursor: 'pointer', padding: '7px 10px', display: 'flex', alignItems: 'center', color: 'var(--text-2)' }}
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
              <Icon name={dark ? 'sun' : 'moon'} size={15} color="var(--text-2)"/>
            </button>

            <button className="btn-outline" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }} onClick={exportData}>
              <Icon name="download" size={14}/> Export
            </button>
            <button className="btn-outline" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => { setImportError(null); impRef.current.click() }}>
              <Icon name="upload" size={14}/> Import
            </button>
            <input ref={impRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={importData}/>

            {tab === 'strategies' && (
              <button className="btn-green" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => document.dispatchEvent(new CustomEvent('td:new-strategy'))}>
                <Icon name="plus" size={14} color="white"/> New Strategy
              </button>
            )}
            {(tab === 'journal' || tab === 'stats') && (
              <button className="btn-green" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => document.dispatchEvent(new CustomEvent('td:journal-log'))}>
                <Icon name="plus" size={14} color="white"/> Log Trade
              </button>
            )}
          </div>
        </header>

        {/* Import error banner */}
        {importError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, margin: '16px 32px 0', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <pre style={{ fontSize: 12, color: 'var(--red)', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'Inter, sans-serif' }}>{importError}</pre>
            <button onClick={() => setImportError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 18, lineHeight: 1, flexShrink: 0 }}>×</button>
          </div>
        )}

        {/* Content */}
        <main style={{ flex: 1, padding: '28px 32px' }}>
          <Routes>
            <Route path="/tradedesk/strategies" element={<Library strats={strats} trades={trades} onOpen={st => navigate(`/tradedesk/strategies/${st.id}`)} onUpsert={handleUpsertStrategy} onDelete={handleDeleteStrategy}/>}/>
            <Route path="/tradedesk/strategies/:id" element={<ChecklistRoute strats={strats} trades={trades} onLogTrade={handleInsertTrade}/>}/>
            <Route path="/tradedesk/journal"    element={<Journal    trades={trades} strats={strats} onDelete={handleDeleteTrade} onLogTrade={handleInsertTrade}/>}/>
            <Route path="/tradedesk/stats"      element={<StatsView  trades={trades} strats={strats}/>}/>
            <Route path="/tradedesk/calculator"  element={<Calculator/>}/>
            <Route path="*" element={<Navigate to="/tradedesk/strategies" replace/>}/>
          </Routes>
        </main>
      </div>
    </div>
  )
}
