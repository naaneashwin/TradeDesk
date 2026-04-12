import { useState } from "react";
import { CARD, SEC_TITLE, Field, fmt2 } from "./shared";

// ─── Tier definitions ─────────────────────────────────────────────
const TIERS = {
  NORMAL:      { label: "Normal",            size: 100, action: "Enter full size",    color: "var(--green)",  bg: "var(--green-light)",           border: "rgba(45,122,95,0.2)" },
  EXTENDED:    { label: "Extended",          size: 75,  action: "Enter reduced size", color: "#d97706",       bg: "rgba(217,119,6,0.07)",          border: "rgba(217,119,6,0.25)" },
  EXHAUSTION:  { label: "Exhaustion Warning",size: 50,  action: "Enter half or skip", color: "#ea580c",       bg: "rgba(234,88,12,0.07)",          border: "rgba(234,88,12,0.25)" },
  CLIMACTIC:   { label: "Climactic",         size: 0,   action: "Skip entirely",      color: "var(--red)",    bg: "rgba(220,38,38,0.06)",          border: "rgba(220,38,38,0.2)" },
};
const TIER_ORDER = ["NORMAL", "EXTENDED", "EXHAUSTION", "CLIMACTIC"];
const worse = (a, b) => TIER_ORDER.indexOf(a) >= TIER_ORDER.indexOf(b) ? a : b;
const downgrade = t => {
  const i = TIER_ORDER.indexOf(t);
  return TIER_ORDER[Math.min(i + 1, TIER_ORDER.length - 1)];
};

// ─── Rule evaluation ──────────────────────────────────────────────
function evaluate(open, high, low, close, atr, volume, avgVolume) {
  const totalRange   = high - low;
  const body         = Math.abs(close - open);
  const bodyPctRange = totalRange > 0 ? (body / totalRange) * 100 : 0;
  const bodyPctPrice = open > 0      ? (body / open)       * 100 : 0;
  const upperWick    = high - Math.max(open, close);
  const lowerWick    = Math.min(open, close) - low;
  const atrMult      = atr > 0       ? totalRange / atr   : null;
  const volMult      = (avgVolume > 0 && volume > 0) ? volume / avgVolume : null;
  const isGreen      = close > open;
  const color        = isGreen ? "Green" : close < open ? "Red" : "Doji";

  // Rule 1 — Volume
  let rule1Label, volCaution = false, volumeClimax = false;
  if (volMult === null) {
    rule1Label = "Not provided — skipped";
  } else if (volMult >= 4) {
    rule1Label   = `${fmt2(volMult)}× — VOLUME CLIMAX`;
    volumeClimax = true;
  } else if (volMult >= 3) {
    rule1Label = `${fmt2(volMult)}× — Caution (3×–4×), tier will be downgraded`;
    volCaution = true;
  } else {
    rule1Label = `${fmt2(volMult)}× — Normal`;
  }

  if (volumeClimax) {
    return {
      totalRange, body, bodyPctRange, bodyPctPrice, upperWick, lowerWick,
      atrMult, volMult, color,
      rule1Label, rule2Label: "N/A", rule3Label: "N/A",
      decidingRule: "Rule 1 — Volume Climax", volumeAdjustment: "Not applicable",
      finalTier: "CLIMACTIC", volCaution: false, volumeClimax: true,
      plainEnglish: "Volume climax — skip regardless of candle size. All available buyers were exhausted in one session.",
    };
  }

  // Rule 2 — ATR multiple
  let rule2Tier, rule2Label;
  if (atrMult === null) {
    rule2Label = "ATR not provided — skipped";
    rule2Tier  = "NORMAL";
  } else if (atrMult >= 4) {
    rule2Tier  = "CLIMACTIC";
    rule2Label = `${fmt2(atrMult)}× ATR — Climactic (above 4×)`;
  } else if (atrMult >= 3) {
    rule2Tier  = "EXHAUSTION";
    rule2Label = `${fmt2(atrMult)}× ATR — Strong exhaustion warning (3×–4×)`;
  } else if (atrMult >= 2) {
    rule2Tier  = "EXTENDED";
    rule2Label = `${fmt2(atrMult)}× ATR — Extended (2×–3×)`;
  } else {
    rule2Tier  = "NORMAL";
    rule2Label = `${fmt2(atrMult)}× ATR — Normal range (below 2×)`;
  }

  // Rule 3 — Body % of price
  let rule3Tier, rule3Label;
  if (bodyPctPrice >= 7) {
    rule3Tier  = "CLIMACTIC";
    rule3Label = `${fmt2(bodyPctPrice)}% of price — Climactic (above 7%)`;
  } else if (bodyPctPrice >= 5) {
    rule3Tier  = "EXHAUSTION";
    rule3Label = `${fmt2(bodyPctPrice)}% of price — Strong exhaustion warning (5%–7%)`;
  } else if (bodyPctPrice >= 3) {
    rule3Tier  = "EXTENDED";
    rule3Label = `${fmt2(bodyPctPrice)}% of price — Extended (3%–5%)`;
  } else {
    rule3Tier  = "NORMAL";
    rule3Label = `${fmt2(bodyPctPrice)}% of price — Normal (below 3%)`;
  }

  const combinedTier  = worse(rule2Tier, rule3Tier);
  const decidingRule  = TIER_ORDER.indexOf(rule2Tier) >= TIER_ORDER.indexOf(rule3Tier)
    ? "Rule 2 — ATR Multiple"
    : "Rule 3 — Body % of Price";

  let finalTier = combinedTier;
  let volumeAdjustment = "Not applicable";
  if (volCaution) {
    finalTier         = downgrade(combinedTier);
    volumeAdjustment  = `Applied — volume ${fmt2(volMult)}× (3×–4×) caused one tier downgrade`;
  }

  const plainMap = {
    NORMAL:     "Normal session range — no exhaustion signals. Buyers (or sellers) moved price without overextending; this candle does not suggest imminent reversal.",
    EXTENDED:   "Extended range — buyers pushed harder than usual. The move is real but stretched; consider reducing position size to account for the elevated risk of a pullback.",
    EXHAUSTION: "Strong exhaustion warning — this candle covers significantly more ground than normal. The move may be real, but the risk of a snap-back is elevated. Trade at half size or wait for confirmation.",
    CLIMACTIC:  "Climactic candle — the range or body is too far beyond normal. All committed buyers (or sellers) have likely already acted. Entering here means chasing the last leg of the move. Skip.",
  };

  return {
    totalRange, body, bodyPctRange, bodyPctPrice, upperWick, lowerWick,
    atrMult, volMult, color,
    rule1Label, rule2Label, rule3Label,
    decidingRule, volumeAdjustment,
    finalTier, volCaution, volumeClimax: false,
    plainEnglish: plainMap[finalTier],
  };
}

