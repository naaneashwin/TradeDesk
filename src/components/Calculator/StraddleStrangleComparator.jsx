import { useState } from "react";
import { SEC_TITLE, ERROR_BOX, Row, DIR_STYLE, fmtINR, fmt2 } from "./shared";

export default function StraddleStrangleComparator() {
  const [type, setType]       = useState("long");
  const [lots, setLots]       = useState("1");
  const [lotSize, setLotSize] = useState("1");

  // Straddle fields
  const [sad, setSad] = useState({ strike: "", callP: "", putP: "" });
  const onSad = (k, v) => setSad((p) => ({ ...p, [k]: v }));

  // Strangle fields
  const [sng, setSng] = useState({ callStrike: "", callP: "", putStrike: "", putP: "" });
  const onSng = (k, v) => setSng((p) => ({ ...p, [k]: v }));

  const qty = (parseFloat(lots) || 1) * (parseFloat(lotSize) || 1);

  // ── Straddle maths ──
  const sadStrike = parseFloat(sad.strike);
  const sadCallP  = parseFloat(sad.callP);
  const sadPutP   = parseFloat(sad.putP);
  const sadValid  = sadStrike > 0 && sadCallP > 0 && sadPutP > 0;
  const sadNet    = sadValid ? sadCallP + sadPutP : null;
  const sadUpperBE  = sadValid ? sadStrike + sadNet : null;
  const sadLowerBE  = sadValid ? sadStrike - sadNet : null;
  const sadBERange  = sadValid ? 2 * sadNet : null;
  const sadTotal    = sadValid ? sadNet * qty : null;

  // ── Strangle maths ──
  const sngCallStrike = parseFloat(sng.callStrike);
  const sngCallP      = parseFloat(sng.callP);
  const sngPutStrike  = parseFloat(sng.putStrike);
  const sngPutP       = parseFloat(sng.putP);
  const invalidStrikes = sngCallStrike > 0 && sngPutStrike > 0 && sngCallStrike <= sngPutStrike;
  const sngValid = sngCallStrike > 0 && sngCallP > 0 && sngPutStrike > 0 && sngPutP > 0 && sngCallStrike > sngPutStrike;
  const sngNet      = sngValid ? sngCallP + sngPutP : null;
  const sngUpperBE  = sngValid ? sngCallStrike + sngNet : null;
  const sngLowerBE  = sngValid ? sngPutStrike - sngNet : null;
  const sngBERange  = sngValid ? sngUpperBE - sngLowerBE : null;
  const sngTotal    = sngValid ? sngNet * qty : null;

  const bothValid = sadValid && sngValid;

  let recommendation = null;
  if (bothValid) {
    if (type === "long") {
      const sadCheaper = sadNet <= sngNet;
      recommendation = sadCheaper
        ? { winner: "straddle", text: `Straddle costs ₹${fmt2(sadNet)}/unit vs ₹${fmt2(sngNet)}/unit for the strangle — lower upfront cost and a tighter breakeven range (${fmt2(sadBERange)} pts). Pick this if you expect a sharp decisive move near the current price.` }
        : { winner: "strangle", text: `Strangle costs ₹${fmt2(sngNet)}/unit vs ₹${fmt2(sadNet)}/unit for the straddle — cheaper premium and the price has more room to move before either breakeven (${fmt2(sngBERange)} pts). Pick this if you expect a large explosive move with some uncertainty on direction.` };
    } else {
      const sadHigherCredit = sadNet >= sngNet;
      recommendation = sadHigherCredit
        ? { winner: "straddle", text: `Short Straddle earns more premium (₹${fmt2(sadNet)}/unit vs ₹${fmt2(sngNet)}/unit) but has a narrow safe zone — price must stay very close to ${fmtINR(sadStrike)}. Higher reward, higher risk.` }
        : { winner: "strangle", text: `Short Strangle earns less premium (₹${fmt2(sngNet)}/unit) but gives a wider safe zone of ${fmt2(sngBERange)} pts between ${fmtINR(sngLowerBE)} – ${fmtINR(sngUpperBE)}. Lower reward, more breathing room.` };
    }
  }

  const inputCard = (title, children) => (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
      <p style={SEC_TITLE}>{title}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>{children}</div>
    </div>
  );

  const inpStyle = { display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 };

  const CompareCol = ({ label, valid, net, upperBE, lowerBE, beRange, total, isWinner }) => (
    <div style={{ background: isWinner ? "var(--green-light)" : "var(--surface-2)", border: `1px solid ${isWinner ? "rgba(45,122,95,0.25)" : "var(--border)"}`, borderRadius: 12, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: 0 }}>{label}</p>
        {isWinner && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--green)", background: "rgba(45,122,95,0.15)", border: "1px solid rgba(45,122,95,0.25)", borderRadius: 6, padding: "3px 8px" }}>✓ Recommended</span>}
      </div>
      {valid ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Row k={type === "long" ? "Net Premium Paid" : "Net Credit Received"} v={fmtINR(net)} col={type === "long" ? "#d97706" : "var(--green)"} />
          <Row k={type === "long" ? "Total Cost" : "Total Credit"} v={fmtINR(total)} col={type === "long" ? "#d97706" : "var(--green)"} />
          <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
          <Row k="Upper Breakeven" v={fmtINR(upperBE)} />
          <Row k="Lower Breakeven" v={fmtINR(lowerBE)} />
          <Row k="Breakeven Range" v={`${fmt2(beRange)} pts`} highlight />
          <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
          <Row k={type === "long" ? "Max Loss" : "Max Profit"} v={fmtINR(total)} col={type === "long" ? "var(--red)" : "var(--green)"} />
          <Row k={type === "long" ? "Max Profit" : "Max Loss"} v="Unlimited" col={type === "long" ? "var(--green)" : "var(--red)"} />
        </div>
      ) : (
        <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0 }}>Fill in all inputs to see results</p>
      )}
    </div>
  );

  return (
    <div>
      {/* Direction toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, maxWidth: 300 }}>
        {["long", "short"].map((d) => {
          const ds = DIR_STYLE[d];
          const active = type === d;
          return (
            <button key={d} onClick={() => setType(d)} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${active ? ds.border : "var(--border)"}`, background: active ? ds.bg : "transparent", color: active ? ds.text : "var(--text-2)", fontWeight: active ? 700 : 500, fontSize: 13, cursor: "pointer", fontFamily: "Inter, sans-serif", transition: "all 0.15s" }}>
              {d === "long" ? "↑ Long (Buy)" : "↓ Short (Sell)"}
            </button>
          );
        })}
      </div>

      {/* Lots + Lot Size */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, maxWidth: 400 }}>
        <div style={{ flex: 1 }}>
          <label style={inpStyle}>Lots</label>
          <input type="number" className="t-inp font-mono" value={lots} onChange={(e) => setLots(e.target.value)} placeholder="1" />
        </div>
        <div style={{ flex: 1 }}>
          <label style={inpStyle}>Lot Size</label>
          <input type="number" className="t-inp font-mono" value={lotSize} onChange={(e) => setLotSize(e.target.value)} placeholder="50" />
        </div>
      </div>

      {/* Inputs side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        {inputCard(
          type === "long" ? "Straddle — Buy ATM Call + ATM Put" : "Short Straddle — Sell ATM Call + ATM Put",
          <>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={inpStyle}>ATM Strike (₹)</label>
              <input type="number" className="t-inp font-mono" value={sad.strike} onChange={(e) => onSad("strike", e.target.value)} placeholder="500" />
            </div>
            <div>
              <label style={inpStyle}>Call Premium (₹)</label>
              <input type="number" className="t-inp font-mono" value={sad.callP} onChange={(e) => onSad("callP", e.target.value)} placeholder="15" />
            </div>
            <div>
              <label style={inpStyle}>Put Premium (₹)</label>
              <input type="number" className="t-inp font-mono" value={sad.putP} onChange={(e) => onSad("putP", e.target.value)} placeholder="15" />
            </div>
          </>
        )}
        {inputCard(
          type === "long" ? "Strangle — Buy OTM Call + OTM Put" : "Short Strangle — Sell OTM Call + OTM Put",
          <>
            <div>
              <label style={inpStyle}>Call Strike (₹)</label>
              <input type="number" className="t-inp font-mono" value={sng.callStrike} onChange={(e) => onSng("callStrike", e.target.value)} placeholder="520" />
            </div>
            <div>
              <label style={inpStyle}>Call Premium (₹)</label>
              <input type="number" className="t-inp font-mono" value={sng.callP} onChange={(e) => onSng("callP", e.target.value)} placeholder="8" />
            </div>
            <div>
              <label style={inpStyle}>Put Strike (₹)</label>
              <input type="number" className="t-inp font-mono" value={sng.putStrike} onChange={(e) => onSng("putStrike", e.target.value)} placeholder="480" />
            </div>
            <div>
              <label style={inpStyle}>Put Premium (₹)</label>
              <input type="number" className="t-inp font-mono" value={sng.putP} onChange={(e) => onSng("putP", e.target.value)} placeholder="8" />
            </div>
            {invalidStrikes && <div style={{ ...ERROR_BOX, gridColumn: "1 / -1" }}>✗ Call strike must be higher than put strike.</div>}
          </>
        )}
      </div>

      {/* Results comparison */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        <CompareCol label={type === "long" ? "Long Straddle" : "Short Straddle"} valid={sadValid} net={sadNet} upperBE={sadUpperBE} lowerBE={sadLowerBE} beRange={sadBERange} total={sadTotal} isWinner={bothValid && recommendation?.winner === "straddle"} />
        <CompareCol label={type === "long" ? "Long Strangle" : "Short Strangle"} valid={sngValid} net={sngNet} upperBE={sngUpperBE} lowerBE={sngLowerBE} beRange={sngBERange} total={sngTotal} isWinner={bothValid && recommendation?.winner === "strangle"} />
      </div>

      {recommendation && (
        <div style={{ background: "var(--green-light)", border: "1px solid rgba(45,122,95,0.25)", borderRadius: 12, padding: 20 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Recommendation</p>
          <p style={{ fontSize: 14, color: "var(--text)", margin: 0, lineHeight: 1.65 }}>
            <strong style={{ color: "var(--green)" }}>
              {recommendation.winner === "straddle" ? (type === "long" ? "Long Straddle" : "Short Straddle") : (type === "long" ? "Long Strangle" : "Short Strangle")}
            </strong>
            {" — "}
            {recommendation.text}
          </p>
        </div>
      )}
    </div>
  );
}
