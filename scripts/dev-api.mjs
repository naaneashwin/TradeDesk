/**
 * Lightweight dev-only API server.
 * Mirrors the Netlify function logic for /api/price, /api/symbols,
 * /api/kite/session, and /api/kite/portfolio.
 * Run alongside Vite (port 5173) — Vite proxies /api/* here (port 8888).
 */

import http from 'node:http'
import { URL } from 'node:url'
import { createRequire } from 'node:module'
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const require = createRequire(import.meta.url)
const { KiteConnect } = require('kiteconnect')

const KITE_API_KEY    = process.env.KITE_API_KEY
const KITE_API_SECRET = process.env.KITE_API_SECRET

const PORT = 8888

// Log environment variables to verify
console.log('KITE_API_KEY:', KITE_API_KEY);
console.log('KITE_API_SECRET:', KITE_API_SECRET);

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

// ── /api/kite/session ────────────────────────────────────────
async function handleKiteSession(req) {
  if (!KITE_API_KEY || !KITE_API_SECRET) {
    throw Object.assign(new Error('KITE_API_KEY / KITE_API_SECRET not set in env'), { status: 500 })
  }

  const body = await new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', chunk => { raw += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')) } catch { reject(Object.assign(new Error('Invalid JSON'), { status: 400 })) }
    })
    req.on('error', reject)
  })

  const { request_token } = body
  if (!request_token) throw Object.assign(new Error('request_token required'), { status: 400 })

  const kc      = new KiteConnect({ api_key: KITE_API_KEY })
  const session = await kc.generateSession(request_token, KITE_API_SECRET)
  return {
    access_token: session.access_token,
    user_id:      session.user_id,
    user_name:    session.user_name,
    email:        session.email,
  }
}

// ── /api/kite/trades ────────────────────────────────────────
async function handleKiteTrades(req) {
  if (!KITE_API_KEY) {
    throw Object.assign(new Error('KITE_API_KEY not set in env'), { status: 500 })
  }

  const authHeader   = req.headers['authorization'] ?? ''
  const access_token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!access_token) throw Object.assign(new Error('Authorization: Bearer <token> header required'), { status: 401 })

  const kc = new KiteConnect({ api_key: KITE_API_KEY })
  kc.setAccessToken(access_token)

  const trades = await kc.getTrades()
  return trades
}

// ── /api/kite/portfolio ──────────────────────────────────────
async function handleKitePortfolio(req) {
  if (!KITE_API_KEY) {
    throw Object.assign(new Error('KITE_API_KEY not set in env'), { status: 500 })
  }

  const authHeader   = req.headers['authorization'] ?? ''
  const access_token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!access_token) throw Object.assign(new Error('Authorization: Bearer <token> header required'), { status: 401 })

  const kc = new KiteConnect({ api_key: KITE_API_KEY })
  kc.setAccessToken(access_token)

  const [positions, margins, holdings, mfHoldings] = await Promise.all([
    kc.getPositions(),
    kc.getMargins(),
    kc.getHoldings(),
    kc.getMFHoldings().catch(() => []),
  ])
  return { positions, margins, holdings, mfHoldings }
}

// ── Server ────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const base = `http://localhost:${PORT}`
  const url  = new URL(req.url, base)
  const cors = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { ...cors, 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' })
    return res.end()
  }

  try {
    let body
    if (url.pathname === '/api/symbols') {
      body = await handleSymbols(url.searchParams)
    } else if (url.pathname === '/api/price') {
      body = await handlePrice(url.searchParams)
    } else if (url.pathname === '/api/kite/session' && req.method === 'POST') {
      body = await handleKiteSession(req)
    } else if (url.pathname === '/api/kite/trades') {
      body = await handleKiteTrades(req)
    } else if (url.pathname === '/api/kite/portfolio') {
      body = await handleKitePortfolio(req)
    } else {
      res.writeHead(404, cors)
      return res.end(JSON.stringify({ error: 'Not found' }))
    }
    res.writeHead(200, cors)
    res.end(JSON.stringify(body))
  } catch (err) {
    // Kite SDK sets err.status to the string "error", not an HTTP code — guard against that
    const statusCode = (typeof err.status === 'number' && err.status >= 100 && err.status < 600)
      ? err.status
      : 500
    console.error(`[dev-api] ${req.url}`, err.message)
    res.writeHead(statusCode, cors)
    res.end(JSON.stringify({ error: err.message }))
  }
})

server.listen(PORT, () => {
  console.log(`\n  ✓ Dev API server running at http://localhost:${PORT}\n`)
})
