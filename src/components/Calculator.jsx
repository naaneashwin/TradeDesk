import { useState } from "react";

const fmtINR = (n) =>
  "₹" +
  n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const fmt2 = (n) =>
  n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const CARD = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 24,
  marginBottom: 20,
};
const SEC_TITLE = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--text-2)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 20,
};
const ERROR_BOX = {
  marginTop: 16,
  padding: "10px 14px",
  borderRadius: 8,
  background: "rgba(220,38,38,0.08)",
  color: "var(--red)",
  fontSize: 13,
  border: "1px solid rgba(220,38,38,0.2)",
};

function Field({ label, k, placeholder, hint, form, onChange }) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-2)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <input
        type="number"
        className="t-inp font-mono"
        value={form[k]}
        onChange={(e) => onChange(k, e.target.value)}
        placeholder={placeholder}
      />
      {hint && (
        <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function StatCard({ label, val, sub, col }) {
  return (
    <div
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "16px 18px",
      }}
    >
      <p
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--text-3)",
          marginBottom: 8,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: col ?? "var(--text)",
          margin: "0 0 4px",
          fontFamily: "JetBrains Mono, monospace",
        }}
      >
        {val}
      </p>
      {sub && (
        <p style={{ fontSize: 11, color: "var(--text-3)", margin: 0 }}>{sub}</p>
      )}
    </div>
  );
}

// ─── Position Size ────────────────────────────────────────────────
function PositionSizeCalc({ direction = "long" }) {
  const [form, setForm] = useState({
    total: "",
    capital: "",
    risk: "1",
    entry: "",
    sl: "",
  });
  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const isLong = direction === "long";
  const total = parseFloat(form.total);
  const capital = parseFloat(form.capital);
  const risk = parseFloat(form.risk);
  const entry = parseFloat(form.entry);
  const sl = parseFloat(form.sl);

  const valid = total > 0 && capital > 0 && risk > 0 && entry > 0 && sl > 0;
  const riskPerShare = isLong ? entry - sl : sl - entry;
  const invalid = valid && riskPerShare <= 0;

  let result = null;
  if (valid && riskPerShare > 0) {
    const maxRisk = total * (risk / 100);
    const shares = Math.floor(
      Math.min(maxRisk / riskPerShare, capital / entry),
    );
    const capReq = shares * entry;
    const actualRisk = shares * riskPerShare;
    const actualHeat = (actualRisk / total) * 100;
    const capPct = (capReq / capital) * 100;
    result = { shares, capReq, actualRisk, actualHeat, capPct, maxRisk };
  }

  const barW = result ? Math.min(result.capPct, 100) : 0;
  const barCol =
    barW > 75 ? "var(--red)" : barW > 40 ? "#d97706" : "var(--green)";

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={CARD}>
        <p style={SEC_TITLE}>Trade Inputs</p>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          <Field
            label="Total Portfolio Capital (₹)"
            k="total"
            placeholder="100000"
            hint="Your total portfolio value"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Capital for This Trade (₹)"
            k="capital"
            placeholder="20000"
            hint="Max capital allocated to this trade"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Risk Per Trade (%)"
            k="risk"
            placeholder="1"
            hint="Typical: 0.5% – 2%"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Entry Price (₹)"
            k="entry"
            placeholder="500"
            hint="Your planned entry price"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Stop Loss Price (₹)"
            k="sl"
            placeholder={isLong ? "480" : "520"}
            hint={
              isLong
                ? "Must be below entry (long)"
                : "Must be above entry (short)"
            }
            form={form}
            onChange={onChange}
          />
        </div>
        {invalid && (
          <div style={ERROR_BOX}>
            {isLong
              ? "✗ Stop loss must be strictly below entry for a long trade."
              : "✗ Stop loss must be strictly above entry for a short trade."}
          </div>
        )}
      </div>

      {result && (
        <>
          <div
            style={{
              background: isLong
                ? "var(--green-light)"
                : "rgba(220,38,38,0.07)",
              border: `1px solid ${isLong ? "rgba(45,122,95,0.2)" : "rgba(220,38,38,0.2)"}`,
              borderRadius: 12,
              padding: 24,
              marginBottom: 16,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: isLong ? "var(--green)" : "var(--red)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 6,
              }}
            >
              {isLong ? "Shares to Buy" : "Shares to Short"}
            </p>
            <p
              style={{
                fontSize: 52,
                fontWeight: 800,
                color: isLong ? "var(--green)" : "var(--red)",
                margin: "0 0 4px",
                fontFamily: "JetBrains Mono, monospace",
                lineHeight: 1,
              }}
            >
              {result.shares.toLocaleString("en-IN")}
            </p>
            <p
              style={{
                fontSize: 13,
                color: isLong ? "rgba(45,122,95,0.7)" : "rgba(220,38,38,0.7)",
                margin: 0,
              }}
            >
              shares @ {fmtINR(entry)} per share
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <StatCard
              label="Capital Required"
              val={fmtINR(result.capReq)}
              sub={`${fmt2(result.capPct)}% of trade capital`}
            />
            <StatCard
              label="Actual Risk Amount"
              val={fmtINR(result.actualRisk)}
              sub={`Max allowed: ${fmtINR(result.maxRisk)}`}
              col="#d97706"
            />
            <StatCard
              label="Portfolio Heat"
              val={fmt2(result.actualHeat) + "%"}
              sub={`Target ${form.risk}% · Actual ${fmt2(result.actualHeat)}%`}
              col={result.actualHeat <= risk ? "var(--green)" : "#d97706"}
            />
            <StatCard
              label="Risk Per Share"
              val={fmtINR(riskPerShare)}
              sub={
                isLong
                  ? `${fmtINR(entry)} entry − ${fmtINR(sl)} stop`
                  : `${fmtINR(sl)} stop − ${fmtINR(entry)} entry`
              }
            />
          </div>

          <div style={CARD}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-2)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  margin: 0,
                }}
              >
                Trade Capital Utilisation
              </p>
              <span
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 14,
                  fontWeight: 700,
                  color: barCol,
                }}
              >
                {fmt2(result.capPct)}%
              </span>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 4,
                background: "var(--border)",
                overflow: "hidden",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: 4,
                  width: `${barW}%`,
                  background: barCol,
                  transition: "width 0.4s",
                }}
              />
            </div>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-3)",
                margin: 0,
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {fmtINR(result.capReq)} used · {fmtINR(capital - result.capReq)}{" "}
              remaining
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ─── P&L Simulator (at-expiry, shared across option calculators) ──
function PLSimulator({
  pnlFn,
  qty,
  breakevens = [],
  legFns = [],
  legLabels = [],
  isShort = false,
}) {
  const [spot, setSpot] = useState("");
  const spotVal = parseFloat(spot);
  const spotValid = !isNaN(spotVal) && spotVal > 0;
  const pnlPerUnit = spotValid ? pnlFn(spotVal) : null;
  const totalPnl = spotValid ? pnlPerUnit * qty : null;

  const isProfit = spotValid && totalPnl > 0;
  const isLoss = spotValid && totalPnl < 0;

  const statusBg = isProfit
    ? "var(--green-light)"
    : isLoss
      ? "rgba(220,38,38,0.07)"
      : "var(--surface-2)";
  const statusBorder = isProfit
    ? "rgba(45,122,95,0.2)"
    : isLoss
      ? "rgba(220,38,38,0.2)"
      : "var(--border)";
  const statusColor = isProfit
    ? "var(--green)"
    : isLoss
      ? "var(--red)"
      : "var(--text-2)";
  const statusLabel = isProfit ? "PROFIT ▲" : isLoss ? "LOSS ▼" : "BREAKEVEN";

  return (
    <div style={CARD}>
      <p style={SEC_TITLE}>At-Expiry P&L Simulator</p>
      <div style={{ marginBottom: 12 }}>
        <label
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-2)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 6,
          }}
        >
          Current Underlying Price (₹)
        </label>
        <input
          type="number"
          className="t-inp font-mono"
          value={spot}
          onChange={(e) => setSpot(e.target.value)}
          placeholder="e.g. 510"
          style={{ maxWidth: 220 }}
        />
        <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
          P&L if the underlying closes at this price at expiry (intrinsic value
          only)
        </p>
      </div>

      {spotValid && (
        <>
          <div
            style={{
              background: statusBg,
              border: `1px solid ${statusBorder}`,
              borderRadius: 12,
              padding: "18px 22px",
              marginBottom: breakevens.length > 0 ? 14 : 0,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: statusColor,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 6,
              }}
            >
              {statusLabel}
            </p>
            <p
              style={{
                fontSize: 40,
                fontWeight: 800,
                color: statusColor,
                margin: "0 0 4px",
                fontFamily: "JetBrains Mono, monospace",
                lineHeight: 1,
              }}
            >
              {totalPnl >= 0 ? "+" : "−"}
              {fmtINR(Math.abs(totalPnl))}
            </p>
            <p
              style={{
                fontSize: 12,
                color: statusColor,
                opacity: 0.7,
                margin: 0,
              }}
            >
              {pnlPerUnit >= 0 ? "+" : "−"}
              {fmtINR(Math.abs(pnlPerUnit))} per unit ×{" "}
              {qty.toLocaleString("en-IN")} units
            </p>
          </div>

          {breakevens.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: breakevens.length > 1 ? "1fr 1fr" : "1fr",
                gap: 10,
              }}
            >
              {breakevens.map((be, i) => {
                const isLower = breakevens.length > 1 && i === 0;
                const isUpper = breakevens.length > 1 && i === 1;
                const isSingle = breakevens.length === 1;
                const dist = spotVal - be;
                const pct = (Math.abs(dist) / be) * 100;
                const atBE = Math.abs(dist) < 0.005;

                // Overall position P&L drives color — correct for both long and short
                const overallPnl = pnlFn(spotVal) * qty;
                const inProfit = overallPnl > 0;
                const inLoss = overallPnl < 0;

                // Leg contribution (for display only)
                const legPnlPerUnit = legFns[i] ? legFns[i](spotVal) : null;
                const legTotal =
                  legPnlPerUnit !== null ? legPnlPerUnit * qty : null;

                const bg = atBE
                  ? "var(--surface-2)"
                  : legTotal === null
                    ? "var(--surface-2)"
                    : legTotal > 0
                      ? "var(--green-light)"
                      : "rgba(220,38,38,0.07)";
                const border = atBE
                  ? "var(--border)"
                  : legTotal === null
                    ? "var(--border)"
                    : legTotal > 0
                      ? "rgba(45,122,95,0.2)"
                      : "rgba(220,38,38,0.25)";
                const dc = atBE
                  ? "var(--text-2)"
                  : legTotal === null
                    ? "var(--text-2)"
                    : legTotal > 0
                      ? "var(--green)"
                      : "var(--red)";

                const label = isSingle
                  ? "Breakeven"
                  : isLower
                    ? "Lower Breakeven"
                    : "Upper Breakeven";

                let statusMsg;
                if (atBE) {
                  statusMsg = "At breakeven";
                } else if (isShort) {
                  // Short: profit = price stays between BEs
                  const outsideLower = isLower && dist < 0;
                  const outsideUpper = isUpper && dist > 0;
                  const outside = isSingle
                    ? inLoss
                    : outsideLower || outsideUpper;
                  if (outside) {
                    statusMsg = `✗ Price broke past the ${isLower ? "lower" : "upper"} breakeven — position is losing`;
                  } else {
                    statusMsg = `✓ Price is inside the safe zone — ${fmtINR(Math.abs(dist))} away from ${isLower ? "lower" : "upper"} BE (${fmt2(pct)}%)`;
                  }
                } else {
                  // Long: profit = price crosses BE in the right direction
                  if (inProfit) {
                    statusMsg = `✓ ${fmtINR(Math.abs(dist))} ${dist > 0 ? "above" : "below"} BE (${fmt2(pct)}%)`;
                  } else {
                    const side = isSingle ? "" : isLower ? "lower " : "upper ";
                    statusMsg = `✗ Price hasn't crossed the ${side}breakeven yet`;
                  }
                }

                return (
                  <div
                    key={i}
                    style={{
                      background: bg,
                      border: `1px solid ${border}`,
                      borderRadius: 8,
                      padding: "12px 14px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 10,
                        color: "var(--text-3)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: 4,
                      }}
                    >
                      {label}
                    </p>
                    <p
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "var(--text)",
                        margin: "0 0 5px",
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      {fmtINR(be)}
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: dc,
                        margin: 0,
                        lineHeight: 1.4,
                      }}
                    >
                      {statusMsg}
                    </p>
                    {/* If more legFns than breakevens (spreads), show each leg contribution */}
                    {legFns.length > 0 && (
                      <div
                        style={{
                          marginTop: 8,
                          borderTop: "1px solid var(--border)",
                          paddingTop: 8,
                        }}
                      >
                        {legFns.length > breakevens.length
                          ? legFns.map((fn, li) => {
                              const lp = fn(spotVal) * qty;
                              const lLabel = legLabels[li] ?? `Leg ${li + 1}`;
                              return (
                                <div
                                  key={li}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginBottom:
                                      li < legFns.length - 1 ? 4 : 0,
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: 11,
                                      color: "var(--text-3)",
                                    }}
                                  >
                                    {lLabel}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 700,
                                      color:
                                        lp >= 0 ? "var(--green)" : "var(--red)",
                                      fontFamily: "JetBrains Mono, monospace",
                                    }}
                                  >
                                    {lp >= 0 ? "+" : "−"}
                                    {fmtINR(Math.abs(lp))}
                                  </span>
                                </div>
                              );
                            })
                          : legTotal !== null && (
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: "var(--text-3)",
                                  }}
                                >
                                  {legLabels[i] ?? "This leg"}
                                </span>
                                <span
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color:
                                      legTotal >= 0
                                        ? "var(--green)"
                                        : "var(--red)",
                                    fontFamily: "JetBrains Mono, monospace",
                                  }}
                                >
                                  {legTotal >= 0 ? "+" : "−"}
                                  {fmtINR(Math.abs(legTotal))}
                                </span>
                              </div>
                            )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Call BreakEven ───────────────────────────────────────────────
