import { useState } from "react";
import { useNavigate } from "react-router-dom";

// ── Market view categories ────────────────────────────────────────
const VIEWS = [
  { id: "all",           label: "All Strategies",      emoji: "📊", color: "var(--text-2)",  bg: "var(--surface-2)" },
  { id: "bullish",       label: "Bullish",             emoji: "📈", color: "var(--green)",   bg: "var(--green-light)" },
  { id: "mildly-bullish",label: "Mildly Bullish",      emoji: "🟢", color: "var(--green)",   bg: "var(--green-light)" },
  { id: "bearish",       label: "Bearish",             emoji: "📉", color: "var(--red)",     bg: "rgba(220,38,38,0.08)" },
  { id: "mildly-bearish",label: "Mildly Bearish",      emoji: "🔴", color: "var(--red)",     bg: "rgba(220,38,38,0.08)" },
  { id: "range-bound",   label: "Range Bound",         emoji: "↔",  color: "#7c3aed",        bg: "rgba(139,92,246,0.08)" },
  { id: "big-move",      label: "Big Move Expected",   emoji: "⚡", color: "#d97706",        bg: "rgba(217,119,6,0.08)" },
];

// ── Net indicator color ───────────────────────────────────────────
const NET_COLORS = {
  debit:  { label: "Debit",  color: "#d97706", bg: "rgba(217,119,6,0.1)",    border: "rgba(217,119,6,0.3)" },
  credit: { label: "Credit", color: "var(--green)", bg: "var(--green-light)", border: "rgba(45,122,95,0.25)" },
  none:   { label: "—",      color: "var(--text-3)", bg: "var(--surface-2)", border: "var(--border)" },
};

// ── Risk/Reward pill colors ───────────────────────────────────────
const LIMITED_RISK  = { label: "Limited Risk",   color: "var(--green)", bg: "var(--green-light)" };
const UNLIM_RISK    = { label: "Unlimited Risk",  color: "var(--red)",   bg: "rgba(220,38,38,0.09)" };
const LIMITED_RWD   = { label: "Limited Reward",  color: "#d97706",     bg: "rgba(217,119,6,0.1)" };
const UNLIM_RWD     = { label: "Unlimited Reward",color: "var(--green)", bg: "var(--green-light)" };

