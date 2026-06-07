import { supabase } from "./supabase";

// ── Roles ────────────────────────────────────────────────────

/**
 * Returns the role of the current user: 'admin' | 'user'.
 * Falls back to 'user' if no row exists yet (e.g. before the trigger fires).
 */
export async function getUserRole() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_roles")
    .select("role, role_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;

  // Prefer role_id mapping when present so admin checks still work
  // even if only the FK was updated.
  if (data?.role_id) {
    const { data: roleRow, error: roleError } = await supabase
      .from("roles")
      .select("name")
      .eq("id", data.role_id)
      .maybeSingle();

    if (!roleError && roleRow?.name) {
      return String(roleRow.name).trim().toLowerCase();
    }
  }

  if (data?.role) return String(data.role).trim().toLowerCase();
  return "user";
}

// ── Admin: Users ─────────────────────────────────────────────

export async function adminGetUsers() {
  const { data, error } = await supabase
    .rpc("admin_list_users");
  if (error) throw error;
  return (data ?? []).sort((a, b) => {
    const aTs = a?.created_at ? Date.parse(a.created_at) : 0;
    const bTs = b?.created_at ? Date.parse(b.created_at) : 0;
    return bTs - aTs;
  });
}

export async function adminUpdateUserRole(userId, roleText, roleId) {
  const { error } = await supabase
    .from("user_roles")
    .update({ role: roleText, role_id: roleId, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) throw error;
}

export async function adminUpdateUserStatus(userId, status) {
  const { error } = await supabase
    .from("user_roles")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) throw error;
}

export async function adminUpdateUserDisplayName(userId, displayName) {
  const { error } = await supabase
    .from("user_roles")
    .update({ display_name: displayName, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) throw error;
}

export async function adminSoftDeleteUser(userId) {
  const { error } = await supabase
    .from("user_roles")
    .update({ status: "inactive", updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) throw error;
}

export async function adminInviteUser({ email, role = "user", displayName = "" }) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("You must be signed in to invite users.");
  }

  const res = await fetch("/api/admin/invite-user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ email, role, displayName }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || "Failed to invite user.");
  }
  return body;
}

// ── User permissions ─────────────────────────────────────────

/**
 * Returns the permission names granted to the current user's role.
 * Returns an empty array if the user has no role or no permissions.
 */
export async function getUserPermissions() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: urData } = await supabase
    .from("user_roles")
    .select("role_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const roleId = urData?.role_id;
  if (!roleId) return [];

  const { data, error } = await supabase
    .from("role_permissions")
    .select("permissions(name)")
    .eq("role_id", roleId);

  if (error) return [];
  return (data ?? []).map((rp) => rp.permissions?.name).filter(Boolean);
}

// ── Admin: Roles ─────────────────────────────────────────────

export async function adminGetRoles() {
  const { data, error } = await supabase
    .from("roles")
    .select("*, role_permissions(permission_id, permissions(*))")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...r,
    permissions: (r.role_permissions ?? []).map((rp) => rp.permissions),
  }));
}

