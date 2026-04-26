import { useState, useEffect, useRef } from 'react'
import { Modal, uid } from './ui'

const STATUS_OPTS = [
  { v: 'watching', label: 'Watching',  bg: 'rgba(59,130,246,0.10)',  color: '#3b82f6',      border: 'rgba(59,130,246,0.3)' },
  { v: 'entered',  label: 'Entered',   bg: 'rgba(45,122,95,0.10)',   color: 'var(--green)', border: 'rgba(45,122,95,0.3)' },
  { v: 'missed',   label: 'Missed',    bg: 'rgba(245,158,11,0.10)',  color: '#d97706',      border: 'rgba(245,158,11,0.3)' },
  { v: 'removed',  label: 'Removed',   bg: 'rgba(107,114,128,0.10)', color: 'var(--text-3)', border: 'var(--border)' },
]
const statusMeta = s => STATUS_OPTS.find(x => x.v === s) ?? STATUS_OPTS[0]

function StatusPill({ status, onClick }) {
  const m = statusMeta(status)
  return (
    <span onClick={onClick} style={{
      fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap',
      background: m.bg, color: m.color, border: `1px solid ${m.border}`,
      cursor: onClick ? 'pointer' : 'default',
    }}>{m.label.toUpperCase()}</span>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

function WatchlistModal({ item, onSave, onClose }) {
  const isEdit = !!item
  const [form, setForm] = useState({
    symbol:     isEdit ? item.symbol     : '',
    reason:     isEdit ? item.reason     : '',
    entryNotes: isEdit ? item.entryNotes : '',
    target:     isEdit ? (item.target != null ? String(item.target) : '') : '',
    stop:       isEdit ? (item.stop   != null ? String(item.stop)   : '') : '',
    status:     isEdit ? item.status     : 'watching',
    tags:       isEdit ? item.tags.join(', ') : '',
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const save = () => {
    if (!form.symbol.trim()) return
    onSave({
      id:         isEdit ? item.id : uid(),
      symbol:     form.symbol.trim().toUpperCase(),
      reason:     form.reason.trim(),
      entryNotes: form.entryNotes.trim(),
      target:     parseFloat(form.target) || null,
      stop:       parseFloat(form.stop)   || null,
      status:     form.status,
      tags:       form.tags.split(',').map(t => t.trim()).filter(Boolean),
      addedAt:    isEdit ? item.addedAt : new Date().toISOString().slice(0, 10),
    })
  }

  return (
    <Modal title={isEdit ? `Edit — ${item.symbol}` : 'Add to Watchlist'} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        <Field label="Symbol">
          <input className="t-inp font-mono" style={{ textTransform: 'uppercase' }} value={form.symbol} onChange={e => set('symbol', e.target.value)} placeholder="e.g. RELIANCE" autoFocus={!isEdit}/>
        </Field>
        <Field label="Status">
          <select className="t-inp" value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUS_OPTS.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Target Price (₹)">
          <input type="number" className="t-inp font-mono" value={form.target} onChange={e => set('target', e.target.value)} placeholder="0.00"/>
        </Field>
        <Field label="Stop / Invalidation (₹)">
          <input type="number" className="t-inp font-mono" value={form.stop} onChange={e => set('stop', e.target.value)} placeholder="0.00"/>
        </Field>
      </div>
      <Field label="Why I Added (Reason / Setup)">
        <textarea className="t-inp" style={{ height: 72, resize: 'vertical', marginBottom: 14 }} value={form.reason} onChange={e => set('reason', e.target.value)} placeholder="What pattern, news, or thesis caught your eye?"/>
      </Field>
      <Field label="Entry Notes (When to Enter)">
        <textarea className="t-inp" style={{ height: 60, resize: 'vertical', marginBottom: 14 }} value={form.entryNotes} onChange={e => set('entryNotes', e.target.value)} placeholder="e.g. Enter on breakout above ₹2400 on strong volume"/>
      </Field>
      <Field label="Tags (comma separated)">
        <input className="t-inp" value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="e.g. breakout, sectoral, earnings" style={{ marginBottom: 20 }}/>
      </Field>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn-outline" style={{ padding: '9px 20px' }} onClick={onClose}>Cancel</button>
        <button className="btn-green" style={{ padding: '9px 22px' }} onClick={save}>{isEdit ? 'Update' : 'Add to Watchlist'}</button>
      </div>
    </Modal>
  )
}

function WatchlistCard({ item, onEdit, onDelete, onStatusCycle, onLogTrade }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const riskReward = item.target && item.stop
    ? ((item.target - item.stop) / Math.abs(item.stop)).toFixed(1)
    : null

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20,
      display: 'flex', flexDirection: 'column', gap: 12,
      opacity: item.status === 'removed' ? 0.55 : 1,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>{item.symbol}</span>
            <StatusPill status={item.status} onClick={onStatusCycle}/>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Added {item.addedAt}</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {item.status === 'entered' && (
            <button onClick={onLogTrade} style={{ background: 'var(--green)', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, color: '#fff', fontWeight: 700, whiteSpace: 'nowrap' }}>Log Trade</button>
          )}
          <button onClick={onEdit} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, color: 'var(--text-2)' }}>Edit</button>
          {!showConfirm
            ? <button onClick={() => setShowConfirm(true)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, color: 'var(--red)' }}>✕</button>
            : <button onClick={onDelete} style={{ background: 'var(--red)', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, color: '#fff', fontWeight: 700 }}>Confirm?</button>
          }
        </div>
      </div>

      {/* Price levels */}
      {(item.target || item.stop) && (
        <div style={{ display: 'flex', gap: 12 }}>
          {item.target && (
            <div style={{ flex: 1, background: 'rgba(45,122,95,0.07)', border: '1px solid rgba(45,122,95,0.2)', borderRadius: 8, padding: '8px 12px' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 3px' }}>Target</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--green)', margin: 0, fontFamily: 'JetBrains Mono, monospace' }}>₹{item.target}</p>
            </div>
          )}
          {item.stop && (
            <div style={{ flex: 1, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '8px 12px' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 3px' }}>Stop</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--red)', margin: 0, fontFamily: 'JetBrains Mono, monospace' }}>₹{item.stop}</p>
            </div>
          )}
          {riskReward && (
            <div style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 3px' }}>R:R</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0, fontFamily: 'JetBrains Mono, monospace' }}>{riskReward}x</p>
            </div>
          )}
        </div>
      )}

      {/* Reason */}
      {item.reason && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Reason</p>
          <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.5 }}>{item.reason}</p>
        </div>
      )}

      {/* Entry notes */}
      {item.entryNotes && (
        <div style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, padding: '10px 12px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>When to enter</p>
          <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.5 }}>{item.entryNotes}</p>
        </div>
      )}

      {/* Tags */}
      {item.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {item.tags.map(t => (
            <span key={t} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>#{t}</span>
          ))}
        </div>
      )}
    </div>
  )
}

