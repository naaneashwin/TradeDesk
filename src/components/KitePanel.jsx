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
      borderRadius: 8, padding: '10px 14px', minWidth: 120,
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

export default function KitePanel({ connected, portfolio, loading, error, loginUrl, disconnect, refresh, onLogTrade, strats, trades }) {
  const [expanded, setExpanded] = useState(true)
  const [holdingsOpen, setHoldingsOpen] = useState(false)
  const [mfOpen, setMfOpen] = useState(false)
  const [logPrefill, setLogPrefill] = useState(null)
  // loggedKeys: Set of snapshot_keys ("SYMBOL|EXCHANGE|QTY") persisted in DB
  // Auto-invalidates when qty changes (key won't match the new snapshot)
  const [loggedKeys, setLoggedKeys] = useState(new Set())
  // Stable ref so the reconciliation effect always sees current loggedKeys
  const loggedKeysRef = useRef(new Set())

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
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-3)', display: 'inline-block' }} />
          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Not connected</span>
          {error && <span style={{ fontSize: 12, color: 'var(--red)', marginLeft: 6 }}>{error}</span>}
        </div>
        <a
          href={loginUrl}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 16px', background: '#387ed1', color: '#fff',
            borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10 17 15 12 10 7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
          Connect Kite
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
      borderRadius: 12, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', borderBottom: expanded ? '1px solid var(--border)' : 'none',
        cursor: 'pointer',
      }} onClick={() => setExpanded(v => !v)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Kite Connect</span>
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
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
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
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
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
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
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
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
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
            )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inline LogModal */}
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
    </div>
  )
}
