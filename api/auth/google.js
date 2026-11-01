/**
 * POST /api/auth/google
 *
 * Verifies a Google ID token, upserts identity in Supabase app_users,
 * issues a 1-year httpOnly cookie, and returns a one-time deviceSecret.
 */

import { handleCORSPreflight, setCORSHeaders } from "../_lib/cors.js";
import { upsertUserProfile } from "../_lib/userStore.js";
import { setSessionCookie, signSessionToken, getSessionSecret } from "../_lib/session.js";
import { createDeviceEnrollment } from "../_lib/turso.js";

export default async function handler(req, res) {
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
  if (!GOOGLE_CLIENT_ID || !getSessionSecret()) {
    console.error("[auth/google] Missing GOOGLE_CLIENT_ID or SESSION_SECRET env var");
    return res.status(503).json({ error: "Server auth not configured" });
  }

  let payload;
  try {
    const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!resp.ok) {
      return res.status(401).json({ error: "Invalid Google token" });
    }
    payload = await resp.json();
  } catch (e) {
    console.error("[auth/google] Google verification failed:", e.message);
    return res.status(502).json({ error: "Google verification failed" });
  }

  if (payload.aud !== GOOGLE_CLIENT_ID) {
    return res.status(401).json({ error: "Token not issued for this app" });
  }

  const expiresAtMs = (payload.exp || 0) * 1000;
  if (expiresAtMs < Date.now()) {
    return res.status(401).json({ error: "Token expired" });
  }

  if (!payload.sub || !payload.email) {
    return res.status(401).json({ error: "Token missing required fields" });
  }

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

  const sessionToken = await signSessionToken(user.id);
  if (!sessionToken) {
    return res.status(503).json({ error: "Server auth not configured" });
  }
  setSessionCookie(res, sessionToken);

  const deviceSecret = await createDeviceEnrollment(user.id);

  return res.status(200).json({
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      picture_url: user.picture_url,
      locale: user.locale,
      created_at: user.created_at,
      last_login_at: user.last_login_at,
      login_count: user.login_count,
    },
    deviceSecret,
    backend,
  });
}
