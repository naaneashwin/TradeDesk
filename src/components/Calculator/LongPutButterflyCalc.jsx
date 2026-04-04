import { useState } from "react";
import { CARD, SEC_TITLE, ERROR_BOX, Field, StatCard, PayoffChart, PLSimulator, DissectPanel, fmtINR, fmt2 } from "./shared";

// Long Put Butterfly:
//   Buy 1 upper put, Sell 2 middle puts, Buy 1 lower put
//   Net Debit = upper premium - 2×middle premium + lower premium
//   Same breakevens as call butterfly (put-call parity)
//   Lower BE = lower strike + net debit
//   Upper BE = upper strike - net debit
//   Max Profit at middle strike = wingWidth - net debit

export default function LongPutButterflyCalc() {
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
  const netDebitRaw  = premiumsOk ? uP - 2 * mP + lP : null;
  const creditError  = netDebitRaw !== null && netDebitRaw <= 0;

  const valid     = strikesOk && !orderError && premiumsOk && netDebitRaw > 0;
  const wingWidth    = valid ? mS - lS : null;
  const netDebit     = valid ? netDebitRaw : null;
  const lowerBE      = valid ? lS + netDebit : null;
  const upperBE      = valid ? uS - netDebit : null;
  const maxProfitPU  = valid ? wingWidth - netDebit : null;
  const maxProfit    = valid ? maxProfitPU * qty : null;
  const maxLoss      = valid ? netDebit * qty : null;

  const pnlFn = (spot) =>
    Math.max(0, uS - spot) - 2 * Math.max(0, mS - spot) + Math.max(0, lS - spot) - netDebit;

  const dissectSteps = valid ? [
    {
      label: "Wing Width",
      formula: `middleStrike − lowerStrike = ${fmtINR(mS)} − ${fmtINR(lS)}`,
      result: fmtINR(wingWidth),
    },
    {
      label: "Net Debit",
      formula: `upperPremium − 2×middlePremium + lowerPremium = ${fmtINR(uP)} − 2×${fmtINR(mP)} + ${fmtINR(lP)}`,
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
        <p style={SEC_TITLE}>Long Put Butterfly Inputs</p>
        <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: -12, marginBottom: 16 }}>
          Buy 1 upper put · Sell 2 middle puts · Buy 1 lower put
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Lower Strike — Buy (₹)"     k="lowerStrike"   placeholder="490" hint="Lower wing put (cheapest OTM)"  form={form} onChange={onChange} />
          <Field label="Lower Premium (₹)"          k="lowerPremium"  placeholder="8"   hint="Premium paid"                   form={form} onChange={onChange} />
          <Field label="Middle Strike — Sell ×2 (₹)" k="middleStrike" placeholder="500" hint="Body put sold twice (ATM)"      form={form} onChange={onChange} />
          <Field label="Middle Premium (₹)"         k="middlePremium" placeholder="14"  hint="Premium received per contract"  form={form} onChange={onChange} />
          <Field label="Upper Strike — Buy (₹)"     k="upperStrike"   placeholder="510" hint="Upper wing put (expensive ITM)" form={form} onChange={onChange} />
          <Field label="Upper Premium (₹)"          k="upperPremium"  placeholder="22"  hint="Premium paid"                   form={form} onChange={onChange} />
          <Field label="Number of Lots"             k="lots"          placeholder="1"                                         form={form} onChange={onChange} />
          <Field label="Lot Size"                   k="lotSize"       placeholder="50"                                        form={form} onChange={onChange} />
        </div>
        {orderError   && <div style={ERROR_BOX}>✗ Strikes must be in order: Lower &lt; Middle &lt; Upper.</div>}
        {wingsUnequal && <div style={ERROR_BOX}>⚠ Wings are unequal — standard butterflies use equidistant strikes.</div>}
        {creditError  && <div style={ERROR_BOX}>✗ Net debit is zero or negative — upper premium should exceed 2× middle minus lower premium.</div>}
      </div>

      {valid && (
        <>
          <div style={{ background: "var(--green-light)", border: "1px solid rgba(45,122,95,0.2)", borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Peak Profit — At {fmtINR(mS)}</p>
            <p style={{ fontSize: 48, fontWeight: 800, color: "var(--green)", margin: "0 0 4px", fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>{fmtINR(maxProfit)}</p>
            <p style={{ fontSize: 12, color: "rgba(45,122,95,0.7)", margin: 0 }}>Profit zone: {fmtINR(lowerBE)} – {fmtINR(upperBE)}</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <StatCard label="Net Debit"       val={fmtINR(netDebit)}   sub="Cost to enter per unit"                              col="#d97706" />
            <StatCard label="Wing Width"      val={fmtINR(wingWidth)}  sub="Strike distance (lower → middle)" />
            <StatCard label="Lower Breakeven" val={fmtINR(lowerBE)}   sub="Lower strike + net debit" />
            <StatCard label="Upper Breakeven" val={fmtINR(upperBE)}   sub="Upper strike − net debit" />
            <StatCard label="Max Profit"      val={fmtINR(maxProfit)}  sub={`At middle strike ${fmtINR(mS)} × ${qty} units`}    col="var(--green)" />
            <StatCard label="Max Loss"        val={fmtINR(maxLoss)}    sub="Net debit × qty — below lower or above upper"       col="var(--red)" />
          </div>

          <DissectPanel steps={dissectSteps} />

          <PayoffChart
            pnlFn={pnlFn}
            center={mS}
            breakevens={[lowerBE, upperBE]}
            title="Long Put Butterfly — Payoff at Expiry"
          />
          <PLSimulator
            pnlFn={pnlFn}
            qty={qty}
            breakevens={[lowerBE, upperBE]}
            legFns={[
              (spot) => Math.max(0, uS - spot) - uP,
              (spot) => mP - Math.max(0, mS - spot),
              (spot) => mP - Math.max(0, mS - spot),
              (spot) => Math.max(0, lS - spot) - lP,
            ]}
            legLabels={["Long upper put", "Short middle put (1)", "Short middle put (2)", "Long lower put"]}
          />
        </>
      )}
    </div>
  );
}
