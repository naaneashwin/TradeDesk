import { useState, useEffect } from "react";
import { uid } from "./ui";
import { BUILT_IN_SECTIONS } from "../data/strategies";

function StrategyIcon({ active }) {
  return (
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        background: active ? "rgba(45,122,95,0.12)" : "#f3f4f6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke={active ? "var(--green)" : "#9ca3af"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    </div>
  );
}

function StatSummaryCard({ label, value, accent }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "20px 24px",
        flex: 1,
      }}
    >
      <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 8 }}>
        {label}
      </p>
      <p
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: accent ?? "var(--text)",
          margin: 0,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function ThreeDotMenu({ onEdit, onDelete, onToggle, active }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-3)",
          padding: "4px 6px",
          borderRadius: 6,
          fontSize: 18,
          lineHeight: 1,
        }}
      >
        ⋮
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            right: 0,
            top: "100%",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 100,
            minWidth: 160,
            padding: "4px 0",
          }}
        >
          {[
            { label: active ? "Deactivate" : "Activate", action: onToggle },
            { label: "Edit", action: onEdit },
            { label: "Delete", action: onDelete, danger: true },
          ].map(({ label, action, danger }) => (
            <button
              key={label}
              onClick={() => {
                action();
                setOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "9px 16px",
                background: "none",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                fontSize: 13,
                color: danger ? "var(--red)" : "var(--text)",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Library({
  strats,
  trades,
  onOpen,
  onUpsert,
  onDelete,
  checklistItems = [],
  onUpsertChecklistItem,
}) {
  const [addModal, setAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    const handler = () => setAddModal(true);
    document.addEventListener("td:new-strategy", handler);
    return () => document.removeEventListener("td:new-strategy", handler);
  }, []);

  const handleSaveStrategy = async ({ name, desc }, sections, isEdit) => {
    if (isEdit) {
      await onUpsert({
        ...editTarget,
        name,
        desc,
        sections: sections ?? editTarget.sections,
      });
      setEditTarget(null);
    } else {
      await onUpsert({
        id: uid(),
        name,
        desc,
        active: true,
        variants: [],
        totals: {},
        sections: sections ?? [],
      });
      setAddModal(false);
    }
  };

  const doDelete = () => {
    onDelete(deleteTarget.id);
    setDeleteTarget(null);
  };

  const totalTrades = trades.length;
  const activeCount = strats.filter((x) => x.active).length;

  return (
    <div>
      {/* Summary stat cards */}
      <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>
        <StatSummaryCard label="Total Strategies" value={strats.length} />
        <StatSummaryCard
          label="Active Strategies"
          value={activeCount}
          accent="var(--green)"
        />
        <StatSummaryCard label="Total Trades Logged" value={totalTrades} />
      </div>

      {/* Strategy cards grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: 20,
        }}
      >
        {strats.map((st) => {
          const tt = trades.filter((t) => t.strategyId === st.id);
          const wr = tt.length
            ? Math.round(
                (tt.filter((t) => t.outcome === "win").length / tt.length) *
                  100,
              )
            : 0;

          return (
            <div
              key={st.id}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: 24,
                display: "flex",
                flexDirection: "column",
                gap: 0,
                transition: "box-shadow 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.boxShadow =
                  "0 4px 20px rgba(0,0,0,0.08)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
            >
              {/* Top row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <StrategyIcon active={st.active} />
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "4px 10px",
                      borderRadius: 20,
                      background: st.active ? "var(--green)" : "transparent",
                      color: st.active ? "#fff" : "var(--text-2)",
                      border: st.active ? "none" : "1px solid var(--border-2)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {st.active ? "ACTIVE" : "INACTIVE"}
                  </span>
                  <ThreeDotMenu
                    active={st.active}
                    onToggle={() => onUpsert({ ...st, active: !st.active })}
                    onEdit={() => setEditTarget(st)}
                    onDelete={() => setDeleteTarget(st)}
                  />
                </div>
              </div>

              {/* Name */}
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: st.active ? "var(--green)" : "var(--text)",
                  margin: "0 0 14px",
                }}
              >
                {st.name}
              </h3>

              {/* Description */}
              <div style={{ minHeight: 80, marginBottom: 24 }}>
                {st.desc ? (
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--text-2)",
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    {st.desc}
                  </p>
                ) : (
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--text-3)",
                      margin: 0,
                      fontStyle: "italic",
                    }}
                  >
                    No description — use Edit to add one.
                  </p>
                )}
              </div>

              {/* Stats row */}
              <div
                style={{
                  display: "flex",
                  gap: 24,
                  marginBottom: 20,
                  paddingTop: 16,
                  borderTop: "1px solid var(--border)",
                }}
              >
                {[
                  {
                    label: "VARIANTS",
                    icon: "⊞",
                    val: st.variants?.length ?? 0,
                  },
                  { label: "TRADES", icon: "↗", val: tt.length },
                  { label: "WIN RATE", icon: "%", val: `${wr}%` },
                ].map(({ label, icon, val }) => (
                  <div key={label}>
                    <p
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "var(--text-3)",
                        letterSpacing: "0.06em",
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
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        margin: 0,
                      }}
                    >
                      <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                        {icon}
                      </span>
                      {val}
                    </p>
                  </div>
                ))}
              </div>

              {/* CTA */}
              {st.active ? (
                <button
                  className="btn-green"
                  style={{ width: "100%", padding: "12px", fontSize: 14 }}
                  onClick={() => onOpen(st)}
                >
                  Open Strategy →
                </button>
              ) : (
                <button
                  className="btn-outline"
                  style={{ width: "100%", padding: "12px", fontSize: 14 }}
                  onClick={() => onUpsert({ ...st, active: true })}
                >
                  Activate Strategy →
                </button>
              )}
            </div>
          );
        })}

        {strats.length === 0 && (
          <div
            style={{
              gridColumn: "1/-1",
              textAlign: "center",
              padding: "64px 0",
              color: "var(--text-3)",
            }}
          >
            <p style={{ fontSize: 14 }}>
              No strategies yet. Click "New Strategy" to add one.
            </p>
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      {addModal && (
        <StrategyModal
          onClose={() => setAddModal(false)}
          checklistItems={checklistItems}
          onSave={(data, secs) => handleSaveStrategy(data, secs, false)}
        />
      )}
      {editTarget && (
        <StrategyModal
          strategy={editTarget}
          checklistItems={checklistItems}
          onClose={() => setEditTarget(null)}
          onSave={(data, secs) => handleSaveStrategy(data, secs, true)}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <LightModal
          title="Delete Strategy"
          onClose={() => setDeleteTarget(null)}
        >
          <p style={{ fontSize: 14, color: "var(--text)", marginBottom: 6 }}>
            Delete <strong>{deleteTarget.name}</strong>?
          </p>
          <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 24 }}>
            This permanently removes the strategy and all associated trades.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              className="btn-outline"
              style={{ padding: "8px 18px" }}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </button>
            <button
              style={{
                padding: "8px 18px",
                background: "var(--red)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 14,
              }}
              onClick={doDelete}
            >
              Delete
            </button>
          </div>
        </LightModal>
      )}
    </div>
  );
}

