/**
 * Supabase REST + Auth Admin helpers.
 * Service role only. Never used from the browser.
 */

export function hasSupabase() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function supabaseConfig() {
  const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const table = process.env.SUPABASE_USERS_TABLE || "app_users";
  return { url, key, table };
}

async function supabaseFetch(path, { method = "GET", body, prefer, extraHeaders } = {}) {
  const { url, key } = supabaseConfig();
  if (!url || !key) return null;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(extraHeaders || {}),
  };
  if (prefer) headers.Prefer = prefer;
  const resp = await fetch(`${url}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await resp.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!resp.ok) {
    const msg = json?.msg || json?.message || json?.error_description || json?.error || text.slice(0, 200);
    const err = new Error(`Supabase ${resp.status}: ${msg}`);
    err.status = resp.status;
    err.body = json;
    throw err;
  }
  return json;
}

export async function restRequest(path, opts) {
  return supabaseFetch(`/rest/v1/${path}`, opts);
}

export async function authAdmin(path, opts) {
  return supabaseFetch(`/auth/v1${path}`, opts);
}

export async function findAuthUserByEmail(email) {
  if (!email) return null;
  const data = await authAdmin(`/admin/users?page=1&per_page=50&email=${encodeURIComponent(email)}`);
  const users = data?.users || (Array.isArray(data) ? data : []);
  return users.find((u) => (u.email || "").toLowerCase() === email.toLowerCase()) || null;
}

export async function findAuthUserByPhone(phone) {
  if (!phone) return null;
  const data = await authAdmin(`/admin/users?page=1&per_page=50&phone=${encodeURIComponent(phone)}`);
  const users = data?.users || (Array.isArray(data) ? data : []);
  return users.find((u) => u.phone === phone) || null;
}

export async function createAuthUser({ email, phone, emailVerified, metadata }) {
  const body = {
    email_confirm: !!emailVerified || !!email,
    phone_confirm: !!phone,
    user_metadata: metadata || {},
  };
  if (email) body.email = email;
  if (phone) body.phone = phone;
  return authAdmin("/admin/users", { method: "POST", body });
}

export async function sendPhoneOtp(phone) {
  return authAdmin("/otp", { method: "POST", body: { phone } });
}

export async function verifyPhoneOtp(phone, token) {
  return authAdmin("/verify", {
    method: "POST",
    body: { type: "sms", phone, token },
  });
}