export async function adminCreateRole({ name, description, color }) {
  const { data, error } = await supabase
    .from("roles")
    .insert({ name, description, color })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function adminUpdateRole(id, { name, description, color }) {
  const { error } = await supabase
    .from("roles")
    .update({ name, description, color })
    .eq("id", id);
  if (error) throw error;
}

export async function adminDeleteRole(id) {
  const { error } = await supabase.from("roles").delete().eq("id", id);
  if (error) throw error;
}

export async function adminSetRolePermissions(roleId, permissionIds) {
  // Delete existing then insert new
  const { error: delError } = await supabase
    .from("role_permissions")
    .delete()
    .eq("role_id", roleId);
  if (delError) throw delError;

  if (permissionIds.length === 0) return;

  const rows = permissionIds.map((pid) => ({ role_id: roleId, permission_id: pid }));
  const { error } = await supabase.from("role_permissions").insert(rows);
  if (error) throw error;
}

// ── Admin: Permissions ────────────────────────────────────────

export async function adminGetPermissions() {
  const { data, error } = await supabase
    .from("permissions")
    .select("*")
    .order("module", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function adminCreatePermission({ name, description, module: mod }) {
  const { data, error } = await supabase
    .from("permissions")
    .insert({ name, description, module: mod })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function adminUpdatePermission(id, { name, description, module: mod }) {
  const { error } = await supabase
    .from("permissions")
    .update({ name, description, module: mod })
    .eq("id", id);
  if (error) throw error;
}

export async function adminDeletePermission(id) {
  const { error } = await supabase.from("permissions").delete().eq("id", id);
  if (error) throw error;
}

// ── Strategies ──────────────────────────────────────────────

export async function getStrategies() {
  const { data, error } = await supabase
    .from("strategies")
    .select("*, strategy_checklist_items(checklist_item_id)")
    .order("created_at", { ascending: true });

  if (error) throw error;
  // Map snake_case DB columns → camelCase app fields
  return data.map(rowToStrategy);
}

export async function upsertStrategy(strategy) {
  const { error } = await supabase
    .from("strategies")
    .upsert(strategyToRow(strategy), { onConflict: "id" });

  if (error) throw error;
}

export async function deleteStrategy(id) {
  const { error } = await supabase.from("strategies").delete().eq("id", id);

  if (error) throw error;
}

// ── Trades ──────────────────────────────────────────────────

export async function getTrades() {
  const { data, error } = await supabase
    .from("trades")
    .select("*")
    .order("date", { ascending: false });

  if (error) throw error;
  return data.map(rowToTrade);
}

export async function insertTrade(trade) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("trades")
    .insert({ ...tradeToRow(trade), user_id: user.id });

  if (error) throw error;
}

export async function updateTrade(trade) {
  const { error } = await supabase
    .from("trades")
    .update(tradeToRow(trade))
    .eq("id", trade.id);

  if (error) throw error;
}

export async function deleteTrade(id) {
  const { error } = await supabase.from("trades").delete().eq("id", id);

  if (error) throw error;
}

// ── Mappers (DB ↔ App) ───────────────────────────────────────

function rowToStrategy(row) {
  return {
    id: row.id,
    name: row.name,
    desc: row.description,
    active: row.active,
    variants: row.variants ?? [],
    totals: row.totals ?? {},
    sections: row.sections ?? [],
    userId: row.user_id,
    checklistItemIds: (row.strategy_checklist_items ?? []).map(
      (r) => r.checklist_item_id,
    ),
  };
}

function strategyToRow(s) {
  // NOTE: `sections` is intentionally excluded — managed exclusively by saveStrategyChecklist
  const row = {
    id: s.id,
    name: s.name,
    description: s.desc,
    active: s.active,
    variants: s.variants,
    totals: s.totals,
  };
  if (s.userId) row.user_id = s.userId;
  return row;
}

function rowToTrade(row) {
  const exits = row.exits ?? [];
  const qty = Number(row.qty) || 0;
  const totalExited = exits.reduce((s, e) => s + (parseFloat(e.qty) || 0), 0);
  // If exits don't cover the full qty, the trade is still open regardless of stored outcome
  const outcome =
    qty > 0 && totalExited < qty && row.outcome !== "open"
      ? "open"
      : row.outcome;

  return {
    id: row.id,
    strategyId: row.strategy_id,
    variant: row.variant,
    checklistScore: row.checklist_score,
    date: row.date,
    instrument: row.instrument,
    direction: row.direction,
    entryPrice: Number(row.entry_price),
    exitPrice: Number(row.exit_price),
    qty,
    outcome,
    pnl: Number(row.pnl),
    notes: row.notes,
    exits,
    mock: row.mock ?? false,
    initialSl: row.initial_sl != null ? Number(row.initial_sl) : null,
    rMult: row.r_mult != null ? Number(row.r_mult) : null,
    commission: row.commission != null ? Number(row.commission) : null,
    screenshotUrl: row.screenshot_url ?? null,
    planThesis: row.plan_thesis ?? null,
    planTarget: row.plan_target != null ? Number(row.plan_target) : null,
    planStop: row.plan_stop != null ? Number(row.plan_stop) : null,
  };
}

function tradeToRow(t) {
  return {
    id: t.id,
    strategy_id: t.strategyId,
    variant: t.variant,
    checklist_score: t.checklistScore,
    date: t.date,
    instrument: t.instrument,
    direction: t.direction,
    entry_price: t.entryPrice,
    exit_price: t.exitPrice,
    qty: t.qty,
    outcome: t.outcome,
    pnl: t.pnl,
    notes: t.notes,
    exits: t.exits ?? [],
    mock: t.mock ?? false,
    initial_sl: t.initialSl ?? null,
    r_mult: t.rMult ?? null,
    commission: t.commission ?? null,
    screenshot_url: t.screenshotUrl ?? null,
    plan_thesis: t.planThesis ?? null,
    plan_target: t.planTarget ?? null,
    plan_stop: t.planStop ?? null,
  };
}

// ── Checklist Items ──────────────────────────────────────────

export async function getChecklistItems() {
  const { data, error } = await supabase
    .from("checklist_items")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description ?? null,
    note: r.note ?? null,
    color: r.color ?? "gray",
  }));
}

