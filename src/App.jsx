import { useState, useEffect, useRef } from 'react'
import { getStrategies, upsertStrategy, deleteStrategy, getTrades, insertTrade, deleteTrade } from './lib/db'
import { BUILT_IN_SECTIONS } from './data/strategies'

// ── Themes ────────────────────────────────────────────────────
const D = { app:'#0f0f0d', card:'#1c1c1a', card2:'#252522', text:'#e8e6de', t2:'#9c9a92', b:'rgba(255,255,255,0.08)', b2:'rgba(255,255,255,0.16)', inp:'#252522' }
const L = { app:'#f0efe9', card:'#ffffff',  card2:'#eceae2', text:'#1a1a18', t2:'#5f5e5a', b:'rgba(0,0,0,0.09)', b2:'rgba(0,0,0,0.20)', inp:'#eae8e0' }
const COL = {
  purple:['#26215C','#CECBF6'], indigo:['#1E1D52','#AFA9EC'], blue:['#042C53','#B5D4F4'],
  teal:  ['#04342C','#9FE1CB'], amber: ['#412402','#FAC775'], coral:['#4A1B0C','#F0997B'],
  red:   ['#501313','#F7C1C1'], green: ['#173404','#C0DD97'], gray: ['#2C2C2A','#D3D1C7'],
}

const mkS = th => ({
  card:  { background:th.card, border:`1px solid ${th.b}`, borderRadius:12, padding:'16px 20px', marginBottom:12 },
  inp:   { background:th.inp, border:`1px solid ${th.b2}`, borderRadius:8, color:th.text, padding:'8px 12px', fontSize:13, width:'100%', outline:'none', boxSizing:'border-box' },
  btn:   { background:'#1D9E75', border:'none', borderRadius:8, color:'#fff', padding:'8px 16px', fontSize:13, fontWeight:500, cursor:'pointer' },
  ghost: { background:'none', border:`1px solid ${th.b2}`, borderRadius:8, color:th.t2, padding:'7px 14px', fontSize:13, cursor:'pointer' },
  lbl:   { fontSize:12, color:th.t2, marginBottom:4, display:'block' },
  secW:  { border:`1px solid ${th.b}`, borderRadius:10, overflow:'hidden', marginBottom:12 },
  note:  { fontSize:11, color:th.t2, background:th.card2, borderRadius:4, padding:'3px 8px', marginTop:5, display:'inline-block' },
})

const uid = () => Math.random().toString(36).slice(2, 10)
const fmt = (n, d=2) => typeof n === 'number' ? n.toFixed(d) : '—'

const Tick = () => (
  <svg width="10" height="7" viewBox="0 0 10 7" fill="none">
    <path d="M1 3.5L3.5 6L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const Pill = ({ col, fc, children }) => (
  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10, background:col, color:fc, whiteSpace:'nowrap' }}>
    {children}
  </span>
)

function Modal({ title, subtitle, onClose, children, th }) {
  const s = mkS(th)
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:16 }} onClick={onClose}>
      <div style={{ ...s.card, width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto', marginBottom:0 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize:16, fontWeight:600, color:th.text, marginBottom:subtitle?2:16 }}>{title}</div>
        {subtitle && <div style={{ fontSize:13, color:th.t2, marginBottom:16 }}>{subtitle}</div>}
        {children}
      </div>
    </div>
  )
}

// Merge DB strategy with built-in section definitions
function hydrateStrategy(dbStrategy) {
  return {
    ...dbStrategy,
    sections: BUILT_IN_SECTIONS[dbStrategy.id] ?? dbStrategy.sections ?? [],
  }
}

