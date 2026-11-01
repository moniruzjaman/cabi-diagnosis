/**
 * User-profile store. Persists ONLY identity fields in Supabase app_users.
 * Diagnosis photos, reports, and model weights never go here.
 *
 * Backends:
 *   1. Supabase Auth Admin + app_users — production
 *   2. In-memory — CI / local preview when Supabase is not configured
 */

import {
  hasSupabase,
  supabaseConfig,
  restRequest,
  findAuthUserByEmail,
  findAuthUserByPhone,
  createAuthUser,
} from "./supabase.js";

const PREVIEW_USERS = new Map();

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email || null,
    phone: row.phone || null,
    name: row.name || null,
    picture_url: row.picture_url || null,
    locale: row.locale || null,
    created_at: row.created_at,
    last_login_at: row.last_login_at,
    login_count: Number(row.login_count) || 1,
  };
}

function identityFields(profile) {
  return {
    google_sub: profile.google_sub || null,
    phone: profile.phone || null,
    email: profile.email || null,
    email_verified: !!profile.email_verified,
    name: profile.name || null,
    picture_url: profile.picture_url || null,
    locale: profile.locale || null,
  };
}

async function findAppUser({ id, google_sub, phone, email }) {
  const { table } = supabaseConfig();
  const select =
    "id,google_sub,phone,email,email_verified,name,picture_url,locale,created_at,last_login_at,login_count";
  if (id) {
    const rows = await restRequest(`${table}?id=eq.${encodeURIComponent(id)}&select=${select}`);
    return Array.isArray(rows) ? rows[0] : null;
  }
  if (google_sub) {
    const rows = await restRequest(`${table}?google_sub=eq.${encodeURIComponent(google_sub)}&select=${select}`);
    const row = Array.isArray(rows) ? rows[0] : null;
    if (row) return row;
  }
  if (phone) {
    const rows = await restRequest(`${table}?phone=eq.${encodeURIComponent(phone)}&select=${select}`);
    const row = Array.isArray(rows) ? rows[0] : null;
    if (row) return row;
  }
  if (email) {
    const rows = await restRequest(`${table}?email=eq.${encodeURIComponent(email)}&select=${select}`);
    return Array.isArray(rows) ? rows[0] : null;
  }
  return null;
}

async function ensureAuthUserId(profile) {
  if (profile.auth_id) return profile.auth_id;

  if (profile.phone) {
    const byPhone = await findAuthUserByPhone(profile.phone);
    if (byPhone?.id) return byPhone.id;
  }
  if (profile.email) {
    const byEmail = await findAuthUserByEmail(profile.email);
    if (byEmail?.id) return byEmail.id;
  }

  try {
    const created = await createAuthUser({
      email: profile.email || undefined,
      phone: profile.phone || undefined,
      emailVerified: !!profile.email_verified,
      metadata: {
        google_sub: profile.google_sub || undefined,
        name: profile.name || undefined,
        picture_url: profile.picture_url || undefined,
        locale: profile.locale || undefined,
      },
    });
    if (created?.id) return created.id;
  } catch (err) {
    if (err.status === 422 || err.status === 409) {
      if (profile.email) {
        const existing = await findAuthUserByEmail(profile.email);
        if (existing?.id) return existing.id;
      }
      if (profile.phone) {
        const existing = await findAuthUserByPhone(profile.phone);
        if (existing?.id) return existing.id;
      }
    }
    throw err;
  }
  throw new Error("Failed to resolve auth user id");
}

async function upsertSupabaseUser(profile) {
  const { table } = supabaseConfig();
  const nowIso = profile.nowIso;
  const existing = await findAppUser(profile);
  const authId = existing?.id || (await ensureAuthUserId(profile));
  const fields = identityFields(profile);
  const loginCount = existing ? Number(existing.login_count || 1) + 1 : 1;
  const body = {
    id: authId,
    ...fields,
    google_sub: fields.google_sub || existing?.google_sub || null,
    phone: fields.phone || existing?.phone || null,
    email: fields.email || existing?.email || null,
    name: fields.name || existing?.name || null,
    picture_url: fields.picture_url || existing?.picture_url || null,
    locale: fields.locale || existing?.locale || null,
    last_login_at: nowIso,
    login_count: loginCount,
  };
  if (!existing) body.created_at = nowIso;

  const rows = await restRequest(`${table}?on_conflict=id`, {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body,
  });
  const row = Array.isArray(rows) ? rows[0] : rows;
  return publicUser(row);
}

async function getSupabaseUser(id) {
  const row = await findAppUser({ id });
  return publicUser(row);
}

function upsertMemoryUser(profile) {
  const nowIso = profile.nowIso;
  const existing = [...PREVIEW_USERS.values()].find((u) => {
    if (profile.google_sub && u.google_sub === profile.google_sub) return true;
    if (profile.phone && u.phone === profile.phone) return true;
    if (profile.auth_id && u.id === profile.auth_id) return true;
    return false;
  });
  if (existing) {
    const next = {
      ...existing,
      email: profile.email || existing.email,
      phone: profile.phone || existing.phone,
      google_sub: profile.google_sub || existing.google_sub,
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
    id: profile.auth_id || `preview-${PREVIEW_USERS.size + 1}`,
    google_sub: profile.google_sub || null,
    phone: profile.phone || null,
    email: profile.email || null,
    name: profile.name || null,
    picture_url: profile.picture_url || null,
    locale: profile.locale || null,
    created_at: nowIso,
    last_login_at: nowIso,
    login_count: 1,
  };
  PREVIEW_USERS.set(String(created.id), created);
  return publicUser(created);
}

export { hasSupabase };

export async function upsertUserProfile(profile) {
  const nowIso = profile.nowIso || new Date().toISOString();
  const payload = { ...profile, nowIso };

  if (hasSupabase()) {
    const user = await upsertSupabaseUser(payload);
    return { user, backend: "supabase" };
  }

  return { user: upsertMemoryUser(payload), backend: "preview" };
}

export async function getUserById(id) {
  if (id == null || id === "") return null;
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
    supabase: hasSupabase(),
    google: !!process.env.GOOGLE_CLIENT_ID,
    session: !!process.env.SESSION_SECRET,
  };
}
