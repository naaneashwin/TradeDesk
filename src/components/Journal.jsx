import { useState, useEffect, useRef, useCallback } from "react";
import LogModal from "./LogModal";

// ── helpers ──────────────────────────────────────────────────
const typePill = (dir) => {
  const isLong = dir === "long";
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        fontSize: 13,
        fontWeight: 600,
        color: isLong ? "var(--green)" : "var(--red)",
        whiteSpace: "nowrap",
      }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {isLong ? (
          <>
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </>
        ) : (
          <>
            <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
            <polyline points="17 18 23 18 23 12" />
          </>
        )}
      </svg>
      {isLong ? "Long" : "Short"}
    </span>
  );
};

const EXIT_STRATEGY_LABELS = {
  target: "Target Hit",
  stoploss: "Stop Loss",
  trailing_stop: "Trailing Stop",
  partial_profit: "Partial Profit",
  time_based: "Time-Based",
  reversal: "Reversal Signal",
  manual: "Manual",
};

const STATUS_MAP = {
  win: {
    label: "WON",
    bg: "rgba(45,122,95,0.1)",
    color: "var(--green)",
    border: "rgba(45,122,95,0.25)",
  },
  loss: {
    label: "LOST",
    bg: "rgba(220,38,38,0.08)",
    color: "var(--red)",
    border: "rgba(220,38,38,0.2)",
  },
  breakeven: {
    label: "BREAKEVEN",
    bg: "var(--surface-2)",
    color: "var(--text-2)",
    border: "var(--border)",
  },
  open: {
    label: "OPEN",
    bg: "rgba(59,130,246,0.08)",
    color: "#3b82f6",
    border: "rgba(59,130,246,0.2)",
  },
};
const statusPill = (outcome) => {
  const s = STATUS_MAP[outcome] ?? STATUS_MAP.breakeven;
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        padding: "4px 12px",
        borderRadius: 20,
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
};

const COLS = [
  { key: "date", label: "DATE", sortable: true },
  { key: "instrument", label: "ASSET", sortable: true },
  { key: "strategy", label: "STRAT", sortable: false },
  { key: "direction", label: "TYPE", sortable: false },
  { key: "entryPrice", label: "ENTRY", sortable: true, right: true },
  { key: "exitPrice", label: "EXIT", sortable: true, right: true },
  { key: "days", label: "DAYS", sortable: false, right: true },
  { key: "pnl", label: "PNL", sortable: true, right: true },
  { key: "rMult", label: "R-MULT", sortable: true, right: true },
  { key: "outcome", label: "STATUS", sortable: false },
  { key: "mock", label: "MOCK", sortable: false },
  { key: "_del", label: "", sortable: false },
];