export async function upsertChecklistItem(item) {
  const payload = {
    title: item.title,
    description: item.description ?? null,
    note: item.note ?? null,
    color: item.color ?? "gray",
  };
  if (item.id) payload.id = item.id;

  const { data, error } = await supabase
    .from("checklist_items")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    title: data.title,
    description: data.description ?? null,
    note: data.note ?? null,
    color: data.color ?? "gray",
  };
}

export async function deleteChecklistItem(id) {
  const { error } = await supabase
    .from("checklist_items")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ── Strategy ↔ Checklist Links ───────────────────────────────

// Returns sections with expanded item data for the strategy edit modal.
// sections shape: [{ id, name, color, neutral, items: [{ id, label, detail, note, color }] }]
export async function getStrategyChecklistItemsForEdit(strategyId) {
  const { data: stData, error: stError } = await supabase
    .from("strategies")
    .select("sections")
    .eq("id", strategyId)
    .single();

  if (stError) throw stError;

  const sections = stData.sections ?? [];
  const allIds = sections.flatMap((s) => s.items ?? []);
  if (!allIds.length) return sections.map((s) => ({ ...s, items: [] }));

  const { data: ciData, error: ciError } = await supabase
    .from("checklist_items")
    .select("*")
    .in("id", allIds);

  if (ciError) throw ciError;

  const ciMap = Object.fromEntries(ciData.map((r) => [r.id, r]));

  return sections.map((sec) => ({
    id: sec.id,
    name: sec.name ?? "",
    color: sec.color ?? "gray",
    neutral: sec.neutral ?? false,
    variant: sec.variant ?? null,
    items: (sec.items ?? [])
      .map((id) => ciMap[id])
      .filter(Boolean)
      .map((ci) => ({
        id: ci.id,
        label: ci.title,
        detail: ci.description ?? null,
        note: ci.note ?? null,
        color: ci.color ?? "gray",
      })),
  }));
}

// ── In-memory section expanders (no DB calls) ────────────────
// Use these when strategy.sections and checklistItems are already in memory.

// For Checklist.jsx — shaped for the checklist tab
export function expandSectionsForChecklist(sections, checklistItems) {
  const ciMap = Object.fromEntries(checklistItems.map((ci) => [ci.id, ci]));
  return sections
    .map((sec, i) => ({
      id: sec.id ?? `sec-${i}`,
      n: i + 1,
      title: sec.name || `Section ${i + 1}`,
      col: sec.color ?? "gray",
      neutral: sec.neutral ?? false,
      ref: sec.neutral ?? false,
      variant: sec.variant ?? null,
      items: (sec.items ?? [])
        .map((id) => ciMap[id])
        .filter(Boolean)
        .map((ci) => ({
          id: ci.id,
          label: ci.title,
          detail: ci.description ?? null,
          note: ci.note ?? null,
          color: ci.color ?? "gray",
          v: null,
        })),
    }))
    .filter((sec) => sec.items.length > 0);
}

// For Library.jsx edit modal — shaped for the edit form
export function expandSectionsForEdit(sections, checklistItems) {
  const ciMap = Object.fromEntries(checklistItems.map((ci) => [ci.id, ci]));
  return sections.map((sec) => ({
    id: sec.id,
    name: sec.name ?? "",
    color: sec.color ?? "gray",
    neutral: sec.neutral ?? false,
    variant: sec.variant ?? null,
    items: (sec.items ?? [])
      .map((id) => ciMap[id])
      .filter(Boolean)
      .map((ci) => ({
        id: ci.id,
        label: ci.title,
        detail: ci.description ?? null,
        note: ci.note ?? null,
        color: ci.color ?? "gray",
      })),
  }));
}

// Returns sections array for Checklist.jsx.
// Reads from strategies.sections JSON, expands item UUIDs via checklist_items.
/** @deprecated Use expandSectionsForChecklist() instead — avoids redundant DB queries */
export async function getStrategyChecklistSections(strategyId) {
  const { data: stData, error: stError } = await supabase
    .from("strategies")
    .select("sections")
    .eq("id", strategyId)
    .single();

  if (stError) throw stError;

  const sections = stData.sections ?? [];
  const allIds = sections.flatMap((s) => s.items ?? []);
  if (!allIds.length) return [];

  const { data: ciData, error: ciError } = await supabase
    .from("checklist_items")
    .select("*")
    .in("id", allIds);

  if (ciError) throw ciError;

  const ciMap = Object.fromEntries(ciData.map((r) => [r.id, r]));

  return sections
    .map((sec, i) => ({
      id: sec.id ?? `sec-${i}`,
      n: i + 1,
      title: sec.name || `Section ${i + 1}`,
      col: sec.color ?? "gray",
      neutral: sec.neutral ?? false,
      ref: sec.neutral ?? false, // Checklist.jsx reads .ref for no-checkbox logic
      variant: sec.variant ?? null, // null = all variants; set = only shown for that variant
      items: (sec.items ?? [])
        .map((id) => ciMap[id])
        .filter(Boolean)
        .map((ci) => ({
          id: ci.id,
          label: ci.title,
          detail: ci.description ?? null,
          note: ci.note ?? null,
          color: ci.color ?? "gray",
          v: null,
        })),
    }))
    .filter((sec) => sec.items.length > 0);
}

// sections: [{ id, name, color, neutral, items: [uuid, ...] }]
// Saves the sections JSON to strategies.sections and syncs the join table
// (for Used-by badge queries). Passing null/undefined is a no-op.
export async function saveStrategyChecklist(strategyId, sections) {
  if (sections == null) return;

  // Save structured sections JSON to the strategy row
  const { error: stError } = await supabase
    .from("strategies")
    .update({ sections })
    .eq("id", strategyId);
  if (stError) throw stError;

  // Sync join table so checklistItemIds / Used-by badge stays accurate
  const { error: delError } = await supabase
    .from("strategy_checklist_items")
    .delete()
    .eq("strategy_id", strategyId);
  if (delError) throw delError;

  const allItemIds = sections.flatMap((s) => s.items ?? []);
  if (!allItemIds.length) return;

  const rows = allItemIds.map((itemId, i) => ({
    strategy_id: strategyId,
    checklist_item_id: itemId,
    position: i,
  }));

  const { error } = await supabase
    .from("strategy_checklist_items")
    .insert(rows);
  if (error) throw error;
}

// ── User Preferences ─────────────────────────────────────────

export async function getUserPreferences() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_preferences")
    .select("total_investment, capital_per_trade")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return {
    totalInvestment:
      data.total_investment != null ? String(data.total_investment) : "",
    capitalPerTrade:
      data.capital_per_trade != null ? String(data.capital_per_trade) : "",
  };
}

