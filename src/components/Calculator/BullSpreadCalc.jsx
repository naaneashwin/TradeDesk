import { useState } from "react";
import { CARD, SEC_TITLE, ERROR_BOX, Field, StatCard, PayoffChart, PLSimulator, DissectPanel, fmtINR, fmt2 } from "./shared";

export default function BullSpreadCalc() {
  const [form, setForm] = useState({ lowerStrike: "", lowerPremium: "", upperStrike: "", upperPremium: "", lots: "1", lotSize: "1" });
  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const lowerStrike  = parseFloat(form.lowerStrike);
  const lowerPremium = parseFloat(form.lowerPremium);
  const upperStrike  = parseFloat(form.upperStrike);
  const upperPremium = parseFloat(form.upperPremium);
  const lots         = parseFloat(form.lots)    || 1;
  const lotSize      = parseFloat(form.lotSize) || 1;

  const strikesEntered  = lowerStrike > 0 && upperStrike > 0;
  const premiumsEntered = lowerPremium > 0 && upperPremium > 0;
  const invalidStrikes  = strikesEntered && upperStrike <= lowerStrike;
  const invalidPremiums = premiumsEntered && !invalidStrikes && lowerPremium <= upperPremium;
  const valid = lowerStrike > 0 && lowerPremium > 0 && upperStrike > 0 && upperPremium > 0 && upperStrike > lowerStrike && lowerPremium > upperPremium;

  const netDebit    = valid ? lowerPremium - upperPremium : null;
  const spreadWidth = valid ? upperStrike - lowerStrike : null;
  const maxProfit   = valid ? (spreadWidth - netDebit) * lots * lotSize : null;
  const maxLoss     = valid ? netDebit * lots * lotSize : null;
  const breakeven   = valid ? lowerStrike + netDebit : null;

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={CARD}>
        <p style={SEC_TITLE}>Bull Call Spread Inputs</p>
        <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: -12, marginBottom: 16 }}>Buy lower-strike call · Sell higher-strike call</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Lower Strike — Buy (₹)"    k="lowerStrike"  placeholder="490" hint="Call you're buying (lower)"         form={form} onChange={onChange} />
          <Field label="Lower Strike Premium (₹)"  k="lowerPremium" placeholder="25"  hint="Premium paid (debit)"               form={form} onChange={onChange} />
          <Field label="Upper Strike — Sell (₹)"   k="upperStrike"  placeholder="510" hint="Call you're selling (higher)"        form={form} onChange={onChange} />
          <Field label="Upper Strike Premium (₹)"  k="upperPremium" placeholder="10"  hint="Premium received (credit)"           form={form} onChange={onChange} />
          <Field label="Number of Lots"            k="lots"         placeholder="1"                                              form={form} onChange={onChange} />
          <Field label="Lot Size"                  k="lotSize"      placeholder="50"                                             form={form} onChange={onChange} />
        </div>
        {invalidStrikes  && <div style={ERROR_BOX}>✗ Upper strike must be higher than lower strike.</div>}
        {invalidPremiums && <div style={ERROR_BOX}>✗ Lower strike premium must exceed upper strike premium (you buy the lower, sell the higher).</div>}
      </div>

      {valid && (
        <>
          <div style={{ background: "var(--green-light)", border: "1px solid rgba(45,122,95,0.2)", borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Breakeven Price</p>
            <p style={{ fontSize: 52, fontWeight: 800, color: "var(--green)", margin: "0 0 4px", fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>{fmtINR(breakeven)}</p>
            <p style={{ fontSize: 13, color: "rgba(45,122,95,0.7)", margin: 0 }}>Lower Strike + Net Debit · Profit above this level</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <StatCard label="Net Debit"    val={fmtINR(netDebit)}    sub="Per unit cost of the spread"                col="#d97706" />
            <StatCard label="Spread Width" val={fmtINR(spreadWidth)} sub="Upper − Lower strike" />
            <StatCard label="Max Profit"   val={fmtINR(maxProfit)}   sub={`If price ≥ ${fmtINR(upperStrike)} at expiry`} col="var(--green)" />
            <StatCard label="Max Loss"     val={fmtINR(maxLoss)}     sub={`If price ≤ ${fmtINR(lowerStrike)} at expiry`} col="var(--red)" />
          </div>
          <div style={CARD}><p style={{ fontSize: 11, color: "var(--text-3)", margin: 0 }}>Reward / Risk: {fmt2(maxProfit / maxLoss)}× · Profit zone: {fmtINR(breakeven)} – {fmtINR(upperStrike)}</p></div>
          <DissectPanel steps={[
            { label: "Spread Width", formula: `upperStrike − lowerStrike = ${fmtINR(upperStrike)} − ${fmtINR(lowerStrike)}`, result: fmtINR(spreadWidth) },
            { label: "Net Debit", formula: `lowerPremium − upperPremium = ${fmtINR(lowerPremium)} − ${fmtINR(upperPremium)}`, result: fmtINR(netDebit), resultCol: "#d97706", note: "Net cost paid to enter the spread. This is your max loss per unit." },
            { label: "Total Cost", formula: `netDebit × lots × lotSize = ${fmtINR(netDebit)} × ${lots} × ${lotSize}`, result: fmtINR(maxLoss), resultCol: "#d97706" },
            { label: "Breakeven", formula: `lowerStrike + netDebit = ${fmtINR(lowerStrike)} + ${fmtINR(netDebit)}`, result: fmtINR(breakeven), note: "Stock must close above this level to profit at expiry." },
            { label: "Max Profit per Unit", formula: `spreadWidth − netDebit = ${fmtINR(spreadWidth)} − ${fmtINR(netDebit)}`, result: fmtINR(spreadWidth - netDebit), resultCol: "var(--green)" },
            { label: "Max Profit (position)", formula: `maxProfitPerUnit × lots × lotSize = ${fmtINR(spreadWidth - netDebit)} × ${lots * lotSize}`, result: fmtINR(maxProfit), resultCol: "var(--green)", note: `Achieved when price closes ≥ ${fmtINR(upperStrike)} at expiry.` },
            { label: "Reward / Risk", formula: `maxProfit ÷ maxLoss = ${fmtINR(maxProfit)} ÷ ${fmtINR(maxLoss)}`, result: fmt2(maxProfit / maxLoss) + "×" },
          ]} />
          <PayoffChart
            pnlFn={(spot) => Math.min(Math.max(0, spot - lowerStrike), spreadWidth) - netDebit}
            center={(lowerStrike + upperStrike) / 2}
            breakevens={[breakeven]}
            title="Bull Call Spread — Payoff at Expiry"
          />
          <PLSimulator
            pnlFn={(spot) => Math.min(Math.max(0, spot - lowerStrike), spreadWidth) - netDebit}
            qty={lots * lotSize}
            breakevens={[breakeven]}
            legFns={[(spot) => Math.max(0, spot - lowerStrike) - lowerPremium, (spot) => upperPremium - Math.max(0, spot - upperStrike)]}
            legLabels={["Long Call (buy lower strike)", "Short Call (sell upper strike)"]}
          />
        </>
      )}
    </div>
  );
}
