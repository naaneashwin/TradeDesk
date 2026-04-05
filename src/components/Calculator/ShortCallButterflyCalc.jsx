import { useState } from "react";
import { CARD, SEC_TITLE, ERROR_BOX, Field, StatCard, PayoffChart, PLSimulator, DissectPanel, TradeExpectation, ZONE, fmtINR, fmt2 } from "./shared";

// Short Call Butterfly (mirror of long — collect credit):
//   Sell 1 lower call, Buy 2 middle calls, Sell 1 upper call
//   Net Credit = (lower premium + upper premium) - 2×middle premium
//   Lower BE = lower strike + net credit
//   Upper BE = upper strike - net credit
//   Max Profit = net credit × qty (at or below lower OR at or above upper strike)
//   Max Loss   = (wingWidth − net credit) × qty (price pins at middle strike)

export default function ShortCallButterflyCalc() {
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

  const strikesOk    = lS > 0 && mS > 0 && uS > 0;
  const orderError   = strikesOk && !(lS < mS && mS < uS);
  const wingsUnequal = strikesOk && !orderError && Math.abs((mS - lS) - (uS - mS)) > 0.01;
  const premiumsOk   = lP > 0 && mP > 0 && uP > 0;
  const netCreditRaw = premiumsOk ? lP + uP - 2 * mP : null;
  const debitError   = netCreditRaw !== null && netCreditRaw <= 0;

  const valid = strikesOk && !orderError && premiumsOk && netCreditRaw > 0;

  const wingWidth   = valid ? mS - lS : null;
  const netCredit   = valid ? netCreditRaw : null;
  const lowerBE     = valid ? lS + netCredit : null;
  const upperBE     = valid ? uS - netCredit : null;
  const maxProfit   = valid ? netCredit * qty : null;
  const maxLossPerU = valid ? wingWidth - netCredit : null;
  const maxLoss     = valid ? maxLossPerU * qty : null;

  const pnlFn = (spot) =>
    -(Math.max(0, spot - lS) - 2 * Math.max(0, spot - mS) + Math.max(0, spot - uS)) + netCredit;

  const dissectSteps = valid ? [
    {
      label: "Wing Width",
      formula: `middleStrike − lowerStrike = ${fmtINR(mS)} − ${fmtINR(lS)}`,
      result: fmtINR(wingWidth),
    },
    {
      label: "Net Credit",
      formula: `lowerPremium + upperPremium − 2×middlePremium = ${fmtINR(lP)} + ${fmtINR(uP)} − 2×${fmtINR(mP)}`,
      result: fmtINR(netCredit),
      resultCol: "var(--green)",
      note: "Credit collected upfront — this is your maximum possible profit per unit.",
    },
    {
      label: "Lower Breakeven",
      formula: `lowerStrike + netCredit = ${fmtINR(lS)} + ${fmtINR(netCredit)}`,
      result: fmtINR(lowerBE),
    },
    {
      label: "Upper Breakeven",
      formula: `upperStrike − netCredit = ${fmtINR(uS)} − ${fmtINR(netCredit)}`,
      result: fmtINR(upperBE),
    },
    {
      label: "Max Profit (full position)",
      formula: `netCredit × qty = ${fmtINR(netCredit)} × ${qty}`,
      result: fmtINR(maxProfit),
      resultCol: "var(--green)",
      note: "Profit when price moves beyond either wing (price ≤ lower or ≥ upper) at expiry.",
    },
    {
      label: "Max Loss per Unit",
      formula: `wingWidth − netCredit = ${fmtINR(wingWidth)} − ${fmtINR(netCredit)}`,
      result: fmtINR(maxLossPerU),
      resultCol: "var(--red)",
      note: `Worst case when the underlying pins at ${fmtINR(mS)} (middle strike) at expiry.`,
    },
    {
      label: "Max Loss (full position)",
      formula: `maxLossPerUnit × qty = ${fmtINR(maxLossPerU)} × ${qty}`,
      result: fmtINR(maxLoss),
      resultCol: "var(--red)",
    },
  ] : [];

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={CARD}>
        <p style={SEC_TITLE}>Short Call Butterfly Inputs</p>
        <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: -12, marginBottom: 16 }}>
          Sell 1 lower call · Buy 2 middle calls · Sell 1 upper call (collect credit)
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Lower Strike — Sell (₹)"    k="lowerStrike"   placeholder="490" hint="Lower wing call (sold)"           form={form} onChange={onChange} />
          <Field label="Lower Premium (₹)"          k="lowerPremium"  placeholder="22"  hint="Premium received"                 form={form} onChange={onChange} />
          <Field label="Middle Strike — Buy ×2 (₹)" k="middleStrike"  placeholder="500" hint="Body calls bought twice (ATM)"    form={form} onChange={onChange} />
          <Field label="Middle Premium (₹)"         k="middlePremium" placeholder="14"  hint="Premium paid per contract"        form={form} onChange={onChange} />
          <Field label="Upper Strike — Sell (₹)"    k="upperStrike"   placeholder="510" hint="Upper wing call (sold)"           form={form} onChange={onChange} />
          <Field label="Upper Premium (₹)"          k="upperPremium"  placeholder="8"   hint="Premium received"                 form={form} onChange={onChange} />
          <Field label="Number of Lots"             k="lots"          placeholder="1"                                           form={form} onChange={onChange} />
          <Field label="Lot Size"                   k="lotSize"       placeholder="50"                                          form={form} onChange={onChange} />
        </div>
        {orderError   && <div style={ERROR_BOX}>✗ Strikes must be in order: Lower &lt; Middle &lt; Upper.</div>}
        {wingsUnequal && <div style={ERROR_BOX}>⚠ Wings are unequal — standard butterflies use equidistant strikes.</div>}
        {debitError   && <div style={ERROR_BOX}>✗ Net credit is zero or negative — wing premiums should together exceed 2× middle premium.</div>}
      </div>

      {valid && (
        <>
          <div style={{ background: "var(--green-light)", border: "1px solid rgba(45,122,95,0.2)", borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Max Profit — Price Breaks Out</p>
            <p style={{ fontSize: 48, fontWeight: 800, color: "var(--green)", margin: "0 0 4px", fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>{fmtINR(maxProfit)}</p>
            <p style={{ fontSize: 12, color: "rgba(45,122,95,0.7)", margin: 0 }}>Safe zone: price stays between {fmtINR(lowerBE)} – {fmtINR(upperBE)}</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <StatCard label="Net Credit"      val={fmtINR(netCredit)}  sub="Credit received per unit"                             col="var(--green)" />
            <StatCard label="Wing Width"      val={fmtINR(wingWidth)}  sub="Strike distance (lower → middle)" />
            <StatCard label="Lower Breakeven" val={fmtINR(lowerBE)}   sub="Lower strike + net credit" />
            <StatCard label="Upper Breakeven" val={fmtINR(upperBE)}   sub="Upper strike − net credit" />
            <StatCard label="Max Profit"      val={fmtINR(maxProfit)}  sub="Price ≤ lower or ≥ upper at expiry"                  col="var(--green)" />
            <StatCard label="Max Loss"        val={fmtINR(maxLoss)}    sub={`If price pins at middle ${fmtINR(mS)}`}             col="var(--red)" />
          </div>

          <TradeExpectation
            zones={[
              ZONE.profit("PROFIT", `Below ${fmtINR(lowerBE)}`, "Keep full credit"),
              ZONE.eroding("ERODING", `${fmtINR(lowerBE)} → ${fmtINR(mS)}`, "Credit shrinks"),
              ZONE.loss("MAX LOSS", `Around ${fmtINR(mS)}`, "Loss peaks at middle"),
              ZONE.building("BUILDING", `${fmtINR(mS)} → ${fmtINR(upperBE)}`, "Credit rebuilds"),
              ZONE.profit("PROFIT", `Above ${fmtINR(upperBE)}`, "Keep full credit"),
            ]}
            ideal={`A large move — well below ${fmtINR(lS)} or well above ${fmtINR(uS)}. Big move = max profit, small move = max loss.`}
            exitRule="Exit if price is stalling near the middle strike — the max loss occurs right at a pin. Don't wait for expiry."
          />

          <DissectPanel
            steps={dissectSteps}
            legs={[
              { label: "Lower Call (Sell)",  action: "Sell", qty: 1, type: "Call", strike: lS, premium: lP, desc: "Collects premium on the lower wing. This leg profits if price stays below the lower strike at expiry, and is part of the net credit received upfront." },
              { label: "Middle Call (Buy)",  action: "Buy",  qty: 2, type: "Call", strike: mS, premium: mP, desc: "The core volatility legs — buying two ATM calls is the primary directional bet. These pay off if price makes a large move above the upper breakeven. They're your 'long volatility' exposure." },
              { label: "Upper Call (Sell)",  action: "Sell", qty: 1, type: "Call", strike: uS, premium: uP, desc: "Collects premium on the upper wing. Combined with the lower short call, this funds the two long middle calls and creates the net credit. Caps maximum loss if price moves far above K3." },
            ]}
            lotQty={qty}
          />

          <PayoffChart
            pnlFn={pnlFn}
            center={mS}
            breakevens={[lowerBE, upperBE]}
            title="Short Call Butterfly — Payoff at Expiry"
          />
          <PLSimulator
            pnlFn={pnlFn}
            qty={qty}
            breakevens={[lowerBE, upperBE]}
            isShort
            legFns={[
              (spot) => lP - Math.max(0, spot - lS),
              (spot) => Math.max(0, spot - mS) - mP,
              (spot) => Math.max(0, spot - mS) - mP,
              (spot) => uP - Math.max(0, spot - uS),
            ]}
            legLabels={["Short lower call", "Long middle call (1)", "Long middle call (2)", "Short upper call"]}
          />
        </>
      )}
    </div>
  );
}
