import { KiteConnect } from 'kiteconnect'

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...HEADERS,
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization',
      },
    })
  }

  const apiKey = process.env.KITE_API_KEY
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Kite API key not configured on server' }),
      { status: 500, headers: HEADERS }
    )
  }

  const authHeader   = req.headers.get('authorization') ?? ''
  const access_token = authHeader.replace(/^Bearer\s+/i, '').trim()

  if (!access_token) {
    return new Response(
      JSON.stringify({ error: 'Authorization: Bearer <token> header required' }),
      { status: 401, headers: HEADERS }
    )
  }

  try {
    const kc = new KiteConnect({ api_key: apiKey })
    kc.setAccessToken(access_token)

    const [positions, margins, holdings, mfHoldings] = await Promise.all([
      kc.getPositions(),
      kc.getMargins(),
      kc.getHoldings(),
      kc.getMFHoldings().catch(() => []),
    ])

    return new Response(JSON.stringify({ positions, margins, holdings, mfHoldings }), { status: 200, headers: HEADERS })
  } catch (err) {
    console.error('Error fetching Kite portfolio:', err) // Log error details
    const status = err.status === 403 || err.status === 401 ? 401 : 502
    return new Response(JSON.stringify({ error: 'Failed to fetch portfolio' }), { status, headers: HEADERS })
  }
}

export const config = { path: '/api/kite/portfolio' }
