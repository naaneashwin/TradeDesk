import { fmt } from './ui'

function SummaryCard({ label, value, accent }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 24px', flex: 1 }}>
      <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 10 }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 700, color: accent ?? 'var(--text)', margin: 0, fontFamily: 'JetBrains Mono, monospace' }}>{value}</p>
    </div>
  )
}

function EquityCurve({ trades }) {
  const sorted = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date))
  if (sorted.length < 2) return <p style={{ color: 'var(--text-3)', fontSize: 13, padding: 20 }}>Not enough data.</p>

  // Build cumulative equity
  const points = sorted.reduce((acc, t) => {
    const prev = acc[acc.length - 1]?.y ?? 0
    acc.push({ date: t.date, y: prev + (t.pnl || 0) })
    return acc
  }, [])

  const W = 560, H = 220, PAD = { top: 16, right: 16, bottom: 40, left: 56 }
  const iW = W - PAD.left - PAD.right
  const iH = H - PAD.top - PAD.bottom

  const minY = Math.min(0, ...points.map(p => p.y))
  const maxY = Math.max(...points.map(p => p.y))
  const rangeY = maxY - minY || 1

  const xScale = i => PAD.left + (i / (points.length - 1)) * iW
  const yScale = v => PAD.top + iH - ((v - minY) / rangeY) * iH

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(p.y).toFixed(1)}`).join(' ')

  // Y grid lines
  const yTicks = 4
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => minY + (rangeY / yTicks) * i)

  // X date labels (up to 5)
  const xStep = Math.max(1, Math.floor(points.length / 5))
  const xLabels = points.filter((_, i) => i % xStep === 0 || i === points.length - 1)
    .map((p, _, arr) => p)
    .slice(0, 6)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      {/* Grid lines */}
      {yLabels.map((v, i) => {
        const y = yScale(v)
        return (
          <g key={i}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 4"/>
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="11" fill="#9ca3af">${Math.round(v)}</text>
          </g>
        )
      })}
      {/* X labels */}
      {points.filter((_, i) => {
        const step = Math.max(1, Math.floor(points.length / 5))
        return i % step === 0 || i === points.length - 1
      }).map((p, i) => (
        <text key={i} x={xScale(points.indexOf(p))} y={H - 8} textAnchor="middle" fontSize="11" fill="#9ca3af">{p.date}</text>
      ))}
      {/* Line */}
      <path d={pathD} fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={xScale(i)} cy={yScale(p.y)} r="4" fill="var(--green)" stroke="white" strokeWidth="2"/>
      ))}
    </svg>
  )
}

function DonutChart({ wins, losses }) {
  const total = wins + losses
  if (!total) return <p style={{ color: 'var(--text-3)', fontSize: 13 }}>No data.</p>
  const wr = Math.round(wins / total * 100)
  const R = 70, stroke = 18
  const circ = 2 * Math.PI * R
  const winArc  = (wins / total) * circ
  const lossArc = (losses / total) * circ
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ position: 'relative', width: 180, height: 180 }}>
        <svg viewBox="0 0 180 180" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
          {/* Loss arc (full circle background) */}
          <circle cx="90" cy="90" r={R} fill="none" stroke="#ef4444" strokeWidth={stroke}/>
          {/* Win arc */}
          <circle cx="90" cy="90" r={R} fill="none" stroke="var(--green)" strokeWidth={stroke}
            strokeDasharray={`${winArc} ${circ}`} strokeLinecap="butt"/>
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)' }}>{wr}%</span>
          <span style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>WIN RATE</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 20 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-2)' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }}/>
          Wins ({wins})
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-2)' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}/>
          Losses ({losses})
        </span>
      </div>
    </div>
  )
}

function PnlByStrategy({ trades, strats }) {
  const data = strats.map(st => ({
    name: st.name,
    pnl: trades.filter(t => t.strategyId === st.id).reduce((a, t) => a + (t.pnl || 0), 0),
  })).filter(d => d.pnl !== 0)

  if (!data.length) return <p style={{ color: 'var(--text-3)', fontSize: 13 }}>No data.</p>

  const maxAbs = Math.max(...data.map(d => Math.abs(d.pnl)))
  const W = 400, BAR_H = 28, GAP = 20, LABEL_W = 100, PAD_R = 20
  const chartW = W - LABEL_W - PAD_R
  const zeroX  = LABEL_W + (chartW / 2)

  // X axis ticks
  const tickVals = [-maxAbs, -maxAbs / 2, 0, maxAbs / 2, maxAbs]

  const H = data.length * (BAR_H + GAP) + 40

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      {/* Grid lines + x labels */}
      {tickVals.map((v, i) => {
        const x = LABEL_W + ((v + maxAbs) / (2 * maxAbs)) * chartW
        return (
          <g key={i}>
            <line x1={x} y1={0} x2={x} y2={H - 24} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 4"/>
            <text x={x} y={H - 8} textAnchor="middle" fontSize="11" fill="#9ca3af">
              ${Math.round(v / 1000) !== 0 ? `${Math.round(v / 1000)}k` : '0'}
            </text>
          </g>
        )
      })}
      {data.map((d, i) => {
        const y = i * (BAR_H + GAP) + 10
        const barW = (Math.abs(d.pnl) / maxAbs) * (chartW / 2)
        const x = d.pnl >= 0 ? zeroX : zeroX - barW
        return (
          <g key={d.name}>
            <text x={LABEL_W - 8} y={y + BAR_H / 2 + 4} textAnchor="end" fontSize="12" fill="#6b7280">{d.name}</text>
            <rect x={x} y={y} width={barW} height={BAR_H} rx="4" fill={d.pnl >= 0 ? 'var(--green)' : '#ef4444'}/>
          </g>
        )
      })}
    </svg>
  )
}

export default function StatsView({ trades, strats }) {
  if (!trades.length) return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '64px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
      No trades logged yet.
    </div>
  )

  const wins      = trades.filter(t => t.outcome === 'win').length
  const losses    = trades.filter(t => t.outcome === 'loss').length
  const totalPnl  = trades.reduce((a, t) => a + (t.pnl || 0), 0)
  const wr        = trades.length ? (wins / trades.length * 100).toFixed(1) : '0'
  const avgWin    = wins   ? trades.filter(t => t.outcome === 'win').reduce((a, t) => a + (t.pnl || 0), 0) / wins : 0
  const avgLoss   = losses ? Math.abs(trades.filter(t => t.outcome === 'loss').reduce((a, t) => a + (t.pnl || 0), 0) / losses) : 0
  const pf        = avgLoss > 0 ? (avgWin * wins / (avgLoss * losses)).toFixed(2) : '—'
  const largestW  = Math.max(...trades.filter(t => t.pnl > 0).map(t => t.pnl), 0)
  const largestL  = Math.min(...trades.filter(t => t.pnl < 0).map(t => t.pnl), 0)
  const expectancy = trades.length ? (totalPnl / trades.length).toFixed(2) : '0'

  const pnlColor = totalPnl >= 0 ? 'var(--green)' : 'var(--red)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 16 }}>
        <SummaryCard label="Total PnL"     value={`${totalPnl >= 0 ? '+' : ''}$${fmt(totalPnl)}`} accent={pnlColor}/>
        <SummaryCard label="Win Rate"      value={`${wr}%`}/>
        <SummaryCard label="Profit Factor" value={pf}/>
        <SummaryCard label="Total Trades"  value={trades.length}/>
      </div>

      {/* Equity curve + Donut */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 20px' }}>Equity Curve</h3>
          <EquityCurve trades={trades}/>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 24px', alignSelf: 'flex-start' }}>Win / Loss Ratio</h3>
          <DonutChart wins={wins} losses={losses}/>
        </div>
      </div>

      {/* PnL by Strategy + Advanced Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 20px' }}>PnL by Strategy</h3>
          <PnlByStrategy trades={trades} strats={strats}/>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 20px' }}>Advanced Metrics</h3>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              { label: 'Average Win',  value: `$${fmt(avgWin)}`,       color: 'var(--green)' },
              { label: 'Average Loss', value: `-$${fmt(avgLoss)}`,     color: 'var(--red)'   },
              { label: 'Largest Win',  value: `$${fmt(largestW)}`,     color: 'var(--green)' },
              { label: 'Largest Loss', value: `-$${fmt(Math.abs(largestL))}`, color: 'var(--red)' },
              { label: 'Expectancy',   value: `$${expectancy}`,        color: 'var(--text)'  },
            ].map(({ label, value, color }, i, arr) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontSize: 14, color: 'var(--text-2)' }}>{label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
