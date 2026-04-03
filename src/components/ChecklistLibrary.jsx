import { useState } from "react";

function ItemModal({ item, onSave, onClose }) {
  const [label, setLabel] = useState(item?.title ?? "");
  const [detail, setDetail] = useState(item?.description ?? "");
  const [note, setNote] = useState(item?.note ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!label.trim()) return;
    setSaving(true);
    try {
      await onSave({
        ...item,
        title: label.trim(),
        description: detail.trim() || null,
        note: note.trim() || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 300,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: 16,
          padding: "28px 32px",
          width: "100%",
          maxWidth: 520,
          boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--text)",
              margin: 0,
            }}
          >
            {item ? "Edit Item" : "New Checklist Item"}
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

        <label style={lbl}>Label *</label>
        <input
          className="t-inp"
          style={{ marginBottom: 16, fontSize: 14 }}
          placeholder="e.g. Price > 10 EMA > 20 EMA"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          autoFocus
        />

        <label style={lbl}>
          Description{" "}
          <span
            style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}
          >
            (shown on expand)
          </span>
        </label>
        <textarea
          className="t-inp"
          style={{
            height: 80,
            resize: "vertical",
            marginBottom: 16,
            fontSize: 13,
          }}
          placeholder="Detailed explanation shown when the user expands this item…"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
        />

        <label style={lbl}>Note / hint tag</label>
        <input
          className="t-inp"
          style={{ marginBottom: 24, fontSize: 13 }}
          placeholder="e.g. Check on TradingView"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            className="btn-outline"
            style={{ padding: "9px 20px" }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="btn-green"
            style={{ padding: "9px 24px" }}
            onClick={handleSave}
            disabled={!label.trim() || saving}
          >
            {saving ? "Saving…" : item ? "Save Changes" : "Create Item"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChecklistLibrary({ items = [], onUpsert, onDelete }) {
  const [modal, setModal] = useState(null); // null | 'new' | item object
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState("");

  const filtered = items.filter((i) =>
    i.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-3)"
            strokeWidth="2"
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px 8px 30px",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 13,
              color: "var(--text)",
              background: "var(--surface-2)",
              outline: "none",
              fontFamily: "Inter, sans-serif",
            }}
          />
        </div>
        <span style={{ fontSize: 13, color: "var(--text-3)" }}>
          {filtered.length} item{filtered.length !== 1 ? "s" : ""}
        </span>
        <button
          className="btn-green"
          style={{
            padding: "8px 18px",
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginLeft: "auto",
          }}
          onClick={() => setModal("new")}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Item
        </button>
      </div>

      {/* Items list */}
      {filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "64px 0",
            color: "var(--text-3)",
            fontSize: 14,
          }}
        >
          {items.length === 0
            ? 'No checklist items yet. Click "New Item" to create one.'
            : "No items match your search."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((item) => (
            <div
              key={item.id}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "16px 20px",
                display: "flex",
                alignItems: "flex-start",
                gap: 16,
              }}
            >
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--text)",
                    margin: "0 0 4px",
                  }}
                >
                  {item.title}
                </p>
                {item.description && (
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--text-2)",
                      margin: "0 0 6px",
                      lineHeight: 1.5,
                    }}
                  >
                    {item.description}
                  </p>
                )}
                {item.note && (
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      background: "var(--surface-2)",
                      borderRadius: 5,
                      fontSize: 11,
                      color: "var(--text-3)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {item.note}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => setModal(item)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 7,
                    border: "1px solid var(--border-2)",
                    background: "none",
                    cursor: "pointer",
                    fontSize: 12,
                    color: "var(--text-2)",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleteTarget(item)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 7,
                    border: "1px solid rgba(220,38,38,0.3)",
                    background: "none",
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
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      {modal && (
        <ItemModal
          item={modal === "new" ? null : modal}
          onSave={onUpsert}
          onClose={() => setModal(null)}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 300,
            padding: 16,
          }}
          onClick={() => setDeleteTarget(null)}
        >
          <div
            style={{
              background: "var(--surface)",
              borderRadius: 16,
              padding: "28px 32px",
              width: "100%",
              maxWidth: 420,
              boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "var(--text)",
                margin: "0 0 10px",
              }}
            >
              Delete Item?
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-2)",
                marginBottom: 24,
                lineHeight: 1.5,
              }}
            >
              "<strong>{deleteTarget.title}</strong>" will be permanently
              deleted.
            </p>
            <div
              style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
            >
              <button
                className="btn-outline"
                style={{ padding: "9px 20px" }}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                style={{
                  padding: "9px 20px",
                  background: "var(--red)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: 14,
                }}
                onClick={() => {
                  onDelete(deleteTarget.id);
                  setDeleteTarget(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const lbl = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-2)",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};
