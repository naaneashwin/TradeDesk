import { useState } from "react";
import { CARD, SEC_TITLE, Field, StatCard, DissectPanel, fmtINR, fmt2 } from "./shared";

// ─── Direction toggle ─────────────────────────────────────────────
function DirToggle({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {["long", "short"].map((d) => {
        const active = value === d;
        const isLong = d === "long";
        return (
          <button
            key={d}
            onClick={() => onChange(d)}
            style={{
              flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid",
              fontSize: 13, fontWeight: active ? 700 : 500, cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              background: active ? (isLong ? "rgba(45,122,95,0.1)" : "rgba(220,38,38,0.1)") : "var(--surface)",
              color: active ? (isLong ? "var(--green)" : "var(--red)") : "var(--text-2)",
              borderColor: active ? (isLong ? "var(--green)" : "var(--red)") : "var(--border)",
              transition: "all 0.15s",
            }}
          >
            {isLong ? "▲ Long" : "▼ Short"}
          </button>
        );
      })}
    </div>
  );
}

// ─── Price track visual ────────────────────────────────────────────
function PriceTrack({ entry, current, peak, trailSL, isLong }) {
  const peakLabel = isLong ? "Highest Since Entry" : "Lowest Since Entry";

  const rawPoints = [
    { label: "Entry",    price: entry,   color: "#6b7280" },
    { label: "Current",  price: current, color: isLong ? "#2d7a5f" : "#dc2626" },
    { label: peakLabel,  price: peak,    color: isLong ? "#3b82f6" : "#8b5cf6" },
    { label: "Trail SL", price: trailSL, color: "#f59e0b" },
  ].filter((p, _, arr) =>
    !(p.label === peakLabel && p.price === arr.find(a => a.label === "Current")?.price)
  ).sort((a, b) => b.price - a.price);

  const prices = rawPoints.map(p => p.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;

  // SVG geometry
  const W = 480, H = 220;
  const padT = 28, padB = 28;
  const trackH = H - padT - padB;
  const axisX  = 14;
  const dotX   = 20;
  const labelX = 34;

  const toY = (p) => padT + (1 - (p - minP) / range) * trackH;

  // Spread labels to prevent overlap
  const MIN_GAP = 40;
  const pts = rawPoints.map(p => ({ ...p, rawY: toY(p.price), labelY: toY(p.price) }));
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 1; i < pts.length; i++) {
      const gap = pts[i].labelY - pts[i - 1].labelY;
      if (gap < MIN_GAP) {
        const push = (MIN_GAP - gap) / 2;
        pts[i - 1].labelY -= push;
        pts[i].labelY     += push;
      }
    }
    pts.forEach(p => { p.labelY = Math.max(padT + 8, Math.min(H - padB - 8, p.labelY)); });
  }

  const peakPt  = pts.find(p => p.label === peakLabel) ?? pts[0];
  const trailPt = pts.find(p => p.label === "Trail SL");
  const bufTop    = trailPt ? Math.min(peakPt.rawY, trailPt.rawY) : peakPt.rawY;
  const bufHeight = trailPt ? Math.abs(trailPt.rawY - peakPt.rawY) : 0;

  return (
    <div style={{ ...CARD, marginBottom: 20 }}>
      <p style={SEC_TITLE}>Price Map</p>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", overflow: "visible" }}>
        {/* Axis line */}
        <line x1={axisX} y1={padT} x2={axisX} y2={H - padB} stroke="var(--border)" strokeWidth={2} strokeLinecap="round" />

        {/* ATR buffer shading */}
        {trailPt && bufHeight > 0 && (
          <rect x={axisX} y={bufTop} width={W - axisX - 8} height={bufHeight}
            fill="rgba(245,158,11,0.06)" />
        )}

        {pts.map(({ label, price, color, rawY, labelY }) => (
          <g key={label}>
            {/* Faint full-width guide at true price position */}
            <line x1={axisX} y1={rawY} x2={W - 8} y2={rawY}
              stroke={color} strokeWidth={1} strokeDasharray="4 6" opacity={0.18} />

            {/* Dot on axis */}
            <circle cx={dotX} cy={rawY} r={5} fill={color} stroke="var(--surface)" strokeWidth={2} />

            {/* Leader line from dot to label if displaced */}
            {Math.abs(labelY - rawY) > 3 && (
              <line x1={dotX} y1={rawY} x2={labelX - 2} y2={labelY}
                stroke={color} strokeWidth={1} strokeDasharray="3 3" opacity={0.45} />
            )}

            {/* Label name */}
            <text x={labelX} y={labelY - 6}
              fontSize={9} fontWeight="700" fill="var(--text-3)"
              fontFamily="Inter, sans-serif" textAnchor="start"
              style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {label}
            </text>

            {/* Price value */}
            <text x={labelX} y={labelY + 9}
              fontSize={13} fontWeight="700" fill={color}
              fontFamily="JetBrains Mono, monospace" textAnchor="start">
              ₹{price.toFixed(2)}
            </text>
          </g>
        ))}

        {/* ATR buffer label — only if zone is tall enough */}
        {trailPt && bufHeight > 22 && (
          <text x={W - 10} y={bufTop + bufHeight / 2 + 4}
            fontSize={10} fontWeight="700" fill="#f59e0b"
            fontFamily="Inter, sans-serif" textAnchor="end">
            ATR buffer
          </text>
        )}
      </svg>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────
export default function TrailingSLCalc({ direction: propDir = "long" }) {
  const [dir, setDir] = useState(propDir);
  const [form, setForm] = useState({ entry: "", current: "", peak: "", atr: "", mult: "1.5", qty: "1" });
  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const isLong   = dir === "long";
  const entry    = parseFloat(form.entry)   || 0;
  const current  = parseFloat(form.current) || 0;
  const peak     = parseFloat(form.peak)    || 0;
  const atr      = parseFloat(form.atr)     || 0;
  const mult     = parseFloat(form.mult)    || 1.5;
  const qty      = parseFloat(form.qty)     || 1;

  const valid    = entry > 0 && current > 0 && peak > 0 && atr > 0 && qty > 0;

  const atrBuffer  = valid ? mult * atr : null;
  // Trail is anchored to the highest (long) or lowest (short) price since entry
  const trailSL    = valid ? (isLong ? peak - atrBuffer : peak + atrBuffer) : null;

  const unrealizedPnL      = valid ? (isLong ? current - entry : entry - current) * qty : null;
  const pnlIfStopped       = valid ? (isLong ? trailSL - entry : entry - trailSL) * qty : null;
  const bufferPct          = valid && peak > 0 ? (atrBuffer / peak) * 100 : null;
  const isTrailBehindEntry = valid && (isLong ? trailSL < entry : trailSL > entry);

  const peakLabel = isLong ? "Highest Price Since Entry" : "Lowest Price Since Entry";
  const peakHint  = isLong ? "The highest price reached since you entered" : "The lowest price reached since you entered";

  const pnlColor   = (n) => n > 0 ? "var(--green)" : n < 0 ? "var(--red)" : "var(--text-2)";
  const trailColor = "#f59e0b";

  return (
    <div style={{ maxWidth: 680 }}>
      {/* ── Inputs ── */}
      <div style={CARD}>
        <p style={SEC_TITLE}>ATR Trailing Stop</p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Direction</label>
          <DirToggle value={dir} onChange={setDir} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Entry Price (₹)"    k="entry"   placeholder="500"  hint="Your original entry price"                   form={form} onChange={onChange} />
          <Field label={peakLabel + " (₹)"} k="peak"    placeholder="560"  hint={peakHint}                                   form={form} onChange={onChange} />
          <Field label="Current Price (₹)"  k="current" placeholder="540"  hint="Latest market price (for P&L display)"       form={form} onChange={onChange} />
          <Field label="ATR (14-period)"    k="atr"     placeholder="12.5" hint="Average True Range of the instrument"        form={form} onChange={onChange} />
          <Field label="Multiplier"         k="mult"    placeholder="1.5"  hint="Default 1.5× ATR — adjust for volatility"   form={form} onChange={onChange} />
          <Field label="Quantity (shares)"  k="qty"     placeholder="100"  hint="Number of shares / units held"              form={form} onChange={onChange} />
        </div>
      </div>

      {/* ── Results ── */}
      {valid && trailSL != null && (
        <>
          {/* Hero: Trailing SL price */}
          <div style={{
            background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: 12, padding: 24, marginBottom: 16,
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: trailColor, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              Trailing Stop Loss — ATR {fmt2(mult)}×
            </p>
            <p style={{ fontSize: 52, fontWeight: 800, color: trailColor, margin: "0 0 4px", fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>
              {fmtINR(trailSL)}
            </p>
            <p style={{ fontSize: 13, color: "rgba(245,158,11,0.8)", margin: 0 }}>
              Anchored to {peakLabel.toLowerCase()} ({fmtINR(peak)}) — {isLong ? "below" : "above"} by {fmtINR(atrBuffer)} ({fmt2(bufferPct)}%)
            </p>
          </div>

          {/* Warning if trail is behind entry (no profit locked) */}
          {isTrailBehindEntry && (
            <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "rgba(220,38,38,0.08)", color: "var(--red)", fontSize: 13, border: "1px solid rgba(220,38,38,0.2)" }}>
              ⚠ Trail SL is still {isLong ? "below" : "above"} your entry — no profit is locked in yet. The position is still at risk of a loss if stopped out.
            </div>
          )}

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
            <StatCard
              label="ATR Buffer"
              val={fmtINR(atrBuffer)}
              sub={`${fmt2(mult)}× ATR (${fmt2(atr)})`}
              col={trailColor}
            />
            <StatCard
              label="Unrealized P&L"
              val={(unrealizedPnL >= 0 ? "+" : "") + fmtINR(unrealizedPnL)}
              sub={`Entry → Current (${qty} units)`}
              col={pnlColor(unrealizedPnL)}
            />
            <StatCard
              label="P&L if Stopped"
              val={(pnlIfStopped >= 0 ? "+" : "") + fmtINR(pnlIfStopped)}
              sub={isTrailBehindEntry ? "Loss if SL hit" : "Min profit protected"}
              col={pnlColor(pnlIfStopped)}
            />
          </div>

          {/* Price map */}
          <PriceTrack entry={entry} current={current} peak={peak} trailSL={trailSL} isLong={isLong} />

          {/* Step-by-step dissect */}
          <DissectPanel
            steps={[
              {
                label:     "ATR Buffer",
                formula:   `multiplier × ATR = ${fmt2(mult)} × ${fmtINR(atr)}`,
                result:    fmtINR(atrBuffer),
                resultCol: trailColor,
                note:      `This gap is subtracted from the ${peakLabel.toLowerCase()} to set the trail.`,
              },
              {
                label:     "Trailing Stop Price",
                formula:   isLong
                  ? `peak − buffer = ${fmtINR(peak)} − ${fmtINR(atrBuffer)}`
                  : `peak + buffer = ${fmtINR(peak)} + ${fmtINR(atrBuffer)}`,
                result:    fmtINR(trailSL),
                resultCol: trailColor,
                note:      `Move this stop ${isLong ? "up" : "down"} whenever price makes a new ${isLong ? "high" : "low"} since entry. Never move it ${isLong ? "down" : "up"}.`,
              },
              {
                label:     "Unrealized P&L",
                formula:   isLong
                  ? `(current − entry) × qty = (${fmtINR(current)} − ${fmtINR(entry)}) × ${qty}`
                  : `(entry − current) × qty = (${fmtINR(entry)} − ${fmtINR(current)}) × ${qty}`,
                result:    (unrealizedPnL >= 0 ? "+" : "") + fmtINR(unrealizedPnL),
                resultCol: pnlColor(unrealizedPnL),
              },
              {
                label:     "P&L if Stopped Out",
                formula:   isLong
                  ? `(trailSL − entry) × qty = (${fmtINR(trailSL)} − ${fmtINR(entry)}) × ${qty}`
                  : `(entry − trailSL) × qty = (${fmtINR(entry)} − ${fmtINR(trailSL)}) × ${qty}`,
                result:    (pnlIfStopped >= 0 ? "+" : "") + fmtINR(pnlIfStopped),
                resultCol: pnlColor(pnlIfStopped),
                note:      isTrailBehindEntry
                  ? "You would exit at a loss — the trail hasn't caught up with entry yet."
                  : "This is the minimum profit you walk away with even if stopped out now.",
              },
            ]}
            legs={[]}
            lotQty={qty}
          />
        </>
      )}
    </div>
  );
}
