import { useState } from "react";
import { DIR_STYLE, SimSpotProvider } from "./shared";
import { useSearchParams } from "react-router-dom";
import PositionSizeCalc           from "./PositionSizeCalc";
import CallBreakEvenCalc          from "./CallBreakEvenCalc";
import PutBreakEvenCalc           from "./PutBreakEvenCalc";
import ShortCallCalc              from "./ShortCallCalc";
import ShortPutCalc               from "./ShortPutCalc";
import StrangleCalc               from "./StrangleCalc";
import StraddleCalc               from "./StraddleCalc";
import ShortStrangleCalc          from "./ShortStrangleCalc";
import ShortStraddleCalc          from "./ShortStraddleCalc";
import BullSpreadCalc             from "./BullSpreadCalc";
import BearSpreadCalc             from "./BearSpreadCalc";
import BearCallSpreadCalc         from "./BearCallSpreadCalc";
import BullPutSpreadCalc          from "./BullPutSpreadCalc";
import LongCallButterflyCalc      from "./LongCallButterflyCalc";
import LongPutButterflyCalc       from "./LongPutButterflyCalc";
import ShortCallButterflyCalc     from "./ShortCallButterflyCalc";
import ShortPutButterflyCalc      from "./ShortPutButterflyCalc";
import CondorCalc                 from "./CondorCalc";
import LongIronCondorCalc         from "./LongIronCondorCalc";
import ShortIronCondorCalc        from "./ShortIronCondorCalc";
import StraddleStrangleComparator from "./StraddleStrangleComparator";
import BullCallRatioCalc          from "./BullCallRatioCalc";

// ─── Calculator registry ──────────────────────────────────────────
const CALCULATORS = [
  { id: "position",        label: "Position Size",          component: PositionSizeCalc },
  { id: "call-breakeven",  label: "Long Call",              component: CallBreakEvenCalc },
  { id: "put-breakeven",   label: "Long Put",               component: PutBreakEvenCalc },
  { id: "short-call",      label: "Short Call",             component: ShortCallCalc },
  { id: "short-put",       label: "Short Put",              component: ShortPutCalc },
  { id: "strangle",        label: "Long Strangle",          component: StrangleCalc },
  { id: "straddle",        label: "Long Straddle",          component: StraddleCalc },
  { id: "short-strangle",  label: "Short Strangle",         component: ShortStrangleCalc },
  { id: "short-straddle",  label: "Short Straddle",         component: ShortStraddleCalc },
  { id: "compare",         label: "⇄ Straddle vs Strangle", component: StraddleStrangleComparator, isComparator: true },
  { id: "bull-spread",     label: "Bull Call Spread",       component: BullSpreadCalc },
  { id: "bear-spread",     label: "Bear Put Spread",        component: BearSpreadCalc },
  { id: "bear-call-spread",       label: "Bear Call Spread",        component: BearCallSpreadCalc },
  { id: "bull-put-spread",        label: "Bull Put Spread",         component: BullPutSpreadCalc },
  { id: "long-call-butterfly",    label: "Long Call Butterfly",     component: LongCallButterflyCalc },
  { id: "long-put-butterfly",     label: "Long Put Butterfly",      component: LongPutButterflyCalc },
  { id: "short-call-butterfly",   label: "Short Call Butterfly",    component: ShortCallButterflyCalc },
  { id: "short-put-butterfly",    label: "Short Put Butterfly",     component: ShortPutButterflyCalc },
  { id: "condor",                 label: "Long Call Condor",        component: CondorCalc },
  { id: "long-iron-condor",       label: "Long Iron Condor",        component: LongIronCondorCalc },
  { id: "short-iron-condor",      label: "Short Iron Condor",       component: ShortIronCondorCalc },
  { id: "bull-call-ratio",         label: "Bull Call Ratio Spread",  component: BullCallRatioCalc },
];

