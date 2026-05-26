/**
 * Storage layer — Turso (primary) + local JSON file (fallback).
 *
 * All Supabase code has been removed. Turso is an edge-native SQLite
 * database with no project pausing and generous free tier.
 *
 * See api/_lib/turso.js for the Turso implementation.
 */

export { readStore, writeStore, appendFeedback } from "./_lib/turso.js";
