import { useState } from "react";
import { CARD, SEC_TITLE, ERROR_BOX, Field, StatCard, PayoffChart, PLSimulator, DissectPanel, TradeExpectation, ZONE, fmtINR, fmt2 } from "./shared";

// Long Call Butterfly:
//   Buy 1 lower call, Sell 2 middle calls, Buy 1 upper call
//   Equidistant strikes: upper - middle = middle - lower = wingWidth
//   Net Debit = lower premium - 2×middle premium + upper premium
//   Lower BE = lower strike + net debit
//   Upper BE = upper strike - net debit
//   Max Profit at middle strike = wingWidth - net debit
//   Max Loss = net debit (if price ≤ lower or ≥ upper at expiry)

export default function LongCallButterflyCalc() {
  const [form, setForm] = useState({
    lowerStrike: "", lowerPremium: "",
    middleStrike: "", middlePremium: "",
    upperStrike: "", upperPremium: "",
    lots: "1", lotSize: "1",
  });
  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const lS  = parseFloat(form.lowerStrike);
  const lP  = parseFloat(form.lowerPremium);
  const mS  = parseFloat(form.middleStrike);
  const mP  = parseFloat(form.middlePremium);
  const uS  = parseFloat(form.upperStrike);
  const uP  = parseFloat(form.upperPremium);
  const lots    = parseFloat(form.lots)    || 1;
  const lotSize = parseFloat(form.lotSize) || 1;
  const qty     = lots * lotSize;

  const strikesOk = lS > 0 && mS > 0 && uS > 0;
  const orderError = strikesOk && !(lS < mS && mS < uS);
  const wingsUnequal = strikesOk && !orderError && Math.abs((mS - lS) - (uS - mS)) > 0.01;
  const premiumsOk  = lP > 0 && mP > 0 && uP > 0;
  const netDebitRaw = premiumsOk ? lP - 2 * mP + uP : null;
  const creditError = netDebitRaw !== null && netDebitRaw <= 0;

  const valid = strikesOk && !orderError && premiumsOk && netDebitRaw > 0;

  const wingWidth    = valid ? mS - lS : null;
  const netDebit     = valid ? netDebitRaw : null;
  const lowerBE      = valid ? lS + netDebit : null;
  const upperBE      = valid ? uS - netDebit : null;
  const maxProfitPU  = valid ? wingWidth - netDebit : null;
  const maxProfit    = valid ? maxProfitPU * qty : null;
  const maxLoss      = valid ? netDebit * qty : null;

  const pnlFn = (spot) =>
    Math.max(0, spot - lS) - 2 * Math.max(0, spot - mS) + Math.max(0, spot - uS) - netDebit;

  const dissectSteps = valid ? [
    {
      label: "Wing Width",
      formula: `middleStrike − lowerStrike = ${fmtINR(mS)} − ${fmtINR(lS)}`,
      result: fmtINR(wingWidth),
    },
    {
      label: "Net Debit",
      formula: `lowerPremium − 2×middlePremium + upperPremium = ${fmtINR(lP)} − 2×${fmtINR(mP)} + ${fmtINR(uP)}`,
      result: fmtINR(netDebit),
      resultCol: "#d97706",
      note: "This is the total cost to enter the spread — your maximum possible loss per unit.",
    },
    {
      label: "Lower Breakeven",
      formula: `lowerStrike + netDebit = ${fmtINR(lS)} + ${fmtINR(netDebit)}`,
      result: fmtINR(lowerBE),
    },
    {
      label: "Upper Breakeven",
      formula: `upperStrike − netDebit = ${fmtINR(uS)} − ${fmtINR(netDebit)}`,
      result: fmtINR(upperBE),
    },
    {
      label: "Max Profit per Unit",
      formula: `wingWidth − netDebit = ${fmtINR(wingWidth)} − ${fmtINR(netDebit)}`,
      result: fmtINR(maxProfitPU),
      resultCol: "var(--green)",
      note: `Achieved when the underlying closes exactly at ${fmtINR(mS)} (middle strike) at expiry.`,
    },
    {
      label: "Max Profit (full position)",
      formula: `maxProfitPerUnit × qty = ${fmtINR(maxProfitPU)} × ${qty}`,
      result: fmtINR(maxProfit),
      resultCol: "var(--green)",
    },
    {
      label: "Max Loss (full position)",
      formula: `netDebit × qty = ${fmtINR(netDebit)} × ${qty}`,
      result: fmtINR(maxLoss),
      resultCol: "var(--red)",
      note: "Occurs if the price closes at or below the lower strike, or at or above the upper strike.",
    },
  ] : [];

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={CARD}>
        <p style={SEC_TITLE}>Long Call Butterfly Inputs</p>
        <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: -12, marginBottom: 16 }}>
          Buy 1 lower call · Sell 2 middle calls · Buy 1 upper call
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Lower Strike — Buy (₹)"    k="lowerStrike"   placeholder="490" hint="Lower wing call (cheapest)"     form={form} onChange={onChange} />
          <Field label="Lower Premium (₹)"         k="lowerPremium"  placeholder="22"  hint="Premium paid"                  form={form} onChange={onChange} />
          <Field label="Middle Strike — Sell ×2 (₹)" k="middleStrike" placeholder="500" hint="Body call sold twice (ATM)"   form={form} onChange={onChange} />
          <Field label="Middle Premium (₹)"        k="middlePremium" placeholder="14"  hint="Premium received per contract" form={form} onChange={onChange} />
          <Field label="Upper Strike — Buy (₹)"    k="upperStrike"   placeholder="510" hint="Upper wing call (cheapest OTM)" form={form} onChange={onChange} />
          <Field label="Upper Premium (₹)"         k="upperPremium"  placeholder="8"   hint="Premium paid"                  form={form} onChange={onChange} />
          <Field label="Number of Lots"            k="lots"          placeholder="1"                                        form={form} onChange={onChange} />
          <Field label="Lot Size"                  k="lotSize"       placeholder="50"                                       form={form} onChange={onChange} />
        </div>
        {orderError      && <div style={ERROR_BOX}>✗ Strikes must be in order: Lower &lt; Middle &lt; Upper.</div>}
        {wingsUnequal    && <div style={ERROR_BOX}>⚠ Wings are unequal — standard butterflies have equidistant strikes. Results may be asymmetric.</div>}
        {creditError     && <div style={ERROR_BOX}>✗ Net debit is zero or negative — check premiums. Lower premium should exceed 2× middle minus upper.</div>}
      </div>

      {valid && (
        <>
          {/* Peak profit card */}
          <div style={{ background: "var(--green-light)", border: "1px solid rgba(45,122,95,0.2)", borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Peak Profit — At {fmtINR(mS)}</p>
            <p style={{ fontSize: 48, fontWeight: 800, color: "var(--green)", margin: "0 0 4px", fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>{fmtINR(maxProfit)}</p>
            <p style={{ fontSize: 12, color: "rgba(45,122,95,0.7)", margin: 0 }}>Profit zone: {fmtINR(lowerBE)} – {fmtINR(upperBE)}</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <StatCard label="Net Debit"       val={fmtINR(netDebit)}   sub="Cost to enter per unit"                              col="#d97706" />
            <StatCard label="Wing Width"      val={fmtINR(wingWidth)}  sub="Strike distance (lower → middle)" />
            <StatCard label="Lower Breakeven" val={fmtINR(lowerBE)}   sub={`Lower strike + net debit`} />
            <StatCard label="Upper Breakeven" val={fmtINR(upperBE)}   sub={`Upper strike − net debit`} />
            <StatCard label="Max Profit"      val={fmtINR(maxProfit)}  sub={`At middle strike ${fmtINR(mS)} × ${qty} units`}    col="var(--green)" />
            <StatCard label="Max Loss"        val={fmtINR(maxLoss)}    sub="Net debit × qty — below lower or above upper"       col="var(--red)" />
          </div>

          <TradeExpectation
            zones={[
              ZONE.loss("LOSS", `Below ${fmtINR(lowerBE)}`, "Full debit lost"),
              ZONE.building("BUILDING", `${fmtINR(lowerBE)} → ${fmtINR(mS)}`, "Profit rises to peak"),
              ZONE.profit("PEAK ✓", `At ${fmtINR(mS)}`, "Max profit here"),
              ZONE.eroding("ERODING", `${fmtINR(mS)} → ${fmtINR(upperBE)}`, "Profit falling"),
              ZONE.loss("LOSS", `Above ${fmtINR(upperBE)}`, "Full debit lost"),
            ]}
            ideal={`Price pins exactly at ${fmtINR(mS)} at expiry. Even a partial profit near the middle strike is a win.`}
            exitRule="Exit at 50–60% of max profit — don't hold hoping for a pin. A pinned strike at expiry is rare and greedy."
          />

          <DissectPanel
            steps={dissectSteps}
            legs={[
              { label: "Lower Call (Buy)",   action: "Buy",  qty: 1, type: "Call", strike: lS, premium: lP, desc: "The lower wing. Establishes your directional exposure between K1 and K2. This leg pays off as price rises from the lower strike, and defines your lower breakeven point." },
              { label: "Middle Call (Sell)", action: "Sell", qty: 2, type: "Call", strike: mS, premium: mP, desc: "The body of the butterfly — selling two ATM calls is the core income-generating mechanism. Selling twice creates the profit peak exactly at this strike at expiry. This leg also significantly reduces your net debit." },
              { label: "Upper Call (Buy)",   action: "Buy",  qty: 1, type: "Call", strike: uS, premium: uP, desc: "The upper wing (hedge). Without this, selling 2 middle calls would expose you to unlimited upside risk. This call caps your maximum loss if price rallies beyond K3, making the whole position a defined-risk trade." },
            ]}
            lotQty={qty}
          />

          <PayoffChart
            pnlFn={pnlFn}
            center={mS}
            breakevens={[lowerBE, upperBE]}
            title="Long Call Butterfly — Payoff at Expiry"
          />
          <PLSimulator
            pnlFn={pnlFn}
            qty={qty}
            breakevens={[lowerBE, upperBE]}
            legFns={[
              (spot) => Math.max(0, spot - lS) - lP,
              (spot) => mP - Math.max(0, spot - mS),
              (spot) => mP - Math.max(0, spot - mS),
              (spot) => Math.max(0, spot - uS) - uP,
            ]}
            legLabels={["Long lower call", "Short middle call (1)", "Short middle call (2)", "Long upper call"]}
          />
        </>
      )}
    </div>
  );
}
