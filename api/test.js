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
 * The admin secret is auto-derived from your Supabase credentials:
 *   First 16 hex chars of HMAC-SHA256("cabi-admin-v1", SUPABASE_URL + "|" + SUPABASE_PUBLISHABLE_KEY)
 *
 * Visit: https://your-app.vercel.app/api/test (with signing token from the app)
 *    or: https://your-app.vercel.app/api/test?admin=YOUR_AUTO_DERIVED_SECRET
 */

import crypto from "crypto";
import { handleCORSPreflight, setCORSHeaders } from "./_lib/cors.js";
import { verifyRequestToken } from "./_lib/requestSigning.js";

// Cached admin secret — derived once per cold start
let _cachedAdminSecret = null;

/**
 * Auto-derives the admin secret from Supabase credentials.
 * Same credentials already configured — no separate env var needed.
 */
function getAdminSecret() {
  if (_cachedAdminSecret) return _cachedAdminSecret;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || "";

  // Primary: derive from Supabase credentials (always configured in production)
  if (supabaseUrl && supabaseKey) {
    _cachedAdminSecret = crypto
      .createHmac("sha256", "cabi-admin-v1")
      .update(`${supabaseUrl}|${supabaseKey}`)
      .digest("hex")
      .slice(0, 24); // 24 hex chars = 96 bits of entropy, plenty for admin access
    return _cachedAdminSecret;
  }

  // Fallback: derive from AI API keys
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

  // Dev-only: no secrets available
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
    // Method 1: Valid signed request (same as other API routes)
    const signatureToken = req.headers["x-request-signature"] || "";
    const origin = req.headers.origin || "";

    // Method 2: Admin secret via query param
    const adminSecret = getAdminSecret();
    const providedAdmin = req.query?.admin || req.headers["x-admin-secret"] || "";

    const hasValidSignature = signatureToken && verifyRequestToken(signatureToken, origin);
    const hasValidAdmin = providedAdmin && providedAdmin === adminSecret;

    if (!hasValidSignature && !hasValidAdmin) {
      return res.status(403).json({
        error: "Access denied — authentication required",
        hint: "Access via: (1) the app with a valid session, or (2) ?admin=YOUR_SECRET",
        secretHint: `Your auto-admin key starts with: ${adminSecret.slice(0, 4)}...`,
      });
    }
  }

  // Check env vars exist — do NOT expose any part of the key values
  const aiReady = !!(process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY);
  const dbReady = !!(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY);

  return res.status(200).json({
    status: aiReady ? "operational" : "degraded",
    timestamp: new Date().toISOString(),
    checks: {
      aiProviders: aiReady ? "configured" : "NOT CONFIGURED — at least one AI API key required",
      database: dbReady ? "configured" : "not configured — analytics will use temp storage",
    },
    version: "4.0.0",
  });
}
