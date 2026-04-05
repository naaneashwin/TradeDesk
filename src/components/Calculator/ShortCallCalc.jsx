import { useState } from "react";
import { CARD, SEC_TITLE, Field, StatCard, PayoffChart, PLSimulator, DissectPanel, TradeExpectation, ZONE, fmtINR } from "./shared";

export default function ShortCallCalc() {
  const [form, setForm] = useState({ strike: "", premium: "", lots: "1", lotSize: "1" });
  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const strike      = parseFloat(form.strike);
  const premium     = parseFloat(form.premium);
  const lots        = parseFloat(form.lots)    || 1;
  const lotSize     = parseFloat(form.lotSize) || 1;
  const valid       = strike > 0 && premium > 0;

  const breakeven   = valid ? strike + premium : null;
  const totalCredit = valid ? premium * lots * lotSize : null;

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={CARD}>
        <p style={SEC_TITLE}>Short Call Inputs</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Strike Price (₹)"      k="strike"  placeholder="500" hint="Call option strike price you are selling" form={form} onChange={onChange} />
          <Field label="Premium Received (₹)"  k="premium" placeholder="20"  hint="Credit received per share / unit"         form={form} onChange={onChange} />
          <Field label="Number of Lots"        k="lots"    placeholder="1"   hint="Number of contracts sold"                 form={form} onChange={onChange} />
          <Field label="Lot Size"              k="lotSize" placeholder="50"  hint="Units per lot"                            form={form} onChange={onChange} />
        </div>
      </div>

      {valid && (
        <>
          <div style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Breakeven Price</p>
            <p style={{ fontSize: 52, fontWeight: 800, color: "var(--red)", margin: "0 0 4px", fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>{fmtINR(breakeven)}</p>
            <p style={{ fontSize: 13, color: "rgba(220,38,38,0.7)", margin: 0 }}>Stock must stay at or below {fmtINR(breakeven)} to keep full premium</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <StatCard label="Premium Received" val={fmtINR(premium)}     sub="Per unit / share"                         col="var(--green)" />
            <StatCard label="Total Credit"     val={fmtINR(totalCredit)} sub={`${lots} lot(s) × ${lotSize} units`}      col="var(--green)" />
            <StatCard label="Max Profit"       val={fmtINR(totalCredit)} sub="If stock closes ≤ strike at expiry"       col="var(--green)" />
            <StatCard label="Max Loss"         val="Unlimited"           sub="Stock rises above breakeven: no cap"      col="var(--red)" />
          </div>
          <div style={CARD}><p style={{ fontSize: 11, color: "var(--text-3)", margin: 0 }}>Profit zone: stock ≤ {fmtINR(breakeven)} at expiry · Loss grows with every rupee above breakeven</p></div>
          <TradeExpectation
            zones={[
              ZONE.profit("MAX PROFIT", `Below ${fmtINR(strike)}`, "Keep full credit", 2),
              ZONE.eroding("ERODING", `${fmtINR(strike)} → ${fmtINR(breakeven)}`, "Profit shrinks"),
              ZONE.loss("LOSS ↑", `Above ${fmtINR(breakeven)}`, "Unlimited risk", 2),
            ]}
            ideal={`Price stays at or below ${fmtINR(strike)} at expiry. Pocket the full ${fmtINR(premium)}/unit in credit.`}
            exitRule={`Buy back the call (close position) if price approaches ${fmtINR(breakeven)} — never let a short call expire deep in-the-money.`}
          />
          <DissectPanel steps={[
            { label: "Breakeven", formula: `strike + premiumReceived = ${fmtINR(strike)} + ${fmtINR(premium)}`, result: fmtINR(breakeven), resultCol: "var(--red)", note: "Stock must stay at or below this level for the trade to remain profitable." },
            { label: "Total Credit Received", formula: `premium × lots × lotSize = ${fmtINR(premium)} × ${lots} × ${lotSize}`, result: fmtINR(totalCredit), resultCol: "var(--green)" },
            { label: "Max Profit", formula: `= Total Credit Received (stock ≤ strike at expiry)`, result: fmtINR(totalCredit), resultCol: "var(--green)" },
            { label: "Max Loss", formula: "Unlimited — loss = (spot − breakeven) × qty for every rupee above BE", result: "∞", resultCol: "var(--red)" },
          ]}
          legs={valid ? [
            { label: "Call Option", action: "Sell", qty: 1, type: "Call", strike, premium, desc: "You receive the premium upfront and are obligated to sell shares at the strike price if assigned. Profit is capped at the premium collected. Loss is theoretically unlimited if price rises sharply above the breakeven." },
          ] : []}
          lotQty={lots * lotSize}
          />
          <PayoffChart pnlFn={(spot) => premium - Math.max(0, spot - strike)} center={breakeven} breakevens={[breakeven]} title="Short Call — Payoff at Expiry" />
          <PLSimulator pnlFn={(spot) => premium - Math.max(0, spot - strike)} qty={lots * lotSize} breakevens={[breakeven]} isShort legFns={[(spot) => premium - Math.max(0, spot - strike)]} legLabels={["Short Call"]} />
        </>
      )}
    </div>
  );
}