const STATUS_ORDER = ['watching', 'entered', 'missed', 'removed']
const cycleStatus = s => STATUS_ORDER[(STATUS_ORDER.indexOf(s) + 1) % STATUS_ORDER.length]

export default function Watchlist({ items, onUpsert, onDelete }) {
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    const h = () => setShowModal(true)
    document.addEventListener('td:new-watchlist', h)
    return () => document.removeEventListener('td:new-watchlist', h)
  }, [])

  const filtered = items.filter(item => {
    const matchSearch = !search || item.symbol.includes(search.toUpperCase()) || item.reason.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || item.status === statusFilter
    return matchSearch && matchStatus
  })

  const handleSave = (data) => {
    onUpsert(data)
    setShowModal(false)
    setEditItem(null)
  }

  const handleEdit = (item) => {
    setEditItem(item)
    setShowModal(true)
  }

  const handleClose = () => {
    setShowModal(false)
    setEditItem(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search symbols or notes…"
          style={{ flex: 1, minWidth: 180, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text)', background: 'var(--surface-2)', outline: 'none', fontFamily: 'Inter, sans-serif' }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', ...STATUS_ORDER].map(v => {
            const m = v === 'all' ? null : statusMeta(v)
            const active = statusFilter === v
            return (
              <button key={v} onClick={() => setStatusFilter(v)} style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                background: active ? (m?.bg ?? 'var(--green)') : 'var(--surface-2)',
                color: active ? (m?.color ?? '#fff') : 'var(--text-2)',
                border: `1px solid ${active ? (m?.border ?? 'var(--green)') : 'var(--border)'}`,
              }}>
                {v === 'all' ? 'All' : m.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Stats bar */}
      {items.length > 0 && (
        <div style={{ display: 'flex', gap: 16 }}>
          {STATUS_OPTS.map(s => {
            const count = items.filter(i => i.status === s.v).length
            if (!count) return null
            return (
              <div key={s.v} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{count}</span>
                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{s.label}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '64px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
          {items.length === 0 ? 'Your watchlist is empty. Press N or click "Add to Watchlist" to start.' : 'No matches for your filters.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {filtered.map(item => (
            <WatchlistCard
              key={item.id}
              item={item}
              onEdit={() => handleEdit(item)}
              onDelete={() => onDelete(item.id)}
              onStatusCycle={() => onUpsert({ ...item, status: cycleStatus(item.status) })}
              onLogTrade={() => document.dispatchEvent(new CustomEvent('td:prefill-log', { detail: { instrument: item.symbol, planTarget: item.target, planStop: item.stop, planThesis: item.reason } }))}
            />
          ))}
        </div>
      )}

      {showModal && (
        <WatchlistModal
          item={editItem}
          onSave={handleSave}
          onClose={handleClose}
        />
      )}
    </div>
  )
}
