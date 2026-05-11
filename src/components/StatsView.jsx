import React, { useState, useMemo } from "react";
import { fmt } from "./ui";

function MockToggle({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {[
        { v: "all", label: "All Trades" },
        { v: "real", label: "Real" },
        { v: "mock", label: "Mock" },
      ].map(({ v, label }) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          style={{
            padding: "6px 14px",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "Inter, sans-serif",
            background: value === v ? "var(--green)" : "var(--surface-2)",
            color: value === v ? "#fff" : "var(--text-2)",
            border: `1px solid ${value === v ? "var(--green)" : "var(--border)"}`,
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function SummaryCard({ label, value, accent }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "22px 24px",
        flex: "1 1 min(100%, 180px)",
        minWidth: 0,
      }}
    >
      <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 10 }}>
        {label}
      </p>
      <p
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: accent ?? "var(--text)",
          margin: 0,
          fontFamily: "JetBrains Mono, monospace",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function EquityCurve({ trades }) {
  const sorted = [...trades].sort(
    (a, b) => new Date(a.date) - new Date(b.date),
  );
  if (sorted.length < 2)
    return (
      <p style={{ color: "var(--text-3)", fontSize: 13, padding: 20 }}>
        Not enough data.
      </p>
    );

  // Build cumulative equity + drawdown
  const points = sorted.reduce((acc, t) => {
    const prev = acc[acc.length - 1]?.y ?? 0;
    const y = prev + (t.pnl || 0);
    acc.push({ date: t.date, y });
    return acc;
  }, []);

  const peak = points
    .reduce(
      (acc, p) => {
        const prevPeak = acc[acc.length - 1];
        acc.push(Math.max(prevPeak, p.y));
        return acc;
      },
      [points[0]?.y ?? 0],
    )
    .slice(1);

  const W = 560,
    H = 220,
    PAD = { top: 16, right: 16, bottom: 40, left: 56 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;

  const allY = [...points.map((p) => p.y), ...peak];
  const minY = Math.min(0, ...allY);
  const maxY = Math.max(...allY);
  const rangeY = maxY - minY || 1;

  const xScale = (i) => PAD.left + (i / (points.length - 1)) * iW;
  const yScale = (v) => PAD.top + iH - ((v - minY) / rangeY) * iH;

  const pathD = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(p.y).toFixed(1)}`,
    )
    .join(" ");
  const peakD = peak
    .map(
      (v, i) =>
        `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(v).toFixed(1)}`,
    )
    .join(" ");
  const zero = yScale(Math.max(0, minY));

  // Drawdown fill polygon between peak line and equity line
  const ddFill = [
    ...peak.map(
      (v, i) =>
        `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(v).toFixed(1)}`,
    ),
    ...[...points]
      .reverse()
      .map(
        (p, i, arr) =>
          `${i === 0 ? "L" : "L"}${xScale(arr.length - 1 - i).toFixed(1)},${yScale(p.y).toFixed(1)}`,
      ),
    "Z",
  ].join(" ");

  const yTicks = 4;
  const yLabels = Array.from(
    { length: yTicks + 1 },
    (_, i) => minY + (rangeY / yTicks) * i,
  );

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: "auto", overflow: "visible" }}
    >
      {/* Grid lines */}
      {yLabels.map((v, i) => {
        const y = yScale(v);
        return (
          <g key={i}>
            <line
              x1={PAD.left}
              y1={y}
              x2={W - PAD.right}
              y2={y}
              stroke="var(--border)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text
              x={PAD.left - 6}
              y={y + 4}
              textAnchor="end"
              fontSize="11"
              fill="var(--text-3)"
            >
              ₹{Math.round(v)}
            </text>
          </g>
        );
      })}
      {/* X labels */}
      {points
        .filter((_, i) => {
          const step = Math.max(1, Math.floor(points.length / 5));
          return i % step === 0 || i === points.length - 1;
        })
        .map((p, i) => (
          <text
            key={i}
            x={xScale(points.indexOf(p))}
            y={H - 8}
            textAnchor="middle"
            fontSize="11"
            fill="var(--text-3)"
          >
            {p.date.slice(5)}
          </text>
        ))}
      {/* Zero baseline */}
      {minY < 0 && (
        <line
          x1={PAD.left}
          y1={zero}
          x2={W - PAD.right}
          y2={zero}
          stroke="var(--border)"
          strokeWidth="1.5"
        />
      )}
      {/* Drawdown shading */}
      <path d={ddFill} fill="rgba(220,38,38,0.10)" />
      {/* Peak line */}
      <path
        d={peakD}
        fill="none"
        stroke="rgba(220,38,38,0.35)"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
      {/* Equity line */}
      <path
        d={pathD}
        fill="none"
        stroke="var(--green)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Dots (only if few points) */}
      {points.length <= 20 &&
        points.map((p, i) => (
          <circle
            key={i}
            cx={xScale(i)}
            cy={yScale(p.y)}
            r="4"
            fill="var(--green)"
            stroke="white"
            strokeWidth="2"
          />
        ))}
    </svg>
  );
}

function CalendarHeatmap({ trades }) {
  const [activeDate, setActiveDate] = React.useState(null);

  const { byExitDate, entryDates, allDates, tradesByDate } = useMemo(() => {
    const byExitDate = {};
    const entryDates = new Set();
    const tradesByDate = {}; // date -> Set of trade ids that touch that date

    const touch = (date, id) => {
      if (!tradesByDate[date]) tradesByDate[date] = new Set();
      tradesByDate[date].add(id);
    };

    for (const t of trades) {
      if (t.date) {
        entryDates.add(t.date);
        touch(t.date, t.id);
      }
      if (t.exits && t.exits.length > 0) {
        for (const e of t.exits) {
          const d = e.exitDate || t.date;
          if (!d) continue;
          byExitDate[d] = (byExitDate[d] || 0) + (e.pnl || 0);
          touch(d, t.id);
        }
      } else if (t.pnl && t.date) {
        byExitDate[t.date] = (byExitDate[t.date] || 0) + (t.pnl || 0);
      }
    }

    const allDates = new Set([...Object.keys(byExitDate), ...entryDates]);
    return { byExitDate, entryDates, allDates, tradesByDate };
  }, [trades]);

  if (!allDates.size)
    return <p style={{ color: "var(--text-3)", fontSize: 13 }}>No data.</p>;

  const sorted = [...allDates].sort();
  const firstDate = new Date(sorted[0]);
  const lastDate = new Date(sorted[sorted.length - 1]);

  const startSunday = new Date(firstDate);
  startSunday.setDate(startSunday.getDate() - startSunday.getDay());

  const weeks = [];
  const cur = new Date(startSunday);
  while (cur <= lastDate) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const iso = cur.toISOString().slice(0, 10);
      week.push({
        date: iso,
        pnl: byExitDate[iso] ?? null,
        isEntry: entryDates.has(iso),
        isExit: iso in byExitDate,
        inRange: cur >= firstDate && cur <= lastDate,
      });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }

  const maxAbs = Math.max(...Object.values(byExitDate).map(Math.abs), 1);
  const CELL = 14,
    GAP = 3,
    LABEL_W = 24;
  const MONTH_Y = 12;
  const GRID_Y = 20;
  const LEGEND_H = 20;
  const W = weeks.length * (CELL + GAP) + LABEL_W;
  const H = GRID_Y + 7 * (CELL + GAP) + LEGEND_H;

  const exitColor = (pnl) => {
    if (pnl === null) return "var(--surface-2)";
    if (pnl === 0) return "var(--border)";
    const intensity = Math.min(Math.abs(pnl) / maxAbs, 1);
    return pnl > 0
      ? `rgba(45,122,95,${0.15 + intensity * 0.75})`
      : `rgba(220,38,38,${0.15 + intensity * 0.75})`;
  };

  const dateToCenter = (dateStr) => {
    const d = new Date(dateStr);
    const dayIdx = Math.round((d - startSunday) / 86400000);
    if (dayIdx < 0) return null;
    const wi = Math.floor(dayIdx / 7);
    const di = dayIdx % 7;
    if (wi >= weeks.length) return null;
    return {
      x: LABEL_W + wi * (CELL + GAP) + CELL / 2,
      y: GRID_Y + di * (CELL + GAP) + CELL / 2,
    };
  };

  // Build ALL connectors with their associated trade id
  const allConnectors = [];
  for (const t of trades) {
    if (!t.date) continue;
    const entry = dateToCenter(t.date);
    if (!entry) continue;
    for (const e of t.exits ?? []) {
      const exitDate = e.exitDate || t.date;
      if (exitDate === t.date) continue;
      const exit = dateToCenter(exitDate);
      if (!exit) continue;
      const pnl = e.pnl ?? 0;
      const stroke =
        pnl > 0
          ? "rgba(45,122,95,1)"
          : pnl < 0
            ? "rgba(220,38,38,1)"
            : "rgba(150,150,150,0.9)";
      allConnectors.push({
        tradeId: t.id,
        entryDate: t.date,
        exitDate,
        entry,
        exit,
        stroke,
      });
    }
  }

  // Which trade ids are touched by the active date?
  const activeTrades = activeDate
    ? (tradesByDate[activeDate] ?? new Set())
    : new Set();
  const visibleConnectors = allConnectors.filter((c) =>
    activeTrades.has(c.tradeId),
  );

  const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const tooltip = (day) => {
    const parts = [];
    if (day.isEntry) parts.push("Entry");
    if (day.isExit) parts.push(`Exit · ₹${day.pnl?.toFixed(0)}`);
    return parts.length ? `${day.date}: ${parts.join(" | ")}` : day.date;
  };

  const handleCellEnter = (date) => setActiveDate(date);
  const handleCellLeave = () => setActiveDate(null);
  const handleCellClick = (date) =>
    setActiveDate((prev) => (prev === date ? null : date));

  return (
    <div style={{ overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ minWidth: Math.min(W, 600), height: H }}
      >
        {/* ── Active line connectors ── */}
        {visibleConnectors.map((c, i) => (
          <g key={i} style={{ pointerEvents: "none" }}>
            <line
              x1={c.entry.x} y1={c.entry.y}
              x2={c.exit.x}  y2={c.exit.y}
              stroke={c.stroke}
              strokeWidth="2.5"
              strokeDasharray="4 2"
            />
            <circle cx={c.exit.x} cy={c.exit.y} r={2.2} fill={c.stroke} />
          </g>
        ))}

        {/* Day labels */}
        {DAY_LABELS.map((l, d) => (
          <text
            key={d}
            x={LABEL_W - 4}
            y={GRID_Y + d * (CELL + GAP) + CELL - 2}
            textAnchor="end"
            fontSize="9"
            fill="var(--text-3)"
          >
            {l}
          </text>
        ))}

        {/* Month labels */}
        {weeks.map((week, wi) => {
          const first = week.find((d) => d.inRange);
          if (!first) return null;
          const d = new Date(first.date);
          if (d.getDate() <= 7 && wi > 0) {
            return (
              <text
                key={wi}
                x={LABEL_W + wi * (CELL + GAP) + CELL / 2}
                y={MONTH_Y}
                textAnchor="middle"
                fontSize="9"
                fill="var(--text-3)"
              >
                {d.toLocaleString("default", { month: "short" })}
              </text>
            );
          }
          return null;
        })}

        {/* Cells */}
        {weeks.map((week, wi) =>
          week.map((day, di) => {
            const x = LABEL_W + wi * (CELL + GAP);
            const y = GRID_Y + di * (CELL + GAP);
            const isActive = day.date === activeDate;
            const isLinked =
              activeTrades.size > 0 &&
              (tradesByDate[day.date] ?? new Set()).size > 0 &&
              [...(tradesByDate[day.date] ?? [])].some((id) =>
                activeTrades.has(id),
              );
            return (
              <g
                key={`${wi}-${di}`}
                style={{
                  cursor:
                    day.inRange && tradesByDate[day.date]?.size > 0
                      ? "pointer"
                      : "default",
                }}
                onMouseEnter={() => day.inRange && setActiveDate(day.date)}
                onMouseLeave={() => setActiveDate(null)}
                onClick={() => day.inRange && handleCellClick(day.date)}
              >
                <rect
                  x={x}
                  y={y}
                  width={CELL}
                  height={CELL}
                  rx={2}
                  fill={
                    day.inRange
                      ? day.isExit
                        ? exitColor(day.pnl)
                        : "var(--surface-2)"
                      : "transparent"
                  }
                  stroke={
                    isActive || isLinked ? "rgba(255,255,255,0.6)" : "none"
                  }
                  strokeWidth={isActive || isLinked ? 1 : 0}
                >
                  <title>{day.inRange ? tooltip(day) : ""}</title>
                </rect>
                {/* Entry dot */}
                {day.inRange && day.isEntry && (
                  <circle
                    cx={x + CELL - 3}
                    cy={y + CELL - 3}
                    r={2.2}
                    fill={day.isExit ? "rgba(255,255,255,0.8)" : "#3b82f6"}
                  >
                    <title>{day.date}: Entry</title>
                  </circle>
                )}
              </g>
            );
          }),
        )}

        {/* Legend */}
        <g transform={`translate(${LABEL_W}, ${H - LEGEND_H + 4})`}>
          <circle cx={5} cy={8} r={2.5} fill="#3b82f6" />
          <text x={11} y={11} fontSize="8" fill="var(--text-3)">
            Entry
          </text>

          <rect
            x={42}
            y={3}
            width={10}
            height={10}
            rx={2}
            fill="rgba(45,122,95,0.7)"
          />
          <text x={55} y={11} fontSize="8" fill="var(--text-3)">
            Profit exit
          </text>

          <rect
            x={104}
            y={3}
            width={10}
            height={10}
            rx={2}
            fill="rgba(220,38,38,0.7)"
          />
          <text x={117} y={11} fontSize="8" fill="var(--text-3)">
            Loss exit
          </text>

          <path
            d="M162,8 Q168,3 174,8"
            fill="none"
            stroke="rgba(100,100,100,0.6)"
            strokeWidth="1.2"
            strokeDasharray="3 2"
          />
          <circle cx={174} cy={8} r={1.8} fill="rgba(100,100,100,0.6)" />
          <text x={178} y={11} fontSize="8" fill="var(--text-3)">
            Hover/tap to see arc
          </text>
        </g>
      </svg>
    </div>
  );
}

function StrategyPerformance({ trades, strats }) {
  const data = useMemo(
    () =>
      strats
        .map((st) => {
          const ts = trades.filter((t) => t.strategyId === st.id);
          if (!ts.length) return null;
          const wins = ts.filter((t) => t.outcome === "win").length;
          const losses = ts.filter((t) => t.outcome === "loss").length;
          const pnl = ts.reduce((a, t) => a + (t.pnl || 0), 0);
          const wr = ts.length ? Math.round((wins / ts.length) * 100) : 0;
          const rTrades = ts.filter((t) => t.rMult != null);
          const avgR = rTrades.length
            ? rTrades.reduce((a, t) => a + t.rMult, 0) / rTrades.length
            : null;
          return {
            id: st.id,
            name: st.name,
            count: ts.length,
            wins,
            losses,
            pnl,
            wr,
            avgR,
          };
        })
        .filter(Boolean),
    [trades, strats],
  );

  if (!data.length)
    return <p style={{ color: "var(--text-3)", fontSize: 13 }}>No data.</p>;

  return (
    <div style={{ overflowX: "auto" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          minWidth: 440,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 60px 60px 60px minmax(80px,auto) 80px",
            gap: 8,
            padding: "6px 10px",
            fontSize: 10,
            fontWeight: 700,
            color: "var(--text-3)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          <span>Strategy</span>
          <span style={{ textAlign: "center" }}>Trades</span>
          <span style={{ textAlign: "center" }}>Win%</span>
          <span style={{ textAlign: "center" }}>Avg R</span>
          <span style={{ textAlign: "right" }}>PnL</span>
          <span />
        </div>
        {data.map((d) => (
          <div
            key={d.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 60px 60px 60px minmax(80px,auto) 80px",
              gap: 8,
              padding: "10px 10px",
              fontSize: 13,
              borderRadius: 8,
              background: "var(--surface-2)",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontWeight: 600,
                color: "var(--text)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {d.name}
            </span>
            <span
              style={{
                textAlign: "center",
                color: "var(--text-2)",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {d.count}
            </span>
            <span
              style={{
                textAlign: "center",
                fontFamily: "JetBrains Mono, monospace",
                color: d.wr >= 50 ? "var(--green)" : "var(--red)",
                fontWeight: 600,
              }}
            >
              {d.wr}%
            </span>
            <span
              style={{
                textAlign: "center",
                fontFamily: "JetBrains Mono, monospace",
                color:
                  d.avgR == null
                    ? "var(--text-3)"
                    : d.avgR > 0
                      ? "var(--green)"
                      : "var(--red)",
                fontWeight: 600,
              }}
            >
              {d.avgR == null
                ? "—"
                : `${d.avgR > 0 ? "+" : ""}${d.avgR.toFixed(1)}R`}
            </span>
            <span
              style={{
                textAlign: "right",
                fontFamily: "JetBrains Mono, monospace",
                fontWeight: 700,
                color:
                  d.pnl > 0
                    ? "var(--green)"
                    : d.pnl < 0
                      ? "var(--red)"
                      : "var(--text-2)",
                whiteSpace: "nowrap",
              }}
            >
              {d.pnl >= 0 ? "+" : ""}₹{fmt(d.pnl)}
            </span>
            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: "var(--border)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${d.wr}%`,
                  background: d.wr >= 50 ? "var(--green)" : "var(--red)",
                  borderRadius: 3,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ wins, losses }) {
  const total = wins + losses;
  if (!total)
    return <p style={{ color: "var(--text-3)", fontSize: 13 }}>No data.</p>;
  const wr = Math.round((wins / total) * 100);
  const R = 70,
    stroke = 18;
  const circ = 2 * Math.PI * R;
  const winArc = (wins / total) * circ;
  const lossArc = (losses / total) * circ;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
      }}
    >
      <div style={{ position: "relative", width: 180, height: 180 }}>
        <svg
          viewBox="0 0 180 180"
          style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}
        >
          {/* Loss arc (full circle background) */}
          <circle
            cx="90"
            cy="90"
            r={R}
            fill="none"
            stroke="#ef4444"
            strokeWidth={stroke}
          />
          {/* Win arc */}
          <circle
            cx="90"
            cy="90"
            r={R}
            fill="none"
            stroke="var(--green)"
            strokeWidth={stroke}
            strokeDasharray={`${winArc} ${circ}`}
            strokeLinecap="butt"
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 26, fontWeight: 700, color: "var(--text)" }}>
            {wr}%
          </span>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-3)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            WIN RATE
          </span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 20 }}>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--text-2)",
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "var(--green)",
              display: "inline-block",
            }}
          />
          Wins ({wins})
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--text-2)",
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#ef4444",
              display: "inline-block",
            }}
          />
          Losses ({losses})
        </span>
      </div>
    </div>
  );
}