function CallBreakEvenCalc() {
  const [form, setForm] = useState({
    strike: "",
    premium: "",
    lots: "1",
    lotSize: "1",
  });
  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const strike = parseFloat(form.strike);
  const premium = parseFloat(form.premium);
  const lots = parseFloat(form.lots) || 1;
  const lotSize = parseFloat(form.lotSize) || 1;
  const valid = strike > 0 && premium > 0;

  const breakeven = valid ? strike + premium : null;
  const totalCost = valid ? premium * lots * lotSize : null;

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={CARD}>
        <p style={SEC_TITLE}>Call Option Inputs</p>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          <Field
            label="Strike Price (₹)"
            k="strike"
            placeholder="500"
            hint="Call option strike price"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Premium Paid (₹)"
            k="premium"
            placeholder="20"
            hint="Premium per share / unit"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Number of Lots"
            k="lots"
            placeholder="1"
            hint="Number of contracts"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Lot Size"
            k="lotSize"
            placeholder="50"
            hint="Units per lot"
            form={form}
            onChange={onChange}
          />
        </div>
      </div>

      {valid && (
        <>
          <div
            style={{
              background: "var(--green-light)",
              border: "1px solid rgba(45,122,95,0.2)",
              borderRadius: 12,
              padding: 24,
              marginBottom: 16,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--green)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 6,
              }}
            >
              Breakeven Price
            </p>
            <p
              style={{
                fontSize: 52,
                fontWeight: 800,
                color: "var(--green)",
                margin: "0 0 4px",
                fontFamily: "JetBrains Mono, monospace",
                lineHeight: 1,
              }}
            >
              {fmtINR(breakeven)}
            </p>
            <p
              style={{ fontSize: 13, color: "rgba(45,122,95,0.7)", margin: 0 }}
            >
              Stock must close above {fmtINR(breakeven)} at expiry to profit
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <StatCard
              label="Strike Price"
              val={fmtINR(strike)}
              sub="Call option strike"
            />
            <StatCard
              label="Premium Paid"
              val={fmtINR(premium)}
              sub="Per unit / share"
              col="#d97706"
            />
            <StatCard
              label="Total Premium Cost"
              val={fmtINR(totalCost)}
              sub={`${lots} lot(s) × ${lotSize} units`}
              col="#d97706"
            />
            <StatCard
              label="Max Loss"
              val={fmtINR(totalCost)}
              sub="If option expires worthless"
              col="var(--red)"
            />
          </div>

          <div style={CARD}>
            <p style={{ fontSize: 11, color: "var(--text-3)", margin: 0 }}>
              ↑ Max Profit: Unlimited — profit grows as the stock rises above{" "}
              {fmtINR(breakeven)}
            </p>
          </div>
          <PLSimulator
            pnlFn={(spot) => Math.max(0, spot - strike) - premium}
            qty={lots * lotSize}
            breakevens={[breakeven]}
            legFns={[(spot) => Math.max(0, spot - strike) - premium]}
            legLabels={["Long Call"]}
          />
        </>
      )}
    </div>
  );
}

// ─── Put BreakEven ────────────────────────────────────────────────
function PutBreakEvenCalc() {
  const [form, setForm] = useState({
    strike: "",
    premium: "",
    lots: "1",
    lotSize: "1",
  });
  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const strike = parseFloat(form.strike);
  const premium = parseFloat(form.premium);
  const lots = parseFloat(form.lots) || 1;
  const lotSize = parseFloat(form.lotSize) || 1;
  const valid = strike > 0 && premium > 0;

  const breakeven = valid ? strike - premium : null;
  const totalCost = valid ? premium * lots * lotSize : null;
  const breakevenNeg = valid && breakeven <= 0;

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={CARD}>
        <p style={SEC_TITLE}>Put Option Inputs</p>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          <Field
            label="Strike Price (₹)"
            k="strike"
            placeholder="500"
            hint="Put option strike price"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Premium Paid (₹)"
            k="premium"
            placeholder="20"
            hint="Premium per share / unit"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Number of Lots"
            k="lots"
            placeholder="1"
            hint="Number of contracts"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Lot Size"
            k="lotSize"
            placeholder="50"
            hint="Units per lot"
            form={form}
            onChange={onChange}
          />
        </div>
        {breakevenNeg && (
          <div style={ERROR_BOX}>
            ✗ Breakeven is at or below zero — premium is too high relative to
            strike.
          </div>
        )}
      </div>

      {valid && !breakevenNeg && (
        <>
          <div
            style={{
              background: "rgba(220,38,38,0.07)",
              border: "1px solid rgba(220,38,38,0.2)",
              borderRadius: 12,
              padding: 24,
              marginBottom: 16,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--red)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 6,
              }}
            >
              Breakeven Price
            </p>
            <p
              style={{
                fontSize: 52,
                fontWeight: 800,
                color: "var(--red)",
                margin: "0 0 4px",
                fontFamily: "JetBrains Mono, monospace",
                lineHeight: 1,
              }}
            >
              {fmtINR(breakeven)}
            </p>
            <p
              style={{ fontSize: 13, color: "rgba(220,38,38,0.7)", margin: 0 }}
            >
              Stock must close below {fmtINR(breakeven)} at expiry to profit
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <StatCard
              label="Strike Price"
              val={fmtINR(strike)}
              sub="Put option strike"
            />
            <StatCard
              label="Premium Paid"
              val={fmtINR(premium)}
              sub="Per unit / share"
              col="#d97706"
            />
            <StatCard
              label="Total Premium Cost"
              val={fmtINR(totalCost)}
              sub={`${lots} lot(s) × ${lotSize} units`}
              col="#d97706"
            />
            <StatCard
              label="Max Loss"
              val={fmtINR(totalCost)}
              sub="If option expires worthless"
              col="var(--red)"
            />
          </div>

          <div style={CARD}>
            <p style={{ fontSize: 11, color: "var(--text-3)", margin: 0 }}>
              ↓ Max Profit: Up to {fmtINR(breakeven * lots * lotSize)} — profit
              grows as the stock falls toward zero
            </p>
          </div>
          <PLSimulator
            pnlFn={(spot) => Math.max(0, strike - spot) - premium}
            qty={lots * lotSize}
            breakevens={[breakeven]}
            legFns={[(spot) => Math.max(0, strike - spot) - premium]}
            legLabels={["Long Put"]}
          />
        </>
      )}
    </div>
  );
}

