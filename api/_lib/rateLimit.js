/**
 * Simple IP-based rate limiter for Vercel Serverless Functions.
 * Enhanced with JWT token support for authenticated users.
 *
 * Uses an in-memory Map that persists within a single serverless instance.
 * For true distributed rate limiting across instances, use @upstash/ratelimit
 * with Redis. This implementation provides basic protection within a cold-start
 * lifecycle and is better than no rate limiting at all.
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 10 });
 *   if (limiter(req, res)) return; // rate limited — response already sent
 */

const stores = new Map();

function getStore(key) {
  if (!stores.has(key)) {
    stores.set(key, { count: 0, resetAt: 0 });
  }
  return stores.get(key);
}

/**
 * Extract user identifier from request (JWT token or IP)
 * @param {Object} req - Request object
 * @returns {string} - User identifier
 */
function getUserIdentifier(req) {
  // Try JWT token first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const base64Url = token.split('.')[1];
      if (base64Url) {
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        if (payload.sub) {
          return `user:${payload.sub}`;
        }
      }
    } catch (e) {
      // Invalid token, fall back to IP
    }
  }
  
  // Fall back to IP address
  return `ip:${req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.headers["x-real-ip"] || "unknown"}`;
}

/**
 * Get rate limit tier based on authentication
 * @param {Object} req - Request object
 * @returns {Object} - Rate limit configuration
 */
function getRateLimitTier(req) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return { windowMs: 60_000, maxRequests: 30 }; // Authenticated: 30 req/min
  }
  
  return { windowMs: 60_000, maxRequests: 10 }; // Anonymous: 10 req/min
}

/**
 * Creates a rate limiter middleware function with JWT support.
 * @param {Object} opts
 * @param {number} opts.windowMs  - Time window in milliseconds (default: 60_000)
 * @param {number} opts.maxRequests - Max requests per window per IP (default: 10)
 * @returns {function} - Returns true if rate limited (429 sent), false otherwise
 */
export function createRateLimiter({ windowMs = 60_000, maxRequests = 10 } = {}) {
  return function checkRateLimit(req, res) {
    const userId = getUserIdentifier(req);
    const tier = getRateLimitTier(req);
    
    const now = Date.now();
    const store = getStore(userId);

    // Reset window if expired
    if (now > store.resetAt) {
      store.count = 0;
      store.resetAt = now + tier.windowMs;
    }

    store.count++;

    // Set rate limit headers
    res.setHeader("X-RateLimit-Limit", tier.maxRequests);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, tier.maxRequests - store.count));
    res.setHeader("X-RateLimit-Reset", new Date(store.resetAt).toISOString());

    if (store.count > tier.maxRequests) {
      res.setHeader("Retry-After", Math.ceil((store.resetAt - now) / 1000));
      res.status(429).json({
        error: "খুব বেশি অনুরোধ হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।",
        errorEn: "Too many requests. Please try again shortly.",
        retryAfter: Math.ceil((store.resetAt - now) / 1000),
        authenticated: !!req.headers.authorization?.startsWith('Bearer '),
        limit: tier.maxRequests
      });
      return true;
    }

    return false;
  };
}

// Pre-configured limiters for common use cases
export const diagnoseLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });
export const feedbackLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 5 });
export const analyticsLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 30 });
export const presenceLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 30 });