// ─── Metric box ───────────────────────────────────────────────────
function M({ label, value, sub, col }) {
  return (
    <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "13px 15px" }}>
      <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", marginBottom: 5 }}>{label}</p>
      <p style={{ fontSize: 16, fontWeight: 700, color: col ?? "var(--text)", margin: "0 0 2px", fontFamily: "JetBrains Mono, monospace" }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: "var(--text-3)", margin: 0 }}>{sub}</p>}
    </div>
  );
}

// ─── Rule row ─────────────────────────────────────────────────────
const RULE_COL = {
  NORMAL:     { tag: "var(--green)", bg: "rgba(45,122,95,0.1)"  },
  EXTENDED:   { tag: "#d97706",      bg: "rgba(217,119,6,0.1)"  },
  EXHAUSTION: { tag: "#ea580c",      bg: "rgba(234,88,12,0.1)"  },
  CLIMACTIC:  { tag: "var(--red)",   bg: "rgba(220,38,38,0.1)"  },
  NA:         { tag: "var(--text-3)",bg: "var(--surface-2)"     },
};
function RuleRow({ num, label, value, tier }) {
  const c = RULE_COL[tier] ?? RULE_COL.NA;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10 }}>
      <div style={{ flexShrink: 0, width: 24, height: 24, borderRadius: "50%", background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: c.tag }}>{num}</div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 3px" }}>{label}</p>
        <p style={{ fontSize: 13, color: "var(--text)", margin: 0 }}>{value}</p>
      </div>
      {tier && tier !== "NA" && (
        <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: c.bg, color: c.tag, border: `1px solid ${c.tag}44`, whiteSpace: "nowrap" }}>
          {TIERS[tier]?.label ?? tier}
        </span>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────
