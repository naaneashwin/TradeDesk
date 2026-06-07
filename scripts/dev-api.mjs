/**
 * Lightweight dev-only API server.
 * Mirrors the Netlify function logic for /api/price, /api/symbols,
 * /api/kite/session, and /api/kite/portfolio.
 * Run alongside Vite (port 5173) — Vite proxies /api/* here (port 8888).
 */

import http from 'node:http'
import { URL } from 'node:url'
import { createRequire } from 'node:module'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const require = createRequire(import.meta.url)
const { KiteConnect } = require('kiteconnect')

const KITE_API_KEY    = process.env.KITE_API_KEY
const KITE_API_SECRET = process.env.KITE_API_SECRET
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

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

// ── /api/nifty-indices ──────────────────────────────────────
async function fetchYahooHistory(symbol, startISO, endISO) {
  const period1 = Math.floor(new Date(startISO).getTime() / 1000)
  const period2 = Math.floor(new Date(endISO).getTime() / 1000) + 24 * 60 * 60
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d&events=history`
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Yahoo ${symbol} ${res.status}`)
  const json = await res.json()
  const result = json?.chart?.result?.[0]
  const ts = result?.timestamp ?? []
  const closes = result?.indicators?.quote?.[0]?.close ?? []

  const points = []
  for (let i = 0; i < ts.length; i += 1) {
    const close = closes[i]
    if (close == null || Number.isNaN(close)) continue
    points.push({ date: new Date(ts[i] * 1000).toISOString().slice(0, 10), close: Number(close) })
  }
  return points
}

function mergeIndexSeries(nifty50, nifty500) {
  const m50 = new Map(nifty50.map((x) => [x.date, x.close]))
  const m500 = new Map(nifty500.map((x) => [x.date, x.close]))
  const dates = [...new Set([...m50.keys(), ...m500.keys()])].sort()
  return dates
    .map((date) => ({ date, nifty50: m50.get(date) ?? null, nifty500: m500.get(date) ?? null }))
    .filter((x) => x.nifty50 != null || x.nifty500 != null)
}

async function handleNiftyIndices(searchParams) {
  const start = searchParams.get('start') || searchParams.get('from')
  const end = searchParams.get('end') || searchParams.get('to')
  if (!start || !end) {
    throw Object.assign(new Error('start and end are required'), { status: 400 })
  }

  const [nifty50, nifty500] = await Promise.all([
    fetchYahooHistory('^NSEI', start, end),
    fetchYahooHistory('^CRSLDX', start, end),
  ])

  return {
    start,
    end,
    nifty50,
    nifty500,
    data: mergeIndexSeries(nifty50, nifty500),
    source: 'yahoo',
  }
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

// ── /api/admin/invite-user ───────────────────────────────────
async function handleAdminInviteUser(req) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw Object.assign(new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in env'), { status: 500 })
  }

  const authHeader = req.headers['authorization'] ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) throw Object.assign(new Error('Authorization: Bearer <token> header required'), { status: 401 })

  const body = await new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', chunk => { raw += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')) } catch { reject(Object.assign(new Error('Invalid JSON'), { status: 400 })) }
    })
    req.on('error', reject)
  })

  const email = String(body?.email ?? '').trim().toLowerCase()
  const roleName = String(body?.role ?? 'user').trim().toLowerCase()
  const displayName = String(body?.displayName ?? '').trim()

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    throw Object.assign(new Error('Valid email is required'), { status: 400 })
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: authData, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !authData?.user) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 })
  }

  const { data: reqRole, error: reqRoleErr } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', authData.user.id)
    .maybeSingle()

  if (reqRoleErr || reqRole?.role !== 'admin') {
    throw Object.assign(new Error('Only admins can invite users'), { status: 403 })
  }

  const { data: roleData, error: roleErr } = await admin
    .from('roles')
    .select('id,name')
    .eq('name', roleName)
    .maybeSingle()

  if (roleErr || !roleData) {
    throw Object.assign(new Error(`Role '${roleName}' not found`), { status: 400 })
  }

  const invitePayload = displayName ? { data: { display_name: displayName } } : undefined
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, invitePayload)

  if (inviteErr || !invited?.user?.id) {
    throw Object.assign(new Error(inviteErr?.message || 'Unable to send invite'), { status: 400 })
  }

  const { error: upsertErr } = await admin
    .from('user_roles')
    .upsert({
      user_id: invited.user.id,
      role: roleData.name,
      role_id: roleData.id,
      display_name: displayName || null,
      status: 'active',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (upsertErr) throw Object.assign(new Error(upsertErr.message), { status: 400 })

  return {
    ok: true,
    user: {
      id: invited.user.id,
      email: invited.user.email,
    },
    role: roleData.name,
  }
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
    } else if (url.pathname === '/api/nifty-indices') {
      body = await handleNiftyIndices(url.searchParams)
    } else if (url.pathname === '/api/kite/session' && req.method === 'POST') {
      body = await handleKiteSession(req)
    } else if (url.pathname === '/api/kite/trades') {
      body = await handleKiteTrades(req)
    } else if (url.pathname === '/api/kite/portfolio') {
      body = await handleKitePortfolio(req)
    } else if (url.pathname === '/api/admin/invite-user' && req.method === 'POST') {
      body = await handleAdminInviteUser(req)
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
