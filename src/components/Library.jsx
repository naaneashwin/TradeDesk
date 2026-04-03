import { useState, useEffect } from "react";
import { uid } from "./ui";
import { getStrategyChecklistItemsForEdit } from "../lib/db";

const ITEM_COLORS = [
  { id: "gray",   hex: "#d1d5db" },
  { id: "indigo", hex: "#a8a4e8" },
  { id: "purple", hex: "#c7c4f0" },
  { id: "blue",   hex: "#93c5fd" },
  { id: "teal",   hex: "#6ee7d4" },
  { id: "amber",  hex: "#fcd34d" },
  { id: "coral",  hex: "#fca5a5" },
  { id: "green",  hex: "#86efac" },
];

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

  const handleSaveStrategy = async ({ name, desc }, entries, isEdit) => {
    if (isEdit) {
      await onUpsert({ ...editTarget, name, desc }, entries);
      setEditTarget(null);
    } else {
      await onUpsert(
        { id: uid(), name, desc, active: true, variants: [], totals: {} },
        entries ?? []
      );
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
          onUpsertChecklistItem={onUpsertChecklistItem}
          onSave={(data, sections) => handleSaveStrategy(data, sections, false)}
        />
      )}
      {editTarget && (
        <StrategyModal
          strategy={editTarget}
          checklistItems={checklistItems}
          onUpsertChecklistItem={onUpsertChecklistItem}
          onClose={() => setEditTarget(null)}
          onSave={(data, sections) => handleSaveStrategy(data, sections, true)}
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

function StrategyModal({ strategy, checklistItems = [], onUpsertChecklistItem, onClose, onSave }) {
  const isEdit = !!strategy;
  const [tab, setTab] = useState("details");
  const [name, setName] = useState(strategy?.name ?? "");
  const [desc, setDesc] = useState(strategy?.desc ?? "");
  const [saving, setSaving] = useState(false);

  // sections: [{ id, name, color, neutral, items: [{ id, label, detail, note, color }] }]
  const [sections, setSections] = useState([]);
  const [checklistLoading, setChecklistLoading] = useState(isEdit);

  // Which section the picker / create panel targets
  const [pickerSectionIdx, setPickerSectionIdx] = useState(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [createSectionIdx, setCreateSectionIdx] = useState(null);
  const [createLabel, setCreateLabel] = useState("");
  const [createDetail, setCreateDetail] = useState("");
  const [createNote, setCreateNote] = useState("");
  const [createColor, setCreateColor] = useState("gray");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isEdit) { setChecklistLoading(false); return; }
    getStrategyChecklistItemsForEdit(strategy.id)
      .then(setSections)
      .catch(console.error)
      .finally(() => setChecklistLoading(false));
  }, []);

  const totalItems = sections.reduce((a, s) => a + s.items.length, 0);
  const allSelectedIds = new Set(sections.flatMap(s => s.items.map(i => i.id)));

  const addSection = () =>
    setSections(prev => [
      ...prev,
      { id: `s-${Date.now()}`, name: "", color: "gray", neutral: false, variant: null, items: [] },
    ]);

  const removeSection = (si) =>
    setSections(prev => prev.filter((_, i) => i !== si));

  const updateSection = (si, patch) =>
    setSections(prev => prev.map((s, i) => i === si ? { ...s, ...patch } : s));

  const pickItem = (ci, si) => {
    setSections(prev => prev.map((s, i) =>
      i === si
        ? { ...s, items: [...s.items, { id: ci.id, label: ci.title, detail: ci.description ?? null, note: ci.note ?? null, color: ci.color ?? "gray" }] }
        : s
    ));
    setPickerSectionIdx(null);
    setPickerSearch("");
  };

  const removeItem = (si, itemId) =>
    setSections(prev => prev.map((s, i) =>
      i === si ? { ...s, items: s.items.filter(it => it.id !== itemId) } : s
    ));

  const createAndAdd = async (si) => {
    if (!createLabel.trim()) return;
    setCreating(true);
    try {
      const saved = await onUpsertChecklistItem({
        title: createLabel.trim(),
        description: createDetail.trim() || null,
        note: createNote.trim() || null,
        color: createColor,
      });
      setSections(prev => prev.map((s, i) =>
        i === si
          ? { ...s, items: [...s.items, { id: saved.id, label: saved.title, detail: saved.description ?? null, note: saved.note ?? null, color: saved.color ?? "gray" }] }
          : s
      ));
      setCreateLabel("");
      setCreateDetail("");
      setCreateNote("");
      setCreateColor("gray");
      setCreateSectionIdx(null);
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { setTab("details"); return; }
    setSaving(true);
    try {
      const sectionsData = sections.map((sec, i) => ({
        id:      sec.id ?? `s-${i}`,
        name:    sec.name || `Section ${i + 1}`,
        color:   sec.color ?? "gray",
        neutral: sec.neutral ?? false,
        variant: sec.variant ?? null,
        items:   sec.items.map(it => it.id),
      }));
      await onSave({ name: name.trim(), desc: desc.trim() }, sectionsData);
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
          ["checklist", `Checklist${totalItems ? ` (${totalItems})` : ""}`],
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
          {checklistLoading ? (
            <p style={{ fontSize: 13, color: "var(--text-3)", textAlign: "center", padding: "32px 0" }}>
              Loading…
            </p>
          ) : (
            <>
              {/* Sections list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                {sections.length === 0 && (
                  <p style={{ fontSize: 13, color: "var(--text-3)", textAlign: "center", padding: "28px 0" }}>
                    No sections yet — click "+ Add Section" below.
                  </p>
                )}

                {sections.map((sec, si) => {
                  const secHex = ITEM_COLORS.find(c => c.id === sec.color)?.hex ?? "#d1d5db";
                  const sectionPickerItems = checklistItems.filter(
                    ci => !allSelectedIds.has(ci.id) && ci.title.toLowerCase().includes(pickerSearch.toLowerCase())
                  );
                  return (
                    <div key={sec.id} style={{ border: "1px solid var(--border)", borderLeft: `3px solid ${secHex}`, borderRadius: 10, overflow: "hidden" }}>
                      {/* Section header */}
                      <div style={{ padding: "9px 12px", background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                        {/* Row 1: name + remove */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
                          <span style={{ width: 10, height: 10, borderRadius: "50%", background: secHex, flexShrink: 0, display: "inline-block" }} />
                          <input
                            value={sec.name}
                            onChange={e => updateSection(si, { name: e.target.value })}
                            placeholder="Section name…"
                            style={{ flex: 1, minWidth: 0, background: "none", border: "none", outline: "none", fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: "Inter, sans-serif" }}
                          />
                          <button
                            onClick={() => removeSection(si)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", fontSize: 18, lineHeight: 1, padding: "0 2px", flexShrink: 0 }}
                          >×</button>
                        </div>
                        {/* Row 2: color swatches + neutral toggle + variant */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                            {ITEM_COLORS.map(c => (
                              <button
                                key={c.id}
                                title={c.id}
                                onClick={() => updateSection(si, { color: c.id })}
                                style={{ width: 16, height: 16, borderRadius: "50%", background: c.hex, border: sec.color === c.id ? "2.5px solid var(--text)" : "2.5px solid transparent", padding: 0, cursor: "pointer", flexShrink: 0 }}
                              />
                            ))}
                          </div>
                          <div style={{ flex: 1 }} />
                          <button
                            onClick={() => updateSection(si, { neutral: !sec.neutral })}
                            style={{
                              padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                              cursor: "pointer", fontFamily: "Inter, sans-serif",
                              border: "1px solid var(--border)",
                              background: sec.neutral ? "rgba(156,163,175,0.15)" : "transparent",
                              color: sec.neutral ? "var(--text-2)" : "var(--text-3)",
                              flexShrink: 0,
                            }}
                          >
                            {sec.neutral ? "⚑ Reference" : "✓ Actionable"}
                          </button>
                          {strategy?.variants?.length > 0 && (
                            <select
                              value={sec.variant ?? ""}
                              onChange={e => updateSection(si, { variant: e.target.value || null })}
                              style={{
                                fontSize: 11, fontWeight: 600, fontFamily: "Inter, sans-serif",
                                padding: "3px 8px", borderRadius: 20, cursor: "pointer",
                                border: "1px solid var(--border)",
                                background: sec.variant ? "rgba(79,110,247,0.1)" : "transparent",
                                color: sec.variant ? "#4f6ef7" : "var(--text-3)",
                                outline: "none", maxWidth: 130,
                              }}
                            >
                              <option value="">All variants</option>
                              {strategy.variants.map(v => (
                                <option key={v.id} value={v.id}>{v.label}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>

                      {/* Items */}
                      <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
                        {sec.items.length === 0 && pickerSectionIdx !== si && createSectionIdx !== si && (
                          <p style={{ fontSize: 12, color: "var(--text-3)", margin: "4px 0 6px" }}>No items — add from library below.</p>
                        )}
                        {sec.items.map(item => {
                          const dotHex = ITEM_COLORS.find(c => c.id === (item.color ?? "gray"))?.hex ?? "#d1d5db";
                          return (
                            <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 8px", borderRadius: 7, background: "var(--surface)" }}>
                              <span style={{ marginTop: 5, width: 7, height: 7, borderRadius: "50%", background: dotHex, flexShrink: 0, display: "inline-block" }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", margin: 0 }}>{item.label}</p>
                                {item.detail && <p style={{ fontSize: 12, color: "var(--text-2)", margin: "2px 0 0", lineHeight: 1.4 }}>{item.detail}</p>}
                                {item.note && (
                                  <span style={{ display: "inline-block", marginTop: 3, padding: "1px 6px", fontSize: 11, color: "var(--text-3)", border: "1px solid var(--border)", borderRadius: 4 }}>{item.note}</span>
                                )}
                              </div>
                              <button
                                onClick={() => removeItem(si, item.id)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0 }}
                              >×</button>
                            </div>
                          );
                        })}

                        {/* Inline picker */}
                        {pickerSectionIdx === si ? (
                          <div style={{ marginTop: 6 }}>
                            <input
                              className="t-inp"
                              style={{ marginBottom: 6, fontSize: 13 }}
                              placeholder="Search library…"
                              value={pickerSearch}
                              onChange={e => setPickerSearch(e.target.value)}
                              autoFocus
                            />
                            <div style={{ maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: 3, marginBottom: 6 }}>
                              {sectionPickerItems.length === 0 ? (
                                <p style={{ fontSize: 12, color: "var(--text-3)", textAlign: "center", padding: "8px 0" }}>
                                  {checklistItems.length === 0 ? "No library items yet." : pickerSearch ? "No matches." : "All items already added."}
                                </p>
                              ) : sectionPickerItems.map(ci => {
                                const hex = ITEM_COLORS.find(c => c.id === (ci.color ?? "gray"))?.hex ?? "#d1d5db";
                                return (
                                  <button
                                    key={ci.id}
                                    onClick={() => pickItem(ci, si)}
                                    style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", textAlign: "left", fontFamily: "Inter, sans-serif" }}
                                  >
                                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: hex, flexShrink: 0 }} />
                                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{ci.title}</span>
                                  </button>
                                );
                              })}
                            </div>
                            <button
                              className="btn-outline"
                              style={{ padding: "5px 12px", fontSize: 12 }}
                              onClick={() => { setPickerSectionIdx(null); setPickerSearch(""); }}
                            >Cancel</button>
                          </div>
                        ) : createSectionIdx === si ? (
                          <div style={{ marginTop: 6 }}>
                            <input className="t-inp" style={{ marginBottom: 6, fontSize: 13 }} placeholder="Label *" value={createLabel} onChange={e => setCreateLabel(e.target.value)} autoFocus />
                            <textarea className="t-inp" style={{ height: 56, resize: "vertical", fontSize: 12, marginBottom: 6 }} placeholder="Description (shown on expand)" value={createDetail} onChange={e => setCreateDetail(e.target.value)} />
                            <input className="t-inp" style={{ fontSize: 12, marginBottom: 8 }} placeholder="Note / hint tag" value={createNote} onChange={e => setCreateNote(e.target.value)} />
                            <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
                              {ITEM_COLORS.map(c => (
                                <button key={c.id} onClick={() => setCreateColor(c.id)} style={{ width: 20, height: 20, borderRadius: "50%", background: c.hex, border: createColor === c.id ? "2px solid var(--text)" : "2px solid transparent", padding: 0, cursor: "pointer" }} />
                              ))}
                            </div>
                            <div style={{ display: "flex", gap: 7 }}>
                              <button className="btn-green" style={{ padding: "6px 14px", fontSize: 12 }} disabled={!createLabel.trim() || creating} onClick={() => createAndAdd(si)}>
                                {creating ? "Saving…" : "Create & Add"}
                              </button>
                              <button className="btn-outline" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => { setCreateSectionIdx(null); setCreateLabel(""); setCreateDetail(""); setCreateNote(""); setCreateColor("gray"); }}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: 7, marginTop: sec.items.length > 0 ? 6 : 0 }}>
                            <button
                              onClick={() => { setPickerSectionIdx(si); setCreateSectionIdx(null); setPickerSearch(""); }}
                              style={{ flex: 1, background: "none", border: "1px dashed var(--border-2)", borderRadius: 7, cursor: "pointer", color: "var(--green)", fontSize: 12, fontWeight: 600, padding: "7px 0", fontFamily: "Inter, sans-serif" }}
                            >+ From library</button>
                            <button
                              onClick={() => { setCreateSectionIdx(si); setPickerSectionIdx(null); }}
                              style={{ flex: 1, background: "none", border: "1px dashed var(--border-2)", borderRadius: 7, cursor: "pointer", color: "var(--text-2)", fontSize: 12, fontWeight: 600, padding: "7px 0", fontFamily: "Inter, sans-serif" }}
                            >+ New item</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add section */}
              <button
                onClick={addSection}
                style={{ width: "100%", background: "none", border: "1px dashed var(--border-2)", borderRadius: 8, cursor: "pointer", color: "var(--text-2)", fontSize: 13, fontWeight: 600, padding: "9px 0", fontFamily: "Inter, sans-serif", marginBottom: 16 }}
              >
                + Add Section
              </button>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid var(--border)", paddingTop: 20 }}>
                <button className="btn-outline" style={{ padding: "11px 22px", fontSize: 15 }} onClick={() => setTab("details")}>
                  ← Details
                </button>
                <button className="btn-green" style={{ padding: "11px 28px", fontSize: 15 }} onClick={handleSave} disabled={!name.trim() || saving}>
                  {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Strategy"}
                </button>
              </div>
            </>
          )}
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
