/**
 * GET /api/auth/me
 *
 * Returns the currently signed-in user's profile, or `{ user: null }` if
 * not authenticated. The frontend calls this on mount to restore the
 * session from the httpOnly cookie (which JS can't read directly).
 *
 * Response 200: { "user": { id, email, name, picture_url, locale,
 *                           created_at, last_login_at, login_count } | null }
 *
 * The `last_login_at` field reflects the user's MOST RECENT successful
 * sign-in (updated by /api/auth/google on every login). To show "you last
 * logged in 2 hours ago", compare this timestamp to the current time.
 */

import { getTursoClient } from "../_lib/turso.js";
import { verifyJWT, readCookie } from "../_lib/jwt.js";
import { handleCORSPreflight, setCORSHeaders } from "../_lib/cors.js";

const SESSION_COOKIE_NAME = "agrichem_session";

export default async function handler(req, res) {
  if (handleCORSPreflight(req, res, "GET, OPTIONS")) return;
  setCORSHeaders(req, res, "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const SESSION_SECRET = process.env.SESSION_SECRET;
  if (!SESSION_SECRET) {
    return res.status(500).json({ error: "Server auth not configured" });
  }

  // ── 1. Read + verify the session cookie ──────────────────────────────
  const cookieHeader = req.headers.cookie || "";
  const sessionToken = readCookie(cookieHeader, SESSION_COOKIE_NAME);

  if (!sessionToken) {
    return res.status(200).json({ user: null });
  }

  const payload = await verifyJWT(sessionToken, SESSION_SECRET);
  if (!payload) {
    // Invalid signature — clear the cookie so the browser stops sending it
    res.setHeader("Set-Cookie", `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
    return res.status(200).json({ user: null });
  }

  // ── 2. Check expiry ──────────────────────────────────────────────────
  const exp = Number(payload.exp || 0);
  if (exp < Date.now()) {
    res.setHeader("Set-Cookie", `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
    return res.status(200).json({ user: null });
  }

  // ── 3. Fetch fresh user data from DB ─────────────────────────────────
  // We do this (rather than trusting the JWT payload) so that:
  //   - last_login_at is always current (the JWT was issued at sign-in)
  //   - name/picture reflect any Google profile changes
  //   - we can detect deleted/disabled accounts
  const db = getTursoClient();
  if (!db) {
    return res.status(503).json({ error: "Database unavailable" });
  }

  let result;
  try {
    result = await db.execute({
      sql: `SELECT id, email, name, picture_url, locale,
                   created_at, last_login_at, login_count
            FROM users WHERE id = ?`,
      args: [payload.uid],
    });
  } catch (e) {
    console.error("[auth/me] DB query failed:", e.message);
    return res.status(500).json({ error: "Database query failed" });
  }

  if (result.rows.length === 0) {
    // User was deleted after the session was issued — clear cookie
    res.setHeader("Set-Cookie", `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
    return res.status(200).json({ user: null });
  }

  return res.status(200).json({ user: result.rows[0] });
}
