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
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
  }

  const apiKey    = process.env.KITE_API_KEY
  const apiSecret = process.env.KITE_API_SECRET

  if (!apiKey || !apiSecret) {
    return new Response(
      JSON.stringify({ error: 'Kite API credentials not configured on server' }),
      { status: 500, headers: HEADERS }
    )
  }

  let body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: HEADERS })
  }

  const { request_token } = body
  if (!request_token) {
    return new Response(JSON.stringify({ error: 'request_token required' }), { status: 400, headers: HEADERS })
  }

  try {
    const kc      = new KiteConnect({ api_key: apiKey })
    const session = await kc.generateSession(request_token, apiSecret)
    return new Response(JSON.stringify(session), { status: 200, headers: HEADERS })
  } catch (err) {
    console.error('Error generating Kite session:', {
      message: err.message,
      stack: err.stack,
      status: err.status,
    }) // Log detailed error

    return new Response(
      JSON.stringify({
        error: 'Failed to generate session',
        details: err.message,
        stack: err.stack,
        status: err.status,
      }),
      { status: 502, headers: HEADERS }
    )
  }
}

export const config = { path: '/api/kite/session' }
