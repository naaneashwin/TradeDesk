const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

export default async function handler(req) {
  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim()

  if (!q || q.length < 1) {
    return new Response(JSON.stringify([]), { status: 200, headers: HEADERS })
  }

  try {
    // Yahoo Finance autocomplete — works from any IP, no auth needed
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&lang=en-IN&region=IN&quotesCount=10&newsCount=0&listsCount=0`,
      { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } }
    )
    if (!res.ok) throw new Error(`Yahoo responded ${res.status}`)
    const json = await res.json()

    const results = (json?.quotes ?? [])
      .filter(item => item.quoteType === 'EQUITY' && (item.exchange === 'NSI' || item.exchange === 'BSE'))
      .slice(0, 10)
      .map(item => ({
        symbol:   (item.symbol ?? '').replace(/\.(NS|BO)$/, ''),
        name:     item.shortname ?? item.longname ?? '',
        exchange: item.exchange === 'NSI' ? 'NSE' : 'BSE',
      }))
      .filter(r => r.symbol)

    return new Response(JSON.stringify(results), { status: 200, headers: HEADERS })
  } catch (err) {
    console.error('[symbols fn]', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 502, headers: HEADERS })
  }
}

export const config = { path: '/api/symbols' }
