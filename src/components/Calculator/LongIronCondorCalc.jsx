import { useState } from "react";
import { CARD, SEC_TITLE, ERROR_BOX, Field, StatCard, PayoffChart, PLSimulator, DissectPanel, TradeExpectation, ZONE, fmtINR, fmt2 } from "./shared";

// Long Iron Condor (= net DEBIT, profits on big moves):
//   Sell K1 put (lower OTM) + Buy K2 put (upper, closer ATM)   → bear put spread, net debit
//   Buy  K3 call (lower, closer ATM) + Sell K4 call (upper OTM) → bull call spread, net debit
//   K1 < K2 < K3 < K4
//
//   netPutDebit  = K2 put premium − K1 put premium  (positive)
//   netCallDebit = K3 call premium − K4 call premium (positive)
//   Net Debit    = netPutDebit + netCallDebit
//
//   Max Loss  = Net Debit (when K2 ≤ price ≤ K3 — no spread pays off)
//   Max Profit lower = (K2 − K1) − Net Debit (price ≤ K1)
//   Max Profit upper = (K4 − K3) − Net Debit (price ≥ K4)
//   Lower BE  = K2 − Net Debit
//   Upper BE  = K3 + Net Debit

export default function LongIronCondorCalc() {
  const [form, setForm] = useState({
    k1: "", pk1: "",   // lower put — sell
    k2: "", pk2: "",   // upper put — buy
    k3: "", ck3: "",   // lower call — buy
    k4: "", ck4: "",   // upper call — sell
    lots: "1", lotSize: "1",
  });
  const onChange = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const k1  = parseFloat(form.k1);
  const pk1 = parseFloat(form.pk1);
  const k2  = parseFloat(form.k2);
  const pk2 = parseFloat(form.pk2);
  const k3  = parseFloat(form.k3);
  const ck3 = parseFloat(form.ck3);
  const k4  = parseFloat(form.k4);
  const ck4 = parseFloat(form.ck4);
  const lots    = parseFloat(form.lots)    || 1;
  const lotSize = parseFloat(form.lotSize) || 1;
  const qty     = lots * lotSize;

  const strikesOk  = k1 > 0 && k2 > 0 && k3 > 0 && k4 > 0;
  const orderError = strikesOk && !(k1 < k2 && k2 < k3 && k3 < k4);

  const premiumsOk    = pk1 > 0 && pk2 > 0 && ck3 > 0 && ck4 > 0;
  const putDebitRaw   = premiumsOk ? pk2 - pk1 : null;
  const callDebitRaw  = premiumsOk ? ck3 - ck4 : null;
  const putDebitErr   = putDebitRaw  !== null && putDebitRaw  <= 0;
  const callDebitErr  = callDebitRaw !== null && callDebitRaw <= 0;
  const netDebitRaw   = putDebitRaw !== null && callDebitRaw !== null ? putDebitRaw + callDebitRaw : null;

  const wingsUnequal = strikesOk && !orderError &&
    Math.abs((k2 - k1) - (k4 - k3)) > 0.01;

  const valid = strikesOk && !orderError && premiumsOk &&
    putDebitRaw > 0 && callDebitRaw > 0;

  const putSpreadW  = valid ? k2 - k1 : null;
  const callSpreadW = valid ? k4 - k3 : null;
  const netDebit    = valid ? netDebitRaw : null;
  const lowerBE     = valid ? k2 - netDebit : null;
  const upperBE     = valid ? k3 + netDebit : null;
  const maxProfitLo = valid ? putSpreadW  - netDebit : null;
  const maxProfitHi = valid ? callSpreadW - netDebit : null;
  const maxProfit   = valid ? Math.max(maxProfitLo, maxProfitHi) * qty : null;
  const maxLoss     = valid ? netDebit * qty : null;

  const pnlFn = (spot) => {
    const putP  = Math.max(0, k2 - spot) - Math.max(0, k1 - spot) - putDebitRaw;
    const callP = Math.max(0, spot - k3) - Math.max(0, spot - k4) - callDebitRaw;
    return putP + callP;
  };

  const dissectSteps = valid ? [
    { label: "Put Spread Width",   formula: `K2 − K1 = ${fmtINR(k2)} − ${fmtINR(k1)}`, result: fmtINR(putSpreadW) },
    { label: "Call Spread Width",  formula: `K4 − K3 = ${fmtINR(k4)} − ${fmtINR(k3)}`, result: fmtINR(callSpreadW) },
    { label: "Put Spread Debit",   formula: `K2 put premium − K1 put premium = ${fmtINR(pk2)} − ${fmtINR(pk1)}`, result: fmtINR(putDebitRaw), resultCol: "#d97706", note: "Cost of the bear put spread (buy K2 put, sell K1 put)." },
    { label: "Call Spread Debit",  formula: `K3 call premium − K4 call premium = ${fmtINR(ck3)} − ${fmtINR(ck4)}`, result: fmtINR(callDebitRaw), resultCol: "#d97706", note: "Cost of the bull call spread (buy K3 call, sell K4 call)." },
    { label: "Net Debit",          formula: `putDebit + callDebit = ${fmtINR(putDebitRaw)} + ${fmtINR(callDebitRaw)}`, result: fmtINR(netDebit), resultCol: "#d97706", note: "Total cost to enter. This is your max loss per unit — occurs when price is between K2 and K3." },
    { label: "Lower Breakeven",    formula: `K2 − netDebit = ${fmtINR(k2)} − ${fmtINR(netDebit)}`, result: fmtINR(lowerBE), note: "Price must fall below this for the put spread to profit." },
    { label: "Upper Breakeven",    formula: `K3 + netDebit = ${fmtINR(k3)} + ${fmtINR(netDebit)}`, result: fmtINR(upperBE), note: "Price must rise above this for the call spread to profit." },
    { label: "Max Profit (lower)", formula: `putSpreadWidth − netDebit = ${fmtINR(putSpreadW)} − ${fmtINR(netDebit)}`, result: fmtINR(maxProfitLo), resultCol: "var(--green)", note: `Achieved when price ≤ ${fmtINR(k1)} at expiry.` },
    { label: "Max Profit (upper)", formula: `callSpreadWidth − netDebit = ${fmtINR(callSpreadW)} − ${fmtINR(netDebit)}`, result: fmtINR(maxProfitHi), resultCol: "var(--green)", note: `Achieved when price ≥ ${fmtINR(k4)} at expiry.` },
    { label: "Max Loss (position)", formula: `netDebit × qty = ${fmtINR(netDebit)} × ${qty}`, result: fmtINR(maxLoss), resultCol: "var(--red)", note: `Occurs when price stays between ${fmtINR(k2)} and ${fmtINR(k3)} at expiry.` },
  ] : [];

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={CARD}>
        <p style={SEC_TITLE}>Long Iron Condor Inputs</p>
        <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: -12, marginBottom: 16 }}>
          Sell K1 Put · Buy K2 Put · Buy K3 Call · Sell K4 Call — net debit, profits on big moves
        </p>

        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Put Side (Bear Put Spread)</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <Field label="K1 — Lower Put Strike (Sell ₹)" k="k1"  placeholder="480" hint="Further OTM put — sell" form={form} onChange={onChange} />
          <Field label="K1 Put Premium (₹)"             k="pk1" placeholder="8"   hint="Premium received"       form={form} onChange={onChange} />
          <Field label="K2 — Upper Put Strike (Buy ₹)"  k="k2"  placeholder="490" hint="Closer ATM put — buy"   form={form} onChange={onChange} />
          <Field label="K2 Put Premium (₹)"             k="pk2" placeholder="18"  hint="Premium paid"           form={form} onChange={onChange} />
        </div>

        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Call Side (Bull Call Spread)</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <Field label="K3 — Lower Call Strike (Buy ₹)"  k="k3"  placeholder="510" hint="Closer ATM call — buy" form={form} onChange={onChange} />
          <Field label="K3 Call Premium (₹)"             k="ck3" placeholder="18"  hint="Premium paid"          form={form} onChange={onChange} />
          <Field label="K4 — Upper Call Strike (Sell ₹)" k="k4"  placeholder="520" hint="Further OTM call — sell" form={form} onChange={onChange} />
          <Field label="K4 Call Premium (₹)"             k="ck4" placeholder="8"   hint="Premium received"       form={form} onChange={onChange} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Number of Lots" k="lots"    placeholder="1"  form={form} onChange={onChange} />
          <Field label="Lot Size"       k="lotSize" placeholder="50" form={form} onChange={onChange} />
        </div>

        {orderError   && <div style={ERROR_BOX}>✗ Strikes must be in ascending order: K1 &lt; K2 &lt; K3 &lt; K4.</div>}
        {!orderError && putDebitErr  && <div style={ERROR_BOX}>✗ Put spread shows a credit — K2 put premium must exceed K1 put premium. Ensure K2 &gt; K1.</div>}
        {!orderError && callDebitErr && <div style={ERROR_BOX}>✗ Call spread shows a credit — K3 call premium must exceed K4 call premium. Ensure K3 &lt; K4.</div>}
      </div>

      {wingsUnequal && !orderError && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "rgba(217,119,6,0.08)", color: "#d97706", fontSize: 12, border: "1px solid rgba(217,119,6,0.25)" }}>
          ⚠ Spread widths are unequal (put spread: {fmtINR(k2 - k1)}, call spread: {fmtINR(k4 - k3)}). Max profit will differ by direction.
        </div>
      )}

      {valid && (
        <>
          {/* BE banner */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div style={{ background: "var(--green-light)", border: "1px solid rgba(45,122,95,0.2)", borderRadius: 12, padding: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Lower Breakeven</p>
              <p style={{ fontSize: 32, fontWeight: 800, color: "var(--green)", margin: 0, fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>{fmtINR(lowerBE)}</p>
              <p style={{ fontSize: 11, color: "rgba(45,122,95,0.7)", margin: "4px 0 0" }}>Profit below this (downside)</p>
            </div>
            <div style={{ background: "var(--green-light)", border: "1px solid rgba(45,122,95,0.2)", borderRadius: 12, padding: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Upper Breakeven</p>
              <p style={{ fontSize: 32, fontWeight: 800, color: "var(--green)", margin: 0, fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>{fmtINR(upperBE)}</p>
              <p style={{ fontSize: 11, color: "rgba(45,122,95,0.7)", margin: "4px 0 0" }}>Profit above this (upside)</p>
            </div>
          </div>

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <StatCard label="Net Debit"        val={fmtINR(netDebit)}    sub="Total cost to enter"                  col="#d97706" />
            <StatCard label="Max Loss"         val={fmtINR(maxLoss)}     sub={`Price between ${fmtINR(k2)}–${fmtINR(k3)}`} col="var(--red)" />
            <StatCard label="Max Profit (Down)" val={fmtINR(maxProfitLo * qty)} sub={`Price ≤ ${fmtINR(k1)} at expiry`}   col="var(--green)" />
            <StatCard label="Max Profit (Up)"   val={fmtINR(maxProfitHi * qty)} sub={`Price ≥ ${fmtINR(k4)} at expiry`}   col="var(--green)" />
          </div>

          <TradeExpectation
            zones={[
              ZONE.profit("PROFIT ↓", `Below ${fmtINR(lowerBE)}`, "Grows as price falls"),
              ZONE.eroding("ERODING", `${fmtINR(lowerBE)} → ${fmtINR(k2)}`, "Profit falls to zero"),
              ZONE.loss("MAX LOSS", `${fmtINR(k2)} → ${fmtINR(k3)}`, "Full debit lost", 2),
              ZONE.building("BUILDING", `${fmtINR(k3)} → ${fmtINR(upperBE)}`, "Profit builds up"),
              ZONE.profit("PROFIT ↑", `Above ${fmtINR(upperBE)}`, "Grows as price rises"),
            ]}
            ideal={`A large move in either direction — below ${fmtINR(lowerBE)} or above ${fmtINR(upperBE)}.`}
            exitRule="Exit if price stalls in the loss zone — time decay works against you on this debit strategy. Act early."
          />

          <DissectPanel
            steps={dissectSteps}
            legs={[
              { label: "K1 Put (Sell)",  action: "Sell", qty: 1, type: "Put",  strike: k1, premium: pk1, desc: "Sold OTM put that reduces the cost of the bear put spread. This limits your maximum profit on a downward move but lowers the overall debit paid. Think of it as partially funding the K2 put you buy." },
              { label: "K2 Put (Buy)",   action: "Buy",  qty: 1, type: "Put",  strike: k2, premium: pk2, desc: "The primary downside exposure leg. This put gains value as price falls below K2. It's closer to ATM than K1, so it reacts faster to price moves and provides the core bear profit." },
              { label: "K3 Call (Buy)",  action: "Buy",  qty: 1, type: "Call", strike: k3, premium: ck3, desc: "The primary upside exposure leg. This call gains value as price rises above K3. Mirrors the K2 put on the other side — provides the core bull profit if price breaks out upward." },
              { label: "K4 Call (Sell)", action: "Sell", qty: 1, type: "Call", strike: k4, premium: ck4, desc: "Sold OTM call that reduces the cost of the bull call spread. Limits your maximum profit on an upward move but lowers the overall debit. Partially funds the K3 call purchase." },
            ]}
            lotQty={qty}
          />

          <PayoffChart
            pnlFn={pnlFn}
            center={(k2 + k3) / 2}
            breakevens={[lowerBE, upperBE]}
            title="Long Iron Condor — Payoff at Expiry"
          />
          <PLSimulator
            pnlFn={pnlFn}
            qty={qty}
            breakevens={[lowerBE, upperBE]}
            isShort
            legFns={[
              (spot) => pk1 - Math.max(0, k1 - spot),
              (spot) => Math.max(0, k2 - spot) - pk2,
              (spot) => Math.max(0, spot - k3) - ck3,
              (spot) => ck4 - Math.max(0, spot - k4),
            ]}
            legLabels={["Short K1 Put", "Long K2 Put", "Long K3 Call", "Short K4 Call"]}
          />
        </>
      )}
    </div>
  );
}
