import { useState } from "react";
import { CARD, SEC_TITLE, Field, StatCard, PayoffChart, PLSimulator, DissectPanel, fmtINR } from "./shared";

export default function ShortPutCalc() {
  const [form, setForm] = useState({ strike: "", premium: "", lots: "1", lotSize: "1" });
  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const strike      = parseFloat(form.strike);
  const premium     = parseFloat(form.premium);
  const lots        = parseFloat(form.lots)    || 1;
  const lotSize     = parseFloat(form.lotSize) || 1;
  const valid       = strike > 0 && premium > 0;

  const breakeven   = valid ? strike - premium : null;
  const totalCredit = valid ? premium * lots * lotSize : null;
  const maxLoss     = valid ? breakeven * lots * lotSize : null;

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={CARD}>
        <p style={SEC_TITLE}>Short Put Inputs</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Strike Price (₹)"      k="strike"  placeholder="500" hint="Put option strike price you are selling" form={form} onChange={onChange} />
          <Field label="Premium Received (₹)"  k="premium" placeholder="20"  hint="Credit received per share / unit"        form={form} onChange={onChange} />
          <Field label="Number of Lots"        k="lots"    placeholder="1"   hint="Number of contracts sold"                form={form} onChange={onChange} />
          <Field label="Lot Size"              k="lotSize" placeholder="50"  hint="Units per lot"                           form={form} onChange={onChange} />
        </div>
      </div>

      {valid && (
        <>
          <div style={{ background: "var(--green-light)", border: "1px solid rgba(45,122,95,0.2)", borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Breakeven Price</p>
            <p style={{ fontSize: 52, fontWeight: 800, color: "var(--green)", margin: "0 0 4px", fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>{fmtINR(breakeven)}</p>
            <p style={{ fontSize: 13, color: "rgba(45,122,95,0.7)", margin: 0 }}>Stock must stay at or above {fmtINR(breakeven)} to keep full premium</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <StatCard label="Premium Received" val={fmtINR(premium)}     sub="Per unit / share"                               col="var(--green)" />
            <StatCard label="Total Credit"     val={fmtINR(totalCredit)} sub={`${lots} lot(s) × ${lotSize} units`}            col="var(--green)" />
            <StatCard label="Max Profit"       val={fmtINR(totalCredit)} sub="If stock closes ≥ strike at expiry"             col="var(--green)" />
            <StatCard label="Max Loss"         val={fmtINR(maxLoss)}     sub="If stock falls to ₹0 — Strike − Premium × Qty" col="var(--red)" />
          </div>
          <div style={CARD}><p style={{ fontSize: 11, color: "var(--text-3)", margin: 0 }}>Profit zone: stock ≥ {fmtINR(breakeven)} at expiry · Loss grows as stock falls below breakeven</p></div>
          <DissectPanel steps={[
            { label: "Breakeven", formula: `strike − premiumReceived = ${fmtINR(strike)} − ${fmtINR(premium)}`, result: fmtINR(breakeven), resultCol: "var(--green)", note: "Stock must stay at or above this level for the trade to remain profitable." },
            { label: "Total Credit Received", formula: `premium × lots × lotSize = ${fmtINR(premium)} × ${lots} × ${lotSize}`, result: fmtINR(totalCredit), resultCol: "var(--green)" },
            { label: "Max Profit", formula: `= Total Credit Received (stock ≥ strike at expiry)`, result: fmtINR(totalCredit), resultCol: "var(--green)" },
            { label: "Max Loss (theoretical)", formula: `breakeven × qty = ${fmtINR(breakeven)} × ${lots * lotSize}`, result: fmtINR(maxLoss), resultCol: "var(--red)", note: "Worst case if stock falls to ₹0. In practice, losses grow as stock falls below breakeven." },
          ]} />
          <PayoffChart pnlFn={(spot) => premium - Math.max(0, strike - spot)} center={breakeven} breakevens={[breakeven]} title="Short Put — Payoff at Expiry" />
          <PLSimulator pnlFn={(spot) => premium - Math.max(0, strike - spot)} qty={lots * lotSize} breakevens={[breakeven]} isShort legFns={[(spot) => premium - Math.max(0, strike - spot)]} legLabels={["Short Put"]} />
        </>
      )}
    </div>
  );
}
