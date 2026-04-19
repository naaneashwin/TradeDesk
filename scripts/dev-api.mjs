/**
 * Lightweight dev-only API server.
 * Mirrors the Netlify function logic for /api/price and /api/symbols.
 * Run alongside Vite (port 5173) — Vite proxies /api/* here (port 8888).
 */

import http from 'node:http'
import { URL } from 'node:url'

const PORT = 8888

// ── /api/symbols ──────────────────────────────────────────────
async function handleSymbols(searchParams) {
  const q = searchParams.get('q')?.trim()
  if (!q) return []

  const res = await fetch(
    `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&lang=en-IN&region=IN&quotesCount=10&newsCount=0&listsCount=0`,
    { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } }
  )
  if (!res.ok) throw new Error(`Yahoo responded ${res.status}`)
  const json = await res.json()

  return (json?.quotes ?? [])
    .filter(item => item.quoteType === 'EQUITY' && (item.exchange === 'NSI' || item.exchange === 'BSE'))
    .slice(0, 10)
    .map(item => ({
      symbol:   (item.symbol ?? '').replace(/\.(NS|BO)$/, ''),
      name:     item.shortname ?? item.longname ?? '',
      exchange: item.exchange === 'NSI' ? 'NSE' : 'BSE',
    }))
    .filter(r => r.symbol)
}

// ── /api/price ────────────────────────────────────────────────
async function fetchYahoo(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1m&range=1d`
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Yahoo ${res.status}`)
  const json = await res.json()
  const meta = json?.chart?.result?.[0]?.meta
  if (!meta) throw new Error('No meta in Yahoo response')
  const ltp       = meta.regularMarketPrice ?? meta.previousClose
  const prevClose = meta.chartPreviousClose  ?? meta.previousClose ?? ltp
  return { ltp, change: ltp - prevClose, changePct: prevClose ? ((ltp - prevClose) / prevClose) * 100 : 0 }
}

async function handlePrice(searchParams) {
  const symbol = searchParams.get('symbol')?.trim().toUpperCase()
  if (!symbol) throw Object.assign(new Error('symbol required'), { status: 400 })
  for (const suffix of ['.NS', '.BO']) {
    try {
      const data = await fetchYahoo(symbol + suffix)
      if (data.ltp != null) return { symbol, ...data }
    } catch { /* try next */ }
  }
  throw new Error('Price not found')
}

// ── Server ────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const base = `http://localhost:${PORT}`
  const url  = new URL(req.url, base)
  const cors = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { ...cors, 'Access-Control-Allow-Methods': 'GET,OPTIONS' })
    return res.end()
  }

  try {
    let body
    if (url.pathname === '/api/symbols') {
      body = await handleSymbols(url.searchParams)
    } else if (url.pathname === '/api/price') {
      body = await handlePrice(url.searchParams)
    } else {
      res.writeHead(404, cors)
      return res.end(JSON.stringify({ error: 'Not found' }))
    }
    res.writeHead(200, cors)
    res.end(JSON.stringify(body))
  } catch (err) {
    const status = err.status ?? 502
    console.error(`[dev-api] ${req.url}`, err.message)
    res.writeHead(status, cors)
    res.end(JSON.stringify({ error: err.message }))
  }
})

server.listen(PORT, () => {
  console.log(`\n  ✓ Dev API server running at http://localhost:${PORT}\n`)
})
