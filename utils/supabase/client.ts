/**
 * Supabase client — REMOVED from frontend bundle.
 *
 * All Supabase database operations are handled server-side via
 * /api/ routes (analytics.js, presence.js, feedback.js, storage.js).
 *
 * This file is kept as a placeholder to prevent import errors.
 * The frontend NEVER needs Supabase credentials — everything goes
 * through the API layer, which keeps keys server-side only.
 */

// No Supabase client is created in the browser.
// This prevents accidental exposure of Supabase URL and anon key
// in the Vite production bundle.
export const supabase = null;