// ── Strategy catalog ──────────────────────────────────────────────
const CATALOG = [
  {
    id: "call-breakeven",
    name: "Long Call",
    views: ["bullish"],
    sentiment: "Strongly Bullish",
    net: "debit",
    structure: "Buy 1 Call",
    bestFor: "You expect a significant upward move before expiry. Unlimited profit potential with loss strictly limited to the premium paid.",
    risk: LIMITED_RISK,
    reward: UNLIM_RWD,
    legs: [{ action: "Buy", type: "Call" }],
  },
  {
    id: "put-breakeven",
    name: "Long Put",
    views: ["bearish"],
    sentiment: "Strongly Bearish",
    net: "debit",
    structure: "Buy 1 Put",
    bestFor: "You expect a significant downward move. Profit grows as price falls below breakeven. Max loss is the premium paid.",
    risk: LIMITED_RISK,
    reward: UNLIM_RWD,
    legs: [{ action: "Buy", type: "Put" }],
  },
  {
    id: "short-call",
    name: "Short Call",
    views: ["bearish"],
    sentiment: "Bearish / Neutral",
    net: "credit",
    structure: "Sell 1 Call",
    bestFor: "You believe the underlying won't rise above the strike. Collect a premium upfront — but face unlimited loss if price rallies sharply above the breakeven.",
    risk: UNLIM_RISK,
    reward: LIMITED_RWD,
    legs: [{ action: "Sell", type: "Call" }],
  },
  {
    id: "short-put",
    name: "Short Put",
    views: ["mildly-bullish"],
    sentiment: "Bullish / Neutral",
    net: "credit",
    structure: "Sell 1 Put",
    bestFor: "You expect the underlying to stay flat or rise. Collect a premium — keep it if price stays above the strike. Loss grows on a sharp downside move.",
    risk: UNLIM_RISK,
    reward: LIMITED_RWD,
    legs: [{ action: "Sell", type: "Put" }],
  },
  {
    id: "bull-spread",
    name: "Bull Call Spread",
    views: ["mildly-bullish"],
    sentiment: "Mildly Bullish",
    net: "debit",
    structure: "Buy lower Call · Sell upper Call",
    bestFor: "Moderate upside expected. Much cheaper than a plain long call — the sold upper call funds part of your purchase. Profit is capped but so is risk.",
    risk: LIMITED_RISK,
    reward: LIMITED_RWD,
    legs: [{ action: "Buy", type: "Call" }, { action: "Sell", type: "Call" }],
  },
  {
    id: "bear-spread",
    name: "Bear Put Spread",
    views: ["mildly-bearish"],
    sentiment: "Mildly Bearish",
    net: "debit",
    structure: "Buy higher Put · Sell lower Put",
    bestFor: "Moderate downside expected. Cheaper than a plain long put — the sold lower put offsets cost. Profit is capped at the spread width.",
    risk: LIMITED_RISK,
    reward: LIMITED_RWD,
    legs: [{ action: "Buy", type: "Put" }, { action: "Sell", type: "Put" }],
  },
  {
    id: "bear-call-spread",
    name: "Bear Call Spread",
    views: ["mildly-bearish", "range-bound"],
    sentiment: "Mildly Bearish / Neutral",
    net: "credit",
    structure: "Sell lower Call · Buy upper Call (hedge)",
    bestFor: "You expect price to stay flat or fall slightly. Collect credit upfront and keep it if price stays below the sold strike at expiry. Defined risk both sides.",
    risk: LIMITED_RISK,
    reward: LIMITED_RWD,
    legs: [{ action: "Sell", type: "Call" }, { action: "Buy", type: "Call" }],
  },
  {
    id: "bull-put-spread",
    name: "Bull Put Spread",
    views: ["mildly-bullish", "range-bound"],
    sentiment: "Mildly Bullish / Neutral",
    net: "credit",
    structure: "Sell higher Put · Buy lower Put (hedge)",
    bestFor: "You expect price to stay flat or rise above the sold strike. Collect credit upfront — keep it if price stays above the sold put. Defined risk both sides.",
    risk: LIMITED_RISK,
    reward: LIMITED_RWD,
    legs: [{ action: "Sell", type: "Put" }, { action: "Buy", type: "Put" }],
  },
  {
    id: "straddle",
    name: "Long Straddle",
    views: ["big-move"],
    sentiment: "Neutral — High Volatility",
    net: "debit",
    structure: "Buy 1 ATM Call · Buy 1 ATM Put",
    bestFor: "A big move is expected but direction is uncertain (e.g. earnings, RBI policy). Profit in either direction once price moves past the breakeven. Expensive — needs a large move.",
    risk: LIMITED_RISK,
    reward: UNLIM_RWD,
    legs: [{ action: "Buy", type: "Call" }, { action: "Buy", type: "Put" }],
  },
  {
    id: "short-straddle",
    name: "Short Straddle",
    views: ["range-bound"],
    sentiment: "Neutral — Low Volatility",
    net: "credit",
    structure: "Sell 1 ATM Call · Sell 1 ATM Put",
    bestFor: "You expect price to pin near the strike through expiry. Collect the maximum possible premium from both sides. High risk — unlimited loss if price moves aggressively in either direction.",
    risk: UNLIM_RISK,
    reward: LIMITED_RWD,
    legs: [{ action: "Sell", type: "Call" }, { action: "Sell", type: "Put" }],
  },
  {
    id: "strangle",
    name: "Long Strangle",
    views: ["big-move"],
    sentiment: "Neutral — High Volatility",
    net: "debit",
    structure: "Buy OTM Call · Buy OTM Put",
    bestFor: "Big move expected, direction uncertain. Cheaper than a straddle because both options are OTM — but requires an even bigger move to become profitable.",
    risk: LIMITED_RISK,
    reward: UNLIM_RWD,
    legs: [{ action: "Buy", type: "Call" }, { action: "Buy", type: "Put" }],
  },
  {
    id: "short-strangle",
    name: "Short Strangle",
    views: ["range-bound"],
    sentiment: "Neutral — Low Volatility",
    net: "credit",
    structure: "Sell OTM Call · Sell OTM Put",
    bestFor: "You expect price to stay between two OTM strikes. Wider profit zone than a short straddle, with a larger safety buffer. Still carries unlimited risk beyond the breakevens.",
    risk: UNLIM_RISK,
    reward: LIMITED_RWD,
    legs: [{ action: "Sell", type: "Call" }, { action: "Sell", type: "Put" }],
  },
  {
    id: "long-call-butterfly",
    name: "Long Call Butterfly",
    views: ["range-bound"],
    sentiment: "Neutral — Low Volatility (Precise Target)",
    net: "debit",
    structure: "Buy K1 Call · Sell 2× K2 Call · Buy K3 Call",
    bestFor: "You have a very specific price target for expiry. Maximum profit if price closes exactly at the middle strike. Low cost, fully defined risk — ideal for targeting pinned weekly/monthly expiries.",
    risk: LIMITED_RISK,
    reward: LIMITED_RWD,
    legs: [{ action: "Buy", type: "Call" }, { action: "Sell", type: "Call", qty: 2 }, { action: "Buy", type: "Call" }],
  },
  {
    id: "long-put-butterfly",
    name: "Long Put Butterfly",
    views: ["range-bound"],
    sentiment: "Neutral — Low Volatility (Precise Target)",
    net: "debit",
    structure: "Buy K3 Put · Sell 2× K2 Put · Buy K1 Put",
    bestFor: "Equivalent to the long call butterfly using puts. Same profit profile — peaks exactly at the middle strike at expiry. Put-call parity makes them interchangeable in most cases.",
    risk: LIMITED_RISK,
    reward: LIMITED_RWD,
    legs: [{ action: "Buy", type: "Put" }, { action: "Sell", type: "Put", qty: 2 }, { action: "Buy", type: "Put" }],
  },
  {
    id: "short-call-butterfly",
    name: "Short Call Butterfly",
    views: ["big-move"],
    sentiment: "Neutral — High Volatility",
    net: "credit",
    structure: "Sell K1 Call · Buy 2× K2 Call · Sell K3 Call",
    bestFor: "You expect a decisive move away from the current price. Mirror of the long butterfly — collect a small credit that you keep if price breaks out convincingly beyond either wing.",
    risk: LIMITED_RISK,
    reward: LIMITED_RWD,
    legs: [{ action: "Sell", type: "Call" }, { action: "Buy", type: "Call", qty: 2 }, { action: "Sell", type: "Call" }],
  },
  {
    id: "short-put-butterfly",
    name: "Short Put Butterfly",
    views: ["big-move"],
    sentiment: "Neutral — High Volatility",
    net: "credit",
    structure: "Sell K3 Put · Buy 2× K2 Put · Sell K1 Put",
    bestFor: "Mirror of the short call butterfly using puts. Same payoff — profits from large moves in either direction. Collect a credit upfront and keep it if price breaks out beyond either wing.",
    risk: LIMITED_RISK,
    reward: LIMITED_RWD,
    legs: [{ action: "Sell", type: "Put" }, { action: "Buy", type: "Put", qty: 2 }, { action: "Sell", type: "Put" }],
  },
  {
    id: "condor",
    name: "Long Call Condor",
    views: ["range-bound"],
    sentiment: "Neutral — Range Bound (Wider Zone)",
    net: "debit",
    structure: "Buy K1 · Sell K2 · Sell K3 · Buy K4 Call",
    bestFor: "Similar to a butterfly but with a wider profit zone (K2–K3). More forgiving — you don't need price to pin at a single exact point. Good for when you expect low volatility over a range.",
    risk: LIMITED_RISK,
    reward: LIMITED_RWD,
    legs: [{ action: "Buy", type: "Call" }, { action: "Sell", type: "Call" }, { action: "Sell", type: "Call" }, { action: "Buy", type: "Call" }],
  },
  {
    id: "long-iron-condor",
    name: "Long Iron Condor",
    views: ["big-move"],
    sentiment: "Neutral — High Volatility",
    net: "debit",
    structure: "Sell K1 Put · Buy K2 Put · Buy K3 Call · Sell K4 Call",
    bestFor: "The inverse of the classic iron condor. You pay a debit to profit when price makes a large move in either direction. Defined risk and reward on both sides.",
    risk: LIMITED_RISK,
    reward: LIMITED_RWD,
    legs: [{ action: "Sell", type: "Put" }, { action: "Buy", type: "Put" }, { action: "Buy", type: "Call" }, { action: "Sell", type: "Call" }],
  },
  {
    id: "short-iron-condor",
    name: "Short Iron Condor",
    views: ["range-bound"],
    sentiment: "Neutral — Range Bound (Classic IC)",
    net: "credit",
    structure: "Buy K1 Put · Sell K2 Put · Sell K3 Call · Buy K4 Call",
    bestFor: "The most popular premium-selling strategy. Collect a net credit if price stays between the two sold strikes at expiry. Defined risk on both sides — the long outer options cap your maximum loss.",
    risk: LIMITED_RISK,
    reward: LIMITED_RWD,
    legs: [{ action: "Buy", type: "Put" }, { action: "Sell", type: "Put" }, { action: "Sell", type: "Call" }, { action: "Buy", type: "Call" }],
  },
  {
    id: "bull-call-ratio",
    name: "Bull Call Ratio Spread",
    views: ["mildly-bullish", "bullish"],
    sentiment: "Mildly to Moderately Bullish",
    net: "debit",
    structure: "Buy 1 K1 Call · Sell 2 K2 Calls",
    bestFor: "You expect a moderate rally to a specific target (K2) but not a runaway move. The two short calls reduce or eliminate entry cost, but leave you net short above K2 — so the strategy is best when you have a clear price target and will exit before expiry if the stock surges past it.",
    risk: UNLIM_RISK,
    reward: LIMITED_RWD,
    legs: [{ action: "Buy", type: "Call", qty: 1 }, { action: "Sell", type: "Call", qty: 2 }],
  },
];

