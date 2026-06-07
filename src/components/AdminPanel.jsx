import { useNavigate, useLocation, Routes, Route, Navigate } from "react-router-dom";
import AdminUsers from "./AdminUsers";
import AdminRoles from "./AdminRoles";
import AdminPermissions from "./AdminPermissions";

function AdminIcon({ name, size = 18, color = "currentColor" }) {
  const s = { width: size, height: size, flexShrink: 0 };
  const p = { fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "users":
      return (
        <svg {...s} viewBox="0 0 24 24" {...p}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "roles":
      return (
        <svg {...s} viewBox="0 0 24 24" {...p}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case "permissions":
      return (
        <svg {...s} viewBox="0 0 24 24" {...p}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    case "chevron-right":
      return <svg {...s} viewBox="0 0 24 24" {...p}><polyline points="9 18 15 12 9 6" /></svg>;
    default:
      return null;
  }
}

const ADMIN_NAV = [
  { id: "users",       label: "Users",       path: "/tradedesk/admin/users"       },
  { id: "roles",       label: "Roles",       path: "/tradedesk/admin/roles"       },
  { id: "permissions", label: "Permissions", path: "/tradedesk/admin/permissions" },
];

export default function AdminPanel({ isAdmin }) {
  const navigate = useNavigate();
  const location = useLocation();

  if (!isAdmin) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", textAlign: "center", gap: 12 }}>
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <p style={{ fontWeight: 700, fontSize: 16, color: "var(--text)", margin: 0 }}>Access Restricted</p>
        <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0, maxWidth: 320 }}>
          The admin panel is only available to administrators.
        </p>
      </div>
    );
  }

  const activeTab = ADMIN_NAV.find((n) => location.pathname.startsWith(n.path))?.id ?? "users";

  return (
    <div className="admin-layout">
      {/* Sub-nav — vertical sidebar on desktop, horizontal tabs on mobile */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-nav">
          {ADMIN_NAV.map(({ id, label, path }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => navigate(path)}
                className="admin-sidebar-btn"
                style={{
                  background: active ? "var(--green-light)" : "transparent",
                  color: active ? "var(--green)" : "var(--text-2)",
                  fontWeight: active ? 600 : 400,
                }}
              >
                <AdminIcon name={id} size={15} color={active ? "var(--green)" : "var(--text-3)"} />
                {label}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Panel content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Routes>
          <Route path="users"       element={<AdminUsers />} />
          <Route path="roles"       element={<AdminRoles />} />
          <Route path="permissions" element={<AdminPermissions />} />
          <Route path="*"           element={<Navigate to="/tradedesk/admin/users" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export { AdminIcon };
