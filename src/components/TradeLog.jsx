import { useState } from 'react'
import LogModal from './LogModal'

const fmt = (n) =>
  n == null ? '—' : new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)

const fmtCurr = (n) =>
  n == null ? '—' : `₹${fmt(Math.abs(n))}`

export default function TradeLog({ kite, strats, trades, onLogTrade }) {
  const { connected, loginUrl, error } = kite
  const [pendingTrades, setPendingTrades] = useState([])
  const [fetching, setFetching]           = useState(false)
  const [fetchError, setFetchError]       = useState(null)
  const [showManualLog, setShowManualLog] = useState(false)

  const today      = new Date().toISOString().slice(0, 10)
  const stratMap   = Object.fromEntries((strats ?? []).map(s => [s.id, s.name]))
  const todayTrades = (trades ?? []).filter(t => t.date === today)

  const handleImport = async () => {
    if (!connected) return
    setFetching(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/kite/trades', {
        headers: { Authorization: `Bearer ${localStorage.getItem('kite-access-token')}` },
      })
      if (!res.ok) throw new Error('Failed to fetch trades from Kite')
      const kiteTrades = await res.json()

      // Dedup: skip any kite trade whose order_id is already stored, or whose
      // instrument was already logged today
      const existingOrderIds  = new Set((trades ?? []).map(t => t.kiteOrderId).filter(Boolean))
      const existingToday     = new Set(
        (trades ?? []).filter(t => t.date === today).map(t => t.instrument?.toUpperCase())
      )
      const newTrades = kiteTrades.filter(t =>
        !existingOrderIds.has(t.order_id) &&
        !existingToday.has(t.tradingsymbol?.toUpperCase())
      )

      if (newTrades.length === 0) {
        setFetchError("No new trades to import — all of today's Kite trades are already logged.")
      } else {
        setPendingTrades(newTrades)
      }
    } catch (e) {
      setFetchError(e.message)
    } finally {
      setFetching(false)
    }
  }

  const handleSaveTrade = (trade) => {
    onLogTrade({ ...trade, kiteOrderId: pendingTrades[0]?.order_id })
    setPendingTrades(prev => prev.slice(1))
  }

  const handleSkip = () => setPendingTrades(prev => prev.slice(1))

  const currentPending = pendingTrades[0]

  // ── Not connected ─────────────────────────────────────────
  if (!connected) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-2)' }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
        <p style={{ marginBottom: 6, fontWeight: 600, color: 'var(--text)' }}>No broker connected</p>
        <p style={{ fontSize: 13, marginBottom: 20, color: 'var(--text-3)' }}>
          Connect your broker from the <strong>Connect Broker</strong> section to import trades.
        </p>
        {loginUrl && (
          <a href={loginUrl} style={{
            display: 'inline-block', padding: '9px 22px',
            background: '#387ed1', color: '#fff', borderRadius: 8,
            fontWeight: 600, fontSize: 14, textDecoration: 'none',
          }}>
            Connect Kite
          </a>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* LogModal for each pending kite trade — opens one at a time */}
      {currentPending && strats?.length > 0 && (
        <LogModal
          strategy={strats[0]}
          strats={strats}
          prefill={{
            instrument:  currentPending.tradingsymbol,
            entryPrice:  currentPending.average_price != null ? String(currentPending.average_price) : '',
            qty:         currentPending.quantity       != null ? String(Math.abs(currentPending.quantity)) : '',
            direction:   currentPending.transaction_type === 'SELL' ? 'short' : 'long',
            exchange:    currentPending.exchange ?? 'NSE',
            tradeType:   (() => {
              const p = currentPending.product
              if (p === 'CNC') return 'eq_delivery'
              if (p === 'MIS') return 'eq_intraday'
              if (p === 'NRML') return 'fo_nrml'
              return 'eq_delivery'
            })(),
            date: currentPending.fill_timestamp
              ? new Date(currentPending.fill_timestamp).toISOString().slice(0, 10)
              : today,
          }}
          onSave={handleSaveTrade}
          onClose={handleSkip}
          variant={null}
          score={{ done: 0, total: 0 }}
        />
      )}

      {/* Manual log modal */}
      {showManualLog && strats?.length > 0 && (
        <LogModal
          strategy={strats[0]}
          strats={strats}
          onSave={trade => { onLogTrade(trade); setShowManualLog(false) }}
          onClose={() => setShowManualLog(false)}
          variant={null}
          score={{ done: 0, total: 0 }}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>
            {todayTrades.length} trade{todayTrades.length !== 1 ? 's' : ''} logged today
          </p>
          {pendingTrades.length > 0 && (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#d97706' }}>
              {pendingTrades.length} trade{pendingTrades.length !== 1 ? 's' : ''} waiting to be logged…
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowManualLog(true)}
            className="btn-outline"
            style={{ padding: '8px 16px', fontSize: 13 }}
          >
            + Log Trade
          </button>
          {connected && (
            <button
              onClick={handleImport}
              disabled={fetching}
              className="btn-green"
              style={{ padding: '8px 18px', fontSize: 13, opacity: fetching ? 0.6 : 1, cursor: fetching ? 'default' : 'pointer' }}
            >
              {fetching ? 'Importing…' : 'Import from Kite'}
            </button>
          )}
        </div>
      </div>

      {(fetchError || error) && (
        <div style={{
          padding: '10px 14px', borderRadius: 8,
          background: 'rgba(220,38,38,0.08)',
          border: '1px solid rgba(220,38,38,0.2)',
          color: 'var(--red)', fontSize: 13, marginBottom: 16,
        }}>
          {fetchError || error}
        </div>
      )}

      {/* Table */}
      {todayTrades.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)', fontSize: 14 }}>
          No trades logged today. Click "Import from Kite" to get started.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Date', 'Symbol', 'Type', 'Qty', 'Entry', 'Strategy', 'P&L'].map((h) => (
                  <th key={h} style={{
                    padding: '8px 12px', textAlign: 'left',
                    fontSize: 11, fontWeight: 700, color: 'var(--text-3)',
                    textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {todayTrades.map((t, i) => (
                <tr key={t.id ?? i} style={{ borderBottom: '1px solid var(--border)', verticalAlign: 'middle' }}>
                  <td style={{ padding: '10px 12px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                    {t.date ?? '—'}
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                    {t.instrument}
                  </td>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                    <span style={{
                      fontSize: 12, fontWeight: 700,
                      color: t.direction === 'long' ? 'var(--green)' : 'var(--red)',
                    }}>
                      {t.direction === 'long' ? 'LONG' : 'SHORT'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-2)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {t.qty}
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text)' }}>
                    {fmtCurr(t.entryPrice)}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-2)' }}>
                    {stratMap[t.strategyId] ?? t.strategy ?? <span style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace' }}>
                    {t.pnl != null ? (
                      <span style={{ color: t.pnl > 0 ? 'var(--green)' : t.pnl < 0 ? 'var(--red)' : 'var(--text-2)', fontWeight: 600 }}>
                        {t.pnl >= 0 ? '+' : ''}₹{Math.abs(t.pnl).toFixed(0)}
                      </span>
                    ) : <span style={{ color: 'var(--text-3)' }}>Open</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
