// Checklist section definitions for built-in strategies.
// These are merged with the strategy record from Supabase on load.
// Add new built-in strategies here as you create them.

export const BUILT_IN_SECTIONS = {
  rb: [
    {
      id: 's1', n: 1, title: 'Market context — MA alignment',
      col: 'purple', ref: false,
      items: [
        { id: 'i1', v: null, label: 'Trading TF: Price > 10 EMA > 20 EMA > 200 EMA', note: 'Check order on chart: Price → 10 EMA → 20 EMA → 200 EMA (top to bottom)', detail: 'All four must be in this exact order top to bottom — called a full MA stack. For Type A corrections, if trading TF is temporarily disrupted, check the parent TF stack instead.' },
        { id: 'i2', v: null, label: 'Parent TF: Price > 10 EMA > 20 EMA > 200 EMA', note: 'Both TFs must show the full stack. One TF aligned is not enough.', detail: 'The same full stack must hold on the parent timeframe. Daily trader checks weekly. 15min trader checks daily.' },
      ],
    },
    {
      id: 's2', n: 2, title: 'Market breadth & health',
      col: 'indigo', ref: false,
      items: [
        { id: 'i3', v: null, label: 'A/D ratio above 1.5 and Nifty not down >1% on heavy volume today', note: 'Check: NSE India → Market breadth → Advances & Declines', detail: 'NSE Advance/Decline ratio above 1.5 is healthy. Below 1 = avoid all entries. If Nifty is down more than 1% on heavy volume it is a distribution day — skip all new entries.' },
      ],
    },
    {
      id: 's3', n: 3, title: 'Sector position',
      col: 'blue', ref: false,
      items: [
        { id: 'i4', v: null, label: 'Sector in Leading or Improving quadrant (RRG) and sector index above 20 EMA', note: 'Check RRG: Trendlyne / StockEdge sector rotation', detail: 'Leading = strong and getting stronger. Improving = weak but turning up. Both acceptable. Weakening or Lagging = skip.' },
      ],
    },
    {
      id: 's4', n: 4, title: 'Relative strength of the stock',
      col: 'teal', ref: false,
      items: [
        { id: 'i5', v: null, label: 'Stock outperforming both Nifty 50 and its sector index over the last 1 month', note: 'TradingView: plot stock + Nifty 50 + sector index in % comparison mode, 1 month', detail: "The stock's 1-month return must be higher than both Nifty 50 and the sector index. If it underperforms either one, skip." },
        { id: 'i6', v: null, label: 'Stock held up better than Nifty during the last market pullback', note: null, detail: 'True relative strength shows during weakness. If the stock fell more than Nifty, avoid it.' },
      ],
    },
    {
      id: 's5', n: 5, title: 'Pattern setup',
      col: 'purple', ref: false, variantSec: true,
      items: [
        { id: 'ia1', v: 'a', label: 'Trendline connects at least 3 lower highs — each successive high lower than the previous', note: null, detail: 'Draw the line across the tops of each correction wave. 3+ touches = a validated trendline.' },
        { id: 'ia2', v: 'a', label: 'Correction lasted at least 2 weeks and has not broken below the prior major swing low', note: null, detail: 'Short corrections break too easily. If price has already broken below the prior structural low, skip.' },
        { id: 'ib1', v: 'b', label: 'Resistance level tested and rejected at least 2–3 times at approximately the same price', note: null, detail: '1 touch = noise. 2 = a level. 3+ = strong resistance.' },
        { id: 'ib2', v: 'b', label: 'Base has been building for at least 3–4 weeks', note: 'Rule of thumb: wider the base → bigger the breakout move', detail: 'A long base absorbs more selling. Short bases break easily.' },
        { id: 'ib3', v: 'b', label: 'Lows within the base are rising (higher lows inside the range)', note: null, detail: 'Rising lows with a flat top = buyers getting more aggressive.' },
        { id: 'ic1', v: 'c', label: 'Two converging trendlines — upper (lower highs) and lower (higher lows), each with 2+ touches', note: null, detail: 'Both lines need at least 2 clear touch points each.' },
        { id: 'ic2', v: 'c', label: 'Breakout happens between 60–80% of pattern completion — not at the very tip', note: 'Past 85% of the triangle = skip this setup', detail: 'Past 85%, price drifts sideways instead of producing a clean move.' },
        { id: 'ic3', v: 'c', label: 'Pattern forming for at least 2–3 weeks and volume declining inside (coiling)', note: null, detail: 'Short triangles are noise. Volume should dry up as price coils.' },
        { id: 'id1', v: 'd', label: 'Trendline connects at least 3 higher highs — each successive high higher than the previous', note: null, detail: 'Draw the line across the tops of the rally peaks. 3+ touches = a validated ascending resistance trendline.' },
        { id: 'id2', v: 'd', label: 'Trendline angle is moderate — not too steep', note: null, detail: 'A very steep ascending trendline is unsustainable and likely climactic. A moderate, steady slope means resistance has been building over time.' },
        { id: 'id3', v: 'd', label: 'Pattern has been forming for at least 2–3 weeks', note: null, detail: 'A rising trendline formed over only a few days is noise.' },
      ],
    },
    {
      id: 's6', n: 6, title: 'Entry conditions — all must be true',
      col: 'teal', ref: false,
      items: [
        { id: 'i15', v: null, label: 'Entry trigger — full candle body closes above the resistance line', note: 'Breakout-close entry OR re-test entry. Never mix both.', detail: 'A wick above the line does not count. The full body must close above.' },
        { id: 'i16', v: null, label: 'Candle quality — body ≥ 60% of total range, upper wick not larger than body', note: 'Example: range = ₹10. Body must be ≥ ₹6. Upper wick must be < body.', detail: 'Small body with long wicks = sellers fighting back = weak conviction.' },
        { id: 'i17', v: null, label: 'Volume — breakout candle volume ≥ 1.5× the 20-bar average', note: 'Example: 20-bar avg = 1,00,000. Breakout bar must show ≥ 1,50,000.', detail: 'High volume = real institutional buying. Low volume breakout = almost certainly a trap.' },
        { id: 'i18', v: null, label: 'Candle open is at or below the resistance line — not fully gapped above it', note: 'Valid: open ≤ trendline, close > trendline. Invalid: both above — skip.', detail: 'If both open and close are completely above the line, the breakout already happened and you are chasing.' },
      ],
    },
    {
      id: 's7', n: 7, title: 'Stop loss',
      col: 'coral', ref: false, atrCalc: true,
      items: [
        { id: 'i19', v: null, label: 'SL = entry minus 1.5 × ATR(14), and this distance is ≤ 5% of entry price', note: 'TradingView: add ATR(14) → read value → multiply by 1.5 → subtract from entry. Use calculator below ↓', detail: '1.5× ATR gives a stop wide enough to survive normal noise. If 1.5 × ATR > 5% of entry price, skip.' },
      ],
    },
    {
      id: 's8', n: 8, title: 'Risk:reward & targets',
      col: 'amber', ref: false,
      items: [
        { id: 'i20', v: null, label: 'Target 1 — look left for a clear resistance level first', note: 'Clear resistance = prior swing high, round number (₹500, ₹1000), or old consolidation zone.', detail: 'A real price level where sellers previously showed up is always more meaningful than a calculated projection.' },
        { id: 'i21', v: null, label: 'If no clear resistance — use Fib extension (1.618 if strong momentum, 1.0 if average)', note: 'Height = breakout − swing low. 1.0 = breakout + height. 1.618 = breakout + (height × 1.618).', detail: 'Strong momentum → 1.618. Average momentum → 1.0. Decide before entry.' },
        { id: 'i22', v: null, label: 'Risk:reward ratio is at least 1:2 against the chosen Target 1', note: '1.5 ATR = ₹18 SL → Target 1 must be at least ₹36 above entry.', detail: 'Distance from entry to Target 1 ÷ distance from entry to SL must be ≥ 2. Below 1:2 = skip.' },
        { id: 'i23', v: null, label: 'Check if resistance sits very close above the 1:2 target and momentum is not strong', note: 'Close resistance + weak momentum → full exit at 1:2. Strong momentum → trail as normal.', detail: 'If close resistance AND average momentum, plan to exit 100% at 1:2.' },
      ],
    },
    {
      id: 's9', n: 9, title: 'Conditions to avoid — skip if any apply',
      col: 'red', ref: false,
      items: [
        { id: 'i24', v: null, label: 'No earnings announcement within the next 5 trading days', note: null, detail: 'One bad earnings number destroys even the cleanest technical setup overnight.' },
        { id: 'i25', v: null, label: 'Breakout candle is not climactic or unusually extended', note: null, detail: 'If the breakout candle is 3–4× larger than recent candles, the move is already extended.' },
      ],
    },
    {
      id: 's10', n: 10, title: 'Trade management',
      col: 'green', ref: true,
      items: [
        { id: 'r1', v: null, label: 'Hold original 1.5 ATR stop loss until Target 1 is hit — do not move it earlier', note: null, detail: 'Moving SL to breakeven too early is the most common reason traders get shaken out.' },
        { id: 'r2', v: null, label: 'At Target 1 — partial or full exit based on what you planned before entry', note: 'Close resistance + weak momentum → 100% exit at 1:2. Strong momentum → 50% exit, trail the rest.', detail: '(1) Close resistance + weak momentum → exit 100% at 1:2. (2) Strong momentum → sell 50%, trail remaining 50%.' },
        { id: 'r3', v: null, label: 'After Target 1 — trail SL under the low of each good green candle for remaining 50%', note: 'Good green candle: green close · body ≥ 60% · closes upper half · upper wick ≤ body.', detail: 'Do not trail under weak, wick-heavy, or doji candles.' },
        { id: 'r4', v: null, label: 'Full exit — sell remaining 50% when trailing SL is hit', note: null, detail: 'When price closes below the low of the last qualifying good green candle, exit remaining 50% fully.' },
      ],
    },
    {
      id: 's11', n: 11, title: 'False breakout rules',
      col: 'gray', ref: true,
      items: [
        { id: 'r5', v: null, label: 'If next candle closes back below the resistance line → exit immediately', note: null, detail: 'The breakout was fake. Exit immediately — no hoping, no waiting for one more candle.' },
        { id: 'r6', v: null, label: 'Never average down — exit at your stop loss and move on', note: null, detail: 'Adding to a losing trade turns a manageable loss into an account-damaging one.' },
      ],
    },
  ],
}