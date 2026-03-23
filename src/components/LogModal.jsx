import { useState } from 'react'
import { Modal, uid } from './ui'

export default function LogModal({ strategy, onSave, onClose, variant, score }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    instrument: '', direction: 'long',
    entryPrice: '', exitPrice: '', qty: '',
    outcome: 'win', pnl: '', notes: ''
  })

  const f = (k, v) => setForm(p => {
    const n = { ...p, [k]: v }
    if (['entryPrice', 'exitPrice', 'qty', 'direction'].includes(k) && n.entryPrice && n.exitPrice && n.qty) {
      const pnl = (parseFloat(n.exitPrice) - parseFloat(n.entryPrice)) * parseFloat(n.qty) * (n.direction === 'short' ? -1 : 1)
      return { ...n, pnl: pnl.toFixed(2), outcome: pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'breakeven' }
    }
    return n
  })

  const save = () => {
    if (!form.instrument.trim()) return
    onSave({ id: uid(), strategyId: strategy.id, variant, checklistScore: score, ...form,
      entryPrice: parseFloat(form.entryPrice) || 0, exitPrice: parseFloat(form.exitPrice) || 0,
      qty: parseFloat(form.qty) || 0, pnl: parseFloat(form.pnl) || 0 })
  }

  const pnlVal = parseFloat(form.pnl)
  const pnlCol = pnlVal > 0 ? 'var(--green)' : pnlVal < 0 ? 'var(--red)' : 'var(--text)'

  return (
    <Modal title="Log Trade" subtitle={`${strategy.name}${variant ? ` · ${variant.toUpperCase()}` : ''} · Checklist ${score.done}/${score.total}`} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Field label="Date"><input type="date" className="t-inp" value={form.date} onChange={e => f('date', e.target.value)}/></Field>
        <Field label="Instrument"><input type="text" className="t-inp" value={form.instrument} onChange={e => f('instrument', e.target.value)} placeholder="e.g. RELIANCE"/></Field>
        <Field label="Direction">
          <select className="t-inp" value={form.direction} onChange={e => f('direction', e.target.value)}>
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </Field>
        <Field label="Quantity"><input type="number" className="t-inp font-mono" value={form.qty} onChange={e => f('qty', e.target.value)} placeholder="0"/></Field>
        <Field label="Entry Price (₹)"><input type="number" className="t-inp font-mono" value={form.entryPrice} onChange={e => f('entryPrice', e.target.value)} placeholder="0.00"/></Field>
        <Field label="Exit Price (₹)"><input type="number" className="t-inp font-mono" value={form.exitPrice} onChange={e => f('exitPrice', e.target.value)} placeholder="0.00"/></Field>
        <Field label="Outcome">
          <select className="t-inp" value={form.outcome} onChange={e => f('outcome', e.target.value)}>
            <option value="win">Win</option>
            <option value="loss">Loss</option>
            <option value="breakeven">Breakeven</option>
          </select>
        </Field>
        <Field label="P&L (₹)"><input type="number" className="t-inp font-mono" style={{ color: pnlCol }} value={form.pnl} onChange={e => f('pnl', e.target.value)} placeholder="0.00"/></Field>
      </div>
      <Field label="Notes">
        <textarea className="t-inp" style={{ height: 72, resize: 'vertical', marginBottom: 20 }} value={form.notes} onChange={e => f('notes', e.target.value)} placeholder="What went right? What went wrong?"/>
      </Field>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn-outline" style={{ padding: '9px 20px' }} onClick={onClose}>Cancel</button>
        <button className="btn-green" style={{ padding: '9px 22px' }} onClick={save}>Save Trade</button>
      </div>
    </Modal>
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
