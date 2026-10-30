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

import { signJWT, isPreviewDeploy } from "../_lib/jwt.js";
import { handleCORSPreflight, setCORSHeaders } from "../_lib/cors.js";
import { upsertUserProfile } from "../_lib/userStore.js";

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
  const SESSION_SECRET = process.env.SESSION_SECRET || (isPreviewDeploy() ? "preview-session-secret" : "");

  if (!GOOGLE_CLIENT_ID || !SESSION_SECRET) {
    console.error("[auth/google] Missing GOOGLE_CLIENT_ID or SESSION_SECRET env var");
    return res.status(503).json({ error: "Server auth not configured", preview: isPreviewDeploy() });
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

  // ── 4. Upsert user identity only (Turso → Supabase users table → preview) ──
  let user;
  let backend = "unknown";
  try {
    const stored = await upsertUserProfile({
      google_sub: payload.sub,
      email: payload.email,
      email_verified: !!payload.email_verified,
      name: payload.name || null,
      picture_url: payload.picture || null,
      locale: payload.locale || null,
      nowIso: new Date().toISOString(),
    });
    user = stored.user;
    backend = stored.backend;
  } catch (e) {
    console.error("[auth/google] user upsert failed:", e.message);
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
    backend,
  });
}