// ─── Per-calculator metadata — also exported for the Strategy Playbook ───
export const CALC_META = {
  position: {
    direction: "selectable",
    outlook: null,
    whenToUse: "You have a trade in mind and want to know exactly how many shares/units to buy or short without risking too much of your portfolio on a single position.",
    risk: "Defined — capped at the rupee amount you specify as portfolio heat (e.g. 1% of capital).",
    reward: "Depends on your target. Position sizing only controls risk; the reward is determined by your exit target.",
    summary: "Calculates the optimal number of shares to trade based on your risk tolerance and account size. Keeps each trade loss within a defined % of your portfolio.",
    howItWorks: "Given your total portfolio, the capital allocated to this trade, and your % risk limit, it finds the maximum shares you can enter while capping the rupee loss at your stop-loss price.",
    formula: "Shares = min(MaxRisk ÷ |Entry − SL|,  Capital ÷ Entry)",
    fields: [
      { name: "Total Portfolio Capital", desc: "Your entire account value — used to calculate the absolute rupee risk cap." },
      { name: "Capital for This Trade",  desc: "Max money you are willing to deploy in this single trade." },
      { name: "Risk Per Trade %",        desc: "The % of your total portfolio you can tolerate losing if stop-loss is hit. Typically 0.5–2%." },
      { name: "Entry Price",             desc: "The price at which you plan to enter the position." },
      { name: "Stop Loss Price",         desc: "Your hard exit price if the trade moves against you. Below entry for Long, above entry for Short." },
    ],
  },
  "call-breakeven": {
    direction: "long",
    outlook: "Bullish",
    whenToUse: "You are very bullish on a stock/index and expect a significant upward move before expiry.",
    risk: "Limited — max loss is the premium paid (Premium × Lot Size).",
    reward: "Unlimited — profit potential grows as the price rises above the breakeven.",
    summary: "Buy 1 CE (Call option). You pay a premium upfront for the right to buy the underlying at the strike price. Profit if the underlying closes above Strike + Premium at expiry. Max loss is limited to the premium paid; max profit is unlimited.",
    howItWorks: "Buying a call costs a premium upfront — that premium is your max loss. To break even, the stock must rise enough to cover that cost by expiry.",
    formula: "Breakeven = Strike Price + Premium Paid",
    fields: [
      { name: "Strike Price",  desc: "The price at which you have the right to buy the underlying stock." },
      { name: "Premium Paid",  desc: "Cost per share/unit to buy the call. This is your maximum loss per unit." },
      { name: "No. of Lots",   desc: "Number of contracts you are buying." },
      { name: "Lot Size",      desc: "Units per contract (e.g. 50 for Nifty, 25 for Bank Nifty)." },
    ],
  },
  "put-breakeven": {
    direction: "short",
    outlook: "Bearish",
    whenToUse: "You are very bearish on a stock/index and expect a significant downward move before expiry.",
    risk: "Limited — max loss is the premium paid (Premium × Lot Size).",
    reward: "High — profit grows as price falls sharply below the breakeven (toward zero).",
    summary: "Buy 1 PE (Put option). You pay a premium upfront for the right to sell the underlying at the strike price. Profit if the underlying closes below Strike − Premium at expiry. Max loss is limited to the premium paid; max profit grows as the stock falls toward zero.",
    howItWorks: "Buying a put lets you profit from a falling stock. The premium paid is your max risk. The stock must fall below the breakeven price for you to net a profit.",
    formula: "Breakeven = Strike Price − Premium Paid",
    fields: [
      { name: "Strike Price", desc: "The price at which you have the right to sell the underlying stock." },
      { name: "Premium Paid", desc: "Cost per share/unit to buy the put. This is your maximum loss per unit." },
      { name: "No. of Lots",  desc: "Number of contracts you are buying." },
      { name: "Lot Size",     desc: "Units per contract." },
    ],
  },
  "short-call": {
    direction: "short",
    outlook: "Bearish / Neutral",
    whenToUse: "You are bearish or neutral on the stock/index and expect the price to stay flat or fall before expiry.",
    risk: "Unlimited — loss accelerates if the price rises sharply above the breakeven.",
    reward: "Limited — capped at the premium received (Premium × Lot Size).",
    summary: "Sell 1 CE (Call option) and collect the premium upfront. Profit as long as the underlying stays at or below the strike at expiry. Max profit is capped at the premium received; max loss is unlimited if the stock rallies above the breakeven.",
    howItWorks: "As the seller, you keep the premium as long as the stock closes at or below the strike at expiry. Every rupee the stock rises above the breakeven erodes your profit and eventually turns into a loss.",
    formula: "Breakeven = Strike Price + Premium Received\nMax Profit = Premium Received × Qty\nMax Loss   = Unlimited",
    fields: [
      { name: "Strike Price",      desc: "The call strike you are selling. You profit if the stock stays below this." },
      { name: "Premium Received",  desc: "Credit collected per share/unit. This is your maximum possible profit per unit." },
      { name: "No. of Lots",       desc: "Number of contracts sold." },
      { name: "Lot Size",          desc: "Units per contract." },
    ],
  },
  "short-put": {
    direction: "long",
    outlook: "Bullish / Neutral",
    whenToUse: "You are bullish or neutral on the stock/index and expect the price to stay flat or rise before expiry.",
    risk: "Unlimited (in practice large) — loss grows if the price falls sharply below the breakeven.",
    reward: "Limited — capped at the premium received (Premium × Lot Size).",
    summary: "Sell 1 PE (Put option) and collect the premium upfront. Profit as long as the underlying stays at or above the strike at expiry. Max profit is capped at the premium received; max loss grows as the stock falls toward zero.",
    howItWorks: "As the seller, you keep the premium as long as the stock closes at or above the strike at expiry. Every rupee the stock falls below the breakeven erodes your profit and eventually turns into a loss.",
    formula: "Breakeven = Strike Price − Premium Received\nMax Profit = Premium Received × Qty\nMax Loss   = Breakeven × Qty (stock to ₹0)",
    fields: [
      { name: "Strike Price",     desc: "The put strike you are selling. You profit if the stock stays above this." },
      { name: "Premium Received", desc: "Credit collected per share/unit. This is your maximum possible profit per unit." },
      { name: "No. of Lots",      desc: "Number of contracts sold." },
      { name: "Lot Size",         desc: "Units per contract." },
    ],
  },
  strangle: {
    direction: "neutral",
    outlook: "Neutral / High Volatility",
    whenToUse: "Expectation of very high volatility in the underlying stock/index — you expect a big move but are unsure of direction.",
    risk: "Limited — capped at the initial net premium paid for both legs.",
    reward: "Unlimited — profit grows as the price breaks out beyond either breakeven.",
    summary: "Buy 1 OTM CE + Buy 1 OTM PE at different strikes. Cheaper to enter than a straddle because both legs are out-of-the-money. Profit if the underlying makes a large move in either direction beyond either breakeven at expiry. Max loss is the combined premium paid if the price stays between both strikes.",
    howItWorks: "You pay two premiums. The stock must move far enough past either strike to recover the combined premium. Max loss occurs when price stays between both strikes at expiry.",
    formula: "Upper BE = Call Strike + Net Premium\nLower BE = Put Strike − Net Premium",
    fields: [
      { name: "Call Strike",    desc: "OTM call strike — typically above the current market price." },
      { name: "Call Premium",   desc: "Premium paid to buy the OTM call." },
      { name: "Put Strike",     desc: "OTM put strike — typically below the current market price." },
      { name: "Put Premium",    desc: "Premium paid to buy the OTM put." },
      { name: "Lots / Lot Size", desc: "Scales total cost and P&L to your full position size." },
    ],
  },
  straddle: {
    direction: "neutral",
    outlook: "Neutral / High Volatility",
    whenToUse: "Expectation of high volatility in the underlying stock/index — you expect a meaningful move in either direction before expiry.",
    risk: "Limited — capped at the net premium paid (Call Premium + Put Premium × Lot Size).",
    reward: "Unlimited — profit grows as the price moves away from the strike in either direction.",
    summary: "Buy 1 ATM CE + Buy 1 ATM PE at the same strike. Costs more than a strangle because both legs are at-the-money, but requires a smaller move to profit. Profit from any significant move in either direction beyond the net premium. Max loss is the net premium paid if the stock pins exactly at the strike at expiry.",
    howItWorks: "Because both legs share the same strike, the net premium is higher than a strangle. Any move exceeding the net premium is profitable. Max loss is when price pins exactly at the strike at expiry.",
    formula: "Upper BE = Strike + Net Premium\nLower BE = Strike − Net Premium",
    fields: [
      { name: "Strike Price",   desc: "The at-the-money strike used for both the call and the put." },
      { name: "Call Premium",   desc: "Premium paid for the ATM call option." },
      { name: "Put Premium",    desc: "Premium paid for the ATM put option." },
      { name: "Lots / Lot Size", desc: "Scales total cost and P&L to your full position size." },
    ],
  },
  "short-strangle": {
    direction: "neutral",
    outlook: "Neutral / Low Volatility",
    whenToUse: "Expectation of low volatility — you expect the underlying to stay range-bound between both strikes until expiry.",
    risk: "Unlimited — losses accelerate if the price breaks out sharply beyond either breakeven.",
    reward: "Limited — capped at the total premium received from selling both legs.",
    summary: "Sell 1 OTM CE + Sell 1 OTM PE at different strikes, collecting both premiums upfront. Profit if the underlying stays inside the two breakevens at expiry — both options expire worthless and you keep the full credit. Max loss is unlimited if the price breaks out sharply in either direction.",
    howItWorks: "As the seller you collect a net credit upfront. As long as the underlying stays between the two strikes, both options expire worthless and you keep the full credit. Any breakout past either breakeven starts eating into profit and then causes losses.",
    formula: "Upper BE = Call Strike + Net Credit\nLower BE = Put Strike − Net Credit\nMax Profit = Net Credit × Qty\nMax Loss   = Unlimited",
    fields: [
      { name: "Call Strike (Sell)",        desc: "OTM call you are selling — above the current market price." },
      { name: "Call Premium Received",     desc: "Credit collected for selling the OTM call." },
      { name: "Put Strike (Sell)",         desc: "OTM put you are selling — below the current market price." },
      { name: "Put Premium Received",      desc: "Credit collected for selling the OTM put." },
      { name: "Lots / Lot Size",           desc: "Scales total credit and P&L to your full position size." },
    ],
  },
  "short-straddle": {
    direction: "neutral",
    outlook: "Neutral / Low Volatility",
    whenToUse: "Expectation of very low volatility — you expect the underlying to pin close to the strike at expiry with minimal movement.",
    risk: "Unlimited — any large move in either direction causes accelerating losses.",
    reward: "Limited — capped at the total net premium received (highest possible credit for any two-leg strategy).",
    summary: "Sell 1 ATM CE + Sell 1 ATM PE at the same strike, collecting the maximum possible premium upfront. Profit if the underlying pins near the strike at expiry. Higher credit than a short strangle, but the safe zone is narrower. Max loss is unlimited from any large move in either direction.",
    howItWorks: "You receive the highest possible premium because both options are at-the-money. The entire credit is profit if the stock pins at the strike. Any move in either direction shrinks profit, and exceeding either breakeven results in an accelerating loss.",
    formula: "Upper BE = Strike + Net Credit\nLower BE = Strike − Net Credit\nMax Profit = Net Credit × Qty\nMax Loss   = Unlimited",
    fields: [
      { name: "Strike Price",          desc: "The ATM strike used for both the sold call and the sold put." },
      { name: "Call Premium Received", desc: "Credit collected for selling the ATM call." },
      { name: "Put Premium Received",  desc: "Credit collected for selling the ATM put." },
      { name: "Lots / Lot Size",       desc: "Scales total credit and P&L to your full position size." },
    ],
  },
  compare: {
    direction: "selectable",
    outlook: null,
    whenToUse: "You want to decide between a Straddle and Strangle before placing a trade, based on current premiums and your expected move.",
    risk: "Depends on direction — Long: limited to net premium paid. Short: unlimited.",
    reward: "Depends on direction — Long: unlimited. Short: limited to net premium received.",
    summary: "Compare a Straddle and Strangle side by side to decide which strategy suits the current market premium and expected move.",
    howItWorks: "",
    formula: "",
    fields: [],
  },
  "bull-spread": {
    direction: "long",
    outlook: "Bullish (Defined Risk)",
    whenToUse: "Your view is mildly bullish — you expect a moderate upward move, not a runaway rally. Cheaper alternative to a plain long call.",
    risk: "Limited — capped at the net debit paid (Lower Premium − Upper Premium × Lot Size).",
    reward: "Limited — max profit = (Spread Width − Net Debit) × Lot Size, achieved when price closes ≥ upper strike at expiry.",
    summary: "Buy 1 ATM CE & Sell 1 OTM CE at a higher strike. The premium collected from the short call reduces your net entry cost compared to buying a plain call. Profit is capped at the spread width minus the net debit paid. Both max profit and max loss are fully defined upfront.",
    howItWorks: "The premium received from selling the upper call offsets the cost of the lower call (net debit). Max profit is locked in once the stock closes at or above the upper strike at expiry.",
    formula: "Breakeven  = Lower Strike + Net Debit\nMax Profit = (Spread Width − Net Debit) × Qty\nMax Loss   = Net Debit × Qty",
    fields: [
      { name: "Lower Strike (Buy)", desc: "The call you buy — closer to the money, more expensive. Gives you the right to buy." },
      { name: "Lower Premium",      desc: "Premium paid for the long call (a debit)." },
      { name: "Upper Strike (Sell)", desc: "The call you sell — further OTM, cheaper. Caps your max profit." },
      { name: "Upper Premium",      desc: "Premium received from the short call (a credit). Reduces net cost." },
    ],
  },
  "bear-spread": {
    direction: "short",
    outlook: "Bearish (Defined Risk)",
    whenToUse: "Your view is mildly bearish — you expect a moderate downward move. Cheaper alternative to a plain long put.",
    risk: "Limited — capped at the net debit paid (Higher Premium − Lower Premium × Lot Size).",
    reward: "Limited — max profit = (Spread Width − Net Debit) × Lot Size, achieved when price closes ≤ lower strike at expiry.",
    summary: "Buy 1 ATM PE & Sell 1 OTM PE at a lower strike. The premium collected from the short put reduces your net entry cost compared to buying a plain put. Profit is capped at the spread width minus the net debit paid. Both max profit and max loss are fully defined upfront.",
    howItWorks: "The premium received from selling the lower put offsets the cost of the higher put (net debit). Max profit is locked in once the stock closes at or below the lower strike at expiry.",
    formula: "Breakeven  = Higher Strike − Net Debit\nMax Profit = (Spread Width − Net Debit) × Qty\nMax Loss   = Net Debit × Qty",
    fields: [
      { name: "Higher Strike (Buy)", desc: "The put you buy — closer to the money, more expensive. Gives you the right to sell." },
      { name: "Higher Premium",      desc: "Premium paid for the long put (a debit)." },
      { name: "Lower Strike (Sell)", desc: "The put you sell — further OTM, cheaper. Caps your max downside profit." },
      { name: "Lower Premium",       desc: "Premium received from the short put (a credit). Reduces net cost." },
    ],
  },
  "bear-call-spread": {
    direction: "short",
    outlook: "Bearish (Defined Risk)",
    whenToUse: "Your view is mildly bearish — you want to profit from a price decline or stagnation below the sold strike while capping maximum risk upfront.",
    risk: "Limited — capped at (Spread Width − Net Credit) × Lot Size.",
    reward: "Limited — capped at net credit received × Lot Size.",
    summary: "Sell lower-strike call + Buy higher-strike call. Collect net credit upfront. Profit if price stays at or below the sold (lower) strike at expiry. Max loss is the spread width minus the net credit. Both sides are fully defined.",
    howItWorks: "You collect more premium from selling the lower-strike call than you pay for the higher-strike call hedge. The net credit is your max profit. If price rises above the sold strike, losses mount until capped at the higher strike.",
    formula: "Breakeven  = Lower Strike + Net Credit\nMax Profit = Net Credit × Qty\nMax Loss   = (Spread Width − Net Credit) × Qty",
    fields: [
      { name: "Lower Strike (Sell)",  desc: "The call you sell — near the money, collects the most premium." },
      { name: "Lower Premium",        desc: "Premium received from selling the lower-strike call (credit)." },
      { name: "Higher Strike (Buy)",  desc: "The call you buy as a hedge — caps your upside risk at this level." },
      { name: "Higher Premium",       desc: "Premium paid for the higher-strike call (debit). Net credit = Lower − Higher premium." },
    ],
  },
  "bull-put-spread": {
    direction: "long",
    outlook: "Bullish (Defined Risk)",
    whenToUse: "Your view is mildly bullish — you want to profit from a price rise or stagnation above the sold strike while capping maximum risk upfront.",
    risk: "Limited — capped at (Spread Width − Net Credit) × Lot Size.",
    reward: "Limited — capped at net credit received × Lot Size.",
    summary: "Sell higher-strike put + Buy lower-strike put. Collect net credit upfront. Profit if price stays at or above the sold (higher) strike at expiry. Max loss is the spread width minus the net credit. Both sides are fully defined.",
    howItWorks: "You collect more premium from selling the higher-strike put than you pay for the lower-strike put hedge. The net credit is your max profit. If price falls below the sold strike, losses mount until capped at the lower strike.",
    formula: "Breakeven  = Higher Strike − Net Credit\nMax Profit = Net Credit × Qty\nMax Loss   = (Spread Width − Net Credit) × Qty",
    fields: [
      { name: "Higher Strike (Sell)", desc: "The put you sell — near the money, collects the most premium." },
      { name: "Higher Premium",       desc: "Premium received from selling the higher-strike put (credit)." },
      { name: "Lower Strike (Buy)",   desc: "The put you buy as a hedge — caps your downside risk at this level." },
      { name: "Lower Premium",        desc: "Premium paid for the lower-strike put (debit). Net credit = Higher − Lower premium." },
    ],
  },
  "long-call-butterfly": {
    direction: "neutral",
    outlook: "Neutral — Low Volatility",
    whenToUse: "You expect the underlying to stay near a specific price at expiry with very little movement. Cheaper than a straddle with defined risk.",
    risk: "Limited — capped at net debit paid × Lot Size.",
    reward: "Limited — max profit = (Wing Width − Net Debit) × Lot Size at the middle strike.",
    summary: "Buy 1 lower-strike call + Sell 2 middle-strike calls + Buy 1 upper-strike call. Profit if the underlying pins near the middle strike at expiry. Max profit is limited and occurs exactly at the middle strike. Max loss is the net debit paid.",
    howItWorks: "The two short middle calls fund the two long wing calls. You pay a small net debit. The position profits from low volatility — maximum gain occurs if the stock closes exactly at the sold strike.",
    formula: "Net Debit  = Lower Premium − 2× Middle Premium + Upper Premium\nLower BE   = Lower Strike + Net Debit\nUpper BE   = Upper Strike − Net Debit\nMax Profit = (Wing Width − Net Debit) × Qty\nMax Loss   = Net Debit × Qty",
    fields: [
      { name: "Lower Strike (Buy)",    desc: "Lower wing call you buy. Furthest OTM and cheapest." },
      { name: "Lower Premium",         desc: "Premium paid for the lower wing call." },
      { name: "Middle Strike (Sell ×2)", desc: "ATM strike sold twice. The 'body' of the butterfly." },
      { name: "Middle Premium",        desc: "Premium received per middle contract. Collected twice." },
      { name: "Upper Strike (Buy)",    desc: "Upper wing call you buy. OTM hedge that caps risk." },
      { name: "Upper Premium",         desc: "Premium paid for the upper wing call." },
    ],
  },
  "long-put-butterfly": {
    direction: "neutral",
    outlook: "Neutral — Low Volatility",
    whenToUse: "You expect the underlying to stay near a specific price at expiry. Equivalent to long call butterfly by put-call parity.",
    risk: "Limited — capped at net debit paid × Lot Size.",
    reward: "Limited — max profit = (Wing Width − Net Debit) × Lot Size at the middle strike.",
    summary: "Buy 1 upper-strike put + Sell 2 middle-strike puts + Buy 1 lower-strike put. Profit if the underlying pins near the middle strike at expiry. Same breakevens and P&L profile as the long call butterfly.",
    howItWorks: "The two short middle puts fund the two long wing puts. Net debit = Upper Premium − 2× Middle + Lower. The payoff is symmetric around the middle strike — max profit peaks there and decays to max loss at both wings.",
    formula: "Net Debit  = Upper Premium − 2× Middle Premium + Lower Premium\nLower BE   = Lower Strike + Net Debit\nUpper BE   = Upper Strike − Net Debit\nMax Profit = (Wing Width − Net Debit) × Qty\nMax Loss   = Net Debit × Qty",
    fields: [
      { name: "Lower Strike (Buy)",    desc: "Lower wing put you buy. Cheapest OTM put." },
      { name: "Lower Premium",         desc: "Premium paid for the lower wing put." },
      { name: "Middle Strike (Sell ×2)", desc: "ATM strike sold twice in puts." },
      { name: "Middle Premium",        desc: "Premium received per middle put. Collected twice." },
      { name: "Upper Strike (Buy)",    desc: "Upper wing put you buy (expensive ITM put)." },
      { name: "Upper Premium",         desc: "Premium paid for the upper wing put." },
    ],
  },
  "short-call-butterfly": {
    direction: "neutral",
    outlook: "Neutral — High Volatility",
    whenToUse: "You expect a big move away from the middle strike but want defined risk. Collects a credit — profits if the stock breaks out in either direction.",
    risk: "Limited — max loss = (Wing Width − Net Credit) × Lot Size if price pins at middle strike.",
    reward: "Limited — max profit = Net Credit × Lot Size (price breaks below lower or above upper wing).",
    summary: "Sell 1 lower-strike call + Buy 2 middle-strike calls + Sell 1 upper-strike call for a net credit. Profit if price moves decisively away from the middle strike at expiry. Mirror image of the long call butterfly.",
    howItWorks: "You collect net credit upfront. If price breaks out beyond either wing, both short calls expire worthless or offset the long calls, and you keep the full credit. If price pins at the middle, the 2 long calls are worth their max but the short calls negate much of it — resulting in max loss.",
    formula: "Net Credit = Lower Premium + Upper Premium − 2× Middle Premium\nLower BE   = Lower Strike + Net Credit\nUpper BE   = Upper Strike − Net Credit\nMax Profit = Net Credit × Qty\nMax Loss   = (Wing Width − Net Credit) × Qty",
    fields: [
      { name: "Lower Strike (Sell)",   desc: "Lower wing call you sell." },
      { name: "Lower Premium",         desc: "Premium received for the lower wing call." },
      { name: "Middle Strike (Buy ×2)", desc: "ATM strike bought twice (body of the butterfly)." },
      { name: "Middle Premium",        desc: "Premium paid per middle call. Paid twice." },
      { name: "Upper Strike (Sell)",   desc: "Upper wing call you sell." },
      { name: "Upper Premium",         desc: "Premium received for the upper wing call." },
    ],
  },
  "short-put-butterfly": {
    direction: "neutral",
    outlook: "Neutral — High Volatility",
    whenToUse: "You expect a big move away from the middle strike but want defined risk on both sides. Same volatility view as short call butterfly — use puts instead.",
    risk: "Limited — max loss = (Wing Width − Net Credit) × Lot Size if price pins at middle strike.",
    reward: "Limited — max profit = Net Credit × Lot Size.",
    summary: "Sell 1 upper-strike put + Buy 2 middle-strike puts + Sell 1 lower-strike put for a net credit. Equivalent payoff to short call butterfly. Profits from large price movements in either direction.",
    howItWorks: "Mirrors the short call butterfly using puts. The net credit is collected upfront. Max profit if price moves far away from the middle strike. Max loss if price pins exactly at the middle.",
    formula: "Net Credit = Upper Premium + Lower Premium − 2× Middle Premium\nLower BE   = Lower Strike + Net Credit\nUpper BE   = Upper Strike − Net Credit\nMax Profit = Net Credit × Qty\nMax Loss   = (Wing Width − Net Credit) × Qty",
    fields: [
      { name: "Lower Strike (Sell)",   desc: "Lower wing put you sell." },
      { name: "Lower Premium",         desc: "Premium received for the lower wing put." },
      { name: "Middle Strike (Buy ×2)", desc: "ATM strike bought twice in puts." },
      { name: "Middle Premium",        desc: "Premium paid per middle put. Paid twice." },
      { name: "Upper Strike (Sell)",   desc: "Upper wing put you sell." },
      { name: "Upper Premium",         desc: "Premium received for the upper wing put." },
    ],
  },
  "condor": {
    direction: "neutral",
    outlook: "Neutral — Low Volatility (Wider Range)",
    whenToUse: "You expect the underlying to stay between two middle strikes but want a wider profit zone than a butterfly. More forgiving than a butterfly — inner profit zone is larger.",
    risk: "Limited — capped at net debit × lot size.",
    reward: "Limited — max profit = (K2 − K1 − net debit) × lot size when price is between K2 and K3.",
    summary: "Buy 1 K1 call + Sell 1 K2 call + Sell 1 K3 call + Buy 1 K4 call. Profit if price is between K2 and K3 at expiry. Wider inner profit zone than a butterfly. Net debit strategy with defined risk and reward.",
    howItWorks: "The two short inner calls partially fund the two long outer calls. You pay a small net debit. You profit if the underlying closes anywhere between K2 and K3. This gives you a wider profit window than a butterfly (which profits only at the middle strike).",
    formula: "Net Debit   = (P1 + P4) − (P2 + P3)\nLower BE    = K1 + Net Debit\nUpper BE    = K4 − Net Debit\nMax Profit  = (K2 − K1 − Net Debit) × Qty\nMax Loss    = Net Debit × Qty",
    fields: [
      { name: "K1 (Buy)",  desc: "Lowest call — buy for downside protection." },
      { name: "K1 Premium", desc: "Premium paid for K1 call." },
      { name: "K2 (Sell)", desc: "Lower inner strike — sell to collect credit." },
      { name: "K2 Premium", desc: "Premium received for K2 call." },
      { name: "K3 (Sell)", desc: "Upper inner strike — sell to collect credit." },
      { name: "K3 Premium", desc: "Premium received for K3 call." },
      { name: "K4 (Buy)",  desc: "Highest call — buy to cap maximum loss." },
      { name: "K4 Premium", desc: "Premium paid for K4 call." },
    ],
  },
  "long-iron-condor": {
    direction: "neutral",
    outlook: "Neutral — High Volatility (Expects Big Move)",
    whenToUse: "You expect a large move in either direction but are unsure which way. Net debit strategy — profits if price breaks out beyond the inner strikes.",
    risk: "Limited — net debit paid × lot size (occurs when price stays between K2 and K3).",
    reward: "Limited — max profit = (spread width − net debit) × lot size when price moves decisively outside.",
    summary: "Sell K1 put + Buy K2 put (bear put spread) + Buy K3 call + Sell K4 call (bull call spread). Net debit. Profits if price drops below K2 or rises above K3. Opposite of the short iron condor.",
    howItWorks: "You pay a debit to buy a bear put spread and a bull call spread simultaneously. The position profits when the underlying makes a large move in either direction. Max loss occurs when price stays rangebound between K2 and K3 — both spreads expire worthless.",
    formula: "Net Debit   = (K2 Put − K1 Put) + (K3 Call − K4 Call)\nLower BE    = K2 − Net Debit\nUpper BE    = K3 + Net Debit\nMax Profit  = Spread Width − Net Debit (per side)\nMax Loss    = Net Debit × Qty",
    fields: [
      { name: "K1 Put Sell Strike", desc: "Lower OTM put — sell to reduce debit on put side." },
      { name: "K1 Put Premium",    desc: "Premium received for K1 put." },
      { name: "K2 Put Buy Strike", desc: "Upper OTM put — buy for downside exposure." },
      { name: "K2 Put Premium",    desc: "Premium paid for K2 put." },
      { name: "K3 Call Buy Strike", desc: "Lower OTM call — buy for upside exposure." },
      { name: "K3 Call Premium",   desc: "Premium paid for K3 call." },
      { name: "K4 Call Sell Strike", desc: "Upper OTM call — sell to reduce debit on call side." },
      { name: "K4 Call Premium",   desc: "Premium received for K4 call." },
    ],
  },
  "bull-call-ratio": {
    direction: "long",
    outlook: "Moderately Bullish (with defined upside risk)",
    whenToUse: "You are mildly to moderately bullish and want to reduce the cost of a long call by selling two higher-strike calls. Best when you expect the underlying to rally to a specific target level but not blow past it.",
    risk: "Unlimited above the upper breakeven — the strategy becomes net short 1 call above K2, so losses grow without bound if the underlying surges.",
    reward: "Limited — max profit at K2 = Spread Width + Net Credit (or − Net Debit).",
    summary: "Buy 1 ATM/OTM call (K1) and sell 2 OTM calls at a higher strike (K2). The short calls partially or fully fund the long call. Max profit occurs exactly at K2 at expiry. Risk is unlimited above the upper breakeven.",
    howItWorks: "You buy 1 call for directional exposure, then sell 2 calls at a higher strike to reduce cost. Since you sold more calls than you bought, you are net short 1 call above K2. This means losses accelerate if the stock rallies strongly past the upper breakeven — the key difference from a simple bull spread.",
    formula: "Net Credit/Debit = 2×K2 Premium − K1 Premium\nMax Profit (at K2) = (K2 − K1) + Net Credit\nUpper BE = 2×K2 − K1 + Net Credit\nLower BE = K1 + Net Debit (if net debit only)\nMax Loss = Unlimited above upper BE",
    fields: [
      { name: "Buy Strike (K1)",        desc: "Strike of the 1 call you buy. Usually ATM or slightly OTM." },
      { name: "K1 Premium Paid",         desc: "Premium paid per unit for the long call." },
      { name: "Sell Strike (K2)",        desc: "Strike of the 2 calls you sell. Must be higher than K1." },
      { name: "K2 Premium Received",     desc: "Premium received per unit per short call leg. Total received = 2 × this." },
      { name: "Number of Lots",          desc: "Contract multiplier for sizing." },
      { name: "Lot Size",                desc: "Units per lot." },
    ],
  },
  "short-iron-condor": {
    direction: "neutral",
    outlook: "Neutral — Low Volatility (Classic Iron Condor)",
    whenToUse: "You expect the underlying to stay in a defined range until expiry. Collect a net credit upfront and keep it if price stays between the two sold strikes.",
    risk: "Limited — max loss = (spread width − net credit) × lot size when price breaks out.",
    reward: "Limited — max profit = net credit × lot size when price stays between K2 and K3.",
    summary: "Buy K1 put + Sell K2 put (bull put spread) + Sell K3 call + Buy K4 call (bear call spread). Net credit. The most popular defined-risk premium-selling strategy. Profit if price stays between K2 and K3 at expiry.",
    howItWorks: "You simultaneously sell a put credit spread and a call credit spread, collecting net credit upfront. As long as the underlying stays between the two sold strikes (K2 and K3) you keep the full credit. If price breaks out through either wing, losses are capped by the long options.",
    formula: "Net Credit  = (K2 Put − K1 Put) + (K3 Call − K4 Call)\nLower BE    = K2 − Net Credit\nUpper BE    = K3 + Net Credit\nMax Profit  = Net Credit × Qty\nMax Loss    = (Max Spread Width − Net Credit) × Qty",
    fields: [
      { name: "K1 Put Buy Strike",  desc: "Lower OTM put — buy as downside hedge." },
      { name: "K1 Put Premium",     desc: "Premium paid for K1 put." },
      { name: "K2 Put Sell Strike", desc: "Upper OTM put — sell to collect credit." },
      { name: "K2 Put Premium",     desc: "Premium received for K2 put." },
      { name: "K3 Call Sell Strike", desc: "Lower OTM call — sell to collect credit." },
      { name: "K3 Call Premium",    desc: "Premium received for K3 call." },
      { name: "K4 Call Buy Strike", desc: "Upper OTM call — buy as upside hedge." },
      { name: "K4 Call Premium",    desc: "Premium paid for K4 call." },
    ],
  },
};

