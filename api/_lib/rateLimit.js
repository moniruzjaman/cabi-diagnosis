/**
 * Distributed rate limiter for Vercel Serverless Functions.
 *
 * GAP-02 FIX: Previously the rate limiter used an in-memory Map, which
 * resets on every cold start. This made the 10-req/min cap trivially
 * bypassable via burst traffic. This module now prefers Upstash Redis
 * (when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set) for
 * true distributed limiting, with a graceful fallback to the in-memory
 * Map if those env vars are absent (so the app still works in dev and on
 * the free Hobby tier without extra setup).
 *
 * Usage (unchanged from before):
 *   const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 10 });
 *   if (limiter(req, res)) return; // rate limited — response already sent
 */

import { logWarn, logInfo } from './logger.js';

// ─── Upstash Redis client (loaded lazily, only if env vars present) ──────────
let _upstashClient = null;
let _upstashInitTried = false;

function getUpstashClient() {
  if (_upstashInitTried) return _upstashClient;
  _upstashInitTried = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    // Lightweight fetch-based Upstash client — no SDK dependency to install.
    // Spec: https://docs.upstash.com/redis/features/restapi
    _upstashClient = {
      url,
      token,
      async incr(key) {
        const res = await fetch(`${url}/incr/${encodeURIComponent(key)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Upstash incr ${res.status}`);
        const body = await res.json();
        return Number(body.result);
      },
      async expire(key, seconds) {
        const res = await fetch(`${url}/expire/${encodeURIComponent(key)}/${seconds}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Upstash expire ${res.status}`);
        return true;
      },
    };
    logInfo('ratelimit_upstash_enabled', {});
    return _upstashClient;
  } catch (e) {
    logWarn('ratelimit_upstash_init_failed', { error: e.message });
    return null;
  }
}

// ─── In-memory fallback store (per-instance) ────────────────────────────────
const stores = new Map();

function getStore(key) {
  if (!stores.has(key)) {
    stores.set(key, { count: 0, resetAt: 0 });
  }
  return stores.get(key);
}

/**
 * Creates a rate limiter middleware function.
 *
 * @param {Object} opts
 * @param {number} opts.windowMs  - Time window in milliseconds (default: 60_000)
 * @param {number} opts.maxRequests - Max requests per window per IP (default: 10)
 * @param {string} [opts.name]    - Optional label for log/metrics (e.g. "diagnose")
 * @returns {function} - Returns true if rate limited (429 sent), false otherwise
 */
export function createRateLimiter({ windowMs = 60_000, maxRequests = 10, name = 'default' } = {}) {
  return async function checkRateLimit(req, res) {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.headers["x-real-ip"] ||
      req.socket?.remoteAddress ||
      "unknown";

    const now = Date.now();
    const key = `rl:${name}:${ip}`;

    // Try Upstash first (true distributed limiting)
    const upstash = getUpstashClient();
    if (upstash) {
      try {
        const count = await upstash.incr(key);
        // Set TTL on first request of the window
        if (count === 1) {
          await upstash.expire(key, Math.ceil(windowMs / 1000));
        }
        const remaining = Math.max(0, maxRequests - count);
        const resetAt = now + windowMs;

        res.setHeader("X-RateLimit-Limit", maxRequests);
        res.setHeader("X-RateLimit-Remaining", remaining);
        res.setHeader("X-RateLimit-Reset", new Date(resetAt).toISOString());

        if (count > maxRequests) {
          res.setHeader("Retry-After", Math.ceil((resetAt - now) / 1000));
          res.status(429).json({
            error: "খুব বেশি অনুরোধ হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।",
            errorEn: "Too many requests. Please try again shortly.",
            retryAfter: Math.ceil((resetAt - now) / 1000),
          });
          return true;
        }
        return false;
      } catch (e) {
        // Upstash error → fall back to in-memory (don't fail the request)
        logWarn('ratelimit_upstash_error_fallback', { error: e.message, name });
      }
    }

    // In-memory fallback
    const store = getStore(ip);

    if (now > store.resetAt) {
      store.count = 0;
      store.resetAt = now + windowMs;
    }

    store.count++;

    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - store.count));
    res.setHeader("X-RateLimit-Reset", new Date(store.resetAt).toISOString());

    if (store.count > maxRequests) {
      res.setHeader("Retry-After", Math.ceil((store.resetAt - now) / 1000));
      res.status(429).json({
        error: "খুব বেশি অনুরোধ হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।",
        errorEn: "Too many requests. Please try again shortly.",
        retryAfter: Math.ceil((store.resetAt - now) / 1000),
      });
      return true;
    }

    return false;
  };
}

// Pre-configured limiters for common use cases
export const diagnoseLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10, name: 'diagnose' });
export const feedbackLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 5, name: 'feedback' });
export const analyticsLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 30, name: 'analytics' });
export const presenceLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 30, name: 'presence' });
