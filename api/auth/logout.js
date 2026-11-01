/**
 * POST /api/auth/logout
 * Clears cabi_session and legacy agrichem_session cookies.
 */

import { handleCORSPreflight, setCORSHeaders } from "../_lib/cors.js";
import { clearSessionCookie } from "../_lib/session.js";

export default async function handler(req, res) {
  if (handleCORSPreflight(req, res, "POST, OPTIONS")) return;
  setCORSHeaders(req, res, "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  clearSessionCookie(res);
  return res.status(200).json({ ok: true });
}
