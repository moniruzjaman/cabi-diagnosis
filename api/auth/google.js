/**
 * POST /api/auth/google
 *
 * Verifies a Google ID token (JWT) issued by Google Identity Services,
 * upserts the user in the `users` table (auto-fetching email, name,
 * picture, locale from the verified Google profile), and issues a
 * session JWT stored in an httpOnly cookie.
 *
 * Request body:  { "credential": "<google-id-token-jwt>" }
 * Response 200:  { "user": { id, email, name, picture_url, locale,
 *                             created_at, last_login_at, login_count } }
 * Response 400:  { "error": "Missing Google credential" }
 * Response 401:  { "error": "Invalid/expired token" }
 * Response 503:  { "error": "Database unavailable" }
 *
 * Required env vars:
 *   GOOGLE_CLIENT_ID  — OAuth client ID (must match `aud` in the JWT)
 *   SESSION_SECRET    — 32+ random hex chars for signing session JWTs
 *   TURSO_DATABASE_URL, TURSO_AUTH_TOKEN — for the users table
 */

import { getTursoClient, ensureSchema } from "../_lib/turso.js";
import { signJWT } from "../_lib/jwt.js";
import { handleCORSPreflight, setCORSHeaders } from "../_lib/cors.js";

const SESSION_COOKIE_NAME = "agrichem_session";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

export default async function handler(req, res) {
  // CORS — credentials: true so the cookie is sent cross-origin
  if (handleCORSPreflight(req, res, "POST, OPTIONS")) return;
  setCORSHeaders(req, res, "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { credential } = req.body || {};
  if (!credential || typeof credential !== "string") {
    return res.status(400).json({ error: "Missing Google credential" });
  }

  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const SESSION_SECRET = process.env.SESSION_SECRET;

  if (!GOOGLE_CLIENT_ID || !SESSION_SECRET) {
    console.error("[auth/google] Missing GOOGLE_CLIENT_ID or SESSION_SECRET env var");
    return res.status(500).json({ error: "Server auth not configured" });
  }

  // ── 1. Verify the Google ID token via Google's tokeninfo endpoint ────
  // For high-volume production, swap to google-auth-library for local
  // verification (caches Google's public keys, avoids network round-trip).
  let payload;
  try {
    const resp = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
    );
    if (!resp.ok) {
      return res.status(401).json({ error: "Invalid Google token" });
    }
    payload = await resp.json();
  } catch (e) {
    console.error("[auth/google] Google verification failed:", e.message);
    return res.status(502).json({ error: "Google verification failed" });
  }

  // ── 2. Audience check — token must be for OUR OAuth client ───────────
  if (payload.aud !== GOOGLE_CLIENT_ID) {
    return res.status(401).json({ error: "Token not issued for this app" });
  }

  // ── 3. Expiry check (Google sends `exp` in seconds) ──────────────────
  const expiresAtMs = (payload.exp || 0) * 1000;
  if (expiresAtMs < Date.now()) {
    return res.status(401).json({ error: "Token expired" });
  }

  // `sub` is Google's stable user ID — never changes for a given user,
  // even if they change their email. Required field.
  if (!payload.sub || !payload.email) {
    return res.status(401).json({ error: "Token missing required fields" });
  }

  // ── 4. Upsert user in Turso + update last_login_at ───────────────────
  await ensureSchema();
  const db = getTursoClient();
  if (!db) {
    return res.status(503).json({ error: "Database unavailable" });
  }

  const nowIso = new Date().toISOString();

  // INSERT ... ON CONFLICT(google_sub) DO UPDATE = SQLite UPSERT.
  // - First registration: inserts row with created_at = last_login_at = now
  // - Returning login: updates last_login_at = now, login_count += 1,
  //   refreshes email/name/picture (in case Google profile changed),
  //   and PRESERVES created_at (not in the UPDATE list).
  let user;
  try {
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
        payload.sub,
        payload.email,
        payload.email_verified ? 1 : 0,
        payload.name || null,
        payload.picture || null,
        payload.locale || null,
        nowIso,
        nowIso,
      ],
    });
    user = result.rows[0];
  } catch (e) {
    console.error("[auth/google] DB upsert failed:", e.message);
    return res.status(500).json({ error: "Failed to create/update user" });
  }

  if (!user) {
    return res.status(500).json({ error: "User upsert returned no rows" });
  }

  // ── 5. Issue a session JWT (HMAC-SHA256 signed with SESSION_SECRET) ──
  const sessionPayload = {
    uid: user.id,
    email: user.email,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };
  const sessionToken = await signJWT(sessionPayload, SESSION_SECRET);

  // ── 6. Set httpOnly + Secure + SameSite=Lax cookie ───────────────────
  // HttpOnly: JS can't read it → XSS can't steal the session
  // Secure:   only sent over HTTPS
  // SameSite=Lax: protects against CSRF while allowing top-level navigation
  // Path=/:   available on all routes
  const cookieFlags = [
    `${SESSION_COOKIE_NAME}=${sessionToken}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  ];
  res.setHeader("Set-Cookie", cookieFlags.join("; "));

  // ── 7. Return user profile to the frontend ───────────────────────────
  return res.status(200).json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      picture_url: user.picture_url,
      locale: user.locale,
      created_at: user.created_at,
      last_login_at: user.last_login_at,
      login_count: user.login_count,
    },
  });
}