// ─── Strangle ─────────────────────────────────────────────────────
function StrangleCalc() {
  const [form, setForm] = useState({
    callStrike: "",
    callPremium: "",
    putStrike: "",
    putPremium: "",
    lots: "1",
    lotSize: "1",
  });
  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const callStrike = parseFloat(form.callStrike);
  const callPremium = parseFloat(form.callPremium);
  const putStrike = parseFloat(form.putStrike);
  const putPremium = parseFloat(form.putPremium);
  const lots = parseFloat(form.lots) || 1;
  const lotSize = parseFloat(form.lotSize) || 1;

  const strikesEntered = callStrike > 0 && putStrike > 0;
  const invalidStrikes = strikesEntered && callStrike <= putStrike;
  const valid =
    callStrike > 0 &&
    callPremium > 0 &&
    putStrike > 0 &&
    putPremium > 0 &&
    callStrike > putStrike;

  const netPremium = valid ? callPremium + putPremium : null;
  const upperBreakeven = valid ? callStrike + netPremium : null;
  const lowerBreakeven = valid ? putStrike - netPremium : null;
  const totalCost = valid ? netPremium * lots * lotSize : null;

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={CARD}>
        <p style={SEC_TITLE}>Strangle Inputs</p>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-3)",
            marginTop: -12,
            marginBottom: 16,
          }}
        >
          Buy OTM Call + Buy OTM Put (different strikes)
        </p>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          <Field
            label="Call Strike (₹)"
            k="callStrike"
            placeholder="520"
            hint="OTM call strike (higher)"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Call Premium (₹)"
            k="callPremium"
            placeholder="10"
            hint="Premium paid for call"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Put Strike (₹)"
            k="putStrike"
            placeholder="480"
            hint="OTM put strike (lower)"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Put Premium (₹)"
            k="putPremium"
            placeholder="10"
            hint="Premium paid for put"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Number of Lots"
            k="lots"
            placeholder="1"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Lot Size"
            k="lotSize"
            placeholder="50"
            form={form}
            onChange={onChange}
          />
        </div>
        {invalidStrikes && (
          <div style={ERROR_BOX}>
            ✗ Call strike must be higher than put strike for a strangle.
          </div>
        )}
      </div>

      {valid && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                background: "var(--green-light)",
                border: "1px solid rgba(45,122,95,0.2)",
                borderRadius: 12,
                padding: 20,
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--green)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 6,
                }}
              >
                Upper Breakeven
              </p>
              <p
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: "var(--green)",
                  margin: "0 0 4px",
                  fontFamily: "JetBrains Mono, monospace",
                  lineHeight: 1,
                }}
              >
                {fmtINR(upperBreakeven)}
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "rgba(45,122,95,0.7)",
                  margin: 0,
                }}
              >
                Call strike + net premium
              </p>
            </div>
            <div
              style={{
                background: "rgba(220,38,38,0.07)",
                border: "1px solid rgba(220,38,38,0.2)",
                borderRadius: 12,
                padding: 20,
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--red)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 6,
                }}
              >
                Lower Breakeven
              </p>
              <p
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: "var(--red)",
                  margin: "0 0 4px",
                  fontFamily: "JetBrains Mono, monospace",
                  lineHeight: 1,
                }}
              >
                {fmtINR(lowerBreakeven)}
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "rgba(220,38,38,0.7)",
                  margin: 0,
                }}
              >
                Put strike − net premium
              </p>
            </div>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <StatCard
              label="Net Premium Paid"
              val={fmtINR(netPremium)}
              sub="Call + Put premium per unit"
              col="#d97706"
            />
            <StatCard
              label="Total Cost"
              val={fmtINR(totalCost)}
              sub={`${lots} lot(s) × ${lotSize} units`}
              col="#d97706"
            />
            <StatCard
              label="Max Loss"
              val={fmtINR(totalCost)}
              sub="If price stays between strikes at expiry"
              col="var(--red)"
            />
            <StatCard
              label="Max Profit"
              val="Unlimited"
              sub="Price must break out beyond either breakeven"
              col="var(--green)"
            />
          </div>
          <PLSimulator
            pnlFn={(spot) =>
              Math.max(0, spot - callStrike) +
              Math.max(0, putStrike - spot) -
              netPremium
            }
            qty={lots * lotSize}
            breakevens={[lowerBreakeven, upperBreakeven]}
            legFns={[
              (spot) => Math.max(0, putStrike - spot) - putPremium,
              (spot) => Math.max(0, spot - callStrike) - callPremium,
            ]}
            legLabels={["Long Put", "Long Call"]}
          />
        </>
      )}
    </div>
  );
}

// ─── Straddle ─────────────────────────────────────────────────────
function StraddleCalc() {
  const [form, setForm] = useState({
    strike: "",
    callPremium: "",
    putPremium: "",
    lots: "1",
    lotSize: "1",
  });
  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const strike = parseFloat(form.strike);
  const callPremium = parseFloat(form.callPremium);
  const putPremium = parseFloat(form.putPremium);
  const lots = parseFloat(form.lots) || 1;
  const lotSize = parseFloat(form.lotSize) || 1;
  const valid = strike > 0 && callPremium > 0 && putPremium > 0;

  const netPremium = valid ? callPremium + putPremium : null;
  const upperBreakeven = valid ? strike + netPremium : null;
  const lowerBreakeven = valid ? strike - netPremium : null;
  const totalCost = valid ? netPremium * lots * lotSize : null;

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={CARD}>
        <p style={SEC_TITLE}>Straddle Inputs</p>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-3)",
            marginTop: -12,
            marginBottom: 16,
          }}
        >
          Buy ATM Call + Buy ATM Put (same strike)
        </p>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          <Field
            label="Strike Price (₹)"
            k="strike"
            placeholder="500"
            hint="ATM strike (same for both)"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Call Premium (₹)"
            k="callPremium"
            placeholder="15"
            hint="Premium paid for ATM call"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Put Premium (₹)"
            k="putPremium"
            placeholder="15"
            hint="Premium paid for ATM put"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Number of Lots"
            k="lots"
            placeholder="1"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Lot Size"
            k="lotSize"
            placeholder="50"
            form={form}
            onChange={onChange}
          />
        </div>
      </div>

      {valid && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                background: "var(--green-light)",
                border: "1px solid rgba(45,122,95,0.2)",
                borderRadius: 12,
                padding: 20,
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--green)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 6,
                }}
              >
                Upper Breakeven
              </p>
              <p
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: "var(--green)",
                  margin: "0 0 4px",
                  fontFamily: "JetBrains Mono, monospace",
                  lineHeight: 1,
                }}
              >
                {fmtINR(upperBreakeven)}
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "rgba(45,122,95,0.7)",
                  margin: 0,
                }}
              >
                Strike + net premium
              </p>
            </div>
            <div
              style={{
                background: "rgba(220,38,38,0.07)",
                border: "1px solid rgba(220,38,38,0.2)",
                borderRadius: 12,
                padding: 20,
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--red)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 6,
                }}
              >
                Lower Breakeven
              </p>
              <p
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: "var(--red)",
                  margin: "0 0 4px",
                  fontFamily: "JetBrains Mono, monospace",
                  lineHeight: 1,
                }}
              >
                {fmtINR(lowerBreakeven)}
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "rgba(220,38,38,0.7)",
                  margin: 0,
                }}
              >
                Strike − net premium
              </p>
            </div>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <StatCard
              label="Net Premium Paid"
              val={fmtINR(netPremium)}
              sub="Call + Put premium per unit"
              col="#d97706"
            />
            <StatCard
              label="Total Cost"
              val={fmtINR(totalCost)}
              sub={`${lots} lot(s) × ${lotSize} units`}
              col="#d97706"
            />
            <StatCard
              label="Max Loss"
              val={fmtINR(totalCost)}
              sub="If price stays exactly at strike"
              col="var(--red)"
            />
            <StatCard
              label="Max Profit"
              val="Unlimited"
              sub="Price must move significantly in either direction"
              col="var(--green)"
            />
          </div>
          <PLSimulator
            pnlFn={(spot) => Math.abs(spot - strike) - netPremium}
            qty={lots * lotSize}
            breakevens={[lowerBreakeven, upperBreakeven]}
            legFns={[
              (spot) => Math.max(0, strike - spot) - putPremium,
              (spot) => Math.max(0, spot - strike) - callPremium,
            ]}
            legLabels={["Long Put", "Long Call"]}
          />
        </>
      )}
    </div>
  );
}

// ─── Bull Call Spread ─────────────────────────────────────────────
function BullSpreadCalc() {
  const [form, setForm] = useState({
    lowerStrike: "",
    lowerPremium: "",
    upperStrike: "",
    upperPremium: "",
    lots: "1",
    lotSize: "1",
  });
  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const lowerStrike = parseFloat(form.lowerStrike);
  const lowerPremium = parseFloat(form.lowerPremium);
  const upperStrike = parseFloat(form.upperStrike);
  const upperPremium = parseFloat(form.upperPremium);
  const lots = parseFloat(form.lots) || 1;
  const lotSize = parseFloat(form.lotSize) || 1;

  const strikesEntered = lowerStrike > 0 && upperStrike > 0;
  const premiumsEntered = lowerPremium > 0 && upperPremium > 0;
  const invalidStrikes = strikesEntered && upperStrike <= lowerStrike;
  const invalidPremiums =
    premiumsEntered && !invalidStrikes && lowerPremium <= upperPremium;
  const valid =
    lowerStrike > 0 &&
    lowerPremium > 0 &&
    upperStrike > 0 &&
    upperPremium > 0 &&
    upperStrike > lowerStrike &&
    lowerPremium > upperPremium;

  const netDebit = valid ? lowerPremium - upperPremium : null;
  const spreadWidth = valid ? upperStrike - lowerStrike : null;
  const maxProfit = valid ? (spreadWidth - netDebit) * lots * lotSize : null;
  const maxLoss = valid ? netDebit * lots * lotSize : null;
  const breakeven = valid ? lowerStrike + netDebit : null;

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={CARD}>
        <p style={SEC_TITLE}>Bull Call Spread Inputs</p>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-3)",
            marginTop: -12,
            marginBottom: 16,
          }}
        >
          Buy lower-strike call · Sell higher-strike call
        </p>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          <Field
            label="Lower Strike — Buy (₹)"
            k="lowerStrike"
            placeholder="490"
            hint="Call you're buying (lower)"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Lower Strike Premium (₹)"
            k="lowerPremium"
            placeholder="25"
            hint="Premium paid (debit)"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Upper Strike — Sell (₹)"
            k="upperStrike"
            placeholder="510"
            hint="Call you're selling (higher)"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Upper Strike Premium (₹)"
            k="upperPremium"
            placeholder="10"
            hint="Premium received (credit)"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Number of Lots"
            k="lots"
            placeholder="1"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Lot Size"
            k="lotSize"
            placeholder="50"
            form={form}
            onChange={onChange}
          />
        </div>
        {invalidStrikes && (
          <div style={ERROR_BOX}>
            ✗ Upper strike must be higher than lower strike.
          </div>
        )}
        {invalidPremiums && (
          <div style={ERROR_BOX}>
            ✗ Lower strike premium must exceed upper strike premium (you buy the
            lower, sell the higher).
          </div>
        )}
      </div>

      {valid && (
        <>
          <div
            style={{
              background: "var(--green-light)",
              border: "1px solid rgba(45,122,95,0.2)",
              borderRadius: 12,
              padding: 24,
              marginBottom: 16,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--green)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 6,
              }}
            >
              Breakeven Price
            </p>
            <p
              style={{
                fontSize: 52,
                fontWeight: 800,
                color: "var(--green)",
                margin: "0 0 4px",
                fontFamily: "JetBrains Mono, monospace",
                lineHeight: 1,
              }}
            >
              {fmtINR(breakeven)}
            </p>
            <p
              style={{ fontSize: 13, color: "rgba(45,122,95,0.7)", margin: 0 }}
            >
              Lower Strike + Net Debit · Profit above this level
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <StatCard
              label="Net Debit"
              val={fmtINR(netDebit)}
              sub="Per unit cost of the spread"
              col="#d97706"
            />
            <StatCard
              label="Spread Width"
              val={fmtINR(spreadWidth)}
              sub="Upper − Lower strike"
            />
            <StatCard
              label="Max Profit"
              val={fmtINR(maxProfit)}
              sub={`If price ≥ ${fmtINR(upperStrike)} at expiry`}
              col="var(--green)"
            />
            <StatCard
              label="Max Loss"
              val={fmtINR(maxLoss)}
              sub={`If price ≤ ${fmtINR(lowerStrike)} at expiry`}
              col="var(--red)"
            />
          </div>

          <div style={CARD}>
            <p style={{ fontSize: 11, color: "var(--text-3)", margin: 0 }}>
              Reward / Risk: {fmt2(maxProfit / maxLoss)}× · Profit zone:{" "}
              {fmtINR(breakeven)} – {fmtINR(upperStrike)}
            </p>
          </div>
          <PLSimulator
            pnlFn={(spot) =>
              Math.min(Math.max(0, spot - lowerStrike), spreadWidth) - netDebit
            }
            qty={lots * lotSize}
            breakevens={[breakeven]}
            legFns={[
              (spot) => Math.max(0, spot - lowerStrike) - lowerPremium,
              (spot) => upperPremium - Math.max(0, spot - upperStrike),
            ]}
            legLabels={[
              "Long Call (buy lower strike)",
              "Short Call (sell upper strike)",
            ]}
          />
        </>
      )}
    </div>
  );
}

