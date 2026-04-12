import { useState } from "react";
import { CARD, SEC_TITLE, ERROR_BOX, Field, fmt2 } from "./shared";

// ─── Contexts ─────────────────────────────────────────────────────
const CONTEXTS = [
  { id: "A", emoji: "🚀", label: "Breakout Entry",  desc: "Entering on a momentum breakout — buyers must dominate the full session with no hesitation." },
  { id: "B", emoji: "🔄", label: "Pullback Entry",  desc: "Entering on a bounce off support — a long lower wick rejection is expected and required." },
  { id: "C", emoji: "🛡",  label: "Trail Stop",      desc: "Deciding whether to trail your SL under this candle to protect profits." },
  { id: "D", emoji: "⚠️", label: "Exit Warning",    desc: "Scanning for distribution signals while already in a long position." },
];

// ─── Shared metrics ───────────────────────────────────────────────
function calcMetrics(open, high, low, close) {
  const totalRange         = high - low;
  const body               = Math.abs(close - open);
  const bodyPct            = totalRange > 0 ? (body / totalRange) * 100 : 0;
  const upperWick          = high - Math.max(open, close);
  const lowerWick          = Math.min(open, close) - low;
  const upperWickPct       = totalRange > 0 ? (upperWick / totalRange) * 100 : 0;
  const lowerWickPct       = totalRange > 0 ? (lowerWick / totalRange) * 100 : 0;
  const closePositionPct   = totalRange > 0 ? ((close - low) / totalRange) * 100 : 0;
  const upperWickBodyRatio = body > 0 ? upperWick / body : 0;
  const lowerWickBodyRatio = body > 0 ? lowerWick / body : 0;
  const isGreen            = close > open;
  const isRed              = close < open;
  const isDoji             = close === open;
  return { totalRange, body, bodyPct, upperWick, lowerWick, upperWickPct, lowerWickPct,
           closePositionPct, upperWickBodyRatio, lowerWickBodyRatio, isGreen, isRed, isDoji };
}

