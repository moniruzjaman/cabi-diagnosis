/**
 * Admin health-check endpoint.
 *
 * SECURITY:
 * - Requires either:
 *   (a) A valid X-Request-Signature header (same signing as other API routes), OR
 *   (b) An ?admin= query param matching the auto-derived admin secret
 * - No API key values are ever exposed
 * - Does NOT make live AI provider calls (prevents credit burning & info leakage)
 * - Only checks if env vars are set
 *
 * The admin secret is auto-derived from your Turso credentials.
 * Visit: https://your-app.vercel.app/api/test (with signing token from the app)
 *    or: https://your-app.vercel.app/api/test?admin=YOUR_AUTO_DERIVED_SECRET
 */

import crypto from "crypto";
import { handleCORSPreflight, setCORSHeaders } from "./_lib/cors.js";
import { verifyRequestToken } from "./_lib/requestSigning.js";

// Cached admin secret — derived once per cold start
let _cachedAdminSecret = null;

/**
 * Auto-derives the admin secret from Turso credentials.
 * Same credentials already configured — no separate env var needed.
 */
function getAdminSecret() {
  if (_cachedAdminSecret) return _cachedAdminSecret;

  const tursoUrl = process.env.TURSO_DATABASE_URL || "";
  const tursoToken = process.env.TURSO_AUTH_TOKEN || "";

  if (tursoUrl && tursoToken) {
    _cachedAdminSecret = crypto
      .createHmac("sha256", "cabi-admin-v1")
      .update(`${tursoUrl}|${tursoToken}`)
      .digest("hex")
      .slice(0, 24);
    return _cachedAdminSecret;
  }

  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GROQ_API_KEY,
    process.env.OPENROUTER_API_KEY,
  ].filter(Boolean);

  if (keys.length > 0) {
    _cachedAdminSecret = crypto
      .createHmac("sha256", "cabi-admin-v1-fallback")
      .update(keys.join("|"))
      .digest("hex")
      .slice(0, 24);
    return _cachedAdminSecret;
  }

  _cachedAdminSecret = crypto
    .createHash("sha256")
    .update("cabi-diagnosis-v4-dev-admin-key")
    .digest("hex")
    .slice(0, 24);
  return _cachedAdminSecret;
}

export default async function handler(req, res) {
  if (handleCORSPreflight(req, res, "GET, OPTIONS")) return;
  setCORSHeaders(req, res, "GET, OPTIONS");

  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  // In production, require authentication
  if (process.env.VERCEL) {
    const signatureToken = req.headers["x-request-signature"] || "";

    const adminSecret = getAdminSecret();
    const providedAdmin = req.query?.admin || req.headers["x-admin-secret"] || "";

    const hasValidSignature = signatureToken && verifyRequestToken(signatureToken);
    const hasValidAdmin = providedAdmin && crypto.timingSafeEqual(
      Buffer.from(providedAdmin, "utf8"),
      Buffer.from(adminSecret, "utf8")
    );

    if (!hasValidSignature && !hasValidAdmin) {
      return res.status(403).json({
        error: "Access denied — authentication required",
        hint: "Access via: (1) the app with a valid session, or (2) ?admin=YOUR_SECRET",
      });
    }
  }

  // Check env vars exist — do NOT expose any part of the key values
  const aiReady = !!(process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY);
  const dbReady = !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);

  return res.status(200).json({
    status: aiReady ? "operational" : "degraded",
    timestamp: new Date().toISOString(),
    checks: {
      aiProviders: aiReady ? "configured" : "NOT CONFIGURED — at least one AI API key required",
      database: dbReady ? "configured (turso)" : "not configured — analytics will use temp storage",
    },
    version: "4.0.0",
  });
}
