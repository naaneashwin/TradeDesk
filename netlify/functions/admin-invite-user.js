import { createClient } from "@supabase/supabase-js";

const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

function getBearerToken(req) {
  const auth = req.headers.get("authorization") || "";
  return auth.replace(/^Bearer\s+/i, "").trim();
}

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...HEADERS,
        "Access-Control-Allow-Methods": "POST,OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: HEADERS,
    });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Supabase server credentials are not configured." }), {
      status: 500,
      headers: HEADERS,
    });
  }

  const token = getBearerToken(req);
  if (!token) {
    return new Response(JSON.stringify({ error: "Missing bearer token." }), {
      status: 401,
      headers: HEADERS,
    });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: HEADERS,
    });
  }

  const requesterId = authData.user.id;
  const { data: roleData, error: roleError } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", requesterId)
    .maybeSingle();

  if (roleError || roleData?.role !== "admin") {
    return new Response(JSON.stringify({ error: "Only admins can invite users." }), {
      status: 403,
      headers: HEADERS,
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400,
      headers: HEADERS,
    });
  }

  const email = (body?.email || "").trim().toLowerCase();
  const roleName = (body?.role || "user").trim().toLowerCase();
  const displayName = (body?.displayName || "").trim();

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return new Response(JSON.stringify({ error: "Valid email is required." }), {
      status: 400,
      headers: HEADERS,
    });
  }

  const { data: targetRole, error: targetRoleError } = await admin
    .from("roles")
    .select("id,name")
    .eq("name", roleName)
    .maybeSingle();

  if (targetRoleError || !targetRole) {
    return new Response(JSON.stringify({ error: `Role '${roleName}' not found.` }), {
      status: 400,
      headers: HEADERS,
    });
  }

  const invitePayload = displayName ? { data: { display_name: displayName } } : undefined;
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, invitePayload);

  if (inviteError || !invited?.user?.id) {
    return new Response(JSON.stringify({ error: inviteError?.message || "Unable to send invite." }), {
      status: 400,
      headers: HEADERS,
    });
  }

  const { error: upsertError } = await admin
    .from("user_roles")
    .upsert(
      {
        user_id: invited.user.id,
        role: targetRole.name,
        role_id: targetRole.id,
        display_name: displayName || null,
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (upsertError) {
    return new Response(JSON.stringify({ error: upsertError.message }), {
      status: 400,
      headers: HEADERS,
    });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      user: {
        id: invited.user.id,
        email: invited.user.email,
      },
      role: targetRole.name,
    }),
    { status: 200, headers: HEADERS },
  );
}

export const config = { path: "/api/admin/invite-user" };
