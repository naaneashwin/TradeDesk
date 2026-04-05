import { useState } from "react";
import { CARD, SEC_TITLE, ERROR_BOX, Field, StatCard, PayoffChart, PLSimulator, DissectPanel, TradeExpectation, ZONE, fmtINR, fmt2 } from "./shared";

// Short Iron Condor (= net CREDIT, profits when price stays in range — the classic Iron Condor):
//   Buy  K1 put (lower OTM) + Sell K2 put (upper, closer ATM) → bull put spread = put credit spread
//   Sell K3 call (lower, closer ATM) + Buy K4 call (upper OTM) → bear call spread = call credit spread
//   K1 < K2 < K3 < K4
//
//   putSpreadCredit  = K2 put premium − K1 put premium  (positive)
//   callSpreadCredit = K3 call premium − K4 call premium (positive)
//   Net Credit = putSpreadCredit + callSpreadCredit
//
//   Max Profit = Net Credit (when K2 ≤ price ≤ K3 — in the profit zone)
//   Max Loss   = max(K2−K1, K4−K3) − Net Credit (binding spread width)
//   Lower BE   = K2 − Net Credit
//   Upper BE   = K3 + Net Credit

export default function ShortIronCondorCalc() {
  const [form, setForm] = useState({
    k1: "", pk1: "",   // lower put — buy (OTM hedge)
    k2: "", pk2: "",   // upper put — sell (closer ATM, receive premium)
    k3: "", ck3: "",   // lower call — sell (closer ATM, receive premium)
    k4: "", ck4: "",   // upper call — buy (OTM hedge)
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

  const premiumsOk     = pk1 > 0 && pk2 > 0 && ck3 > 0 && ck4 > 0;
  const putCreditRaw   = premiumsOk ? pk2 - pk1 : null;
  const callCreditRaw  = premiumsOk ? ck3 - ck4 : null;
  const putCreditErr   = putCreditRaw  !== null && putCreditRaw  <= 0;
  const callCreditErr  = callCreditRaw !== null && callCreditRaw <= 0;
  const netCreditRaw   = putCreditRaw !== null && callCreditRaw !== null ? putCreditRaw + callCreditRaw : null;

  const wingsUnequal = strikesOk && !orderError &&
    Math.abs((k2 - k1) - (k4 - k3)) > 0.01;

  const valid = strikesOk && !orderError && premiumsOk &&
    putCreditRaw > 0 && callCreditRaw > 0;

  const putSpreadW  = valid ? k2 - k1 : null;
  const callSpreadW = valid ? k4 - k3 : null;
  const netCredit   = valid ? netCreditRaw : null;
  const maxProfit   = valid ? netCredit * qty : null;
  const maxLossPerUnit = valid ? Math.max(putSpreadW, callSpreadW) - netCredit : null;
  const maxLoss     = valid ? maxLossPerUnit * qty : null;
  const lowerBE     = valid ? k2 - netCredit : null;
  const upperBE     = valid ? k3 + netCredit : null;

  const pnlFn = (spot) => {
    const putP  = Math.max(0, k1 - spot) - Math.max(0, k2 - spot) + putCreditRaw;
    const callP = putCreditRaw !== null ? (callCreditRaw - Math.max(0, spot - k3) + Math.max(0, spot - k4)) : 0;
    return (Math.max(0, k1 - spot) - Math.max(0, k2 - spot) + putCreditRaw)
         + (callCreditRaw - Math.max(0, spot - k3) + Math.max(0, spot - k4));
  };

  const dissectSteps = valid ? [
    { label: "Put Spread Width",    formula: `K2 − K1 = ${fmtINR(k2)} − ${fmtINR(k1)}`, result: fmtINR(putSpreadW) },
    { label: "Call Spread Width",   formula: `K4 − K3 = ${fmtINR(k4)} − ${fmtINR(k3)}`, result: fmtINR(callSpreadW) },
    { label: "Put Spread Credit",   formula: `K2 put premium − K1 put premium = ${fmtINR(pk2)} − ${fmtINR(pk1)}`, result: fmtINR(putCreditRaw), resultCol: "var(--green)", note: "Credit from selling K2 put and buying K1 put as a hedge." },
    { label: "Call Spread Credit",  formula: `K3 call premium − K4 call premium = ${fmtINR(ck3)} − ${fmtINR(ck4)}`, result: fmtINR(callCreditRaw), resultCol: "var(--green)", note: "Credit from selling K3 call and buying K4 call as a hedge." },
    { label: "Net Credit",          formula: `putCredit + callCredit = ${fmtINR(putCreditRaw)} + ${fmtINR(callCreditRaw)}`, result: fmtINR(netCredit), resultCol: "var(--green)", note: "Total upfront credit. This is your max profit per unit." },
    { label: "Max Profit (position)", formula: `netCredit × qty = ${fmtINR(netCredit)} × ${qty}`, result: fmtINR(maxProfit), resultCol: "var(--green)", note: `Price must stay between ${fmtINR(k2)} and ${fmtINR(k3)} at expiry.` },
    { label: "Lower Breakeven",     formula: `K2 − netCredit = ${fmtINR(k2)} − ${fmtINR(netCredit)}`, result: fmtINR(lowerBE), note: "Price must stay above this for full profit on the put side." },
    { label: "Upper Breakeven",     formula: `K3 + netCredit = ${fmtINR(k3)} + ${fmtINR(netCredit)}`, result: fmtINR(upperBE), note: "Price must stay below this for full profit on the call side." },
    { label: "Max Loss per Unit",   formula: `max(putWidth, callWidth) − netCredit = ${fmtINR(Math.max(putSpreadW, callSpreadW))} − ${fmtINR(netCredit)}`, result: fmtINR(maxLossPerUnit), resultCol: "var(--red)", note: "Occurs if price breaks below K1 or above K4 at expiry." },
    { label: "Max Loss (position)", formula: `maxLossPerUnit × qty = ${fmtINR(maxLossPerUnit)} × ${qty}`, result: fmtINR(maxLoss), resultCol: "var(--red)" },
    { label: "Reward / Risk",       formula: `maxProfit ÷ maxLoss = ${fmtINR(maxProfit)} ÷ ${fmtINR(maxLoss)}`, result: fmt2(maxProfit / maxLoss) + "×" },
  ] : [];

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={CARD}>
        <p style={SEC_TITLE}>Short Iron Condor Inputs</p>
        <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: -12, marginBottom: 16 }}>
          Buy K1 Put · Sell K2 Put · Sell K3 Call · Buy K4 Call — net credit, profit in range
        </p>

        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Put Side (Bull Put Spread)</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <Field label="K1 — Lower Put Strike (Buy ₹)"  k="k1"  placeholder="480" hint="OTM put you buy — downside hedge" form={form} onChange={onChange} />
          <Field label="K1 Put Premium (₹)"             k="pk1" placeholder="8"   hint="Premium paid"                    form={form} onChange={onChange} />
          <Field label="K2 — Upper Put Strike (Sell ₹)" k="k2"  placeholder="490" hint="Closer ATM put you sell — credit" form={form} onChange={onChange} />
          <Field label="K2 Put Premium (₹)"             k="pk2" placeholder="18"  hint="Premium received"                form={form} onChange={onChange} />
        </div>

        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Call Side (Bear Call Spread)</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <Field label="K3 — Lower Call Strike (Sell ₹)" k="k3"  placeholder="510" hint="Closer ATM call you sell — credit" form={form} onChange={onChange} />
          <Field label="K3 Call Premium (₹)"             k="ck3" placeholder="18"  hint="Premium received"                  form={form} onChange={onChange} />
          <Field label="K4 — Upper Call Strike (Buy ₹)"  k="k4"  placeholder="520" hint="OTM call you buy — upside hedge"   form={form} onChange={onChange} />
          <Field label="K4 Call Premium (₹)"             k="ck4" placeholder="8"   hint="Premium paid"                      form={form} onChange={onChange} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Number of Lots" k="lots"    placeholder="1"  form={form} onChange={onChange} />
          <Field label="Lot Size"       k="lotSize" placeholder="50" form={form} onChange={onChange} />
        </div>

        {orderError    && <div style={ERROR_BOX}>✗ Strikes must be in ascending order: K1 &lt; K2 &lt; K3 &lt; K4.</div>}
        {!orderError && putCreditErr  && <div style={ERROR_BOX}>✗ Put spread shows a debit — K2 put premium must exceed K1 put premium. Ensure K2 &gt; K1 (K2 closer ATM).</div>}
        {!orderError && callCreditErr && <div style={ERROR_BOX}>✗ Call spread shows a debit — K3 call premium must exceed K4 call premium. Ensure K3 &lt; K4 (K3 closer ATM).</div>}
      </div>

      {wingsUnequal && !orderError && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "rgba(217,119,6,0.08)", color: "#d97706", fontSize: 12, border: "1px solid rgba(217,119,6,0.25)" }}>
          ⚠ Spread widths are unequal (put spread: {fmtINR(k2 - k1)}, call spread: {fmtINR(k4 - k3)}). Max loss is capped at the wider spread.
        </div>
      )}

      {valid && (
        <>
          {/* Profit Zone banner */}
          <div style={{ background: "var(--green-light)", border: "1px solid rgba(45,122,95,0.2)", borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Profit Zone (price at expiry)</p>
            <p style={{ fontSize: 32, fontWeight: 800, color: "var(--green)", margin: "0 0 4px", fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>
              {fmtINR(k2)} – {fmtINR(k3)}
            </p>
            <p style={{ fontSize: 12, color: "rgba(45,122,95,0.75)", margin: 0 }}>
              Full credit zone · Breakevens at {fmtINR(lowerBE)} and {fmtINR(upperBE)}
            </p>
          </div>

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <StatCard label="Net Credit"   val={fmtINR(netCredit)}  sub="Upfront credit received"                   col="var(--green)" />
            <StatCard label="Max Profit"   val={fmtINR(maxProfit)}  sub={`Price between ${fmtINR(k2)}–${fmtINR(k3)}`} col="var(--green)" />
            <StatCard label="Max Loss"     val={fmtINR(maxLoss)}    sub="Price breaks outside K1 or K4"             col="var(--red)" />
            <StatCard label="Reward/Risk"  val={fmt2(maxProfit / maxLoss) + "×"}  sub="Max profit ÷ max loss"                            />
            <StatCard label="Lower BE"     val={fmtINR(lowerBE)}    sub={`K2 − netCredit`}                                              />
            <StatCard label="Upper BE"     val={fmtINR(upperBE)}    sub={`K3 + netCredit`}                                              />
          </div>

          <TradeExpectation
            zones={[
              ZONE.loss("LOSS", `Below ${fmtINR(lowerBE)}`, "Loss grows with drop"),
              ZONE.building("BUILDING", `${fmtINR(lowerBE)} → ${fmtINR(k2)}`, "Credit accumulating"),
              ZONE.profit("MAX CREDIT", `${fmtINR(k2)} → ${fmtINR(k3)}`, "Keep full credit", 2),
              ZONE.eroding("ERODING", `${fmtINR(k3)} → ${fmtINR(upperBE)}`, "Credit shrinking"),
              ZONE.loss("LOSS", `Above ${fmtINR(upperBE)}`, "Loss grows with rally"),
            ]}
            ideal={`Price stays between ${fmtINR(k2)} and ${fmtINR(k3)}. Every day of range-bound movement = profit from time decay.`}
            exitRule={`Close at 50% of credit. Exit immediately if price closes beyond ${fmtINR(k1)} or ${fmtINR(k4)}.`}
          />

          <DissectPanel
            steps={dissectSteps}
            legs={[
              { label: "K1 Put (Buy)",   action: "Buy",  qty: 1, type: "Put",  strike: k1, premium: pk1, desc: "The downside risk cap. Buying this OTM put ensures your loss is bounded if price crashes through K2. Without this hedge, the sold K2 put would have large directional risk equivalent to owning shares." },
              { label: "K2 Put (Sell)",  action: "Sell", qty: 1, type: "Put",  strike: k2, premium: pk2, desc: "The primary put credit leg. Selling this closer-to-ATM put is where most of the put-side premium is collected. You profit as long as price stays above K2 at expiry. This is the key income source on the downside." },
              { label: "K3 Call (Sell)", action: "Sell", qty: 1, type: "Call", strike: k3, premium: ck3, desc: "The primary call credit leg. Selling this closer-to-ATM call is where most of the call-side premium is collected. You profit as long as price stays below K3 at expiry. This is the key income source on the upside." },
              { label: "K4 Call (Buy)",  action: "Buy",  qty: 1, type: "Call", strike: k4, premium: ck4, desc: "The upside risk cap. Buying this OTM call ensures your loss is bounded if price spikes through K3. Converts the naked short call into a defined-risk bear call spread. This is what makes the iron condor a ‘defined risk’ strategy." },
            ]}
            lotQty={qty}
          />

          <PayoffChart
            pnlFn={(spot) =>
              (Math.max(0, k1 - spot) - Math.max(0, k2 - spot) + putCreditRaw) +
              (callCreditRaw - Math.max(0, spot - k3) + Math.max(0, spot - k4))
            }
            center={(k2 + k3) / 2}
            breakevens={[lowerBE, upperBE]}
            title="Short Iron Condor — Payoff at Expiry"
          />
          <PLSimulator
            pnlFn={(spot) =>
              (Math.max(0, k1 - spot) - Math.max(0, k2 - spot) + putCreditRaw) +
              (callCreditRaw - Math.max(0, spot - k3) + Math.max(0, spot - k4))
            }
            qty={qty}
            breakevens={[lowerBE, upperBE]}
            isShort
            legFns={[
              (spot) => Math.max(0, k1 - spot) - pk1,
              (spot) => pk2 - Math.max(0, k2 - spot),
              (spot) => ck3 - Math.max(0, spot - k3),
              (spot) => Math.max(0, spot - k4) - ck4,
            ]}
            legLabels={["Long K1 Put", "Short K2 Put", "Short K3 Call", "Long K4 Call"]}
          />
        </>
      )}
    </div>
  );
}
