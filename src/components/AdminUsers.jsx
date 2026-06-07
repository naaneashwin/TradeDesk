import { useState, useEffect, useCallback, useMemo } from "react";
import { Modal } from "./ui";
import {
  adminGetUsers,
  adminGetRoles,
  adminInviteUser,
  adminUpdateUserRole,
  adminUpdateUserStatus,
  adminUpdateUserDisplayName,
  adminSoftDeleteUser,
} from "../lib/db";

/** @typedef {{ id: string, name: string, description?: string, color?: string }} RoleRecord */
/** @typedef {{ user_id: string, email: string, display_name?: string, role: string, role_id?: string, role_name?: string, role_color?: string, status: 'active' | 'inactive' }} UserRecord */

const PAGE_SIZE = 8;

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        background: type === "error" ? "var(--red)" : "var(--green)",
        color: "#fff",
        padding: "12px 20px",
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 600,
        boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        maxWidth: 320,
      }}
    >
      {message}
    </div>
  );
}

function RoleBadge({ name, color }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        background: `${color}22`,
        color,
        border: `1px solid ${color}44`,
      }}
    >
      {name}
    </span>
  );
}

function StatusBadge({ status }) {
  const active = status === "active";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        background: active ? "rgba(45,122,95,0.12)" : "rgba(107,114,128,0.12)",
        color: active ? "var(--green)" : "var(--text-3)",
        border: active ? "1px solid rgba(45,122,95,0.3)" : "1px solid var(--border)",
      }}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function Avatar({ name, email }) {
  const initials = name
    ? name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : (email?.[0] ?? "U").toUpperCase();
  const hue = ((email ?? "").charCodeAt(0) * 47) % 360;

  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        flexShrink: 0,
        background: `hsl(${hue},55%,50%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        fontWeight: 700,
        color: "#fff",
      }}
    >
      {initials}
    </div>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkRole, setBulkRole] = useState("");

  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  const [editUser, setEditUser] = useState(null);
  const [editName, setEditName] = useState("");

  const [confirmUser, setConfirmUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [rolePickerUser, setRolePickerUser] = useState(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", displayName: "", role: "user" });

  const showToast = (message, type = "success") => setToast({ message, type });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([adminGetUsers(), adminGetRoles()]);
      setUsers(u);
      setRoles(r);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users.filter((u) => {
      const matchSearch =
        !q ||
        u.email?.toLowerCase().includes(q) ||
        u.display_name?.toLowerCase().includes(q) ||
        u.user_id?.toLowerCase().includes(q);
      const matchRole = filterRole === "all" || u.role === filterRole;
      return matchSearch && matchRole;
    });
  }, [users, search, filterRole]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageStart = (page - 1) * PAGE_SIZE;
  const pageUsers = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  const allPageSelected = pageUsers.length > 0 && pageUsers.every((u) => selectedIds.has(u.user_id));

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const uniqueRoleNames = useMemo(
    () => [...new Set(users.map((u) => u.role).filter(Boolean))],
    [users],
  );

  const toggleSelectUser = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageUsers.forEach((u) => next.delete(u.user_id));
      } else {
        pageUsers.forEach((u) => next.add(u.user_id));
      }
      return next;
    });
  };

  const handleToggleStatus = async (user) => {
    const next = user.status === "active" ? "inactive" : "active";
    try {
      await adminUpdateUserStatus(user.user_id, next);
      setUsers((prev) => prev.map((u) => (u.user_id === user.user_id ? { ...u, status: next } : u)));
      showToast(`User ${next === "active" ? "activated" : "deactivated"}.`);
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const handleRoleChange = async () => {
    if (!confirmUser) return;
    setSaving(true);
    try {
      await adminUpdateUserRole(confirmUser.user.user_id, confirmUser.newRole, confirmUser.newRoleId);
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === confirmUser.user.user_id
            ? {
                ...u,
                role: confirmUser.newRole,
                role_id: confirmUser.newRoleId,
                role_name: confirmUser.newRole,
                role_color: confirmUser.color,
              }
            : u,
        ),
      );
      showToast("Role updated.");
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
      setConfirmUser(null);
    }
  };

  const handleSaveName = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await adminUpdateUserDisplayName(editUser.user_id, editName);
      setUsers((prev) => prev.map((u) => (u.user_id === editUser.user_id ? { ...u, display_name: editName } : u)));
      showToast("Display name updated.");
      setEditUser(null);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    setSaving(true);
    try {
      await adminSoftDeleteUser(deleteUser.user_id);
      setUsers((prev) => prev.map((u) => (u.user_id === deleteUser.user_id ? { ...u, status: "inactive" } : u)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteUser.user_id);
        return next;
      });
      showToast("User deactivated.");
      setDeleteUser(null);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkRole || selectedIds.size === 0) return;
    const role = roles.find((r) => r.name === bulkRole);
    if (!role?.id) {
      showToast("Selected role was not found.", "error");
      return;
    }

    setSaving(true);
    try {
      const ids = [...selectedIds];
      await Promise.all(ids.map((id) => adminUpdateUserRole(id, role.name, role.id)));
      setUsers((prev) =>
        prev.map((u) =>
          selectedIds.has(u.user_id)
            ? { ...u, role: role.name, role_id: role.id, role_name: role.name, role_color: role.color }
            : u,
        ),
      );
      showToast(`Assigned role '${role.name}' to ${ids.length} user(s).`);
      setSelectedIds(new Set());
      setBulkRole("");
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedIds.size === 0) return;

    setSaving(true);
    try {
      const ids = [...selectedIds];
      await Promise.all(ids.map((id) => adminUpdateUserStatus(id, "inactive")));
      setUsers((prev) => prev.map((u) => (selectedIds.has(u.user_id) ? { ...u, status: "inactive" } : u)));
      showToast(`Deactivated ${ids.length} user(s).`);
      setSelectedIds(new Set());
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteForm.email.trim()) return;
    setSaving(true);
    try {
      await adminInviteUser(inviteForm);
      showToast(`Invite sent to ${inviteForm.email}.`);
      setInviteOpen(false);
      setInviteForm({ email: "", displayName: "", role: "user" });
      await load();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: 0 }}>Users</h2>
          <p style={{ fontSize: 13, color: "var(--text-2)", margin: "2px 0 0" }}>
            {users.length} total users
          </p>
        </div>
        <button className="btn-green" style={{ padding: "8px 14px" }} onClick={() => setInviteOpen(true)}>
          Invite User
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-3)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="t-inp"
            placeholder="Search by name, email, or user ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 32, fontSize: 13 }}
          />
        </div>

        <select
          className="t-inp"
          value={filterRole}
          onChange={(e) => {
            setFilterRole(e.target.value);
            setPage(1);
          }}
          style={{ flex: "0 0 150px", fontSize: 13, cursor: "pointer" }}
        >
          <option value="all">All roles</option>
          {uniqueRoleNames.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {selectedIds.size > 0 && (
        <div
          style={{
            marginBottom: 12,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 600 }}>
            {selectedIds.size} selected
          </span>
          <select
            className="t-inp"
            value={bulkRole}
            onChange={(e) => setBulkRole(e.target.value)}
            style={{ width: 150, fontSize: 12, padding: "6px 8px" }}
          >
            <option value="">Assign role…</option>
            {roles.map((r) => (
              <option key={r.id} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
          <button className="btn-outline" style={{ padding: "6px 10px", fontSize: 12 }} onClick={handleBulkAssign} disabled={saving || !bulkRole}>
            Assign
          </button>
          <button
            style={{
              background: "rgba(220,38,38,0.08)",
              border: "1px solid rgba(220,38,38,0.2)",
              borderRadius: 7,
              padding: "6px 10px",
              cursor: "pointer",
              fontSize: 12,
              color: "var(--red)",
              fontFamily: "Inter, sans-serif",
            }}
            onClick={handleBulkDeactivate}
            disabled={saving}
          >
            Deactivate
          </button>
          <button className="btn-outline" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => setSelectedIds(new Set())}>
            Clear
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              style={{
                height: 56,
                borderRadius: 10,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--text-3)" }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-2)", marginBottom: 4 }}>No users found</p>
          <p style={{ fontSize: 13 }}>Try adjusting your search or filters.</p>
        </div>
      ) : (
        <>
          {/* ── Desktop table ── */}
          <div className="admin-user-table">
            <div className="table-scroll" style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                    <th style={{ textAlign: "left", padding: "11px 12px", width: 42 }}>
                      <input type="checkbox" checked={allPageSelected} onChange={toggleSelectPage} />
                    </th>
                    <th style={{ textAlign: "left", padding: "11px 12px", fontSize: 12, color: "var(--text-2)" }}>User ID</th>
                    <th style={{ textAlign: "left", padding: "11px 12px", fontSize: 12, color: "var(--text-2)" }}>Name</th>
                    <th style={{ textAlign: "left", padding: "11px 12px", fontSize: 12, color: "var(--text-2)" }}>Email</th>
                    <th style={{ textAlign: "left", padding: "11px 12px", fontSize: 12, color: "var(--text-2)" }}>Role</th>
                    <th style={{ textAlign: "left", padding: "11px 12px", fontSize: 12, color: "var(--text-2)" }}>Status</th>
                    <th style={{ textAlign: "left", padding: "11px 12px", fontSize: 12, color: "var(--text-2)" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageUsers.map((user) => {
                    const roleColor = user.role_color || (user.role === "admin" ? "#2d7a5f" : "#6b7280");
                    return (
                      <tr key={user.user_id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "10px 12px" }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(user.user_id)}
                            onChange={() => toggleSelectUser(user.user_id)}
                          />
                        </td>
                        <td style={{ padding: "10px 12px", fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "var(--text-2)" }}>
                          {user.user_id?.slice(0, 8)}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Avatar name={user.display_name} email={user.email} />
                            <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}>
                              {user.display_name || user.email?.split("@")[0]}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: 13, color: "var(--text-2)" }}>{user.email}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <RoleBadge name={user.role_name || user.role} color={roleColor} />
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <StatusBadge status={user.status} />
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <select
                              className="t-inp"
                              value={user.role}
                              onChange={(e) => {
                                if (e.target.value === user.role) return;
                                const selected = roles.find((r) => r.name === e.target.value);
                                setConfirmUser({
                                  user,
                                  newRole: e.target.value,
                                  newRoleId: selected?.id,
                                  color: selected?.color || "#6b7280",
                                });
                              }}
                              style={{ fontSize: 12, padding: "5px 8px", cursor: "pointer", width: "auto" }}
                            >
                              {roles.map((r) => (
                                <option key={r.id} value={r.name}>
                                  {r.name}
                                </option>
                              ))}
                            </select>

                            <button
                              onClick={() => {
                                setEditUser(user);
                                setEditName(user.display_name || "");
                              }}
                              className="btn-outline"
                              style={{ padding: "5px 10px", fontSize: 12 }}
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => handleToggleStatus(user)}
                              style={{
                                background:
                                  user.status === "active" ? "rgba(220,38,38,0.08)" : "rgba(45,122,95,0.08)",
                                border: `1px solid ${user.status === "active" ? "rgba(220,38,38,0.2)" : "rgba(45,122,95,0.2)"}`,
                                borderRadius: 7,
                                padding: "5px 10px",
                                cursor: "pointer",
                                fontSize: 12,
                                color: user.status === "active" ? "var(--red)" : "var(--green)",
                                fontFamily: "Inter, sans-serif",
                              }}
                            >
                              {user.status === "active" ? "Deactivate" : "Activate"}
                            </button>

                            <button
                              onClick={() => setDeleteUser(user)}
                              style={{
                                background: "rgba(220,38,38,0.08)",
                                border: "1px solid rgba(220,38,38,0.2)",
                                borderRadius: 7,
                                padding: "5px 10px",
                                cursor: "pointer",
                                fontSize: 12,
                                color: "var(--red)",
                                fontFamily: "Inter, sans-serif",
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Mobile cards ── */}
          <div className="admin-user-cards">
            {pageUsers.map((user) => {
              const roleColor = user.role_color || (user.role === "admin" ? "#2d7a5f" : "#6b7280");
              return (
                <div key={user.user_id} className="admin-user-card">
                  <div className="admin-user-card-header">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(user.user_id)}
                      onChange={() => toggleSelectUser(user.user_id)}
                    />
                    <Avatar name={user.display_name} email={user.email} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {user.display_name || user.email?.split("@")[0]}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {user.email}
                      </div>
                    </div>
                    <StatusBadge status={user.status} />
                  </div>

                  <div className="admin-user-card-body">
                    <div className="admin-user-card-row">
                      <span className="admin-user-card-label">User ID</span>
                      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "var(--text-2)" }}>
                        {user.user_id?.slice(0, 8)}
                      </span>
                    </div>
                    <div className="admin-user-card-row">
                      <span className="admin-user-card-label">Role</span>
                      <RoleBadge name={user.role_name || user.role} color={roleColor} />
                    </div>
                  </div>

                  <div className="admin-user-card-actions">
                    <button
                      onClick={() => setRolePickerUser(user)}
                      className="btn-outline"
                      style={{ padding: "6px 12px", fontSize: 12, flex: "1 1 auto" }}
                    >
                      Change Role
                    </button>

                    <button
                      onClick={() => { setEditUser(user); setEditName(user.display_name || ""); }}
                      className="btn-outline"
                      style={{ padding: "6px 12px", fontSize: 12 }}
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleToggleStatus(user)}
                      style={{
                        background: user.status === "active" ? "rgba(220,38,38,0.08)" : "rgba(45,122,95,0.08)",
                        border: `1px solid ${user.status === "active" ? "rgba(220,38,38,0.2)" : "rgba(45,122,95,0.2)"}`,
                        borderRadius: 7,
                        padding: "6px 12px",
                        cursor: "pointer",
                        fontSize: 12,
                        color: user.status === "active" ? "var(--red)" : "var(--green)",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      {user.status === "active" ? "Deactivate" : "Activate"}
                    </button>

                    <button
                      onClick={() => setDeleteUser(user)}
                      style={{
                        background: "rgba(220,38,38,0.08)",
                        border: "1px solid rgba(220,38,38,0.2)",
                        borderRadius: 7,
                        padding: "6px 12px",
                        cursor: "pointer",
                        fontSize: 12,
                        color: "var(--red)",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>
              Showing {pageStart + 1}-{Math.min(pageStart + PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                className="btn-outline"
                style={{ padding: "6px 10px", fontSize: 12 }}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Prev
              </button>
              <span style={{ fontSize: 12, color: "var(--text-2)", alignSelf: "center" }}>
                Page {page} / {totalPages}
              </span>
              <button
                className="btn-outline"
                style={{ padding: "6px 10px", fontSize: 12 }}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {rolePickerUser && (
        <Modal title="Change Role" onClose={() => setRolePickerUser(null)}>
          <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 14 }}>
            Select a new role for <strong style={{ color: "var(--text)" }}>{rolePickerUser.email}</strong>:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {roles.map((r) => {
              const isCurrentRole = rolePickerUser.role === r.name;
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    if (!isCurrentRole) {
                      setConfirmUser({
                        user: rolePickerUser,
                        newRole: r.name,
                        newRoleId: r.id,
                        color: r.color || "#6b7280",
                      });
                    }
                    setRolePickerUser(null);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    border: isCurrentRole ? "2px solid var(--green)" : "1px solid var(--border)",
                    borderRadius: 10,
                    background: isCurrentRole ? "var(--green-light)" : "var(--surface-2)",
                    cursor: isCurrentRole ? "default" : "pointer",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 14,
                    fontWeight: isCurrentRole ? 600 : 400,
                    color: isCurrentRole ? "var(--green)" : "var(--text)",
                  }}
                >
                  {r.name}
                  {isCurrentRole && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--green)" }}>Current</span>
                  )}
                </button>
              );
            })}
          </div>
          <button className="btn-outline" style={{ width: "100%" }} onClick={() => setRolePickerUser(null)}>
            Cancel
          </button>
        </Modal>
      )}

      {inviteOpen && (
        <Modal title="Invite User" onClose={() => setInviteOpen(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 6 }}>
                Email
              </label>
              <input
                className="t-inp"
                value={inviteForm.email}
                onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 6 }}>
                Display Name (optional)
              </label>
              <input
                className="t-inp"
                value={inviteForm.displayName}
                onChange={(e) => setInviteForm((p) => ({ ...p, displayName: e.target.value }))}
                placeholder="Full name"
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 6 }}>
                Role
              </label>
              <select
                className="t-inp"
                value={inviteForm.role}
                onChange={(e) => setInviteForm((p) => ({ ...p, role: e.target.value }))}
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button className="btn-outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </button>
            <button className="btn-green" onClick={handleInviteUser} disabled={saving || !inviteForm.email.trim()}>
              {saving ? "Sending..." : "Send Invite"}
            </button>
          </div>
        </Modal>
      )}

      {confirmUser && (
        <Modal title="Change Role?" onClose={() => setConfirmUser(null)}>
          <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 20 }}>
            Change <strong style={{ color: "var(--text)" }}>{confirmUser.user.email}</strong>'s role to{' '}
            <strong style={{ color: "var(--text)" }}>{confirmUser.newRole}</strong>?
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn-outline" onClick={() => setConfirmUser(null)}>
              Cancel
            </button>
            <button className="btn-green" onClick={handleRoleChange} disabled={saving}>
              {saving ? "Saving..." : "Confirm"}
            </button>
          </div>
        </Modal>
      )}

      {editUser && (
        <Modal title="Edit Display Name" onClose={() => setEditUser(null)}>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-2)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                display: "block",
                marginBottom: 6,
              }}
            >
              Display Name
            </label>
            <input
              className="t-inp"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder={editUser.email?.split("@")[0]}
            />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn-outline" onClick={() => setEditUser(null)}>
              Cancel
            </button>
            <button className="btn-green" onClick={handleSaveName} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </Modal>
      )}

      {deleteUser && (
        <Modal title="Delete User?" onClose={() => setDeleteUser(null)}>
          <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 20 }}>
            Delete <strong style={{ color: "var(--text)" }}>{deleteUser.email}</strong>? This is a soft delete and will
            deactivate the account.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn-outline" onClick={() => setDeleteUser(null)}>
              Cancel
            </button>
            <button
              style={{
                background: "var(--red)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 18px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
              }}
              onClick={handleDeleteUser}
              disabled={saving}
            >
              {saving ? "Deleting..." : "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
