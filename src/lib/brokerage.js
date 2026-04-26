/**
 * Zerodha brokerage calculator (round-trip: buy + sell)
 *
 * tradeType: 'eq_delivery' | 'eq_intraday' | 'fno_futures' | 'fno_options'
 * exchange:  'NSE' | 'BSE'
 * entryPrice, exitPrice: per unit price (for options: premium per unit)
 * qty: number of units / lots
 *
 * Returns { brokerage, stt, txnCharges, sebi, stamp, gst, total }
 * All values in ₹, rounded to 2 decimal places.
 */
export function calcBrokerage({ tradeType, exchange, entryPrice, exitPrice, qty }) {
  if (!entryPrice || !exitPrice || !qty) return null

  const buyValue  = entryPrice * qty
  const sellValue = exitPrice  * qty
  const turnover  = buyValue + sellValue

  // SEBI: ₹10 per crore = 0.000001% of turnover
  const SEBI_PER_CRORE = 10 / 1e7

  let brokerage, stt, txnCharges, sebi, stamp

  if (tradeType === 'eq_delivery') {
    brokerage  = 0
    stt        = turnover * 0.001                                                    // 0.1% on buy + sell
    txnCharges = turnover * (exchange === 'NSE' ? 0.0000307  : 0.0000375)
    sebi       = turnover * SEBI_PER_CRORE
    stamp      = buyValue * 0.00015                                                  // 0.015% on buy

  } else if (tradeType === 'eq_intraday') {
    brokerage  = Math.min(buyValue  * 0.0003, 20) + Math.min(sellValue * 0.0003, 20)
    stt        = sellValue * 0.00025                                                 // 0.025% on sell
    txnCharges = turnover * (exchange === 'NSE' ? 0.0000307  : 0.0000375)
    sebi       = turnover * SEBI_PER_CRORE
    stamp      = buyValue * 0.000003                                                 // 0.003% on buy

  } else if (tradeType === 'fno_futures') {
    brokerage  = Math.min(buyValue  * 0.0003, 20) + Math.min(sellValue * 0.0003, 20)
    stt        = sellValue * 0.0005                                                  // 0.05% on sell
    txnCharges = turnover * (exchange === 'NSE' ? 0.0000183  : 0)
    sebi       = turnover * SEBI_PER_CRORE
    stamp      = buyValue * 0.00002                                                  // 0.002% on buy

  } else if (tradeType === 'fno_options') {
    brokerage  = 40                                                                  // ₹20 flat × 2 orders
    stt        = sellValue * 0.0015                                                  // 0.15% on sell premium
    txnCharges = turnover * (exchange === 'NSE' ? 0.0003553  : 0.000325)
    sebi       = turnover * SEBI_PER_CRORE
    stamp      = buyValue * 0.000003                                                 // 0.003% on buy premium

  } else {
    return null
  }

  const gst   = (brokerage + sebi + txnCharges) * 0.18
  const total = brokerage + stt + txnCharges + sebi + stamp + gst

  const r2 = v => Math.round(v * 100) / 100
  return {
    brokerage:  r2(brokerage),
    stt:        r2(stt),
    txnCharges: r2(txnCharges),
    sebi:       r2(sebi),
    stamp:      r2(stamp),
    gst:        r2(gst),
    total:      r2(total),
  }
}

export const TRADE_TYPE_LABELS = {
  eq_delivery: 'Equity Delivery',
  eq_intraday: 'Equity Intraday',
  fno_futures: 'F&O — Futures',
  fno_options: 'F&O — Options',
}
