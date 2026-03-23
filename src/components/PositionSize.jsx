import { useState } from 'react'

const fmtINR = n => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmt2   = n => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function Field({ label, k, placeholder, hint, form, onChange }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</label>
      <input type="number" className="t-inp font-mono" value={form[k]} onChange={e => onChange(k, e.target.value)} placeholder={placeholder}/>
      {hint && <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{hint}</p>}
    </div>
  )
}

function StatCard({ label, val, sub, col }) {
  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
      <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 700, color: col ?? 'var(--text)', margin: '0 0 4px', fontFamily: 'JetBrains Mono, monospace' }}>{val}</p>
      {sub && <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>{sub}</p>}
    </div>
  )
}

export default function PositionSize() {
  const [form, setForm] = useState({ total: '', capital: '', risk: '1', entry: '', sl: '' })
  const onChange = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const total   = parseFloat(form.total)
  const capital = parseFloat(form.capital)
  const risk    = parseFloat(form.risk)
  const entry   = parseFloat(form.entry)
  const sl      = parseFloat(form.sl)

  const valid        = total > 0 && capital > 0 && risk > 0 && entry > 0 && sl > 0
  const riskPerShare = entry - sl
  const invalid      = valid && riskPerShare <= 0

  let result = null
  if (valid && riskPerShare > 0) {
    const maxRisk    = total * (risk / 100)
    const shares     = Math.floor(Math.min(maxRisk / riskPerShare, capital / entry))
    const capReq     = shares * entry
    const actualRisk = shares * riskPerShare
    const actualHeat = (actualRisk / total) * 100
    const capPct     = (capReq / capital) * 100
    result = { shares, capReq, actualRisk, actualHeat, capPct, maxRisk }
  }

  const barW   = result ? Math.min(result.capPct, 100) : 0
  const barCol = barW > 75 ? 'var(--red)' : barW > 40 ? '#d97706' : 'var(--green)'

  return (
    <div style={{ maxWidth: 640 }}>
      {/* Inputs */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 20 }}>Trade Inputs</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Total Portfolio Capital (₹)" k="total"   placeholder="100000" hint="Your total portfolio value"         form={form} onChange={onChange}/>
          <Field label="Capital for This Trade (₹)"  k="capital" placeholder="20000"  hint="Max capital allocated to this trade" form={form} onChange={onChange}/>
          <Field label="Risk Per Trade (%)"           k="risk"    placeholder="1"      hint="Typical: 0.5% – 2%"                 form={form} onChange={onChange}/>
          <Field label="Entry Price (₹)"              k="entry"   placeholder="500"    hint="Your planned entry price"           form={form} onChange={onChange}/>
          <Field label="Stop Loss Price (₹)"          k="sl"      placeholder="480"    hint="Must be below entry price"          form={form} onChange={onChange}/>
        </div>
        {invalid && (
          <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(220,38,38,0.08)', color: 'var(--red)', fontSize: 13, border: '1px solid rgba(220,38,38,0.2)' }}>
            ✗ Stop loss must be strictly below entry price.
          </div>
        )}
      </div>

      {result ? (
        <>
          {/* Hero result */}
          <div style={{ background: 'var(--green-light)', border: '1px solid rgba(45,122,95,0.2)', borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Shares to Buy</p>
            <p style={{ fontSize: 52, fontWeight: 800, color: 'var(--green)', margin: '0 0 4px', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{result.shares.toLocaleString('en-IN')}</p>
            <p style={{ fontSize: 13, color: 'rgba(45,122,95,0.7)', margin: 0 }}>shares @ {fmtINR(entry)} per share</p>
          </div>

          {/* Stat grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <StatCard label="Capital Required"   val={fmtINR(result.capReq)}        sub={`${fmt2(result.capPct)}% of trade capital`}/>
            <StatCard label="Actual Risk Amount" val={fmtINR(result.actualRisk)}     sub={`Max allowed: ${fmtINR(result.maxRisk)}`}   col="#d97706"/>
            <StatCard label="Portfolio Heat"     val={fmt2(result.actualHeat) + '%'} sub={`Target ${form.risk}% · Actual ${fmt2(result.actualHeat)}%`} col={result.actualHeat <= risk ? 'var(--green)' : '#d97706'}/>
            <StatCard label="Risk Per Share"     val={fmtINR(riskPerShare)}          sub={`${fmtINR(entry)} entry − ${fmtINR(sl)} stop`}/>
          </div>

          {/* Utilisation bar */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Trade Capital Utilisation</p>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700, color: barCol }}>{fmt2(result.capPct)}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ height: '100%', borderRadius: 4, width: `${barW}%`, background: barCol, transition: 'width 0.4s' }}/>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0, fontFamily: 'JetBrains Mono, monospace' }}>
              {fmtINR(result.capReq)} used · {fmtINR(capital - result.capReq)} remaining
            </p>
          </div>
        </>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '64px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
          Fill in all inputs above to see your position size.
        </div>
      )}
    </div>
  )
}
