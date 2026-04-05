import { useState, createContext, useContext } from "react";

// ── Simulator Spot Context ────────────────────────────────────────
// PLSimulator writes the entered spot here; DissectPanel reads it
export const SimSpotContext = createContext({ spot: null, setSpot: () => {} });
export function SimSpotProvider({ children }) {
  const [spot, setSpot] = useState(null);
  return <SimSpotContext.Provider value={{ spot, setSpot }}>{children}</SimSpotContext.Provider>;
}
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";

// ── Formatters ───────────────────────────────────────────────────
export const fmtINR = (n) =>
  "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmt2 = (n) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Style constants ──────────────────────────────────────────────
export const CARD = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 24,
  marginBottom: 20,
};

export const SEC_TITLE = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--text-2)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 20,
};

export const ERROR_BOX = {
  marginTop: 16,
  padding: "10px 14px",
  borderRadius: 8,
  background: "rgba(220,38,38,0.08)",
  color: "var(--red)",
  fontSize: 13,
  border: "1px solid rgba(220,38,38,0.2)",
};

// ── Primitive components ─────────────────────────────────────────
export function Field({ label, k, placeholder, hint, form, onChange }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
        {label}
      </label>
      <input
        type="number"
        className="t-inp font-mono"
        value={form[k]}
        onChange={(e) => onChange(k, e.target.value)}
        onWheel={(e) => e.target.blur()}
        placeholder={placeholder}
      />
      {hint && <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

export function StatCard({ label, val, sub, col }) {
  return (
    <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 18px" }}>
      <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 700, color: col ?? "var(--text)", margin: "0 0 4px", fontFamily: "JetBrains Mono, monospace" }}>{val}</p>
      {sub && <p style={{ fontSize: 11, color: "var(--text-3)", margin: 0 }}>{sub}</p>}
    </div>
  );
}

export function Row({ k, v, col, highlight }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: "var(--text-2)" }}>{k}</span>
      <span style={{ fontSize: 13, fontWeight: highlight ? 700 : 600, color: col ?? "var(--text)", fontFamily: "JetBrains Mono, monospace" }}>{v}</span>
    </div>
  );
}

// ── Direction badge styles ────────────────────────────────────────
export const DIR_STYLE = {
  long:    { bg: "var(--green-light)",        border: "rgba(45,122,95,0.25)",   text: "var(--green)", label: "↑ Long" },
  short:   { bg: "rgba(220,38,38,0.08)",      border: "rgba(220,38,38,0.25)",   text: "var(--red)",   label: "↓ Short" },
  neutral: { bg: "rgba(139,92,246,0.08)",     border: "rgba(139,92,246,0.25)",  text: "#7c3aed",      label: "↔ Neutral / Both Sides" },
};

