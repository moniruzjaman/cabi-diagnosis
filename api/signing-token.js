/**
 * Request Signing Token Endpoint
 *
 * GET /api/signing-token — returns a time-limited HMAC token that the
 * frontend must include in subsequent API requests via X-Request-Signature header.
 *
 * This prevents external callers from abusing API endpoints because
 * they cannot generate valid signatures without the server-side secret.
 *
 * The token is bound to the request origin and expires after 2 hours.
 * CORS headers already restrict which origins can read the response.
 */

import { handleCORSPreflight, setCORSHeaders } from "./_lib/cors.js";
import { generateRequestToken } from "./_lib/requestSigning.js";

export default async function handler(req, res) {
  if (handleCORSPreflight(req, res, "GET, OPTIONS")) return;
  setCORSHeaders(req, res, "GET, OPTIONS");

  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const origin = req.headers.origin || "";

  // Always issue a token — CORS headers already control which origins
  // can read the response. The origin is baked into the HMAC so tokens
  // are bound to the requesting site.
  const token = generateRequestToken(origin);

  // Set cache headers — token must not be cached
  res.setHeader("Cache-Control", "no-store");

  return res.status(200).json({
    token,
    expiresIn: 7200, // seconds
  });
}