export async function getCustomExitStrategies() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("user_preferences")
    .select("custom_exit_strategies")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return Array.isArray(data?.custom_exit_strategies)
    ? data.custom_exit_strategies
    : [];
}

export async function addCustomExitStrategy(label) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Upsert the row first (in case preferences row doesn't exist yet), then append via jsonb concat
  await supabase
    .from("user_preferences")
    .upsert(
      { user_id: user.id, custom_exit_strategies: [] },
      { onConflict: "user_id", ignoreDuplicates: true },
    );

  const { data, error: fetchErr } = await supabase
    .from("user_preferences")
    .select("custom_exit_strategies")
    .eq("user_id", user.id)
    .single();

  if (fetchErr) throw fetchErr;

  const existing = Array.isArray(data.custom_exit_strategies)
    ? data.custom_exit_strategies
    : [];
  if (existing.includes(label)) return; // already stored

  const { error } = await supabase
    .from("user_preferences")
    .update({
      custom_exit_strategies: [...existing, label],
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) throw error;
}

export async function upsertUserPreferences({
  totalInvestment,
  capitalPerTrade,
  accountSize,
  dailyLossLimit,
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from("user_preferences").upsert(
    {
      user_id: user.id,
      total_investment: totalInvestment ? parseFloat(totalInvestment) : null,
      capital_per_trade: capitalPerTrade ? parseFloat(capitalPerTrade) : null,
      account_size: accountSize ? parseFloat(accountSize) : null,
      daily_loss_limit: dailyLossLimit ? parseFloat(dailyLossLimit) : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) throw error;
}

export async function getUserPreferencesFull() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const { data, error } = await supabase
    .from("user_preferences")
    .select(
      "total_investment, capital_per_trade, account_size, daily_loss_limit",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return {};
  return {
    totalInvestment:
      data.total_investment != null ? String(data.total_investment) : "",
    capitalPerTrade:
      data.capital_per_trade != null ? String(data.capital_per_trade) : "",
    accountSize: data.account_size != null ? String(data.account_size) : "",
    dailyLossLimit:
      data.daily_loss_limit != null ? String(data.daily_loss_limit) : "",
  };
}

// ── Logged Symbols (broker holdings marked as logged) ─────────
// snapshot_key = "SYMBOL|EXCHANGE|QTY" — auto-invalidates when qty changes

export async function getLoggedSymbols() {
  const { data, error } = await supabase
    .from("logged_symbols")
    .select("snapshot_key, symbol, exchange, qty, logged_at");
  if (error) throw error;
  return data ?? [];
}

export async function addLoggedSymbol(symbol, exchange, qty, avgPrice) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const snapshot_key = `${symbol}|${exchange ?? ""}|${qty ?? ""}|${avgPrice ?? ""}`;
  const { error } = await supabase
    .from("logged_symbols")
    .upsert(
      {
        user_id: user.id,
        snapshot_key,
        symbol,
        exchange: exchange ?? null,
        qty: qty ?? null,
      },
      { onConflict: "user_id,snapshot_key" },
    );
  if (error) throw error;
}

export async function removeLoggedSymbol(snapshotKey) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("logged_symbols")
    .delete()
    .eq("user_id", user.id)
    .eq("snapshot_key", snapshotKey);
  if (error) throw error;
}

// ── Watchlist ─────────────────────────────────────────────────

export async function getWatchlist() {
  const { data, error } = await supabase
    .from("watchlist")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(rowToWatchlistItem);
}

export async function upsertWatchlistItem(item) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const payload = {
    user_id: user.id,
    symbol: item.symbol.toUpperCase().trim(),
    reason: item.reason ?? null,
    entry_notes: item.entryNotes ?? null,
    target: item.target ?? null,
    stop: item.stop ?? null,
    tags: item.tags ?? [],
    status: item.status ?? "watching",
    pinned: item.pinned ?? false,
    added_at: item.addedAt ?? new Date().toISOString().slice(0, 10),
    updated_at: new Date().toISOString(),
  };
  if (item.id) payload.id = item.id;

  const { data, error } = await supabase
    .from("watchlist")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return rowToWatchlistItem(data);
}

