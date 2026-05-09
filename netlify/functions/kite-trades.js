import KiteConnect from 'kiteconnect'

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { ...HEADERS, 'Access-Control-Allow-Methods': 'GET,OPTIONS' } })
  }

  const apiKey = process.env.KITE_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'KITE_API_KEY not configured' }), { status: 500, headers: HEADERS })
  }

  const authHeader   = req.headers.get('authorization') ?? ''
  const access_token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!access_token) {
    return new Response(JSON.stringify({ error: 'Authorization: Bearer <token> header required' }), { status: 401, headers: HEADERS })
  }

  try {
    const kc = new KiteConnect.KiteConnect({ api_key: apiKey })
    kc.setAccessToken(access_token)
    const trades = await kc.getTrades()
    return new Response(JSON.stringify(trades), { status: 200, headers: HEADERS })
  } catch (err) {
    console.error('[kite-trades]', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 502, headers: HEADERS })
  }
}

export const config = { path: '/api/kite/trades' }
