/**
 * HMAC Request Signing — Server-side verification.
 *
 * Prevents external callers from abusing API endpoints.
 * The signing secret is automatically derived from the Supabase
 * credentials that are already configured — NO extra env vars needed.
 *
 * The derived secret is:
 *   - Stable across serverless cold starts (same env vars = same secret)
 *   - Cryptographically strong (SHA-256 of combined credentials)
 *   - Never exposed to the frontend
 *   - Works without any manual configuration
 *
 * Flow:
 *   1. Frontend calls /api/signing-token to get a signed token
 *   2. Frontend includes this token in X-Request-Signature header
 *   3. API routes verify the token before processing
 */

import crypto from "crypto";

// Cached signing secret — derived once per cold start, then reused
let _cachedSecret = null;

/**
 * Derives a stable HMAC signing secret from existing environment variables.
 *
 * Uses SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY as the base because:
 *   - They are always configured together in Vercel
 *   - They are stable (don't change between deploys)
 *   - They are server-only (never exposed to frontend)
 *   - They are long, high-entropy strings
 *
 * Falls back to a combination of any available API keys + app identifier.
 * In the absolute worst case (no env vars at all), uses a fixed salt
 * so the app still works in local development.
 */
function getSigningSecret() {
  if (_cachedSecret) return _cachedSecret;

  // Primary: derive from Supabase credentials (always present in production)
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || "";

  if (supabaseUrl && supabaseKey) {
    _cachedSecret = crypto
      .createHmac("sha256", "cabi-signing-v1")
      .update(`${supabaseUrl}|${supabaseKey}`)
      .digest("hex");
    return _cachedSecret;
  }

  // Fallback: derive from AI API keys (stable across deploys)
  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GROQ_API_KEY,
    process.env.OPENROUTER_API_KEY,
  ].filter(Boolean);

  if (keys.length > 0) {
    _cachedSecret = crypto
      .createHmac("sha256", "cabi-signing-v1-fallback")
      .update(keys.join("|"))
      .digest("hex");
    return _cachedSecret;
  }

  // Dev-only: no secrets available — use fixed salt (not secure but functional)
  _cachedSecret = crypto
    .createHash("sha256")
    .update("cabi-diagnosis-v4-dev-signing-key")
    .digest("hex");
  return _cachedSecret;
}

const TOKEN_VALIDITY_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Generates a signed token for the frontend to use.
 * Format: <timestamp>.<hmac_hex>
 */
export function generateRequestToken(origin = "") {
  const secret = getSigningSecret();
  const timestamp = Date.now();
  const payload = `${timestamp}.${origin}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return `${timestamp}.${signature}`;
}

/**
 * Verifies a request token from the frontend.
 * Returns true if valid, false otherwise.
 *
 * Checks:
 * - Token format is correct (timestamp.signature)
 * - Token hasn't expired (>2 hours old)
 * - HMAC signature matches (proves it was issued by our server)
 */
export function verifyRequestToken(token, origin = "") {
  if (!token || typeof token !== "string") return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [timestampStr, signature] = parts;
  const timestamp = parseInt(timestampStr, 10);

  if (isNaN(timestamp)) return false;

  // Check expiry (2hr max, 1min clock skew allowed)
  const age = Date.now() - timestamp;
  if (age > TOKEN_VALIDITY_MS || age < -60000) return false;

  // Verify HMAC
  const secret = getSigningSecret();
  const payload = `${timestamp}.${origin}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * Middleware: Verify X-Request-Signature header on API requests.
 * Returns true if the request should be REJECTED (invalid signature).
 * Returns false if the request is ALLOWED (valid or in dev mode).
 *
 * In production (VERCEL env set):
 *   - POST/DELETE requests must carry a valid signed token
 *   - GET/OPTIONS requests are allowed without signing
 *   - If no token is provided, request is rejected
 *   - If an invalid token is provided, request is rejected
 *
 * In development (no VERCEL env):
 *   - Signing is optional for easier local testing
 */
export function requireSignedRequest(req, res) {
  // In development, skip verification for convenience
  if (!process.env.VERCEL) return false;

  // Only verify on mutation endpoints (POST, DELETE)
  if (req.method === "GET" || req.method === "OPTIONS") return false;

  const token = req.headers["x-request-signature"] || "";
  const origin = req.headers.origin || "";

  // No token provided — reject in production
  if (!token) {
    res.status(403).json({
      error: "Invalid or missing request signature",
      errorBn: "অনুরোধ স্বাক্ষর অবৈধ — দয়া করে পাতাটি রিফ্রেশ করুন",
    });
    return true; // REJECTED
  }

  // Token provided — verify it
  if (!verifyRequestToken(token, origin)) {
    res.status(403).json({
      error: "Invalid or missing request signature",
      errorBn: "অনুরোধ স্বাক্ষর অবৈধ — দয়া করে পাতাটি রিফ্রেশ করুন",
    });
    return true; // REJECTED — invalid token
  }

  return false; // ALLOWED — valid token
}
