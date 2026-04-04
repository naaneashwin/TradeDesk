import { useState } from "react";
import { CARD, SEC_TITLE, ERROR_BOX, Field, StatCard, PayoffChart, PLSimulator, DissectPanel, fmtINR, fmt2 } from "./shared";

export default function BearCallSpreadCalc() {
  const [form, setForm] = useState({ lowerStrike: "", lowerPremium: "", higherStrike: "", higherPremium: "", lots: "1", lotSize: "1" });
  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const lowerStrike   = parseFloat(form.lowerStrike);
  const lowerPremium  = parseFloat(form.lowerPremium);
  const higherStrike  = parseFloat(form.higherStrike);
  const higherPremium = parseFloat(form.higherPremium);
  const lots          = parseFloat(form.lots)    || 1;
  const lotSize       = parseFloat(form.lotSize) || 1;

  const strikesEntered  = lowerStrike > 0 && higherStrike > 0;
  const premiumsEntered = lowerPremium > 0 && higherPremium > 0;
  const invalidStrikes  = strikesEntered && higherStrike <= lowerStrike;
  const invalidPremiums = premiumsEntered && !invalidStrikes && lowerPremium <= higherPremium;
  const valid = lowerStrike > 0 && lowerPremium > 0 && higherStrike > 0 && higherPremium > 0 && higherStrike > lowerStrike && lowerPremium > higherPremium;

  const netCredit   = valid ? lowerPremium - higherPremium : null;
  const spreadWidth = valid ? higherStrike - lowerStrike : null;
  const maxProfit   = valid ? netCredit * lots * lotSize : null;
  const maxLoss     = valid ? (spreadWidth - netCredit) * lots * lotSize : null;
  const breakeven   = valid ? lowerStrike + netCredit : null;

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={CARD}>
        <p style={SEC_TITLE}>Bear Call Spread Inputs</p>
        <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: -12, marginBottom: 16 }}>Sell lower-strike call · Buy higher-strike call (collect net credit)</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Lower Strike — Sell (₹)"    k="lowerStrike"   placeholder="510" hint="Call you're selling (lower, more expensive)"  form={form} onChange={onChange} />
          <Field label="Lower Strike Premium (₹)"   k="lowerPremium"  placeholder="25"  hint="Premium received (credit)"                    form={form} onChange={onChange} />
          <Field label="Higher Strike — Buy (₹)"   k="higherStrike"  placeholder="530" hint="Call you're buying (higher, cheaper — hedge)"  form={form} onChange={onChange} />
          <Field label="Higher Strike Premium (₹)"  k="higherPremium" placeholder="10"  hint="Premium paid (debit)"                          form={form} onChange={onChange} />
          <Field label="Number of Lots"             k="lots"          placeholder="1"                                                        form={form} onChange={onChange} />
          <Field label="Lot Size"                   k="lotSize"       placeholder="50"                                                       form={form} onChange={onChange} />
        </div>
        {invalidStrikes  && <div style={ERROR_BOX}>✗ Higher strike must be above lower strike.</div>}
        {invalidPremiums && <div style={ERROR_BOX}>✗ Lower strike premium must exceed higher strike premium (you sell the more expensive lower-strike call).</div>}
      </div>

      {valid && (
        <>
          <div style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Breakeven Price</p>
            <p style={{ fontSize: 52, fontWeight: 800, color: "var(--red)", margin: "0 0 4px", fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>{fmtINR(breakeven)}</p>
            <p style={{ fontSize: 13, color: "rgba(220,38,38,0.7)", margin: 0 }}>Lower Strike + Net Credit · Profit when price stays below this level</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <StatCard label="Net Credit"   val={fmtINR(netCredit)}   sub="Per unit credit received"                                  col="var(--green)" />
            <StatCard label="Spread Width" val={fmtINR(spreadWidth)} sub="Higher − Lower strike" />
            <StatCard label="Max Profit"   val={fmtINR(maxProfit)}   sub={`If price ≤ ${fmtINR(lowerStrike)} at expiry`}            col="var(--green)" />
            <StatCard label="Max Loss"     val={fmtINR(maxLoss)}     sub={`If price ≥ ${fmtINR(higherStrike)} at expiry`}           col="var(--red)" />
          </div>
          <div style={CARD}><p style={{ fontSize: 11, color: "var(--text-3)", margin: 0 }}>Reward / Risk: {fmt2(maxProfit / maxLoss)}× · Profit zone: price ≤ {fmtINR(breakeven)}</p></div>
          <DissectPanel steps={[
            { label: "Spread Width", formula: `higherStrike − lowerStrike = ${fmtINR(higherStrike)} − ${fmtINR(lowerStrike)}`, result: fmtINR(spreadWidth) },
            { label: "Net Credit", formula: `lowerPremium − higherPremium = ${fmtINR(lowerPremium)} − ${fmtINR(higherPremium)}`, result: fmtINR(netCredit), resultCol: "var(--green)", note: "Net credit received upfront. This is your max profit per unit." },
            { label: "Max Profit (position)", formula: `netCredit × lots × lotSize = ${fmtINR(netCredit)} × ${lots} × ${lotSize}`, result: fmtINR(maxProfit), resultCol: "var(--green)", note: `Price must stay at or below ${fmtINR(lowerStrike)} at expiry.` },
            { label: "Breakeven", formula: `lowerStrike + netCredit = ${fmtINR(lowerStrike)} + ${fmtINR(netCredit)}`, result: fmtINR(breakeven), note: "Position starts losing for every rupee price rises above this." },
            { label: "Max Loss per Unit", formula: `spreadWidth − netCredit = ${fmtINR(spreadWidth)} − ${fmtINR(netCredit)}`, result: fmtINR(spreadWidth - netCredit), resultCol: "var(--red)" },
            { label: "Max Loss (position)", formula: `maxLossPerUnit × lots × lotSize = ${fmtINR(spreadWidth - netCredit)} × ${lots * lotSize}`, result: fmtINR(maxLoss), resultCol: "var(--red)", note: `Occurs when price closes ≥ ${fmtINR(higherStrike)} at expiry.` },
            { label: "Reward / Risk", formula: `maxProfit ÷ maxLoss = ${fmtINR(maxProfit)} ÷ ${fmtINR(maxLoss)}`, result: fmt2(maxProfit / maxLoss) + "×" },
          ]} />
          <PayoffChart
            pnlFn={(spot) => netCredit - Math.max(0, spot - lowerStrike) + Math.max(0, spot - higherStrike)}
            center={(lowerStrike + higherStrike) / 2}
            breakevens={[breakeven]}
            title="Bear Call Spread — Payoff at Expiry"
          />
          <PLSimulator
            pnlFn={(spot) => netCredit - Math.max(0, spot - lowerStrike) + Math.max(0, spot - higherStrike)}
            qty={lots * lotSize}
            breakevens={[breakeven]}
            isShort
            legFns={[(spot) => lowerPremium - Math.max(0, spot - lowerStrike), (spot) => Math.max(0, spot - higherStrike) - higherPremium]}
            legLabels={["Short Call (sell lower strike)", "Long Call (buy higher strike)"]}
          />
        </>
      )}
    </div>
  );
}
