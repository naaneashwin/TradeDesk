import { useState } from "react";
import { CARD, SEC_TITLE, Field, StatCard, PayoffChart, PLSimulator, DissectPanel, TradeExpectation, ZONE, fmtINR, fmt2 } from "./shared";

export default function CallBreakEvenCalc() {
  const [form, setForm] = useState({ strike: "", premium: "", lots: "1", lotSize: "1" });
  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const strike   = parseFloat(form.strike);
  const premium  = parseFloat(form.premium);
  const lots     = parseFloat(form.lots)    || 1;
  const lotSize  = parseFloat(form.lotSize) || 1;
  const valid    = strike > 0 && premium > 0;

  const breakeven  = valid ? strike + premium : null;
  const totalCost  = valid ? premium * lots * lotSize : null;

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={CARD}>
        <p style={SEC_TITLE}>Call Option Inputs</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Strike Price (₹)"   k="strike"  placeholder="500" hint="Call option strike price"    form={form} onChange={onChange} />
          <Field label="Premium Paid (₹)"   k="premium" placeholder="20"  hint="Premium per share / unit"   form={form} onChange={onChange} />
          <Field label="Number of Lots"     k="lots"    placeholder="1"   hint="Number of contracts"        form={form} onChange={onChange} />
          <Field label="Lot Size"           k="lotSize" placeholder="50"  hint="Units per lot"              form={form} onChange={onChange} />
        </div>
      </div>

      {valid && (
        <>
          <div style={{ background: "var(--green-light)", border: "1px solid rgba(45,122,95,0.2)", borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Breakeven Price</p>
            <p style={{ fontSize: 52, fontWeight: 800, color: "var(--green)", margin: "0 0 4px", fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>{fmtINR(breakeven)}</p>
            <p style={{ fontSize: 13, color: "rgba(45,122,95,0.7)", margin: 0 }}>Stock must close above {fmtINR(breakeven)} at expiry to profit</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <StatCard label="Strike Price"       val={fmtINR(strike)}    sub="Call option strike" />
            <StatCard label="Premium Paid"       val={fmtINR(premium)}   sub="Per unit / share"             col="#d97706" />
            <StatCard label="Total Premium Cost" val={fmtINR(totalCost)} sub={`${lots} lot(s) × ${lotSize} units`} col="#d97706" />
            <StatCard label="Max Loss"           val={fmtINR(totalCost)} sub="If option expires worthless"  col="var(--red)" />
          </div>

          <div style={CARD}><p style={{ fontSize: 11, color: "var(--text-3)", margin: 0 }}>↑ Max Profit: Unlimited — profit grows as the stock rises above {fmtINR(breakeven)}</p></div>
          <TradeExpectation
            zones={[
              ZONE.loss("LOSS", `Below ${fmtINR(breakeven)}`, "Debit gone, option expires worthless"),
              ZONE.building("PROFIT ↑", `Above ${fmtINR(breakeven)}`, "Unlimited — grows with price", 3),
            ]}
            ideal={`Price rises above ${fmtINR(breakeven)} by expiry. Every rupee above the breakeven adds to profit — upside is unlimited.`}
            exitRule={`Exit if price stalls below ${fmtINR(breakeven)} near expiry — time decay erodes long options rapidly in the final weeks.`}
          />
          <DissectPanel steps={[
            { label: "Breakeven", formula: `strike + premium = ${fmtINR(strike)} + ${fmtINR(premium)}`, result: fmtINR(breakeven), resultCol: "var(--green)", note: "Stock must close above this level for the trade to profit at expiry." },
            { label: "Total Premium Cost", formula: `premium × lots × lotSize = ${fmtINR(premium)} × ${lots} × ${lotSize}`, result: fmtINR(totalCost), resultCol: "#d97706" },
            { label: "Max Loss", formula: `= Total Premium Cost`, result: fmtINR(totalCost), resultCol: "var(--red)", note: "Occurs if the option expires worthless (stock stays below strike)." },
            { label: "Max Profit", formula: "Unlimited — no cap as stock price rises", result: "∞", resultCol: "var(--green)" },
          ]}
          legs={valid ? [
            { label: "Call Option", action: "Buy", qty: 1, type: "Call", strike, premium, desc: "You pay the premium upfront for the right to buy the underlying at the strike price. Profit grows unlimited as price rises above the breakeven (Strike + Premium). Max loss is always capped at the premium paid." },
          ] : []}
          lotQty={lots * lotSize}
          />
          <PayoffChart pnlFn={(spot) => Math.max(0, spot - strike) - premium} center={breakeven} breakevens={[breakeven]} title="Long Call — Payoff at Expiry" />
          <PLSimulator pnlFn={(spot) => Math.max(0, spot - strike) - premium} qty={lots * lotSize} breakevens={[breakeven]} legFns={[(spot) => Math.max(0, spot - strike) - premium]} legLabels={["Long Call"]} />
        </>
      )}
    </div>
  );
}
