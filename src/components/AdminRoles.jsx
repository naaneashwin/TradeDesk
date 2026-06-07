import { useState, useEffect, useCallback } from "react";
import { Modal } from "./ui";
import {
  adminGetRoles,
  adminGetPermissions,
  adminGetUsers,
  adminCreateRole,
  adminUpdateRole,
  adminDeleteRole,
  adminSetRolePermissions,
} from "../lib/db";

/** @typedef {{ id: string, name: string, description?: string, module?: string }} PermissionRecord */
/** @typedef {{ id: string, name: string, description?: string, color?: string, permissions?: PermissionRecord[] }} RoleRecord */

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      background: type === "error" ? "var(--red)" : "var(--green)",
      color: "#fff", padding: "12px 20px", borderRadius: 10,
      fontSize: 13, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
      maxWidth: 320,
    }}>
      {message}
    </div>
  );
}

function RoleBadge({ name, color }) {
  return (
    <span style={{
      display: "inline-block", padding: "3px 12px", borderRadius: 20,
      fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em",
      background: color + "22", color, border: `1px solid ${color}44`,
    }}>
      {name}
    </span>
  );
}

const PRESET_COLORS = ["#2d7a5f", "#6b7280", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6"];

const MODULE_LABELS = {
  content:     "Content",
  analytics:   "Analytics",
  tools:       "Tools",
  broker:      "Broker",
  admin:       "Admin",
  general:     "General",
};

export default function AdminRoles() {
  const [roles, setRoles]           = useState([]);
  const [perms, setPerms]           = useState([]);
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState(null);
  const [expanded, setExpanded]     = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editRole, setEditRole]     = useState(null);
  const [deleteRole, setDeleteRole] = useState(null);
  const [permRole, setPermRole]     = useState(null);  // role being permission-edited
  const [selectedPerms, setSelectedPerms] = useState(new Set());
  const [form, setForm]             = useState({ name: "", description: "", color: "#6b7280" });
  const [saving, setSaving]         = useState(false);

  const showToast = (message, type = "success") => setToast({ message, type });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, p, u] = await Promise.all([adminGetRoles(), adminGetPermissions(), adminGetUsers()]);
      setRoles(r);
      setPerms(p);
      setUsers(u);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const userCountByRole = (roleName) => users.filter((u) => u.role === roleName).length;
  const usersByRole = (roleName) => users.filter((u) => u.role === roleName);

  const groupedPerms = perms.reduce((acc, p) => {
    const mod = p.module || "general";
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(p);
    return acc;
  }, {});

  const openPermEdit = (role) => {
    setPermRole(role);
    setSelectedPerms(new Set((role.permissions ?? []).map((p) => p.id)));
  };

  const handleSavePerms = async () => {
    setSaving(true);
    try {
      await adminSetRolePermissions(permRole.id, [...selectedPerms]);
      await load();
      showToast("Permissions updated.");
      setPermRole(null);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await adminCreateRole(form);
      await load();
      showToast("Role created.");
      setShowCreate(false);
      setForm({ name: "", description: "", color: "#6b7280" });
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editRole || !form.name.trim()) return;
    setSaving(true);
    try {
      await adminUpdateRole(editRole.id, form);
      await load();
      showToast("Role updated.");
      setEditRole(null);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRole) return;
    setSaving(true);
    try {
      await adminDeleteRole(deleteRole.id);
      await load();
      showToast("Role deleted.");
      setDeleteRole(null);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (role) => {
    setEditRole(role);
    setForm({ name: role.name, description: role.description || "", color: role.color || "#6b7280" });
  };

  const RoleFormBody = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Role Name</label>
        <input className="t-inp" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. moderator" />
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Description</label>
        <input className="t-inp" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Brief description…" />
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>Color</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {PRESET_COLORS.map((c) => (
            <button key={c} onClick={() => setForm((p) => ({ ...p, color: c }))}
              style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: form.color === c ? "3px solid var(--text)" : "2px solid transparent", cursor: "pointer" }} />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: 0 }}>Roles</h2>
          <p style={{ fontSize: 13, color: "var(--text-2)", margin: "2px 0 0" }}>{roles.length} roles defined</p>
        </div>
        <button className="btn-green" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px" }}
          onClick={() => { setShowCreate(true); setForm({ name: "", description: "", color: "#6b7280" }); }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Role
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[...Array(3)].map((_, i) => <div key={i} style={{ height: 72, borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)", opacity: 0.6 }} />)}
        </div>
      ) : roles.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--text-3)" }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-2)", marginBottom: 4 }}>No roles found</p>
          <p style={{ fontSize: 13 }}>Create your first role to begin assigning permissions.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {roles.map((role) => {
            const isExpanded = expanded === role.id;
            const count = userCountByRole(role.name);
            const roleUsers = usersByRole(role.name);
            return (
              <div key={role.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", flexWrap: "wrap" }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: role.color || "#6b7280", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <RoleBadge name={role.name} color={role.color || "#6b7280"} />
                      <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "JetBrains Mono, monospace" }}>
                        {role.id?.slice(0, 8)}
                      </span>
                    </div>
                    {role.description && <p style={{ fontSize: 12, color: "var(--text-3)", margin: "3px 0 0" }}>{role.description}</p>}
                  </div>
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--text-2)" }}><strong>{count}</strong> user{count !== 1 ? "s" : ""}</span>
                    <span style={{ fontSize: 12, color: "var(--text-2)" }}><strong>{(role.permissions ?? []).length}</strong> permissions</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setExpanded(isExpanded ? null : role.id)}
                      style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontSize: 12, color: "var(--text-2)", fontFamily: "Inter, sans-serif" }}>
                      {isExpanded ? "Collapse" : "Expand"}
                    </button>
                    <button onClick={() => openPermEdit(role)}
                      style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontSize: 12, color: "var(--text-2)", fontFamily: "Inter, sans-serif" }}>
                      Permissions
                    </button>
                    <button onClick={() => openEdit(role)}
                      style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontSize: 12, color: "var(--text-2)", fontFamily: "Inter, sans-serif" }}>
                      Edit
                    </button>
                    <button onClick={() => setDeleteRole(role)}
                      style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontSize: 12, color: "var(--red)", fontFamily: "Inter, sans-serif" }}>
                      Delete
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ borderTop: "1px solid var(--border)", padding: "14px 16px", background: "var(--surface-2)" }}>
                    {/* Users with this role */}
                    <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                      Users ({roleUsers.length})
                    </p>
                    {roleUsers.length === 0 ? (
                      <p style={{ fontSize: 13, color: "var(--text-3)" }}>No users assigned this role.</p>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                        {roleUsers.map((u) => (
                          <span key={u.user_id} style={{ fontSize: 12, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: "4px 12px", color: "var(--text-2)" }}>
                            {u.display_name || u.email?.split("@")[0]}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Permissions */}
                    <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                      Permissions ({(role.permissions ?? []).length})
                    </p>
                    {(role.permissions ?? []).length === 0 ? (
                      <p style={{ fontSize: 13, color: "var(--text-3)" }}>No permissions assigned.</p>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {(role.permissions ?? []).map((p) => (
                          <span key={p.id} style={{ fontSize: 11, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 10px", color: "var(--text-2)", fontFamily: "JetBrains Mono, monospace" }}>
                            {p.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Create New Role" onClose={() => setShowCreate(false)}>
          <div style={{ marginBottom: 20 }}><RoleFormBody /></div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn-green" onClick={handleCreate} disabled={saving || !form.name.trim()}>
              {saving ? "Creating…" : "Create Role"}
            </button>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {editRole && (
        <Modal title="Edit Role" onClose={() => setEditRole(null)}>
          <div style={{ marginBottom: 20 }}><RoleFormBody /></div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn-outline" onClick={() => setEditRole(null)}>Cancel</button>
            <button className="btn-green" onClick={handleUpdate} disabled={saving || !form.name.trim()}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </Modal>
      )}

      {/* Delete Confirm Modal */}
      {deleteRole && (
        <Modal title="Delete Role?" onClose={() => setDeleteRole(null)}>
          <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 20 }}>
            Delete role <strong style={{ color: "var(--text)" }}>{deleteRole.name}</strong>? This cannot be undone.
            Users with this role will lose their role assignment.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn-outline" onClick={() => setDeleteRole(null)}>Cancel</button>
            <button
              style={{ background: "var(--red)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" }}
              onClick={handleDelete} disabled={saving}
            >
              {saving ? "Deleting…" : "Delete"}
            </button>
          </div>
        </Modal>
      )}

      {/* Permissions Edit Modal */}
      {permRole && (
        <Modal title={`Permissions — ${permRole.name}`} onClose={() => setPermRole(null)}>
          <div style={{ maxHeight: "55vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18, marginBottom: 20 }}>
            {Object.entries(groupedPerms).map(([mod, modPerms]) => (
              <div key={mod}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  {MODULE_LABELS[mod] ?? mod}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {modPerms.map((p) => {
                    const checked = selectedPerms.has(p.id);
                    return (
                      <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "8px 10px", borderRadius: 8, background: checked ? "var(--green-light)" : "var(--surface-2)", border: `1px solid ${checked ? "rgba(45,122,95,0.25)" : "var(--border)"}`, transition: "background 0.15s" }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setSelectedPerms((prev) => {
                              const next = new Set(prev);
                              if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                              return next;
                            });
                          }}
                          style={{ accentColor: "var(--green)", width: 15, height: 15 }}
                        />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: "JetBrains Mono, monospace" }}>{p.name}</div>
                          {p.description && <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>{p.description}</div>}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn-outline" onClick={() => setPermRole(null)}>Cancel</button>
            <button className="btn-green" onClick={handleSavePerms} disabled={saving}>
              {saving ? "Saving…" : "Save Permissions"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
