import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [mode,     setMode]     = useState('login')   // 'login' | 'signup'
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [sent,     setSent]     = useState(false)     // email confirmation sent

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // App.jsx auth listener will handle the redirect
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSent(true)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '36px 32px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11,
            background: 'var(--green)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
              <polyline points="16 7 22 7 22 13"/>
            </svg>
          </div>
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>TradeDesk</span>
        </div>

        {/* Title */}
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 28px' }}>
          {mode === 'login'
            ? 'Sign in to your TradeDesk account'
            : 'Start tracking your trades today'}
        </p>

        {/* Confirmation sent */}
        {sent ? (
          <div style={{
            background: 'var(--green-light)',
            border: '1px solid rgba(45,122,95,0.2)',
            borderRadius: 10,
            padding: '16px 18px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: 14, color: 'var(--green)', fontWeight: 600, margin: '0 0 6px' }}>
              Check your inbox
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0 }}>
              We've sent a confirmation link to <strong>{email}</strong>.
              Click it to activate your account, then come back and sign in.
            </p>
            <button
              onClick={() => { setSent(false); setMode('login') }}
              style={{
                marginTop: 16, background: 'none', border: 'none',
                color: 'var(--green)', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}
            >
              Back to sign in →
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Email */}
            <div>
              <label style={{
                display: 'block', fontSize: 12, fontWeight: 600,
                color: 'var(--text-2)', textTransform: 'uppercase',
                letterSpacing: '0.05em', marginBottom: 6,
              }}>
                Email
              </label>
              <input
                type="email"
                className="t-inp"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                style={{ width: '100%' }}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{
                display: 'block', fontSize: 12, fontWeight: 600,
                color: 'var(--text-2)', textTransform: 'uppercase',
                letterSpacing: '0.05em', marginBottom: 6,
              }}>
                Password
              </label>
              <input
                type="password"
                className="t-inp"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                style={{ width: '100%' }}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(220,38,38,0.08)',
                border: '1px solid rgba(220,38,38,0.2)',
                fontSize: 13,
                color: 'var(--red)',
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-green"
              style={{ padding: '11px 0', fontSize: 14, fontWeight: 600, width: '100%', marginTop: 4 }}
            >
              {loading
                ? (mode === 'login' ? 'Signing in…' : 'Creating account…')
                : (mode === 'login' ? 'Sign in' : 'Create account')}
            </button>

            {/* Toggle */}
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-2)', margin: '4px 0 0' }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null) }}
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--green)', fontWeight: 600, fontSize: 13,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
