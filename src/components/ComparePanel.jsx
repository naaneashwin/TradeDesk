import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const INDEX_COLORS = {
  portfolio: "#3b82f6",
  nifty50: "#f59e0b",
  nifty500: "#a855f7",
};

const METRIC_DEFS = [
  { key: "totalReturn", label: "Total Return %", tip: "Total return from daily NAV series." },
  { key: "cagr", label: "CAGR %", tip: "Annualized compounded growth rate." },
  { key: "maxDrawdown", label: "Max Drawdown %", tip: "Largest peak-to-trough decline." },
  { key: "volatility", label: "Volatility (Std Dev)", tip: "Annualized standard deviation of daily returns." },
  { key: "sharpe", label: "Sharpe Ratio", tip: "Risk-adjusted return using 7% annual risk-free rate." },
  { key: "sortino", label: "Sortino Ratio", tip: "Risk-adjusted return penalizing downside volatility only." },
  { key: "calmar", label: "Calmar Ratio", tip: "CAGR divided by absolute max drawdown." },
  { key: "bestMonth", label: "Best Month", tip: "Highest monthly return in range." },
  { key: "worstMonth", label: "Worst Month", tip: "Lowest monthly return in range." },
  { key: "winRate", label: "Win Rate %", tip: "Percent of profitable trades. Portfolio only." },
];

const HELP_CONTENT = {
  overview: {
    title: "Portfolio vs Market",
    body: "This screen compares your real-trade portfolio performance against Nifty 50 and Nifty 500 for the selected date range. Blue is your portfolio, orange is Nifty 50, and purple is Nifty 500. NAV is built on trading days; for historical in-trade MTM path where daily symbol closes are unavailable, PnL is distributed across the trade life and settled at close.",
  },
  summary: {
    title: "Summary Stats",
    body: "A quick scorecard of return and risk metrics across portfolio and benchmarks. All metrics are now derived from one daily NAV-based stream.",
  },
  normalized: {
    title: "Normalized Performance (Base 100)",
    body: "All curves start at 100 on the first date. A value of 125 means +25% since start. This makes different assets directly comparable.",
  },
  heatmap: {
    title: "Monthly Returns Heatmap",
    body: "Each cell is a monthly return percentage. Green is positive, red is negative. Click a month to filter the trade table.",
  },
  drawdown: {
    title: "Drawdown",
    body: "Drawdown measures decline from the previous peak. More negative values mean deeper losses from highs.",
  },
  rolling: {
    title: "Rolling Returns",
    body: "Shows return over moving windows (1M/3M/6M/1Y) to reveal consistency over time, not just start-to-end result.",
  },
  riskReturn: {
    title: "Risk vs Return",
    body: "X-axis is volatility (risk), Y-axis is return. Better risk-adjusted behavior tends toward higher return and lower volatility.",
  },
  alphaBeta: {
    title: "Alpha and Beta",
    body: "Alpha/Beta here are calculated using corpus-based daily returns (net daily PnL divided by your total corpus), then compared with benchmark daily returns. This keeps them aligned with portfolio-level performance.",
  },
  outperformance: {
    title: "Outperformance Timeline",
    body: "Monthly alpha bars = Portfolio monthly return minus benchmark monthly return. Green beat benchmark, red underperformed.",
  },
  trades: {
    title: "Trade Breakdown",
    body: "These are the trades used in calculations for the chosen period. LIVE trades include unrealized PnL based on current market price.",
  },
};

const METRIC_HELP = {
  totalReturn: "Total Return % = ((Ending NAV / Starting NAV) - 1) × 100",
  cagr: "CAGR % = ((Ending Value / Starting Value)^(1/Years) - 1) × 100",
  maxDrawdown: "Largest peak-to-trough decline during the period.",
  volatility: "Annualized volatility = Sample StdDev(daily returns) × sqrt(252)",
  sharpe: "Sharpe = Mean excess daily return (over 7% annual Rf) / StdDev excess return × sqrt(252)",
  sortino: "Sortino = Mean excess daily return / Downside deviation × sqrt(252)",
  calmar: "Calmar = CAGR / |Max Drawdown|",
  bestMonth: "Highest monthly return in the selected range.",
  worstMonth: "Lowest monthly return in the selected range.",
  winRate: "Win Rate % = Winning trades / Total trades × 100 (portfolio only)",
};

const ROLLING_WINDOWS = {
  "1M": 21,
  "3M": 63,
  "6M": 126,
  "1Y": 252,
};

const RISK_FREE_ANNUAL = 0.07;

function isTradingDay(dateLike) {
  const d = new Date(dateLike);
  const day = d.getDay();
  return day !== 0 && day !== 6;
}

