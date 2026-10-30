/**
 * POST /api/auth/logout
 *
 * Clears the session cookie. The frontend can also just call this for
 * cleanup — the session JWT becomes useless once the cookie is gone
 * (we don't maintain a server-side session store to revoke).
 *
 * Response 200: { "ok": true }
 */

import { handleCORSPreflight, setCORSHeaders } from "../_lib/cors.js";

const SESSION_COOKIE_NAME = "agrichem_session";

export default async function handler(req, res) {
  if (handleCORSPreflight(req, res, "POST, OPTIONS")) return;
  setCORSHeaders(req, res, "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Clear the cookie by setting Max-Age=0
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
  );

  return res.status(200).json({ ok: true });
}