// ── Payoff Chart ──────────────────────────────────────────────────
export function PayoffChart({ pnlFn, center, breakevens = [], title }) {
  const range = center * 0.35;
  const lo = Math.max(1, center - range);
  const hi = center + range;
  const steps = 120;
  const step = (hi - lo) / steps;

  const data = Array.from({ length: steps + 1 }, (_, i) => {
    const spot = lo + i * step;
    const pnl = pnlFn(spot);
    return { spot: Math.round(spot), profit: pnl >= 0 ? pnl : 0, loss: pnl < 0 ? pnl : 0, pnl };
  });

  const allPnl = data.map((d) => d.pnl);
  const maxPnl = Math.max(...allPnl);
  const minPnl = Math.min(...allPnl);
  const padding = Math.max(Math.abs(maxPnl), Math.abs(minPnl)) * 0.15;

  return (
    <div style={{ ...CARD, marginTop: 0 }}>
      <p style={{ ...SEC_TITLE, marginBottom: 16 }}>{title ?? "Payoff at Expiry"}</p>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="var(--green)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--green)" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="lossGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="5%"  stopColor="var(--red)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--red)" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="spot" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "var(--text-3)" }} axisLine={false} tickLine={false} interval={Math.floor(steps / 6)} />
          <YAxis tickFormatter={(v) => v >= 0 ? `+${v.toFixed(0)}` : `${v.toFixed(0)}`} tick={{ fontSize: 11, fill: "var(--text-3)" }} axisLine={false} tickLine={false} width={48} domain={[minPnl - padding, maxPnl + padding]} />
          <ReferenceLine y={0} stroke="var(--border-2)" strokeWidth={1.5} />
          {breakevens.map((be, i) => (
            <ReferenceLine key={i} x={Math.round(be)} stroke="var(--text-3)" strokeDasharray="4 3" strokeWidth={1} label={{ value: "BE", position: "top", fontSize: 10, fill: "var(--text-3)" }} />
          ))}
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload;
              const pnl = d?.pnl ?? 0;
              return (
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
                  <p style={{ color: "var(--text-2)", marginBottom: 3 }}>Spot: ₹{d?.spot?.toLocaleString("en-IN")}</p>
                  <p style={{ color: pnl >= 0 ? "var(--green)" : "var(--red)", fontWeight: 700, margin: 0 }}>
                    {pnl >= 0 ? "+" : "−"}₹{Math.abs(pnl).toFixed(2)}
                  </p>
                </div>
              );
            }}
          />
          <Area type="monotone" dataKey="profit" stroke="var(--green)" strokeWidth={2} fill="url(#profitGrad)" dot={false} activeDot={false} isAnimationActive={false} />
          <Area type="monotone" dataKey="loss"   stroke="var(--red)"   strokeWidth={2} fill="url(#lossGrad)"   dot={false} activeDot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", gap: 16, marginTop: 10, justifyContent: "center" }}>
        {[["var(--green)", "Profit zone"], ["var(--red)", "Loss zone"], ["var(--text-3)", "Breakeven"]].map(([col, lbl]) => (
          <span key={lbl} style={{ fontSize: 11, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 12, height: 3, background: col, borderRadius: 2, display: "inline-block", opacity: lbl === "Breakeven" ? 0.5 : 1 }} />
            {lbl}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── P&L Simulator ─────────────────────────────────────────────────
export function PLSimulator({ pnlFn, qty, breakevens = [], legFns = [], legLabels = [], isShort = false }) {
  const { setSpot: setCtxSpot } = useContext(SimSpotContext);
  const [spot, setSpot] = useState("");
  const spotVal = parseFloat(spot);
  const spotValid = !isNaN(spotVal) && spotVal > 0;
  const pnlPerUnit = spotValid ? pnlFn(spotVal) : null;
  const totalPnl   = spotValid ? pnlPerUnit * qty : null;

  const isProfit = spotValid && totalPnl > 0;
  const isLoss   = spotValid && totalPnl < 0;

  const statusBg     = isProfit ? "var(--green-light)" : isLoss ? "rgba(220,38,38,0.07)" : "var(--surface-2)";
  const statusBorder = isProfit ? "rgba(45,122,95,0.2)" : isLoss ? "rgba(220,38,38,0.2)" : "var(--border)";
  const statusColor  = isProfit ? "var(--green)" : isLoss ? "var(--red)" : "var(--text-2)";
  const statusLabel  = isProfit ? "PROFIT ▲" : isLoss ? "LOSS ▼" : "BREAKEVEN";

  return (
    <div style={CARD}>
      <p style={SEC_TITLE}>At-Expiry P&L Simulator</p>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
          Current Underlying Price (₹)
        </label>
        <input type="number" className="t-inp font-mono" value={spot} onChange={(e) => { setSpot(e.target.value); const v = parseFloat(e.target.value); setCtxSpot(!isNaN(v) && v > 0 ? v : null); }} placeholder="e.g. 510" style={{ maxWidth: 220 }} />
        <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>P&L if the underlying closes at this price at expiry (intrinsic value only)</p>
      </div>

      {spotValid && (
        <>
          <div style={{ background: statusBg, border: `1px solid ${statusBorder}`, borderRadius: 12, padding: "18px 22px", marginBottom: breakevens.length > 0 ? 14 : 0 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: statusColor, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{statusLabel}</p>
            <p style={{ fontSize: 40, fontWeight: 800, color: statusColor, margin: "0 0 4px", fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>
              {totalPnl >= 0 ? "+" : "−"}{fmtINR(Math.abs(totalPnl))}
            </p>
            <p style={{ fontSize: 12, color: statusColor, opacity: 0.7, margin: 0 }}>
              {pnlPerUnit >= 0 ? "+" : "−"}{fmtINR(Math.abs(pnlPerUnit))} per unit × {qty.toLocaleString("en-IN")} units
            </p>
          </div>

          {breakevens.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: breakevens.length > 1 ? "1fr 1fr" : "1fr", gap: 10 }}>
              {breakevens.map((be, i) => {
                const isLower  = breakevens.length > 1 && i === 0;
                const isUpper  = breakevens.length > 1 && i === 1;
                const isSingle = breakevens.length === 1;
                const dist = spotVal - be;
                const pct  = (Math.abs(dist) / be) * 100;
                const atBE = Math.abs(dist) < 0.005;

                const overallPnl = pnlFn(spotVal) * qty;
                const inProfit   = overallPnl > 0;
                const inLoss     = overallPnl < 0;

                const legPnlPerUnit = legFns[i] ? legFns[i](spotVal) : null;
                const legTotal      = legPnlPerUnit !== null ? legPnlPerUnit * qty : null;

                const bg     = atBE ? "var(--surface-2)" : legTotal === null ? "var(--surface-2)" : legTotal > 0 ? "var(--green-light)" : "rgba(220,38,38,0.07)";
                const border = atBE ? "var(--border)"    : legTotal === null ? "var(--border)"    : legTotal > 0 ? "rgba(45,122,95,0.2)" : "rgba(220,38,38,0.25)";
                const dc     = atBE ? "var(--text-2)"    : legTotal === null ? "var(--text-2)"    : legTotal > 0 ? "var(--green)"         : "var(--red)";

                const label = isSingle ? "Breakeven" : isLower ? "Lower Breakeven" : "Upper Breakeven";

                let statusMsg;
                if (atBE) {
                  statusMsg = "At breakeven";
                } else if (isShort) {
                  const outsideLower = isLower && dist < 0;
                  const outsideUpper = isUpper && dist > 0;
                  const outside = isSingle ? inLoss : outsideLower || outsideUpper;
                  if (outside) {
                    statusMsg = `✗ Price broke past the ${isLower ? "lower" : "upper"} breakeven — position is losing`;
                  } else {
                    statusMsg = `✓ Price is inside the safe zone — ${fmtINR(Math.abs(dist))} away from ${isLower ? "lower" : "upper"} BE (${fmt2(pct)}%)`;
                  }
                } else {
                  if (inProfit) {
                    statusMsg = `✓ ${fmtINR(Math.abs(dist))} ${dist > 0 ? "above" : "below"} BE (${fmt2(pct)}%)`;
                  } else {
                    const side = isSingle ? "" : isLower ? "lower " : "upper ";
                    statusMsg = `✗ Price hasn't crossed the ${side}breakeven yet`;
                  }
                }

                return (
                  <div key={i} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "12px 14px" }}>
                    <p style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: "0 0 5px", fontFamily: "JetBrains Mono, monospace" }}>{fmtINR(be)}</p>
                    <p style={{ fontSize: 11, color: dc, margin: 0, lineHeight: 1.4 }}>{statusMsg}</p>
                    {legFns.length > 0 && (
                      <div style={{ marginTop: 8, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                        {legFns.length > breakevens.length
                          ? legFns.map((fn, li) => {
                              const lp = fn(spotVal) * qty;
                              const lLabel = legLabels[li] ?? `Leg ${li + 1}`;
                              return (
                                <div key={li} style={{ display: "flex", justifyContent: "space-between", marginBottom: li < legFns.length - 1 ? 4 : 0 }}>
                                  <span style={{ fontSize: 11, color: "var(--text-3)" }}>{lLabel}</span>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: lp >= 0 ? "var(--green)" : "var(--red)", fontFamily: "JetBrains Mono, monospace" }}>
                                    {lp >= 0 ? "+" : "−"}{fmtINR(Math.abs(lp))}
                                  </span>
                                </div>
                              );
                            })
                          : legTotal !== null && (
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ fontSize: 11, color: "var(--text-3)" }}>{legLabels[i] ?? "This leg"}</span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: legTotal >= 0 ? "var(--green)" : "var(--red)", fontFamily: "JetBrains Mono, monospace" }}>
                                  {legTotal >= 0 ? "+" : "−"}{fmtINR(Math.abs(legTotal))}
                                </span>
                              </div>
                            )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── ZONE helpers + TradeExpectation ──────────────────────────────
export const ZONE = {
  loss:     (label, sublabel, sub2, flex = 1) => ({ label, sublabel, sub2, flex, stripBg: "rgba(220,38,38,0.65)", labelColor: "var(--red)",   labelBg: "rgba(220,38,38,0.05)" }),
  profit:   (label, sublabel, sub2, flex = 1) => ({ label, sublabel, sub2, flex, stripBg: "var(--green)",          labelColor: "var(--green)", labelBg: "rgba(45,122,95,0.07)"  }),
  building: (label, sublabel, sub2, flex = 1) => ({ label, sublabel, sub2, flex, stripBg: "linear-gradient(90deg,#d97706 0%,var(--green) 100%)", labelColor: "#d97706", labelBg: "rgba(217,119,6,0.04)" }),
  eroding:  (label, sublabel, sub2, flex = 1) => ({ label, sublabel, sub2, flex, stripBg: "linear-gradient(90deg,var(--green) 0%,#d97706 50%,rgba(220,38,38,0.7) 100%)", labelColor: "var(--red)", labelBg: "rgba(220,38,38,0.04)" }),
};

export function TradeExpectation({ zones, ideal, exitRule }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "12px 16px", background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>📈 Trade Expectation</p>
        <p style={{ fontSize: 11, color: "var(--text-3)", margin: "3px 0 0" }}>{ideal}</p>
      </div>
      <div style={{ display: "flex", height: 8 }}>
        {zones.map((z, i) => <div key={i} style={{ flex: z.flex, background: z.stripBg }} />)}
      </div>
      <div style={{ display: "flex" }}>
        {zones.map((z, i) => (
          <div key={i} style={{ flex: z.flex, padding: "8px 10px", borderRight: i < zones.length - 1 ? "1px solid var(--border)" : "none", background: z.labelBg }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: z.labelColor, margin: "0 0 2px", textTransform: "uppercase" }}>{z.label}</p>
            <p style={{ fontSize: 10, color: "var(--text-3)", margin: 0 }}>{z.sublabel}</p>
            {z.sub2 && <p style={{ fontSize: 10, color: "var(--text-3)", margin: "2px 0 0" }}>{z.sub2}</p>}
          </div>
        ))}
      </div>
      {exitRule && (
        <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", background: "var(--surface-2)", display: "flex", gap: 8, alignItems: "flex-start" }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
          <p style={{ fontSize: 11, color: "var(--text-2)", margin: 0, lineHeight: 1.55 }}>{exitRule}</p>
        </div>
      )}
    </div>
  );
}

// ── Dissect Panel ─────────────────────────────────────────────────
// steps: { label, formula, result, resultCol?, note? }
// legs:  { label, action:"Buy"|"Sell", qty, type:"Call"|"Put", strike?, premium }
export function DissectPanel({ steps = [], legs = [], lotQty = 0 }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab]   = useState("dissect");
  const hasLegs = legs.length > 0;
  const { spot: simSpot } = useContext(SimSpotContext);
  const simValid = simSpot != null && simSpot > 0;

  // Net premium from all legs (+credit / −debit)
  const netPerUnit = hasLegs
    ? legs.reduce((sum, leg) => sum + (leg.action === "Sell" ? 1 : -1) * (leg.qty ?? 1) * leg.premium, 0)
    : 0;
  const totalNet  = lotQty > 0 ? netPerUnit * lotQty : null;
  const netLabel  = netPerUnit >= 0 ? "Net Credit" : "Net Debit";
  const netCol    = netPerUnit >= 0 ? "var(--green)" : "var(--red)";

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
      {/* Header toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 18px", background: open ? "var(--surface)" : "var(--surface-2)", border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif", transition: "background 0.15s" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 15 }}>🔬</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Dissect Calculation</span>
        </div>
        <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "Inter, sans-serif" }}>{open ? "▲ collapse" : "▼ expand"}</span>
      </button>

      {open && (
        <>
          {/* Tab bar — only shown when legs are provided */}
          {hasLegs && (
            <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
              {[["dissect", "📐  Steps"], ["legs", "🦵  Legs"]].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  style={{ flex: 1, padding: "9px 0", border: "none", borderBottom: tab === key ? "2px solid var(--green)" : "2px solid transparent", background: "transparent", color: tab === key ? "var(--text)" : "var(--text-3)", fontWeight: tab === key ? 700 : 500, fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif", letterSpacing: "0.03em", transition: "all 0.15s" }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* ── Steps tab (always shown when no legs; or when tab=dissect) ── */}
          {(!hasLegs || tab === "dissect") && (
            <div style={{ padding: "0 0 8px" }}>
              {steps.map((step, i) => (
                <div key={i} style={{ padding: "14px 18px", borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "1fr auto", gap: "6px 16px", alignItems: "start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: "var(--text-3)", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 4, padding: "1px 6px", fontFamily: "JetBrains Mono, monospace", flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{step.label}</span>
                    </div>
                    <code style={{ fontSize: 11, color: "var(--text-3)", background: "var(--surface-2)", borderRadius: 6, padding: "3px 8px", display: "inline-block", fontFamily: "JetBrains Mono, monospace", lineHeight: 1.5 }}>{step.formula}</code>
                    {step.note && <p style={{ fontSize: 11, color: "var(--text-3)", margin: "6px 0 0", lineHeight: 1.45 }}>{step.note}</p>}
                  </div>
                  <div style={{ textAlign: "right", paddingTop: 2 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: step.resultCol ?? "var(--text)", fontFamily: "JetBrains Mono, monospace", whiteSpace: "nowrap" }}>{step.result}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Legs tab ── */}
          {hasLegs && tab === "legs" && (
            <div style={{ padding: "0 0 4px" }}>
              {legs.map((leg, i) => {
                const legQty   = leg.qty ?? 1;
                const sign     = leg.action === "Sell" ? 1 : -1;
                const contrib  = sign * legQty * leg.premium;
                const isCredit = contrib >= 0;
                const ac = isCredit ? "var(--green)" : "var(--red)";
                const ab = isCredit ? "var(--green-light)" : "rgba(220,38,38,0.07)";
                const abord = isCredit ? "rgba(45,122,95,0.25)" : "rgba(220,38,38,0.25)";
                return (
                  <div key={i} style={{ borderTop: "1px solid var(--border)" }}>
                    {/* Main leg row */}
                    <div style={{ padding: "11px 18px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: "var(--text-3)", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 4, padding: "1px 6px", fontFamily: "JetBrains Mono, monospace", flexShrink: 0 }}>L{i + 1}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: ac, background: ab, border: `1px solid ${abord}`, borderRadius: 6, padding: "2px 8px", flexShrink: 0 }}>{leg.action}</span>
                      {legQty > 1 && <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)", flexShrink: 0 }}>{legQty}×</span>}
                      <span style={{ fontSize: 12, color: "var(--text-2)", flexShrink: 0 }}>{leg.type ?? "Option"}</span>
                      <span style={{ fontSize: 12, color: "var(--text)", flexGrow: 1, minWidth: 80 }}>{leg.label}</span>
                      {leg.strike != null && <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "JetBrains Mono, monospace", flexShrink: 0 }}>@ {fmtINR(leg.strike)}</span>}
                      <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "JetBrains Mono, monospace", flexShrink: 0 }}>₹{leg.premium}{legQty > 1 ? ` × ${legQty}` : ""}</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: ac, fontFamily: "JetBrains Mono, monospace", minWidth: 90, textAlign: "right", flexShrink: 0 }}>
                        {isCredit ? "+" : "−"}{fmtINR(Math.abs(contrib))}
                      </span>
                    </div>
                    {/* Leg explanation */}
                    {leg.desc && (() => {
                      const hasStrike = leg.strike != null && leg.premium != null;
                      const isCall    = leg.type === "Call";
                      const isPut     = leg.type === "Put";
                      const legBE     = hasStrike && isCall ? leg.strike + leg.premium
                                      : hasStrike && isPut  ? leg.strike - leg.premium
                                      : null;
                      const beLabel   = isCall ? "Strike + Premium" : "Strike − Premium";
                      const beNote    = leg.action === "Buy"
                        ? (isCall ? "profit above this" : "profit below this")
                        : (isCall ? "loss above this"   : "loss below this");
                      return (
                        <div style={{ margin: "0 18px 10px", padding: "8px 12px", background: "var(--surface-2)", borderRadius: 7, border: "1px solid var(--border)", borderLeft: `3px solid ${ac}` }}>
                          {/* Premium calculation row */}
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: legBE !== null ? 6 : 6, flexWrap: "wrap" }}>
                            <code style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "JetBrains Mono, monospace", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 5, padding: "2px 7px", whiteSpace: "nowrap" }}>
                              {leg.action === "Sell" ? "+" : "−"}₹{leg.premium}
                              {legQty > 1 ? ` × ${legQty} legs` : ""}
                              {lotQty > 0 ? ` × ${lotQty} units` : ""}
                            </code>
                            <span style={{ fontSize: 11, color: "var(--text-3)" }}>→</span>
                            <span style={{ fontSize: 13, fontWeight: 800, color: ac, fontFamily: "JetBrains Mono, monospace" }}>
                              {isCredit ? "+" : "−"}{fmtINR(Math.abs(contrib * (lotQty || 1)))}
                            </span>
                            <span style={{ fontSize: 10, color: "var(--text-3)", marginLeft: 2 }}>{isCredit ? "credit" : "cost"}</span>
                          </div>
                          {/* Breakeven row */}
                          {legBE !== null && (
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0 }}>Leg BE:</span>
                              <code style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "JetBrains Mono, monospace", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 5, padding: "2px 7px", whiteSpace: "nowrap" }}>
                                {beLabel} = {fmtINR(leg.strike)} {isCall ? "+" : "−"} {fmtINR(leg.premium)}
                              </code>
                              <span style={{ fontSize: 11, color: "var(--text-3)" }}>→</span>
                              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", fontFamily: "JetBrains Mono, monospace" }}>{fmtINR(legBE)}</span>
                              <span style={{ fontSize: 10, color: "var(--text-3)", marginLeft: 2 }}>({beNote})</span>
                            </div>
                          )}
                          {/* Simulator P&L row */}
                          {simValid && leg.strike != null && leg.premium != null && (() => {
                            const legQ      = leg.qty ?? 1;
                            const intrinsic = leg.type === "Call"
                              ? Math.max(0, simSpot - leg.strike)
                              : Math.max(0, leg.strike - simSpot);
                            const pnlUnit   = leg.action === "Buy" ? intrinsic - leg.premium : leg.premium - intrinsic;
                            const pnlTotal  = pnlUnit * legQ * (lotQty || 1);
                            const pnlCol    = pnlUnit > 0 ? "var(--green)" : pnlUnit < 0 ? "var(--red)" : "var(--text-2)";
                            const intrinsicExpr = leg.type === "Call"
                              ? `Max(0, ${fmtINR(simSpot)} − ${fmtINR(leg.strike)})`
                              : `Max(0, ${fmtINR(leg.strike)} − ${fmtINR(simSpot)})`;
                            const formula = leg.action === "Buy"
                              ? `${intrinsicExpr} − ₹${leg.premium}`
                              : `₹${leg.premium} − ${intrinsicExpr}`;
                            return (
                              <div style={{ marginBottom: 6, padding: "5px 8px", background: pnlUnit > 0 ? "rgba(45,122,95,0.07)" : pnlUnit < 0 ? "rgba(220,38,38,0.06)" : "var(--surface)", borderRadius: 6, border: `1px solid ${pnlUnit > 0 ? "rgba(45,122,95,0.2)" : pnlUnit < 0 ? "rgba(220,38,38,0.2)" : "var(--border)"}` }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                                  Sim @ {fmtINR(simSpot)}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                  <code style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "JetBrains Mono, monospace", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 5, padding: "2px 7px", whiteSpace: "nowrap" }}>
                                    {formula}
                                  </code>
                                  <span style={{ fontSize: 11, color: "var(--text-3)" }}>→</span>
                                  <span style={{ fontSize: 13, fontWeight: 800, color: pnlCol, fontFamily: "JetBrains Mono, monospace", whiteSpace: "nowrap" }}>
                                    {pnlUnit >= 0 ? "+" : "−"}{fmtINR(Math.abs(pnlUnit))}<span style={{ fontSize: 10, fontWeight: 400, marginLeft: 2 }}>/unit</span>
                                  </span>
                                  {(legQ > 1 || lotQty > 1) && (
                                    <>
                                      <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                                        × {legQ > 1 ? `${legQ} legs` : ""}{legQ > 1 && lotQty > 1 ? " × " : ""}{lotQty > 1 ? `${lotQty} units` : ""}
                                      </span>
                                      <span style={{ fontSize: 11, color: "var(--text-3)" }}>→</span>
                                      <span style={{ fontSize: 14, fontWeight: 800, color: pnlCol, fontFamily: "JetBrains Mono, monospace", whiteSpace: "nowrap" }}>
                                        {pnlTotal >= 0 ? "+" : "−"}{fmtINR(Math.abs(pnlTotal))} total
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                          <p style={{ fontSize: 11, color: "var(--text-2)", margin: 0, lineHeight: 1.6 }}>{leg.desc}</p>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}

              {/* Summary row */}
              <div style={{ margin: "6px 18px 0", borderTop: "2px solid var(--border)" }} />
              <div style={{ padding: "10px 18px 6px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)" }}>{netLabel}</span>
                    <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: 6 }}>per underlying unit</span>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 800, color: netCol, fontFamily: "JetBrains Mono, monospace" }}>
                    {netPerUnit >= 0 ? "+" : "−"}{fmtINR(Math.abs(netPerUnit))}
                  </span>
                </div>
                {totalNet !== null && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)" }}>Total {netPerUnit < 0 ? "Cost" : "Credit"}</span>
                      <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: 6 }}>× {lotQty.toLocaleString("en-IN")} units</span>
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 800, color: netCol, fontFamily: "JetBrains Mono, monospace" }}>
                      {totalNet >= 0 ? "+" : "−"}{fmtINR(Math.abs(totalNet))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
