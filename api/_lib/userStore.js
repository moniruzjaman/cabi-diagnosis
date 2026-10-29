/**
 * User-profile store. Auth providers persist ONLY identity fields
 * (google_sub, email, name, picture, locale, login timestamps).
 * Diagnosis photos, reports, and model weights never go here.
 *
 * Backends (first available wins for writes; both may be used):
 *   1. Turso SQLite  — production default
 *   2. Supabase REST — optional, users table only (preview / branch)
 *   3. In-memory     — CI / local preview when no DB is configured
 */

import { getTursoClient, ensureSchema } from "./turso.js";

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

export function hasSupabase() {
  return !!(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY));
}

function supabaseConfig() {
  const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
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

async function upsertSupabaseUser(profile) {
  const { table } = supabaseConfig();
  const nowIso = profile.nowIso;
  const rows = await supabaseRequest(`${table}?on_conflict=google_sub`, {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      google_sub: profile.google_sub,
      email: profile.email,
      email_verified: profile.email_verified ? true : false,
      name: profile.name,
      picture_url: profile.picture_url,
      locale: profile.locale,
      last_login_at: nowIso,
    },
  });
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (!row) return null;
  return publicUser({
    id: row.id,
    email: row.email,
    name: row.name,
    picture_url: row.picture_url,
    locale: row.locale,
    created_at: row.created_at,
    last_login_at: row.last_login_at,
    login_count: row.login_count || 1,
  });
}

async function getSupabaseUser(id) {
  const { table } = supabaseConfig();
  const rows = await supabaseRequest(
    `${table}?id=eq.${encodeURIComponent(id)}&select=id,email,name,picture_url,locale,created_at,last_login_at,login_count`,
  );
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

export async function upsertUserProfile(profile) {
  const nowIso = profile.nowIso || new Date().toISOString();
  const payload = { ...profile, nowIso };

  await ensureSchema();
  const db = getTursoClient();
  if (db) {
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
        payload.google_sub,
        payload.email,
        payload.email_verified ? 1 : 0,
        payload.name || null,
        payload.picture_url || null,
        payload.locale || null,
        nowIso,
        nowIso,
      ],
    });
    const user = publicUser(result.rows[0]);
    if (hasSupabase()) {
      try {
        await upsertSupabaseUser(payload);
      } catch (err) {
        console.warn("[userStore] supabase sync skipped:", err.message);
      }
    }
    return { user, backend: "turso" };
  }

  if (hasSupabase()) {
    const user = await upsertSupabaseUser(payload);
    return { user, backend: "supabase" };
  }

  return { user: upsertMemoryUser(payload), backend: "preview" };
}

export async function getUserById(id) {
  if (id == null || id === "") return null;
  await ensureSchema();
  const db = getTursoClient();
  if (db) {
    const result = await db.execute({
      sql: `SELECT id, email, name, picture_url, locale,
                   created_at, last_login_at, login_count
            FROM users WHERE id = ?`,
      args: [id],
    });
    return publicUser(result.rows[0]);
  }
  if (hasSupabase()) {
    try {
      return await getSupabaseUser(id);
    } catch (err) {
      console.warn("[userStore] supabase read skipped:", err.message);
    }
  }
  return publicUser(PREVIEW_USERS.get(String(id)) || null);
}

export function authStatus() {
  return {
    turso: !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN),
    supabase: hasSupabase(),
    google: !!process.env.GOOGLE_CLIENT_ID,
    session: !!process.env.SESSION_SECRET,
  };
}