// ── Leg structure pill ────────────────────────────────────────────
function LegBadge({ action, type, qty }) {
  const isBuy = action === "Buy";
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 700,
      padding: "2px 7px",
      borderRadius: 5,
      background: isBuy ? "var(--green-light)" : "rgba(220,38,38,0.08)",
      color: isBuy ? "var(--green)" : "var(--red)",
      border: `1px solid ${isBuy ? "rgba(45,122,95,0.25)" : "rgba(220,38,38,0.2)"}`,
      whiteSpace: "nowrap",
    }}>
      {qty && qty > 1 ? `${qty}× ` : ""}{action} {type}
    </span>
  );
}

// ── Single strategy card ──────────────────────────────────────────
function StrategyCard({ strategy, onOpen }) {
  const view  = VIEWS.find((v) => strategy.views[0] === v.id) ?? VIEWS[0];
  const netC  = NET_COLORS[strategy.net] ?? NET_COLORS.none;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "box-shadow 0.15s, border-color 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.1)";
        e.currentTarget.style.borderColor = "var(--border-2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      {/* Card header */}
      <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          {/* View badge */}
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: view.color,
            background: view.bg,
            padding: "3px 9px",
            borderRadius: 20,
            border: `1px solid ${view.color}33`,
          }}>
            {view.emoji} {view.label}
          </span>
          {/* Net indicator */}
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            color: netC.color,
            background: netC.bg,
            border: `1px solid ${netC.border}`,
            padding: "2px 8px",
            borderRadius: 5,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}>
            {netC.label}
          </span>
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", margin: "0 0 4px" }}>{strategy.name}</h3>
        <p style={{ fontSize: 11, color: "var(--text-3)", margin: "0 0 10px", fontFamily: "JetBrains Mono, monospace" }}>{strategy.structure}</p>

        {/* Leg structure badges */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {strategy.legs.map((leg, i) => (
            <LegBadge key={i} action={leg.action} type={leg.type} qty={leg.qty} />
          ))}
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: "12px 18px", flex: 1 }}>
        {/* Risk / Reward pills */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 5, color: strategy.risk.color, background: strategy.risk.bg }}>
            ⚠ {strategy.risk.label}
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 5, color: strategy.reward.color, background: strategy.reward.bg }}>
            ✦ {strategy.reward.label}
          </span>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.65, margin: 0 }}>{strategy.bestFor}</p>
      </div>

      {/* Card footer */}
      <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border)" }}>
        <button
          onClick={() => onOpen(strategy.id)}
          style={{
            width: "100%",
            padding: "9px 0",
            background: "var(--green)",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "Inter, sans-serif",
            letterSpacing: "0.02em",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          Open Calculator →
        </button>
      </div>
    </div>
  );
}

