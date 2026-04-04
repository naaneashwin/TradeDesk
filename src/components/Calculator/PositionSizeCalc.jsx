import { useState } from "react";
import { CARD, SEC_TITLE, ERROR_BOX, Field, StatCard, DissectPanel, fmtINR, fmt2 } from "./shared";

const ITEM_COLORS = [
  { id: "gray",   hex: "#d1d5db" }, { id: "indigo", hex: "#a8a4e8" },
  { id: "purple", hex: "#c7c4f0" }, { id: "blue",   hex: "#93c5fd" },
  { id: "teal",   hex: "#6ee7d4" }, { id: "amber",  hex: "#fcd34d" },
  { id: "coral",  hex: "#fca5a5" }, { id: "green",  hex: "#86efac" },
];

export default function PositionSizeCalc({ direction = "long" }) {
  const [form, setForm] = useState({ total: "", capital: "", risk: "1", entry: "", sl: "" });
  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // SL calculator state
  const [slMethod, setSlMethod] = useState("atr");
  const [slOpen, setSlOpen] = useState(false);
  const [atrForm, setAtrForm] = useState({ atr: "", mult: "1.5" });
  const [swingForm, setSwingForm] = useState({ swing: "" });
  const onAtr   = (k, v) => setAtrForm((p) => ({ ...p, [k]: v }));
  const onSwing = (k, v) => setSwingForm((p) => ({ ...p, [k]: v }));

  const isLong  = direction === "long";
  const entryVal = parseFloat(form.entry);
  const atrVal   = parseFloat(atrForm.atr);
  const multVal  = parseFloat(atrForm.mult) || 1.5;
  const swingVal = parseFloat(swingForm.swing);

  const atrSL   = entryVal > 0 && atrVal > 0
    ? (isLong ? entryVal - multVal * atrVal : entryVal + multVal * atrVal)
    : null;
  const swingSL = swingVal > 0 ? swingVal : null;
  const calcSL  = slMethod === "atr" ? atrSL : swingSL;

  const applySL = () => { if (calcSL != null) onChange("sl", calcSL.toFixed(2)); };

  const total   = parseFloat(form.total);
  const capital = parseFloat(form.capital);
  const risk    = parseFloat(form.risk);
  const entry   = parseFloat(form.entry);
  const sl      = parseFloat(form.sl);

  const valid = total > 0 && capital > 0 && risk > 0 && entry > 0 && sl > 0;
  const riskPerShare = isLong ? entry - sl : sl - entry;
  const invalid = valid && riskPerShare <= 0;

  let result = null;
  if (valid && riskPerShare > 0) {
    const maxRisk    = total * (risk / 100);
    const shares     = Math.floor(Math.min(maxRisk / riskPerShare, capital / entry));
    const capReq     = shares * entry;
    const actualRisk = shares * riskPerShare;
    const actualHeat = (actualRisk / total) * 100;
    const capPct     = (capReq / capital) * 100;
    result = { shares, capReq, actualRisk, actualHeat, capPct, maxRisk };
  }

  const barW   = result ? Math.min(result.capPct, 100) : 0;
  const barCol = barW > 75 ? "var(--red)" : barW > 40 ? "#d97706" : "var(--green)";

  const SlResult = ({ slPrice, pct, over, extraSub }) => (
    <>
      <div style={{ background: over ? "rgba(220,38,38,0.06)" : "var(--green-light)", border: `1px solid ${over ? "rgba(220,38,38,0.25)" : "rgba(45,122,95,0.2)"}`, borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Calculated SL</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: "var(--red)", margin: 0, fontFamily: "JetBrains Mono, monospace" }}>₹{slPrice.toFixed(2)}</p>
          <p style={{ fontSize: 11, color: "var(--text-3)", margin: "2px 0 0" }}>{extraSub} · {pct.toFixed(1)}% from entry</p>
        </div>
        <button onClick={applySL} style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: "var(--green)", color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: "Inter, sans-serif", flexShrink: 0 }}>
          Use this SL ↓
        </button>
      </div>
      {over && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", borderRadius: 8, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)" }}>
          <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>⚠️</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--red)", margin: "0 0 2px" }}>SL is {pct.toFixed(1)}% away — do not take this trade</p>
            <p style={{ fontSize: 12, color: "var(--text-2)", margin: 0 }}>
              {slMethod === "atr"
                ? "A stop loss wider than 5% exposes you to excessive risk. Consider a tighter entry, a smaller ATR multiplier, or skip this setup."
                : "A stop loss wider than 5% exposes you to excessive risk. Look for a tighter swing point, wait for price to move closer to the level, or skip this setup."}
            </p>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={CARD}>
        <p style={SEC_TITLE}>Trade Inputs</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Total Portfolio Capital (₹)" k="total"   placeholder="100000" hint="Your total portfolio value"          form={form} onChange={onChange} />
          <Field label="Capital for This Trade (₹)"  k="capital" placeholder="20000"  hint="Max capital allocated to this trade" form={form} onChange={onChange} />
          <Field label="Risk Per Trade (%)"           k="risk"    placeholder="1"      hint="Typical: 0.5% – 2%"                 form={form} onChange={onChange} />
          <Field label="Entry Price (₹)"              k="entry"   placeholder="500"    hint="Your planned entry price"           form={form} onChange={onChange} />

          {/* ── SL Calculator ────────────────────────────────── */}
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
              <button
                onClick={() => setSlOpen((v) => !v)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--surface-2)", border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif" }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Stop Loss Calculator</span>
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>{slOpen ? "▲ collapse" : "▼ expand"}</span>
              </button>

              {slOpen && (
                <div style={{ padding: "14px 16px" }}>
                  {/* Method tabs */}
                  <div style={{ display: "flex", gap: 0, marginBottom: 14, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                    {[["atr", "ATR-based"], ["swing", "Swing High/Low"]].map(([id, lbl]) => (
                      <button key={id} onClick={() => setSlMethod(id)} style={{ flex: 1, padding: "7px 0", border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, background: slMethod === id ? "var(--navy)" : "var(--surface)", color: slMethod === id ? "#fff" : "var(--text-2)", transition: "all 0.15s" }}>{lbl}</button>
                    ))}
                  </div>

                  {slMethod === "atr" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>ATR Value (₹)</label>
                          <input type="number" className="t-inp font-mono" value={atrForm.atr}  onChange={e => onAtr("atr",  e.target.value)} placeholder="e.g. 12.50" />
                          <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3 }}>14-period ATR from your chart</p>
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>Multiplier</label>
                          <input type="number" className="t-inp font-mono" value={atrForm.mult} onChange={e => onAtr("mult", e.target.value)} placeholder="1.5" />
                          <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3 }}>Typical: 1×–3× ATR</p>
                        </div>
                      </div>
                      {atrSL != null && (() => {
                        const pct  = entryVal > 0 ? (Math.abs(entryVal - atrSL) / entryVal) * 100 : 0;
                        const over = pct > 5;
                        return <SlResult slPrice={atrSL} pct={pct} over={over} extraSub={isLong ? `Entry − ${multVal}× ATR` : `Entry + ${multVal}× ATR`} />;
                      })()}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>
                          {isLong ? "Recent Swing Low (₹)" : "Recent Swing High (₹)"}
                        </label>
                        <input type="number" className="t-inp font-mono" value={swingForm.swing} onChange={e => onSwing("swing", e.target.value)} placeholder={isLong ? "Place below recent swing low" : "Place above recent swing high"} />
                        <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3 }}>{isLong ? "SL will be set exactly at this swing low" : "SL will be set exactly at this swing high"}</p>
                      </div>
                      {swingSL != null && (() => {
                        const pct  = entryVal > 0 ? (Math.abs(entryVal - swingSL) / entryVal) * 100 : 0;
                        const over = pct > 5;
                        return <SlResult slPrice={swingSL} pct={pct} over={over} extraSub={entryVal > 0 ? `Risk/share: ₹${Math.abs(entryVal - swingSL).toFixed(2)}` : ""} />;
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <Field label="Stop Loss Price (₹)" k="sl" placeholder={isLong ? "480" : "520"} hint={isLong ? "Must be below entry (long)" : "Must be above entry (short)"} form={form} onChange={onChange} />
        </div>
        {invalid && (
          <div style={ERROR_BOX}>
            {isLong ? "✗ Stop loss must be strictly below entry for a long trade." : "✗ Stop loss must be strictly above entry for a short trade."}
          </div>
        )}
      </div>

      {result && (
        <>
          <div style={{ background: isLong ? "var(--green-light)" : "rgba(220,38,38,0.07)", border: `1px solid ${isLong ? "rgba(45,122,95,0.2)" : "rgba(220,38,38,0.2)"}`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: isLong ? "var(--green)" : "var(--red)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{isLong ? "Shares to Buy" : "Shares to Short"}</p>
            <p style={{ fontSize: 52, fontWeight: 800, color: isLong ? "var(--green)" : "var(--red)", margin: "0 0 4px", fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>{result.shares.toLocaleString("en-IN")}</p>
            <p style={{ fontSize: 13, color: isLong ? "rgba(45,122,95,0.7)" : "rgba(220,38,38,0.7)", margin: 0 }}>shares @ {fmtINR(entry)} per share</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <StatCard label="Capital Required"   val={fmtINR(result.capReq)}    sub={`${fmt2(result.capPct)}% of trade capital`} />
            <StatCard label="Actual Risk Amount"  val={fmtINR(result.actualRisk)} sub={`Max allowed: ${fmtINR(result.maxRisk)}`} col="#d97706" />
            <StatCard label="Portfolio Heat"      val={fmt2(result.actualHeat) + "%"} sub={`Target ${form.risk}% · Actual ${fmt2(result.actualHeat)}%`} col={result.actualHeat <= risk ? "var(--green)" : "#d97706"} />
            <StatCard label="Risk Per Share"      val={fmtINR(riskPerShare)} sub={isLong ? `${fmtINR(entry)} entry − ${fmtINR(sl)} stop` : `${fmtINR(sl)} stop − ${fmtINR(entry)} entry`} />
          </div>

          <DissectPanel steps={[
            { label: "Max Allowable Risk", formula: `totalPortfolio × risk% = ${fmtINR(total)} × ${form.risk}%`, result: fmtINR(result.maxRisk), resultCol: "var(--red)", note: "The absolute maximum rupee loss you can take on this trade." },
            { label: "Risk per Share", formula: isLong ? `entry − stopLoss = ${fmtINR(entry)} − ${fmtINR(sl)}` : `stopLoss − entry = ${fmtINR(sl)} − ${fmtINR(entry)}`, result: fmtINR(riskPerShare) },
            { label: "Max Shares from Risk", formula: `maxRisk ÷ riskPerShare = ${fmtINR(result.maxRisk)} ÷ ${fmtINR(riskPerShare)}`, result: Math.floor(result.maxRisk / riskPerShare).toLocaleString("en-IN") },
            { label: "Max Shares from Capital", formula: `tradeCapital ÷ entry = ${fmtINR(capital)} ÷ ${fmtINR(entry)}`, result: Math.floor(capital / entry).toLocaleString("en-IN") },
            { label: "Shares to Trade", formula: `min(riskShares, capitalShares)`, result: result.shares.toLocaleString("en-IN"), resultCol: "var(--green)", note: "Smaller of the two limits — never exceed either." },
            { label: "Capital Required", formula: `shares × entry = ${result.shares} × ${fmtINR(entry)}`, result: fmtINR(result.capReq) },
            { label: "Actual Risk", formula: `shares × riskPerShare = ${result.shares} × ${fmtINR(riskPerShare)}`, result: fmtINR(result.actualRisk), resultCol: "var(--red)" },
            { label: "Portfolio Heat", formula: `actualRisk ÷ totalPortfolio × 100 = ${fmtINR(result.actualRisk)} ÷ ${fmtINR(total)} × 100`, result: fmt2(result.actualHeat) + "%" },
          ]} />

          <div style={CARD}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>Trade Capital Utilisation</p>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, fontWeight: 700, color: barCol }}>{fmt2(result.capPct)}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: "var(--border)", overflow: "hidden", marginBottom: 8 }}>
              <div style={{ height: "100%", borderRadius: 4, width: `${barW}%`, background: barCol, transition: "width 0.4s" }} />
            </div>
            <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0, fontFamily: "JetBrains Mono, monospace" }}>
              {fmtINR(result.capReq)} used · {fmtINR(capital - result.capReq)} remaining
            </p>
          </div>
        </>
      )}
    </div>
  );
}
