/**
 * @module _lib/logger
 * @description
 * Structured JSON logger for Vercel serverless functions.
 *
 * GAP-10 FIX: Previously the API layer logged only via raw `console.error`,
 * producing unstructured blobs in Vercel's log viewer. This module emits
 * one-line JSON objects with stable fields, so logs can be filtered,
 * aggregated, and alerted on (provider fallback rate, latency, error rate).
 *
 * Each log line is a self-contained JSON object with these fields:
 *   {
 *     timestamp: ISO string,
 *     level: "info" | "warn" | "error",
 *     event: short event name (e.g. "provider_fallback", "request_start"),
 *     route: API route name (e.g. "diagnose"),
 *     duration_ms?: number,
 *     provider?: string,
 *     ...arbitrary extra fields,
 *   }
 *
 * Usage:
 *   import { logInfo, logWarn, logError } from './_lib/logger.js';
 *   logInfo('request_start', { route: 'diagnose', crop: 'rice' });
 *   logError('provider_failed', { provider: 'gemini', error: err.message });
 *
 * On Vercel, these JSON objects show up as searchable structured logs.
 */

const LOG_LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

// Allow runtime override via env var (e.g. VERCEL_ENV=preview → debug)
function getMinLevel() {
  const env = (typeof process !== 'undefined' && process.env && process.env.LOG_LEVEL) || 'info';
  return LOG_LEVELS[env.toLowerCase()] ?? LOG_LEVELS.info;
}

/**
 * Emit a structured JSON log line.
 * @param {string} level - One of "debug" | "info" | "warn" | "error"
 * @param {string} event - Short event name (snake_case)
 * @param {Object} [extra={}] - Additional fields to merge into the log object
 */
function emit(level, event, extra = {}) {
  if (LOG_LEVELS[level] < getMinLevel()) return;

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...extra,
  };

  // Redact obviously sensitive fields just in case
  for (const key of Object.keys(payload)) {
    if (/token|key|secret|password|auth/i.test(key) && typeof payload[key] === 'string') {
      payload[key] = `[redacted:${payload[key].length}chars]`;
    }
  }

  const line = JSON.stringify(payload);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

/** Log an informational event. */
export function logInfo(event, extra = {}) { emit('info', event, extra); }

/** Log a warning (non-fatal, e.g. provider fallback). */
export function logWarn(event, extra = {}) { emit('warn', event, extra); }

/** Log an error (typically caught exception). */
export function logError(event, extra = {}) { emit('error', event, extra); }

/** Log a debug event (only emitted if LOG_LEVEL=debug). */
export function logDebug(event, extra = {}) { emit('debug', event, extra); }

/**
 * Wrap an async handler with timing + start/end logging.
 * Catches errors, logs them, then re-throws so the caller's error handler
 * still runs.
 *
 * @param {string} routeName - Logical route name (e.g. "diagnose")
 * @param {Function} handler - Async function(req, res)
 * @returns {Function} Wrapped handler
 */
export function withLogging(routeName, handler) {
  return async function (req, res) {
    const start = Date.now();
    logInfo('request_start', {
      route: routeName,
      method: req.method,
      path: req.url,
      ua: req.headers?.['user-agent'] ? 'present' : 'absent',
    });
    try {
      const result = await handler(req, res);
      logInfo('request_end', {
        route: routeName,
        status: res.statusCode,
        duration_ms: Date.now() - start,
      });
      return result;
    } catch (err) {
      logError('request_unhandled_error', {
        route: routeName,
        error: err?.message || String(err),
        duration_ms: Date.now() - start,
      });
      throw err;
    }
  };
}
