import { useState, useMemo } from 'react'
import { calcBrokerage, TRADE_TYPE_LABELS } from '../../lib/brokerage'

const TRADE_TYPES = Object.entries(TRADE_TYPE_LABELS)
const EXCHANGES   = ['NSE', 'BSE']

function NumInput({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</label>
      <input
        type="number"
        className="t-inp font-mono"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? '0.00'}
        style={{ width: '100%' }}
      />
    </div>
  )
}

function Row({ label, value, bold, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: bold ? 700 : 500, color: color ?? 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>
        ₹{value.toFixed(2)}
      </span>
    </div>
  )
}

export default function BrokerageCalc() {
  const [tradeType,  setTradeType]  = useState('eq_intraday')
  const [exchange,   setExchange]   = useState('NSE')
  const [entryPrice, setEntryPrice] = useState('')
  const [exitPrice,  setExitPrice]  = useState('')
  const [qty,        setQty]        = useState('')

  const result = useMemo(() => calcBrokerage({
    tradeType,
    exchange,
    entryPrice: parseFloat(entryPrice) || 0,
    exitPrice:  parseFloat(exitPrice)  || 0,
    qty:        parseFloat(qty)        || 0,
  }), [tradeType, exchange, entryPrice, exitPrice, qty])

  const hasInput   = entryPrice && exitPrice && qty
  const grossPnl   = hasInput ? (parseFloat(exitPrice) - parseFloat(entryPrice)) * parseFloat(qty) : 0
  const netPnl     = hasInput && result ? grossPnl - result.total : null
  const breakeven  = hasInput && result && parseFloat(qty) > 0
    ? (parseFloat(entryPrice) + result.total / parseFloat(qty)).toFixed(2)
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {/* Trade Type */}
        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Trade Type</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {TRADE_TYPES.map(([id, label]) => {
              const active = tradeType === id
              return (
                <button key={id} onClick={() => setTradeType(id)}
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: active ? 700 : 500,
                    cursor: 'pointer', border: `1px solid ${active ? 'var(--green)' : 'var(--border)'}`,
                    background: active ? 'rgba(45,122,95,0.1)' : 'var(--surface-2)',
                    color: active ? 'var(--green)' : 'var(--text-2)',
                    fontFamily: 'Inter, sans-serif',
                  }}>
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Exchange */}
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Exchange</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {EXCHANGES.map(ex => {
              const active = exchange === ex
              return (
                <button key={ex} onClick={() => setExchange(ex)}
                  style={{
                    padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: active ? 700 : 500,
                    cursor: 'pointer', border: `1px solid ${active ? '#3b82f6' : 'var(--border)'}`,
                    background: active ? 'rgba(59,130,246,0.1)' : 'var(--surface-2)',
                    color: active ? '#3b82f6' : 'var(--text-2)',
                    fontFamily: 'Inter, sans-serif',
                  }}>
                  {ex}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Price inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
        <NumInput label={tradeType === 'fno_options' ? 'Buy Premium (₹)' : 'Entry Price (₹)'} value={entryPrice} onChange={setEntryPrice}/>
        <NumInput label={tradeType === 'fno_options' ? 'Sell Premium (₹)' : 'Exit Price (₹)'}  value={exitPrice}  onChange={setExitPrice}/>
        <NumInput label="Quantity / Lots" value={qty} onChange={setQty} placeholder="0"/>
      </div>

      {/* Breakdown */}
      {hasInput && result && (
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Charge Breakdown</p>
          <Row label="Brokerage"            value={result.brokerage}/>
          <Row label="STT / CTT"            value={result.stt}/>
          <Row label="Transaction Charges"  value={result.txnCharges}/>
          <Row label="SEBI Charges"         value={result.sebi}/>
          <Row label="Stamp Duty"           value={result.stamp}/>
          <Row label="GST (18%)"            value={result.gst}/>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0 0' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Total Charges</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--red)', fontFamily: 'JetBrains Mono, monospace' }}>−₹{result.total.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Summary cards */}
      {hasInput && result && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
          {[
            { label: 'Gross P&L',     value: `${grossPnl >= 0 ? '+' : ''}₹${grossPnl.toFixed(2)}`,   color: grossPnl >= 0 ? 'var(--green)' : 'var(--red)' },
            { label: 'Total Charges', value: `−₹${result.total.toFixed(2)}`,                          color: 'var(--red)' },
            { label: 'Net P&L',       value: `${netPnl >= 0 ? '+' : ''}₹${netPnl.toFixed(2)}`,       color: netPnl >= 0 ? 'var(--green)' : 'var(--red)' },
            { label: 'Breakeven',     value: `₹${breakeven}`,                                         color: 'var(--text)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>{label}</p>
              <p style={{ fontSize: 16, fontWeight: 800, color, margin: 0, fontFamily: 'JetBrains Mono, monospace' }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Charges as % of turnover */}
      {hasInput && result && parseFloat(entryPrice) > 0 && parseFloat(qty) > 0 && (
        <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>
          Charges are <strong style={{ color: 'var(--text-2)' }}>{((result.total / (parseFloat(entryPrice) * parseFloat(qty))) * 100).toFixed(3)}%</strong> of buy-side turnover.
        </p>
      )}
    </div>
  )
}
