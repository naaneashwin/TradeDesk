import { useState } from "react";
import { CARD, SEC_TITLE, ERROR_BOX, Field, StatCard, PayoffChart, PLSimulator, DissectPanel, TradeExpectation, ZONE, fmtINR } from "./shared";

export default function PutBreakEvenCalc() {
  const [form, setForm] = useState({ strike: "", premium: "", lots: "1", lotSize: "1" });
  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const strike   = parseFloat(form.strike);
  const premium  = parseFloat(form.premium);
  const lots     = parseFloat(form.lots)    || 1;
  const lotSize  = parseFloat(form.lotSize) || 1;
  const valid    = strike > 0 && premium > 0;

  const breakeven     = valid ? strike - premium : null;
  const totalCost     = valid ? premium * lots * lotSize : null;
  const breakevenNeg  = valid && breakeven <= 0;

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={CARD}>
        <p style={SEC_TITLE}>Put Option Inputs</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Strike Price (₹)" k="strike"  placeholder="500" hint="Put option strike price"   form={form} onChange={onChange} />
          <Field label="Premium Paid (₹)" k="premium" placeholder="20"  hint="Premium per share / unit"  form={form} onChange={onChange} />
          <Field label="Number of Lots"   k="lots"    placeholder="1"   hint="Number of contracts"       form={form} onChange={onChange} />
          <Field label="Lot Size"         k="lotSize" placeholder="50"  hint="Units per lot"             form={form} onChange={onChange} />
        </div>
        {breakevenNeg && <div style={ERROR_BOX}>✗ Breakeven is at or below zero — premium is too high relative to strike.</div>}
      </div>

      {valid && !breakevenNeg && (
        <>
          <div style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Breakeven Price</p>
            <p style={{ fontSize: 52, fontWeight: 800, color: "var(--red)", margin: "0 0 4px", fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>{fmtINR(breakeven)}</p>
            <p style={{ fontSize: 13, color: "rgba(220,38,38,0.7)", margin: 0 }}>Stock must close below {fmtINR(breakeven)} at expiry to profit</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <StatCard label="Strike Price"       val={fmtINR(strike)}    sub="Put option strike" />
            <StatCard label="Premium Paid"       val={fmtINR(premium)}   sub="Per unit / share"             col="#d97706" />
            <StatCard label="Total Premium Cost" val={fmtINR(totalCost)} sub={`${lots} lot(s) × ${lotSize} units`} col="#d97706" />
            <StatCard label="Max Loss"           val={fmtINR(totalCost)} sub="If option expires worthless"  col="var(--red)" />
          </div>

          <div style={CARD}><p style={{ fontSize: 11, color: "var(--text-3)", margin: 0 }}>↓ Max Profit: Up to {fmtINR(breakeven * lots * lotSize)} — profit grows as the stock falls toward zero</p></div>
          <TradeExpectation
            zones={[
              ZONE.profit("PROFIT ↓", `Below ${fmtINR(breakeven)}`, "Grows as price falls toward zero", 3),
              ZONE.loss("LOSS", `Above ${fmtINR(breakeven)}`, "Debit gone, option expires worthless"),
            ]}
            ideal={`Price falls below ${fmtINR(breakeven)} by expiry. Profit grows as the stock falls.`}
            exitRule="Lock in gains early once a large down-move has occurred — time decay and reversals can eat into profits quickly."
          />
          <DissectPanel steps={[
            { label: "Breakeven", formula: `strike − premium = ${fmtINR(strike)} − ${fmtINR(premium)}`, result: fmtINR(breakeven), resultCol: "var(--red)", note: "Stock must close below this level for the trade to profit at expiry." },
            { label: "Total Premium Cost", formula: `premium × lots × lotSize = ${fmtINR(premium)} × ${lots} × ${lotSize}`, result: fmtINR(totalCost), resultCol: "#d97706" },
            { label: "Max Loss", formula: `= Total Premium Cost`, result: fmtINR(totalCost), resultCol: "var(--red)", note: "Occurs if the option expires worthless (stock stays above strike)." },
            { label: "Max Profit", formula: `Grows as price falls → 0. At ₹0: ${fmtINR(breakeven * lots * lotSize)}`, result: fmtINR(breakeven * lots * lotSize), resultCol: "var(--green)" },
          ]}
          legs={valid ? [
            { label: "Put Option", action: "Buy", qty: 1, type: "Put", strike, premium, desc: "You pay the premium upfront for the right to sell the underlying at the strike price. Profit grows as price falls below the breakeven (Strike − Premium). Max loss is always capped at the premium paid." },
          ] : []}
          lotQty={lots * lotSize}
          />
          <PayoffChart pnlFn={(spot) => Math.max(0, strike - spot) - premium} center={breakeven} breakevens={[breakeven]} title="Long Put — Payoff at Expiry" />
          <PLSimulator pnlFn={(spot) => Math.max(0, strike - spot) - premium} qty={lots * lotSize} breakevens={[breakeven]} legFns={[(spot) => Math.max(0, strike - spot) - premium]} legLabels={["Long Put"]} />
        </>
      )}
    </div>
  );
}