export default function ClimacticCandleCalc() {
  const [form, setForm] = useState({ open: "", high: "", low: "", close: "", atr: "", volume: "", avgVolume: "" });
  const onChange = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const o = parseFloat(form.open),  h = parseFloat(form.high);
  const l = parseFloat(form.low),   c = parseFloat(form.close);
  const atr = parseFloat(form.atr) || 0;
  const vol = parseFloat(form.volume) || 0;
  const avg = parseFloat(form.avgVolume) || 0;

  const hasOHLC    = o > 0 && h > 0 && l > 0 && c > 0;
  const invalidOHLC = hasOHLC && (h < Math.max(o, c) || l > Math.min(o, c));
  const valid      = hasOHLC && !invalidOHLC;

  const res = valid ? evaluate(o, h, l, c, atr, vol, avg) : null;
  const tier = res ? TIERS[res.finalTier] : null;

  return (
    <div style={{ maxWidth: 640 }}>
      {/* Inputs */}
      <div style={{ ...CARD, marginBottom: 0 }}>
        <p style={SEC_TITLE}>OHLC + Context Inputs</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 4 }}>
          <Field label="Open (₹)"  k="open"  placeholder="490"   hint="Candle open"       form={form} onChange={onChange} />
          <Field label="High (₹)"  k="high"  placeholder="530"   hint="Candle high"       form={form} onChange={onChange} />
          <Field label="Low (₹)"   k="low"   placeholder="482"   hint="Candle low"        form={form} onChange={onChange} />
          <Field label="Close (₹)" k="close" placeholder="526"   hint="Candle close"      form={form} onChange={onChange} />
          <Field label="ATR(14) (₹)" k="atr" placeholder="18.5"  hint="14-period ATR"     form={form} onChange={onChange} />
          <div/>
          <Field label="Today's Volume"      k="volume"    placeholder="1200000" hint="Optional — enables Rule 1" form={form} onChange={onChange} />
          <Field label="20-bar Avg Volume"   k="avgVolume" placeholder="400000"  hint="Average volume baseline"  form={form} onChange={onChange} />
        </div>
        {invalidOHLC && <div style={{ marginTop: 10, padding: "10px 14px", background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 8, fontSize: 12, color: "var(--red)" }}>✗ Invalid candle: High must be ≥ max(Open, Close) and Low must be ≤ min(Open, Close).</div>}
      </div>

      {res && (
        <>
          {/* ── Calculations ── */}
          <div style={{ ...CARD, marginTop: 16 }}>
            <p style={SEC_TITLE}>Calculations</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <M label="Total Range"      value={`₹${fmt2(res.totalRange)}`}          sub="High − Low" />
              <M label="Body"             value={`₹${fmt2(res.body)}`}                sub="|Close − Open|" />
              <M label="Body % of Range"  value={`${fmt2(res.bodyPctRange)}%`}         sub="body / range"
                col={res.bodyPctRange >= 60 ? "var(--green)" : res.bodyPctRange >= 40 ? "#d97706" : "var(--red)"} />
              <M label="Body % of Price"  value={`${fmt2(res.bodyPctPrice)}%`}         sub="body / open"
                col={res.bodyPctPrice >= 7 ? "var(--red)" : res.bodyPctPrice >= 3 ? "#d97706" : "var(--green)"} />
              <M label="Upper Wick"       value={`₹${fmt2(res.upperWick)}`}            sub="High − max(O,C)" />
              <M label="Lower Wick"       value={`₹${fmt2(res.lowerWick)}`}            sub="min(O,C) − Low" />
              <M label="ATR Multiple"     value={res.atrMult !== null ? `${fmt2(res.atrMult)}×` : "—"}  sub="Range / ATR(14)"
                col={res.atrMult === null ? "var(--text-3)" : res.atrMult >= 4 ? "var(--red)" : res.atrMult >= 2 ? "#d97706" : "var(--green)"} />
              <M label="Volume Multiple"  value={res.volMult !== null ? `${fmt2(res.volMult)}×` : "—"}  sub="Vol / 20-bar avg"
                col={res.volMult === null ? "var(--text-3)" : res.volMult >= 4 ? "var(--red)" : res.volMult >= 3 ? "#ea580c" : "var(--green)"} />
              <M label="Candle Color"     value={res.color}
                col={res.color === "Green" ? "var(--green)" : res.color === "Red" ? "var(--red)" : "var(--text-2)"} />
            </div>
          </div>

          {/* ── Rule results ── */}
          <div style={{ ...CARD, marginTop: 16 }}>
            <p style={SEC_TITLE}>Rule Results</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <RuleRow num="1" label="Volume"
                value={res.rule1Label}
                tier={res.volMult === null ? "NA" : res.volumeClimax ? "CLIMACTIC" : res.volCaution ? "EXHAUSTION" : "NORMAL"} />
              <RuleRow num="2" label="ATR Multiple"
                value={res.rule2Label}
                tier={atr > 0 ? (res.atrMult >= 4 ? "CLIMACTIC" : res.atrMult >= 3 ? "EXHAUSTION" : res.atrMult >= 2 ? "EXTENDED" : "NORMAL") : "NA"} />
              <RuleRow num="3" label="Body % of Price"
                value={res.rule3Label}
                tier={res.bodyPctPrice >= 7 ? "CLIMACTIC" : res.bodyPctPrice >= 5 ? "EXHAUSTION" : res.bodyPctPrice >= 3 ? "EXTENDED" : "NORMAL"} />

              {/* Deciding rule + volume adjustment */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>Deciding rule</span>
                  <span style={{ fontSize: 13, color: "var(--text)" }}>{res.decidingRule}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>Vol adjust</span>
                  <span style={{ fontSize: 13, color: res.volCaution ? "#ea580c" : "var(--text-2)" }}>{res.volumeAdjustment}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Final verdict ── */}
          <div style={{ marginTop: 16, background: tier.bg, border: `1px solid ${tier.border}`, borderRadius: 14, padding: "22px 24px" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: tier.color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Final Verdict</p>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: tier.color, margin: 0 }}>{tier.label}</p>
              <div style={{ display: "flex", gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, padding: "5px 14px", borderRadius: 20, background: "rgba(0,0,0,0.06)", color: tier.color, border: `1px solid ${tier.border}` }}>
                  {tier.size}% position size
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, padding: "5px 14px", borderRadius: 20, background: "rgba(0,0,0,0.04)", color: "var(--text-2)", border: "1px solid var(--border)" }}>
                  {tier.action}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>💬</span>
              <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0, lineHeight: 1.7 }}>{res.plainEnglish}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
