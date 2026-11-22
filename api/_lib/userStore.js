/**
 * User-profile store.
 *
 * Supabase is the authoritative store for authenticated user identity/profile
 * data. Turso remains the application-data store and a resilience fallback for
 * sign-in when Supabase is temporarily unavailable. Diagnosis images, reports,
 * model weights, and shared analytics never go to Supabase.
 *
 * Backends:
 *   1. Supabase REST — primary user/profile store (server-side service key)
 *   2. Turso SQLite  — fallback user identity store + all application data
 *   3. In-memory     — local preview/CI only when neither database is configured
 */

import { getTursoClient, ensureSchema, hasTurso } from "./turso.js";

const PREVIEW_USERS = new Map();

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name || null,
    picture_url: row.picture_url || null,
    locale: row.locale || null,
    created_at: row.created_at,
    last_login_at: row.last_login_at,
    login_count: Number(row.login_count) || 1,
  };
}

// Writes require the server-only service role. The anon key cannot safely
// upsert users because the custom Google/httpOnly-cookie session is not a
// Supabase Auth session and therefore cannot satisfy auth.uid()-based RLS.
export function hasSupabase() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseConfig() {
  const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const table = process.env.SUPABASE_USERS_TABLE || "app_users";
  return { url, key, table };
}

async function supabaseRequest(path, { method = "GET", body, prefer } = {}) {
  const { url, key } = supabaseConfig();
  if (!url || !key) return null;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (prefer) headers.Prefer = prefer;
  const resp = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Supabase ${resp.status}: ${text.slice(0, 200)}`);
  }
  const text = await resp.text();
  return text ? JSON.parse(text) : null;
}

const PROFILE_FIELDS = "id,email,name,picture_url,locale,created_at,last_login_at,login_count";

async function upsertSupabaseUser(profile) {
  const { table } = supabaseConfig();
  const nowIso = profile.nowIso;
  const identity = encodeURIComponent(profile.google_sub);
  const existingRows = await supabaseRequest(`${table}?google_sub=eq.${identity}&select=${PROFILE_FIELDS}&limit=1`);
  const existing = Array.isArray(existingRows) ? existingRows[0] : null;

  const body = {
    google_sub: profile.google_sub,
    email: profile.email,
    email_verified: profile.email_verified ? true : false,
    name: profile.name || null,
    picture_url: profile.picture_url || null,
    locale: profile.locale || null,
    last_login_at: nowIso,
    login_count: existing ? Number(existing.login_count || 1) + 1 : 1,
  };

  const rows = existing
    ? await supabaseRequest(`${table}?id=eq.${encodeURIComponent(existing.id)}`, {
        method: "PATCH",
        prefer: "return=representation",
        body,
      })
    : await supabaseRequest(`${table}?on_conflict=google_sub`, {
        method: "POST",
        prefer: "return=representation",
        body,
      });

  const row = Array.isArray(rows) ? rows[0] : rows;
  return publicUser(row || existing);
}

async function getSupabaseUser(id, googleSub = "") {
  const { table } = supabaseConfig();
  const filter = googleSub ? `google_sub=eq.${encodeURIComponent(googleSub)}` : `id=eq.${encodeURIComponent(id)}`;
  const rows = await supabaseRequest(`${table}?${filter}&select=${PROFILE_FIELDS}&limit=1`);
  const row = Array.isArray(rows) ? rows[0] : null;
  return publicUser(row);
}

function upsertMemoryUser(profile) {
  const existing = [...PREVIEW_USERS.values()].find((u) => u.google_sub === profile.google_sub);
  const nowIso = profile.nowIso;
  if (existing) {
    const next = {
      ...existing,
      email: profile.email,
      name: profile.name || existing.name,
      picture_url: profile.picture_url || existing.picture_url,
      locale: profile.locale || existing.locale,
      last_login_at: nowIso,
      login_count: (existing.login_count || 1) + 1,
    };
    PREVIEW_USERS.set(String(next.id), next);
    return publicUser(next);
  }
  const created = {
    id: `preview-${PREVIEW_USERS.size + 1}`,
    google_sub: profile.google_sub,
    email: profile.email,
    name: profile.name,
    picture_url: profile.picture_url,
    locale: profile.locale,
    created_at: nowIso,
    last_login_at: nowIso,
    login_count: 1,
  };
  PREVIEW_USERS.set(String(created.id), created);
  return publicUser(created);
}

async function upsertTursoUser(profile) {
  await ensureSchema();
  const db = getTursoClient();
  if (!db) return null;
  const result = await db.execute({
    sql: `INSERT INTO users
            (google_sub, email, email_verified, name, picture_url, locale,
             created_at, last_login_at, login_count)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
          ON CONFLICT(google_sub) DO UPDATE SET
            email = excluded.email,
            email_verified = excluded.email_verified,
            name = COALESCE(excluded.name, users.name),
            picture_url = COALESCE(excluded.picture_url, users.picture_url),
            locale = COALESCE(excluded.locale, users.locale),
            last_login_at = excluded.last_login_at,
            login_count = users.login_count + 1
          RETURNING id, email, name, picture_url, locale,
                    created_at, last_login_at, login_count`,
    args: [
      profile.google_sub,
      profile.email,
      profile.email_verified ? 1 : 0,
      profile.name || null,
      profile.picture_url || null,
      profile.locale || null,
      profile.nowIso,
      profile.nowIso,
    ],
  });
  return publicUser(result.rows[0]);
}

export async function upsertUserProfile(profile) {
  const payload = { ...profile, nowIso: profile.nowIso || new Date().toISOString() };

  // Supabase is authoritative whenever it is configured. If it is temporarily
  // unavailable, keep sign-in available through Turso and log the failover.
  if (hasSupabase()) {
    try {
      const user = await upsertSupabaseUser(payload);
      if (user) return { user, backend: "supabase" };
    } catch (err) {
      console.warn("[userStore] supabase primary unavailable; falling back:", err.message);
    }
  }

  const tursoUser = await upsertTursoUser(payload);
  if (tursoUser) return { user: tursoUser, backend: "turso-fallback" };

  return { user: upsertMemoryUser(payload), backend: "preview" };
}

export async function getUserById(id, googleSub = "") {
  if ((id == null || id === "") && !googleSub) return null;

  // Prefer identity lookup when present so a session minted during Turso
  // failover still resolves after Supabase becomes healthy again.
  if (hasSupabase()) {
    try {
      const user = await getSupabaseUser(id, googleSub);
      if (user) return user;
    } catch (err) {
      console.warn("[userStore] supabase read unavailable; falling back:", err.message);
    }
  }

  await ensureSchema();
  const db = getTursoClient();
  if (db) {
    const result = await db.execute({
      sql: googleSub
        ? `SELECT id, email, name, picture_url, locale, created_at, last_login_at, login_count
           FROM users WHERE google_sub = ?`
        : `SELECT id, email, name, picture_url, locale, created_at, last_login_at, login_count
           FROM users WHERE id = ?`,
      args: [googleSub || id],
    });
    return publicUser(result.rows[0]);
  }

  return publicUser(PREVIEW_USERS.get(String(id)) || null);
}

export function authStatus() {
  return {
    turso: hasTurso(),
    supabase: hasSupabase(),
    google: !!process.env.GOOGLE_CLIENT_ID,
    session: !!process.env.SESSION_SECRET,
  };
}