function getTradingDays(startDate, endDate) {
  const out = [];
  const cur = new Date(startDate);
  const end = new Date(endDate);
  while (cur <= end) {
    if (isTradingDay(cur)) out.push(toISODate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function toISODate(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function fmtNum(v, digits = 2) {
  if (v == null || Number.isNaN(v) || !Number.isFinite(v)) return "-";
  return Number(v).toFixed(digits);
}

function fmtPct(v, digits = 2) {
  if (v == null || Number.isNaN(v) || !Number.isFinite(v)) return "-";
  return `${v > 0 ? "+" : ""}${Number(v).toFixed(digits)}%`;
}

function fmtDate(d) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function monthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function dayDiff(a, b) {
  const d1 = new Date(a);
  const d2 = new Date(b);
  return Math.max(0, Math.round((d2 - d1) / (24 * 60 * 60 * 1000)));
}

function getTradeCloseDate(trade) {
  const exitDates = (trade.exits || [])
    .map((e) => e.exitDate)
    .filter(Boolean)
    .sort();
  if (exitDates.length) return exitDates[exitDates.length - 1];
  return trade.exitDate || trade.date;
}

function getNotional(trade) {
  return Math.abs((trade.entryPrice || 0) * (trade.qty || 0));
}

function getSeriesMetrics(points, dailyReturns, winRate = null, monthlyReturns = []) {
  if (!points.length) {
    return {
      totalReturn: null,
      cagr: null,
      maxDrawdown: null,
      volatility: null,
      sharpe: null,
      sortino: null,
      calmar: null,
      bestMonth: null,
      worstMonth: null,
      winRate,
    };
  }

  const first = points[0].value;
  const last = points[points.length - 1].value;
  const totalReturn = first > 0 ? ((last - first) / first) * 100 : null;

  const years = Math.max(
    0,
    (new Date(points[points.length - 1].date) - new Date(points[0].date)) /
      (365.25 * 24 * 60 * 60 * 1000),
  );
  const cagr = years >= (30 / 365.25) && first > 0 && last > 0 ? (Math.pow(last / first, 1 / years) - 1) * 100 : null;

  let peak = -Infinity;
  let maxDrawdown = 0;
  for (const p of points) {
    peak = Math.max(peak, p.value);
    if (peak > 0) {
      const dd = ((p.value - peak) / peak) * 100;
      if (dd < maxDrawdown) maxDrawdown = dd;
    }
  }

  const mean = dailyReturns.length
    ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length
    : 0;
  const variance = dailyReturns.length > 1
    ? dailyReturns.reduce((a, r) => a + (r - mean) * (r - mean), 0) / (dailyReturns.length - 1)
    : 0;
  const std = Math.sqrt(Math.max(variance, 0));
  const volatility = dailyReturns.length >= 20 ? std * Math.sqrt(252) * 100 : null;

  const dailyRf = RISK_FREE_ANNUAL / 252;
  const excessReturns = dailyReturns.map((r) => r - dailyRf);
  const excessMean = excessReturns.length
    ? excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length
    : 0;
  const excessVar = excessReturns.length > 1
    ? excessReturns.reduce((a, r) => a + (r - excessMean) * (r - excessMean), 0) / (excessReturns.length - 1)
    : 0;
  const excessStd = Math.sqrt(Math.max(excessVar, 0));
  const sharpe = dailyReturns.length >= 30 && excessStd > 0 ? (excessMean / excessStd) * Math.sqrt(252) : null;

  const downside = excessReturns.filter((r) => r < 0);
  const downsideVar = excessReturns.length
    ? downside.reduce((a, r) => a + r * r, 0) / excessReturns.length
    : 0;
  const downsideDev = Math.sqrt(Math.max(downsideVar, 0));
  const sortino = dailyReturns.length >= 30 && downsideDev > 0 ? (excessMean / downsideDev) * Math.sqrt(252) : null;
  const calmar = cagr != null && maxDrawdown < 0 ? cagr / Math.abs(maxDrawdown) : null;

  const bestMonth = monthlyReturns.length
    ? monthlyReturns.reduce((best, cur) => (cur.returnPct > best.returnPct ? cur : best), monthlyReturns[0])
    : null;
  const worstMonth = monthlyReturns.length
    ? monthlyReturns.reduce((worst, cur) => (cur.returnPct < worst.returnPct ? cur : worst), monthlyReturns[0])
    : null;

  return {
    totalReturn,
    cagr,
    maxDrawdown,
    volatility,
    sharpe,
    sortino,
    calmar,
    bestMonth,
    worstMonth,
    winRate,
  };
}

function buildMonthlyReturns(points) {
  if (!points.length) return [];
  const byMonth = new Map();
  for (const p of points) {
    const key = monthKey(p.date);
    byMonth.set(key, p);
  }
  const months = [...byMonth.keys()].sort();
  const out = [];
  for (let i = 1; i < months.length; i += 1) {
    const prev = byMonth.get(months[i - 1]);
    const cur = byMonth.get(months[i]);
    const ret = prev?.value > 0 ? ((cur.value - prev.value) / prev.value) * 100 : null;
    out.push({ month: months[i], returnPct: ret });
  }
  return out;
}

function downsampleSeries(series, mode) {
  if (mode === "daily") return series;
  const grouped = new Map();
  for (const p of series) {
    const d = new Date(p.date);
    const key =
      mode === "weekly"
        ? `${d.getFullYear()}-W${String(Math.ceil((d.getDate() + ((new Date(d.getFullYear(), d.getMonth(), 1).getDay() + 6) % 7)) / 7)).padStart(2, "0")}`
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    grouped.set(key, p);
  }
  return [...grouped.values()];
}

function buildDrawdownSeries(points) {
  let peak = -Infinity;
  let maxDrawdown = 0;
  let maxDate = null;
  const series = points.map((p) => {
    peak = Math.max(peak, p.value);
    const drawdown = peak > 0 ? ((p.value - peak) / peak) * 100 : 0;
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown;
      maxDate = p.date;
    }
    return { date: p.date, drawdown };
  });
  return { series, maxDrawdown, maxDate };
}

function correlationStats(portReturns, benchmarkReturns) {
  const pairs = [];
  for (let i = 0; i < portReturns.length; i += 1) {
    const p = portReturns[i];
    const b = benchmarkReturns[i];
    if (p == null || b == null || !Number.isFinite(p) || !Number.isFinite(b)) continue;
    pairs.push([p, b]);
  }
  if (pairs.length < 30) {
    return { alpha: null, beta: null, correlation: null, informationRatio: null, treynor: null };
  }

  const pMean = pairs.reduce((a, x) => a + x[0], 0) / pairs.length;
  const bMean = pairs.reduce((a, x) => a + x[1], 0) / pairs.length;

  let cov = 0;
  let varB = 0;
  let varP = 0;
  let trackingVar = 0;
  for (const [p, b] of pairs) {
    cov += (p - pMean) * (b - bMean);
    varB += (b - bMean) ** 2;
    varP += (p - pMean) ** 2;
    trackingVar += (p - b) ** 2;
  }

  cov /= (pairs.length - 1);
  varB /= (pairs.length - 1);
  varP /= (pairs.length - 1);

  const active = pairs.map(([p, b]) => p - b);
  const activeMean = active.reduce((a, x) => a + x, 0) / active.length;
  trackingVar = active.reduce((a, x) => a + (x - activeMean) ** 2, 0) / (active.length - 1);

  const beta = varB > 0 ? cov / varB : null;
  const correlation = varB > 0 && varP > 0 ? cov / Math.sqrt(varB * varP) : null;
  const annualPort = pMean * 252;
  const annualBench = bMean * 252;
  const alpha = beta != null
    ? (annualPort - (RISK_FREE_ANNUAL + beta * (annualBench - RISK_FREE_ANNUAL))) * 100
    : null;
  const info = trackingVar > 0 ? ((activeMean * 252) / (Math.sqrt(trackingVar) * Math.sqrt(252))) : null;
  const treynor = beta != null && beta !== 0 ? ((annualPort - RISK_FREE_ANNUAL) / beta) * 100 : null;

  return { alpha, beta, correlation, informationRatio: info, treynor };
}

function buildPortfolioNavSeries({
  trades,
  startDate,
  endDate,
  includeOngoing,
  livePrices,
  baseCapital,
}) {
  const tradingDays = getTradingDays(startDate, endDate);
  const today = toISODate(new Date());
  const dailyDelta = new Map(tradingDays.map((d) => [d, 0]));

  for (const t of trades) {
    if (t.outcome === "open" && !includeOngoing) continue;

    const entry = toISODate(t.date);
    const close = t.outcome === "open" ? today : (getTradeCloseDate(t) || t.date);
    if (!entry || !close) continue;
    if (close < startDate || entry > endDate) continue;

    const fullDays = getTradingDays(entry, close);
    if (!fullDays.length) continue;

    const start = entry > startDate ? entry : startDate;
    const end = close < endDate ? close : endDate;
    const overlap = fullDays.filter((d) => d >= start && d <= end);
    if (!overlap.length) continue;

    const grossPnl = (() => {
      if (t.outcome !== "open") return Number(t.pnl || 0);
      const sym = (t.instrument || "").toUpperCase();
      const ltp = Number(livePrices[sym]?.ltp ?? t.entryPrice ?? 0);
      const exitedQty = (t.exits || []).reduce((s, e) => s + (Number(e.qty) || 0), 0);
      const remQty = Math.max(0, (Number(t.qty) || 0) - exitedQty);
      const realized = Number(t.pnl || 0);
      const unrealized = (ltp - Number(t.entryPrice || 0)) * remQty * (t.direction === "short" ? -1 : 1);
      return realized + unrealized;
    })();

    const commission = Number(t.commission || 0);
    const n = fullDays.length;
    const levelAt = (idx) => {
      if (n <= 1) return grossPnl;
      return grossPnl * (idx / (n - 1));
    };

    for (const day of overlap) {
      const idx = fullDays.indexOf(day);
      if (idx < 0) continue;
      const prevLevel = idx > 0 ? levelAt(idx - 1) : 0;
      const level = levelAt(idx);
      let delta = level - prevLevel;
      if (day === close) delta -= commission;
      dailyDelta.set(day, (dailyDelta.get(day) || 0) + delta);
    }
  }

  const navPoints = [];
  const dailyReturns = [];
  let nav = baseCapital;
  for (const d of tradingDays) {
    const prev = nav;
    nav += dailyDelta.get(d) || 0;
    const ret = prev > 0 ? (nav - prev) / prev : 0;
    navPoints.push({ date: d, value: nav });
    dailyReturns.push(ret);
  }

  return { tradingDays, navPoints, dailyReturns };
}

function buildBenchmarkSeries(indexRows, alignedDates) {
  const closeMap = new Map(indexRows.map((d) => [d.date, Number(d.close || 0)]));
  const points = [];
  const dailyReturns = [];

  let first = null;
  let prev = null;
  let value = 100;
  for (const date of alignedDates) {
    const close = closeMap.get(date);
    if (!(close > 0)) continue;
    if (first == null) {
      first = close;
      prev = close;
      value = 100;
      points.push({ date, value });
      dailyReturns.push(0);
      continue;
    }
    const ret = prev > 0 ? (close - prev) / prev : 0;
    value *= 1 + ret;
    points.push({ date, value });
    dailyReturns.push(ret);
    prev = close;
  }

  return { points, dailyReturns };
}

function metricColor(portValue, benchmarkValue) {
  if (portValue == null || benchmarkValue == null) return "var(--text)";
  return portValue >= benchmarkValue ? "var(--green)" : "var(--red)";
}

function heatColor(v) {
  if (v == null) return "var(--surface-2)";
  const x = Math.max(-8, Math.min(8, v));
  if (x >= 4) return "rgba(45,122,95,0.75)";
  if (x > 0) return "rgba(45,122,95,0.35)";
  if (x <= -4) return "rgba(220,38,38,0.75)";
  if (x < 0) return "rgba(220,38,38,0.35)";
  return "rgba(255,255,255,0.06)";
}

function getFallbackIndexSeries(startDate, endDate) {
  const points = [];
  const cur = new Date(startDate);
  const end = new Date(endDate);
  while (cur <= end) {
    points.push({ date: toISODate(cur), close: 100 });
    cur.setDate(cur.getDate() + 1);
  }
  return points;
}

function parseMetricValue(metric, data) {
  if (!data) return null;
  if (metric === "bestMonth" || metric === "worstMonth") return data[metric]?.returnPct ?? null;
  return data[metric] ?? null;
}

function labelMetricValue(metric, data) {
  if (!data) return "-";
  if (metric === "bestMonth" || metric === "worstMonth") {
    const m = data[metric];
    if (!m) return "Insufficient data";
    return `${m.month} (${fmtPct(m.returnPct)})`;
  }
  if (metric === "winRate" && data.winRate == null) return "-";
  if (data[metric] == null) return "Insufficient data";
  return ["sharpe", "sortino", "calmar"].includes(metric) ? fmtNum(data[metric]) : fmtPct(data[metric]);
}

export default function ComparePanel({ trades, totalInvestment }) {
  const [includeOngoing, setIncludeOngoing] = useState(false);
  const [livePrices, setLivePrices] = useState({});
  const [loadingLive, setLoadingLive] = useState(false);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [indexLoading, setIndexLoading] = useState(false);
  const [indexWarn, setIndexWarn] = useState("");
  const [indexData, setIndexData] = useState({ nifty50: [], nifty500: [] });
  const [granularity, setGranularity] = useState("daily");
  const [rollingPeriod, setRollingPeriod] = useState("3M");
  const [alphaTab, setAlphaTab] = useState("nifty50");
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [sortBy, setSortBy] = useState({ key: "date", dir: "desc" });
  const [helpKey, setHelpKey] = useState(null);
  const corpusValue = Number.parseFloat(totalInvestment) || null;

  const closedRealTrades = useMemo(
    () => trades.filter((t) => !t.mock && t.outcome !== "open"),
    [trades],
  );

  const ongoingRealTrades = useMemo(
    () => trades.filter((t) => !t.mock && t.outcome === "open"),
    [trades],
  );

  useEffect(() => {
    if (!closedRealTrades.length) return;
    if (dateStart && dateEnd) return;
    const dates = closedRealTrades.map((t) => getTradeCloseDate(t)).filter(Boolean).sort();
    if (!dates.length) return;
    setDateStart(dates[0]);
    setDateEnd(toISODate(new Date()));
  }, [closedRealTrades, dateStart, dateEnd]);

  useEffect(() => {
    if (!includeOngoing || !ongoingRealTrades.length) {
      setLoadingLive(false);
      return;
    }

    let cancelled = false;
    const symbols = [...new Set(ongoingRealTrades.map((t) => (t.instrument || "").toUpperCase()).filter(Boolean))];
    if (!symbols.length) return;

    const fetchLive = async () => {
      setLoadingLive(true);
      const next = {};
      await Promise.allSettled(
        symbols.map(async (sym) => {
          try {
            const res = await fetch(`/api/price?symbol=${encodeURIComponent(sym)}`);
            if (!res.ok) return;
            const data = await res.json();
            if (data?.ltp != null) next[sym] = data;
          } catch {
            // no-op per symbol
          }
        }),
      );
      if (!cancelled) {
        setLivePrices(next);
        setLoadingLive(false);
      }
    };

    fetchLive();
    const interval = setInterval(fetchLive, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [includeOngoing, ongoingRealTrades]);

  const comparisonTrades = useMemo(() => {
    const baseClosed = closedRealTrades.map((t) => {
      const closeDate = getTradeCloseDate(t) || t.date;
      const notional = getNotional(t);
      const pnl = Number(t.pnl || 0);
      const returnPct = notional > 0 ? (pnl / notional) * 100 : 0;
      return {
        id: t.id,
        date: closeDate,
        symbol: t.instrument,
        type: t.direction,
        entryPrice: Number(t.entryPrice || 0),
        exitPrice: Number(t.exitPrice || 0),
        pnl,
        returnPercent: returnPct,
        isOngoing: false,
        duration: dayDiff(t.date, closeDate),
      };
    });

    if (!includeOngoing) return baseClosed;

    const today = toISODate(new Date());
    const openMapped = ongoingRealTrades.map((t) => {
      const sym = (t.instrument || "").toUpperCase();
      const live = livePrices[sym];
      const ltp = Number(live?.ltp ?? t.entryPrice ?? 0);
      const exitedQty = (t.exits || []).reduce((s, e) => s + (Number(e.qty) || 0), 0);
      const remQty = Math.max(0, (Number(t.qty) || 0) - exitedQty);
      const realized = Number(t.pnl || 0);
      const unrealized = (ltp - Number(t.entryPrice || 0)) * remQty * (t.direction === "short" ? -1 : 1);
      const pnl = realized + unrealized;
      const notional = getNotional(t);
      return {
        id: `${t.id}-live`,
        date: today,
        symbol: t.instrument,
        type: t.direction,
        entryPrice: Number(t.entryPrice || 0),
        exitPrice: ltp,
        pnl,
        returnPercent: notional > 0 ? (pnl / notional) * 100 : 0,
        isOngoing: true,
        duration: dayDiff(t.date, today),
      };
    });

    return [...baseClosed, ...openMapped];
  }, [closedRealTrades, includeOngoing, ongoingRealTrades, livePrices]);

  const filteredTrades = useMemo(() => {
    if (!dateStart || !dateEnd) return [];
    return comparisonTrades
      .filter((t) => t.date >= dateStart && t.date <= dateEnd)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [comparisonTrades, dateStart, dateEnd]);

  const capitalSelectedTrades = useMemo(() => {
    if (!dateStart || !dateEnd) return [];
    const today = toISODate(new Date());
    const source = includeOngoing
      ? [...closedRealTrades, ...ongoingRealTrades]
      : closedRealTrades;

    return source.filter((t) => {
      const closeDate = t.outcome === "open" ? today : (getTradeCloseDate(t) || t.date);
      return closeDate >= dateStart && closeDate <= dateEnd;
    });
  }, [dateStart, dateEnd, includeOngoing, closedRealTrades, ongoingRealTrades]);

  const capitalSummary = useMemo(() => {
    const grossPnl = capitalSelectedTrades.reduce((sum, t) => {
      if (t.outcome !== "open") return sum + Number(t.pnl || 0);
      const sym = (t.instrument || "").toUpperCase();
      const ltp = Number(livePrices[sym]?.ltp ?? t.entryPrice ?? 0);
      const exitedQty = (t.exits || []).reduce((s, e) => s + (Number(e.qty) || 0), 0);
      const remQty = Math.max(0, (Number(t.qty) || 0) - exitedQty);
      const realized = Number(t.pnl || 0);
      const unrealized = (ltp - Number(t.entryPrice || 0)) * remQty * (t.direction === "short" ? -1 : 1);
      return sum + realized + unrealized;
    }, 0);

    const commission = capitalSelectedTrades.reduce((sum, t) => sum + Number(t.commission || 0), 0);
    const netPnl = grossPnl - commission;
    const capitalReturnPct = corpusValue && corpusValue > 0 ? (netPnl / corpusValue) * 100 : null;
    return { grossPnl, commission, netPnl, capitalReturnPct };
  }, [capitalSelectedTrades, livePrices, corpusValue]);

  useEffect(() => {
    if (!dateStart || !dateEnd) return;
    let cancelled = false;

    const key = `td-index-cache:${dateStart}:${dateEnd}`;
    const fallbackKey = "td-index-cache:last-success";

    const fetchIndices = async () => {
      setIndexLoading(true);
      setIndexWarn("");

      try {
        const cachedRaw = localStorage.getItem(key);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached?.ts && Date.now() - cached.ts < 60 * 60 * 1000) {
            if (!cancelled) {
              setIndexData(cached.data);
              setIndexLoading(false);
              return;
            }
          }
        }
      } catch {
        // ignore cache parse issues
      }

      try {
        const query = `start=${encodeURIComponent(dateStart)}&end=${encodeURIComponent(dateEnd)}`;
        let res = await fetch(`/api/nifty-indices?${query}`);
        if (res.status === 404) {
          res = await fetch(`/.netlify/functions/nifty-indices?${query}`);
        }
        if (!res.ok) throw new Error(`Index API failed (${res.status})`);
        const data = await res.json();
        if (!data?.nifty50?.length || !data?.nifty500?.length) throw new Error("No benchmark data returned");
        if (cancelled) return;
        setIndexData({ nifty50: data.nifty50, nifty500: data.nifty500 });
        localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data: { nifty50: data.nifty50, nifty500: data.nifty500 } }));
        localStorage.setItem(fallbackKey, JSON.stringify({ ts: Date.now(), data: { nifty50: data.nifty50, nifty500: data.nifty500 } }));
      } catch (err) {
        let fallback = null;
        try {
          fallback = JSON.parse(localStorage.getItem(fallbackKey) || "null")?.data || null;
        } catch {
          fallback = null;
        }

        if (!cancelled) {
          if (fallback?.nifty50?.length && fallback?.nifty500?.length) {
            setIndexData(fallback);
            setIndexWarn(`Benchmark API failed; using cached benchmark data. (${err.message})`);
          } else {
            setIndexData({
              nifty50: getFallbackIndexSeries(dateStart, dateEnd),
              nifty500: getFallbackIndexSeries(dateStart, dateEnd),
            });
            setIndexWarn(`Benchmark API failed; using fallback baseline data. (${err.message})`);
          }
        }
      } finally {
        if (!cancelled) setIndexLoading(false);
      }
    };

    fetchIndices();
    return () => {
      cancelled = true;
    };
  }, [dateStart, dateEnd]);

  const seriesBundle = useMemo(() => {
    if (!dateStart || !dateEnd) {
      return {
        merged: [],
        portfolioPoints: [],
        n50Points: [],
        n500Points: [],
        portfolioDailyReturns: [],
        n50DailyReturns: [],
        n500DailyReturns: [],
        portfolioCorpusDailyReturns: [],
        months: [],
        tradingDaysCount: 0,
      };
    }

    const navSource = includeOngoing
      ? [...closedRealTrades, ...ongoingRealTrades]
      : closedRealTrades;
    const fallbackCapital = Math.max(
      100000,
      navSource.reduce((sum, t) => sum + getNotional(t), 0),
    );
    const baseCapital = corpusValue && corpusValue > 0 ? corpusValue : fallbackCapital;

    const nav = buildPortfolioNavSeries({
      trades: navSource,
      startDate: dateStart,
      endDate: dateEnd,
      includeOngoing,
      livePrices,
      baseCapital,
    });

    const n50Map = new Map(indexData.nifty50.map((d) => [d.date, Number(d.close || 0)]));
    const n500Map = new Map(indexData.nifty500.map((d) => [d.date, Number(d.close || 0)]));
    const alignedDates = nav.tradingDays.filter((d) => (n50Map.get(d) > 0) && (n500Map.get(d) > 0));

    const navByDate = new Map(nav.navPoints.map((p) => [p.date, p.value]));
    const alignedNavPoints = alignedDates
      .map((d) => ({ date: d, value: navByDate.get(d) }))
      .filter((p) => Number.isFinite(p.value));

    const n50Series = buildBenchmarkSeries(indexData.nifty50, alignedDates);
    const n500Series = buildBenchmarkSeries(indexData.nifty500, alignedDates);

    const baseNav = alignedNavPoints[0]?.value ?? null;
    const portfolioPoints = alignedNavPoints.map((p) => ({
      date: p.date,
      value: baseNav && baseNav > 0 ? (p.value / baseNav) * 100 : 100,
    }));

    const portfolioDailyReturns = alignedNavPoints.map((p, i) => {
      if (i === 0) return 0;
      const prev = alignedNavPoints[i - 1].value;
      return prev > 0 ? (p.value - prev) / prev : 0;
    });

    const merged = alignedDates.map((date, i) => ({
      date,
      portfolio: portfolioPoints[i]?.value ?? null,
      nifty50: n50Series.points[i]?.value ?? null,
      nifty500: n500Series.points[i]?.value ?? null,
    }));

    const months = [...new Set(alignedDates.map((d) => d.slice(0, 7)))];

    const portfolioCorpusDailyReturns = corpusValue && corpusValue > 0
      ? portfolioDailyReturns
      : alignedDates.map(() => null);

    return {
      merged,
      portfolioPoints,
      n50Points: n50Series.points,
      n500Points: n500Series.points,
      portfolioDailyReturns,
      n50DailyReturns: n50Series.dailyReturns,
      n500DailyReturns: n500Series.dailyReturns,
      portfolioCorpusDailyReturns,
      months,
      tradingDaysCount: alignedDates.length,
    };
  }, [
    dateStart,
    dateEnd,
    includeOngoing,
    closedRealTrades,
    ongoingRealTrades,
    livePrices,
    corpusValue,
    indexData,
  ]);

  const portfolioMonthly = useMemo(() => buildMonthlyReturns(seriesBundle.portfolioPoints), [seriesBundle.portfolioPoints]);
  const n50Monthly = useMemo(() => buildMonthlyReturns(seriesBundle.n50Points), [seriesBundle.n50Points]);
  const n500Monthly = useMemo(() => buildMonthlyReturns(seriesBundle.n500Points), [seriesBundle.n500Points]);

  const winRate = useMemo(() => {
    if (!filteredTrades.length) return null;
    const wins = filteredTrades.filter((t) => t.pnl > 0).length;
    return (wins / filteredTrades.length) * 100;
  }, [filteredTrades]);

  const portfolioMetrics = useMemo(
    () => getSeriesMetrics(seriesBundle.portfolioPoints, seriesBundle.portfolioDailyReturns, winRate, portfolioMonthly),
    [seriesBundle.portfolioPoints, seriesBundle.portfolioDailyReturns, winRate, portfolioMonthly],
  );
  const n50Metrics = useMemo(
    () => getSeriesMetrics(seriesBundle.n50Points, seriesBundle.n50DailyReturns, null, n50Monthly),
    [seriesBundle.n50Points, seriesBundle.n50DailyReturns, n50Monthly],
  );
  const n500Metrics = useMemo(
    () => getSeriesMetrics(seriesBundle.n500Points, seriesBundle.n500DailyReturns, null, n500Monthly),
    [seriesBundle.n500Points, seriesBundle.n500DailyReturns, n500Monthly],
  );

  const n50Stats = useMemo(
    () => correlationStats(seriesBundle.portfolioCorpusDailyReturns, seriesBundle.n50DailyReturns),
    [seriesBundle.portfolioCorpusDailyReturns, seriesBundle.n50DailyReturns],
  );
  const n500Stats = useMemo(
    () => correlationStats(seriesBundle.portfolioCorpusDailyReturns, seriesBundle.n500DailyReturns),
    [seriesBundle.portfolioCorpusDailyReturns, seriesBundle.n500DailyReturns],
  );

  const plotSeries = useMemo(() => {
    const port = downsampleSeries(seriesBundle.portfolioPoints.map((p) => ({ ...p, portfolio: p.value })), granularity);
    const n50 = new Map(downsampleSeries(seriesBundle.n50Points.map((p) => ({ ...p, nifty50: p.value })), granularity).map((x) => [x.date, x.nifty50]));
    const n500 = new Map(downsampleSeries(seriesBundle.n500Points.map((p) => ({ ...p, nifty500: p.value })), granularity).map((x) => [x.date, x.nifty500]));
    return port.map((p) => ({
      date: p.date,
      portfolio: p.portfolio,
      portfolioArea: p.portfolio,
      nifty50: n50.get(p.date) ?? null,
      nifty500: n500.get(p.date) ?? null,
    }));
  }, [seriesBundle.portfolioPoints, seriesBundle.n50Points, seriesBundle.n500Points, granularity]);

  const drawdowns = useMemo(() => {
    const p = buildDrawdownSeries(seriesBundle.portfolioPoints);
    const n50 = buildDrawdownSeries(seriesBundle.n50Points);
    const n500 = buildDrawdownSeries(seriesBundle.n500Points);
    const merged = p.series.map((row, i) => ({
      date: row.date,
      portfolio: row.drawdown,
      nifty50: n50.series[i]?.drawdown ?? 0,
      nifty500: n500.series[i]?.drawdown ?? 0,
    }));
    return { merged, p, n50, n500 };
  }, [seriesBundle.portfolioPoints, seriesBundle.n50Points, seriesBundle.n500Points]);

  const rollingData = useMemo(() => {
    const w = ROLLING_WINDOWS[rollingPeriod];
    const build = (arr) => {
      const out = [];
      for (let i = w; i < arr.length; i += 1) {
        const start = arr[i - w].value;
        const end = arr[i].value;
        const r = start > 0 ? ((end - start) / start) * 100 : 0;
        out.push({ date: arr[i].date, value: r });
      }
      return out;
    };
    const p = build(seriesBundle.portfolioPoints);
    const n50 = new Map(build(seriesBundle.n50Points).map((x) => [x.date, x.value]));
    const n500 = new Map(build(seriesBundle.n500Points).map((x) => [x.date, x.value]));
    return p.map((x) => ({ date: x.date, portfolio: x.value, nifty50: n50.get(x.date), nifty500: n500.get(x.date) }));
  }, [rollingPeriod, seriesBundle.portfolioPoints, seriesBundle.n50Points, seriesBundle.n500Points]);

  const riskReturn = useMemo(() => {
    const annual = (m) => m.cagr ?? m.totalReturn;
    return [
      { name: "Portfolio", key: "portfolio", x: portfolioMetrics.volatility, y: annual(portfolioMetrics) },
      { name: "Nifty 50", key: "nifty50", x: n50Metrics.volatility, y: annual(n50Metrics) },
      { name: "Nifty 500", key: "nifty500", x: n500Metrics.volatility, y: annual(n500Metrics) },
    ].filter((x) => x.x != null && x.y != null);
  }, [portfolioMetrics, n50Metrics, n500Metrics]);

  const monthlyAlpha = useMemo(() => {
    const bench = alphaTab === "nifty50" ? n50Monthly : n500Monthly;
    const bm = new Map(bench.map((m) => [m.month, m.returnPct]));
    return portfolioMonthly.map((m) => {
      const b = bm.get(m.month) ?? 0;
      const alpha = m.returnPct - b;
      return { month: m.month, alpha, color: alpha >= 0 ? "#2d7a5f" : "#dc2626" };
    });
  }, [alphaTab, portfolioMonthly, n50Monthly, n500Monthly]);

  const monthReturnMap = useMemo(() => ({
    portfolio: new Map(portfolioMonthly.map((m) => [m.month, m.returnPct])),
    nifty50: new Map(n50Monthly.map((m) => [m.month, m.returnPct])),
    nifty500: new Map(n500Monthly.map((m) => [m.month, m.returnPct])),
  }), [portfolioMonthly, n50Monthly, n500Monthly]);

  const tableRows = useMemo(() => {
    const rows = filteredTrades.filter((t) => !selectedMonth || t.date.startsWith(selectedMonth));
    const sorted = [...rows].sort((a, b) => {
      const mult = sortBy.dir === "asc" ? 1 : -1;
      const va = a[sortBy.key];
      const vb = b[sortBy.key];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * mult;
      return String(va).localeCompare(String(vb)) * mult;
    });
    return sorted;
  }, [filteredTrades, sortBy, selectedMonth]);

  const lessThan30Days = useMemo(() => {
    return seriesBundle.tradingDaysCount < 30;
  }, [seriesBundle.tradingDaysCount]);

  const exportCsv = () => {
    const headers = ["Date", "Symbol", "Type", "Entry", "Exit", "PnL", "Return %", "Duration", "Status"];
    const lines = [headers.join(",")];
    for (const t of tableRows) {
      lines.push([
        t.date,
        t.symbol,
        t.type,
        t.entryPrice,
        t.exitPrice,
        t.pnl,
        t.returnPercent,
        t.duration,
        t.isOngoing ? "LIVE" : "Closed",
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "compare-trades.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!closedRealTrades.length) {
    return (
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 36, textAlign: "center", color: "var(--text-3)" }}>
        No real closed trades found. Log and close at least one real trade to compare against market benchmarks.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <section style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.11), rgba(16,185,129,0.07))", border: "1px solid var(--border)", borderRadius: 16, padding: 16, backdropFilter: "blur(10px)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ margin: 0, color: "var(--text)", fontSize: 22 }}>Portfolio vs Market</h2>
              <HelpButton onClick={() => setHelpKey("overview")} />
            </div>
            <p style={{ margin: "6px 0 0", color: "var(--text-2)", fontSize: 13 }}>Comparing real portfolio performance against Nifty 50 and Nifty 500</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <label style={{ fontSize: 12, color: "var(--text-2)" }}>From</label>
            <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 8, padding: "6px 8px" }} />
            <label style={{ fontSize: 12, color: "var(--text-2)" }}>To</label>
            <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 8, padding: "6px 8px" }} />
            <button
              onClick={() => setIncludeOngoing((v) => !v)}
              disabled={!ongoingRealTrades.length}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 999,
                padding: "7px 12px",
                border: `1px solid ${includeOngoing ? "rgba(45,122,95,0.55)" : "var(--border)"}`,
                background: includeOngoing ? "rgba(45,122,95,0.16)" : "var(--surface)",
                color: includeOngoing ? "var(--green)" : "var(--text-2)",
                cursor: ongoingRealTrades.length ? "pointer" : "not-allowed",
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              Include Ongoing Trades
              {includeOngoing && (
                <span style={{ background: "rgba(45,122,95,0.2)", color: "var(--green)", borderRadius: 999, padding: "2px 8px", fontSize: 11 }}>
                  {ongoingRealTrades.length}
                </span>
              )}
            </button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 12, color: "var(--text-2)", fontSize: 12, flexWrap: "wrap" }}>
          <span><span style={{ color: INDEX_COLORS.portfolio }}>●</span> My Portfolio</span>
          <span><span style={{ color: INDEX_COLORS.nifty50 }}>●</span> Nifty 50</span>
          <span><span style={{ color: INDEX_COLORS.nifty500 }}>●</span> Nifty 500</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 12 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 10 }}>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>Capital Return % (Stats-aligned)</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: (capitalSummary.capitalReturnPct ?? 0) >= 0 ? "var(--green)" : "var(--red)" }}>
              {capitalSummary.capitalReturnPct == null ? "Set corpus in Stats" : fmtPct(capitalSummary.capitalReturnPct)}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
              Net PnL / Total corpus
            </div>
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 10 }}>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>Net PnL (selected tenure)</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: capitalSummary.netPnl >= 0 ? "var(--green)" : "var(--red)" }}>
              {capitalSummary.netPnl >= 0 ? "+" : ""}₹{fmtNum(capitalSummary.netPnl, 0)}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
              Gross PnL ₹{fmtNum(capitalSummary.grossPnl, 0)} - Commission ₹{fmtNum(capitalSummary.commission, 0)}
            </div>
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 10 }}>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>What this section compares</div>
            <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.4 }}>
              Card above: corpus-based return (same logic as Stats). Charts and metrics below: daily NAV-based benchmarking and risk analytics.
            </div>
          </div>
        </div>
      </section>

      {includeOngoing && (
        <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.4)", color: "#f59e0b", borderRadius: 10, padding: "10px 12px", fontSize: 12 }}>
          Includes unrealized PnL from open positions based on current LTP.
          {loadingLive ? " Refreshing live prices..." : ""}
        </div>
      )}

      {indexWarn && (
        <div style={{ background: "rgba(239,68,68,0.09)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", borderRadius: 10, padding: "10px 12px", fontSize: 12 }}>
          {indexWarn}
        </div>
      )}

      {indexLoading ? (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 18 }}>
          <div style={{ height: 16, width: 180, background: "var(--surface-2)", borderRadius: 6, marginBottom: 12 }} />
          <div style={{ height: 260, width: "100%", background: "var(--surface-2)", borderRadius: 12 }} />
        </div>
      ) : (
        <>
          <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <h3 style={{ margin: 0, color: "var(--text)", fontSize: 15 }}>Summary Stats</h3>
              <HelpButton onClick={() => setHelpKey("summary")} />
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Metric</th>
                    <th style={thStyle}>My Portfolio</th>
                    <th style={thStyle}>Nifty 50</th>
                    <th style={thStyle}>Nifty 500</th>
                  </tr>
                </thead>
                <tbody>
                  {METRIC_DEFS.map((m) => {
                    const pVal = parseMetricValue(m.key, portfolioMetrics);
                    const n50Val = parseMetricValue(m.key, n50Metrics);
                    const n500Val = parseMetricValue(m.key, n500Metrics);
                    return (
                      <tr key={m.key}>
                        <td style={{ ...tdStyle, display: "flex", alignItems: "center", gap: 6 }}>
                          <span title={m.tip}>{m.label}</span>
                          <HelpButton
                            tiny
                            onClick={() => setHelpKey(m.key)}
                          />
                        </td>
                        <td style={{ ...tdStyle, color: metricColor(pVal, n50Val) }}>{labelMetricValue(m.key, portfolioMetrics)}</td>
                        <td style={tdStyle}>{labelMetricValue(m.key, n50Metrics)}</td>
                        <td style={tdStyle}>{labelMetricValue(m.key, n500Metrics)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h3 style={{ margin: 0, color: "var(--text)", fontSize: 15 }}>Normalized Performance (Base 100)</h3>
                <HelpButton onClick={() => setHelpKey("normalized")} />
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {Object.keys({ daily: 1, weekly: 1, monthly: 1 }).map((g) => (
                  <button key={g} onClick={() => setGranularity(g)} style={toggleButton(granularity === g)}>{g}</button>
                ))}
              </div>
            </div>
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <LineChart data={plotSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fill: "var(--text-3)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "var(--text-3)", fontSize: 11 }} />
                  <Tooltip formatter={(v) => fmtNum(v)} />
                  <Legend />
                  <Brush dataKey="date" height={22} stroke="var(--green)" travellerWidth={8} />
                  <Area
                    type="monotone"
                    dataKey="portfolioArea"
                    fill={INDEX_COLORS.portfolio}
                    fillOpacity={0.08}
                    stroke="none"
                    legendType="none"
                    tooltipType="none"
                  />
                  <Line type="monotone" dataKey="portfolio" stroke={INDEX_COLORS.portfolio} dot={false} strokeWidth={2.2} name="Portfolio" />
                  <Line type="monotone" dataKey="nifty50" stroke={INDEX_COLORS.nifty50} dot={false} strokeWidth={1.8} name="Nifty 50" />
                  <Line type="monotone" dataKey="nifty500" stroke={INDEX_COLORS.nifty500} dot={false} strokeWidth={1.8} name="Nifty 500" />
                  {drawdowns.p.maxDate && (
                    <ReferenceLine x={drawdowns.p.maxDate} stroke="#ef4444" strokeDasharray="4 4" label="Max DD" />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <h3 style={{ margin: 0, color: "var(--text)", fontSize: 15 }}>Monthly Returns Heatmap</h3>
              <HelpButton onClick={() => setHelpKey("heatmap")} />
            </div>
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: 780 }}>
                <div style={{ display: "grid", gridTemplateColumns: `140px repeat(${seriesBundle.months.length}, minmax(48px, 1fr))`, gap: 6, marginBottom: 6 }}>
                  <div />
                  {seriesBundle.months.map((m) => (
                    <div key={m} style={{ color: "var(--text-3)", fontSize: 11, textAlign: "center" }}>{m}</div>
                  ))}
                </div>
                {[
                  { key: "portfolio", label: "Portfolio" },
                  { key: "nifty50", label: "Nifty 50" },
                  { key: "nifty500", label: "Nifty 500" },
                ].map((row) => (
                  <div key={row.key} style={{ display: "grid", gridTemplateColumns: `140px repeat(${seriesBundle.months.length}, minmax(48px, 1fr))`, gap: 6, marginBottom: 6 }}>
                    <div style={{ color: "var(--text)", fontSize: 12, fontWeight: 600 }}>{row.label}</div>
                    {seriesBundle.months.map((m) => {
                      const value = monthReturnMap[row.key].get(m);
                      return (
                        <button
                          key={m}
                          onClick={() => setSelectedMonth(m)}
                          title={`${row.label} ${m}: ${fmtPct(value)}`}
                          style={{
                            border: selectedMonth === m ? "1px solid var(--green)" : "1px solid var(--border)",
                            background: heatColor(value),
                            color: "var(--text)",
                            borderRadius: 8,
                            minHeight: 34,
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          {value == null ? "-" : fmtNum(value, 1)}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section style={grid2Style}>
            <div style={cardStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <h3 style={{ ...h3Style, margin: 0 }}>Drawdown %</h3>
                <HelpButton onClick={() => setHelpKey("drawdown")} />
              </div>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <AreaChart data={drawdowns.merged}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fill: "var(--text-3)", fontSize: 11 }} />
                    <YAxis tick={{ fill: "var(--text-3)", fontSize: 11 }} />
                    <Tooltip formatter={(v) => `${fmtNum(v)}%`} />
                    <Area type="monotone" dataKey="portfolio" stroke={INDEX_COLORS.portfolio} fill={INDEX_COLORS.portfolio} fillOpacity={0.12} name="Portfolio" />
                    <Line type="monotone" dataKey="nifty50" stroke={INDEX_COLORS.nifty50} dot={false} name="Nifty 50" />
                    <Line type="monotone" dataKey="nifty500" stroke={INDEX_COLORS.nifty500} dot={false} name="Nifty 500" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h3 style={{ ...h3Style, margin: 0 }}>Rolling Returns</h3>
                  <HelpButton onClick={() => setHelpKey("rolling")} />
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {Object.keys(ROLLING_WINDOWS).map((k) => (
                    <button key={k} onClick={() => setRollingPeriod(k)} style={toggleButton(rollingPeriod === k)}>{k}</button>
                  ))}
                </div>
              </div>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <LineChart data={rollingData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fill: "var(--text-3)", fontSize: 11 }} />
                    <YAxis tick={{ fill: "var(--text-3)", fontSize: 11 }} />
                    <Tooltip formatter={(v) => `${fmtNum(v)}%`} />
                    <Line dataKey="portfolio" stroke={INDEX_COLORS.portfolio} dot={false} name="Portfolio" />
                    <Line dataKey="nifty50" stroke={INDEX_COLORS.nifty50} dot={false} name="Nifty 50" />
                    <Line dataKey="nifty500" stroke={INDEX_COLORS.nifty500} dot={false} name="Nifty 500" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {lessThan30Days && (
                <p style={{ fontSize: 11, color: "var(--text-3)", margin: "8px 0 0" }}>Short date range detected. Rolling metrics can be less reliable below 30 days.</p>
              )}
            </div>
          </section>

          <section style={grid2Style}>
            <div style={cardStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <h3 style={{ ...h3Style, margin: 0 }}>Risk vs Return</h3>
                <HelpButton onClick={() => setHelpKey("riskReturn")} />
              </div>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" dataKey="x" name="Volatility" unit="%" tick={{ fill: "var(--text-3)", fontSize: 11 }} />
                    <YAxis type="number" dataKey="y" name="Return" unit="%" tick={{ fill: "var(--text-3)", fontSize: 11 }} />
                    <Tooltip formatter={(v, n) => `${fmtNum(v)}${n === "x" || n === "y" ? "%" : ""}`} />
                    <ReferenceLine x={riskReturn.reduce((m, r) => Math.max(m, r.x || 0), 0) / 2} stroke="var(--border)" />
                    <ReferenceLine y={riskReturn.reduce((m, r) => Math.max(m, r.y || 0), 0) / 2} stroke="var(--border)" />
                    <Scatter data={riskReturn}>
                      {riskReturn.map((r) => (
                        <Cell key={r.key} fill={INDEX_COLORS[r.key]} />
                      ))}
                      <LabelList dataKey="name" position="top" fill="var(--text-2)" fontSize={11} />
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <h3 style={{ ...h3Style, margin: 0 }}>Alpha and Beta</h3>
                <HelpButton onClick={() => setHelpKey("alphaBeta")} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
                <MiniStat label="Alpha vs Nifty 50 (Jensen, corpus-based)" value={n50Stats.alpha == null ? "Insufficient data" : fmtPct(n50Stats.alpha)} />
                <MiniStat label="Alpha vs Nifty 500 (Jensen, corpus-based)" value={n500Stats.alpha == null ? "Insufficient data" : fmtPct(n500Stats.alpha)} />
                <MiniStat label="Beta vs Nifty 50 (corpus-based)" value={n50Stats.beta == null ? "Insufficient data" : fmtNum(n50Stats.beta)} />
                <MiniStat label="Beta vs Nifty 500 (corpus-based)" value={n500Stats.beta == null ? "Insufficient data" : fmtNum(n500Stats.beta)} />
                <MiniStat label="Correlation with Nifty 50" value={n50Stats.correlation == null ? "Insufficient data" : fmtNum(n50Stats.correlation)} />
                <MiniStat label="Correlation with Nifty 500" value={n500Stats.correlation == null ? "Insufficient data" : fmtNum(n500Stats.correlation)} />
                <MiniStat label="Information Ratio (Nifty 50)" value={n50Stats.informationRatio == null ? "Insufficient data" : fmtNum(n50Stats.informationRatio)} />
                <MiniStat label="Treynor Ratio (Nifty 50)" value={n50Stats.treynor == null ? "Insufficient data" : fmtNum(n50Stats.treynor)} />
              </div>
            </div>
          </section>

          <section style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h3 style={{ ...h3Style, margin: 0 }}>Outperformance Timeline</h3>
                <HelpButton onClick={() => setHelpKey("outperformance")} />
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setAlphaTab("nifty50")} style={toggleButton(alphaTab === "nifty50")}>vs Nifty 50</button>
                <button onClick={() => setAlphaTab("nifty500")} style={toggleButton(alphaTab === "nifty500")}>vs Nifty 500</button>
              </div>
            </div>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={monthlyAlpha}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill: "var(--text-3)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "var(--text-3)", fontSize: 11 }} />
                  <Tooltip formatter={(v) => `${fmtNum(v)}%`} />
                  <Bar dataKey="alpha" name="Monthly Alpha">
                    {monthlyAlpha.map((d) => (
                      <Cell key={d.month} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h3 style={{ ...h3Style, margin: 0 }}>Trade Breakdown</h3>
                <HelpButton onClick={() => setHelpKey("trades")} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {selectedMonth && (
                  <span style={{ fontSize: 12, color: "var(--text-2)" }}>
                    Filtered by month {selectedMonth}
                    <button onClick={() => setSelectedMonth(null)} style={{ marginLeft: 6, background: "none", border: "none", color: "var(--green)", cursor: "pointer" }}>
                      Clear
                    </button>
                  </span>
                )}
                <button onClick={exportCsv} className="btn-outline" style={{ padding: "7px 10px" }}>Export CSV</button>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                <thead>
                  <tr>
                    {[
                      ["date", "Date"],
                      ["symbol", "Symbol"],
                      ["type", "Type"],
                      ["entryPrice", "Entry"],
                      ["exitPrice", "Exit"],
                      ["pnl", "P&L (₹)"],
                      ["returnPercent", "Return %"],
                      ["duration", "Duration"],
                    ].map(([key, label]) => (
                      <th key={key} style={thStyle}>
                        <button
                          onClick={() => setSortBy((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }))}
                          style={{ background: "none", border: "none", color: "var(--text-2)", cursor: "pointer", fontSize: 11, fontWeight: 700 }}
                        >
                          {label}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((t) => (
                    <tr key={t.id}>
                      <td style={tdStyle}>{fmtDate(t.date)}</td>
                      <td style={tdStyle}>{t.symbol}</td>
                      <td style={tdStyle}>
                        {t.type}
                        {t.isOngoing && (
                          <span style={{ marginLeft: 8, padding: "2px 7px", borderRadius: 999, background: "rgba(245,158,11,0.2)", color: "#f59e0b", fontSize: 10, fontWeight: 700 }}>
                            LIVE
                          </span>
                        )}
                      </td>
                      <td style={tdStyle}>{fmtNum(t.entryPrice)}</td>
                      <td style={tdStyle}>{fmtNum(t.exitPrice)}</td>
                      <td style={{ ...tdStyle, color: t.pnl >= 0 ? "var(--green)" : "var(--red)" }}>
                        {t.pnl >= 0 ? "+" : ""}₹{fmtNum(t.pnl, 0)}
                      </td>
                      <td style={{ ...tdStyle, color: t.returnPercent >= 0 ? "var(--green)" : "var(--red)" }}>{fmtPct(t.returnPercent)}</td>
                      <td style={tdStyle}>{t.duration}d</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      <HelpModal
        helpKey={helpKey}
        onClose={() => setHelpKey(null)}
      />
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: 10 }}>
      <div style={{ color: "var(--text-3)", fontSize: 11, marginBottom: 4 }}>{label}</div>
      <div style={{ color: "var(--text)", fontSize: 15, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function HelpButton({ onClick, tiny = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Show info"
      style={{
        width: tiny ? 16 : 18,
        height: tiny ? 16 : 18,
        borderRadius: 999,
        border: "1px solid var(--border)",
        background: "var(--surface-2)",
        color: "var(--text-2)",
        fontSize: tiny ? 10 : 11,
        fontWeight: 800,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        lineHeight: 1,
      }}
    >
      i
    </button>
  );
}

function HelpModal({ helpKey, onClose }) {
  if (!helpKey) return null;
  const isMetric = Object.prototype.hasOwnProperty.call(METRIC_HELP, helpKey);
  const data = isMetric
    ? { title: METRIC_DEFS.find((m) => m.key === helpKey)?.label || "Metric", body: METRIC_HELP[helpKey] }
    : HELP_CONTENT[helpKey];

  if (!data) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 120,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 100%)",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h4 style={{ margin: 0, color: "var(--text)", fontSize: 16 }}>{data.title}</h4>
            <p style={{ margin: "8px 0 0", color: "var(--text-2)", fontSize: 13, lineHeight: 1.5 }}>{data.body}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid var(--border)",
              background: "var(--surface-2)",
              color: "var(--text-2)",
              borderRadius: 8,
              width: 28,
              height: 28,
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            x
          </button>
        </div>
      </div>
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  fontSize: 11,
  color: "var(--text-2)",
  padding: "8px 10px",
  borderBottom: "1px solid var(--border)",
};

const tdStyle = {
  fontSize: 12,
  color: "var(--text)",
  padding: "9px 10px",
  borderBottom: "1px solid var(--border)",
  whiteSpace: "nowrap",
};

const grid2Style = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 12,
};

const cardStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 14,
};

const h3Style = { margin: "0 0 8px", color: "var(--text)", fontSize: 15 };

function toggleButton(active) {
  return {
    border: `1px solid ${active ? "rgba(45,122,95,0.45)" : "var(--border)"}`,
    background: active ? "rgba(45,122,95,0.15)" : "var(--surface)",
    color: active ? "var(--green)" : "var(--text-2)",
    borderRadius: 999,
    padding: "5px 10px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
  };
}
