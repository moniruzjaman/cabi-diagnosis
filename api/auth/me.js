/**
 * GET /api/auth/me
 *
 * Returns the signed-in profile from the httpOnly cookie, or { user: null }.
 * Always 200 — never force a login UI.
 */

import { handleCORSPreflight, setCORSHeaders } from "../_lib/cors.js";
import { getUserById } from "../_lib/userStore.js";
import { getSessionUserId, clearSessionCookie, readSessionToken } from "../_lib/session.js";

export default async function handler(req, res) {
  if (handleCORSPreflight(req, res, "GET, OPTIONS")) return;
  setCORSHeaders(req, res, "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const uid = await getSessionUserId(req);
  if (!uid) {
    if (readSessionToken(req)) clearSessionCookie(res);
    return res.status(200).json({ user: null });
  }

  let user;
  try {
    user = await getUserById(uid);
  } catch (e) {
    console.error("[auth/me] DB query failed:", e.message);
    return res.status(200).json({ user: null });
  }

  if (!user) {
    clearSessionCookie(res);
    return res.status(200).json({ user: null });
  }

  return res.status(200).json({ user });
}
