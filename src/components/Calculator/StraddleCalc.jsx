import { useState } from "react";
import { CARD, SEC_TITLE, Field, StatCard, PayoffChart, PLSimulator, DissectPanel, fmtINR } from "./shared";

export default function StraddleCalc() {
  const [form, setForm] = useState({ strike: "", callPremium: "", putPremium: "", lots: "1", lotSize: "1" });
  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const strike       = parseFloat(form.strike);
  const callPremium  = parseFloat(form.callPremium);
  const putPremium   = parseFloat(form.putPremium);
  const lots         = parseFloat(form.lots)    || 1;
  const lotSize      = parseFloat(form.lotSize) || 1;
  const valid        = strike > 0 && callPremium > 0 && putPremium > 0;

  const netPremium     = valid ? callPremium + putPremium : null;
  const upperBreakeven = valid ? strike + netPremium : null;
  const lowerBreakeven = valid ? strike - netPremium : null;
  const totalCost      = valid ? netPremium * lots * lotSize : null;

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={CARD}>
        <p style={SEC_TITLE}>Straddle Inputs</p>
        <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: -12, marginBottom: 16 }}>Buy ATM Call + Buy ATM Put (same strike)</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Strike Price (₹)"    k="strike"       placeholder="500" hint="ATM strike (same for both)"        form={form} onChange={onChange} />
          <Field label="Call Premium (₹)"    k="callPremium"  placeholder="15"  hint="Premium paid for ATM call"          form={form} onChange={onChange} />
          <Field label="Put Premium (₹)"     k="putPremium"   placeholder="15"  hint="Premium paid for ATM put"           form={form} onChange={onChange} />
          <Field label="Number of Lots"      k="lots"         placeholder="1"                                             form={form} onChange={onChange} />
          <Field label="Lot Size"            k="lotSize"      placeholder="50"                                            form={form} onChange={onChange} />
        </div>
      </div>

      {valid && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div style={{ background: "var(--green-light)", border: "1px solid rgba(45,122,95,0.2)", borderRadius: 12, padding: 20 }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Upper Breakeven</p>
              <p style={{ fontSize: 32, fontWeight: 800, color: "var(--green)", margin: "0 0 4px", fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>{fmtINR(upperBreakeven)}</p>
              <p style={{ fontSize: 12, color: "rgba(45,122,95,0.7)", margin: 0 }}>Strike + net premium</p>
            </div>
            <div style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 12, padding: 20 }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Lower Breakeven</p>
              <p style={{ fontSize: 32, fontWeight: 800, color: "var(--red)", margin: "0 0 4px", fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>{fmtINR(lowerBreakeven)}</p>
              <p style={{ fontSize: 12, color: "rgba(220,38,38,0.7)", margin: 0 }}>Strike − net premium</p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <StatCard label="Net Premium Paid" val={fmtINR(netPremium)} sub="Call + Put premium per unit" col="#d97706" />
            <StatCard label="Total Cost"        val={fmtINR(totalCost)} sub={`${lots} lot(s) × ${lotSize} units`} col="#d97706" />
            <StatCard label="Max Loss"          val={fmtINR(totalCost)} sub="If price stays exactly at strike" col="var(--red)" />
            <StatCard label="Max Profit"        val="Unlimited"         sub="Price must move significantly in either direction" col="var(--green)" />
          </div>
          <DissectPanel steps={[
            { label: "Net Premium (cost per unit)", formula: `callPremium + putPremium = ${fmtINR(callPremium)} + ${fmtINR(putPremium)}`, result: fmtINR(netPremium), resultCol: "#d97706", note: "Total cost to buy both ATM options. This is your max loss per unit." },
            { label: "Total Position Cost", formula: `netPremium × lots × lotSize = ${fmtINR(netPremium)} × ${lots} × ${lotSize}`, result: fmtINR(totalCost), resultCol: "#d97706" },
            { label: "Upper Breakeven", formula: `strike + netPremium = ${fmtINR(strike)} + ${fmtINR(netPremium)}`, result: fmtINR(upperBreakeven), note: "Stock must close above this for upside profit." },
            { label: "Lower Breakeven", formula: `strike − netPremium = ${fmtINR(strike)} − ${fmtINR(netPremium)}`, result: fmtINR(lowerBreakeven), note: "Stock must close below this for downside profit." },
            { label: "Max Loss", formula: `= Total Cost (price pins exactly at strike)`, result: fmtINR(totalCost), resultCol: "var(--red)" },
            { label: "Max Profit", formula: "Unlimited in either direction beyond the breakevens", result: "∞", resultCol: "var(--green)" },
          ]} />
          <PayoffChart
            pnlFn={(spot) => Math.abs(spot - strike) - netPremium}
            center={strike}
            breakevens={[lowerBreakeven, upperBreakeven]}
            title="Long Straddle — Payoff at Expiry"
          />
          <PLSimulator
            pnlFn={(spot) => Math.abs(spot - strike) - netPremium}
            qty={lots * lotSize}
            breakevens={[lowerBreakeven, upperBreakeven]}
            legFns={[(spot) => Math.max(0, strike - spot) - putPremium, (spot) => Math.max(0, spot - strike) - callPremium]}
            legLabels={["Long Put", "Long Call"]}
          />
        </>
      )}
    </div>
  );
}