// ─── Bear Put Spread ──────────────────────────────────────────────
function BearSpreadCalc() {
  const [form, setForm] = useState({
    higherStrike: "",
    higherPremium: "",
    lowerStrike: "",
    lowerPremium: "",
    lots: "1",
    lotSize: "1",
  });
  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const higherStrike = parseFloat(form.higherStrike);
  const higherPremium = parseFloat(form.higherPremium);
  const lowerStrike = parseFloat(form.lowerStrike);
  const lowerPremium = parseFloat(form.lowerPremium);
  const lots = parseFloat(form.lots) || 1;
  const lotSize = parseFloat(form.lotSize) || 1;

  const strikesEntered = higherStrike > 0 && lowerStrike > 0;
  const premiumsEntered = higherPremium > 0 && lowerPremium > 0;
  const invalidStrikes = strikesEntered && higherStrike <= lowerStrike;
  const invalidPremiums =
    premiumsEntered && !invalidStrikes && higherPremium <= lowerPremium;
  const valid =
    higherStrike > 0 &&
    higherPremium > 0 &&
    lowerStrike > 0 &&
    lowerPremium > 0 &&
    higherStrike > lowerStrike &&
    higherPremium > lowerPremium;

  const netDebit = valid ? higherPremium - lowerPremium : null;
  const spreadWidth = valid ? higherStrike - lowerStrike : null;
  const maxProfit = valid ? (spreadWidth - netDebit) * lots * lotSize : null;
  const maxLoss = valid ? netDebit * lots * lotSize : null;
  const breakeven = valid ? higherStrike - netDebit : null;

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={CARD}>
        <p style={SEC_TITLE}>Bear Put Spread Inputs</p>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-3)",
            marginTop: -12,
            marginBottom: 16,
          }}
        >
          Buy higher-strike put · Sell lower-strike put
        </p>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          <Field
            label="Higher Strike — Buy (₹)"
            k="higherStrike"
            placeholder="510"
            hint="Put you're buying (higher)"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Higher Strike Premium (₹)"
            k="higherPremium"
            placeholder="25"
            hint="Premium paid (debit)"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Lower Strike — Sell (₹)"
            k="lowerStrike"
            placeholder="490"
            hint="Put you're selling (lower)"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Lower Strike Premium (₹)"
            k="lowerPremium"
            placeholder="10"
            hint="Premium received (credit)"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Number of Lots"
            k="lots"
            placeholder="1"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Lot Size"
            k="lotSize"
            placeholder="50"
            form={form}
            onChange={onChange}
          />
        </div>
        {invalidStrikes && (
          <div style={ERROR_BOX}>
            ✗ Higher strike must be greater than lower strike.
          </div>
        )}
        {invalidPremiums && (
          <div style={ERROR_BOX}>
            ✗ Higher strike premium must exceed lower strike premium (you buy
            the higher, sell the lower).
          </div>
        )}
      </div>

      {valid && (
        <>
          <div
            style={{
              background: "rgba(220,38,38,0.07)",
              border: "1px solid rgba(220,38,38,0.2)",
              borderRadius: 12,
              padding: 24,
              marginBottom: 16,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--red)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 6,
              }}
            >
              Breakeven Price
            </p>
            <p
              style={{
                fontSize: 52,
                fontWeight: 800,
                color: "var(--red)",
                margin: "0 0 4px",
                fontFamily: "JetBrains Mono, monospace",
                lineHeight: 1,
              }}
            >
              {fmtINR(breakeven)}
            </p>
            <p
              style={{ fontSize: 13, color: "rgba(220,38,38,0.7)", margin: 0 }}
            >
              Higher Strike − Net Debit · Profit below this level
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <StatCard
              label="Net Debit"
              val={fmtINR(netDebit)}
              sub="Per unit cost of the spread"
              col="#d97706"
            />
            <StatCard
              label="Spread Width"
              val={fmtINR(spreadWidth)}
              sub="Higher − Lower strike"
            />
            <StatCard
              label="Max Profit"
              val={fmtINR(maxProfit)}
              sub={`If price ≤ ${fmtINR(lowerStrike)} at expiry`}
              col="var(--green)"
            />
            <StatCard
              label="Max Loss"
              val={fmtINR(maxLoss)}
              sub={`If price ≥ ${fmtINR(higherStrike)} at expiry`}
              col="var(--red)"
            />
          </div>

          <div style={CARD}>
            <p style={{ fontSize: 11, color: "var(--text-3)", margin: 0 }}>
              Reward / Risk: {fmt2(maxProfit / maxLoss)}× · Profit zone:{" "}
              {fmtINR(lowerStrike)} – {fmtINR(breakeven)}
            </p>
          </div>
          <PLSimulator
            pnlFn={(spot) =>
              Math.min(Math.max(0, higherStrike - spot), spreadWidth) - netDebit
            }
            qty={lots * lotSize}
            breakevens={[breakeven]}
            legFns={[
              (spot) => Math.max(0, higherStrike - spot) - higherPremium,
              (spot) => lowerPremium - Math.max(0, lowerStrike - spot),
            ]}
            legLabels={[
              "Long Put (buy higher strike)",
              "Short Put (sell lower strike)",
            ]}
          />
        </>
      )}
    </div>
  );
}

// ─── Short Call ───────────────────────────────────────────────────
function ShortCallCalc() {
  const [form, setForm] = useState({
    strike: "",
    premium: "",
    lots: "1",
    lotSize: "1",
  });
  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const strike = parseFloat(form.strike);
  const premium = parseFloat(form.premium);
  const lots = parseFloat(form.lots) || 1;
  const lotSize = parseFloat(form.lotSize) || 1;
  const valid = strike > 0 && premium > 0;

  const breakeven = valid ? strike + premium : null;
  const totalCredit = valid ? premium * lots * lotSize : null;

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={CARD}>
        <p style={SEC_TITLE}>Short Call Inputs</p>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          <Field
            label="Strike Price (₹)"
            k="strike"
            placeholder="500"
            hint="Call option strike price you are selling"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Premium Received (₹)"
            k="premium"
            placeholder="20"
            hint="Credit received per share / unit"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Number of Lots"
            k="lots"
            placeholder="1"
            hint="Number of contracts sold"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Lot Size"
            k="lotSize"
            placeholder="50"
            hint="Units per lot"
            form={form}
            onChange={onChange}
          />
        </div>
      </div>

      {valid && (
        <>
          <div
            style={{
              background: "rgba(220,38,38,0.07)",
              border: "1px solid rgba(220,38,38,0.2)",
              borderRadius: 12,
              padding: 24,
              marginBottom: 16,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--red)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 6,
              }}
            >
              Breakeven Price
            </p>
            <p
              style={{
                fontSize: 52,
                fontWeight: 800,
                color: "var(--red)",
                margin: "0 0 4px",
                fontFamily: "JetBrains Mono, monospace",
                lineHeight: 1,
              }}
            >
              {fmtINR(breakeven)}
            </p>
            <p
              style={{ fontSize: 13, color: "rgba(220,38,38,0.7)", margin: 0 }}
            >
              Stock must stay at or below {fmtINR(breakeven)} to keep full
              premium
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <StatCard
              label="Premium Received"
              val={fmtINR(premium)}
              sub="Per unit / share"
              col="var(--green)"
            />
            <StatCard
              label="Total Credit"
              val={fmtINR(totalCredit)}
              sub={`${lots} lot(s) × ${lotSize} units`}
              col="var(--green)"
            />
            <StatCard
              label="Max Profit"
              val={fmtINR(totalCredit)}
              sub="If stock closes ≤ strike at expiry"
              col="var(--green)"
            />
            <StatCard
              label="Max Loss"
              val="Unlimited"
              sub="Stock rises above breakeven: no cap"
              col="var(--red)"
            />
          </div>

          <div style={CARD}>
            <p style={{ fontSize: 11, color: "var(--text-3)", margin: 0 }}>
              Profit zone: stock ≤ {fmtINR(breakeven)} at expiry · Loss grows
              with every rupee above breakeven
            </p>
          </div>
          <PLSimulator
            pnlFn={(spot) => premium - Math.max(0, spot - strike)}
            qty={lots * lotSize}
            breakevens={[breakeven]}
            isShort
            legFns={[(spot) => premium - Math.max(0, spot - strike)]}
            legLabels={["Short Call"]}
          />
        </>
      )}
    </div>
  );
}

// ─── Short Put ────────────────────────────────────────────────────
function ShortPutCalc() {
  const [form, setForm] = useState({
    strike: "",
    premium: "",
    lots: "1",
    lotSize: "1",
  });
  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const strike = parseFloat(form.strike);
  const premium = parseFloat(form.premium);
  const lots = parseFloat(form.lots) || 1;
  const lotSize = parseFloat(form.lotSize) || 1;
  const valid = strike > 0 && premium > 0;

  const breakeven = valid ? strike - premium : null;
  const totalCredit = valid ? premium * lots * lotSize : null;
  const maxLoss = valid ? breakeven * lots * lotSize : null; // if stock goes to 0

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={CARD}>
        <p style={SEC_TITLE}>Short Put Inputs</p>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          <Field
            label="Strike Price (₹)"
            k="strike"
            placeholder="500"
            hint="Put option strike price you are selling"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Premium Received (₹)"
            k="premium"
            placeholder="20"
            hint="Credit received per share / unit"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Number of Lots"
            k="lots"
            placeholder="1"
            hint="Number of contracts sold"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Lot Size"
            k="lotSize"
            placeholder="50"
            hint="Units per lot"
            form={form}
            onChange={onChange}
          />
        </div>
      </div>

      {valid && (
        <>
          <div
            style={{
              background: "var(--green-light)",
              border: "1px solid rgba(45,122,95,0.2)",
              borderRadius: 12,
              padding: 24,
              marginBottom: 16,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--green)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 6,
              }}
            >
              Breakeven Price
            </p>
            <p
              style={{
                fontSize: 52,
                fontWeight: 800,
                color: "var(--green)",
                margin: "0 0 4px",
                fontFamily: "JetBrains Mono, monospace",
                lineHeight: 1,
              }}
            >
              {fmtINR(breakeven)}
            </p>
            <p
              style={{ fontSize: 13, color: "rgba(45,122,95,0.7)", margin: 0 }}
            >
              Stock must stay at or above {fmtINR(breakeven)} to keep full
              premium
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <StatCard
              label="Premium Received"
              val={fmtINR(premium)}
              sub="Per unit / share"
              col="var(--green)"
            />
            <StatCard
              label="Total Credit"
              val={fmtINR(totalCredit)}
              sub={`${lots} lot(s) × ${lotSize} units`}
              col="var(--green)"
            />
            <StatCard
              label="Max Profit"
              val={fmtINR(totalCredit)}
              sub="If stock closes ≥ strike at expiry"
              col="var(--green)"
            />
            <StatCard
              label="Max Loss"
              val={fmtINR(maxLoss)}
              sub={`If stock falls to ₹0 — Strike − Premium × Qty`}
              col="var(--red)"
            />
          </div>

          <div style={CARD}>
            <p style={{ fontSize: 11, color: "var(--text-3)", margin: 0 }}>
              Profit zone: stock ≥ {fmtINR(breakeven)} at expiry · Loss grows as
              stock falls below breakeven
            </p>
          </div>
          <PLSimulator
            pnlFn={(spot) => premium - Math.max(0, strike - spot)}
            qty={lots * lotSize}
            breakevens={[breakeven]}
            isShort
            legFns={[(spot) => premium - Math.max(0, strike - spot)]}
            legLabels={["Short Put"]}
          />
        </>
      )}
    </div>
  );
}