// ── Strategy Modal (create + edit, Details + Checklist tabs) ────────────────

const SECTION_COLORS = [
  { id: "gray", label: "Gray" },
  { id: "indigo", label: "Indigo" },
  { id: "purple", label: "Purple" },
  { id: "blue", label: "Blue" },
  { id: "teal", label: "Teal" },
  { id: "amber", label: "Amber" },
  { id: "coral", label: "Coral" },
  { id: "green", label: "Green" },
];

function StrategyModal({ strategy, checklistItems = [], onClose, onSave }) {
  const isEdit = !!strategy;
  const [tab, setTab] = useState("details");
  const [name, setName] = useState(strategy?.name ?? "");
  const [desc, setDesc] = useState(strategy?.desc ?? "");
  const [saving, setSaving] = useState(false);
  const [editingIdx, setEditingIdx] = useState(null);
  const [editBuf, setEditBuf] = useState({ label: "", detail: "", note: "" });
  const [showAdd, setShowAdd] = useState(false);
  const [newBuf, setNewBuf] = useState({ label: "", detail: "", note: "" });

  // sections: [{ title, col, ref, items: [{ label }] }]
  const [sections, setSections] = useState(() => {
    if (!isEdit)
      return [{ title: "Checklist", col: "gray", ref: false, items: [] }];
    const src =
      (strategy.sections?.length
        ? strategy.sections
        : BUILT_IN_SECTIONS[strategy.id]) ?? [];
    return src.length
      ? src.map((s) => ({
          title: s.title ?? "",
          col: s.col ?? "gray",
          ref: s.ref ?? false,
          items: (s.items ?? []).map((i) => ({
            id: i.id,
            label: i.label ?? "",
            note: i.note ?? null,
            detail: i.detail ?? null,
          })),
        }))
      : [{ title: "Checklist", col: "gray", ref: false, items: [] }];
  });

  const addSection = () =>
    setSections((p) => [
      ...p,
      { title: "", col: "gray", ref: false, items: [{ label: "" }] },
    ]);
  const removeSection = (si) =>
    setSections((p) => p.filter((_, i) => i !== si));
  const updateSection = (si, patch) =>
    setSections((p) => p.map((s, i) => (i === si ? { ...s, ...patch } : s)));
  const addItem = (si) =>
    setSections((p) =>
      p.map((s, i) =>
        i === si ? { ...s, items: [...s.items, { label: "" }] } : s,
      ),
    );
  const removeItem = (si, ii) =>
    setSections((p) =>
      p.map((s, i) =>
        i === si ? { ...s, items: s.items.filter((_, j) => j !== ii) } : s,
      ),
    );
  const updateItem = (si, ii, patch) =>
    setSections((p) =>
      p.map((s, i) =>
        i === si
          ? {
              ...s,
              items: s.items.map((it, j) =>
                j === ii ? { ...it, ...patch } : it,
              ),
            }
          : s,
      ),
    );

  const handleSave = async () => {
    if (!name.trim()) {
      setTab("details");
      return;
    }
    setSaving(true);
    try {
      const builtSections = sections.map((s, si) => ({
        id: `cs-${si}`,
        n: si + 1,
        title: s.title || `Section ${si + 1}`,
        col: s.col,
        ref: s.ref,
        items: s.items.map((it, ii) => ({
          id: it.id ?? `ci-${si}-${ii}`,
          v: null,
          label: it.label ?? "",
          note: it.note ?? null,
          detail: it.detail ?? null,
        })),
      }));
      await onSave({ name: name.trim(), desc: desc.trim() }, builtSections);
    } finally {
      setSaving(false);
    }
  };

  return (
    <LightModal
      title={isEdit ? "Edit Strategy" : "New Strategy"}
      onClose={onClose}
      wide
    >
      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--border)",
          marginBottom: 24,
          marginTop: -8,
        }}
      >
        {[
          ["details", "Strategy Details"],
          [
            "checklist",
            `Checklist${sections.reduce((a, s) => a + s.items.length, 0) ? ` (${sections.reduce((a, s) => a + s.items.length, 0)})` : ""}`,
          ],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              padding: "8px 18px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: tab === id ? 600 : 400,
              color: tab === id ? "var(--green)" : "var(--text-2)",
              borderBottom:
                tab === id ? "2px solid var(--green)" : "2px solid transparent",
              marginBottom: -1,
              fontFamily: "Inter, sans-serif",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Details tab ── */}
      {tab === "details" && (
        <>
          <label style={lbl}>Strategy Name *</label>
          <input
            className="t-inp"
            style={{ marginBottom: 20, fontSize: 15, padding: "12px 14px" }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Resistance Breakout"
            autoFocus
          />
          <label style={lbl}>Description (optional)</label>
          <textarea
            className="t-inp"
            style={{
              height: 100,
              resize: "vertical",
              marginBottom: 28,
              fontSize: 15,
              padding: "12px 14px",
            }}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Briefly describe when you use this strategy…"
          />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              className="btn-outline"
              style={{ padding: "11px 24px", fontSize: 15 }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="btn-outline"
              style={{ padding: "11px 22px", fontSize: 15 }}
              onClick={() => setTab("checklist")}
            >
              Attach Checklist →
            </button>
            <button
              className="btn-green"
              style={{ padding: "11px 28px", fontSize: 15 }}
              onClick={handleSave}
              disabled={!name.trim() || saving}
            >
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Strategy"}
            </button>
          </div>
        </>
      )}

      {/* ── Checklist tab ── */}
      {tab === "checklist" && (
        <>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              maxHeight: 400,
              overflowY: "auto",
              marginBottom: 16,
              paddingRight: 4,
            }}
          >
            {sections[0]?.items.length === 0 && (
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-3)",
                  textAlign: "center",
                  padding: "20px 0",
                }}
              >
                No items yet — add one below.
              </p>
            )}
            {(sections[0]?.items ?? []).map((item, ii) => (
              <div
                key={ii}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  background: "var(--surface-2)",
                }}
              >
                <div style={{ flex: 1 }}>
                  {editingIdx === ii ? (
                    <>
                      <input
                        className="t-inp"
                        style={{ marginBottom: 6, fontSize: 13 }}
                        value={editBuf.label}
                        onChange={(e) =>
                          setEditBuf((p) => ({ ...p, label: e.target.value }))
                        }
                        autoFocus
                      />
                      <textarea
                        className="t-inp"
                        style={{
                          height: 60,
                          resize: "vertical",
                          fontSize: 12,
                          marginBottom: 6,
                        }}
                        placeholder="Description (shown on expand)"
                        value={editBuf.detail ?? ""}
                        onChange={(e) =>
                          setEditBuf((p) => ({ ...p, detail: e.target.value }))
                        }
                      />
                      <input
                        className="t-inp"
                        style={{ fontSize: 12 }}
                        placeholder="Note / hint tag"
                        value={editBuf.note ?? ""}
                        onChange={(e) =>
                          setEditBuf((p) => ({ ...p, note: e.target.value }))
                        }
                      />
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button
                          className="btn-green"
                          style={{ padding: "5px 14px", fontSize: 12 }}
                          onClick={() => {
                            setSections((p) =>
                              p.map((s, si) =>
                                si === 0
                                  ? {
                                      ...s,
                                      items: s.items.map((it, i) =>
                                        i === ii ? { ...it, ...editBuf } : it,
                                      ),
                                    }
                                  : s,
                              ),
                            );
                            setEditingIdx(null);
                          }}
                        >
                          Save
                        </button>
                        <button
                          className="btn-outline"
                          style={{ padding: "5px 12px", fontSize: 12 }}
                          onClick={() => setEditingIdx(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "var(--text)",
                          margin: "0 0 2px",
                        }}
                      >
                        {item.label || (
                          <em style={{ color: "var(--text-3)" }}>Untitled</em>
                        )}
                      </p>
                      {item.detail && (
                        <p
                          style={{
                            fontSize: 12,
                            color: "var(--text-2)",
                            margin: 0,
                            lineHeight: 1.4,
                          }}
                        >
                          {item.detail}
                        </p>
                      )}
                      {item.note && (
                        <span
                          style={{
                            display: "inline-block",
                            marginTop: 4,
                            padding: "2px 7px",
                            background: "var(--surface)",
                            borderRadius: 5,
                            fontSize: 11,
                            color: "var(--text-3)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          {item.note}
                        </span>
                      )}
                    </>
                  )}
                </div>
                {editingIdx !== ii && (
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={() => {
                        setEditingIdx(ii);
                        setEditBuf({
                          label: item.label,
                          detail: item.detail ?? "",
                          note: item.note ?? "",
                        });
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-3)",
                        fontSize: 12,
                        padding: "2px 6px",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() =>
                        setSections((p) =>
                          p.map((s, si) =>
                            si === 0
                              ? {
                                  ...s,
                                  items: s.items.filter((_, i) => i !== ii),
                                }
                              : s,
                          ),
                        )
                      }
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--red)",
                        fontSize: 16,
                        lineHeight: 1,
                        padding: "2px 4px",
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add from library or new */}
          {showAdd ? (
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: 14,
                marginBottom: 16,
                background: "var(--surface-2)",
              }}
            >
              <input
                className="t-inp"
                style={{ marginBottom: 8, fontSize: 13 }}
                placeholder="Label *"
                value={newBuf.label}
                onChange={(e) =>
                  setNewBuf((p) => ({ ...p, label: e.target.value }))
                }
                autoFocus
              />
              <textarea
                className="t-inp"
                style={{
                  height: 60,
                  resize: "vertical",
                  fontSize: 12,
                  marginBottom: 8,
                }}
                placeholder="Description (shown on expand)"
                value={newBuf.detail}
                onChange={(e) =>
                  setNewBuf((p) => ({ ...p, detail: e.target.value }))
                }
              />
              <input
                className="t-inp"
                style={{ fontSize: 12, marginBottom: 10 }}
                placeholder="Note / hint tag"
                value={newBuf.note}
                onChange={(e) =>
                  setNewBuf((p) => ({ ...p, note: e.target.value }))
                }
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn-green"
                  style={{ padding: "6px 16px", fontSize: 13 }}
                  disabled={!newBuf.label.trim()}
                  onClick={() => {
                    const item = {
                      id: `ci-${Date.now()}`,
                      v: null,
                      label: newBuf.label.trim(),
                      note: newBuf.note.trim() || null,
                      detail: newBuf.detail.trim() || null,
                    };
                    setSections((p) => {
                      if (p.length === 0)
                        return [
                          {
                            title: "Checklist",
                            col: "gray",
                            ref: false,
                            items: [item],
                          },
                        ];
                      return p.map((s, i) =>
                        i === 0 ? { ...s, items: [...s.items, item] } : s,
                      );
                    });
                    setNewBuf({ label: "", detail: "", note: "" });
                    setShowAdd(false);
                  }}
                >
                  Add
                </button>
                <button
                  className="btn-outline"
                  style={{ padding: "6px 12px", fontSize: 13 }}
                  onClick={() => setShowAdd(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              style={{
                background: "none",
                border: "1px dashed var(--border-2)",
                borderRadius: 8,
                cursor: "pointer",
                color: "var(--green)",
                fontSize: 13,
                fontWeight: 600,
                padding: "9px 0",
                width: "100%",
                fontFamily: "Inter, sans-serif",
                marginBottom: 16,
              }}
            >
              + Add checklist item
            </button>
          )}

          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              borderTop: "1px solid var(--border)",
              paddingTop: 20,
            }}
          >
            <button
              className="btn-outline"
              style={{ padding: "11px 22px", fontSize: 15 }}
              onClick={() => setTab("details")}
            >
              ← Details
            </button>
            <button
              className="btn-green"
              style={{ padding: "11px 28px", fontSize: 15 }}
              onClick={handleSave}
              disabled={!name.trim() || saving}
            >
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Strategy"}
            </button>
          </div>
        </>
      )}
    </LightModal>
  );
}

export function LightModal({ title, onClose, children, wide }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: 20,
          padding: "32px 36px",
          width: "100%",
          maxWidth: wide ? 640 : 480,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 28,
          }}
        >
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "var(--text)",
              margin: 0,
            }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 22,
              color: "var(--text-3)",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const lbl = {
  display: "block",
  fontSize: 12,
  fontWeight: 500,
  color: "var(--text-2)",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};
