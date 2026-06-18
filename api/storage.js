/**
 * api/storage.js — Re-export bridge for backward compatibility.
 *
 * The actual storage implementation (Turso LibSQL with JSON fallback)
 * lives in api/_lib/turso.js. This file exists so that legacy imports
 * across api/feedback.js, api/analytics.js, api/dashboard.js, and
 * api/presence.js resolve correctly without changing each consumer.
 *
 * BUG-01 FIX: This file was missing from the repository, causing all
 * four API routes to throw "Cannot find module './storage.js'" at runtime.
 */

export { readStore, writeStore, appendFeedback, hasTurso } from "./_lib/turso.js";