// ─── Right-hand info panel ────────────────────────────────────────
function InfoPanel({ calcId, direction, onDirectionChange }) {
  const meta = CALC_META[calcId];
  const activeDir = meta.direction === "selectable" ? direction : meta.direction;
  const dirStyle  = DIR_STYLE[activeDir] ?? DIR_STYLE.neutral;

  return (
    <div style={{ position: "sticky", top: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Direction */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Direction</p>
        {meta.direction === "selectable" ? (
          <div style={{ display: "flex", gap: 8 }}>
            {["long", "short"].map((d) => {
              const ds = DIR_STYLE[d];
              const active = direction === d;
              return (
                <button key={d} onClick={() => onDirectionChange(d)} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${active ? ds.border : "var(--border)"}`, background: active ? ds.bg : "transparent", color: active ? ds.text : "var(--text-2)", fontWeight: active ? 700 : 500, fontSize: 13, cursor: "pointer", fontFamily: "Inter, sans-serif", transition: "all 0.15s" }}>
                  {ds.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 8, background: dirStyle.bg, border: `1px solid ${dirStyle.border}` }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: dirStyle.text }}>{dirStyle.label}</span>
            {meta.outlook && <span style={{ fontSize: 12, color: dirStyle.text, opacity: 0.75 }}>· {meta.outlook}</span>}
          </div>
        )}
      </div>

      {/* Summary + How it works + Formula */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>What is this?</p>
        <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.65, margin: "0 0 18px" }}>{meta.summary}</p>
        <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>How it works</p>
        <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.65, margin: "0 0 18px" }}>{meta.howItWorks}</p>
        <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Formula</p>
        <pre style={{ fontSize: 11, color: "var(--green)", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", margin: 0, fontFamily: "JetBrains Mono, monospace", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{meta.formula}</pre>
      </div>

      {/* When to use / Risk / Reward */}
      {(meta.whenToUse || meta.risk || meta.reward) && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
          {meta.whenToUse && (
            <>
              <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>When to Use</p>
              <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.65, margin: "0 0 16px" }}>{meta.whenToUse}</p>
            </>
          )}
          {meta.risk && (
            <>
              <p style={{ fontSize: 10, fontWeight: 700, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Risk</p>
              <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.65, margin: "0 0 16px" }}>{meta.risk}</p>
            </>
          )}
          {meta.reward && (
            <>
              <p style={{ fontSize: 10, fontWeight: 700, color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Reward</p>
              <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.65, margin: 0 }}>{meta.reward}</p>
            </>
          )}
        </div>
      )}

      {/* Field glossary */}
      {meta.fields.length > 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Field Reference</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {meta.fields.map((f) => (
              <div key={f.name}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", margin: "0 0 3px" }}>{f.name}</p>
                <p style={{ fontSize: 12, color: "var(--text-2)", margin: 0, lineHeight: 1.55 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Calculator shell ────────────────────────────────────────
export default function Calculator() {
  const [searchParams] = useSearchParams();
  const initCalc = searchParams.get("calc") ?? "position";
  const [selected, setSelected]   = useState(initCalc);
  const [direction, setDirection] = useState(
    () => { const m = CALC_META[initCalc]; return m?.direction === "short" ? "short" : "long"; }
  );
  const entry         = CALCULATORS.find((c) => c.id === selected);
  const CalcComponent = entry.component;
  const isComparator  = !!entry.isComparator;

  const handleSelect = (id) => {
    setSelected(id);
    const meta = CALC_META[id];
    if (meta && meta.direction !== "selectable")
      setDirection(meta.direction === "short" ? "short" : "long");
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Calculator Type</label>
        <select value={selected} onChange={(e) => handleSelect(e.target.value)} className="t-inp" style={{ maxWidth: 260, cursor: "pointer" }}>
          {CALCULATORS.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>

      {isComparator ? (
        <SimSpotProvider key={selected}><CalcComponent key={selected} /></SimSpotProvider>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 28, alignItems: "start" }}>
          <SimSpotProvider key={selected}><CalcComponent key={selected} direction={direction} /></SimSpotProvider>
          <InfoPanel calcId={selected} direction={direction} onDirectionChange={setDirection} />
        </div>
      )}
    </div>
  );
}