// ─── Short Strangle ───────────────────────────────────────────────
function ShortStrangleCalc() {
  const [form, setForm] = useState({
    callStrike: "",
    callPremium: "",
    putStrike: "",
    putPremium: "",
    lots: "1",
    lotSize: "1",
  });
  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const callStrike = parseFloat(form.callStrike);
  const callPremium = parseFloat(form.callPremium);
  const putStrike = parseFloat(form.putStrike);
  const putPremium = parseFloat(form.putPremium);
  const lots = parseFloat(form.lots) || 1;
  const lotSize = parseFloat(form.lotSize) || 1;

  const strikesEntered = callStrike > 0 && putStrike > 0;
  const invalidStrikes = strikesEntered && callStrike <= putStrike;
  const valid =
    callStrike > 0 &&
    callPremium > 0 &&
    putStrike > 0 &&
    putPremium > 0 &&
    callStrike > putStrike;

  const netCredit = valid ? callPremium + putPremium : null;
  const upperBreakeven = valid ? callStrike + netCredit : null;
  const lowerBreakeven = valid ? putStrike - netCredit : null;
  const totalCredit = valid ? netCredit * lots * lotSize : null;

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={CARD}>
        <p style={SEC_TITLE}>Short Strangle Inputs</p>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-3)",
            marginTop: -12,
            marginBottom: 16,
          }}
        >
          Sell OTM Call + Sell OTM Put (different strikes) — collect premium
        </p>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          <Field
            label="Call Strike (₹) — Sell"
            k="callStrike"
            placeholder="520"
            hint="OTM call strike (higher)"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Call Premium Received (₹)"
            k="callPremium"
            placeholder="10"
            hint="Credit for selling call"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Put Strike (₹) — Sell"
            k="putStrike"
            placeholder="480"
            hint="OTM put strike (lower)"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Put Premium Received (₹)"
            k="putPremium"
            placeholder="10"
            hint="Credit for selling put"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Number of Lots"
            k="lots"
            placeholder="1"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Lot Size"
            k="lotSize"
            placeholder="50"
            form={form}
            onChange={onChange}
          />
        </div>
        {invalidStrikes && (
          <div style={ERROR_BOX}>
            ✗ Call strike must be higher than put strike for a short strangle.
          </div>
        )}
      </div>

      {valid && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                background: "rgba(220,38,38,0.07)",
                border: "1px solid rgba(220,38,38,0.2)",
                borderRadius: 12,
                padding: 20,
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--red)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 6,
                }}
              >
                Upper Breakeven
              </p>
              <p
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: "var(--red)",
                  margin: "0 0 4px",
                  fontFamily: "JetBrains Mono, monospace",
                  lineHeight: 1,
                }}
              >
                {fmtINR(upperBreakeven)}
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "rgba(220,38,38,0.7)",
                  margin: 0,
                }}
              >
                Call strike + net credit
              </p>
            </div>
            <div
              style={{
                background: "rgba(220,38,38,0.07)",
                border: "1px solid rgba(220,38,38,0.2)",
                borderRadius: 12,
                padding: 20,
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--red)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 6,
                }}
              >
                Lower Breakeven
              </p>
              <p
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: "var(--red)",
                  margin: "0 0 4px",
                  fontFamily: "JetBrains Mono, monospace",
                  lineHeight: 1,
                }}
              >
                {fmtINR(lowerBreakeven)}
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "rgba(220,38,38,0.7)",
                  margin: 0,
                }}
              >
                Put strike − net credit
              </p>
            </div>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <StatCard
              label="Net Credit Received"
              val={fmtINR(netCredit)}
              sub="Call + Put premium per unit"
              col="var(--green)"
            />
            <StatCard
              label="Total Credit"
              val={fmtINR(totalCredit)}
              sub={`${lots} lot(s) × ${lotSize} units`}
              col="var(--green)"
            />
            <StatCard
              label="Max Profit"
              val={fmtINR(totalCredit)}
              sub={`Price stays between ${fmtINR(putStrike)} – ${fmtINR(callStrike)}`}
              col="var(--green)"
            />
            <StatCard
              label="Max Loss"
              val="Unlimited"
              sub="Price breaks out beyond either breakeven"
              col="var(--red)"
            />
          </div>
          <PLSimulator
            pnlFn={(spot) =>
              netCredit -
              Math.max(0, spot - callStrike) -
              Math.max(0, putStrike - spot)
            }
            qty={lots * lotSize}
            breakevens={[lowerBreakeven, upperBreakeven]}
            isShort
            legFns={[
              (spot) => putPremium - Math.max(0, putStrike - spot),
              (spot) => callPremium - Math.max(0, spot - callStrike),
            ]}
            legLabels={["Short Put", "Short Call"]}
          />
        </>
      )}
    </div>
  );
}

// ─── Short Straddle ───────────────────────────────────────────────
function ShortStraddleCalc() {
  const [form, setForm] = useState({
    strike: "",
    callPremium: "",
    putPremium: "",
    lots: "1",
    lotSize: "1",
  });
  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const strike = parseFloat(form.strike);
  const callPremium = parseFloat(form.callPremium);
  const putPremium = parseFloat(form.putPremium);
  const lots = parseFloat(form.lots) || 1;
  const lotSize = parseFloat(form.lotSize) || 1;
  const valid = strike > 0 && callPremium > 0 && putPremium > 0;

  const netCredit = valid ? callPremium + putPremium : null;
  const upperBreakeven = valid ? strike + netCredit : null;
  const lowerBreakeven = valid ? strike - netCredit : null;
  const totalCredit = valid ? netCredit * lots * lotSize : null;

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={CARD}>
        <p style={SEC_TITLE}>Short Straddle Inputs</p>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-3)",
            marginTop: -12,
            marginBottom: 16,
          }}
        >
          Sell ATM Call + Sell ATM Put (same strike) — collect premium
        </p>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          <Field
            label="Strike Price (₹)"
            k="strike"
            placeholder="500"
            hint="ATM strike (same for both)"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Call Premium Received (₹)"
            k="callPremium"
            placeholder="15"
            hint="Credit for selling ATM call"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Put Premium Received (₹)"
            k="putPremium"
            placeholder="15"
            hint="Credit for selling ATM put"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Number of Lots"
            k="lots"
            placeholder="1"
            form={form}
            onChange={onChange}
          />
          <Field
            label="Lot Size"
            k="lotSize"
            placeholder="50"
            form={form}
            onChange={onChange}
          />
        </div>
      </div>

      {valid && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                background: "rgba(220,38,38,0.07)",
                border: "1px solid rgba(220,38,38,0.2)",
                borderRadius: 12,
                padding: 20,
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--red)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 6,
                }}
              >
                Upper Breakeven
              </p>
              <p
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: "var(--red)",
                  margin: "0 0 4px",
                  fontFamily: "JetBrains Mono, monospace",
                  lineHeight: 1,
                }}
              >
                {fmtINR(upperBreakeven)}
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "rgba(220,38,38,0.7)",
                  margin: 0,
                }}
              >
                Strike + net credit
              </p>
            </div>
            <div
              style={{
                background: "rgba(220,38,38,0.07)",
                border: "1px solid rgba(220,38,38,0.2)",
                borderRadius: 12,
                padding: 20,
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--red)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 6,
                }}
              >
                Lower Breakeven
              </p>
              <p
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: "var(--red)",
                  margin: "0 0 4px",
                  fontFamily: "JetBrains Mono, monospace",
                  lineHeight: 1,
                }}
              >
                {fmtINR(lowerBreakeven)}
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "rgba(220,38,38,0.7)",
                  margin: 0,
                }}
              >
                Strike − net credit
              </p>
            </div>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <StatCard
              label="Net Credit Received"
              val={fmtINR(netCredit)}
              sub="Call + Put premium per unit"
              col="var(--green)"
            />
            <StatCard
              label="Total Credit"
              val={fmtINR(totalCredit)}
              sub={`${lots} lot(s) × ${lotSize} units`}
              col="var(--green)"
            />
            <StatCard
              label="Max Profit"
              val={fmtINR(totalCredit)}
              sub="If price pins exactly at strike at expiry"
              col="var(--green)"
            />
            <StatCard
              label="Max Loss"
              val="Unlimited"
              sub="Any significant move in either direction"
              col="var(--red)"
            />
          </div>
          <PLSimulator
            pnlFn={(spot) => netCredit - Math.abs(spot - strike)}
            qty={lots * lotSize}
            breakevens={[lowerBreakeven, upperBreakeven]}
            isShort
            legFns={[
              (spot) => putPremium - Math.max(0, strike - spot),
              (spot) => callPremium - Math.max(0, spot - strike),
            ]}
            legLabels={["Short Put", "Short Call"]}
          />
        </>
      )}
    </div>
  );
}

