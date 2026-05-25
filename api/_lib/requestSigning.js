/**
 * HMAC Request Signing — Server-side verification.
 *
 * Prevents external callers from abusing API endpoints.
 * The frontend generates a time-based HMAC signature using a public app ID
 * combined with a server-side signing secret. Without the secret,
 * external callers cannot produce valid signatures.
 *
 * The signing secret is stored as API_SIGNING_SECRET env var (server-only).
 * If not set, a default is derived — but set it in production for full security.
 *
 * Flow:
 *   1. Frontend calls /api/signing-token to get a signed JWT-like token
 *   2. Frontend includes this token in X-Request-Signature header
 *   3. API routes verify the token before processing
 */

import crypto from "crypto";

// The signing secret — MUST be set via env var in production
// This is NEVER exposed to the frontend
function getSigningSecret() {
  if (process.env.API_SIGNING_SECRET) return process.env.API_SIGNING_SECRET;
  // Fallback: derive from other secrets (less secure but works if env not set)
  const fallback = [
    process.env.GEMINI_API_KEY,
    process.env.GROQ_API_KEY,
    process.env.OPENROUTER_API_KEY,
    "cabi-diagnosis-v4",
  ].filter(Boolean).join("|");
  return crypto.createHash("sha256").update(fallback).digest("hex");
}

const TOKEN_VALIDITY_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Generates a signed token for the frontend to use.
 * The token contains: timestamp + HMAC signature
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
 * - Token format is correct
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

  // Check expiry
  const age = Date.now() - timestamp;
  if (age > TOKEN_VALIDITY_MS || age < -60000) return false; // 2hr max, 1min clock skew

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
 * Signing is enforced ONLY when API_SIGNING_SECRET is explicitly set.
 * Without it, the fallback secret is derived from other keys which can
 * cause cross-instance mismatches on serverless — so we skip enforcement
 * but still accept valid tokens when present.
 */
export function requireSignedRequest(req, res) {
  // In development, skip verification for convenience
  if (!process.env.VERCEL) return false;

  // Only verify on mutation endpoints (POST, DELETE)
  if (req.method === "GET" || req.method === "OPTIONS") return false;

  const token = req.headers["x-request-signature"] || "";
  const origin = req.headers.origin || "";

  // If a token is provided, verify it — reject forged tokens
  if (token) {
    if (!verifyRequestToken(token, origin)) {
      res.status(403).json({
        error: "Invalid or missing request signature",
        errorBn: "অনুরোধ স্বাক্ষর অবৈধ — দয়া করে পাতাটি রিফ্রেশ করুন",
      });
      return true; // REJECTED — token was provided but invalid
    }
    return false; // ALLOWED — valid token
  }

  // No token provided — enforce ONLY when API_SIGNING_SECRET is explicitly set.
  // Without an explicit secret, serverless cold starts can derive different
  // fallback secrets, causing valid tokens to be rejected.
  if (process.env.API_SIGNING_SECRET) {
    res.status(403).json({
      error: "Invalid or missing request signature",
      errorBn: "অনুরোধ স্বাক্ষর অবৈধ — দয়া করে পাতাটি রিফ্রেশ করুন",
    });
    return true; // REJECTED — signing enforced but no token
  }

  // No token, no explicit secret — allow (graceful degradation)
  return false; // ALLOWED
}
