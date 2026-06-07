import { useState, useEffect, useCallback } from "react";
import { Modal } from "./ui";
import {
  adminGetPermissions,
  adminGetRoles,
  adminCreatePermission,
  adminUpdatePermission,
  adminDeletePermission,
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

const MODULE_LABELS = {
  content:     "Content",
  analytics:   "Analytics",
  tools:       "Tools",
  broker:      "Broker",
  admin:       "Admin",
  general:     "General",
};

const MODULE_COLORS = {
  content:   "#3b82f6",
  analytics: "#8b5cf6",
  tools:     "#f59e0b",
  broker:    "#14b8a6",
  admin:     "#ef4444",
  general:   "#6b7280",
};

const MODULES = Object.keys(MODULE_LABELS);

export default function AdminPermissions() {
  const [perms, setPerms]           = useState([]);
  const [roles, setRoles]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editPerm, setEditPerm]     = useState(null);
  const [deletePerm, setDeletePerm] = useState(null);
  const [form, setForm]             = useState({ name: "", description: "", module: "general" });
  const [saving, setSaving]         = useState(false);
  const [roleToggle, setRoleToggle] = useState(null); // { perm, roleStates: Map<roleId, bool> }
  const [savingToggle, setSavingToggle] = useState(false);

  const showToast = (message, type = "success") => setToast({ message, type });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, r] = await Promise.all([adminGetPermissions(), adminGetRoles()]);
      setPerms(p);
      setRoles(r);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const grouped = perms.reduce((acc, p) => {
    const mod = p.module || "general";
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(p);
    return acc;
  }, {});

  const rolesWithPerm = (permId) =>
    roles.filter((r) => (r.permissions ?? []).some((p) => p.id === permId));

  const openRoleToggle = (perm) => {
    const map = new Map(roles.map((r) => [r.id, (r.permissions ?? []).some((p) => p.id === perm.id)]));
    setRoleToggle({ perm, roleStates: map });
  };

  const handleSaveRoleToggle = async () => {
    setSavingToggle(true);
    try {
      for (const role of roles) {
        const has     = roleToggle.roleStates.get(role.id) ?? false;
        const current = (role.permissions ?? []).map((p) => p.id);
        const next    = has
          ? [...new Set([...current, roleToggle.perm.id])]
          : current.filter((id) => id !== roleToggle.perm.id);
        if (JSON.stringify([...current].sort()) !== JSON.stringify([...next].sort())) {
          await adminSetRolePermissions(role.id, next);
        }
      }
      await load();
      showToast("Role assignments updated.");
      setRoleToggle(null);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSavingToggle(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await adminCreatePermission(form);
      await load();
      showToast("Permission created.");
      setShowCreate(false);
      setForm({ name: "", description: "", module: "general" });
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editPerm || !form.name.trim()) return;
    setSaving(true);
    try {
      await adminUpdatePermission(editPerm.id, form);
      await load();
      showToast("Permission updated.");
      setEditPerm(null);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletePerm) return;
    setSaving(true);
    try {
      await adminDeletePermission(deletePerm.id);
      await load();
      showToast("Permission deleted.");
      setDeletePerm(null);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (perm) => {
    setEditPerm(perm);
    setForm({ name: perm.name, description: perm.description || "", module: perm.module || "general" });
  };

  const permFormBody = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Permission Key</label>
        <input className="t-inp" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value.toLowerCase().replace(/\s+/g, "_") }))} placeholder="e.g. view_reports" style={{ fontFamily: "JetBrains Mono, monospace" }} />
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Description</label>
        <input className="t-inp" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="What does this permission allow?" />
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Module</label>
        <select className="t-inp" value={form.module} onChange={(e) => setForm((p) => ({ ...p, module: e.target.value }))}>
          {MODULES.map((m) => <option key={m} value={m}>{MODULE_LABELS[m]}</option>)}
        </select>
      </div>
    </div>
  );

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: 0 }}>Permissions</h2>
          <p style={{ fontSize: 13, color: "var(--text-2)", margin: "2px 0 0" }}>{perms.length} permissions across {Object.keys(grouped).length} modules</p>
        </div>
        <button className="btn-green" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px" }}
          onClick={() => { setShowCreate(true); setForm({ name: "", description: "", module: "general" }); }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Permission
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[...Array(4)].map((_, i) => <div key={i} style={{ height: 56, borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", opacity: 0.6 }} />)}
        </div>
      ) : perms.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--text-3)" }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-2)", marginBottom: 4 }}>No permissions found</p>
          <p style={{ fontSize: 13 }}>Create a permission to map it to one or more roles.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {Object.entries(grouped).map(([mod, modPerms]) => {
            const color = MODULE_COLORS[mod] ?? "#6b7280";
            return (
              <div key={mod}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {MODULE_LABELS[mod] ?? mod}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-3)" }}>({modPerms.length})</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {modPerms.map((perm) => {
                    const assignedRoles = rolesWithPerm(perm.id);
                    return (
                      <div key={perm.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                        <div style={{ flex: 1, minWidth: 160 }}>
                          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{perm.name}</div>
                          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                            ID: {perm.id?.slice(0, 8)}
                          </div>
                          {perm.description && <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{perm.description}</div>}
                        </div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", flex: 1 }}>
                          {assignedRoles.length === 0 ? (
                            <span style={{ fontSize: 11, color: "var(--text-3)" }}>No roles</span>
                          ) : (
                            assignedRoles.map((r) => (
                              <span key={r.id} style={{
                                fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                                background: (r.color || "#6b7280") + "22", color: r.color || "#6b7280",
                                border: `1px solid ${(r.color || "#6b7280")}44`,
                              }}>{r.name}</span>
                            ))
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => openRoleToggle(perm)}
                            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontSize: 12, color: "var(--text-2)", fontFamily: "Inter, sans-serif" }}>
                            Roles
                          </button>
                          <button onClick={() => openEdit(perm)}
                            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontSize: 12, color: "var(--text-2)", fontFamily: "Inter, sans-serif" }}>
                            Edit
                          </button>
                          <button onClick={() => setDeletePerm(perm)}
                            style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontSize: 12, color: "var(--red)", fontFamily: "Inter, sans-serif" }}>
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Create Permission" onClose={() => setShowCreate(false)}>
          <div style={{ marginBottom: 20 }}>{permFormBody}</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn-green" onClick={handleCreate} disabled={saving || !form.name.trim()}>
              {saving ? "Creating…" : "Create"}
            </button>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {editPerm && (
        <Modal title="Edit Permission" onClose={() => setEditPerm(null)}>
          <div style={{ marginBottom: 20 }}>{permFormBody}</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn-outline" onClick={() => setEditPerm(null)}>Cancel</button>
            <button className="btn-green" onClick={handleUpdate} disabled={saving || !form.name.trim()}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </Modal>
      )}

      {/* Delete Confirm Modal */}
      {deletePerm && (
        <Modal title="Delete Permission?" onClose={() => setDeletePerm(null)}>
          <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 20 }}>
            Delete <strong style={{ color: "var(--text)", fontFamily: "JetBrains Mono, monospace" }}>{deletePerm.name}</strong>? This will remove it from all roles.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn-outline" onClick={() => setDeletePerm(null)}>Cancel</button>
            <button
              style={{ background: "var(--red)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" }}
              onClick={handleDelete} disabled={saving}
            >
              {saving ? "Deleting…" : "Delete"}
            </button>
          </div>
        </Modal>
      )}

      {/* Role Toggle Modal */}
      {roleToggle && (
        <Modal title={`Assign "${roleToggle.perm.name}" to roles`} onClose={() => setRoleToggle(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {roles.map((role) => {
              const checked = roleToggle.roleStates.get(role.id) ?? false;
              return (
                <label key={role.id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "9px 12px", borderRadius: 8, background: checked ? "var(--green-light)" : "var(--surface-2)", border: `1px solid ${checked ? "rgba(45,122,95,0.25)" : "var(--border)"}`, transition: "background 0.15s" }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setRoleToggle((prev) => {
                        const next = new Map(prev.roleStates);
                        next.set(role.id, !checked);
                        return { ...prev, roleStates: next };
                      });
                    }}
                    style={{ accentColor: "var(--green)", width: 15, height: 15 }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 600, color: role.color || "#6b7280" }}>{role.name}</span>
                  {role.description && <span style={{ fontSize: 12, color: "var(--text-3)" }}>— {role.description}</span>}
                </label>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn-outline" onClick={() => setRoleToggle(null)}>Cancel</button>
            <button className="btn-green" onClick={handleSaveRoleToggle} disabled={savingToggle}>
              {savingToggle ? "Saving…" : "Save"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
