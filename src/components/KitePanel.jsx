import { useState, useEffect, useRef } from 'react'
import LogModal from './LogModal'
import { getLoggedSymbols, addLoggedSymbol, removeLoggedSymbol } from '../lib/db'

const TODAY = new Date().toISOString().slice(0, 10)

// Pure helper — stable reference, safe to use in effects without listing as dep
const snapshotKey = (symbol, exchange, qty, avgPrice) =>
  `${symbol}|${exchange ?? ''}|${qty ?? ''}|${avgPrice ?? ''}`

// Build the set of all snapshot keys that currently exist in a live portfolio
function buildLiveKeys(portfolio) {
  const keys = new Set()
  const netPos = portfolio?.positions?.net ?? []
  const dayPos = portfolio?.positions?.day ?? []
  const positions = netPos.length ? netPos : dayPos
  for (const p of positions) {
    if ((p.quantity === 0) && (p.t1_quantity ?? 0) === 0) continue
    const effectiveQty = p.quantity !== 0 ? p.quantity : (p.t1_quantity ?? 0)
    keys.add(snapshotKey(p.tradingsymbol, p.exchange, Math.abs(effectiveQty), p.average_price))
  }
  for (const h of (portfolio?.holdings ?? [])) {
    keys.add(snapshotKey(h.tradingsymbol, h.exchange, h.quantity, h.average_price))
  }
  return keys
}

const fmt = (n) =>
  n == null ? '—' : new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)

const fmtCurr = (n) =>
  n == null ? '—' : `₹${fmt(Math.abs(n))}`