// ── Main page component ───────────────────────────────────────────
export default function OptionStrategies() {
  const navigate   = useNavigate();
  const [activeView, setActiveView] = useState("all");

  const filtered = activeView === "all"
    ? CATALOG
    : CATALOG.filter((s) => s.views.includes(activeView));

  const handleOpen = (calcId) => {
    navigate(`/tradedesk/calculator?calc=${calcId}`);
  };

  return (
    <div>
      {/* Page intro */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 14, color: "var(--text-2)", margin: 0 }}>
          Select your market view to find the right strategy — then open the calculator to run the numbers.
        </p>
      </div>

      {/* View filter tab bar */}
      <div style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        marginBottom: 28,
        padding: "14px 18px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
      }}>
        {VIEWS.map((view) => {
          const isActive = activeView === view.id;
          return (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              style={{
                padding: "7px 14px",
                borderRadius: 8,
                border: isActive ? `1.5px solid ${view.color}55` : "1px solid var(--border)",
                background: isActive ? view.bg : "transparent",
                color: isActive ? view.color : "var(--text-2)",
                fontWeight: isActive ? 700 : 500,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              {view.emoji} {view.label}
            </button>
          );
        })}
      </div>

      {/* Results count */}
      <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 16, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {filtered.length} {filtered.length === 1 ? "strategy" : "strategies"}
        {activeView !== "all" && ` for "${VIEWS.find((v) => v.id === activeView)?.label}"`}
      </p>

      {/* Strategy grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: 18,
      }}>
        {filtered.map((strategy) => (
          <StrategyCard key={strategy.id} strategy={strategy} onOpen={handleOpen} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{
          textAlign: "center",
          padding: "48px 24px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          color: "var(--text-3)",
          fontSize: 14,
        }}>
          No strategies found for this view.
        </div>
      )}
    </div>
  );
}