// ─── Candle visual ────────────────────────────────────────────────
function CandleVisual({ open, high, low, close, metrics, context }) {
  const isGreen = close > open;
  const colorRaw = isGreen ? "#2d7a5f" : "#dc2626";
  const H = 180, W = 100;
  const range = high - low || 1;
  const toY   = (p) => H - ((p - low) / range) * H;
  const bodyTop = toY(Math.max(open, close));
  const bodyBot = toY(Math.min(open, close));
  const bodyH   = Math.max(bodyBot - bodyTop, 3);
  const midX    = W / 2;

  // Bar colour logic varies by context
  const upperBar = context === "D"
    ? (metrics.upperWickBodyRatio > 1.5 ? "#dc2626" : metrics.upperWickBodyRatio > 1.0 ? "#d97706" : "#6b7280")
    : (metrics.upperWickBodyRatio > 1.0 ? "#dc2626" : metrics.upperWickBodyRatio > 0.5 ? "#d97706" : "#6b7280");
  const bodyBar = context === "B"
    ? (metrics.bodyPct >= 40 ? "#2d7a5f" : metrics.bodyPct >= 25 ? "#d97706" : "#dc2626")
    : (metrics.bodyPct >= 60 ? "#2d7a5f" : metrics.bodyPct >= 50 ? "#d97706" : "#dc2626");
  const lowerBar = context === "B"
    ? (metrics.lowerWickBodyRatio >= 1.5 ? "#2d7a5f" : metrics.lowerWickBodyRatio >= 1.0 ? "#d97706" : "#dc2626")
    : (metrics.lowerWickPct > 40 ? "#d97706" : "#6b7280");

  return (
    <div style={{ ...CARD, marginBottom: 16 }}>
      <p style={SEC_TITLE}>Candle Structure</p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 32 }}>
        <svg width={W} height={H + 40} viewBox={`0 0 ${W} ${H + 40}`} style={{ flexShrink: 0 }}>
          <line x1={midX} y1={toY(high) + 20} x2={midX} y2={bodyTop + 20} stroke={colorRaw} strokeWidth={2.5} strokeLinecap="round" />
          <rect x={midX - 18} y={bodyTop + 20} width={36} height={bodyH} fill={colorRaw} rx={3} opacity={0.9} />
          <line x1={midX} y1={bodyBot + 20} x2={midX} y2={toY(low) + 20} stroke={colorRaw} strokeWidth={2.5} strokeLinecap="round" />
          <line x1={midX + 5} y1={toY(close) + 20} x2={midX + 22} y2={toY(close) + 20} stroke={colorRaw} strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
          <text x={midX + 26} y={toY(high) + 23} fontSize={9} fill="var(--text-3)" fontFamily="JetBrains Mono, monospace">H</text>
          <text x={midX + 26} y={toY(low)  + 23} fontSize={9} fill="var(--text-3)" fontFamily="JetBrains Mono, monospace">L</text>
        </svg>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { label: "Upper Wick",     pct: metrics.upperWickPct,  bar: upperBar },
            { label: "Body",           pct: metrics.bodyPct,       bar: bodyBar  },
            { label: "Lower Wick",     pct: metrics.lowerWickPct,  bar: lowerBar },
          ].map(({ label, pct, bar }) => (
            <div key={label}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: bar, fontFamily: "JetBrains Mono, monospace" }}>{fmt2(pct)}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: bar, borderRadius: 4, transition: "width 0.4s" }} />
              </div>
            </div>
          ))}
          {/* Close position bar with 50% midline */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Close Position</span>
              <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", color: metrics.closePositionPct >= 50 ? "#2d7a5f" : "#dc2626" }}>{fmt2(metrics.closePositionPct)}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 4, background: "var(--border)", overflow: "hidden", position: "relative" }}>
              <div style={{ position: "absolute", left: "50%", top: 0, width: 1, height: "100%", background: "var(--border-2)", zIndex: 1 }} />
              <div style={{ height: "100%", width: `${Math.min(metrics.closePositionPct, 100)}%`, background: metrics.closePositionPct >= 50 ? "#2d7a5f" : "#dc2626", borderRadius: 4, transition: "width 0.4s" }} />
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
        {[["O", open, "var(--text-2)"], ["H", high, "var(--text)"], ["L", low, "var(--text)"], ["C", close, isGreen ? "var(--green)" : "var(--red)"]].map(([k, v, c]) => (
          <div key={k} style={{ textAlign: "center" }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{k}</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: c, margin: 0, fontFamily: "JetBrains Mono, monospace" }}>₹{v.toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Rule row ─────────────────────────────────────────────────────
const RULE_STYLE = {
  PASS:        { bg: "rgba(45,122,95,0.07)",  border: "rgba(45,122,95,0.22)",  tag: "#2d7a5f", tagBg: "rgba(45,122,95,0.12)",  label: "✓ PASS"         },
  CONDITIONAL: { bg: "rgba(217,119,6,0.07)",  border: "rgba(217,119,6,0.25)",  tag: "#d97706", tagBg: "rgba(217,119,6,0.12)",  label: "◐ CONDITIONAL"  },
  FAIL:        { bg: "rgba(220,38,38,0.07)",  border: "rgba(220,38,38,0.2)",   tag: "#dc2626", tagBg: "rgba(220,38,38,0.1)",   label: "✗ FAIL"         },
  COMPENSATED: { bg: "rgba(45,122,95,0.07)",  border: "rgba(45,122,95,0.22)",  tag: "#2d7a5f", tagBg: "rgba(45,122,95,0.12)",  label: "↑ COMPENSATED"  },
  SKIP:        { bg: "var(--surface-2)",       border: "var(--border)",         tag: "var(--text-3)", tagBg: "var(--surface)", label: "— SKIPPED"      },
  INFO:        { bg: "var(--surface-2)",       border: "var(--border)",         tag: "var(--text-2)", tagBg: "var(--surface)", label: "ℹ INFO"         },
};
function RuleRow({ number, title, metric, status, reason }) {
  const s = RULE_STYLE[status] ?? RULE_STYLE.INFO;
  return (
    <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: "16px 18px", display: "flex", gap: 16, alignItems: "flex-start" }}>
      <div style={{ flexShrink: 0, width: 26, height: 26, borderRadius: "50%", background: s.tagBg, border: `1.5px solid ${s.tag}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: s.tag, marginTop: 1 }}>{number}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: 0 }}>{title}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {metric && <span style={{ fontSize: 12, fontWeight: 700, color: s.tag, fontFamily: "JetBrains Mono, monospace" }}>{metric}</span>}
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 20, background: s.tagBg, color: s.tag, border: `1px solid ${s.tag}44`, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{s.label}</span>
          </div>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-2)", margin: 0, lineHeight: 1.6 }}>{reason}</p>
      </div>
    </div>
  );
}

// ─── Warning row (Context D) ──────────────────────────────────────
function WarningRow({ index, trigger, reason }) {
  return (
    <div style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.18)", borderRadius: 12, padding: "14px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
      <div style={{ flexShrink: 0, width: 26, height: 26, borderRadius: "50%", background: "rgba(220,38,38,0.12)", border: "1.5px solid #dc2626", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#dc2626", marginTop: 1 }}>!</div>
      <div>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", margin: "0 0 4px", fontFamily: "JetBrains Mono, monospace" }}>{trigger}</p>
        <p style={{ fontSize: 12, color: "var(--text-2)", margin: 0, lineHeight: 1.55 }}>{reason}</p>
      </div>
    </div>
  );
}

// ─── Metric box ───────────────────────────────────────────────────
function MetricBox({ label, value, sub, col }) {
  return (
    <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
      <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 17, fontWeight: 700, color: col ?? "var(--text)", margin: "0 0 3px", fontFamily: "JetBrains Mono, monospace" }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: "var(--text-3)", margin: 0 }}>{sub}</p>}
    </div>
  );
}

// ─── Verdict banner ───────────────────────────────────────────────
function VerdictBanner({ label, color, bg, border, sizeNote, plain, sizeIcon = "📐" }) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: "22px 24px" }}>
      <p style={{ fontSize: 10, fontWeight: 600, color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Final Verdict</p>
      <p style={{ fontSize: 20, fontWeight: 800, color, margin: "0 0 14px", lineHeight: 1.3 }}>{label}</p>
      {sizeNote && (
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 14px", background: "rgba(0,0,0,0.04)", borderRadius: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{sizeIcon}</span>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: 0 }}>{sizeNote}</p>
        </div>
      )}
      {plain && (
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>💬</span>
          <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0, lineHeight: 1.65 }}>{plain}</p>
        </div>
      )}
    </div>
  );
}

// ─── Context A: Breakout / Momentum ──────────────────────────────
function evaluateA(open, high, low, close) {
  const m = calcMetrics(open, high, low, close);
  const { bodyPct, closePositionPct, upperWickBodyRatio, lowerWickBodyRatio, isGreen } = m;
  const rules = [];

  // Rule 1 — Direction
  if (!isGreen) {
    rules.push({ number: 1, title: "Direction — Green Required", metric: "Red ↓", status: "FAIL", reason: "Red candle — buyers did not close in control. Momentum is not confirmed by price action. Wait for the next session or reduce size significantly." });
    return { m, rules, verdict: null };
  }
  rules.push({ number: 1, title: "Direction — Green Required", metric: "Green ↑", status: "PASS", reason: "Bullish close — the foundational condition for a breakout entry is met. Buyers held the field." });

  // Rule 2 — Body %
  let bodyStatus;
  if (bodyPct >= 60)      { bodyStatus = "PASS";        rules.push({ number: 2, title: "Body Strength", metric: `${fmt2(bodyPct)}%`, status: "PASS",        reason: `Body covers ${fmt2(bodyPct)}% of range — buyers dominated the session without giving back meaningful ground.` }); }
  else if (bodyPct >= 55) { bodyStatus = "CONDITIONAL"; rules.push({ number: 2, title: "Body Strength", metric: `${fmt2(bodyPct)}%`, status: "CONDITIONAL", reason: `Body is ${fmt2(bodyPct)}% — decent but not dominant. Sellers made buyers work for every point. Wick quality will decide.` }); }
  else {
    rules.push({ number: 2, title: "Body Strength", metric: `${fmt2(bodyPct)}%`, status: "FAIL", reason: `Body too small at ${fmt2(bodyPct)}% — neither side had clear conviction. This candle is too indecisive to trade a breakout off.` });
    return { m, rules, verdict: null };
  }

  // Rule 3 — Close Position %
  let closeStatus;
  if (closePositionPct >= 60)      { closeStatus = "PASS";        rules.push({ number: 3, title: "Close Position", metric: `${fmt2(closePositionPct)}%`, status: "PASS",        reason: `Closed in the top ${fmt2(100-closePositionPct)}% of range — buyers held conviction through the close with no late-session drift.` }); }
  else if (closePositionPct >= 50) { closeStatus = "CONDITIONAL"; rules.push({ number: 3, title: "Close Position", metric: `${fmt2(closePositionPct)}%`, status: "CONDITIONAL", reason: `Close at ${fmt2(closePositionPct)}% — upper half but some fading present near session end. Not ideal for a breakout candle.` }); }
  else {
    rules.push({ number: 3, title: "Close Position", metric: `${fmt2(closePositionPct)}%`, status: "FAIL", reason: `Candle closes in the lower half (${fmt2(closePositionPct)}%) — buyers lost ground by session end. Even a green candle that fades this much signals seller re-entry. Skip.` });
    return { m, rules, verdict: null };
  }

  // Rule 4 — Upper Wick Ratio
  let wickStatus;
  if (upperWickBodyRatio <= 0.5)      { wickStatus = "PASS";        rules.push({ number: 4, title: "Upper Wick Quality", metric: `${fmt2(upperWickBodyRatio)}× body`, status: "PASS",        reason: `Minimal upper wick (${fmt2(upperWickBodyRatio)}×) — sellers could not push price meaningfully back from the high. Clean top.` }); }
  else if (upperWickBodyRatio <= 1.0) { wickStatus = "CONDITIONAL"; rules.push({ number: 4, title: "Upper Wick Quality", metric: `${fmt2(upperWickBodyRatio)}× body`, status: "CONDITIONAL", reason: `Upper wick is ${fmt2(upperWickBodyRatio)}× the body — sellers engaged at the high. Buyers still closed positive but the top isn't clean.` }); }
  else {
    rules.push({ number: 4, title: "Upper Wick Quality", metric: `${fmt2(upperWickBodyRatio)}× body`, status: "FAIL", reason: `Upper wick (${fmt2(upperWickBodyRatio)}×) exceeds the body — sellers rejected the high aggressively. Every attempt to extend the breakout was sold into. Skip.` });
    return { m, rules, verdict: null };
  }

  // Rule 5 — Lower Wick compensation
  const conditionals = [bodyStatus, closeStatus, wickStatus].filter(s => s === "CONDITIONAL").length;
  if (conditionals === 0) {
    rules.push({ number: 5, title: "Lower Wick Compensation", metric: `${fmt2(lowerWickBodyRatio)}× body`, status: "SKIP", reason: "All rules above passed cleanly — lower wick check not required." });
  } else if (lowerWickBodyRatio === 0) {
    rules.push({ number: 5, title: "Lower Wick Compensation", metric: "No lower wick", status: "COMPENSATED", reason: "Zero lower wick — buyers never let price dip below the open at any point. Compensates one CONDITIONAL above." });
  } else if (lowerWickBodyRatio <= 0.25) {
    rules.push({ number: 5, title: "Lower Wick Compensation", metric: `${fmt2(lowerWickBodyRatio)}× body`, status: "CONDITIONAL", reason: `Modest lower wick (${fmt2(lowerWickBodyRatio)}×) — a small dip below the open but buyers recovered quickly. Neutral, no compensation.` });
  } else {
    rules.push({ number: 5, title: "Lower Wick Compensation", metric: `${fmt2(lowerWickBodyRatio)}× body`, status: "FAIL", reason: `Lower wick is ${fmt2(lowerWickBodyRatio)}× the body — sellers were active below the open too. Worsens any CONDITIONAL above to FAIL.` });
    return { m, rules, verdict: null };
  }

  const rule5 = rules.find(r => r.number === 5);
  const compensated = rule5?.status === "COMPENSATED";
  let verdict;
  if (conditionals === 0)
    verdict = { label: "STRONG — Enter at Full Position Size", color: "var(--green)", bg: "var(--green-light)", border: "rgba(45,122,95,0.2)", sizeNote: "100% of planned size.", plain: "Every signal is clean. Buyers ran the session from open to close with no hesitation and no meaningful seller pushback. This is the breakout candle you wait for." };
  else if (conditionals === 1 && compensated)
    verdict = { label: "ACCEPTABLE — Enter at 75% Position Size", color: "#2d7a5f", bg: "var(--green-light)", border: "rgba(45,122,95,0.2)", sizeNote: "75% of planned size — one borderline signal was offset by zero lower wick.", plain: "Mostly clean. One weak point was fully compensated. Acceptable breakout entry with slightly reduced size." };
  else
    verdict = { label: "WEAK — Skip or Wait for Next Session", color: "#d97706", bg: "rgba(217,119,6,0.07)", border: "rgba(217,119,6,0.25)", sizeNote: "No entry. The candle does not meet minimum quality for a breakout.", plain: "Too many borderline signals. The candle didn't convict. Wait for a session with unambiguous buyer dominance before committing capital." };

  return { m, rules, verdict };
}

// ─── Context B: Pullback / Re-test ───────────────────────────────
function evaluateB(open, high, low, close) {
  const m = calcMetrics(open, high, low, close);
  const { bodyPct, closePositionPct, upperWickBodyRatio, lowerWickBodyRatio, lowerWickPct, isGreen, isRed } = m;
  const rules = [];

  // Rule 1 — Direction (hammer exception)
  const isHammer = isRed && lowerWickPct >= 60;
  let dir1Status;
  if (isGreen) {
    dir1Status = "PASS";
    rules.push({ number: 1, title: "Direction", metric: "Green ↑", status: "PASS", reason: "Bullish close — buyers rejected the lower level and finished the session in control above the open." });
  } else if (isHammer) {
    dir1Status = "CONDITIONAL";
    rules.push({ number: 1, title: "Direction", metric: "Red Hammer", status: "CONDITIONAL", reason: `Red candle but lower wick is ${fmt2(lowerWickPct)}% of range — classic hammer pattern. Rejection is present even though close is below open. Watch wick quality carefully.` });
  } else {
    rules.push({ number: 1, title: "Direction", metric: "Red ↓", status: "FAIL", reason: "Red candle without a dominant lower wick — sellers closed the session in control with no meaningful rejection of the low. Not a valid re-test candle." });
    return { m, rules, verdict: null };
  }

  // Rule 2 — Body %
  let bodyStatus;
  if (bodyPct >= 40)      { bodyStatus = "PASS";        rules.push({ number: 2, title: "Body Strength", metric: `${fmt2(bodyPct)}%`, status: "PASS",        reason: `Body at ${fmt2(bodyPct)}% — healthy for a pullback candle. Buyers showed clear intent above the support after testing it.` }); }
  else if (bodyPct >= 25) { bodyStatus = "CONDITIONAL"; rules.push({ number: 2, title: "Body Strength", metric: `${fmt2(bodyPct)}%`, status: "CONDITIONAL", reason: `Body is ${fmt2(bodyPct)}% — a smaller body is acceptable when a strong lower wick does the work. Wick quality carries more weight here.` }); }
  else {
    rules.push({ number: 2, title: "Body Strength", metric: `${fmt2(bodyPct)}%`, status: "FAIL", reason: `Body too thin at ${fmt2(bodyPct)}% — no meaningful directional commitment from buyers, even after the support test. Skip.` });
    return { m, rules, verdict: null };
  }

  // Rule 3 — Close Position %
  let closeStatus;
  if (closePositionPct >= 50)      { closeStatus = "PASS";        rules.push({ number: 3, title: "Close Position", metric: `${fmt2(closePositionPct)}%`, status: "PASS",        reason: `Closed in the upper half (${fmt2(closePositionPct)}%) — buyers reclaimed the session after testing the low. Confidence in the support level.` }); }
  else if (closePositionPct >= 40) { closeStatus = "CONDITIONAL"; rules.push({ number: 3, title: "Close Position", metric: `${fmt2(closePositionPct)}%`, status: "CONDITIONAL", reason: `Close at ${fmt2(closePositionPct)}% — buyers partially recovered from the low but didn't fully reclaim the session range. Acceptable with strong wick.` }); }
  else {
    rules.push({ number: 3, title: "Close Position", metric: `${fmt2(closePositionPct)}%`, status: "FAIL", reason: `Closed in the bottom 40% (${fmt2(closePositionPct)}%) — buyers tested support but couldn't hold the recovery. Not a convincing bounce. Skip.` });
    return { m, rules, verdict: null };
  }

  // Rule 4 — Lower Wick Ratio (key rule for pullback context)
  let lowerWickStatus;
  if (lowerWickBodyRatio >= 1.5)      { lowerWickStatus = "PASS";        rules.push({ number: 4, title: "Lower Wick Rejection (KEY)", metric: `${fmt2(lowerWickBodyRatio)}× body`, status: "PASS",        reason: `Lower wick is ${fmt2(lowerWickBodyRatio)}× the body — strong rejection. Buyers absorbed the full seller push at the support and drove price decisively back up.` }); }
  else if (lowerWickBodyRatio >= 1.0) { lowerWickStatus = "CONDITIONAL"; rules.push({ number: 4, title: "Lower Wick Rejection (KEY)", metric: `${fmt2(lowerWickBodyRatio)}× body`, status: "CONDITIONAL", reason: `Lower wick is ${fmt2(lowerWickBodyRatio)}× the body — moderate rejection. Support held but buyers weren't dominant at the low.` }); }
  else {
    rules.push({ number: 4, title: "Lower Wick Rejection (KEY)", metric: `${fmt2(lowerWickBodyRatio)}× body`, status: "FAIL", reason: `Lower wick only ${fmt2(lowerWickBodyRatio)}× the body — no meaningful rejection of the low. Without this, it's not a valid re-test entry. Skip.` });
    return { m, rules, verdict: null };
  }

  // Rule 5 — Upper Wick Ratio
  let upperWickStatus;
  if (upperWickBodyRatio <= 0.5)      { upperWickStatus = "PASS";        rules.push({ number: 5, title: "Upper Wick Quality", metric: `${fmt2(upperWickBodyRatio)}× body`, status: "PASS",        reason: `Upper wick is minimal (${fmt2(upperWickBodyRatio)}×) — buyers recovered from the low and didn't give back much from the close.` }); }
  else if (upperWickBodyRatio <= 1.0) { upperWickStatus = "CONDITIONAL"; rules.push({ number: 5, title: "Upper Wick Quality", metric: `${fmt2(upperWickBodyRatio)}× body`, status: "CONDITIONAL", reason: `Upper wick is ${fmt2(upperWickBodyRatio)}× the body — some selling at the top, but buyers still closed near the high. Acceptable given the strong lower wick.` }); }
  else {
    rules.push({ number: 5, title: "Upper Wick Quality", metric: `${fmt2(upperWickBodyRatio)}× body`, status: "FAIL", reason: `Upper wick exceeds the body (${fmt2(upperWickBodyRatio)}×) — sellers rejected aggressively at the top too. Double-sided rejection is not a clean pullback candle. Skip.` });
    return { m, rules, verdict: null };
  }

  const conditionals = [dir1Status, bodyStatus, closeStatus, lowerWickStatus, upperWickStatus].filter(s => s === "CONDITIONAL").length;
  let verdict;
  if (conditionals === 0)
    verdict = { label: "STRONG — Enter at Full Position Size", color: "var(--green)", bg: "var(--green-light)", border: "rgba(45,122,95,0.2)", sizeNote: "100% of planned size.", plain: "Clean rejection candle with strong lower wick and confident close. Buyers defended support convincingly — exactly what a valid re-test entry looks like." };
  else if (conditionals === 1)
    verdict = { label: "ACCEPTABLE — Enter at 75% Position Size", color: "#2d7a5f", bg: "var(--green-light)", border: "rgba(45,122,95,0.2)", sizeNote: "75% of planned size — one borderline signal present.", plain: "Support held and buyers recovered, but one aspect wasn't fully convincing. Reduce size and manage your stop to the candle low." };
  else if (conditionals === 2)
    verdict = { label: "WEAK — 50% Size, Journal This Trade Carefully", color: "#d97706", bg: "rgba(217,119,6,0.07)", border: "rgba(217,119,6,0.25)", sizeNote: "50% if you trade it — multiple borderline signals. Document your reasoning explicitly.", plain: "The bounce happened but the candle doesn't make a strong case. Two borderline signals mean elevated risk. Smaller size and hard stop at the candle low before reconsidering." };
  else
    verdict = { label: "WEAK — Skip or Wait for Next Session", color: "#d97706", bg: "rgba(217,119,6,0.07)", border: "rgba(217,119,6,0.25)", sizeNote: "No entry. Too many borderline signals.", plain: "Support was tested but the candle structure is too ambiguous to act on. Let the next session confirm with a cleaner close before entering." };

  return { m, rules, verdict };
}

// ─── Context C: Trailing Stop ─────────────────────────────────────
function evaluateC(open, high, low, close) {
  const m = calcMetrics(open, high, low, close);
  const { bodyPct, closePositionPct, upperWickBodyRatio, lowerWickBodyRatio, isGreen } = m;
  const rules = [];

  const holdVerdict = (plain) => ({
    label: "HOLD — Keep Current Stop Loss",
    color: "#d97706", bg: "rgba(217,119,6,0.07)", border: "rgba(217,119,6,0.25)",
    sizeNote: "Do not move your stop. Hold current SL and evaluate the next session.", sizeIcon: "🛡",
    plain,
  });
  const trailVerdict = (plain) => ({
    label: "TRAIL — Move SL to Below This Candle's Low",
    color: "var(--green)", bg: "var(--green-light)", border: "rgba(45,122,95,0.2)",
    sizeNote: "Trail your stop loss to just below this candle's low. Lock in the progress.", sizeIcon: "🛡",
    plain,
  });

  // Rule 1 — Direction
  if (!isGreen) {
    rules.push({ number: 1, title: "Direction", metric: "Red ↓", status: "FAIL", reason: "Red candle — sellers closed the session in control. Do not trail. Hold your current SL and re-evaluate next session." });
    return { m, rules, verdict: holdVerdict("Red candle — sellers finished the session in front. Moving your stop now risks being taken out on a normal bounce. Stay where you are.") };
  }
  rules.push({ number: 1, title: "Direction", metric: "Green ↑", status: "PASS", reason: "Bullish close — continuation baseline confirmed. Evaluate body and wick quality before trailing." });

  // Rule 2 — Body %
  let bodyStatus;
  if (bodyPct >= 60)      { bodyStatus = "PASS";        rules.push({ number: 2, title: "Body Strength", metric: `${fmt2(bodyPct)}%`, status: "PASS",        reason: `Strong body (${fmt2(bodyPct)}%) — buyers held conviction all session. Solid foundation for trailing.` }); }
  else if (bodyPct >= 50) { bodyStatus = "CONDITIONAL"; rules.push({ number: 2, title: "Body Strength", metric: `${fmt2(bodyPct)}%`, status: "CONDITIONAL", reason: `Body is ${fmt2(bodyPct)}% — decent continuation but internal contest was present. Trail only if other signals support.` }); }
  else {
    rules.push({ number: 2, title: "Body Strength", metric: `${fmt2(bodyPct)}%`, status: "FAIL", reason: `Body below 50% (${fmt2(bodyPct)}%) — market was too indecisive this session to justify moving your stop.` });
    return { m, rules, verdict: holdVerdict("Body too weak. A candle with less than 50% body means both sides contested heavily — trailing now leaves you exposed to a normal pullback hitting your new stop.") };
  }

  // Rule 3 — Close Position %
  let closeStatus;
  if (closePositionPct >= 55)      { closeStatus = "PASS";        rules.push({ number: 3, title: "Close Position", metric: `${fmt2(closePositionPct)}%`, status: "PASS",        reason: `Closed at ${fmt2(closePositionPct)}% of range — buyers held the upper portion of the session through close.` }); }
  else if (closePositionPct >= 45) { closeStatus = "CONDITIONAL"; rules.push({ number: 3, title: "Close Position", metric: `${fmt2(closePositionPct)}%`, status: "CONDITIONAL", reason: `Close near midpoint (${fmt2(closePositionPct)}%) — buyers advanced but some late-session give-back. Trail cautiously.` }); }
  else {
    rules.push({ number: 3, title: "Close Position", metric: `${fmt2(closePositionPct)}%`, status: "FAIL", reason: `Close below 45% of range (${fmt2(closePositionPct)}%) — buyers were unable to hold the session gains. Do not trail.` });
    return { m, rules, verdict: holdVerdict("Price closed in the lower half of the session range. Even on a green candle, this signals sellers actively reclaimed the move. Trailing under this candle's low is premature.") };
  }

  // Rule 4 — Upper Wick Ratio
  let upperWickStatus;
  if (upperWickBodyRatio <= 0.5)      { upperWickStatus = "PASS";        rules.push({ number: 4, title: "Upper Wick Quality", metric: `${fmt2(upperWickBodyRatio)}× body`, status: "PASS",        reason: `Minimal upper wick (${fmt2(upperWickBodyRatio)}×) — sellers couldn't push price back meaningfully from the session high.` }); }
  else if (upperWickBodyRatio <= 1.0) { upperWickStatus = "CONDITIONAL"; rules.push({ number: 4, title: "Upper Wick Quality", metric: `${fmt2(upperWickBodyRatio)}× body`, status: "CONDITIONAL", reason: `Upper wick is ${fmt2(upperWickBodyRatio)}× the body — sellers engaged at the top. Trail cautiously; the high wasn't clean.` }); }
  else {
    rules.push({ number: 4, title: "Upper Wick Quality", metric: `${fmt2(upperWickBodyRatio)}× body`, status: "FAIL", reason: `Upper wick (${fmt2(upperWickBodyRatio)}×) larger than the body — sellers rejected the high hard. Trailing under this candle puts your stop beneath a structurally weak session.` });
    return { m, rules, verdict: holdVerdict("Sellers pushed back hard at the session high. The long upper wick signals distribution — trailing under a candle that's being sold into could leave you with a poor stop location.") };
  }

  // Rule 5 — Lower wick (informational)
  const lwNote = lowerWickBodyRatio === 0
    ? "No lower wick — positive signal. Buyers held above the open at all times during the session."
    : `Lower wick is ${fmt2(lowerWickBodyRatio)}× the body — a small dip but buyers recovered. Neutral, does not affect the trail decision.`;
  rules.push({ number: 5, title: "Lower Wick", metric: `${fmt2(lowerWickBodyRatio)}× body`, status: lowerWickBodyRatio === 0 ? "PASS" : "INFO", reason: lwNote });

  const conditionals = [bodyStatus, closeStatus, upperWickStatus].filter(s => s === "CONDITIONAL").length;
  if (conditionals === 0)
    return { m, rules, verdict: trailVerdict("All continuation signals are clean. This candle confirms buyer control. Trail your stop to just below its low — you have a well-defined new floor to defend.") };
  else
    return { m, rules, verdict: holdVerdict(`${conditionals} borderline signal${conditionals > 1 ? "s" : ""} present. Hold current SL and wait for the next candle to give a cleaner confirmation signal before trailing.`) };
}

// ─── Context D: Exit / Distribution Warning ───────────────────────
function evaluateD(open, high, low, close, prevBullish) {
  const m = calcMetrics(open, high, low, close);
  const { bodyPct, closePositionPct, upperWickBodyRatio, lowerWickPct, isRed } = m;
  const warnings = [];

  if (upperWickBodyRatio > 1.5)
    warnings.push({ trigger: `Upper Wick Ratio = ${fmt2(upperWickBodyRatio)}× body  (threshold: > 1.5×)`, reason: "Sellers absorbed buying aggressively at the session high. Repeated rejection at the top is the first sign that distribution is actively happening." });
  if (closePositionPct < 40)
    warnings.push({ trigger: `Close Position = ${fmt2(closePositionPct)}%  (threshold: < 40%)`, reason: "Price closed in the bottom portion of its range. Even if the candle is green, buyers lost significant ground by the end of the session." });
  if (bodyPct < 30)
    warnings.push({ trigger: `Body % = ${fmt2(bodyPct)}%  (threshold: < 30%)`, reason: "Indecision candle — trend momentum is stalling. Neither buyers nor sellers drove a committed session, suggesting the move is losing steam." });
  if (isRed && prevBullish)
    warnings.push({ trigger: "Color reversal — Red after bullish trend", reason: "Momentum shift warning. The dominant buyer bias from prior sessions was interrupted for the first time. This alone isn't a reason to exit — but combined with other signals, it's a significant flag." });
  if (lowerWickPct > 40)
    warnings.push({ trigger: `Lower Wick % = ${fmt2(lowerWickPct)}%  (threshold: > 40%)`, reason: "Buyers defended the low aggressively but could not hold the close in the upper half. Mixed signal — demand exists below but supply is clearly limiting the upside." });

  const count = warnings.length;
  let verdict;
  if (count <= 1)
    verdict = { label: count === 0 ? "HOLD — No Distribution Signals" : "HOLD — One Minor Warning, Not Actionable", color: "var(--green)", bg: "var(--green-light)", border: "rgba(45,122,95,0.2)", sizeNote: "Hold full position. Normal candle noise.", sizeIcon: "🏦", plain: count === 0 ? "No distribution signals detected. The candle does not show structural weakness — continue holding your position with your current stop." : "One warning signal is present but insufficient to act on alone. Monitor the next session; one signal can be noise. Hold." };
  else if (count === 2)
    verdict = { label: "CAUTION — Consider Exiting 50%", color: "#d97706", bg: "rgba(217,119,6,0.07)", border: "rgba(217,119,6,0.25)", sizeNote: "Exit 50% of position. Move stop on remainder to breakeven or last key support.", sizeIcon: "⚡", plain: "Two distribution signals are simultaneously active. Reduce exposure while keeping a foot in if the move continues. Lock in half your gains now." };
  else
    verdict = { label: "EXIT — Close Full Position Now", color: "var(--red)", bg: "rgba(220,38,38,0.06)", border: "rgba(220,38,38,0.2)", sizeNote: "Exit full position. Do not wait for your trailing stop to be hit.", sizeIcon: "🚨", plain: `${count} distribution signals are active together. Sellers are in structural control of this session. Exit cleanly — this is not a candle to be patient with.` };

  return { m, warnings, count, verdict };
}

// ─── Main component ───────────────────────────────────────────────
export default function CandleStrengthCalc() {
  const [form, setForm]           = useState({ open: "", high: "", low: "", close: "" });
  const [ctx, setCtx]             = useState("A");
  const [prevBullish, setPrev]    = useState(true);
  const onChange = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const open  = parseFloat(form.open);
  const high  = parseFloat(form.high);
  const low   = parseFloat(form.low);
  const close = parseFloat(form.close);

  const hasAll      = open > 0 && high > 0 && low > 0 && close > 0;
  const invalidOHLC = hasAll && (high < Math.max(open, close) || low > Math.min(open, close));
  const valid       = hasAll && !invalidOHLC;

  let result = null;
  if (valid) {
    if (ctx === "A") result = evaluateA(open, high, low, close);
    else if (ctx === "B") result = evaluateB(open, high, low, close);
    else if (ctx === "C") result = evaluateC(open, high, low, close);
    else result = evaluateD(open, high, low, close, prevBullish);
  }

  const isD = ctx === "D";

  return (
    <div style={{ maxWidth: 640 }}>
      {/* Context selector */}
      <div style={{ ...CARD, marginBottom: 0, paddingBottom: 20 }}>
        <p style={SEC_TITLE}>Analysis Context</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {CONTEXTS.map(c => {
            const active = ctx === c.id;
            return (
              <button key={c.id} onClick={() => setCtx(c.id)} style={{
                padding: "12px 14px", borderRadius: 10, textAlign: "left", cursor: "pointer", fontFamily: "Inter, sans-serif",
                border: active ? "1.5px solid var(--green)" : "1px solid var(--border)",
                background: active ? "var(--green-light)" : "var(--surface-2)",
                transition: "all 0.15s",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                  <span style={{ fontSize: 14 }}>{c.emoji}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: active ? "var(--green)" : "var(--text)", letterSpacing: "0.01em" }}>Context {c.id} — {c.label}</span>
                </div>
                <p style={{ fontSize: 11, color: "var(--text-3)", margin: 0, lineHeight: 1.45 }}>{c.desc}</p>
              </button>
            );
          })}
        </div>
        {/* Context D extra toggle */}
        {isD && (
          <div style={{ marginTop: 14, padding: "12px 14px", background: "var(--surface-2)", borderRadius: 10, border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", margin: "0 0 2px" }}>Previous trend was bullish</p>
              <p style={{ fontSize: 11, color: "var(--text-3)", margin: 0 }}>Enables the color-reversal warning check</p>
            </div>
            <button onClick={() => setPrev(v => !v)} style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Inter, sans-serif",
              border: prevBullish ? "none" : "1px solid var(--border)",
              background: prevBullish ? "var(--green)" : "var(--surface)",
              color: prevBullish ? "#fff" : "var(--text-3)",
              transition: "all 0.15s",
            }}>{prevBullish ? "Yes" : "No"}</button>
          </div>
        )}
      </div>

      {/* OHLC inputs */}
      <div style={{ ...CARD, marginTop: 16 }}>
        <p style={SEC_TITLE}>OHLC Inputs</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Open (₹)"  k="open"  placeholder="490" hint="Candle open price"  form={form} onChange={onChange} />
          <Field label="High (₹)"  k="high"  placeholder="520" hint="Candle high price"  form={form} onChange={onChange} />
          <Field label="Low (₹)"   k="low"   placeholder="485" hint="Candle low price"   form={form} onChange={onChange} />
          <Field label="Close (₹)" k="close" placeholder="510" hint="Candle close price" form={form} onChange={onChange} />
        </div>
        {invalidOHLC && <div style={ERROR_BOX}>✗ Invalid candle: High must be ≥ max(Open, Close) and Low must be ≤ min(Open, Close).</div>}
      </div>

      {result && (
        <>
          {/* Candle visual */}
          <CandleVisual open={open} high={high} low={low} close={close} metrics={result.m} context={ctx} />

          {/* All calculated metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
            <MetricBox label="Total Range"         value={`₹${result.m.totalRange.toFixed(2)}`}                                        sub="H − L" />
            <MetricBox label="Body"                value={`₹${result.m.body.toFixed(2)}`}                                              sub="|C − O|" />
            <MetricBox label="Body %"              value={`${fmt2(result.m.bodyPct)}%`}                                                sub="body / range"
              col={result.m.bodyPct >= 60 ? "var(--green)" : result.m.bodyPct >= 40 ? "#d97706" : "var(--red)"} />
            <MetricBox label="Upper Wick"          value={`₹${result.m.upperWick.toFixed(2)}`}                                        sub={`${fmt2(result.m.upperWickPct)}% of range`} />
            <MetricBox label="Lower Wick"          value={`₹${result.m.lowerWick.toFixed(2)}`}                                        sub={`${fmt2(result.m.lowerWickPct)}% of range`} />
            <MetricBox label="Close Position"      value={`${fmt2(result.m.closePositionPct)}%`}                                       sub="(C−L) / (H−L)"
              col={result.m.closePositionPct >= 50 ? "var(--green)" : "var(--red)"} />
            <MetricBox label="Upper Wick / Body"   value={result.m.isDoji ? "Doji" : `${fmt2(result.m.upperWickBodyRatio)}×`}          sub="upper wick ÷ body" />
            <MetricBox label="Lower Wick / Body"   value={result.m.isDoji ? "Doji" : `${fmt2(result.m.lowerWickBodyRatio)}×`}          sub="lower wick ÷ body" />
            <MetricBox label="Candle Color"        value={result.m.isGreen ? "Green ↑" : result.m.isRed ? "Red ↓" : "Doji"}           sub={result.m.isGreen ? "C > O" : result.m.isRed ? "C < O" : "C = O"}
              col={result.m.isGreen ? "var(--green)" : result.m.isRed ? "var(--red)" : "var(--text-2)"} />
          </div>

          {/* Context D: warning list */}
          {isD && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>Distribution Signals</p>
                <span style={{
                  fontSize: 12, fontWeight: 800, padding: "2px 10px", borderRadius: 20,
                  background: result.count === 0 ? "var(--green-light)" : result.count <= 1 ? "rgba(217,119,6,0.1)" : "rgba(220,38,38,0.1)",
                  color: result.count === 0 ? "var(--green)" : result.count <= 1 ? "#d97706" : "var(--red)",
                  border: `1px solid ${result.count === 0 ? "rgba(45,122,95,0.3)" : result.count <= 1 ? "rgba(217,119,6,0.3)" : "rgba(220,38,38,0.25)"}`,
                }}>{result.count} of 5 active</span>
              </div>
              {result.count === 0 ? (
                <div style={{ background: "var(--green-light)", border: "1px solid rgba(45,122,95,0.2)", borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--green)", margin: 0 }}>✓ No warning signals detected on this candle.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                  {result.warnings.map((w, i) => <WarningRow key={i} index={i + 1} trigger={w.trigger} reason={w.reason} />)}
                </div>
              )}
            </>
          )}

          {/* Context A/B/C: rule list */}
          {!isD && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              {result.rules.map(r => <RuleRow key={r.number} number={r.number} title={r.title} metric={r.metric} status={r.status} reason={r.reason} />)}
            </div>
          )}

          {/* Verdict */}
          {result.verdict
            ? <VerdictBanner {...result.verdict} />
            : (
              <div style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 14, padding: "22px 24px" }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Final Verdict</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: "var(--red)", margin: "0 0 10px" }}>SKIP — Do Not Enter on This Candle</p>
                <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0, lineHeight: 1.65 }}>One or more rules failed hard. This candle does not meet the minimum quality bar for the selected context. Wait for a cleaner setup.</p>
              </div>
            )
          }
        </>
      )}
    </div>
  );
}