export async function deleteWatchlistItem(id) {
  const { error } = await supabase.from("watchlist").delete().eq("id", id);
  if (error) throw error;
}

function rowToWatchlistItem(row) {
  return {
    id: row.id,
    symbol: row.symbol,
    reason: row.reason ?? "",
    entryNotes: row.entry_notes ?? "",
    target: row.target != null ? Number(row.target) : null,
    stop: row.stop != null ? Number(row.stop) : null,
    tags: row.tags ?? [],
    status: row.status ?? "watching",
    pinned: row.pinned ?? false,
    addedAt: row.added_at,
    createdAt: row.created_at,
  };
}

// ── Scanners ─────────────────────────────────────────────────

export async function getScanners(strategyId) {
  const { data, error } = await supabase
    .from("scanners")
    .select("*")
    .eq("strategy_id", strategyId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map((r) => ({
    id: r.id,
    strategyId: r.strategy_id,
    name: r.name,
    url: r.url,
    description: r.description ?? "",
    tags: r.tags ?? [],
  }));
}

export async function upsertScanner(scanner) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase.from("scanners").upsert(
    {
      id: scanner.id,
      strategy_id: scanner.strategyId,
      user_id: user.id,
      name: scanner.name,
      url: scanner.url,
      description: scanner.description || null,
      tags: scanner.tags ?? [],
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

export async function deleteScanner(id) {
  const { error } = await supabase.from("scanners").delete().eq("id", id);
  if (error) throw error;
}