// ─── Straddle vs Strangle Comparator ────────────────────────────
function StraddleStrangleComparator() {
  const [type, setType] = useState("long");
  const [lots, setLots] = useState("1");
  const [lotSize, setLotSize] = useState("1");

  // Straddle fields
  const [sad, setSad] = useState({ strike: "", callP: "", putP: "" });
  const onSad = (k, v) => setSad((p) => ({ ...p, [k]: v }));

  // Strangle fields
  const [sng, setSng] = useState({
    callStrike: "",
    callP: "",
    putStrike: "",
    putP: "",
  });
  const onSng = (k, v) => setSng((p) => ({ ...p, [k]: v }));

  const qty = (parseFloat(lots) || 1) * (parseFloat(lotSize) || 1);

  // ── Straddle maths ──
  const sadStrike = parseFloat(sad.strike);
  const sadCallP = parseFloat(sad.callP);
  const sadPutP = parseFloat(sad.putP);
  const sadValid = sadStrike > 0 && sadCallP > 0 && sadPutP > 0;
  const sadNet = sadValid ? sadCallP + sadPutP : null;
  const sadUpperBE = sadValid ? sadStrike + sadNet : null;
  const sadLowerBE = sadValid ? sadStrike - sadNet : null;
  const sadBERange = sadValid ? 2 * sadNet : null;
  const sadTotal = sadValid ? sadNet * qty : null;

  // ── Strangle maths ──
  const sngCallStrike = parseFloat(sng.callStrike);
  const sngCallP = parseFloat(sng.callP);
  const sngPutStrike = parseFloat(sng.putStrike);
  const sngPutP = parseFloat(sng.putP);
  const invalidStrikes =
    sngCallStrike > 0 && sngPutStrike > 0 && sngCallStrike <= sngPutStrike;
  const sngValid =
    sngCallStrike > 0 &&
    sngCallP > 0 &&
    sngPutStrike > 0 &&
    sngPutP > 0 &&
    sngCallStrike > sngPutStrike;
  const sngNet = sngValid ? sngCallP + sngPutP : null;
  const sngUpperBE = sngValid ? sngCallStrike + sngNet : null;
  const sngLowerBE = sngValid ? sngPutStrike - sngNet : null;
  const sngBERange = sngValid ? sngUpperBE - sngLowerBE : null;
  const sngTotal = sngValid ? sngNet * qty : null;

  const bothValid = sadValid && sngValid;

  // ── Recommendation ──
  let recommendation = null;
  if (bothValid) {
    if (type === "long") {
      const sadCheaper = sadNet <= sngNet;
      recommendation = sadCheaper
        ? {
            winner: "straddle",
            text: `Straddle costs ₹${fmt2(sadNet)}/unit vs ₹${fmt2(sngNet)}/unit for the strangle — lower upfront cost and a tighter breakeven range (${fmt2(sadBERange)} pts). Pick this if you expect a sharp decisive move near the current price.`,
          }
        : {
            winner: "strangle",
            text: `Strangle costs ₹${fmt2(sngNet)}/unit vs ₹${fmt2(sadNet)}/unit for the straddle — cheaper premium and the price has more room to move before either breakeven (${fmt2(sngBERange)} pts). Pick this if you expect a large explosive move with some uncertainty on direction.`,
          };
    } else {
      const sadHigherCredit = sadNet >= sngNet;
      recommendation = sadHigherCredit
        ? {
            winner: "straddle",
            text: `Short Straddle earns more premium (₹${fmt2(sadNet)}/unit vs ₹${fmt2(sngNet)}/unit) but has a narrow safe zone — price must stay very close to ${fmtINR(sadStrike)}. Higher reward, higher risk.`,
          }
        : {
            winner: "strangle",
            text: `Short Strangle earns less premium (₹${fmt2(sngNet)}/unit) but gives a wider safe zone of ${fmt2(sngBERange)} pts between ${fmtINR(sngLowerBE)} – ${fmtINR(sngUpperBE)}. Lower reward, more breathing room.`,
          };
    }
  }

  const inputCard = (title, children) => (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 24,
      }}
    >
      <p style={SEC_TITLE}>{title}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {children}
      </div>
    </div>
  );

  const CompareCol = ({
    label,
    valid,
    net,
    upperBE,
    lowerBE,
    beRange,
    total,
    isWinner,
  }) => (
    <div
      style={{
        background: isWinner ? "var(--green-light)" : "var(--surface-2)",
        border: `1px solid ${isWinner ? "rgba(45,122,95,0.25)" : "var(--border)"}`,
        borderRadius: 12,
        padding: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <p
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--text)",
            margin: 0,
          }}
        >
          {label}
        </p>
        {isWinner && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--green)",
              background: "rgba(45,122,95,0.15)",
              border: "1px solid rgba(45,122,95,0.25)",
              borderRadius: 6,
              padding: "3px 8px",
            }}
          >
            ✓ Recommended
          </span>
        )}
      </div>
      {valid ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Row
            k={type === "long" ? "Net Premium Paid" : "Net Credit Received"}
            v={fmtINR(net)}
            col={type === "long" ? "#d97706" : "var(--green)"}
          />
          <Row
            k={type === "long" ? "Total Cost" : "Total Credit"}
            v={fmtINR(total)}
            col={type === "long" ? "#d97706" : "var(--green)"}
          />
          <div
            style={{ height: 1, background: "var(--border)", margin: "4px 0" }}
          />
          <Row k="Upper Breakeven" v={fmtINR(upperBE)} />
          <Row k="Lower Breakeven" v={fmtINR(lowerBE)} />
          <Row k="Breakeven Range" v={`${fmt2(beRange)} pts`} highlight />
          <div
            style={{ height: 1, background: "var(--border)", margin: "4px 0" }}
          />
          <Row
            k={type === "long" ? "Max Loss" : "Max Profit"}
            v={fmtINR(total)}
            col={type === "long" ? "var(--red)" : "var(--green)"}
          />
          <Row
            k={type === "long" ? "Max Profit" : "Max Loss"}
            v="Unlimited"
            col={type === "long" ? "var(--green)" : "var(--red)"}
          />
        </div>
      ) : (
        <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0 }}>
          Fill in all inputs to see results
        </p>
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
            <button
              key={d}
              onClick={() => setType(d)}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 8,
                border: `1px solid ${active ? ds.border : "var(--border)"}`,
                background: active ? ds.bg : "transparent",
                color: active ? ds.text : "var(--text-2)",
                fontWeight: active ? 700 : 500,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                transition: "all 0.15s",
              }}
            >
              {d === "long" ? "↑ Long (Buy)" : "↓ Short (Sell)"}
            </button>
          );
        })}
      </div>

      {/* Common: Lots + Lot Size */}
      <div
        style={{ display: "flex", gap: 16, marginBottom: 24, maxWidth: 400 }}
      >
        <div style={{ flex: 1 }}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-2)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 6,
            }}
          >
            Lots
          </label>
          <input
            type="number"
            className="t-inp font-mono"
            value={lots}
            onChange={(e) => setLots(e.target.value)}
            placeholder="1"
          />
        </div>
        <div style={{ flex: 1 }}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-2)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 6,
            }}
          >
            Lot Size
          </label>
          <input
            type="number"
            className="t-inp font-mono"
            value={lotSize}
            onChange={(e) => setLotSize(e.target.value)}
            placeholder="50"
          />
        </div>
      </div>

      {/* Inputs side by side */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          marginBottom: 24,
        }}
      >
        {inputCard(
          type === "long"
            ? "Straddle — Buy ATM Call + ATM Put"
            : "Short Straddle — Sell ATM Call + ATM Put",
          <>
            <div style={{ gridColumn: "1 / -1" }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-2)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 6,
                }}
              >
                ATM Strike (₹)
              </label>
              <input
                type="number"
                className="t-inp font-mono"
                value={sad.strike}
                onChange={(e) => onSad("strike", e.target.value)}
                placeholder="500"
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-2)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 6,
                }}
              >
                Call Premium (₹)
              </label>
              <input
                type="number"
                className="t-inp font-mono"
                value={sad.callP}
                onChange={(e) => onSad("callP", e.target.value)}
                placeholder="15"
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-2)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 6,
                }}
              >
                Put Premium (₹)
              </label>
              <input
                type="number"
                className="t-inp font-mono"
                value={sad.putP}
                onChange={(e) => onSad("putP", e.target.value)}
                placeholder="15"
              />
            </div>
          </>,
        )}
        {inputCard(
          type === "long"
            ? "Strangle — Buy OTM Call + OTM Put"
            : "Short Strangle — Sell OTM Call + OTM Put",
          <>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-2)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 6,
                }}
              >
                Call Strike (₹)
              </label>
              <input
                type="number"
                className="t-inp font-mono"
                value={sng.callStrike}
                onChange={(e) => onSng("callStrike", e.target.value)}
                placeholder="520"
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-2)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 6,
                }}
              >
                Call Premium (₹)
              </label>
              <input
                type="number"
                className="t-inp font-mono"
                value={sng.callP}
                onChange={(e) => onSng("callP", e.target.value)}
                placeholder="8"
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-2)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 6,
                }}
              >
                Put Strike (₹)
              </label>
              <input
                type="number"
                className="t-inp font-mono"
                value={sng.putStrike}
                onChange={(e) => onSng("putStrike", e.target.value)}
                placeholder="480"
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-2)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 6,
                }}
              >
                Put Premium (₹)
              </label>
              <input
                type="number"
                className="t-inp font-mono"
                value={sng.putP}
                onChange={(e) => onSng("putP", e.target.value)}
                placeholder="8"
              />
            </div>
            {invalidStrikes && (
              <div style={{ ...ERROR_BOX, gridColumn: "1 / -1" }}>
                ✗ Call strike must be higher than put strike.
              </div>
            )}
          </>,
        )}
      </div>

      {/* Results comparison */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          marginBottom: 24,
        }}
      >
        <CompareCol
          label={type === "long" ? "Long Straddle" : "Short Straddle"}
          valid={sadValid}
          net={sadNet}
          upperBE={sadUpperBE}
          lowerBE={sadLowerBE}
          beRange={sadBERange}
          total={sadTotal}
          isWinner={bothValid && recommendation?.winner === "straddle"}
        />
        <CompareCol
          label={type === "long" ? "Long Strangle" : "Short Strangle"}
          valid={sngValid}
          net={sngNet}
          upperBE={sngUpperBE}
          lowerBE={sngLowerBE}
          beRange={sngBERange}
          total={sngTotal}
          isWinner={bothValid && recommendation?.winner === "strangle"}
        />
      </div>

      {/* Recommendation */}
      {recommendation && (
        <div
          style={{
            background: "var(--green-light)",
            border: "1px solid rgba(45,122,95,0.25)",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--green)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 8,
            }}
          >
            Recommendation
          </p>
          <p
            style={{
              fontSize: 14,
              color: "var(--text)",
              margin: 0,
              lineHeight: 1.65,
            }}
          >
            <strong style={{ color: "var(--green)" }}>
              {recommendation.winner === "straddle"
                ? type === "long"
                  ? "Long Straddle"
                  : "Short Straddle"
                : type === "long"
                  ? "Long Strangle"
                  : "Short Strangle"}
            </strong>
            {" — "}
            {recommendation.text}
          </p>
        </div>
      )}
    </div>
  );
}

function Row({ k, v, col, highlight }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span style={{ fontSize: 12, color: "var(--text-2)" }}>{k}</span>
      <span
        style={{
          fontSize: 13,
          fontWeight: highlight ? 700 : 600,
          color: col ?? (highlight ? "var(--text)" : "var(--text)"),
          fontFamily: "JetBrains Mono, monospace",
        }}
      >
        {v}
      </span>
    </div>
  );
}

