const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

async function fetchYahooHistory(symbol, startISO, endISO) {
  const start = Math.floor(new Date(startISO).getTime() / 1000);
  const end = Math.floor(new Date(endISO).getTime() / 1000) + 24 * 60 * 60;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${start}&period2=${end}&interval=1d&events=history`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
    },
  });

  if (!res.ok) throw new Error(`Yahoo ${symbol} responded ${res.status}`);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];

  const points = [];
  for (let i = 0; i < timestamps.length; i += 1) {
    const close = closes[i];
    if (close == null || Number.isNaN(close)) continue;
    const date = new Date(timestamps[i] * 1000).toISOString().slice(0, 10);
    points.push({ date, close: Number(close) });
  }
  return points;
}

function mergeSeriesByDate(nifty50, nifty500) {
  const m50 = new Map(nifty50.map((p) => [p.date, p.close]));
  const m500 = new Map(nifty500.map((p) => [p.date, p.close]));
  const dates = [...new Set([...m50.keys(), ...m500.keys()])].sort();

  return dates
    .map((date) => ({
      date,
      nifty50: m50.get(date) ?? null,
      nifty500: m500.get(date) ?? null,
    }))
    .filter((x) => x.nifty50 != null || x.nifty500 != null);
}

export default async function handler(req) {
  const url = new URL(req.url);
  const start = url.searchParams.get("start") || url.searchParams.get("from");
  const end = url.searchParams.get("end") || url.searchParams.get("to");

  if (!start || !end) {
    return new Response(JSON.stringify({ error: "start and end dates are required" }), {
      status: 400,
      headers: HEADERS,
    });
  }

  try {
    const [nifty50, nifty500] = await Promise.all([
      fetchYahooHistory("^NSEI", start, end),
      fetchYahooHistory("^CRSLDX", start, end),
    ]);

    const merged = mergeSeriesByDate(nifty50, nifty500);

    return new Response(
      JSON.stringify({
        start,
        end,
        nifty50,
        nifty500,
        data: merged,
        source: "yahoo",
      }),
      {
        status: 200,
        headers: {
          ...HEADERS,
          "Cache-Control": "public, max-age=300",
        },
      },
    );
  } catch (error) {
    console.error("[nifty-indices fn]", error?.message);
    return new Response(JSON.stringify({ error: error?.message || "Unable to fetch index data" }), {
      status: 502,
      headers: HEADERS,
    });
  }
}

export const config = { path: "/api/nifty-indices" };
