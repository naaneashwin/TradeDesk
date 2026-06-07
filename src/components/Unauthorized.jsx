import { useNavigate } from "react-router-dom";

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", textAlign: "center", gap: 14 }}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <h2 style={{ fontWeight: 800, fontSize: 20, color: "var(--text)", margin: 0 }}>403 Unauthorized</h2>
      <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0, maxWidth: 360 }}>
        You do not have permission to access this admin area.
      </p>
      <button className="btn-outline" style={{ padding: "8px 14px", marginTop: 6 }} onClick={() => navigate("/tradedesk/strategies")}>
        Go To Strategies
      </button>
    </div>
  );
}
