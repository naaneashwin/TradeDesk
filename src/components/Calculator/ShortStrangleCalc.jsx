import { useState } from "react";
import { CARD, SEC_TITLE, ERROR_BOX, Field, StatCard, PayoffChart, PLSimulator, DissectPanel, TradeExpectation, ZONE, fmtINR } from "./shared";

export default function ShortStrangleCalc() {
  const [form, setForm] = useState({ callStrike: "", callPremium: "", putStrike: "", putPremium: "", lots: "1", lotSize: "1" });
  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const callStrike  = parseFloat(form.callStrike);
  const callPremium = parseFloat(form.callPremium);
  const putStrike   = parseFloat(form.putStrike);
  const putPremium  = parseFloat(form.putPremium);
  const lots        = parseFloat(form.lots)    || 1;
  const lotSize     = parseFloat(form.lotSize) || 1;

  const strikesEntered = callStrike > 0 && putStrike > 0;
  const invalidStrikes = strikesEntered && callStrike <= putStrike;
  const valid = callStrike > 0 && callPremium > 0 && putStrike > 0 && putPremium > 0 && callStrike > putStrike;

  const netCredit      = valid ? callPremium + putPremium : null;
  const upperBreakeven = valid ? callStrike + netCredit : null;
  const lowerBreakeven = valid ? putStrike - netCredit : null;
  const totalCredit    = valid ? netCredit * lots * lotSize : null;

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={CARD}>
        <p style={SEC_TITLE}>Short Strangle Inputs</p>
        <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: -12, marginBottom: 16 }}>Sell OTM Call + Sell OTM Put (different strikes) — collect premium</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Call Strike (₹) — Sell"     k="callStrike"  placeholder="520" hint="OTM call strike (higher)"  form={form} onChange={onChange} />
          <Field label="Call Premium Received (₹)"  k="callPremium" placeholder="10"  hint="Credit for selling call"   form={form} onChange={onChange} />
          <Field label="Put Strike (₹) — Sell"      k="putStrike"   placeholder="480" hint="OTM put strike (lower)"    form={form} onChange={onChange} />
          <Field label="Put Premium Received (₹)"   k="putPremium"  placeholder="10"  hint="Credit for selling put"    form={form} onChange={onChange} />
          <Field label="Number of Lots"             k="lots"        placeholder="1"                                    form={form} onChange={onChange} />
          <Field label="Lot Size"                   k="lotSize"     placeholder="50"                                   form={form} onChange={onChange} />
        </div>
        {invalidStrikes && <div style={ERROR_BOX}>✗ Call strike must be higher than put strike for a short strangle.</div>}
      </div>

      {valid && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 12, padding: 20 }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Upper Breakeven</p>
              <p style={{ fontSize: 32, fontWeight: 800, color: "var(--red)", margin: "0 0 4px", fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>{fmtINR(upperBreakeven)}</p>
              <p style={{ fontSize: 12, color: "rgba(220,38,38,0.7)", margin: 0 }}>Call strike + net credit</p>
            </div>
            <div style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 12, padding: 20 }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Lower Breakeven</p>
              <p style={{ fontSize: 32, fontWeight: 800, color: "var(--red)", margin: "0 0 4px", fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>{fmtINR(lowerBreakeven)}</p>
              <p style={{ fontSize: 12, color: "rgba(220,38,38,0.7)", margin: 0 }}>Put strike − net credit</p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <StatCard label="Net Credit Received" val={fmtINR(netCredit)}   sub="Call + Put premium per unit"                                         col="var(--green)" />
            <StatCard label="Total Credit"        val={fmtINR(totalCredit)} sub={`${lots} lot(s) × ${lotSize} units`}                                  col="var(--green)" />
            <StatCard label="Max Profit"          val={fmtINR(totalCredit)} sub={`Price stays between ${fmtINR(putStrike)} – ${fmtINR(callStrike)}`}  col="var(--green)" />
            <StatCard label="Max Loss"            val="Unlimited"            sub="Price breaks out beyond either breakeven"                            col="var(--red)" />
          </div>
          <TradeExpectation
            zones={[
              ZONE.loss("LOSS", `Below ${fmtINR(lowerBreakeven)}`, "Loss grows with the fall", 2),
              ZONE.profit("MAX PROFIT", `${fmtINR(lowerBreakeven)} → ${fmtINR(upperBreakeven)}`, "Wide safe zone", 2),
              ZONE.loss("LOSS", `Above ${fmtINR(upperBreakeven)}`, "Loss grows with the rally", 2),
            ]}
            ideal={`Price stays between ${fmtINR(putStrike)} and ${fmtINR(callStrike)}. Wider safe zone than a straddle.`}
            exitRule="Close at 50% of credit. Monitor both wings — exit the moment either breakeven is threatened."
          />
          <DissectPanel steps={[
            { label: "Net Credit (per unit)", formula: `callPremium + putPremium = ${fmtINR(callPremium)} + ${fmtINR(putPremium)}`, result: fmtINR(netCredit), resultCol: "var(--green)", note: "Total credit collected upfront. This is your max profit per unit." },
            { label: "Total Credit (position)", formula: `netCredit × lots × lotSize = ${fmtINR(netCredit)} × ${lots} × ${lotSize}`, result: fmtINR(totalCredit), resultCol: "var(--green)" },
            { label: "Upper Breakeven", formula: `callStrike + netCredit = ${fmtINR(callStrike)} + ${fmtINR(netCredit)}`, result: fmtINR(upperBreakeven), note: "Price must stay below this level to avoid loss on the upside." },
            { label: "Lower Breakeven", formula: `putStrike − netCredit = ${fmtINR(putStrike)} − ${fmtINR(netCredit)}`, result: fmtINR(lowerBreakeven), note: "Price must stay above this level to avoid loss on the downside." },
            { label: "Max Profit", formula: `= Total Credit (price stays inside both strikes)`, result: fmtINR(totalCredit), resultCol: "var(--green)" },
            { label: "Max Loss", formula: "Unlimited — accelerates for every rupee beyond either breakeven", result: "∞", resultCol: "var(--red)" },
          ]}
          legs={valid ? [
            { label: "Call Option (OTM)", action: "Sell", qty: 1, type: "Call", strike: callStrike, premium: callPremium, desc: "Sold OTM call — collects premium with a buffer zone above the current price. Profitable as long as price stays below the upper breakeven. Unlimited loss if price breaks far above." },
            { label: "Put Option (OTM)", action: "Sell", qty: 1, type: "Put", strike: putStrike, premium: putPremium, desc: "Sold OTM put — collects premium with a buffer zone below the current price. Profitable as long as price stays above the lower breakeven. Loss accelerates on a sharp downward move." },
          ] : []}
          lotQty={lots * lotSize}
          />
          <PayoffChart
            pnlFn={(spot) => netCredit - Math.max(0, spot - callStrike) - Math.max(0, putStrike - spot)}
            center={(callStrike + putStrike) / 2}
            breakevens={[lowerBreakeven, upperBreakeven]}
            title="Short Strangle — Payoff at Expiry"
          />
          <PLSimulator
            pnlFn={(spot) => netCredit - Math.max(0, spot - callStrike) - Math.max(0, putStrike - spot)}
            qty={lots * lotSize}
            breakevens={[lowerBreakeven, upperBreakeven]}
            isShort
            legFns={[(spot) => putPremium - Math.max(0, putStrike - spot), (spot) => callPremium - Math.max(0, spot - callStrike)]}
            legLabels={["Short Put", "Short Call"]}
          />
        </>
      )}
    </div>
  );
}
