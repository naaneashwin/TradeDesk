import { useState } from "react";
import { CARD, SEC_TITLE, ERROR_BOX, Field, StatCard, PayoffChart, PLSimulator, DissectPanel, TradeExpectation, ZONE, fmtINR, fmt2 } from "./shared";

export default function BullCallRatioCalc() {
  const [form, setForm] = useState({
    lowerStrike: "", lowerPremium: "",
    upperStrike: "", upperPremium: "",
    lots: "1", lotSize: "1",
  });
  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const lowerStrike  = parseFloat(form.lowerStrike);
  const lowerPremium = parseFloat(form.lowerPremium);
  const upperStrike  = parseFloat(form.upperStrike);
  const upperPremium = parseFloat(form.upperPremium);
  const lots         = parseFloat(form.lots)    || 1;
  const lotSize      = parseFloat(form.lotSize) || 1;

  const strikesEntered  = lowerStrike > 0 && upperStrike > 0;
  const invalidStrikes  = strikesEntered && upperStrike <= lowerStrike;

  // net received: sell 2 upper calls, buy 1 lower call
  // positive = credit, negative = debit
  const valid = lowerStrike > 0 && lowerPremium > 0 && upperStrike > 0 && upperPremium > 0
    && upperStrike > lowerStrike;

  const netCredit     = valid ? 2 * upperPremium - lowerPremium : null;  // +ve = credit
  const isNetCredit   = netCredit != null && netCredit >= 0;
  const spreadWidth   = valid ? upperStrike - lowerStrike : null;

  // Max profit achieved exactly at K2 at expiry
  const maxProfitUnit = valid ? spreadWidth + netCredit : null;  // (K2−K1) + netCredit
  const maxProfit     = valid ? maxProfitUnit * lots * lotSize : null;
  const invalidProfit = valid && maxProfitUnit <= 0;

  // Breakevens
  // Lower BE: only if net debit → S = K1 + netDebit = K1 − netCredit
  const lowerBE = valid && !invalidProfit && netCredit < 0 ? lowerStrike - netCredit : null;
  // Upper BE: above K2, pnl = −S + 2K2 − K1 + netCredit = 0 → S = 2K2 − K1 + netCredit
  const upperBE = valid && !invalidProfit ? 2 * upperStrike - lowerStrike + netCredit : null;

  // Loss below K1 (flat zone)
  const flatZonePnl = valid && !invalidProfit ? netCredit * lots * lotSize : null;  // profit if +ve, loss if −ve

  const pnlFn = (spot) =>
    Math.max(0, spot - lowerStrike) - 2 * Math.max(0, spot - upperStrike) + netCredit;

  const qty = lots * lotSize;

  const breakevens = valid && !invalidProfit
    ? lowerBE != null ? [lowerBE, upperBE] : [upperBE]
    : [];

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={CARD}>
        <p style={SEC_TITLE}>Bull Call Ratio Spread Inputs</p>
        <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: -12, marginBottom: 16 }}>
          Buy 1 ATM/OTM call · Sell 2 higher-strike calls
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Buy Strike — K1 (₹)"     k="lowerStrike"  placeholder="100" hint="Call you buy (1 lot)"                form={form} onChange={onChange} />
          <Field label="K1 Premium Paid (₹)"     k="lowerPremium" placeholder="10"  hint="Premium paid per unit"               form={form} onChange={onChange} />
          <Field label="Sell Strike — K2 (₹)"    k="upperStrike"  placeholder="105" hint="Call you sell (2 lots — higher OTM)" form={form} onChange={onChange} />
          <Field label="K2 Premium Received (₹)" k="upperPremium" placeholder="5"   hint="Premium received per unit per leg"   form={form} onChange={onChange} />
          <Field label="Number of Lots"           k="lots"         placeholder="1"                                              form={form} onChange={onChange} />
          <Field label="Lot Size"                 k="lotSize"      placeholder="50"                                             form={form} onChange={onChange} />
        </div>
        {invalidStrikes && <div style={ERROR_BOX}>✗ Sell strike (K2) must be higher than buy strike (K1).</div>}
        {valid && invalidProfit && (
          <div style={ERROR_BOX}>
            ✗ Net credit is too negative — profit zone disappears. Increase the sell premium or reduce the spread width.
          </div>
        )}
      </div>

      {valid && !invalidProfit && (
        <>
          {/* ── Net Debit warning — loss on both sides ── */}
          {!isNetCredit && (
            <div style={{ background: "rgba(220,38,38,0.09)", border: "1px solid rgba(220,38,38,0.35)", borderRadius: 12, padding: "14px 18px", marginBottom: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 800, color: "var(--red)", margin: "0 0 4px" }}>Avoid this setup — loss on both sides</p>
                <p style={{ fontSize: 12, color: "var(--red)", opacity: 0.85, margin: 0, lineHeight: 1.55 }}>
                  You are entering for a <strong>net debit of {fmtINR(Math.abs(netCredit))}</strong>. This means you lose money if the stock stays flat or falls (below the lower breakeven), <em>and</em> also if it rallies sharply past the upper breakeven. You are exposed to losses in both directions — ideally this spread should be entered for a net credit or at worst zero cost.
                </p>
              </div>
            </div>
          )}

          {/* ── Breakeven hero cards ── */}
          <div style={{ display: "grid", gridTemplateColumns: lowerBE != null ? "1fr 1fr" : "1fr", gap: 12, marginBottom: 16 }}>
            {lowerBE != null && (
              <div style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.25)", borderRadius: 12, padding: "18px 20px" }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                  Lower Breakeven
                </p>
                <p style={{ fontSize: 40, fontWeight: 800, color: "var(--red)", margin: "0 0 4px", fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>
                  {fmtINR(lowerBE)}
                </p>
                <p style={{ fontSize: 12, color: "rgba(220,38,38,0.7)", margin: 0 }}>
                  Loss starts below this · K1 + Net Debit
                </p>
              </div>
            )}
            <div style={{ background: isNetCredit ? "var(--green-light)" : "rgba(220,38,38,0.07)", border: `1px solid ${isNetCredit ? "rgba(45,122,95,0.2)" : "rgba(220,38,38,0.25)"}`, borderRadius: 12, padding: "18px 20px" }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: isNetCredit ? "var(--green)" : "var(--red)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                Upper Breakeven (danger zone)
              </p>
              <p style={{ fontSize: 40, fontWeight: 800, color: isNetCredit ? "var(--green)" : "var(--red)", margin: "0 0 4px", fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>
                {fmtINR(upperBE)}
              </p>
              <p style={{ fontSize: 12, color: isNetCredit ? "rgba(45,122,95,0.7)" : "rgba(220,38,38,0.7)", margin: 0 }}>
                Loss accelerates above this · 2×K2 − K1 + net
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <StatCard
              label={isNetCredit ? "Net Credit" : "Net Debit"}
              val={fmtINR(Math.abs(netCredit))}
              sub={isNetCredit ? "Credit received at entry" : "Cost paid at entry"}
              col={isNetCredit ? "var(--green)" : "#d97706"}
            />
            <StatCard label="Max Profit (at K2)"  val={fmtINR(maxProfit)}   sub={`If price = ${fmtINR(upperStrike)} at expiry`} col="var(--green)" />
            <StatCard
              label={isNetCredit ? "Profit below K1" : "Loss below K1"}
              val={fmtINR(Math.abs(flatZonePnl))}
              sub={isNetCredit ? "Kept if price stays ≤ buy strike" : "Lost if price stays ≤ buy strike"}
              col={isNetCredit ? "var(--green)" : "var(--red)"}
            />
            <StatCard label="Max Loss" val="Unlimited ↑"     sub="Loss grows without bound above upper BE" col="var(--red)" />
          </div>

          <TradeExpectation
            zones={[
              ...(lowerBE != null ? [ZONE.loss("LOSS", `Below ${fmtINR(lowerBE)}`, "Net debit lost")] : []),
              ZONE.building("BUILDING", `${lowerBE != null ? fmtINR(lowerBE) : fmtINR(lowerStrike)} → ${fmtINR(upperStrike)}`, "Long call gaining value", 2),
              ZONE.profit("PEAK ✓", `At ${fmtINR(upperStrike)}`, `${fmtINR(maxProfitUnit)}/unit`),
              ZONE.eroding("ERODING → LOSS", `${fmtINR(upperStrike)} → ${fmtINR(upperBE)} → ∞`, "Net short 1 call takes over", 2),
            ]}
            ideal={`Price rises gradually to ${fmtINR(upperStrike)} and stalls there. Exit before it looks like breaking past the upper BE.`}
            exitRule={`Close before price reaches ${fmtINR(upperBE)}. If the stock is still surging strongly near K2, don't hold through expiry.`}
          />

          <DissectPanel
            steps={[
              { label: "Net Premium", formula: `(2 × K2 premium) − K1 premium = (2 × ${fmtINR(upperPremium)}) − ${fmtINR(lowerPremium)}`, result: netCredit >= 0 ? `+${fmtINR(netCredit)} credit` : `−${fmtINR(Math.abs(netCredit))} debit`, resultCol: netCredit >= 0 ? "var(--green)" : "#d97706", note: "Selling 2 calls at K2 offsets some or all of the K1 premium. Positive = credit received; negative = debit paid." },
              { label: "Max Profit / Unit", formula: `(K2 − K1) + netCredit = ${fmtINR(spreadWidth)} + (${netCredit >= 0 ? "+" : ""}${fmtINR(netCredit)})`, result: fmtINR(maxProfitUnit), resultCol: "var(--green)", note: `Profit peaks exactly when price = ${fmtINR(upperStrike)} at expiry.` },
              { label: "Max Profit (position)", formula: `maxProfitUnit × lots × lotSize = ${fmtINR(maxProfitUnit)} × ${lots} × ${lotSize}`, result: fmtINR(maxProfit), resultCol: "var(--green)" },
              ...(lowerBE != null ? [{ label: "Lower Breakeven", formula: `K1 + netDebit = ${fmtINR(lowerStrike)} + ${fmtINR(-netCredit)}`, result: fmtINR(lowerBE), note: "Profit begins above here (net debit case)." }] : []),
              { label: "Upper Breakeven", formula: `2×K2 − K1 + netCredit = 2×${fmtINR(upperStrike)} − ${fmtINR(lowerStrike)} + (${netCredit >= 0 ? "+" : ""}${fmtINR(netCredit)})`, result: fmtINR(upperBE), note: "Loss accelerates past this point — the naked short starts dominating." },
              { label: "Profit / Loss below K1", formula: `netCredit × lots × lotSize = (${netCredit >= 0 ? "+" : ""}${fmtINR(netCredit)}) × ${lots * lotSize}`, result: netCredit >= 0 ? `+${fmtINR(flatZonePnl)} profit` : `−${fmtINR(Math.abs(flatZonePnl))} loss`, resultCol: netCredit >= 0 ? "var(--green)" : "var(--red)", note: "The flat zone below K1. If entered for credit, you keep it. If for debit, you lose it." },
            ]}
            legs={[
              {
                label: "Long Call K1 (×1)",
                action: "Buy", qty: 1, type: "Call",
                strike: lowerStrike, premium: lowerPremium,
                desc: "The directional leg. Gains intrinsic value as price rises above K1. Provides unlimited upside — but this benefit is partially given up by the two short calls above.",
              },
              {
                label: "Short Call K2 (×2)",
                action: "Sell", qty: 2, type: "Call",
                strike: upperStrike, premium: upperPremium,
                desc: "Selling 2 calls at K2 brings in premium to reduce or eliminate the cost of the long call. However, past K2 you are net short 1 call (buy 1, sell 2), which means losses grow without bound as the price rises — this is the key risk of this strategy.",
              },
            ]}
            lotQty={qty}
          />

          <PayoffChart
            pnlFn={pnlFn}
            center={upperStrike}
            breakevens={breakevens}
            title="Bull Call Ratio Spread — Payoff at Expiry"
          />

          <PLSimulator
            pnlFn={pnlFn}
            qty={qty}
            breakevens={breakevens}
            legFns={[
              (spot) => Math.max(0, spot - lowerStrike) - lowerPremium,
              (spot) => upperPremium - Math.max(0, spot - upperStrike),
            ]}
            legLabels={["Long Call K1 (×1)", "Short Call K2 (per leg, ×2)"]}
            isShort={false}
          />
        </>
      )}
    </div>
  );
}
