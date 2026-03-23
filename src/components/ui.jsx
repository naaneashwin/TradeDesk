export const uid = () => Math.random().toString(36).slice(2, 10)
export const fmt = (n, d = 2) => typeof n === 'number' ? n.toFixed(d) : '—'

export function Modal({ title, subtitle, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}
      onClick={onClose}>
      <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: subtitle ? 4 : 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--text-3)', lineHeight: 1 }}>×</button>
        </div>
        {subtitle && <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 20, fontFamily: 'JetBrains Mono, monospace' }}>{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}
