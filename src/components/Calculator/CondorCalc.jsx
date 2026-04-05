import { useState } from "react";
import { CARD, SEC_TITLE, ERROR_BOX, Field, StatCard, PayoffChart, PLSimulator, DissectPanel, TradeExpectation, ZONE, fmtINR, fmt2 } from "./shared";

// Long Call Condor:
//   Buy 1 K1 call (lowest), Sell 1 K2 call, Sell 1 K3 call, Buy 1 K4 call (highest)
//   K1 < K2 < K3 < K4   (all equidistant ideally, but not required)
//   Net Debit = P1 + P4 − P2 − P3   (cost to enter; should be positive)
//   Inner profit zone: K2 ≤ price ≤ K3
//   Lower BE = K1 + netDebit
//   Upper BE = K4 − netDebit
//   Max Profit = (K2 − K1) − netDebit   (when price is between K2 and K3)
//   Max Loss   = netDebit                (when price is outside K1 or K4)

export default function CondorCalc() {
  const [form, setForm] = useState({
    k1: "", p1: "",
    k2: "", p2: "",
    k3: "", p3: "",
    k4: "", p4: "",
    lots: "1", lotSize: "1",
  });
  const onChange = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const k1 = parseFloat(form.k1);
  const p1 = parseFloat(form.p1);
  const k2 = parseFloat(form.k2);
  const p2 = parseFloat(form.p2);
  const k3 = parseFloat(form.k3);
  const p3 = parseFloat(form.p3);
  const k4 = parseFloat(form.k4);
  const p4 = parseFloat(form.p4);
  const lots    = parseFloat(form.lots)    || 1;
  const lotSize = parseFloat(form.lotSize) || 1;
  const qty     = lots * lotSize;

  const strikesOk  = k1 > 0 && k2 > 0 && k3 > 0 && k4 > 0;
  const orderError = strikesOk && !(k1 < k2 && k2 < k3 && k3 < k4);
  const wingsUnequal = strikesOk && !orderError &&
    Math.abs((k2 - k1) - (k4 - k3)) > 0.01;

  const premiumsOk   = p1 > 0 && p2 > 0 && p3 > 0 && p4 > 0;
  const netDebitRaw  = premiumsOk ? p1 + p4 - p2 - p3 : null;
  const creditError  = netDebitRaw !== null && netDebitRaw <= 0;

  const valid = strikesOk && !orderError && premiumsOk && netDebitRaw > 0;

  const leftWing   = valid ? k2 - k1 : null;
  const rightWing  = valid ? k4 - k3 : null;
  const innerWidth = valid ? k3 - k2 : null;
  const netDebit   = valid ? netDebitRaw : null;
  const lowerBE    = valid ? k1 + netDebit : null;
  const upperBE    = valid ? k4 - netDebit : null;
  const maxProfitPU = valid ? leftWing - netDebit : null;
  const maxProfit   = valid ? maxProfitPU * qty : null;
  const maxLoss     = valid ? netDebit * qty : null;

  const pnlFn = (spot) =>
    Math.max(0, spot - k1) - Math.max(0, spot - k2) - Math.max(0, spot - k3) + Math.max(0, spot - k4) - netDebit;

  const dissectSteps = valid ? [
    { label: "Left Wing Width",   formula: `K2 − K1 = ${fmtINR(k2)} − ${fmtINR(k1)}`, result: fmtINR(leftWing) },
    { label: "Right Wing Width",  formula: `K4 − K3 = ${fmtINR(k4)} − ${fmtINR(k3)}`, result: fmtINR(rightWing) },
    { label: "Inner Body Width",  formula: `K3 − K2 = ${fmtINR(k3)} − ${fmtINR(k2)}`, result: fmtINR(innerWidth), note: "Profit zone — price must stay between K2 and K3 for full profit." },
    {
      label: "Net Debit",
      formula: `(P1 + P4) − (P2 + P3) = (${fmtINR(p1)} + ${fmtINR(p4)}) − (${fmtINR(p2)} + ${fmtINR(p3)})`,
      result: fmtINR(netDebit),
      resultCol: "#d97706",
      note: "Cost to enter the condor. This is your max loss per unit.",
    },
    { label: "Lower Breakeven",  formula: `K1 + netDebit = ${fmtINR(k1)} + ${fmtINR(netDebit)}`, result: fmtINR(lowerBE), note: "Price must close above this for a profitable trade." },
    { label: "Upper Breakeven",  formula: `K4 − netDebit = ${fmtINR(k4)} − ${fmtINR(netDebit)}`, result: fmtINR(upperBE), note: "Price must close below this for a profitable trade." },
    {
      label: "Max Profit per Unit",
      formula: `leftWing − netDebit = ${fmtINR(leftWing)} − ${fmtINR(netDebit)}`,
      result: fmtINR(maxProfitPU),
      resultCol: "var(--green)",
      note: "Achieved when price closes between K2 and K3 at expiry.",
    },
    { label: "Max Profit (position)", formula: `maxProfitPU × qty = ${fmtINR(maxProfitPU)} × ${qty}`, result: fmtINR(maxProfit), resultCol: "var(--green)" },
    { label: "Max Loss (position)",   formula: `netDebit × qty = ${fmtINR(netDebit)} × ${qty}`, result: fmtINR(maxLoss), resultCol: "var(--red)", note: "Occurs if price closes outside the outer wings (≤ K1 or ≥ K4)." },
    { label: "Reward / Risk",         formula: `maxProfit ÷ maxLoss = ${fmtINR(maxProfit)} ÷ ${fmtINR(maxLoss)}`, result: fmt2(maxProfit / maxLoss) + "×" },
  ] : [];

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={CARD}>
        <p style={SEC_TITLE}>Long Call Condor Inputs</p>
        <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: -12, marginBottom: 16 }}>
          Buy K1 call · Sell K2 call · Sell K3 call · Buy K4 call
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="K1 — Lower Buy Strike (₹)"  k="k1" placeholder="480" hint="Lowest call — buy 1" form={form} onChange={onChange} />
          <Field label="K1 Premium (₹)"             k="p1" placeholder="40"  hint="Premium paid"        form={form} onChange={onChange} />
          <Field label="K2 — Lower Sell Strike (₹)" k="k2" placeholder="490" hint="Inner lower call — sell 1" form={form} onChange={onChange} />
          <Field label="K2 Premium (₹)"             k="p2" placeholder="30"  hint="Premium received"    form={form} onChange={onChange} />
          <Field label="K3 — Upper Sell Strike (₹)" k="k3" placeholder="510" hint="Inner upper call — sell 1" form={form} onChange={onChange} />
          <Field label="K3 Premium (₹)"             k="p3" placeholder="15"  hint="Premium received"    form={form} onChange={onChange} />
          <Field label="K4 — Upper Buy Strike (₹)"  k="k4" placeholder="520" hint="Highest call — buy 1 (hedge)" form={form} onChange={onChange} />
          <Field label="K4 Premium (₹)"             k="p4" placeholder="8"   hint="Premium paid"        form={form} onChange={onChange} />
          <Field label="Number of Lots"             k="lots"    placeholder="1"  form={form} onChange={onChange} />
          <Field label="Lot Size"                   k="lotSize" placeholder="50" form={form} onChange={onChange} />
        </div>
        {orderError   && <div style={ERROR_BOX}>✗ Strikes must be in ascending order: K1 &lt; K2 &lt; K3 &lt; K4.</div>}
        {creditError  && <div style={ERROR_BOX}>✗ Net is a credit — check premiums. For a long condor the outer legs cost more than inner legs earn.</div>}
      </div>

      {wingsUnequal && !orderError && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "rgba(217,119,6,0.08)", color: "#d97706", fontSize: 12, border: "1px solid rgba(217,119,6,0.25)" }}>
          ⚠ Wings are unequal (left: {fmtINR(k2 - k1)}, right: {fmtINR(k4 - k3)}). Max profit is capped by the smaller wing. Standard condors use equal wings.
        </div>
      )}

      {valid && (
        <>
          {/* Profit Zone banner */}
          <div style={{ background: "var(--green-light)", border: "1px solid rgba(45,122,95,0.2)", borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Profit Zone (price at expiry)</p>
            <p style={{ fontSize: 36, fontWeight: 800, color: "var(--green)", margin: "0 0 4px", fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>
              {fmtINR(lowerBE)} – {fmtINR(upperBE)}
            </p>
            <p style={{ fontSize: 12, color: "rgba(45,122,95,0.75)", margin: 0 }}>
              Full profit zone: {fmtINR(k2)} – {fmtINR(k3)} · Breakevens at {fmtINR(lowerBE)} and {fmtINR(upperBE)}
            </p>
          </div>

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <StatCard label="Net Debit"      val={fmtINR(netDebit)}     sub="Cost to enter per unit"                          col="#d97706" />
            <StatCard label="Inner Width"    val={fmtINR(innerWidth)}   sub={`Profit zone: ${fmtINR(k2)} – ${fmtINR(k3)}`}               />
            <StatCard label="Max Profit"     val={fmtINR(maxProfit)}    sub={`Price pins between K2–K3 at expiry`}             col="var(--green)" />
            <StatCard label="Max Loss"       val={fmtINR(maxLoss)}      sub="If price moves outside K1 or K4"                 col="var(--red)" />
            <StatCard label="Lower BE"       val={fmtINR(lowerBE)}      sub={`K1 + netDebit`}                                              />
            <StatCard label="Upper BE"       val={fmtINR(upperBE)}      sub={`K4 − netDebit`}                                              />
          </div>

          <div style={CARD}>
            <p style={{ fontSize: 11, color: "var(--text-3)", margin: 0 }}>
              R/R: {fmt2(maxProfit / maxLoss)}× · Wings: {fmtINR(leftWing)} / {fmtINR(rightWing)}
            </p>
          </div>

          <TradeExpectation
            zones={[
              ZONE.loss("LOSS", `Below ${fmtINR(k1)}`, "Full debit lost"),
              ZONE.building("BUILDING", `${fmtINR(k1)} → ${fmtINR(k2)}`, `BE at ${fmtINR(lowerBE)}`),
              ZONE.profit("MAX PROFIT", `${fmtINR(k2)} → ${fmtINR(k3)}`, "Flat profit zone"),
              ZONE.eroding("ERODING", `${fmtINR(k3)} → ${fmtINR(k4)}`, `BE at ${fmtINR(upperBE)}`),
              ZONE.loss("LOSS", `Above ${fmtINR(k4)}`, "Full debit lost"),
            ]}
            ideal={`Price stays between ${fmtINR(k2)} and ${fmtINR(k3)} at expiry. Wider profit window than a butterfly.`}
            exitRule="Exit at 50–60% of max profit — the flat profit zone makes timing easier than a butterfly but don't overstay."
          />

          <DissectPanel
            steps={dissectSteps}
            legs={[
              { label: "K1 Call (Buy)",  action: "Buy",  qty: 1, type: "Call", strike: k1, premium: p1, desc: "The lowest outer wing. Gives you initial upside exposure between K1 and K2. Also sets your lower breakeven. Without this, you'd have no profit at all below K2." },
              { label: "K2 Call (Sell)", action: "Sell", qty: 1, type: "Call", strike: k2, premium: p2, desc: "The lower inner sold call. Marks the lower boundary of the profit zone (K2–K3). Selling here generates premium to help fund the outer wing calls, reducing your net debit." },
              { label: "K3 Call (Sell)", action: "Sell", qty: 1, type: "Call", strike: k3, premium: p3, desc: "The upper inner sold call. Marks the upper boundary of the profit zone (K2–K3). Together with K2, these two short calls are the income-generating core of the condor." },
              { label: "K4 Call (Buy)",  action: "Buy",  qty: 1, type: "Call", strike: k4, premium: p4, desc: "The highest outer wing (hedge). Without K4, selling K3 would have unlimited upside risk. This call converts the strategy into a fully defined-risk trade — your max loss is the net debit paid." },
            ]}
            lotQty={qty}
          />

          <PayoffChart
            pnlFn={pnlFn}
            center={(k2 + k3) / 2}
            breakevens={[lowerBE, upperBE]}
            title="Long Call Condor — Payoff at Expiry"
          />
          <PLSimulator
            pnlFn={pnlFn}
            qty={qty}
            breakevens={[lowerBE, upperBE]}
            legFns={[
              (spot) => Math.max(0, spot - k1) - p1,
              (spot) => p2 - Math.max(0, spot - k2),
              (spot) => p3 - Math.max(0, spot - k3),
              (spot) => Math.max(0, spot - k4) - p4,
            ]}
            legLabels={["Long K1 Call", "Short K2 Call", "Short K3 Call", "Long K4 Call"]}
          />
        </>
      )}
    </div>
  );
}