// ── App ───────────────────────────────────────────────────────
export default function App() {
  const [isDark, setDark] = useState(true)
  const th = isDark ? D : L
  const s  = mkS(th)
  const [tab, setTab]       = useState('library')
  const [strats, setStrats] = useState([])
  const [trades, setTrades] = useState([])
  const [active, setActive] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState('idle')
  const impRef = useRef(null)

  useEffect(() => {
    Promise.all([getStrategies(), getTrades()])
      .then(([sv, tv]) => { setStrats(sv.map(hydrateStrategy)); setTrades(tv) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const withSync = fn => async (...args) => {
    setSyncStatus('saving')
    try { await fn(...args); setSyncStatus('saved') }
    catch { setSyncStatus('error') }
    setTimeout(() => setSyncStatus('idle'), 2000)
  }

  const handleUpsertStrategy = withSync(async st => {
    await upsertStrategy(st)
    setStrats(prev => {
      const idx = prev.findIndex(x => x.id === st.id)
      return idx >= 0 ? prev.map(x => x.id === st.id ? st : x) : [...prev, st]
    })
  })

  const handleDeleteStrategy = withSync(async id => {
    await deleteStrategy(id)
    setStrats(prev => prev.filter(x => x.id !== id))
  })

  const handleInsertTrade = withSync(async trade => {
    await insertTrade(trade)
    setTrades(prev => [trade, ...prev])
  })

  const handleDeleteTrade = withSync(async id => {
    await deleteTrade(id)
    setTrades(prev => prev.filter(t => t.id !== id))
  })

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ strats, trades }, null, 2)], { type:'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'tradedeck-backup.json'; a.click()
    URL.revokeObjectURL(url)
  }

  const importData = e => {
    const file = e.target.files[0]; if (!file) return
    const r = new FileReader()
    r.onload = ev => {
      try {
        const d = JSON.parse(ev.target.result)
        if (d.strats) d.strats.forEach(handleUpsertStrategy)
        if (d.trades) d.trades.forEach(handleInsertTrade)
      } catch {}
    }
    r.readAsText(file); e.target.value = ''
  }

  if (loading) return (
    <div style={{ background:th.app, minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:th.t2, fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      Loading…
    </div>
  )

  const syncColor = { saving:'#FAC775', saved:'#9FE1CB', error:'#F7C1C1', idle:th.t2 }[syncStatus]
  const syncLabel = { saving:'Saving…', saved:'Saved ✓', error:'Save error', idle:'Supabase ✓' }[syncStatus]
  const tabs = [['library','Strategies'],['checklist','Checklist'],['journal','Journal'],['stats','Stats']]

  return (
    <div style={{ background:th.app, minHeight:'100vh', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', color:th.text }}>
      {/* Header */}
      <div style={{ background:th.card, borderBottom:`1px solid ${th.b}`, padding:'0 16px', display:'flex', alignItems:'center', position:'sticky', top:0, zIndex:50, gap:4 }}>
        <span style={{ fontWeight:700, fontSize:15, padding:'14px 0', color:th.text, flexShrink:0, marginRight:6 }}>📈 TradeDesk</span>
        <div style={{ display:'flex', flex:1, overflowX:'auto' }}>
          {tabs.map(([id, label]) => {
            const dis = id === 'checklist' && !active
            return (
              <button key={id} onClick={() => !dis && setTab(id)} style={{ background:'none', border:'none', padding:'14px 10px', fontSize:13, fontWeight:500, cursor:dis?'not-allowed':'pointer', color:tab===id?th.text:th.t2, borderBottom:tab===id?'2px solid #1D9E75':'2px solid transparent', opacity:dis?0.35:1, whiteSpace:'nowrap', flexShrink:0 }}>
                {label}
              </button>
            )
          })}
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center', paddingLeft:6, flexShrink:0 }}>
          <span style={{ fontSize:11, color:syncColor, transition:'color 0.3s' }}>{syncLabel}</span>
          <button style={{ ...s.ghost, fontSize:11, padding:'5px 10px' }} onClick={exportData}>↓ Export</button>
          <button style={{ ...s.ghost, fontSize:11, padding:'5px 10px' }} onClick={() => impRef.current.click()}>↑ Import</button>
          <input ref={impRef} type="file" accept=".json" style={{ display:'none' }} onChange={importData}/>
          <button onClick={() => setDark(d => !d)} style={{ background:'none', border:`1px solid ${th.b2}`, borderRadius:20, padding:'5px 11px', cursor:'pointer', fontSize:15, lineHeight:1, color:th.t2 }}>
            {isDark ? '☀' : '🌙'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth:800, margin:'0 auto', padding:'24px 16px 80px' }}>
        {tab === 'library'    && <Library th={th} s={s} strats={strats} trades={trades} onOpen={st => { setActive(st); setTab('checklist') }} onUpsert={handleUpsertStrategy} onDelete={handleDeleteStrategy} />}
        {tab === 'checklist'  && active && <Checklist th={th} s={s} strategy={active} onLogTrade={handleInsertTrade} />}
        {tab === 'journal'    && <Journal th={th} s={s} trades={trades} strats={strats} onDelete={handleDeleteTrade} />}
        {tab === 'stats'      && <StatsView th={th} s={s} trades={trades} strats={strats} />}
      </div>
    </div>
  )
}

// ── Library ───────────────────────────────────────────────────
function Library({ th, s, strats, trades, onOpen, onUpsert, onDelete }) {
  const [modal, setModal] = useState(false)
  const [form, setForm]   = useState({ name:'', desc:'' })
  const f = k => e => setForm(p => ({ ...p, [k]:e.target.value }))

  const add = () => {
    if (!form.name.trim()) return
    const newStrat = { id:uid(), name:form.name, desc:form.desc, active:true, variants:[], totals:{}, sections:[] }
    onUpsert(newStrat)
    setForm({ name:'', desc:'' }); setModal(false)
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:600, color:th.text }}>My Strategies</div>
          <div style={{ fontSize:13, color:th.t2, marginTop:2 }}>{strats.filter(x => x.active).length} active · {strats.length} total</div>
        </div>
        <button style={s.btn} onClick={() => setModal(true)}>+ Add Strategy</button>
      </div>

      {strats.map(st => {
        const tt = trades.filter(t => t.strategyId === st.id)
        const wr = tt.length ? Math.round(tt.filter(t => t.outcome === 'win').length / tt.length * 100) : null
        return (
          <div key={st.id} style={{ ...s.card, cursor:'pointer' }} onClick={() => onOpen(st)}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                  <span style={{ fontSize:16, fontWeight:600, color:th.text }}>{st.name}</span>
                  <Pill col={st.active ? '#04342C' : 'rgba(255,255,255,0.06)'} fc={st.active ? '#9FE1CB' : th.t2}>{st.active ? 'Active' : 'Inactive'}</Pill>
                  {st.variants?.length > 0 && <span style={{ fontSize:11, color:th.t2 }}>{st.variants.length} variants</span>}
                </div>
                {st.desc && <div style={{ fontSize:13, color:th.t2, marginBottom:8 }}>{st.desc}</div>}
                <div style={{ display:'flex', gap:16, fontSize:12, color:th.t2 }}>
                  <span>{tt.length} trades</span>
                  {wr !== null && <span>Win rate: <span style={{ color:wr>=50?'#9FE1CB':'#F7C1C1' }}>{wr}%</span></span>}
                </div>
              </div>
              <div style={{ display:'flex', gap:8, flexShrink:0 }} onClick={e => e.stopPropagation()}>
                <button style={{ ...s.ghost, fontSize:12, padding:'5px 12px' }} onClick={() => onUpsert({ ...st, active:!st.active })}>
                  {st.active ? 'Deactivate' : 'Activate'}
                </button>
                <button style={{ ...s.btn, fontSize:12, padding:'6px 14px' }} onClick={() => onOpen(st)}>Open →</button>
              </div>
            </div>
          </div>
        )
      })}

      {modal && (
        <Modal title="New Strategy" th={th} onClose={() => setModal(false)}>
          <label style={s.lbl}>Strategy name</label>
          <input style={{ ...s.inp, marginBottom:12 }} value={form.name} onChange={f('name')} placeholder="e.g. Moving Average Crossover"/>
          <label style={s.lbl}>Description (optional)</label>
          <textarea style={{ ...s.inp, resize:'vertical', height:72, marginBottom:16 }} value={form.desc} onChange={f('desc')} placeholder="Brief description"/>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button style={s.ghost} onClick={() => setModal(false)}>Cancel</button>
            <button style={s.btn} onClick={add}>Create Strategy</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Checklist ─────────────────────────────────────────────────
function Checklist({ th, s, strategy, onLogTrade }) {
  const [variant, setVariant] = useState(strategy.variants?.[0]?.id ?? null)
  const [chk, setChk]         = useState({})
  const [exp, setExp]         = useState({})
  const [entry, setEntry]     = useState('')
  const [atr, setAtr]         = useState('')
  const [logModal, setLogModal] = useState(false)

  const toggle    = id => setChk(c => ({ ...c, [id]:!c[id] }))
  const toggleExp = id => setExp(e => ({ ...e, [id]:!e[id] }))
  const reset     = ()  => { setChk({}); setEntry(''); setAtr(''); setExp({}) }

  const allIds      = (strategy.sections ?? []).flatMap(sec => sec.items.filter(i => i.detail).map(i => i.id))
  const allExpanded = allIds.length > 0 && allIds.every(id => exp[id])
  const toggleAll   = () => allExpanded ? setExp({}) : setExp(Object.fromEntries(allIds.map(id => [id, true])))

  const visItems = (strategy.sections ?? []).filter(sec => !sec.ref).flatMap(sec => sec.items.filter(i => !i.v || i.v === variant))
  const done     = visItems.filter(i => chk[i.id]).length
  const total    = strategy.totals?.[variant] ?? visItems.length
  const pct      = total ? Math.round(done / total * 100) : 0
  const vCol     = pct === 100 ? ['#04342C','#9FE1CB'] : pct >= 60 ? ['#412402','#FAC775'] : ['#501313','#F7C1C1']
  const vTxt     = pct === 100 ? `✓ All ${total} checks passed — valid to enter` : pct >= 85 ? 'Almost there — review remaining checks carefully' : pct >= 60 ? 'Several checks missing — do not enter yet' : 'Too many checks missing — skip this trade'

  const eN = parseFloat(entry), aN = parseFloat(atr)
  let atrR = null
  if (eN > 0 && aN > 0) { const d = 1.5*aN, p = d/eN*100; atrR = { sl:(eN-d).toFixed(2), dist:d.toFixed(2), pct:p.toFixed(2), pass:p<=5 } }

  const vColMap = { a:'purple', b:'amber', c:'teal', d:'blue' }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16, gap:10, flexWrap:'wrap' }}>
        <div>
          <div style={{ fontSize:20, fontWeight:600, color:th.text }}>{strategy.name}</div>
          {strategy.desc && <div style={{ fontSize:13, color:th.t2, marginTop:2 }}>{strategy.desc}</div>}
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button style={{ ...s.ghost, fontSize:12, padding:'6px 12px' }} onClick={toggleAll}>{allExpanded ? 'Collapse All ▲' : 'Expand All ▼'}</button>
          <button style={{ ...s.ghost, fontSize:12, padding:'6px 12px' }} onClick={reset}>Reset</button>
          <button style={s.btn} onClick={() => setLogModal(true)}>Log Trade</button>
        </div>
      </div>

      {strategy.variants?.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12, color:th.t2, marginBottom:8, fontWeight:500 }}>Select breakout type:</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {strategy.variants.map(v => {
              const col = COL[v.col] ?? COL.purple, on = variant === v.id
              return <button key={v.id} onClick={() => setVariant(v.id)} style={{ fontSize:12, fontWeight:500, padding:'7px 16px', borderRadius:20, cursor:'pointer', border:`1px solid ${on ? col[1] : th.b2}`, background:on ? col[0] : 'none', color:on ? col[1] : th.t2 }}>{v.label}</button>
            })}
          </div>
        </div>
      )}

      {(strategy.sections ?? []).map(sec => {
        const sc  = sec.variantSec ? (COL[vColMap[variant] ?? 'purple'] ?? COL.purple) : (COL[sec.col] ?? COL.gray)
        const vis = sec.items.filter(i => !i.v || i.v === variant)
        if (!vis.length) return null
        return (
          <div key={sec.id} style={s.secW}>
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 16px', fontSize:13, fontWeight:500, background:sc[0], color:sc[1] }}>
              <div style={{ width:20, height:20, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0, background:sc[1], color:sc[0] }}>{sec.n}</div>
              <span style={{ flex:1 }}>{sec.title}</span>
              {sec.ref && <span style={{ fontSize:10, padding:'1px 8px', borderRadius:10, border:`1px solid ${sc[1]}55`, opacity:0.75 }}>reference — not counted</span>}
            </div>
            {vis.map(item => {
              const isChk = chk[item.id], isExp = exp[item.id]
              return (
                <div key={item.id} style={{ display:'flex', gap:12, padding:'10px 16px', borderTop:`1px solid ${th.b}`, background:isChk && !sec.ref ? 'rgba(29,158,117,0.07)' : th.card, transition:'background 0.15s' }}>
                  {sec.ref
                    ? <div style={{ width:6, height:6, borderRadius:'50%', background:th.b2, marginTop:7, flexShrink:0 }}/>
                    : <div style={{ width:18, height:18, minWidth:18, borderRadius:4, border:`1.5px solid ${isChk ? '#1D9E75' : th.b2}`, display:'flex', alignItems:'center', justifyContent:'center', marginTop:2, flexShrink:0, cursor:'pointer', background:isChk ? '#1D9E75' : 'transparent', transition:'all 0.15s' }} onClick={() => toggle(item.id)}>
                        {isChk && <Tick/>}
                      </div>
                  }
                  <div style={{ flex:1, cursor:item.detail ? 'pointer' : 'default' }} onClick={() => item.detail && toggleExp(item.id)}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                      <div style={{ fontSize:14, fontWeight:500, lineHeight:1.4, color:isChk && !sec.ref ? '#9FE1CB' : th.text }}>{item.label}</div>
                      {item.detail && <span style={{ fontSize:11, color:th.t2, flexShrink:0, marginTop:2, opacity:0.7 }}>{isExp ? '▲' : '▼'}</span>}
                    </div>
                    {isExp && item.detail && <div style={{ fontSize:12, color:th.t2, marginTop:5, lineHeight:1.6 }}>{item.detail}</div>}
                    {item.note && <div style={s.note}>{item.note}</div>}
                    {sec.atrCalc && (
                      <div style={{ background:th.card2, borderRadius:8, padding:12, marginTop:10, border:`1px solid ${th.b}` }} onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize:12, fontWeight:500, marginBottom:10, color:th.text }}>ATR Stop Loss Calculator</div>
                        <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:8 }}>
                          <div><label style={s.lbl}>Entry price (₹)</label><input style={{ ...s.inp, width:140 }} type="number" placeholder="e.g. 500" value={entry} onChange={e => setEntry(e.target.value)}/></div>
                          <div><label style={s.lbl}>ATR(14) value (₹)</label><input style={{ ...s.inp, width:140 }} type="number" placeholder="e.g. 12" value={atr} onChange={e => setAtr(e.target.value)}/></div>
                        </div>
                        {atrR
                          ? <div style={{ fontSize:13, fontWeight:500, padding:'8px 12px', borderRadius:6, background:atrR.pass ? '#04342C' : '#501313', color:atrR.pass ? '#9FE1CB' : '#F7C1C1' }}>
                              SL = ₹{atrR.sl} | Distance = ₹{atrR.dist} ({atrR.pct}%) {atrR.pass ? '✓ Within 5% — valid stop' : '✗ Exceeds 5% — skip'}
                            </div>
                          : <div style={{ fontSize:12, color:th.t2 }}>Enter entry price and ATR value to calculate.</div>
                        }
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}

      <div style={{ ...s.card, display:'flex', alignItems:'center', gap:16, marginTop:4 }}>
        <div>
          <div style={{ fontSize:12, color:th.t2 }}>Checks passed</div>
          <div style={{ fontSize:22, fontWeight:700, color:th.text }}>{done} / {total}</div>
        </div>
        <div style={{ flex:1, height:8, background:th.b, borderRadius:4, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${pct}%`, background:'#1D9E75', borderRadius:4, transition:'width 0.3s' }}/>
        </div>
        <span style={{ fontSize:13, color:th.t2 }}>{pct}%</span>
        <button style={{ ...s.ghost, fontSize:12, padding:'5px 12px' }} onClick={reset}>Reset</button>
      </div>
      <div style={{ textAlign:'center', padding:'10px 16px', borderRadius:10, border:`1px solid ${th.b}`, background:vCol[0], color:vCol[1], fontSize:13, fontWeight:500, marginBottom:16 }}>{vTxt}</div>

      {logModal && <LogModal th={th} s={s} strategy={strategy} onSave={trade => { onLogTrade(trade); setLogModal(false) }} onClose={() => setLogModal(false)} variant={variant} score={{ done, total }}/>}
    </div>
  )
}

// ── Log Trade Modal ───────────────────────────────────────────
function LogModal({ th, s, strategy, onSave, onClose, variant, score }) {
  const [form, setForm] = useState({ date:new Date().toISOString().slice(0,10), instrument:'', direction:'long', entryPrice:'', exitPrice:'', qty:'', outcome:'win', pnl:'', notes:'' })
  const f = (k, v) => setForm(p => {
    const n = { ...p, [k]:v }
    if (['entryPrice','exitPrice','qty','direction'].includes(k) && n.entryPrice && n.exitPrice && n.qty) {
      const pnl = (parseFloat(n.exitPrice) - parseFloat(n.entryPrice)) * parseFloat(n.qty) * (n.direction === 'short' ? -1 : 1)
      return { ...n, pnl:pnl.toFixed(2), outcome:pnl>0?'win':pnl<0?'loss':'breakeven' }
    }
    return n
  })
  const save = () => {
    if (!form.instrument.trim()) return
    onSave({ id:uid(), strategyId:strategy.id, variant, checklistScore:score, ...form, entryPrice:parseFloat(form.entryPrice)||0, exitPrice:parseFloat(form.exitPrice)||0, qty:parseFloat(form.qty)||0, pnl:parseFloat(form.pnl)||0 })
  }
  return (
    <Modal title="Log Trade" subtitle={`${strategy.name}${variant ? ` · Type ${variant.toUpperCase()}` : ''} · Checklist: ${score.done}/${score.total}`} th={th} onClose={onClose}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
        <div><label style={s.lbl}>Date</label><input type="date" style={s.inp} value={form.date} onChange={e => f('date',e.target.value)}/></div>
        <div><label style={s.lbl}>Instrument</label><input type="text" style={s.inp} value={form.instrument} onChange={e => f('instrument',e.target.value)} placeholder="e.g. RELIANCE"/></div>
        <div><label style={s.lbl}>Direction</label>
          <select style={s.inp} value={form.direction} onChange={e => f('direction',e.target.value)}>
            <option value="long">Long</option><option value="short">Short</option>
          </select>
        </div>
        <div><label style={s.lbl}>Quantity</label><input type="number" style={s.inp} value={form.qty} onChange={e => f('qty',e.target.value)} placeholder="0"/></div>
        <div><label style={s.lbl}>Entry Price (₹)</label><input type="number" style={s.inp} value={form.entryPrice} onChange={e => f('entryPrice',e.target.value)} placeholder="0.00"/></div>
        <div><label style={s.lbl}>Exit Price (₹)</label><input type="number" style={s.inp} value={form.exitPrice} onChange={e => f('exitPrice',e.target.value)} placeholder="0.00"/></div>
        <div><label style={s.lbl}>Outcome</label>
          <select style={s.inp} value={form.outcome} onChange={e => f('outcome',e.target.value)}>
            <option value="win">Win</option><option value="loss">Loss</option><option value="breakeven">Breakeven</option>
          </select>
        </div>
        <div><label style={s.lbl}>P&L (₹)</label>
          <input type="number" style={{ ...s.inp, color:parseFloat(form.pnl)>0?'#9FE1CB':parseFloat(form.pnl)<0?'#F7C1C1':th.text }} value={form.pnl} onChange={e => f('pnl',e.target.value)} placeholder="0.00"/>
        </div>
      </div>
      <label style={s.lbl}>Notes</label>
      <textarea style={{ ...s.inp, resize:'vertical', height:72, marginBottom:16 }} value={form.notes} onChange={e => f('notes',e.target.value)} placeholder="What went right? What went wrong?"/>
      <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <button style={s.ghost} onClick={onClose}>Cancel</button>
        <button style={s.btn} onClick={save}>Save Trade</button>
      </div>
    </Modal>
  )
}

// ── Journal ───────────────────────────────────────────────────
function Journal({ th, s, trades, strats, onDelete }) {
  const [filter, setFilter]   = useState('all')
  const [toDelete, setToDelete] = useState(null)
  const sm     = Object.fromEntries(strats.map(st => [st.id, st]))
  const sorted = [...trades].filter(t => filter === 'all' || t.strategyId === filter).sort((a,b) => new Date(b.date) - new Date(a.date))
  return (
    <div>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:20, fontWeight:600, color:th.text }}>Trade Journal</div>
        <div style={{ fontSize:13, color:th.t2, marginTop:2 }}>{trades.length} trades logged</div>
      </div>
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {[['all','All'], ...strats.map(st => [st.id, st.name])].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} style={{ ...s.ghost, fontSize:12, padding:'5px 12px', color:filter===id?th.text:th.t2, background:filter===id?th.card2:'none' }}>{label}</button>
        ))}
      </div>
      {sorted.length === 0
        ? <div style={{ textAlign:'center', color:th.t2, padding:'60px 0' }}>No trades logged yet.</div>
        : <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${th.b}` }}>
                  {['Date','Instrument','Strategy','Dir','Entry','Exit','Qty','P&L','Result','Score',''].map(h => (
                    <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontWeight:500, fontSize:11, whiteSpace:'nowrap', color:th.t2 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(t => (
                  <tr key={t.id} style={{ borderBottom:`1px solid ${th.b}` }}>
                    <td style={{ padding:'9px 10px', color:th.t2, whiteSpace:'nowrap' }}>{t.date}</td>
                    <td style={{ padding:'9px 10px', fontWeight:500, color:th.text }}>{t.instrument}</td>
                    <td style={{ padding:'9px 10px', color:th.t2, fontSize:12 }}>{sm[t.strategyId]?.name ?? '—'}{t.variant ? ` (${t.variant.toUpperCase()})` : ''}</td>
                    <td style={{ padding:'9px 10px' }}><Pill col={t.direction==='long'?'#04342C':'#501313'} fc={t.direction==='long'?'#9FE1CB':'#F7C1C1'}>{t.direction}</Pill></td>
                    <td style={{ padding:'9px 10px', color:th.text }}>₹{t.entryPrice}</td>
                    <td style={{ padding:'9px 10px', color:th.text }}>₹{t.exitPrice}</td>
                    <td style={{ padding:'9px 10px', color:th.t2 }}>{t.qty}</td>
                    <td style={{ padding:'9px 10px', fontWeight:600, color:t.pnl>0?'#9FE1CB':t.pnl<0?'#F7C1C1':th.t2 }}>{t.pnl>0?'+':''}₹{fmt(t.pnl)}</td>
                    <td style={{ padding:'9px 10px' }}><Pill col={t.outcome==='win'?'#04342C':t.outcome==='loss'?'#501313':th.card2} fc={t.outcome==='win'?'#9FE1CB':t.outcome==='loss'?'#F7C1C1':th.t2}>{t.outcome}</Pill></td>
                    <td style={{ padding:'9px 10px', color:th.t2, fontSize:12 }}>{t.checklistScore ? `${t.checklistScore.done}/${t.checklistScore.total}` : '—'}</td>
                    <td style={{ padding:'9px 10px' }}>
                      {toDelete === t.id
                        ? <span style={{ display:'flex', gap:4 }}>
                            <button style={{ ...s.btn, fontSize:11, padding:'3px 8px', background:'#c0392b' }} onClick={() => { onDelete(t.id); setToDelete(null) }}>Del</button>
                            <button style={{ ...s.ghost, fontSize:11, padding:'3px 8px' }} onClick={() => setToDelete(null)}>✕</button>
                          </span>
                        : <button style={{ background:'none', border:'none', color:th.t2, cursor:'pointer', fontSize:18, lineHeight:1, opacity:0.6 }} onClick={() => setToDelete(t.id)}>×</button>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      }
    </div>
  )
}

// ── Stats ─────────────────────────────────────────────────────
function StatsView({ th, s, trades, strats }) {
  return (
    <div>
      <div style={{ fontSize:20, fontWeight:600, color:th.text, marginBottom:4 }}>Performance Stats</div>
      <div style={{ fontSize:13, color:th.t2, marginBottom:20 }}>Calculated from your trade journal.</div>
      {strats.map(st => {
        const tt = trades.filter(t => t.strategyId === st.id)
        if (!tt.length) return (
          <div key={st.id} style={s.card}>
            <div style={{ fontWeight:600, color:th.text, marginBottom:4 }}>{st.name}</div>
            <div style={{ fontSize:13, color:th.t2 }}>No trades logged yet.</div>
          </div>
        )
        const wins = tt.filter(t => t.outcome === 'win').length
        const losses = tt.filter(t => t.outcome === 'loss').length
        const wr       = Math.round(wins / tt.length * 100)
        const totalPnl = tt.reduce((a,t) => a + (t.pnl||0), 0)
        const avgPnl   = totalPnl / tt.length
        const best     = Math.max(...tt.map(t => t.pnl||0))
        const worst    = Math.min(...tt.map(t => t.pnl||0))
        const scored   = tt.filter(t => t.checklistScore)
        const avgScore = scored.length ? Math.round(scored.reduce((a,t) => a + t.checklistScore.done/t.checklistScore.total, 0) / scored.length * 100) : null
        const Stat = ({ label, val, col }) => (
          <div style={{ background:th.card2, borderRadius:8, padding:'12px 14px' }}>
            <div style={{ fontSize:11, color:th.t2, marginBottom:4 }}>{label}</div>
            <div style={{ fontSize:20, fontWeight:700, color:col ?? th.text }}>{val}</div>
          </div>
        )
        return (
          <div key={st.id} style={{ ...s.card, marginBottom:16 }}>
            <div style={{ fontWeight:600, fontSize:16, color:th.text, marginBottom:14 }}>{st.name}</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))', gap:10, marginBottom:14 }}>
              <Stat label="Total Trades" val={tt.length}/>
              <Stat label="Win Rate"     val={`${wr}%`}                                   col={wr>=50?'#9FE1CB':'#F7C1C1'}/>
              <Stat label="Total P&L"    val={`${totalPnl>=0?'+':''}₹${fmt(totalPnl)}`}  col={totalPnl>=0?'#9FE1CB':'#F7C1C1'}/>
              <Stat label="Avg P&L"      val={`${avgPnl>=0?'+':''}₹${fmt(avgPnl)}`}      col={avgPnl>=0?'#9FE1CB':'#F7C1C1'}/>
              <Stat label="Best Trade"   val={`+₹${fmt(best)}`}                           col="#9FE1CB"/>
              <Stat label="Worst Trade"  val={`₹${fmt(worst)}`}                           col="#F7C1C1"/>
              {avgScore !== null && <Stat label="Avg Checklist" val={`${avgScore}%`}/>}
            </div>
            <div style={{ display:'flex', gap:3, alignItems:'center', marginBottom:14 }}>
              <div style={{ flex:wins||0, background:'#1D9E75', height:8, borderRadius:'4px 0 0 4px', minWidth:wins?4:0 }}/>
              <div style={{ flex:losses||0, background:'#c0392b', height:8, borderRadius:'0 4px 4px 0', minWidth:losses?4:0 }}/>
              <span style={{ fontSize:12, color:th.t2, marginLeft:8 }}>{wins}W · {losses}L · {tt.length-wins-losses}B/E</span>
            </div>
            <div style={{ fontSize:11, color:th.t2, fontWeight:500, marginBottom:8, letterSpacing:'0.05em', textTransform:'uppercase' }}>Recent trades</div>
            {[...tt].sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0,6).map(t => (
              <div key={t.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:`1px solid ${th.b}` }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontWeight:500, color:th.text }}>{t.instrument}</span>
                  <span style={{ fontSize:12, color:th.t2 }}>{t.date}</span>
                </div>
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <span style={{ fontSize:13, fontWeight:600, color:t.pnl>=0?'#9FE1CB':'#F7C1C1' }}>{t.pnl>=0?'+':''}₹{fmt(t.pnl)}</span>
                  <Pill col={t.outcome==='win'?'#04342C':t.outcome==='loss'?'#501313':th.card2} fc={t.outcome==='win'?'#9FE1CB':t.outcome==='loss'?'#F7C1C1':th.t2}>{t.outcome}</Pill>
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}