function PnlText({ value }) {
  if (value == null) return <span style={{ color: 'var(--text-3)' }}>—</span>
  const color = value > 0 ? 'var(--green)' : value < 0 ? 'var(--red)' : 'var(--text-2)'
  return (
    <span style={{ color, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>
      {value >= 0 ? '+' : '−'}₹{fmt(Math.abs(value))}
    </span>
  )
}

function MarginCard({ label, value }) {
  return (
    <div style={{
      background: 'var(--surface-2)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 14px', minWidth: 120, flex: '1 1 120px',
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>
        {fmtCurr(value)}
      </div>
    </div>
  )
}

export default function KitePanel({ connected, portfolio, loading, error, loginUrl, disconnect, refresh, onLogTrade, onEditTrade, strats, trades }) {
  const [expanded, setExpanded] = useState(true)
  const [holdingsOpen, setHoldingsOpen] = useState(false)
  const [mfOpen, setMfOpen] = useState(false)
  const [logPrefill, setLogPrefill] = useState(null)
  const [exitTrade, setExitTrade] = useState(null)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024)
  // loggedKeys: Set of snapshot_keys ("SYMBOL|EXCHANGE|QTY") persisted in DB
  // Auto-invalidates when qty changes (key won't match the new snapshot)
  const [loggedKeys, setLoggedKeys] = useState(new Set())
  // Stable ref so the reconciliation effect always sees current loggedKeys
  const loggedKeysRef = useRef(new Set())

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    getLoggedSymbols()
      .then(rows => setLoggedKeys(new Set(rows.map(r => r.snapshot_key))))
      .catch(() => {})
  }, [])

  // Keep ref in sync with state
  useEffect(() => { loggedKeysRef.current = loggedKeys }, [loggedKeys])

  // ── Reconciliation ────────────────────────────────────────
  // When fresh portfolio data arrives, purge any logged marks whose position no
  // longer exists (e.g. the user sold the stock between sessions). This ensures
  // that selling and re-buying the same stock always starts with a clean slate.
  useEffect(() => {
    if (!portfolio || loggedKeysRef.current.size === 0) return
    const liveKeys = buildLiveKeys(portfolio)
    const stale = [...loggedKeysRef.current].filter(k => !liveKeys.has(k))
    if (stale.length === 0) return
    setLoggedKeys(prev => {
      const next = new Set(prev)
      stale.forEach(k => next.delete(k))
      return next
    })
    stale.forEach(k => removeLoggedSymbol(k).catch(() => {}))
  }, [portfolio])

  const toggleManualLog = async (symbol, exchange, qty, avgPrice) => {
    const key = snapshotKey(symbol, exchange, qty, avgPrice)
    const isNowLogged = !loggedKeys.has(key)
    // Optimistic update
    setLoggedKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
    try {
      if (isNowLogged) await addLoggedSymbol(symbol, exchange, qty, avgPrice)
      else await removeLoggedSymbol(key)
    } catch {
      // Revert on failure
      setLoggedKeys(prev => {
        const next = new Set(prev)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        return next
      })
    }
  }

  // ── Exit trade helpers ──────────────────────────────────────
  const findOpenTrade = (symbol) => {
    if (!trades?.length) return null
    return trades.find(t => t.instrument === symbol && t.outcome === 'open')
      ?? trades.find(t => t.instrument === symbol && !(t.exits?.length))
      ?? null
  }

  const openExitModal = (symbol, ltp, currentQty) => {
    const trade = findOpenTrade(symbol)
    if (!trade) return
    const alreadyExited = (trade.exits ?? []).reduce((s, e) => s + (Number(e.qty) || 0), 0)
    const remainingQty = Math.max(0, (Number(trade.qty) || 0) - alreadyExited)
    const exitQty = remainingQty > 0 ? remainingQty : (currentQty || '')
    const newExit = { exitDate: TODAY, exitPrice: String(ltp ?? ''), qty: String(exitQty), exitStrategy: '' }
    setExitTrade({ ...trade, exits: [...(trade.exits ?? []), newExit] })
  }

  // ── Not connected ─────────────────────────────────────────
  if (!connected) {
    if (!loginUrl) {
      return (
        <div style={{
          padding: '14px 16px', background: 'var(--surface-2)',
          border: '1px solid var(--border)', borderRadius: 10,
          fontSize: 13, color: 'var(--text-3)',
        }}>
          ⚠ Set <code>VITE_KITE_API_KEY</code> in your .env to enable Kite Connect.
        </div>
      )
    }

    return (
      <div style={{
        padding: '14px 16px', background: 'var(--surface)',
        border: '1px solid var(--border)', borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="https://zerodha.com/static/images/favicon.ico" alt="Zerodha" width={18} height={18} style={{ borderRadius: 4, flexShrink: 0 }} onError={e => { e.currentTarget.style.display = 'none' }}/>
          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Kite — not connected</span>
          {error && <span style={{ fontSize: 12, color: 'var(--red)', marginLeft: 6 }}>{error}</span>}
        </div>
        <a
          href={loginUrl}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '7px 16px', background: '#387ed1', color: '#fff',
            borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <img src="https://zerodha.com/static/images/favicon.ico" alt="" width={14} height={14} style={{ borderRadius: 2, filter: 'brightness(10)' }} onError={e => { e.currentTarget.style.display = 'none' }}/>
          Login with Kite
        </a>
      </div>
    )
  }

  // ── Connected ─────────────────────────────────────────────
  const eq             = portfolio?.margins?.equity
  const available      = eq?.available?.live_balance ?? eq?.net ?? null
  const used           = eq?.utilised?.debits ?? null
  const net            = eq?.net ?? null
  const netPositions   = portfolio?.positions?.net ?? []
  const dayPositions   = portfolio?.positions?.day ?? []
  const positions      = netPositions.length ? netPositions : dayPositions
  // open = net qty != 0, OR has T1/T2 unsettled quantity
  const openPositions  = positions.filter(p => (p.quantity !== 0) || (p.t1_quantity ?? 0) !== 0 || (p.day_quantity ?? 0) !== 0)
  const dayPnl         = positions.reduce((sum, p) => sum + (p.pnl ?? 0), 0)
  const holdings       = portfolio?.holdings ?? []
  const holdingsPnl      = holdings.reduce((sum, h) => sum + (h.pnl ?? 0), 0)
  const holdingsValue    = holdings.reduce((sum, h) => sum + ((h.last_price ?? 0) * (h.quantity ?? 0)), 0)
  const holdingsInvested = holdings.reduce((sum, h) => sum + ((h.average_price ?? 0) * (h.quantity ?? 0)), 0)
  const holdingsTotalPct = holdingsInvested > 0 ? (holdingsPnl / holdingsInvested) * 100 : null
  const todayLoggedSymbols = new Set((trades ?? []).filter(t => t.date === TODAY).map(t => t.instrument))
  const isLogged = (sym, exchange, qty, avgPrice) => todayLoggedSymbols.has(sym) || loggedKeys.has(snapshotKey(sym, exchange, qty, avgPrice))
  const mfHoldings     = portfolio?.mfHoldings ?? []
  const mfValue        = mfHoldings.reduce((sum, h) => sum + (h.last_price ?? 0) * (h.quantity ?? 0), 0)
  const mfInvested     = mfHoldings.reduce((sum, h) => sum + (h.average_price ?? 0) * (h.quantity ?? 0), 0)
  const mfPnl          = mfValue - mfInvested
  const mfTotalPct     = mfInvested > 0 ? (mfPnl / mfInvested) * 100 : null

  const marginNotes = (eq) => {
    if (!eq) return ''
    const avail = eq?.available?.live_balance ?? eq?.net ?? null
    const used  = eq?.utilised?.debits ?? null
    const net   = eq?.net ?? null
    const parts = []
    if (avail != null) parts.push(`Margin Available: ₹${new Intl.NumberFormat('en-IN',{maximumFractionDigits:2}).format(avail)}`)
    if (used  != null) parts.push(`Margin Used: ₹${new Intl.NumberFormat('en-IN',{maximumFractionDigits:2}).format(used)}`)
    if (net   != null) parts.push(`Net Balance: ₹${new Intl.NumberFormat('en-IN',{maximumFractionDigits:2}).format(net)}`)
    return parts.join(' | ')
  }

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
        padding: '10px 16px', borderBottom: expanded ? '1px solid var(--border)' : 'none',
        cursor: 'pointer',
      }} onClick={() => setExpanded(v => !v)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="https://zerodha.com/static/images/favicon.ico" alt="Zerodha" width={18} height={18} style={{ borderRadius: 4, flexShrink: 0, imageRendering: 'auto' }} onError={e => { e.currentTarget.style.display = 'none' }}/>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Kite</span>
          {loading && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Fetching…</span>}
          {!loading && portfolio && (
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              {openPositions.length} open position{openPositions.length !== 1 ? 's' : ''}
              {holdings.length > 0 && <> · {holdings.length} holding{holdings.length !== 1 ? 's' : ''}</>}
              {mfHoldings.length > 0 && <> · {mfHoldings.length} MF</>}
              {dayPnl !== 0 && <> · Day P&L: <PnlText value={dayPnl} /></>}
            </span>
          )}
          {error && <span style={{ fontSize: 12, color: 'var(--red)' }}>{error}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={e => e.stopPropagation()}>
          <button onClick={refresh} title="Refresh" style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text-3)', padding: '3px 8px', fontSize: 12, fontFamily: 'Inter, sans-serif' }}>
            ↻ Refresh
          </button>
          <button onClick={disconnect} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--red)', padding: '3px 8px', fontSize: 12, fontFamily: 'Inter, sans-serif' }}>
            Disconnect
          </button>
          <span style={{ color: 'var(--text-3)', fontSize: 14 }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {eq && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Equity Margins</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <MarginCard label="Available"   value={available} />
                <MarginCard label="Margin Used" value={used}      />
                <MarginCard label="Net Balance" value={net}       />
              </div>
            </div>
          )}

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              {netPositions.length ? 'Net Positions' : 'Day Positions'}
            </div>
            {positions.length === 0 && !loading && (
              <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '12px 0' }}>No positions today.</div>
            )}
            {positions.length > 0 && (
              isMobile ? (
                /* ── Positions cards (mobile) ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {positions.map((p, i) => {
                    const t1 = p.t1_quantity ?? 0
                    const effectiveQty = p.quantity !== 0 ? p.quantity : t1
                    const isLogged_ = isLogged(p.tradingsymbol, p.exchange, Math.abs(effectiveQty), p.average_price)
                    const dimmed = p.quantity === 0 && t1 === 0
                    return (
                      <div key={`${p.tradingsymbol}-${i}`} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, opacity: dimmed ? 0.4 : 1 }}>
                        {/* Row 1: symbol + P&L */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, overflow: 'hidden' }}>
                            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.tradingsymbol}</span>
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-3)', flexShrink: 0 }}>{p.exchange}</span>
                            <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600, flexShrink: 0 }}>{p.product}</span>
                          </div>
                          <span style={{ flexShrink: 0, whiteSpace: 'nowrap' }}><PnlText value={p.pnl} /></span>
                        </div>
                        {/* Stats grid: 2 columns */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
                          {[
                            ['Qty',     effectiveQty > 0 ? `+${effectiveQty}` : `${effectiveQty}`,  effectiveQty > 0 ? 'var(--green)' : effectiveQty < 0 ? 'var(--red)' : 'var(--text-3)'],
                            ['T+1',     t1 !== 0 ? `+${t1}` : '—',  t1 !== 0 ? '#d97706' : 'var(--text-3)'],
                            ['Avg',     `₹${fmt(p.average_price)}`,  'var(--text-2)'],
                            ['LTP',     `₹${fmt(p.last_price)}`,     'var(--text)'],
                          ].map(([lbl, val, color]) => (
                            <div key={lbl}>
                              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{lbl}</div>
                              <div style={{ fontSize: 13, fontWeight: 600, color, fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{val}</div>
                            </div>
                          ))}
                        </div>
                        {/* Log / Exit buttons */}
                        {onLogTrade && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                            {findOpenTrade(p.tradingsymbol) && (
                              <button onClick={() => openExitModal(p.tradingsymbol, p.last_price, Math.abs(effectiveQty))} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(220,38,38,0.35)', background: 'none', color: 'var(--red)', cursor: 'pointer', fontWeight: 600 }}>Exit Trade</button>
                            )}
                            {isLogged_
                              ? <button onClick={() => toggleManualLog(p.tradingsymbol, p.exchange, Math.abs(effectiveQty), p.average_price)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: 'none', background: 'none', color: 'var(--green)', cursor: 'pointer', fontWeight: 600 }}>✓ Logged</button>
                              : <button onClick={() => setLogPrefill({ instrument: p.tradingsymbol, entryPrice: String(p.average_price ?? ''), qty: String(Math.abs(effectiveQty)), direction: effectiveQty >= 0 ? 'long' : 'short', exchange: p.exchange ?? 'NSE', tradeType: p.product === 'MIS' ? 'eq_intraday' : p.product === 'NRML' ? 'fo_nrml' : 'eq_delivery', date: TODAY, notes: marginNotes(portfolio?.margins?.equity) })} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: 'none', background: 'var(--green)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>+ Log</button>
                            }
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {positions.length > 1 && (
                    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>Total Day P&L</span>
                      <PnlText value={dayPnl} />
                    </div>
                  )}
                </div>
              ) : (
              /* ── Positions table (desktop) ── */
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 520 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Symbol', 'Product', 'Qty', 'T1', 'Avg Price', 'LTP', 'P&L', ''].map(h => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: h === 'Symbol' || h === 'Product' || h === '' ? 'left' : 'right', fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((p, i) => {
                      const t1 = p.t1_quantity ?? 0
                      const effectiveQty = p.quantity !== 0 ? p.quantity : t1
                      return (
                        <tr key={`${p.tradingsymbol}-${i}`} style={{ borderBottom: i < positions.length - 1 ? '1px solid var(--border)' : 'none', opacity: (p.quantity !== 0 || t1 !== 0) ? 1 : 0.4 }}>
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                            {p.tradingsymbol}<span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 6 }}>{p.exchange}</span>
                          </td>
                          <td style={{ padding: '8px 10px', color: 'var(--text-2)' }}>{p.product}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: effectiveQty > 0 ? 'var(--green)' : effectiveQty < 0 ? 'var(--red)' : 'var(--text-3)' }}>
                            {effectiveQty > 0 ? '+' : ''}{effectiveQty}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: t1 !== 0 ? '#d97706' : 'var(--text-3)' }}>
                            {t1 !== 0 ? `+${t1}` : '—'}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-2)' }}>₹{fmt(p.average_price)}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text)' }}>₹{fmt(p.last_price)}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}><PnlText value={p.pnl} /></td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {onLogTrade && findOpenTrade(p.tradingsymbol) && (
                              <button
                                title="Log an exit for this trade"
                                onClick={() => openExitModal(p.tradingsymbol, p.last_price, Math.abs(effectiveQty))}
                                style={{ background: 'none', border: '1px solid rgba(220,38,38,0.35)', borderRadius: 5, cursor: 'pointer', color: 'var(--red)', fontSize: 10, padding: '2px 6px', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}
                              >Exit</button>
                            )}
                            {onLogTrade && !isLogged(p.tradingsymbol, p.exchange, Math.abs(effectiveQty), p.average_price) && (
                              <button
                                title="Log this trade"
                                onClick={() => setLogPrefill({
                                  instrument: p.tradingsymbol,
                                  entryPrice: String(p.average_price ?? ''),
                                  qty: String(Math.abs(effectiveQty)),
                                  direction: effectiveQty >= 0 ? 'long' : 'short',
                                  exchange: p.exchange ?? 'NSE',
                                  tradeType: p.product === 'MIS' ? 'eq_intraday' : p.product === 'NRML' ? 'fo_nrml' : 'eq_delivery',
                                  date: TODAY,
                                  notes: marginNotes(portfolio?.margins?.equity),
                                })}
                                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--green)', fontSize: 14, width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                              >+</button>
                            )}
                            {onLogTrade && isLogged(p.tradingsymbol, p.exchange, Math.abs(effectiveQty), p.average_price) && (
                              <button
                                title={loggedKeys.has(snapshotKey(p.tradingsymbol, p.exchange, Math.abs(effectiveQty), p.average_price)) ? 'Manually marked — click to unmark' : 'Logged in Trade Log — click to unmark'}
                                onClick={() => toggleManualLog(p.tradingsymbol, p.exchange, Math.abs(effectiveQty), p.average_price)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--green)', fontSize: 13, padding: 0 }}
                              >✓</button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  {positions.length > 1 && (
                    <tfoot>
                      <tr style={{ borderTop: '2px solid var(--border)' }}>
                        <td colSpan={7} style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>Total Day P&L</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}><PnlText value={dayPnl} /></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
              )
            )}
          </div>

          {/* Holdings — accordion */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <div
              onClick={() => setHoldingsOpen(v => !v)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', cursor: 'pointer', background: 'var(--surface-2)', userSelect: 'none' }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Holdings
                {holdings.length > 0 && <span style={{ marginLeft: 8, fontWeight: 500, color: 'var(--text-3)' }}>· {holdings.length} · Value ₹{fmt(holdingsValue)}</span>}
                {holdingsTotalPct != null && <span style={{ marginLeft: 8, fontWeight: 600, color: holdingsTotalPct >= 0 ? 'var(--green)' : 'var(--red)' }}>{holdingsTotalPct >= 0 ? '+' : ''}{holdingsTotalPct.toFixed(2)}%</span>}
              </span>
              <span style={{ color: 'var(--text-3)', fontSize: 12 }}>{holdingsOpen ? '▲' : '▼'}</span>
            </div>
            {holdingsOpen && (
              <div style={{ padding: '10px 12px' }}>
                {holdings.length === 0 && !loading && (
                  <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '8px 0' }}>No long-term holdings.</div>
                )}
            {holdings.length > 0 && (
              isMobile ? (
                /* ── Holdings cards (mobile) ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {holdings.map((h, i) => {
                    const invested   = (h.average_price ?? 0) * (h.quantity ?? 0)
                    const currentVal = (h.last_price ?? 0) * (h.quantity ?? 0)
                    const pnl        = h.pnl ?? (currentVal - invested)
                    const returnPct  = invested > 0 ? (pnl / invested) * 100 : null
                    const logged     = isLogged(h.tradingsymbol, h.exchange, h.quantity, h.average_price)
                    return (
                      <div key={`${h.tradingsymbol}-${i}`} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {/* Row 1: symbol + return */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, overflow: 'hidden' }}>
                            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.tradingsymbol}</span>
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-3)', flexShrink: 0 }}>{h.exchange}</span>
                          </div>
                          {returnPct != null && (
                            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: returnPct >= 0 ? 'var(--green)' : 'var(--red)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                              {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%
                            </span>
                          )}
                        </div>
                        {/* Stats grid: 2 columns */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
                          {[
                            ['Qty',      h.quantity,              'var(--text)'],
                            ['Avg Cost', `₹${fmt(h.average_price)}`, 'var(--text-2)'],
                            ['LTP',      `₹${fmt(h.last_price)}`,    'var(--text)'],
                            ['Invested', `₹${fmt(invested)}`,        'var(--text-2)'],
                            ['Value',    `₹${fmt(currentVal)}`,      'var(--text-2)'],
                            ['P&L',      pnl == null ? '—' : `${pnl >= 0 ? '+' : '−'}₹${fmt(Math.abs(pnl))}`, pnl > 0 ? 'var(--green)' : pnl < 0 ? 'var(--red)' : 'var(--text-2)'],
                          ].map(([lbl, val, color]) => (
                            <div key={lbl}>
                              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{lbl}</div>
                              <div style={{ fontSize: 13, fontWeight: lbl === 'P&L' ? 700 : 600, color, fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{val}</div>
                            </div>
                          ))}
                        </div>
                        {/* Log / Exit buttons */}
                        {onLogTrade && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                            {findOpenTrade(h.tradingsymbol) && (
                              <button onClick={() => openExitModal(h.tradingsymbol, h.last_price, h.quantity)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(220,38,38,0.35)', background: 'none', color: 'var(--red)', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>Exit Trade</button>
                            )}
                            {logged
                              ? <button onClick={() => toggleManualLog(h.tradingsymbol, h.exchange, h.quantity, h.average_price)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(45,122,95,0.3)', background: 'none', color: 'var(--green)', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>✓ Logged</button>
                              : <div style={{ display: 'flex', gap: 6 }}>
                                  <button onClick={() => setLogPrefill({ instrument: h.tradingsymbol, entryPrice: String(h.average_price ?? ''), qty: String(h.quantity ?? ''), direction: 'long', exchange: h.exchange ?? 'NSE', tradeType: 'eq_delivery', date: TODAY, notes: marginNotes(portfolio?.margins?.equity) })} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: 'none', background: 'var(--green)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>+ Log</button>
                                  <button onClick={() => toggleManualLog(h.tradingsymbol, h.exchange, h.quantity, h.average_price)} style={{ fontSize: 11, padding: '5px 9px', borderRadius: 6, border: '1px solid var(--border)', background: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>✓</button>
                                </div>
                            }
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {holdings.length > 1 && (
                    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>Total Holdings P&L</span>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
                        <PnlText value={holdingsPnl} />
                        {holdingsTotalPct != null && <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: holdingsTotalPct >= 0 ? 'var(--green)' : 'var(--red)', whiteSpace: 'nowrap' }}>{holdingsTotalPct >= 0 ? '+' : ''}{holdingsTotalPct.toFixed(2)}%</span>}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
              /* ── Holdings table (desktop) ── */
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 580 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Symbol', 'Qty', 'Avg Cost', 'LTP', 'Current Value', 'P&L', 'Return', ''].map(h => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: h === 'Symbol' || h === '' ? 'left' : 'right', fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((h, i) => {
                      const invested     = (h.average_price ?? 0) * (h.quantity ?? 0)
                      const currentVal   = (h.last_price ?? 0) * (h.quantity ?? 0)
                      const pnl          = h.pnl ?? (currentVal - invested)
                      const returnPct    = invested > 0 ? (pnl / invested) * 100 : null
                      return (
                        <tr key={`${h.tradingsymbol}-${i}`} style={{ borderBottom: i < holdings.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                            {h.tradingsymbol}
                            <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 6 }}>{h.exchange}</span>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-2)' }}>{h.quantity}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-2)' }}>₹{fmt(h.average_price)}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text)' }}>₹{fmt(h.last_price)}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-2)' }}>₹{fmt(currentVal)}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}><PnlText value={pnl} /></td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: returnPct == null ? 'var(--text-3)' : returnPct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                            {returnPct == null ? '—' : `${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%`}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {onLogTrade && !isLogged(h.tradingsymbol, h.exchange, h.quantity, h.average_price) && (
                              <>
                                <button
                                  title="Log this holding"
                                  onClick={() => setLogPrefill({
                                    instrument: h.tradingsymbol,
                                    entryPrice: String(h.average_price ?? ''),
                                    qty: String(h.quantity ?? ''),
                                    direction: 'long',
                                    exchange: h.exchange ?? 'NSE',
                                    tradeType: 'eq_delivery',
                                    date: TODAY,
                                    notes: marginNotes(portfolio?.margins?.equity),
                                  })}
                                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--green)', fontSize: 13, width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                >+</button>
                                <button
                                  title="Mark as already logged (without opening modal)"
                                  onClick={() => toggleManualLog(h.tradingsymbol, h.exchange, h.quantity, h.average_price)}
                                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text-3)', fontSize: 10, padding: '2px 6px', marginLeft: 4, fontFamily: 'Inter, sans-serif' }}
                                >✓</button>
                              </>
                            )}
                            {onLogTrade && findOpenTrade(h.tradingsymbol) && (
                              <button
                                title="Log an exit for this trade"
                                onClick={() => openExitModal(h.tradingsymbol, h.last_price, h.quantity)}
                                style={{ background: 'none', border: '1px solid rgba(220,38,38,0.35)', borderRadius: 6, cursor: 'pointer', color: 'var(--red)', fontSize: 11, padding: '2px 7px', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}
                              >Exit</button>
                            )}
                            {onLogTrade && isLogged(h.tradingsymbol, h.exchange, h.quantity, h.average_price) && (
                              <button
                                title={loggedKeys.has(snapshotKey(h.tradingsymbol, h.exchange, h.quantity, h.average_price)) ? 'Manually marked — click to unmark' : 'Logged in Trade Log — click to unmark'}
                                onClick={() => toggleManualLog(h.tradingsymbol, h.exchange, h.quantity, h.average_price)}
                                style={{ background: 'none', border: '1px solid rgba(45,122,95,0.3)', borderRadius: 6, cursor: 'pointer', color: 'var(--green)', fontSize: 11, padding: '2px 7px', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}
                              >✓ Logged</button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  {holdings.length > 1 && (
                    <tfoot>
                      <tr style={{ borderTop: '2px solid var(--border)' }}>
                        <td colSpan={5} style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>Total Holdings P&L</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}><PnlText value={holdingsPnl} /></td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: holdingsTotalPct == null ? 'var(--text-3)' : holdingsTotalPct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {holdingsTotalPct == null ? '—' : `${holdingsTotalPct >= 0 ? '+' : ''}${holdingsTotalPct.toFixed(2)}%`}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
              )
            )}
              </div>
            )}
          </div>

          {/* Mutual Fund Holdings — accordion */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <div
              onClick={() => setMfOpen(v => !v)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', cursor: 'pointer', background: 'var(--surface-2)', userSelect: 'none' }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Mutual Funds
                {mfHoldings.length > 0 && <span style={{ marginLeft: 8, fontWeight: 500, color: 'var(--text-3)' }}>· {mfHoldings.length} · Value ₹{fmt(mfValue)}</span>}
                {mfTotalPct != null && <span style={{ marginLeft: 8, fontWeight: 600, color: mfTotalPct >= 0 ? 'var(--green)' : 'var(--red)' }}>{mfTotalPct >= 0 ? '+' : ''}{mfTotalPct.toFixed(2)}%</span>}
              </span>
              <span style={{ color: 'var(--text-3)', fontSize: 12 }}>{mfOpen ? '▲' : '▼'}</span>
            </div>
            {mfOpen && (
              <div style={{ padding: '10px 12px' }}>
                {mfHoldings.length === 0 && !loading && (
                  <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '8px 0' }}>No mutual fund holdings.</div>
                )}
            {mfHoldings.length > 0 && (
              isMobile ? (
                /* ── MF cards (mobile) ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {mfHoldings.map((h, i) => {
                    const units      = h.quantity ?? h.units ?? 0
                    const invested   = (h.average_price ?? 0) * units
                    const currentVal = (h.last_price ?? 0) * units
                    const pnl        = currentVal - invested
                    const returnPct  = invested > 0 ? (pnl / invested) * 100 : null
                    const avgNav     = h.average_price ?? (units > 0 ? invested / units : null)
                    const curNav     = h.last_price ?? (units > 0 ? currentVal / units : null)
                    return (
                      <div key={`${h.tradingsymbol ?? h.folio}-${i}`} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {/* Row 1: Fund name + return% */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {h.fund ?? h.tradingsymbol ?? h.folio}
                            </div>
                            {h.folio && <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{h.folio}</div>}
                          </div>
                          {returnPct != null && (
                            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: returnPct >= 0 ? 'var(--green)' : 'var(--red)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                              {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%
                            </span>
                          )}
                        </div>
                        {/* Stats grid: 2 columns */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
                          {[
                            ['Units',    units,                              'var(--text)'],
                            ['Avg NAV',  avgNav != null ? `₹${fmt(avgNav)}` : '—', 'var(--text-2)'],
                            ['Cur NAV',  curNav != null ? `₹${fmt(curNav)}` : '—', 'var(--text)'],
                            ['Invested', `₹${fmt(invested)}`,                'var(--text-2)'],
                            ['Value',    `₹${fmt(currentVal)}`,              'var(--text-2)'],
                            ['P&L',      pnl === 0 ? '—' : `${pnl >= 0 ? '+' : '−'}₹${fmt(Math.abs(pnl))}`, pnl > 0 ? 'var(--green)' : pnl < 0 ? 'var(--red)' : 'var(--text-2)'],
                          ].map(([lbl, val, color]) => (
                            <div key={lbl}>
                              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{lbl}</div>
                              <div style={{ fontSize: 13, fontWeight: lbl === 'P&L' ? 700 : 600, color, fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{val}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                  {mfHoldings.length > 1 && (
                    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>Total MF P&L</span>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
                        <PnlText value={mfPnl} />
                        {mfTotalPct != null && <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: mfTotalPct >= 0 ? 'var(--green)' : 'var(--red)', whiteSpace: 'nowrap' }}>{mfTotalPct >= 0 ? '+' : ''}{mfTotalPct.toFixed(2)}%</span>}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
              /* ── MF table (desktop) ── */
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 660 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Fund', 'Units', 'Avg NAV', 'Current NAV', 'Invested', 'Current Value', 'P&L', 'Return'].map(h => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: h === 'Fund' ? 'left' : 'right', fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mfHoldings.map((h, i) => {
                      const invested   = (h.average_price ?? 0) * (h.quantity ?? 0)
                      const currentVal = (h.last_price ?? 0) * (h.quantity ?? 0)
                      const pnl        = currentVal - invested
                      const returnPct  = invested > 0 ? (pnl / invested) * 100 : null
                      const units      = h.quantity ?? h.units ?? 0
                      const avgNav     = h.average_price ?? (units > 0 ? invested / units : null)
                      const curNav     = h.last_price ?? (units > 0 ? currentVal / units : null)
                      return (
                        <tr key={`${h.tradingsymbol ?? h.folio}-${i}`} style={{ borderBottom: i < mfHoldings.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {h.fund ?? h.tradingsymbol ?? h.folio}
                            {h.folio && <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 6 }}>{h.folio}</span>}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-2)' }}>{units}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-2)' }}>{avgNav != null ? `₹${fmt(avgNav)}` : '—'}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text)' }}>{curNav != null ? `₹${fmt(curNav)}` : '—'}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-2)' }}>₹{fmt(invested)}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-2)' }}>₹{fmt(currentVal)}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}><PnlText value={pnl} /></td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: returnPct == null ? 'var(--text-3)' : returnPct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                            {returnPct == null ? '—' : `${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%`}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  {mfHoldings.length > 1 && (
                    <tfoot>
                      <tr style={{ borderTop: '2px solid var(--border)' }}>
                        <td colSpan={6} style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>Total MF P&L</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}><PnlText value={mfPnl} /></td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: mfTotalPct == null ? 'var(--text-3)' : mfTotalPct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {mfTotalPct == null ? '—' : `${mfTotalPct >= 0 ? '+' : ''}${mfTotalPct.toFixed(2)}%`}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
              )
            )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inline LogModal — new trade */}
      {logPrefill && (
        <LogModal
          strats={strats ?? []}
          prefill={logPrefill}
          onClose={() => setLogPrefill(null)}
          onSave={async (trade) => {
            await onLogTrade?.(trade)
            setLogPrefill(null)
          }}
        />
      )}

      {/* Inline LogModal — exit existing trade */}
      {exitTrade && (
        <LogModal
          strats={strats ?? []}
          trade={exitTrade}
          onClose={() => setExitTrade(null)}
          onUpdate={async (trade) => {
            await onEditTrade?.(trade)
            setExitTrade(null)
          }}
        />
      )}
    </div>
  )
}
