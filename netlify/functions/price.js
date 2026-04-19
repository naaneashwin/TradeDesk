const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

// Yahoo Finance returns Indian NSE quotes when suffixed with .NS
async function fetchYahoo(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1m&range=1d`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/json',
    },
  })
  if (!res.ok) throw new Error(`Yahoo responded ${res.status}`)
  const json = await res.json()
  const meta = json?.chart?.result?.[0]?.meta
  if (!meta) throw new Error('No meta in Yahoo response')
  const ltp       = meta.regularMarketPrice ?? meta.previousClose
  const prevClose = meta.chartPreviousClose  ?? meta.previousClose ?? ltp
  const change    = ltp - prevClose
  const changePct = prevClose !== 0 ? (change / prevClose) * 100 : 0
  return { ltp, change, changePct }
}

export default async function handler(req) {
  const url    = new URL(req.url)
  const symbol = url.searchParams.get('symbol')?.trim().toUpperCase()

  if (!symbol) {
    return new Response(JSON.stringify({ error: 'symbol required' }), { status: 400, headers: HEADERS })
  }

  // Try NSE suffix first, then BSE suffix as fallback
  const tickers = [`${symbol}.NS`, `${symbol}.BO`]
  let last

  for (const ticker of tickers) {
    try {
      const data = await fetchYahoo(ticker)
      if (data.ltp != null) {
        return new Response(JSON.stringify({ symbol, ...data }), { status: 200, headers: HEADERS })
      }
    } catch (err) {
      last = err
    }
  }

  console.error('[price fn]', symbol, last?.message)
  return new Response(JSON.stringify({ error: last?.message ?? 'Price not found' }), { status: 502, headers: HEADERS })
}

export const config = { path: '/api/price' }