// ─── Calculator registry ──────────────────────────────────────────
const CALCULATORS = [
  { id: "position", label: "Position Size", component: PositionSizeCalc },
  { id: "call-breakeven", label: "Long Call", component: CallBreakEvenCalc },
  { id: "put-breakeven", label: "Long Put", component: PutBreakEvenCalc },
  { id: "short-call", label: "Short Call", component: ShortCallCalc },
  { id: "short-put", label: "Short Put", component: ShortPutCalc },
  { id: "strangle", label: "Long Strangle", component: StrangleCalc },
  { id: "straddle", label: "Long Straddle", component: StraddleCalc },
  {
    id: "short-strangle",
    label: "Short Strangle",
    component: ShortStrangleCalc,
  },
  {
    id: "short-straddle",
    label: "Short Straddle",
    component: ShortStraddleCalc,
  },
  {
    id: "compare",
    label: "⇄ Straddle vs Strangle",
    component: StraddleStrangleComparator,
    isComparator: true,
  },
  { id: "bull-spread", label: "Bull Spread", component: BullSpreadCalc },
  { id: "bear-spread", label: "Bear Spread", component: BearSpreadCalc },
];

// ─── Per-calculator metadata ──────────────────────────────────────
const CALC_META = {
  position: {
    direction: "selectable",
    outlook: null,
    whenToUse:
      "You have a trade in mind and want to know exactly how many shares/units to buy or short without risking too much of your portfolio on a single position.",
    risk: "Defined — capped at the rupee amount you specify as portfolio heat (e.g. 1% of capital).",
    reward:
      "Depends on your target. Position sizing only controls risk; the reward is determined by your exit target.",
    summary:
      "Calculates the optimal number of shares to trade based on your risk tolerance and account size. Keeps each trade loss within a defined % of your portfolio.",
    howItWorks:
      "Given your total portfolio, the capital allocated to this trade, and your % risk limit, it finds the maximum shares you can enter while capping the rupee loss at your stop-loss price.",
    formula: "Shares = min(MaxRisk ÷ |Entry − SL|,  Capital ÷ Entry)",
    fields: [
      {
        name: "Total Portfolio Capital",
        desc: "Your entire account value — used to calculate the absolute rupee risk cap.",
      },
      {
        name: "Capital for This Trade",
        desc: "Max money you are willing to deploy in this single trade.",
      },
      {
        name: "Risk Per Trade %",
        desc: "The % of your total portfolio you can tolerate losing if stop-loss is hit. Typically 0.5–2%.",
      },
      {
        name: "Entry Price",
        desc: "The price at which you plan to enter the position.",
      },
      {
        name: "Stop Loss Price",
        desc: "Your hard exit price if the trade moves against you. Below entry for Long, above entry for Short.",
      },
    ],
  },
  "call-breakeven": {
    direction: "long",
    outlook: "Bullish",
    whenToUse:
      "You are very bullish on a stock/index and expect a significant upward move before expiry.",
    risk: "Limited — max loss is the premium paid (Premium × Lot Size).",
    reward:
      "Unlimited — profit potential grows as the price rises above the breakeven.",
    summary:
      "Buy 1 CE (Call option). You pay a premium upfront for the right to buy the underlying at the strike price. Profit if the underlying closes above Strike + Premium at expiry. Max loss is limited to the premium paid; max profit is unlimited.",
    howItWorks:
      "Buying a call costs a premium upfront — that premium is your max loss. To break even, the stock must rise enough to cover that cost by expiry.",
    formula: "Breakeven = Strike Price + Premium Paid",
    fields: [
      {
        name: "Strike Price",
        desc: "The price at which you have the right to buy the underlying stock.",
      },
      {
        name: "Premium Paid",
        desc: "Cost per share/unit to buy the call. This is your maximum loss per unit.",
      },
      { name: "No. of Lots", desc: "Number of contracts you are buying." },
      {
        name: "Lot Size",
        desc: "Units per contract (e.g. 50 for Nifty, 25 for Bank Nifty).",
      },
    ],
  },
  "put-breakeven": {
    direction: "short",
    outlook: "Bearish",
    whenToUse:
      "You are very bearish on a stock/index and expect a significant downward move before expiry.",
    risk: "Limited — max loss is the premium paid (Premium × Lot Size).",
    reward:
      "High — profit grows as price falls sharply below the breakeven (toward zero).",
    summary:
      "Buy 1 PE (Put option). You pay a premium upfront for the right to sell the underlying at the strike price. Profit if the underlying closes below Strike − Premium at expiry. Max loss is limited to the premium paid; max profit grows as the stock falls toward zero.",
    howItWorks:
      "Buying a put lets you profit from a falling stock. The premium paid is your max risk. The stock must fall below the breakeven price for you to net a profit.",
    formula: "Breakeven = Strike Price − Premium Paid",
    fields: [
      {
        name: "Strike Price",
        desc: "The price at which you have the right to sell the underlying stock.",
      },
      {
        name: "Premium Paid",
        desc: "Cost per share/unit to buy the put. This is your maximum loss per unit.",
      },
      { name: "No. of Lots", desc: "Number of contracts you are buying." },
      { name: "Lot Size", desc: "Units per contract." },
    ],
  },
  "short-call": {
    direction: "short",
    outlook: "Bearish / Neutral",
    whenToUse:
      "You are bearish or neutral on the stock/index and expect the price to stay flat or fall before expiry.",
    risk: "Unlimited — loss accelerates if the price rises sharply above the breakeven.",
    reward: "Limited — capped at the premium received (Premium × Lot Size).",
    summary:
      "Sell 1 CE (Call option) and collect the premium upfront. Profit as long as the underlying stays at or below the strike at expiry. Max profit is capped at the premium received; max loss is unlimited if the stock rallies above the breakeven.",
    howItWorks:
      "As the seller, you keep the premium as long as the stock closes at or below the strike at expiry. Every rupee the stock rises above the breakeven erodes your profit and eventually turns into a loss.",
    formula:
      "Breakeven = Strike Price + Premium Received\nMax Profit = Premium Received × Qty\nMax Loss   = Unlimited",
    fields: [
      {
        name: "Strike Price",
        desc: "The call strike you are selling. You profit if the stock stays below this.",
      },
      {
        name: "Premium Received",
        desc: "Credit collected per share/unit. This is your maximum possible profit per unit.",
      },
      { name: "No. of Lots", desc: "Number of contracts sold." },
      { name: "Lot Size", desc: "Units per contract." },
    ],
  },
  "short-put": {
    direction: "long",
    outlook: "Bullish / Neutral",
    whenToUse:
      "You are bullish or neutral on the stock/index and expect the price to stay flat or rise before expiry.",
    risk: "Unlimited (in practice large) — loss grows if the price falls sharply below the breakeven.",
    reward: "Limited — capped at the premium received (Premium × Lot Size).",
    summary:
      "Sell 1 PE (Put option) and collect the premium upfront. Profit as long as the underlying stays at or above the strike at expiry. Max profit is capped at the premium received; max loss grows as the stock falls toward zero.",
    howItWorks:
      "As the seller, you keep the premium as long as the stock closes at or above the strike at expiry. Every rupee the stock falls below the breakeven erodes your profit and eventually turns into a loss.",
    formula:
      "Breakeven = Strike Price − Premium Received\nMax Profit = Premium Received × Qty\nMax Loss   = Breakeven × Qty (stock to ₹0)",
    fields: [
      {
        name: "Strike Price",
        desc: "The put strike you are selling. You profit if the stock stays above this.",
      },
      {
        name: "Premium Received",
        desc: "Credit collected per share/unit. This is your maximum possible profit per unit.",
      },
      { name: "No. of Lots", desc: "Number of contracts sold." },
      { name: "Lot Size", desc: "Units per contract." },
    ],
  },
  strangle: {
    direction: "neutral",
    outlook: "Neutral / High Volatility",
    whenToUse:
      "Expectation of very high volatility in the underlying stock/index — you expect a big move but are unsure of direction.",
    risk: "Limited — capped at the initial net premium paid for both legs.",
    reward:
      "Unlimited — profit grows as the price breaks out beyond either breakeven.",
    summary:
      "Buy 1 OTM CE + Buy 1 OTM PE at different strikes. Cheaper to enter than a straddle because both legs are out-of-the-money. Profit if the underlying makes a large move in either direction beyond either breakeven at expiry. Max loss is the combined premium paid if the price stays between both strikes.",
    howItWorks:
      "You pay two premiums. The stock must move far enough past either strike to recover the combined premium. Max loss occurs when price stays between both strikes at expiry.",
    formula:
      "Upper BE = Call Strike + Net Premium\nLower BE = Put Strike − Net Premium",
    fields: [
      {
        name: "Call Strike",
        desc: "OTM call strike — typically above the current market price.",
      },
      { name: "Call Premium", desc: "Premium paid to buy the OTM call." },
      {
        name: "Put Strike",
        desc: "OTM put strike — typically below the current market price.",
      },
      { name: "Put Premium", desc: "Premium paid to buy the OTM put." },
      {
        name: "Lots / Lot Size",
        desc: "Scales total cost and P&L to your full position size.",
      },
    ],
  },
  straddle: {
    direction: "neutral",
    outlook: "Neutral / High Volatility",
    whenToUse:
      "Expectation of high volatility in the underlying stock/index — you expect a meaningful move in either direction before expiry.",
    risk: "Limited — capped at the net premium paid (Call Premium + Put Premium × Lot Size).",
    reward:
      "Unlimited — profit grows as the price moves away from the strike in either direction.",
    summary:
      "Buy 1 ATM CE + Buy 1 ATM PE at the same strike. Costs more than a strangle because both legs are at-the-money, but requires a smaller move to profit. Profit from any significant move in either direction beyond the net premium. Max loss is the net premium paid if the stock pins exactly at the strike at expiry.",
    howItWorks:
      "Because both legs share the same strike, the net premium is higher than a strangle. Any move exceeding the net premium is profitable. Max loss is when price pins exactly at the strike at expiry.",
    formula: "Upper BE = Strike + Net Premium\nLower BE = Strike − Net Premium",
    fields: [
      {
        name: "Strike Price",
        desc: "The at-the-money strike used for both the call and the put.",
      },
      { name: "Call Premium", desc: "Premium paid for the ATM call option." },
      { name: "Put Premium", desc: "Premium paid for the ATM put option." },
      {
        name: "Lots / Lot Size",
        desc: "Scales total cost and P&L to your full position size.",
      },
    ],
  },
  "short-strangle": {
    direction: "neutral",
    outlook: "Neutral / Low Volatility",
    whenToUse:
      "Expectation of low volatility — you expect the underlying to stay range-bound between both strikes until expiry.",
    risk: "Unlimited — losses accelerate if the price breaks out sharply beyond either breakeven.",
    reward:
      "Limited — capped at the total premium received from selling both legs.",
    summary:
      "Sell 1 OTM CE + Sell 1 OTM PE at different strikes, collecting both premiums upfront. Profit if the underlying stays inside the two breakevens at expiry — both options expire worthless and you keep the full credit. Max loss is unlimited if the price breaks out sharply in either direction.",
    howItWorks:
      "As the seller you collect a net credit upfront. As long as the underlying stays between the two strikes, both options expire worthless and you keep the full credit. Any breakout past either breakeven starts eating into profit and then causes losses.",
    formula:
      "Upper BE = Call Strike + Net Credit\nLower BE = Put Strike − Net Credit\nMax Profit = Net Credit × Qty\nMax Loss   = Unlimited",
    fields: [
      {
        name: "Call Strike (Sell)",
        desc: "OTM call you are selling — above the current market price.",
      },
      {
        name: "Call Premium Received",
        desc: "Credit collected for selling the OTM call.",
      },
      {
        name: "Put Strike (Sell)",
        desc: "OTM put you are selling — below the current market price.",
      },
      {
        name: "Put Premium Received",
        desc: "Credit collected for selling the OTM put.",
      },
      {
        name: "Lots / Lot Size",
        desc: "Scales total credit and P&L to your full position size.",
      },
    ],
  },
  "short-straddle": {
    direction: "neutral",
    outlook: "Neutral / Low Volatility",
    whenToUse:
      "Expectation of very low volatility — you expect the underlying to pin close to the strike at expiry with minimal movement.",
    risk: "Unlimited — any large move in either direction causes accelerating losses.",
    reward:
      "Limited — capped at the total net premium received (highest possible credit for any two-leg strategy).",
    summary:
      "Sell 1 ATM CE + Sell 1 ATM PE at the same strike, collecting the maximum possible premium upfront. Profit if the underlying pins near the strike at expiry. Higher credit than a short strangle, but the safe zone is narrower. Max loss is unlimited from any large move in either direction.",
    howItWorks:
      "You receive the highest possible premium because both options are at-the-money. The entire credit is profit if the stock pins at the strike. Any move in either direction shrinks profit, and exceeding either breakeven results in an accelerating loss.",
    formula:
      "Upper BE = Strike + Net Credit\nLower BE = Strike − Net Credit\nMax Profit = Net Credit × Qty\nMax Loss   = Unlimited",
    fields: [
      {
        name: "Strike Price",
        desc: "The ATM strike used for both the sold call and the sold put.",
      },
      {
        name: "Call Premium Received",
        desc: "Credit collected for selling the ATM call.",
      },
      {
        name: "Put Premium Received",
        desc: "Credit collected for selling the ATM put.",
      },
      {
        name: "Lots / Lot Size",
        desc: "Scales total credit and P&L to your full position size.",
      },
    ],
  },
  compare: {
    direction: "selectable",
    outlook: null,
    whenToUse:
      "You want to decide between a Straddle and Strangle before placing a trade, based on current premiums and your expected move.",
    risk: "Depends on direction — Long: limited to net premium paid. Short: unlimited.",
    reward:
      "Depends on direction — Long: unlimited. Short: limited to net premium received.",
    summary:
      "Compare a Straddle and Strangle side by side to decide which strategy suits the current market premium and expected move.",
    howItWorks: "",
    formula: "",
    fields: [],
  },
  "bull-spread": {
    direction: "long",
    outlook: "Bullish (Defined Risk)",
    whenToUse:
      "Your view is mildly bullish — you expect a moderate upward move, not a runaway rally. Cheaper alternative to a plain long call.",
    risk: "Limited — capped at the net debit paid (Lower Premium − Upper Premium × Lot Size).",
    reward:
      "Limited — max profit = (Spread Width − Net Debit) × Lot Size, achieved when price closes ≥ upper strike at expiry.",
    summary:
      "Buy 1 ATM CE & Sell 1 OTM CE at a higher strike. The premium collected from the short call reduces your net entry cost compared to buying a plain call. Profit is capped at the spread width minus the net debit paid. Both max profit and max loss are fully defined upfront.",
    howItWorks:
      "The premium received from selling the upper call offsets the cost of the lower call (net debit). Max profit is locked in once the stock closes at or above the upper strike at expiry.",
    formula:
      "Breakeven  = Lower Strike + Net Debit\nMax Profit = (Spread Width − Net Debit) × Qty\nMax Loss   = Net Debit × Qty",
    fields: [
      {
        name: "Lower Strike (Buy)",
        desc: "The call you buy — closer to the money, more expensive. Gives you the right to buy.",
      },
      {
        name: "Lower Premium",
        desc: "Premium paid for the long call (a debit).",
      },
      {
        name: "Upper Strike (Sell)",
        desc: "The call you sell — further OTM, cheaper. Caps your max profit.",
      },
      {
        name: "Upper Premium",
        desc: "Premium received from the short call (a credit). Reduces net cost.",
      },
    ],
  },
  "bear-spread": {
    direction: "short",
    outlook: "Bearish (Defined Risk)",
    whenToUse:
      "Your view is mildly bearish — you expect a moderate downward move. Cheaper alternative to a plain long put.",
    risk: "Limited — capped at the net debit paid (Higher Premium − Lower Premium × Lot Size).",
    reward:
      "Limited — max profit = (Spread Width − Net Debit) × Lot Size, achieved when price closes ≤ lower strike at expiry.",
    summary:
      "Buy 1 ATM PE & Sell 1 OTM PE at a lower strike. The premium collected from the short put reduces your net entry cost compared to buying a plain put. Profit is capped at the spread width minus the net debit paid. Both max profit and max loss are fully defined upfront.",
    howItWorks:
      "The premium received from selling the lower put offsets the cost of the higher put (net debit). Max profit is locked in once the stock closes at or below the lower strike at expiry.",
    formula:
      "Breakeven  = Higher Strike − Net Debit\nMax Profit = (Spread Width − Net Debit) × Qty\nMax Loss   = Net Debit × Qty",
    fields: [
      {
        name: "Higher Strike (Buy)",
        desc: "The put you buy — closer to the money, more expensive. Gives you the right to sell.",
      },
      {
        name: "Higher Premium",
        desc: "Premium paid for the long put (a debit).",
      },
      {
        name: "Lower Strike (Sell)",
        desc: "The put you sell — further OTM, cheaper. Caps your max downside profit.",
      },
      {
        name: "Lower Premium",
        desc: "Premium received from the short put (a credit). Reduces net cost.",
      },
    ],
  },
};

