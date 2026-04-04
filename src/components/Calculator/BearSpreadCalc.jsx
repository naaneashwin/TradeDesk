import { useState } from "react";
import { CARD, SEC_TITLE, ERROR_BOX, Field, StatCard, PayoffChart, PLSimulator, DissectPanel, fmtINR, fmt2 } from "./shared";

export default function BearSpreadCalc() {
  const [form, setForm] = useState({ higherStrike: "", higherPremium: "", lowerStrike: "", lowerPremium: "", lots: "1", lotSize: "1" });
  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const higherStrike  = parseFloat(form.higherStrike);
  const higherPremium = parseFloat(form.higherPremium);
  const lowerStrike   = parseFloat(form.lowerStrike);
  const lowerPremium  = parseFloat(form.lowerPremium);
  const lots          = parseFloat(form.lots)    || 1;
  const lotSize       = parseFloat(form.lotSize) || 1;

  const strikesEntered  = higherStrike > 0 && lowerStrike > 0;
  const premiumsEntered = higherPremium > 0 && lowerPremium > 0;
  const invalidStrikes  = strikesEntered && higherStrike <= lowerStrike;
  const invalidPremiums = premiumsEntered && !invalidStrikes && higherPremium <= lowerPremium;
  const valid = higherStrike > 0 && higherPremium > 0 && lowerStrike > 0 && lowerPremium > 0 && higherStrike > lowerStrike && higherPremium > lowerPremium;

  const netDebit    = valid ? higherPremium - lowerPremium : null;
  const spreadWidth = valid ? higherStrike - lowerStrike : null;
  const maxProfit   = valid ? (spreadWidth - netDebit) * lots * lotSize : null;
  const maxLoss     = valid ? netDebit * lots * lotSize : null;
  const breakeven   = valid ? higherStrike - netDebit : null;

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={CARD}>
        <p style={SEC_TITLE}>Bear Put Spread Inputs</p>
        <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: -12, marginBottom: 16 }}>Buy higher-strike put · Sell lower-strike put</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Higher Strike — Buy (₹)"    k="higherStrike"  placeholder="510" hint="Put you're buying (higher)"         form={form} onChange={onChange} />
          <Field label="Higher Strike Premium (₹)"  k="higherPremium" placeholder="25"  hint="Premium paid (debit)"               form={form} onChange={onChange} />
          <Field label="Lower Strike — Sell (₹)"    k="lowerStrike"   placeholder="490" hint="Put you're selling (lower)"          form={form} onChange={onChange} />
          <Field label="Lower Strike Premium (₹)"   k="lowerPremium"  placeholder="10"  hint="Premium received (credit)"           form={form} onChange={onChange} />
          <Field label="Number of Lots"             k="lots"          placeholder="1"                                              form={form} onChange={onChange} />
          <Field label="Lot Size"                   k="lotSize"       placeholder="50"                                             form={form} onChange={onChange} />
        </div>
        {invalidStrikes  && <div style={ERROR_BOX}>✗ Higher strike must be greater than lower strike.</div>}
        {invalidPremiums && <div style={ERROR_BOX}>✗ Higher strike premium must exceed lower strike premium (you buy the higher, sell the lower).</div>}
      </div>

      {valid && (
        <>
          <div style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Breakeven Price</p>
            <p style={{ fontSize: 52, fontWeight: 800, color: "var(--red)", margin: "0 0 4px", fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>{fmtINR(breakeven)}</p>
            <p style={{ fontSize: 13, color: "rgba(220,38,38,0.7)", margin: 0 }}>Higher Strike − Net Debit · Profit below this level</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <StatCard label="Net Debit"    val={fmtINR(netDebit)}    sub="Per unit cost of the spread"                   col="#d97706" />
            <StatCard label="Spread Width" val={fmtINR(spreadWidth)} sub="Higher − Lower strike" />
            <StatCard label="Max Profit"   val={fmtINR(maxProfit)}   sub={`If price ≤ ${fmtINR(lowerStrike)} at expiry`} col="var(--green)" />
            <StatCard label="Max Loss"     val={fmtINR(maxLoss)}     sub={`If price ≥ ${fmtINR(higherStrike)} at expiry`} col="var(--red)" />
          </div>
          <div style={CARD}><p style={{ fontSize: 11, color: "var(--text-3)", margin: 0 }}>Reward / Risk: {fmt2(maxProfit / maxLoss)}× · Profit zone: {fmtINR(lowerStrike)} – {fmtINR(breakeven)}</p></div>
          <DissectPanel steps={[
            { label: "Spread Width", formula: `higherStrike − lowerStrike = ${fmtINR(higherStrike)} − ${fmtINR(lowerStrike)}`, result: fmtINR(spreadWidth) },
            { label: "Net Debit", formula: `higherPremium − lowerPremium = ${fmtINR(higherPremium)} − ${fmtINR(lowerPremium)}`, result: fmtINR(netDebit), resultCol: "#d97706", note: "Net cost paid to enter the spread. This is your max loss per unit." },
            { label: "Total Cost", formula: `netDebit × lots × lotSize = ${fmtINR(netDebit)} × ${lots} × ${lotSize}`, result: fmtINR(maxLoss), resultCol: "#d97706" },
            { label: "Breakeven", formula: `higherStrike − netDebit = ${fmtINR(higherStrike)} − ${fmtINR(netDebit)}`, result: fmtINR(breakeven), note: "Stock must close below this level to profit at expiry." },
            { label: "Max Profit per Unit", formula: `spreadWidth − netDebit = ${fmtINR(spreadWidth)} − ${fmtINR(netDebit)}`, result: fmtINR(spreadWidth - netDebit), resultCol: "var(--green)" },
            { label: "Max Profit (position)", formula: `maxProfitPerUnit × lots × lotSize = ${fmtINR(spreadWidth - netDebit)} × ${lots * lotSize}`, result: fmtINR(maxProfit), resultCol: "var(--green)", note: `Achieved when price closes ≤ ${fmtINR(lowerStrike)} at expiry.` },
            { label: "Reward / Risk", formula: `maxProfit ÷ maxLoss = ${fmtINR(maxProfit)} ÷ ${fmtINR(maxLoss)}`, result: fmt2(maxProfit / maxLoss) + "×" },
          ]} />
          <PayoffChart
            pnlFn={(spot) => Math.min(Math.max(0, higherStrike - spot), spreadWidth) - netDebit}
            center={(higherStrike + lowerStrike) / 2}
            breakevens={[breakeven]}
            title="Bear Put Spread — Payoff at Expiry"
          />
          <PLSimulator
            pnlFn={(spot) => Math.min(Math.max(0, higherStrike - spot), spreadWidth) - netDebit}
            qty={lots * lotSize}
            breakevens={[breakeven]}
            legFns={[(spot) => Math.max(0, higherStrike - spot) - higherPremium, (spot) => lowerPremium - Math.max(0, lowerStrike - spot)]}
            legLabels={["Long Put (buy higher strike)", "Short Put (sell lower strike)"]}
          />
        </>
      )}
    </div>
  );
}
