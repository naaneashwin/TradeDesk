import { useState } from "react";
import { CARD, SEC_TITLE, Field, StatCard, PayoffChart, PLSimulator, DissectPanel, fmtINR } from "./shared";

export default function ShortStraddleCalc() {
  const [form, setForm] = useState({ strike: "", callPremium: "", putPremium: "", lots: "1", lotSize: "1" });
  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const strike       = parseFloat(form.strike);
  const callPremium  = parseFloat(form.callPremium);
  const putPremium   = parseFloat(form.putPremium);
  const lots         = parseFloat(form.lots)    || 1;
  const lotSize      = parseFloat(form.lotSize) || 1;
  const valid        = strike > 0 && callPremium > 0 && putPremium > 0;

  const netCredit      = valid ? callPremium + putPremium : null;
  const upperBreakeven = valid ? strike + netCredit : null;
  const lowerBreakeven = valid ? strike - netCredit : null;
  const totalCredit    = valid ? netCredit * lots * lotSize : null;

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={CARD}>
        <p style={SEC_TITLE}>Short Straddle Inputs</p>
        <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: -12, marginBottom: 16 }}>Sell ATM Call + Sell ATM Put (same strike) — collect premium</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Strike Price (₹)"            k="strike"      placeholder="500" hint="ATM strike (same for both)"          form={form} onChange={onChange} />
          <Field label="Call Premium Received (₹)"   k="callPremium" placeholder="15"  hint="Credit for selling ATM call"         form={form} onChange={onChange} />
          <Field label="Put Premium Received (₹)"    k="putPremium"  placeholder="15"  hint="Credit for selling ATM put"          form={form} onChange={onChange} />
          <Field label="Number of Lots"              k="lots"        placeholder="1"                                              form={form} onChange={onChange} />
          <Field label="Lot Size"                    k="lotSize"     placeholder="50"                                             form={form} onChange={onChange} />
        </div>
      </div>

      {valid && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 12, padding: 20 }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Upper Breakeven</p>
              <p style={{ fontSize: 32, fontWeight: 800, color: "var(--red)", margin: "0 0 4px", fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>{fmtINR(upperBreakeven)}</p>
              <p style={{ fontSize: 12, color: "rgba(220,38,38,0.7)", margin: 0 }}>Strike + net credit</p>
            </div>
            <div style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 12, padding: 20 }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Lower Breakeven</p>
              <p style={{ fontSize: 32, fontWeight: 800, color: "var(--red)", margin: "0 0 4px", fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>{fmtINR(lowerBreakeven)}</p>
              <p style={{ fontSize: 12, color: "rgba(220,38,38,0.7)", margin: 0 }}>Strike − net credit</p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <StatCard label="Net Credit Received" val={fmtINR(netCredit)}   sub="Call + Put premium per unit"                   col="var(--green)" />
            <StatCard label="Total Credit"        val={fmtINR(totalCredit)} sub={`${lots} lot(s) × ${lotSize} units`}           col="var(--green)" />
            <StatCard label="Max Profit"          val={fmtINR(totalCredit)} sub="If price pins exactly at strike at expiry"     col="var(--green)" />
            <StatCard label="Max Loss"            val="Unlimited"            sub="Any significant move in either direction"     col="var(--red)" />
          </div>
          <DissectPanel steps={[
            { label: "Net Credit (per unit)", formula: `callPremium + putPremium = ${fmtINR(callPremium)} + ${fmtINR(putPremium)}`, result: fmtINR(netCredit), resultCol: "var(--green)", note: "Max premium possible since both legs are ATM. This is your max profit per unit." },
            { label: "Total Credit (position)", formula: `netCredit × lots × lotSize = ${fmtINR(netCredit)} × ${lots} × ${lotSize}`, result: fmtINR(totalCredit), resultCol: "var(--green)" },
            { label: "Upper Breakeven", formula: `strike + netCredit = ${fmtINR(strike)} + ${fmtINR(netCredit)}`, result: fmtINR(upperBreakeven), note: "Any close above this triggers a net loss." },
            { label: "Lower Breakeven", formula: `strike − netCredit = ${fmtINR(strike)} − ${fmtINR(netCredit)}`, result: fmtINR(lowerBreakeven), note: "Any close below this triggers a net loss." },
            { label: "Max Profit", formula: `= Total Credit (price pins at ${fmtINR(strike)})`, result: fmtINR(totalCredit), resultCol: "var(--green)" },
            { label: "Max Loss", formula: "Unlimited — grows with every rupee beyond either breakeven", result: "∞", resultCol: "var(--red)" },
          ]} />
          <PayoffChart
            pnlFn={(spot) => netCredit - Math.abs(spot - strike)}
            center={strike}
            breakevens={[lowerBreakeven, upperBreakeven]}
            title="Short Straddle — Payoff at Expiry"
          />
          <PLSimulator
            pnlFn={(spot) => netCredit - Math.abs(spot - strike)}
            qty={lots * lotSize}
            breakevens={[lowerBreakeven, upperBreakeven]}
            isShort
            legFns={[(spot) => putPremium - Math.max(0, strike - spot), (spot) => callPremium - Math.max(0, spot - strike)]}
            legLabels={["Short Put", "Short Call"]}
          />
        </>
      )}
    </div>
  );
}