// ─── Direction badge styles ───────────────────────────────────────
const DIR_STYLE = {
  long: {
    bg: "var(--green-light)",
    border: "rgba(45,122,95,0.25)",
    text: "var(--green)",
    label: "↑ Long",
  },
  short: {
    bg: "rgba(220,38,38,0.08)",
    border: "rgba(220,38,38,0.25)",
    text: "var(--red)",
    label: "↓ Short",
  },
  neutral: {
    bg: "rgba(139,92,246,0.08)",
    border: "rgba(139,92,246,0.25)",
    text: "#7c3aed",
    label: "↔ Neutral / Both Sides",
  },
};

// ─── Right-hand info panel ────────────────────────────────────────
function InfoPanel({ calcId, direction, onDirectionChange }) {
  const meta = CALC_META[calcId];
  const activeDir =
    meta.direction === "selectable" ? direction : meta.direction;
  const dirStyle = DIR_STYLE[activeDir] ?? DIR_STYLE.neutral;

  return (
    <div
      style={{
        position: "sticky",
        top: 24,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Direction */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 20,
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--text-3)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 12,
          }}
        >
          Direction
        </p>
        {meta.direction === "selectable" ? (
          <div style={{ display: "flex", gap: 8 }}>
            {["long", "short"].map((d) => {
              const ds = DIR_STYLE[d];
              const active = direction === d;
              return (
                <button
                  key={d}
                  onClick={() => onDirectionChange(d)}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    borderRadius: 8,
                    border: `1px solid ${active ? ds.border : "var(--border)"}`,
                    background: active ? ds.bg : "transparent",
                    color: active ? ds.text : "var(--text-2)",
                    fontWeight: active ? 700 : 500,
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "Inter, sans-serif",
                    transition: "all 0.15s",
                  }}
                >
                  {ds.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 16px",
              borderRadius: 8,
              background: dirStyle.bg,
              border: `1px solid ${dirStyle.border}`,
            }}
          >
            <span
              style={{ fontSize: 14, fontWeight: 700, color: dirStyle.text }}
            >
              {dirStyle.label}
            </span>
            {meta.outlook && (
              <span
                style={{ fontSize: 12, color: dirStyle.text, opacity: 0.75 }}
              >
                · {meta.outlook}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Summary + How it works + Formula */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 20,
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--text-3)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 10,
          }}
        >
          What is this?
        </p>
        <p
          style={{
            fontSize: 13,
            color: "var(--text)",
            lineHeight: 1.65,
            margin: "0 0 18px",
          }}
        >
          {meta.summary}
        </p>

        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--text-3)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 8,
          }}
        >
          How it works
        </p>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-2)",
            lineHeight: 1.65,
            margin: "0 0 18px",
          }}
        >
          {meta.howItWorks}
        </p>

        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--text-3)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 8,
          }}
        >
          Formula
        </p>
        <pre
          style={{
            fontSize: 11,
            color: "var(--green)",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "10px 12px",
            margin: 0,
            fontFamily: "JetBrains Mono, monospace",
            whiteSpace: "pre-wrap",
            lineHeight: 1.7,
          }}
        >
          {meta.formula}
        </pre>
      </div>

      {/* When to use / Risk / Reward */}
      {(meta.whenToUse || meta.risk || meta.reward) && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 20,
          }}
        >
          {meta.whenToUse && (
            <>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--text-3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 6,
                }}
              >
                When to Use
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-2)",
                  lineHeight: 1.65,
                  margin: "0 0 16px",
                }}
              >
                {meta.whenToUse}
              </p>
            </>
          )}
          {meta.risk && (
            <>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--red)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 6,
                }}
              >
                Risk
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-2)",
                  lineHeight: 1.65,
                  margin: "0 0 16px",
                }}
              >
                {meta.risk}
              </p>
            </>
          )}
          {meta.reward && (
            <>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--green)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 6,
                }}
              >
                Reward
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-2)",
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                {meta.reward}
              </p>
            </>
          )}
        </div>
      )}

      {/* Field glossary */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 20,
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--text-3)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 14,
          }}
        >
          Field Reference
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {meta.fields.map((f) => (
            <div key={f.name}>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text)",
                  margin: "0 0 3px",
                }}
              >
                {f.name}
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-2)",
                  margin: 0,
                  lineHeight: 1.55,
                }}
              >
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Calculator() {
  const [selected, setSelected] = useState("position");
  const [direction, setDirection] = useState("long");
  const entry = CALCULATORS.find((c) => c.id === selected);
  const CalcComponent = entry.component;
  const isComparator = !!entry.isComparator;

  const handleSelect = (id) => {
    setSelected(id);
    const meta = CALC_META[id];
    if (meta && meta.direction !== "selectable")
      setDirection(meta.direction === "short" ? "short" : "long");
  };

  return (
    <div>
      {/* Dropdown */}
      <div style={{ marginBottom: 28 }}>
        <label
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-2)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 8,
          }}
        >
          Calculator Type
        </label>
        <select
          value={selected}
          onChange={(e) => handleSelect(e.target.value)}
          className="t-inp"
          style={{ maxWidth: 260, cursor: "pointer" }}
        >
          {CALCULATORS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Comparator: full-width; others: two-column with info panel */}
      {isComparator ? (
        <CalcComponent key={selected} />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 300px",
            gap: 28,
            alignItems: "start",
          }}
        >
          <CalcComponent key={selected} direction={direction} />
          <InfoPanel
            calcId={selected}
            direction={direction}
            onDirectionChange={setDirection}
          />
        </div>
      )}
    </div>
  );
}
