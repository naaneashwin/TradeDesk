import { useState, useEffect, useCallback, useRef } from 'react'

const STORAGE_KEY = 'kite-access-token'
const API_KEY     = import.meta.env.VITE_KITE_API_KEY

export function useKite() {
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem(STORAGE_KEY))
  const [portfolio, setPortfolio]     = useState(null) // { positions: { net, day }, margins: { equity, commodity } }
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const sessionExchanged              = useRef(false)
  const [tradeLog, setTradeLog] = useState([]); // Initialize trade log state

  // ── Handle redirect callback from Kite login ──────────────
  useEffect(() => {
    // Guard against React Strict Mode double-invocation — request_token is single-use
    if (sessionExchanged.current) return

    const params       = new URLSearchParams(window.location.search)
    const requestToken = params.get('request_token')
    const action       = params.get('action')

    if (!requestToken || action !== 'login') return

    sessionExchanged.current = true

    // Strip Kite params from URL immediately
    const clean = new URL(window.location.href)
    clean.searchParams.delete('request_token')
    clean.searchParams.delete('action')
    clean.searchParams.delete('type')
    clean.searchParams.delete('status')
    window.history.replaceState({}, '', clean.toString())

    fetch('/api/kite/session', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ request_token: requestToken }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.access_token) {
          localStorage.setItem(STORAGE_KEY, data.access_token)
          setAccessToken(data.access_token)
          setError(null)
          // Redirect to broker page after successful login
          window.location.replace('/tradedesk/broker')
        } else {
          setError(data.error ?? 'Kite login failed')
        }
      })
      .catch(e => {
        setError(e.message)
      })
  }, [])

  // ── Fetch positions + margins ─────────────────────────────
  const fetchPortfolio = useCallback(async (token) => {
    const tok = token ?? accessToken
    if (!tok) return

    setLoading(true)
    setError(null)

    try {
      const res  = await fetch('/api/kite/portfolio', {
        headers: { Authorization: `Bearer ${tok}` },
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem(STORAGE_KEY)
          setAccessToken(null)
          setPortfolio(null)
          setError('Kite session expired — please reconnect.')
          return
        }
        throw new Error(data.error ?? 'Failed to fetch portfolio')
      }

      setPortfolio(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  // Auto-fetch on mount / when token changes
  useEffect(() => {
    if (accessToken) fetchPortfolio(accessToken)
  }, [accessToken]) // eslint-disable-line react-hooks/exhaustive-deps

  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setAccessToken(null)
    setPortfolio(null)
    setError(null)
  }, [])

  const loginUrl = API_KEY
    ? `https://kite.zerodha.com/connect/login?api_key=${API_KEY}&v=3`
    : null

  // ── Trade Log Section ───────────────────────────────────
  const fetchTrades = useCallback(async () => {
    if (!accessToken) {
      setError('Access token is required to fetch trades.');
      return;
    }

    try {
      const response = await fetch('/api/kite/trades', {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch trades');
      }

      const trades = await response.json();

      // Check if trades already exist in the log
      const newTrades = trades.filter(trade => !tradeLog.some(log => log.id === trade.id));

      // Prompt for strategy for new trades
      for (const trade of newTrades) {
        const strategy = prompt(`Select a strategy for trade ${trade.id}:`);
        if (strategy) {
          addTradeToLog({ ...trade, strategy });
        }
      }
    } catch (err) {
      setError(err.message);
    }
  }, [accessToken, tradeLog]);

  const addTradeToLog = useCallback((trade) => {
    setTradeLog(prevLog => [...prevLog, trade]);
  }, []);

  return {
    connected:  !!accessToken,
    portfolio,
    loading,
    error,
    loginUrl,
    disconnect,
    refresh: () => fetchPortfolio(accessToken),
    tradeLog,
    fetchTrades,
    addTradeToLog,
  }
}