// ── Payoff Chart ──────────────────────────────────────────────
function PayoffChart({ trade }) {
  const {
    entryPrice,
    initialSl,
    planTarget,
    planStop,
    qty = 1,
    direction = "long",
  } = trade;
  const sl = initialSl ?? planStop;
  const target = planTarget;
  if (!entryPrice || !sl || !target) return null;

  const isLong = direction !== "short";
  const pnlAt = (price) =>
    (isLong ? 1 : -1) * (price - entryPrice) * (qty || 1);

  // Price axis range with 20% padding on each side
  const prices = [sl, entryPrice, target];
  const spread = Math.max(...prices) - Math.min(...prices);
  const pMin = Math.min(...prices) - spread * 0.22;
  const pMax = Math.max(...prices) + spread * 0.22;

  // P&L axis range
  const pnlSl = pnlAt(sl);
  const pnlTgt = pnlAt(target);
  const pnlPad = Math.abs(pnlTgt - pnlSl) * 0.25;
  const yMin = Math.min(pnlSl, pnlTgt) - pnlPad;
  const yMax = Math.max(pnlSl, pnlTgt) + pnlPad;

  const W = 540,
    H = 180;
  const PL = 76,
    PR = 16,
    PT = 18,
    PB = 44;
  const cW = W - PL - PR;
  const cH = H - PT - PB;

  const xOf = (p) => PL + ((p - pMin) / (pMax - pMin)) * cW;
  const yOf = (pnl) => PT + ((yMax - pnl) / (yMax - yMin)) * cH;

  const zeroY = yOf(0);
  const entryX = xOf(entryPrice);

  // The payoff is a straight line from pMin to pMax
  const x0 = PL,
    y0 = yOf(pnlAt(pMin));
  const x1 = W - PR,
    y1 = yOf(pnlAt(pMax));

  // Profit and loss fill regions — clipped at zero line
  // For long: profit zone is right of entry (higher prices), loss zone is left
  // For short: flipped
  const profitX = isLong ? entryX : PL;
  const profitW = isLong ? W - PR - entryX : entryX - PL;
  const lossX = isLong ? PL : entryX;
  const lossW = isLong ? entryX - PL : W - PR - entryX;

  const fmtPnl = (v) => {
    const abs = Math.abs(v);
    const sign = v >= 0 ? "+" : "−";
    if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1)}L`;
    if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)}k`;
    return `${sign}₹${Math.round(abs)}`;
  };

  const exitMarkers = (trade.exits ?? [])
    .filter(
      (e) =>
        e.exitPrice != null &&
        Math.abs(Number(e.exitPrice) - entryPrice) > 0.001,
    )
    .map((e, i, arr) => ({
      price: Number(e.exitPrice),
      label: arr.length > 1 ? `Exit ${i + 1}` : "Exit",
      color: "#3b82f6",
    }));

  const markers = [
    { price: sl, label: "SL", color: "var(--red)" },
    { price: entryPrice, label: "Entry", color: "var(--text-2)" },
    { price: target, label: "Target", color: "var(--green)" },
    ...exitMarkers,
  ];

  // Y-axis tick values
  const yTicks = [pnlTgt, 0, pnlSl];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      {/* Background profit zone (clipped rectangle above zero) */}
      <clipPath id={`cp-profit-${trade.id}`}>
        <rect
          x={profitX}
          y={PT}
          width={Math.max(profitW, 0)}
          height={zeroY - PT}
        />
      </clipPath>
      <rect
        x={profitX}
        y={PT}
        width={Math.max(profitW, 0)}
        height={zeroY - PT}
        fill="rgba(45,122,95,0.10)"
        clipPath={`url(#cp-profit-${trade.id})`}
      />

      {/* Background loss zone (below zero) */}
      <clipPath id={`cp-loss-${trade.id}`}>
        <rect
          x={lossX}
          y={zeroY}
          width={Math.max(lossW, 0)}
          height={H - PB - zeroY}
        />
      </clipPath>
      <rect
        x={lossX}
        y={zeroY}
        width={Math.max(lossW, 0)}
        height={H - PB - zeroY}
        fill="rgba(220,38,38,0.09)"
        clipPath={`url(#cp-loss-${trade.id})`}
      />

      {/* Zero / breakeven line */}
      <line
        x1={PL}
        y1={zeroY}
        x2={W - PR}
        y2={zeroY}
        stroke="var(--border)"
        strokeWidth="1"
      />

      {/* Payoff line */}
      <line
        x1={x0}
        y1={y0}
        x2={x1}
        y2={y1}
        stroke="var(--text-2)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Y-axis labels */}
      {yTicks.map((v, i) => {
        const color =
          v > 0 ? "var(--green)" : v < 0 ? "var(--red)" : "var(--text-3)";
        return (
          <text
            key={i}
            x={PL - 6}
            y={yOf(v) + 4}
            textAnchor="end"
            fontSize="10"
            fill={color}
            fontFamily="JetBrains Mono, monospace"
          >
            {fmtPnl(v)}
          </text>
        );
      })}

      {/* Level markers */}
      {markers.map(({ price, label, color }) => {
        if (price < pMin || price > pMax) return null;
        const x = xOf(price);
        const pnl = price === entryPrice ? 0 : pnlAt(price);
        const y = yOf(pnl);
        return (
          <g key={label}>
            <line
              x1={x}
              y1={PT}
              x2={x}
              y2={H - PB}
              stroke={color}
              strokeWidth="1"
              strokeDasharray="4 3"
              opacity="0.65"
            />
            <circle
              cx={x}
              cy={y}
              r="4.5"
              fill={color}
              stroke="var(--surface)"
              strokeWidth="1.5"
            />
            <text
              x={x}
              y={H - PB + 14}
              textAnchor="middle"
              fontSize="10"
              fontWeight="700"
              fill={color}
            >
              {label}
            </text>
            <text
              x={x}
              y={H - PB + 26}
              textAnchor="middle"
              fontSize="9"
              fill="var(--text-3)"
            >
              {price % 1 === 0 ? price : price.toFixed(1)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function daysHeld(trade) {
  const entry = new Date(trade.date);
  const lastExitDate = trade.exits?.length
    ? trade.exits.reduce((latest, e) => {
        const d = new Date(e.exitDate || trade.date);
        return d > latest ? d : latest;
      }, new Date(0))
    : null;
  if (!lastExitDate || lastExitDate.getFullYear() < 2000) return null;
  const diff = Math.round((lastExitDate - entry) / 86400000);
  return diff;
}

// ── Filter panel ─────────────────────────────────────────────
function FilterPanel({
  strats,
  filters,
  setFilters,
  exitStrategies,
  allTags,
  onClose,
}) {
  const ref = useRef();
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        marginTop: 6,
        zIndex: 100,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        padding: 16,
        minWidth: 260,
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--text-3)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 10,
        }}
      >
        Outcome
      </p>
      <div
        style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}
      >
        {["all", "open", "win", "loss", "breakeven"].map((v) => (
          <button
            key={v}
            onClick={() => setFilters((f) => ({ ...f, outcome: v }))}
            style={{
              padding: "5px 12px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              background:
                filters.outcome === v ? "var(--green)" : "var(--surface-2)",
              color: filters.outcome === v ? "#fff" : "var(--text-2)",
              border: `1px solid ${filters.outcome === v ? "var(--green)" : "var(--border)"}`,
            }}
          >
            {v === "all"
              ? "All"
              : v === "open"
                ? "Active"
                : STATUS_MAP[v]?.label}
          </button>
        ))}
      </div>
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--text-3)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 10,
        }}
      >
        Direction
      </p>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {["all", "long", "short"].map((v) => (
          <button
            key={v}
            onClick={() => setFilters((f) => ({ ...f, direction: v }))}
            style={{
              padding: "5px 12px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              background:
                filters.direction === v ? "var(--green)" : "var(--surface-2)",
              color: filters.direction === v ? "#fff" : "var(--text-2)",
              border: `1px solid ${filters.direction === v ? "var(--green)" : "var(--border)"}`,
            }}
          >
            {v === "all" ? "All" : v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--text-3)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 10,
        }}
      >
        Strategy
      </p>
      <select
        value={filters.strategyId}
        onChange={(e) =>
          setFilters((f) => ({ ...f, strategyId: e.target.value }))
        }
        style={{
          width: "100%",
          padding: "8px 10px",
          border: "1px solid var(--border)",
          borderRadius: 8,
          fontSize: 13,
          color: "var(--text)",
          background: "var(--surface-2)",
          outline: "none",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <option value="all">All Strategies</option>
        {strats.map((st) => (
          <option key={st.id} value={st.id}>
            {st.name}
          </option>
        ))}
      </select>
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--text-3)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          margin: "14px 0 10px",
        }}
      >
        Trade Type
      </p>
      <div
        style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}
      >
        {[
          { v: "all", label: "All" },
          { v: "real", label: "Real" },
          { v: "mock", label: "Mock" },
        ].map(({ v, label }) => (
          <button
            key={v}
            onClick={() => setFilters((f) => ({ ...f, mock: v }))}
            style={{
              padding: "5px 12px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              background:
                filters.mock === v ? "var(--green)" : "var(--surface-2)",
              color: filters.mock === v ? "#fff" : "var(--text-2)",
              border: `1px solid ${filters.mock === v ? "var(--green)" : "var(--border)"}`,
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {exitStrategies.length > 0 && (
        <>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--text-3)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              margin: "14px 0 10px",
            }}
          >
            Exit Strategy
          </p>
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              marginBottom: 4,
            }}
          >
            {["all", ...exitStrategies].map((v) => (
              <button
                key={v}
                onClick={() => setFilters((f) => ({ ...f, exitStrategy: v }))}
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                  background:
                    filters.exitStrategy === v
                      ? "var(--green)"
                      : "var(--surface-2)",
                  color: filters.exitStrategy === v ? "#fff" : "var(--text-2)",
                  border: `1px solid ${filters.exitStrategy === v ? "var(--green)" : "var(--border)"}`,
                }}
              >
                {v === "all" ? "All" : v}
              </button>
            ))}
          </div>
        </>
      )}
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--text-3)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          margin: "14px 0 10px",
        }}
      >
        Tags
      </p>
      {allTags.length === 0 ? (
        <p
          style={{
            fontSize: 12,
            color: "var(--text-3)",
            fontStyle: "italic",
            marginBottom: 4,
          }}
        >
          No tags yet — add tags when logging a trade.
        </p>
      ) : (
        <div
          style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}
        >
          {["all", ...allTags].map((v) => (
            <button
              key={v}
              onClick={() => setFilters((f) => ({ ...f, tag: v }))}
              style={{
                padding: "5px 12px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                background:
                  filters.tag === v
                    ? "rgba(59,130,246,0.85)"
                    : "var(--surface-2)",
                color: filters.tag === v ? "#fff" : "var(--text-2)",
                border: `1px solid ${filters.tag === v ? "rgba(59,130,246,0.6)" : "var(--border)"}`,
              }}
            >
              {v === "all" ? "All" : `#${v}`}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => {
          setFilters({
            outcome: "all",
            direction: "all",
            strategyId: "all",
            mock: "all",
            exitStrategy: "all",
            tag: "all",
          });
          onClose();
        }}
        style={{
          marginTop: 14,
          width: "100%",
          padding: "8px",
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "none",
          cursor: "pointer",
          fontSize: 13,
          color: "var(--text-2)",
          fontFamily: "Inter, sans-serif",
        }}
      >
        Clear Filters
      </button>
    </div>
  );
}

// ── Date range panel ─────────────────────────────────────────
function DatePanel({ dateRange, setDateRange, onClose }) {
  const presets = [
    { label: "Last 7d", days: 7 },
    { label: "Last 30d", days: 30 },
    { label: "Last 90d", days: 90 },
    { label: "All time", days: 0 },
  ];
  return (
    <div
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "12px 14px",
        marginTop: 4,
      }}
    >
      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <label
            style={{
              display: "block",
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-3)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 5,
            }}
          >
            From
          </label>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) =>
              setDateRange((d) => ({ ...d, from: e.target.value }))
            }
            style={{
              width: "100%",
              padding: "7px 9px",
              border: "1px solid var(--border)",
              borderRadius: 7,
              fontSize: 13,
              color: "var(--text)",
              background: "var(--surface)",
              outline: "none",
              fontFamily: "Inter, sans-serif",
              boxSizing: "border-box",
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label
            style={{
              display: "block",
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-3)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 5,
            }}
          >
            To
          </label>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) =>
              setDateRange((d) => ({ ...d, to: e.target.value }))
            }
            style={{
              width: "100%",
              padding: "7px 9px",
              border: "1px solid var(--border)",
              borderRadius: 7,
              fontSize: 13,
              color: "var(--text)",
              background: "var(--surface)",
              outline: "none",
              fontFamily: "Inter, sans-serif",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {presets.map(({ label, days }) => (
          <button
            key={label}
            onClick={() => {
              if (days === 0) {
                setDateRange({ from: "", to: "" });
                return;
              }
              const to = new Date(),
                from = new Date();
              from.setDate(from.getDate() - days);
              setDateRange({
                from: from.toISOString().slice(0, 10),
                to: to.toISOString().slice(0, 10),
              });
            }}
            style={{
              padding: "4px 11px",
              borderRadius: 20,
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              background: "var(--surface)",
              color: "var(--text-2)",
              border: "1px solid var(--border)",
            }}
          >
            {label}
          </button>
        ))}
        {(dateRange.from || dateRange.to) && (
          <button
            onClick={() => {
              setDateRange({ from: "", to: "" });
              onClose();
            }}
            style={{
              padding: "4px 11px",
              borderRadius: 20,
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              background: "none",
              color: "var(--red)",
              border: "1px solid var(--red)",
            }}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export default function Journal({
  trades,
  strats,
  onDelete,
  onLogTrade,
  onEditTrade,
}) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    outcome: "all",
    direction: "all",
    strategyId: "all",
    mock: "all",
    exitStrategy: "all",
    tag: "all",
  });
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [sort, setSort] = useState({ key: "date", dir: "desc" });
  const [toDelete, setToDelete] = useState(null);
  const [editTrade, setEditTrade] = useState(null);
  const [logModal, setLogModal] = useState(false);
  const [prefill, setPrefill] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const [livePrices, setLivePrices] = useState({});
  const toggleExpand = (id) =>
    setExpanded((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  const [showFilter, setShowFilter] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const h = () => setLogModal(true);
    document.addEventListener("td:journal-log", h);
    return () => document.removeEventListener("td:journal-log", h);
  }, []);

  useEffect(() => {
    const h = (e) => {
      setPrefill(e.detail ?? null);
      setLogModal(true);
    };
    document.addEventListener("td:journal-log-prefill", h);
    return () => document.removeEventListener("td:journal-log-prefill", h);
  }, []);

  // ── Live price polling for open + real trades ──────────────
  const fetchLivePrices = useCallback(async () => {
    const openReal = trades.filter(
      (t) => t.outcome === "open" && !t.mock && t.instrument && t.entryPrice,
    );
    if (!openReal.length) return;

    // Deduplicate symbols → fetch each once, then apply to all trades for that symbol
    const symbols = [
      ...new Set(openReal.map((t) => t.instrument.toUpperCase())),
    ];
    const priceMap = {};
    await Promise.allSettled(
      symbols.map(async (sym) => {
        try {
          const res = await fetch(
            `/api/price?symbol=${encodeURIComponent(sym)}`,
          );
          if (!res.ok) return;
          const data = await res.json();
          if (data.ltp != null) priceMap[sym] = data;
        } catch {
          /* ignore per-symbol failures */
        }
      }),
    );

    setLivePrices((prev) => {
      const next = { ...prev };
      for (const t of openReal) {
        const sym = t.instrument.toUpperCase();
        const data = priceMap[sym];
        if (!data) continue;
        const ltp = data.ltp;
        const totalExited = (t.exits ?? []).reduce(
          (s, e) => s + (parseFloat(e.qty) || 0),
          0,
        );
        const remainingQty = Math.max(0, (t.qty ?? 0) - totalExited);
        const livePnl =
          (ltp - t.entryPrice) *
          remainingQty *
          (t.direction === "short" ? -1 : 1);
        next[t.id] = {
          ltp,
          pnl: livePnl,
          change: data.change,
          changePct: data.changePct,
        };
      }
      return next;
    });
  }, [trades]);

  useEffect(() => {
    fetchLivePrices();
    const interval = setInterval(fetchLivePrices, 60_000); // refresh every 60s
    return () => clearInterval(interval);
  }, [fetchLivePrices]);

  const sm = Object.fromEntries(strats.map((st) => [st.id, st]));

  // Collect all unique exit strategies used across all trades
  const allExitStrategies = [
    ...new Set(
      trades.flatMap((t) =>
        (t.exits ?? []).map((e) => e.exitStrategy).filter(Boolean),
      ),
    ),
  ];

  // Collect all unique tags used across all trades
  const allTags = [...new Set(trades.flatMap((t) => t.tags ?? []))];

  const exportCSV = () => {
    const headers = [
      "Date",
      "Instrument",
      "Strategy",
      "Direction",
      "Entry Price",
      "Exit Price",
      "Qty",
      "Days Held",
      "PnL",
      "Outcome",
      "Mock",
      "Notes",
      "Exits",
    ];
    const rows = trades.map((t) => {
      const days = daysHeld(t);
      const exitsStr = (t.exits ?? [])
        .map(
          (e) =>
            `${e.exitDate}:qty${e.qty}@${e.exitPrice}=₹${(e.pnl ?? 0).toFixed(2)}[${e.exitStrategy ? (EXIT_STRATEGY_LABELS[e.exitStrategy] ?? e.exitStrategy) : ""}]`,
        )
        .join(" | ");
      return [
        t.date ?? "",
        t.instrument ?? "",
        sm[t.strategyId]?.name ?? "",
        t.direction ?? "",
        t.entryPrice ?? "",
        t.exitPrice ?? "",
        t.qty ?? "",
        days != null ? days : "",
        t.pnl ?? "",
        t.outcome ?? "",
        t.mock ? "Yes" : "No",
        (t.notes ?? "").replace(/"/, "'"),
        exitsStr,
      ];
    });
    const esc = (v) => '"' + String(v).replace(/"/g, "'") + '"';
    const csv = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "trades_" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const activeFilterCount = [
    filters.outcome !== "all",
    filters.direction !== "all",
    filters.strategyId !== "all",
    filters.mock !== "all",
    filters.exitStrategy !== "all",
    filters.tag !== "all",
    dateRange.from || dateRange.to,
  ].filter(Boolean).length;

  const processed = [...trades]
    .filter((t) => {
      if (search && !t.instrument?.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (filters.outcome !== "all" && t.outcome !== filters.outcome)
        return false;
      if (filters.direction !== "all" && t.direction !== filters.direction)
        return false;
      if (filters.strategyId !== "all" && t.strategyId !== filters.strategyId)
        return false;
      if (filters.mock === "mock" && !t.mock) return false;
      if (filters.mock === "real" && t.mock) return false;
      if (
        filters.exitStrategy !== "all" &&
        !(t.exits ?? []).some((e) => e.exitStrategy === filters.exitStrategy)
      )
        return false;
      if (filters.tag !== "all" && !(t.tags ?? []).includes(filters.tag))
        return false;
      if (dateRange.from && t.date < dateRange.from) return false;
      if (dateRange.to && t.date > dateRange.to) return false;
      return true;
    })
    .sort((a, b) => {
      let av = a[sort.key],
        bv = b[sort.key];
      if (sort.key === "date") {
        av = new Date(av);
        bv = new Date(bv);
      }
      if (sort.key === "instrument") {
        av = av?.toLowerCase();
        bv = bv?.toLowerCase();
      }
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });

  const maxPnl = Math.max(...trades.map((t) => Math.abs(t.pnl || 0)), 1);

  const toggleSort = (key) =>
    setSort((s) => ({
      key,
      dir: s.key === key && s.dir === "asc" ? "desc" : "asc",
    }));

  const SortIcon = ({ col }) => {
    if (!col.sortable) return null;
    const active = sort.key === col.key;
    return (
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke={active ? "var(--green)" : "var(--text-3)"}
        strokeWidth="2.5"
        style={{ marginLeft: 4, flexShrink: 0 }}
      >
        {active && sort.dir === "asc" ? (
          <polyline points="18 15 12 9 6 15" />
        ) : (
          <polyline points="6 9 12 15 18 9" />
        )}
      </svg>
    );
  };

  return (
    <div>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 16,
        }}
      >
        {/* Row 1: Search (full width) */}
        <div style={{ position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              display: "flex",
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-3)"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ticker..."
            style={{
              width: "100%",
              padding: "8px 12px 8px 30px",
              border: "1px solid var(--border)",
              borderRadius: 9,
              fontSize: 13,
              color: "var(--text)",
              background: "var(--surface)",
              outline: "none",
              fontFamily: "Inter, sans-serif",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Row 2: Filter | Date | count | Export */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {/* Filter */}
          <div style={{ position: "relative" }}>
            <button
              className="btn-outline"
              onClick={() => {
                setShowFilter((v) => !v);
                setShowDate(false);
              }}
              style={{
                padding: "8px 14px",
                display: "flex",
                alignItems: "center",
                gap: 6,
                borderRadius: 9,
                position: "relative",
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              Filter
              {activeFilterCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "var(--green)",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>
            {showFilter && (
              <FilterPanel
                strats={strats}
                filters={filters}
                setFilters={setFilters}
                exitStrategies={allExitStrategies}
                allTags={allTags}
                onClose={() => setShowFilter(false)}
              />
            )}
          </div>

          {/* Date Range */}
          <div style={{ position: "relative" }}>
            <button
              className="btn-outline"
              onClick={() => {
                setShowDate((v) => !v);
                setShowFilter(false);
              }}
              style={{
                padding: "8px 14px",
                display: "flex",
                alignItems: "center",
                gap: 6,
                borderRadius: 9,
                color:
                  dateRange.from || dateRange.to ? "var(--green)" : undefined,
                borderColor:
                  dateRange.from || dateRange.to ? "var(--green)" : undefined,
                whiteSpace: "nowrap",
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {dateRange.from
                ? `${dateRange.from.slice(5).replace("-", "/")}${dateRange.to ? ` → ${dateRange.to.slice(5).replace("-", "/")}` : ""}`
                : "Date"}
            </button>
          </div>

          <span style={{ fontSize: 12, color: "var(--text-3)" }}>
            {processed.length} trade{processed.length !== 1 ? "s" : ""}
          </span>

          {/* Export */}
          <button
            onClick={exportCSV}
            className="btn-outline"
            style={{
              marginLeft: "auto",
              padding: "8px 14px",
              display: "flex",
              alignItems: "center",
              gap: 6,
              borderRadius: 9,
              whiteSpace: "nowrap",
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </button>
        </div>

        {/* Row 3: Date picker (inline, always fits) */}
        {showDate && (
          <DatePanel
            dateRange={dateRange}
            setDateRange={setDateRange}
            onClose={() => setShowDate(false)}
          />
        )}
      </div>

      {/* Table / Cards */}
      {processed.length === 0 ? (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "64px 0",
            textAlign: "center",
            color: "var(--text-3)",
            fontSize: 14,
          }}
        >
          {trades.length === 0
            ? "No trades logged yet."
            : "No trades match your filters."}
        </div>
      ) : isMobile ? (
        /* ── Mobile card list ── */
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {processed.map((t) => {
            const live = livePrices[t.id];
            const dispPnl = live != null ? live.pnl : t.pnl;
            const pnlColor =
              dispPnl > 0
                ? "var(--green)"
                : dispPnl < 0
                  ? "var(--red)"
                  : "var(--text-2)";
            return (
              <div
                key={t.id}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {/* Row 1: date + status */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--text-3)",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {t.date}
                  </span>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    {t.mock && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: 20,
                          background: "rgba(217,119,6,0.1)",
                          color: "#d97706",
                          border: "1px solid rgba(217,119,6,0.25)",
                        }}
                      >
                        MOCK
                      </span>
                    )}
                    {statusPill(t.outcome)}
                  </div>
                </div>
                {/* Row 2: instrument + direction */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: "var(--text)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {t.instrument}
                  </span>
                  {typePill(t.direction)}
                </div>
                {/* Row 3: prices */}
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                  {[
                    ["Entry", t.entryPrice?.toFixed(2)],
                    ["Exit", t.exitPrice?.toFixed(2) ?? (live ? "—" : "—")],
                    live ? ["LTP", live.ltp?.toFixed(2)] : null,
                    [
                      "R",
                      t.rMult != null
                        ? `${t.rMult > 0 ? "+" : ""}${t.rMult}R`
                        : null,
                    ],
                  ]
                    .filter(Boolean)
                    .map(
                      ([lbl, val]) =>
                        val != null && (
                          <div key={lbl}>
                            <div
                              style={{
                                fontSize: 9,
                                fontWeight: 700,
                                color: "var(--text-3)",
                                textTransform: "uppercase",
                                letterSpacing: "0.06em",
                                marginBottom: 2,
                              }}
                            >
                              {lbl}
                            </div>
                            <div
                              style={{
                                fontSize: 14,
                                fontFamily: "JetBrains Mono, monospace",
                                fontWeight: 600,
                                color:
                                  lbl === "R"
                                    ? parseFloat(val) > 0
                                      ? "var(--green)"
                                      : parseFloat(val) < 0
                                        ? "var(--red)"
                                        : "var(--text-2)"
                                    : "var(--text)",
                              }}
                            >
                              {val}
                            </div>
                          </div>
                        ),
                    )}
                </div>
                {/* Row 4: P&L + actions */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "baseline", gap: 5 }}
                  >
                    {live && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "1px 5px",
                          borderRadius: 4,
                          background: "rgba(59,130,246,0.15)",
                          color: "#3b82f6",
                          border: "1px solid rgba(59,130,246,0.3)",
                        }}
                      >
                        LIVE
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 22,
                        fontWeight: 800,
                        color: pnlColor,
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      {dispPnl != null
                        ? `${dispPnl >= 0 ? "+" : ""}₹${Math.abs(dispPnl).toFixed(0)}`
                        : "—"}
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", gap: 6, alignItems: "center" }}
                  >
                    <button
                      style={{
                        background: "none",
                        border: "1px solid var(--border)",
                        cursor: "pointer",
                        color: "var(--text-2)",
                        padding: "5px 12px",
                        fontSize: 12,
                        borderRadius: 7,
                        fontFamily: "Inter, sans-serif",
                        fontWeight: 500,
                      }}
                      onClick={() => setEditTrade(t)}
                    >
                      Edit
                    </button>
                    {toDelete === t.id ? (
                      <span style={{ display: "flex", gap: 4 }}>
                        <button
                          style={{
                            fontSize: 11,
                            padding: "5px 11px",
                            borderRadius: 7,
                            background: "var(--red)",
                            color: "#fff",
                            border: "none",
                            cursor: "pointer",
                            fontFamily: "Inter, sans-serif",
                          }}
                          onClick={() => {
                            onDelete(t.id);
                            setToDelete(null);
                          }}
                        >
                          Delete
                        </button>
                        <button
                          style={{
                            fontSize: 11,
                            padding: "5px 9px",
                            borderRadius: 7,
                            background: "var(--surface-2)",
                            color: "var(--text-2)",
                            border: "1px solid var(--border)",
                            cursor: "pointer",
                          }}
                          onClick={() => setToDelete(null)}
                        >
                          ✕
                        </button>
                      </span>
                    ) : (
                      <button
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: 22,
                          color: "var(--text-3)",
                          lineHeight: 1,
                          padding: "0 4px",
                        }}
                        onClick={() => setToDelete(t.id)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
                {/* Strategy + tags */}
                {(sm[t.strategyId]?.name || t.tags?.length > 0) && (
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    {sm[t.strategyId]?.name && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: "var(--surface-2)",
                          border: "1px solid var(--border)",
                          color: "var(--text-3)",
                        }}
                      >
                        {sm[t.strategyId].name}
                      </span>
                    )}
                    {(t.tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "2px 7px",
                          borderRadius: 10,
                          background: "var(--surface-2)",
                          color: "var(--text-3)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Desktop table ── */
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
                minWidth: 720,
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {COLS.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => col.sortable && toggleSort(col.key)}
                      style={{
                        padding: "13px 16px",
                        textAlign: col.right ? "right" : "left",
                        fontSize: 11,
                        fontWeight: 700,
                        color:
                          sort.key === col.key
                            ? "var(--green)"
                            : "var(--text-3)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        whiteSpace: "nowrap",
                        cursor: col.sortable ? "pointer" : "default",
                        userSelect: "none",
                      }}
                    >
                      <span
                        style={{ display: "inline-flex", alignItems: "center" }}
                      >
                        {col.label}
                        <SortIcon col={col} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {processed.map((t, i) => {
                  const live = livePrices[t.id];
                  const totalExitedQty = (t.exits ?? []).reduce(
                    (s, e) => s + (parseFloat(e.qty) || 0),
                    0,
                  );
                  const remainingQty = Math.max(
                    0,
                    (t.qty ?? 0) - totalExitedQty,
                  );
                  const isPartialOpen =
                    t.outcome === "open" && t.exits?.length > 0;
                  const realizedPnl = t.pnl ?? 0;
                  const unrealizedPnl = live?.pnl ?? null; // computed on remainingQty in fetchLivePrices
                  const dispPnl = isPartialOpen
                    ? realizedPnl + (unrealizedPnl ?? 0)
                    : live != null
                      ? live.pnl
                      : t.pnl;
                  const pnlPct = isPartialOpen
                    ? null
                    : live != null && t.entryPrice
                      ? ((live.ltp - t.entryPrice) / t.entryPrice) *
                        (t.direction === "short" ? -1 : 1) *
                        100
                      : t.entryPrice && t.exitPrice
                        ? ((t.exitPrice - t.entryPrice) / t.entryPrice) *
                          (t.direction === "short" ? -1 : 1) *
                          100
                        : null;
                  const barW = Math.min(
                    (Math.abs(dispPnl || 0) / maxPnl) * 100,
                    100,
                  );
                  const pnlColor =
                    dispPnl > 0
                      ? "var(--green)"
                      : dispPnl < 0
                        ? "var(--red)"
                        : "var(--text-2)";
                  const days = daysHeld(t);
                  const hasExits = t.exits?.length > 0;
                  const isExpanded = expanded.has(t.id);
                  const isLast = i === processed.length - 1;
                  const hasPayoff = !!(
                    t.entryPrice &&
                    (t.initialSl || t.planStop) &&
                    t.planTarget
                  );
                  const hasDetails = !!(
                    t.planThesis ||
                    t.planTarget ||
                    t.planStop ||
                    t.initialSl ||
                    t.screenshotUrl ||
                    t.commission
                  );
                  const expandable = hasExits || hasPayoff || hasDetails;
                  return (
                    <>
                      <tr
                        key={t.id}
                        style={{
                          borderBottom:
                            !isLast || (expandable && isExpanded)
                              ? "1px solid var(--border)"
                              : "none",
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            "var(--surface-2)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <td
                          style={{
                            padding: "16px 16px",
                            fontSize: 13,
                            color: "var(--text-2)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {t.date}
                        </td>
                        <td
                          style={{
                            padding: "16px 16px",
                            fontWeight: 700,
                            color: "var(--text)",
                            fontSize: 14,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 4,
                            }}
                          >
                            {t.instrument}
                            {live && (
                              <span
                                style={{
                                  fontSize: 11,
                                  fontFamily: "JetBrains Mono, monospace",
                                  color: "var(--text-3)",
                                }}
                              >
                                LTP{" "}
                                <span
                                  style={{
                                    color:
                                      live.changePct >= 0
                                        ? "var(--green)"
                                        : "var(--red)",
                                    fontWeight: 600,
                                  }}
                                >
                                  ₹{live.ltp.toFixed(2)}
                                </span>
                                <span
                                  style={{
                                    marginLeft: 4,
                                    color:
                                      live.changePct >= 0
                                        ? "var(--green)"
                                        : "var(--red)",
                                  }}
                                >
                                  {live.changePct >= 0 ? "▲" : "▼"}
                                  {Math.abs(live.changePct).toFixed(2)}%
                                </span>
                              </span>
                            )}
                            {t.tags?.length > 0 && (
                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 4,
                                }}
                              >
                                {t.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    onClick={() =>
                                      setFilters((f) => ({ ...f, tag }))
                                    }
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 600,
                                      padding: "2px 7px",
                                      borderRadius: 10,
                                      cursor: "pointer",
                                      background:
                                        filters.tag === tag
                                          ? "rgba(59,130,246,0.15)"
                                          : "var(--surface-2)",
                                      color:
                                        filters.tag === tag
                                          ? "#3b82f6"
                                          : "var(--text-3)",
                                      border: `1px solid ${filters.tag === tag ? "rgba(59,130,246,0.4)" : "var(--border)"}`,
                                    }}
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "16px 16px", maxWidth: 110 }}>
                          {(() => {
                            const name = sm[t.strategyId]?.name ?? "—";
                            const short =
                              name.length > 12 ? name.slice(0, 11) + "…" : name;
                            return (
                              <span
                                title={name}
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  padding: "3px 8px",
                                  borderRadius: 6,
                                  background: "var(--surface-2)",
                                  border: "1px solid var(--border)",
                                  color: "var(--text-3)",
                                  whiteSpace: "nowrap",
                                  display: "inline-block",
                                  maxWidth: 110,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {short}
                              </span>
                            );
                          })()}
                        </td>
                        <td style={{ padding: "16px 16px" }}>
                          {typePill(t.direction)}
                        </td>
                        <td
                          style={{
                            padding: "16px 16px",
                            fontSize: 13,
                            textAlign: "right",
                            color: "var(--text)",
                          }}
                        >
                          {t.entryPrice?.toFixed(2)}
                        </td>
                        <td
                          style={{
                            padding: "16px 16px",
                            fontSize: 13,
                            textAlign: "right",
                            color: "var(--text)",
                          }}
                        >
                          {isPartialOpen ? (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "flex-end",
                                gap: 3,
                              }}
                            >
                              {t.exitPrice ? (
                                <span style={{ color: "var(--text-2)" }}>
                                  {t.exitPrice.toFixed(2)}
                                </span>
                              ) : (
                                <span style={{ color: "var(--text-3)" }}>
                                  —
                                </span>
                              )}
                              <button
                                onClick={() => toggleExpand(t.id)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 3,
                                  fontSize: 10,
                                  fontWeight: 600,
                                  padding: "2px 7px",
                                  borderRadius: 10,
                                  cursor: "pointer",
                                  fontFamily: "Inter, sans-serif",
                                  background: isExpanded
                                    ? "rgba(59,130,246,0.12)"
                                    : "var(--surface-2)",
                                  color: isExpanded
                                    ? "#3b82f6"
                                    : "var(--text-3)",
                                  border: `1px solid ${isExpanded ? "rgba(59,130,246,0.35)" : "var(--border)"}`,
                                }}
                              >
                                <svg
                                  width="9"
                                  height="9"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  style={{
                                    transition: "transform 0.2s",
                                    transform: isExpanded
                                      ? "rotate(180deg)"
                                      : "none",
                                  }}
                                >
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                                {totalExitedQty} / {t.qty} exited
                              </button>
                            </div>
                          ) : t.exitPrice ? (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "flex-end",
                                gap: 3,
                              }}
                            >
                              <span>{t.exitPrice.toFixed(2)}</span>
                              {hasExits && t.exits.length > 1 ? (
                                <button
                                  onClick={() => toggleExpand(t.id)}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 3,
                                    fontSize: 10,
                                    fontWeight: 600,
                                    padding: "2px 7px",
                                    borderRadius: 10,
                                    cursor: "pointer",
                                    fontFamily: "Inter, sans-serif",
                                    background: isExpanded
                                      ? "rgba(45,122,95,0.1)"
                                      : "var(--surface-2)",
                                    color: isExpanded
                                      ? "var(--green)"
                                      : "var(--text-3)",
                                    border: `1px solid ${isExpanded ? "rgba(45,122,95,0.3)" : "var(--border)"}`,
                                  }}
                                >
                                  <svg
                                    width="9"
                                    height="9"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    style={{
                                      transition: "transform 0.2s",
                                      transform: isExpanded
                                        ? "rotate(180deg)"
                                        : "none",
                                    }}
                                  >
                                    <polyline points="6 9 12 15 18 9" />
                                  </svg>
                                  {t.exits.length} exits
                                </button>
                              ) : (
                                (() => {
                                  const es = t.exits?.[0]?.exitStrategy;
                                  if (!es) return null;
                                  const label = EXIT_STRATEGY_LABELS[es] ?? es;
                                  return (
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 600,
                                        padding: "2px 7px",
                                        borderRadius: 10,
                                        background: "var(--surface-2)",
                                        color: "var(--text-3)",
                                        border: "1px solid var(--border)",
                                        maxWidth: 120,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        display: "block",
                                      }}
                                      title={label}
                                    >
                                      {label}
                                    </span>
                                  );
                                })()
                              )}
                            </div>
                          ) : live ? (
                            <span
                              style={{
                                fontSize: 12,
                                color: "var(--text-3)",
                                fontStyle: "italic",
                              }}
                            >
                              live
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td
                          style={{
                            padding: "16px 16px",
                            textAlign: "right",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {days === null ? (
                            <span
                              style={{ fontSize: 12, color: "var(--text-3)" }}
                            >
                              open
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: 13,
                                fontFamily: "JetBrains Mono, monospace",
                                color: "var(--text-2)",
                              }}
                            >
                              {days}d
                            </span>
                          )}
                        </td>
                        <td
                          style={{ padding: "16px 16px", textAlign: "right" }}
                        >
                          {isPartialOpen ? (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "flex-end",
                                gap: 3,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 5,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 9,
                                    fontWeight: 700,
                                    color: "var(--text-3)",
                                    letterSpacing: "0.04em",
                                  }}
                                >
                                  REALIZED
                                </span>
                                <span
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    fontFamily: "JetBrains Mono, monospace",
                                    color:
                                      realizedPnl > 0
                                        ? "var(--green)"
                                        : realizedPnl < 0
                                          ? "var(--red)"
                                          : "var(--text-2)",
                                  }}
                                >
                                  {realizedPnl >= 0 ? "+" : ""}₹
                                  {realizedPnl.toFixed(0)}
                                </span>
                              </div>
                              {unrealizedPnl != null && (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 5,
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: 9,
                                      fontWeight: 700,
                                      padding: "1px 4px",
                                      borderRadius: 3,
                                      background: "rgba(59,130,246,0.15)",
                                      color: "#3b82f6",
                                      border: "1px solid rgba(59,130,246,0.3)",
                                    }}
                                  >
                                    LIVE
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 13,
                                      fontWeight: 700,
                                      fontFamily: "JetBrains Mono, monospace",
                                      color:
                                        unrealizedPnl > 0
                                          ? "var(--green)"
                                          : unrealizedPnl < 0
                                            ? "var(--red)"
                                            : "var(--text-2)",
                                    }}
                                  >
                                    {unrealizedPnl >= 0 ? "+" : ""}₹
                                    {unrealizedPnl.toFixed(0)}
                                  </span>
                                </div>
                              )}
                              <div
                                style={{
                                  borderTop: "1px solid var(--border)",
                                  paddingTop: 3,
                                  width: "100%",
                                  textAlign: "right",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 15,
                                    fontWeight: 800,
                                    color: pnlColor,
                                    fontFamily: "JetBrains Mono, monospace",
                                  }}
                                >
                                  {dispPnl >= 0 ? "+" : ""}₹{dispPnl.toFixed(0)}
                                </span>
                              </div>
                              <div
                                style={{
                                  width: 48,
                                  height: 3,
                                  borderRadius: 2,
                                  background: "var(--border)",
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    height: "100%",
                                    width: `${barW}%`,
                                    background: pnlColor,
                                    borderRadius: 2,
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "flex-end",
                                gap: 4,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "baseline",
                                  gap: 5,
                                }}
                              >
                                {live && (
                                  <span
                                    style={{
                                      fontSize: 9,
                                      fontWeight: 700,
                                      padding: "1px 5px",
                                      borderRadius: 4,
                                      background: "rgba(59,130,246,0.15)",
                                      color: "#3b82f6",
                                      border: "1px solid rgba(59,130,246,0.3)",
                                      letterSpacing: "0.04em",
                                    }}
                                  >
                                    LIVE
                                  </span>
                                )}
                                {pnlPct !== null && (
                                  <span
                                    style={{ fontSize: 11, color: pnlColor }}
                                  >
                                    {pnlPct > 0 ? "+" : ""}
                                    {pnlPct.toFixed(2)}%
                                  </span>
                                )}
                                <span
                                  style={{
                                    fontSize: 15,
                                    fontWeight: 700,
                                    color: pnlColor,
                                  }}
                                >
                                  {dispPnl > 0 ? "+" : ""}
                                  {dispPnl?.toFixed(0)}
                                </span>
                              </div>
                              <div
                                style={{
                                  width: 48,
                                  height: 3,
                                  borderRadius: 2,
                                  background: "var(--border)",
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    height: "100%",
                                    width: `${barW}%`,
                                    background: pnlColor,
                                    borderRadius: 2,
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </td>
                        <td
                          style={{
                            padding: "16px 16px",
                            fontSize: 13,
                            textAlign: "right",
                            color: "var(--text-2)",
                            fontFamily: "JetBrains Mono, monospace",
                          }}
                        >
                          {t.rMult != null
                            ? `${t.rMult > 0 ? "+" : ""}${t.rMult}R`
                            : "—"}
                        </td>
                        <td style={{ padding: "16px 16px" }}>
                          {statusPill(t.outcome)}
                        </td>
                        <td style={{ padding: "16px 16px" }}>
                          {t.mock && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "3px 8px",
                                borderRadius: 20,
                                background: "rgba(217,119,6,0.1)",
                                color: "#d97706",
                                border: "1px solid rgba(217,119,6,0.25)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              MOCK
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "16px 16px" }}>
                          <div
                            style={{
                              display: "flex",
                              gap: 4,
                              alignItems: "center",
                              justifyContent: "flex-end",
                            }}
                          >
                            {/* Expand */}
                            {expandable && (
                              <button
                                title={isExpanded ? "Collapse" : "Expand"}
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: isExpanded
                                    ? "var(--green)"
                                    : "var(--text-3)",
                                  padding: "2px 4px",
                                  lineHeight: 1,
                                  borderRadius: 4,
                                  transition: "color 0.15s",
                                }}
                                onClick={() => toggleExpand(t.id)}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.color = "var(--text)")
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.color = isExpanded
                                    ? "var(--green)"
                                    : "var(--text-3)")
                                }
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  style={{
                                    transition: "transform 0.2s",
                                    transform: isExpanded
                                      ? "rotate(180deg)"
                                      : "none",
                                    display: "block",
                                  }}
                                >
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              </button>
                            )}
                            {/* Edit */}
                            <button
                              title="Edit"
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "var(--text-3)",
                                padding: "2px 4px",
                                lineHeight: 1,
                                borderRadius: 4,
                              }}
                              onClick={() => setEditTrade(t)}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.color = "var(--text)")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.color = "var(--text-3)")
                              }
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            {/* Delete */}
                            {toDelete === t.id ? (
                              <span style={{ display: "flex", gap: 6 }}>
                                <button
                                  style={{
                                    fontSize: 11,
                                    padding: "4px 10px",
                                    borderRadius: 6,
                                    background: "var(--red)",
                                    color: "#fff",
                                    border: "none",
                                    cursor: "pointer",
                                  }}
                                  onClick={() => {
                                    onDelete(t.id);
                                    setToDelete(null);
                                  }}
                                >
                                  Del
                                </button>
                                <button
                                  className="btn-outline"
                                  style={{
                                    fontSize: 11,
                                    padding: "4px 8px",
                                    borderRadius: 6,
                                  }}
                                  onClick={() => setToDelete(null)}
                                >
                                  ✕
                                </button>
                              </span>
                            ) : (
                              <button
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  fontSize: 18,
                                  color: "var(--text-3)",
                                  lineHeight: 1,
                                }}
                                onClick={() => setToDelete(t.id)}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {hasExits && isExpanded && (
                        <tr
                          key={`${t.id}-exits`}
                          style={{
                            borderBottom: !isLast
                              ? "1px solid var(--border)"
                              : "none",
                          }}
                        >
                          <td
                            colSpan={COLS.length}
                            style={{
                              padding: "0 16px 14px 16px",
                              background: "var(--surface-2)",
                            }}
                          >
                            <div
                              style={{
                                borderRadius: 10,
                                overflow: "hidden",
                                border: "1px solid var(--border)",
                              }}
                            >
                              <table
                                style={{
                                  width: "100%",
                                  borderCollapse: "collapse",
                                  fontSize: 12,
                                }}
                              >
                                <thead>
                                  <tr
                                    style={{
                                      borderBottom: "1px solid var(--border)",
                                      background: "var(--surface)",
                                    }}
                                  >
                                    {[
                                      "#",
                                      "Exit Date",
                                      "Qty",
                                      "Exit Price",
                                      "P&L",
                                      "Reason",
                                    ].map((h) => (
                                      <th
                                        key={h}
                                        style={{
                                          padding: "8px 14px",
                                          textAlign:
                                            h === "#"
                                              ? "center"
                                              : h === "P&L" ||
                                                  h === "Exit Price" ||
                                                  h === "Qty"
                                                ? "right"
                                                : "left",
                                          fontSize: 10,
                                          fontWeight: 700,
                                          color: "var(--text-3)",
                                          textTransform: "uppercase",
                                          letterSpacing: "0.06em",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {h}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {t.exits.map((e, ei) => {
                                    const epnlColor =
                                      e.pnl > 0
                                        ? "var(--green)"
                                        : e.pnl < 0
                                          ? "var(--red)"
                                          : "var(--text-2)";
                                    return (
                                      <tr
                                        key={e.id}
                                        style={{
                                          borderBottom:
                                            "1px solid var(--border)",
                                        }}
                                      >
                                        <td
                                          style={{
                                            padding: "9px 14px",
                                            textAlign: "center",
                                            color: "var(--text-3)",
                                            fontSize: 11,
                                          }}
                                        >
                                          {ei + 1}
                                        </td>
                                        <td
                                          style={{
                                            padding: "9px 14px",
                                            color: "var(--text-2)",
                                            whiteSpace: "nowrap",
                                          }}
                                        >
                                          {e.exitDate ?? "—"}
                                        </td>
                                        <td
                                          style={{
                                            padding: "9px 14px",
                                            textAlign: "right",
                                            fontFamily:
                                              "JetBrains Mono, monospace",
                                            color: "var(--text)",
                                          }}
                                        >
                                          {e.qty}
                                        </td>
                                        <td
                                          style={{
                                            padding: "9px 14px",
                                            textAlign: "right",
                                            fontFamily:
                                              "JetBrains Mono, monospace",
                                            color: "var(--text)",
                                          }}
                                        >
                                          {e.exitPrice?.toFixed(2)}
                                        </td>
                                        <td
                                          style={{
                                            padding: "9px 14px",
                                            textAlign: "right",
                                            fontFamily:
                                              "JetBrains Mono, monospace",
                                            fontWeight: 700,
                                            color: epnlColor,
                                          }}
                                        >
                                          {e.pnl >= 0 ? "+" : ""}₹
                                          {e.pnl?.toFixed(2)}
                                        </td>
                                        <td
                                          style={{
                                            padding: "9px 14px",
                                            color: "var(--text-2)",
                                            whiteSpace: "nowrap",
                                          }}
                                        >
                                          {e.exitStrategy
                                            ? (EXIT_STRATEGY_LABELS[
                                                e.exitStrategy
                                              ] ?? e.exitStrategy)
                                            : "—"}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                  {isPartialOpen && (
                                    <tr
                                      style={{
                                        background: "rgba(59,130,246,0.04)",
                                        borderTop: "2px solid var(--border)",
                                      }}
                                    >
                                      <td
                                        style={{
                                          padding: "9px 14px",
                                          textAlign: "center",
                                          color: "#3b82f6",
                                          fontSize: 13,
                                        }}
                                      >
                                        ↓
                                      </td>
                                      <td
                                        style={{
                                          padding: "9px 14px",
                                          color: "#3b82f6",
                                          fontStyle: "italic",
                                          fontSize: 11,
                                          fontWeight: 600,
                                        }}
                                      >
                                        Remaining open
                                      </td>
                                      <td
                                        style={{
                                          padding: "9px 14px",
                                          textAlign: "right",
                                          fontFamily:
                                            "JetBrains Mono, monospace",
                                          color: "#3b82f6",
                                          fontWeight: 700,
                                        }}
                                      >
                                        {remainingQty}
                                      </td>
                                      <td
                                        style={{
                                          padding: "9px 14px",
                                          textAlign: "right",
                                          fontFamily:
                                            "JetBrains Mono, monospace",
                                          fontSize: 12,
                                          color: live
                                            ? "#3b82f6"
                                            : "var(--text-3)",
                                        }}
                                      >
                                        {live ? `₹${live.ltp.toFixed(2)}` : "—"}
                                      </td>
                                      <td
                                        style={{
                                          padding: "9px 14px",
                                          textAlign: "right",
                                          fontFamily:
                                            "JetBrains Mono, monospace",
                                          fontWeight: 700,
                                          color:
                                            unrealizedPnl != null
                                              ? unrealizedPnl >= 0
                                                ? "var(--green)"
                                                : "var(--red)"
                                              : "var(--text-3)",
                                        }}
                                      >
                                        {unrealizedPnl != null
                                          ? `${unrealizedPnl >= 0 ? "+" : ""}₹${unrealizedPnl.toFixed(2)}`
                                          : "no live price"}
                                      </td>
                                      <td
                                        style={{
                                          padding: "9px 14px",
                                          color: "var(--text-3)",
                                          fontStyle: "italic",
                                          fontSize: 11,
                                        }}
                                      >
                                        still open
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                      {isExpanded &&
                        t.entryPrice &&
                        (t.initialSl || t.planStop) &&
                        t.planTarget && (
                          <tr
                            key={`${t.id}-payoff`}
                            style={{ borderBottom: "1px solid var(--border)" }}
                          >
                            <td
                              colSpan={COLS.length}
                              style={{
                                padding: "0 16px 14px 16px",
                                background: "var(--surface-2)",
                              }}
                            >
                              <div
                                style={{
                                  background: "var(--surface)",
                                  border: "1px solid var(--border)",
                                  borderRadius: 10,
                                  padding: "14px 18px",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: "var(--text-3)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.06em",
                                    marginBottom: 10,
                                  }}
                                >
                                  Payoff Chart —{" "}
                                  {t.direction === "short" ? "Short" : "Long"} ·{" "}
                                  {t.instrument}
                                </div>
                                <PayoffChart trade={t} />
                              </div>
                            </td>
                          </tr>
                        )}
                      {isExpanded &&
                        (t.planThesis ||
                          t.planTarget ||
                          t.planStop ||
                          t.screenshotUrl ||
                          t.commission) && (
                          <tr
                            key={`${t.id}-detail`}
                            style={{
                              borderBottom: !isLast
                                ? "1px solid var(--border)"
                                : "none",
                            }}
                          >
                            <td
                              colSpan={COLS.length}
                              style={{
                                padding: "0 16px 16px 16px",
                                background: "var(--surface-2)",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  gap: 16,
                                  flexWrap: "wrap",
                                }}
                              >
                                {/* Plan vs Actual */}
                                {(t.planThesis ||
                                  t.planTarget ||
                                  t.planStop) && (
                                  <div
                                    style={{
                                      flex: 1,
                                      minWidth: 200,
                                      background: "var(--surface)",
                                      border: "1px solid var(--border)",
                                      borderRadius: 10,
                                      padding: 14,
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: "var(--text-3)",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.06em",
                                        marginBottom: 10,
                                      }}
                                    >
                                      Pre-Trade Plan
                                    </div>
                                    {t.planThesis && (
                                      <p
                                        style={{
                                          fontSize: 12,
                                          color: "var(--text-2)",
                                          margin: "0 0 8px",
                                          lineHeight: 1.5,
                                        }}
                                      >
                                        {t.planThesis}
                                      </p>
                                    )}
                                    <div style={{ display: "flex", gap: 20 }}>
                                      {t.planTarget != null && (
                                        <div>
                                          <div
                                            style={{
                                              fontSize: 10,
                                              color: "var(--text-3)",
                                            }}
                                          >
                                            Plan Target
                                          </div>
                                          <div
                                            style={{
                                              fontSize: 13,
                                              fontWeight: 700,
                                              color: "var(--green)",
                                              fontFamily:
                                                "JetBrains Mono, monospace",
                                            }}
                                          >
                                            {t.planTarget}
                                          </div>
                                          {t.exits?.length &&
                                            t.exits[t.exits.length - 1]
                                              ?.exitPrice != null && (
                                              <div
                                                style={{
                                                  fontSize: 10,
                                                  color: "var(--text-3)",
                                                  marginTop: 2,
                                                }}
                                              >
                                                Actual:{" "}
                                                <span
                                                  style={{
                                                    color: "var(--text-2)",
                                                    fontFamily:
                                                      "JetBrains Mono, monospace",
                                                  }}
                                                >
                                                  {t.exits[
                                                    t.exits.length - 1
                                                  ].exitPrice?.toFixed(2)}
                                                </span>
                                              </div>
                                            )}
                                        </div>
                                      )}
                                      {t.planStop != null && (
                                        <div>
                                          <div
                                            style={{
                                              fontSize: 10,
                                              color: "var(--text-3)",
                                            }}
                                          >
                                            Plan Stop
                                          </div>
                                          <div
                                            style={{
                                              fontSize: 13,
                                              fontWeight: 700,
                                              color: "var(--red)",
                                              fontFamily:
                                                "JetBrains Mono, monospace",
                                            }}
                                          >
                                            {t.planStop}
                                          </div>
                                          {t.initialSl != null && (
                                            <div
                                              style={{
                                                fontSize: 10,
                                                color: "var(--text-3)",
                                                marginTop: 2,
                                              }}
                                            >
                                              Actual SL:{" "}
                                              <span
                                                style={{
                                                  color: "var(--text-2)",
                                                  fontFamily:
                                                    "JetBrains Mono, monospace",
                                                }}
                                              >
                                                {t.initialSl}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {/* Commission */}
                                {t.commission > 0 && (
                                  <div
                                    style={{
                                      background: "var(--surface)",
                                      border: "1px solid var(--border)",
                                      borderRadius: 10,
                                      padding: 14,
                                      minWidth: 140,
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: "var(--text-3)",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.06em",
                                        marginBottom: 8,
                                      }}
                                    >
                                      Charges
                                    </div>
                                    <div
                                      style={{
                                        fontSize: 12,
                                        color: "var(--text-2)",
                                      }}
                                    >
                                      Commission:{" "}
                                      <span
                                        style={{
                                          color: "var(--red)",
                                          fontFamily:
                                            "JetBrains Mono, monospace",
                                          fontWeight: 700,
                                        }}
                                      >
                                        -₹{t.commission.toFixed(2)}
                                      </span>
                                    </div>
                                    {t.pnl != null && (
                                      <div
                                        style={{
                                          fontSize: 12,
                                          color: "var(--text-2)",
                                          marginTop: 4,
                                        }}
                                      >
                                        Net P&amp;L:{" "}
                                        <span
                                          style={{
                                            color:
                                              t.pnl - t.commission >= 0
                                                ? "var(--green)"
                                                : "var(--red)",
                                            fontFamily:
                                              "JetBrains Mono, monospace",
                                            fontWeight: 700,
                                          }}
                                        >
                                          {t.pnl - t.commission >= 0 ? "+" : ""}
                                          ₹{(t.pnl - t.commission).toFixed(2)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {/* Screenshot */}
                                {t.screenshotUrl && (
                                  <div style={{ flex: 2, minWidth: 240 }}>
                                    <div
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: "var(--text-3)",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.06em",
                                        marginBottom: 8,
                                      }}
                                    >
                                      Chart Screenshot
                                    </div>
                                    <a
                                      href={t.screenshotUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <img
                                        src={t.screenshotUrl}
                                        alt="Chart screenshot"
                                        style={{
                                          maxWidth: "100%",
                                          maxHeight: 280,
                                          borderRadius: 8,
                                          border: "1px solid var(--border)",
                                          display: "block",
                                          objectFit: "contain",
                                        }}
                                      />
                                    </a>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {logModal && strats.length > 0 && (
        <LogModal
          strategy={strats[0]}
          strats={strats}
          prefill={prefill}
          onSave={(trade) => {
            onLogTrade(trade);
            setLogModal(false);
            setPrefill(null);
          }}
          onClose={() => {
            setLogModal(false);
            setPrefill(null);
          }}
          variant={null}
          score={{ done: 0, total: 0 }}
        />
      )}

      {editTrade &&
        (() => {
          const st = sm[editTrade.strategyId] ?? strats[0];
          if (!st) return null;
          return (
            <LogModal
              strategy={st}
              trade={editTrade}
              onUpdate={(trade) => {
                onEditTrade(trade);
                setEditTrade(null);
              }}
              onClose={() => setEditTrade(null)}
              variant={editTrade.variant}
              score={editTrade.checklistScore ?? { done: 0, total: 0 }}
            />
          );
        })()}
    </div>
  );
}