function PnlByStrategy({ trades, strats }) {
  const data = strats
    .map((st) => ({
      name: st.name,
      pnl: trades
        .filter((t) => t.strategyId === st.id)
        .reduce((a, t) => a + (t.pnl || 0), 0),
    }))
    .filter((d) => d.pnl !== 0);

  if (!data.length)
    return <p style={{ color: "var(--text-3)", fontSize: 13 }}>No data.</p>;

  const maxAbs = Math.max(...data.map((d) => Math.abs(d.pnl)));
  const BAR_H = 28;
  const GAP = 16;
  const LABEL_W = 120; // left label column
  const PAD_R = 8; // right padding inside chart area
  const VAL_W = 72; // right value label column
  const W = 480;
  const chartW = W - LABEL_W - PAD_R - VAL_W;
  const zeroX = LABEL_W + chartW / 2;
  const H = data.length * (BAR_H + GAP) + 32;

  // Only show 3 tick labels: left, center (0), right — avoids edge overflow
  const ticks = [-maxAbs, 0, maxAbs];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: "auto", overflow: "visible" }}
    >
      {/* Grid lines + bottom tick labels */}
      {ticks.map((v, i) => {
        const x = LABEL_W + ((v + maxAbs) / (2 * maxAbs)) * chartW;
        return (
          <g key={i}>
            <line
              x1={x}
              y1={0}
              x2={x}
              y2={H - 20}
              stroke="var(--border)"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
            <text
              x={x}
              y={H - 4}
              textAnchor="middle"
              fontSize="10"
              fill="var(--text-3)"
            >
              {v === 0 ? "0" : `₹${fmt(v)}`}
            </text>
          </g>
        );
      })}

      {data.map((d, i) => {
        const y = i * (BAR_H + GAP) + 6;
        const barW = Math.max((Math.abs(d.pnl) / maxAbs) * (chartW / 2), 2);
        const x = d.pnl >= 0 ? zeroX : zeroX - barW;
        const isPos = d.pnl >= 0;
        const label = d.name.length > 14 ? d.name.slice(0, 13) + "…" : d.name;

        return (
          <g key={d.name}>
            <text
              x={LABEL_W - 8}
              y={y + BAR_H / 2 + 4}
              textAnchor="end"
              fontSize="11"
              fill="var(--text-3)"
            >
              {label}
            </text>
            <rect
              x={x}
              y={y}
              width={barW}
              height={BAR_H}
              rx="4"
              fill={isPos ? "var(--green)" : "var(--red)"}
              opacity="0.85"
            />
            <text
              x={LABEL_W + chartW + PAD_R + 4}
              y={y + BAR_H / 2 + 4}
              textAnchor="start"
              fontSize="11"
              fontWeight="600"
              fill={isPos ? "var(--green)" : "var(--red)"}
            >
              {isPos ? "+" : "-"}₹{fmt(Math.abs(d.pnl))}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function WeekdayPerformance({ trades }) {
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const data = useMemo(
    () =>
      DAYS.map((label, di) => {
        const ts = trades.filter(
          (t) => t.date && new Date(t.date + "T00:00:00").getDay() === di,
        );
        const pnl = ts.reduce((a, t) => a + (t.pnl || 0), 0);
        const wins = ts.filter((t) => t.outcome === "win").length;
        return { label, count: ts.length, pnl, wins };
      }),
    [trades],
  );

  const maxAbs = Math.max(...data.map((d) => Math.abs(d.pnl)), 1);

  return (
    <div style={{ display: "flex", gap: 8 }}>
      {data.map((d) => {
        const barH = d.count ? Math.round((Math.abs(d.pnl) / maxAbs) * 80) : 4;
        const isPos = d.pnl >= 0;
        return (
          <div
            key={d.label}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: d.count
                  ? isPos
                    ? "var(--green)"
                    : "var(--red)"
                  : "var(--text-3)",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {d.count
                ? `${isPos ? "+" : ""}${Math.round(d.pnl / 1000)}k`
                : "—"}
            </span>
            <div
              style={{
                width: "100%",
                height: 88,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "70%",
                  height: barH,
                  borderRadius: 4,
                  background: d.count
                    ? isPos
                      ? "var(--green)"
                      : "var(--red)"
                    : "var(--border)",
                  opacity: 0.8,
                }}
              />
            </div>
            <span
              style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}
            >
              {d.label}
            </span>
            <span style={{ fontSize: 10, color: "var(--text-3)" }}>
              {d.count} trades
            </span>
          </div>
        );
      })}
    </div>
  );
}

function VariantPerformance({ trades, strats }) {
  const data = useMemo(() => {
    const map = {};
    for (const t of trades) {
      if (!t.variant) continue;
      const st = strats.find((s) => s.id === t.strategyId);
      const key = `${st?.name ?? "?"} · ${t.variant.toUpperCase()}`;
      if (!map[key]) map[key] = { label: key, count: 0, wins: 0, pnl: 0 };
      map[key].count++;
      if (t.outcome === "win") map[key].wins++;
      map[key].pnl += t.pnl || 0;
    }
    return Object.values(map).sort((a, b) => b.pnl - a.pnl);
  }, [trades, strats]);

  if (!data.length)
    return (
      <p style={{ color: "var(--text-3)", fontSize: 13 }}>
        No variant data. Tag trades with CE/PE/etc. when logging.
      </p>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {data.map((d) => {
        const wr = d.count ? Math.round((d.wins / d.count) * 100) : 0;
        return (
          <div
            key={d.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              background: "var(--surface-2)",
              borderRadius: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                flex: "1 1 120px",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text)",
                minWidth: 0,
              }}
            >
              {d.label}
            </span>
            <div
              style={{
                display: "flex",
                gap: 12,
                flexShrink: 0,
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
                {d.count} trades
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: wr >= 50 ? "var(--green)" : "var(--red)",
                  fontFamily: "JetBrains Mono, monospace",
                  minWidth: 36,
                  textAlign: "right",
                }}
              >
                {wr}%
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: d.pnl >= 0 ? "var(--green)" : "var(--red)",
                  fontFamily: "JetBrains Mono, monospace",
                  minWidth: 72,
                  textAlign: "right",
                }}
              >
                {d.pnl >= 0 ? "+" : ""}₹{fmt(d.pnl)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function StatsView({
  trades,
  strats,
  totalInvestment,
  onSaveTotalInvestment,
}) {
  const [mockFilter, setMockFilter] = useState("all");
  const [corpusInput, setCorpusInput] = useState(totalInvestment ?? "");
  const [editingCorpus, setEditingCorpus] = useState(false);
  const [savingCorpus, setSavingCorpus] = useState(false);

  const corpusValue = parseFloat(totalInvestment) || null;

  const filteredTrades = trades.filter((t) => {
    if (mockFilter === "mock") return !!t.mock;
    if (mockFilter === "real") return !t.mock;
    return true;
  });

  if (!filteredTrades.length)
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <MockToggle value={mockFilter} onChange={setMockFilter} />
        </div>
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
            : "No trades match this filter."}
        </div>
      </div>
    );

  const wins = filteredTrades.filter((t) => t.outcome === "win").length;
  const losses = filteredTrades.filter((t) => t.outcome === "loss").length;
  const totalPnl = filteredTrades.reduce((a, t) => a + (t.pnl || 0), 0);
  const totalComm = filteredTrades.reduce((a, t) => a + (t.commission || 0), 0);
  const netPnl = totalPnl - totalComm;

  // Portfolio gain % = net P&L / investment corpus (user-defined)
  const portfolioGainPct =
    corpusValue != null && corpusValue > 0
      ? (netPnl / corpusValue) * 100
      : null;
  const wr = filteredTrades.length
    ? ((wins / filteredTrades.length) * 100).toFixed(1)
    : "0";
  const avgWin = wins
    ? filteredTrades
        .filter((t) => t.outcome === "win")
        .reduce((a, t) => a + (t.pnl || 0), 0) / wins
    : 0;
  const avgLoss = losses
    ? Math.abs(
        filteredTrades
          .filter((t) => t.outcome === "loss")
          .reduce((a, t) => a + (t.pnl || 0), 0) / losses,
      )
    : 0;
  const pf =
    avgLoss > 0 ? ((avgWin * wins) / (avgLoss * losses)).toFixed(2) : "—";
  const largestW = Math.max(
    ...filteredTrades.filter((t) => t.pnl > 0).map((t) => t.pnl),
    0,
  );
  const largestL = Math.min(
    ...filteredTrades.filter((t) => t.pnl < 0).map((t) => t.pnl),
    0,
  );

  // Max drawdown from equity curve
  const sorted = [...filteredTrades].sort(
    (a, b) => new Date(a.date) - new Date(b.date),
  );
  let runPeak = 0,
    maxDD = 0,
    equity = 0;
  for (const t of sorted) {
    equity += t.pnl || 0;
    if (equity > runPeak) runPeak = equity;
    const dd = runPeak - equity;
    if (dd > maxDD) maxDD = dd;
  }

  // Streaks
  const outcomeSeq = sorted.map((t) => t.outcome);
  let curStreak = 0,
    curStreakType = null,
    maxWStreak = 0,
    maxLStreak = 0;
  let tempW = 0,
    tempL = 0;
  for (const o of outcomeSeq) {
    if (o === "win") {
      tempW++;
      tempL = 0;
      if (tempW > maxWStreak) maxWStreak = tempW;
    }
    if (o === "loss") {
      tempL++;
      tempW = 0;
      if (tempL > maxLStreak) maxLStreak = tempL;
    }
  }
  // Current streak (from end)
  if (outcomeSeq.length) {
    const last = outcomeSeq[outcomeSeq.length - 1];
    for (let i = outcomeSeq.length - 1; i >= 0; i--) {
      if (outcomeSeq[i] === last) curStreak++;
      else break;
    }
    curStreakType = last;
  }

  // R-based expectancy: (Win% × Avg Win R) - (Loss% × Avg Loss R)
  const rTrades = filteredTrades.filter((t) => t.rMult != null);
  const rWins = rTrades.filter((t) => t.rMult > 0);
  const rLosses = rTrades.filter((t) => t.rMult < 0);
  const avgWinR = rWins.length
    ? rWins.reduce((a, t) => a + t.rMult, 0) / rWins.length
    : null;
  const avgLossR = rLosses.length
    ? Math.abs(rLosses.reduce((a, t) => a + t.rMult, 0) / rLosses.length)
    : null;
  const wrFrac = rTrades.length ? rWins.length / rTrades.length : null;
  const rExpectancy =
    avgWinR != null && avgLossR != null && wrFrac != null
      ? parseFloat((wrFrac * avgWinR - (1 - wrFrac) * avgLossR).toFixed(2))
      : null;

  const pnlColor = totalPnl >= 0 ? "var(--green)" : "var(--red)";
  const netColor = netPnl >= 0 ? "var(--green)" : "var(--red)";

  const handleSaveCorpus = async () => {
    setSavingCorpus(true);
    try {
      await onSaveTotalInvestment?.(corpusInput);
      setEditingCorpus(false);
    } finally {
      setSavingCorpus(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header: corpus editor + mock toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        {/* Investment corpus */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 500 }}
          >
            Investment corpus:
          </span>
          {editingCorpus ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, color: "var(--text-3)" }}>₹</span>
              <input
                type="number"
                min="0"
                value={corpusInput}
                onChange={(e) => setCorpusInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveCorpus();
                  if (e.key === "Escape") setEditingCorpus(false);
                }}
                autoFocus
                style={{
                  width: 130,
                  padding: "5px 8px",
                  borderRadius: 6,
                  border: "1px solid var(--green)",
                  background: "var(--surface)",
                  color: "var(--text)",
                  fontSize: 13,
                  fontFamily: "JetBrains Mono, monospace",
                  outline: "none",
                }}
              />
              <button
                onClick={handleSaveCorpus}
                disabled={savingCorpus}
                style={{
                  padding: "5px 12px",
                  borderRadius: 6,
                  border: "none",
                  background: "var(--green)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {savingCorpus ? "…" : "Save"}
              </button>
              <button
                onClick={() => setEditingCorpus(false)}
                style={{
                  padding: "5px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: "none",
                  color: "var(--text-2)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setCorpusInput(totalInvestment ?? "");
                setEditingCorpus(true);
              }}
              style={{
                padding: "5px 12px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "var(--surface-2)",
                color: corpusValue ? "var(--text)" : "var(--text-3)",
                fontSize: 13,
                fontFamily: corpusValue
                  ? "JetBrains Mono, monospace"
                  : "Inter, sans-serif",
                cursor: "pointer",
                fontWeight: corpusValue ? 600 : 400,
              }}
            >
              {corpusValue ? `₹${fmt(corpusValue)}` : "+ Set corpus"}
            </button>
          )}
        </div>
        <MockToggle value={mockFilter} onChange={setMockFilter} />
      </div>

      {/* Summary cards row 1 */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <SummaryCard
          label="Gross P&L"
          value={`${totalPnl >= 0 ? "+" : ""}₹${fmt(totalPnl)}`}
          accent={pnlColor}
        />
        {totalComm > 0 && (
          <SummaryCard
            label="Net P&L (after commission)"
            value={`${netPnl >= 0 ? "+" : ""}₹${fmt(netPnl)}`}
            accent={netColor}
          />
        )}
        {portfolioGainPct != null && (
          <SummaryCard
            label={`Portfolio Return (on ₹${fmt(corpusValue)})`}
            value={`${portfolioGainPct >= 0 ? "+" : ""}${portfolioGainPct.toFixed(2)}%`}
            accent={portfolioGainPct >= 0 ? "var(--green)" : "var(--red)"}
          />
        )}
        <SummaryCard label="Win Rate" value={`${wr}%`} />
        <SummaryCard label="Profit Factor" value={pf} />
        <SummaryCard
          label="R Expectancy"
          value={
            rExpectancy == null
              ? "—"
              : `${rExpectancy > 0 ? "+" : ""}${rExpectancy}R`
          }
          accent={
            rExpectancy == null
              ? undefined
              : rExpectancy > 0
                ? "var(--green)"
                : "var(--red)"
          }
        />
        <SummaryCard label="Total Trades" value={filteredTrades.length} />
      </div>

      {/* Summary cards row 2: drawdown + streaks */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <SummaryCard
          label="Max Drawdown"
          value={maxDD > 0 ? `-₹${fmt(maxDD)}` : "—"}
          accent={maxDD > 0 ? "var(--red)" : undefined}
        />
        <SummaryCard
          label="Current Streak"
          value={
            curStreak
              ? `${curStreak}× ${curStreakType === "win" ? "🟢" : "🔴"}`
              : "—"
          }
          accent={
            curStreakType === "win"
              ? "var(--green)"
              : curStreakType === "loss"
                ? "var(--red)"
                : undefined
          }
        />
        <SummaryCard
          label="Best Win Streak"
          value={maxWStreak ? `${maxWStreak}W` : "—"}
          accent="var(--green)"
        />
        <SummaryCard
          label="Worst Loss Streak"
          value={maxLStreak ? `${maxLStreak}L` : "—"}
          accent="var(--red)"
        />
        {totalComm > 0 && (
          <SummaryCard
            label="Total Commission"
            value={`-₹${fmt(totalComm)}`}
            accent="var(--text-3)"
          />
        )}
      </div>

      {/* Equity curve + Donut */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
          gap: 16,
        }}
      >
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 24,
          }}
        >
          <h3
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--text)",
              margin: "0 0 20px",
            }}
          >
            Equity Curve{" "}
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "var(--text-3)",
                marginLeft: 6,
              }}
            >
              — red shading = drawdown
            </span>
          </h3>
          <EquityCurve trades={filteredTrades} />
        </div>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <h3
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--text)",
              margin: "0 0 24px",
              alignSelf: "flex-start",
            }}
          >
            Win / Loss Ratio
          </h3>
          <DonutChart wins={wins} losses={losses} />
        </div>
      </div>

      {/* Calendar heatmap */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 24,
        }}
      >
        <h3
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "var(--text)",
            margin: "0 0 16px",
          }}
        >
          Daily P&amp;L Calendar
        </h3>
        <CalendarHeatmap trades={filteredTrades} />
        <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
          {[
            ["Loss day", "rgba(220,38,38,0.7)"],
            ["Flat", "var(--border)"],
            ["Profit day", "rgba(45,122,95,0.7)"],
          ].map(([l, c]) => (
            <span
              key={l}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                color: "var(--text-3)",
              }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  background: c,
                  display: "inline-block",
                }}
              />
              {l}
            </span>
          ))}
        </div>
      </div>

      {/* Weekday performance */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 24,
        }}
      >
        <h3
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "var(--text)",
            margin: "0 0 20px",
          }}
        >
          Performance by Day of Week
        </h3>
        <WeekdayPerformance trades={filteredTrades} />
      </div>

      {/* PnL by Strategy + Advanced Metrics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
          gap: 16,
        }}
      >
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 24,
          }}
        >
          <h3
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--text)",
              margin: "0 0 20px",
            }}
          >
            P&amp;L by Strategy
          </h3>
          <PnlByStrategy trades={filteredTrades} strats={strats} />
        </div>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 24,
          }}
        >
          <h3
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--text)",
              margin: "0 0 20px",
            }}
          >
            Advanced Metrics
          </h3>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {[
              {
                label: "Average Win",
                value: `₹${fmt(avgWin)}`,
                color: "var(--green)",
              },
              {
                label: "Average Loss",
                value: `-₹${fmt(avgLoss)}`,
                color: "var(--red)",
              },
              {
                label: "Largest Win",
                value: `₹${fmt(largestW)}`,
                color: "var(--green)",
              },
              {
                label: "Largest Loss",
                value: `-₹${fmt(Math.abs(largestL))}`,
                color: "var(--red)",
              },
              {
                label: "Avg Win R",
                value: avgWinR != null ? `+${avgWinR.toFixed(1)}R` : "—",
                color: "var(--green)",
              },
              {
                label: "Avg Loss R",
                value: avgLossR != null ? `-${avgLossR.toFixed(1)}R` : "—",
                color: "var(--red)",
              },
            ].map(({ label, value, color }, i, arr) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 0",
                  borderBottom:
                    i < arr.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <span style={{ fontSize: 13, color: "var(--text-2)" }}>
                  {label}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color,
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Per-strategy performance table */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 24,
        }}
      >
        <h3
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "var(--text)",
            margin: "0 0 16px",
          }}
        >
          Strategy Performance
        </h3>
        <StrategyPerformance trades={filteredTrades} strats={strats} />
      </div>

      {/* Variant breakdown */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 24,
        }}
      >
        <h3
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "var(--text)",
            margin: "0 0 16px",
          }}
        >
          Variant Breakdown (CE / PE / etc.)
        </h3>
        <VariantPerformance trades={filteredTrades} strats={strats} />
      </div>
    </div>
  );
}
