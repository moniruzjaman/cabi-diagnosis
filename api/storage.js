/**
 * Storage layer — Turso (primary) + local JSON file (fallback).
 *
 * See api/_lib/turso.js for the Turso implementation.
 */

export { readStore, writeStore, appendFeedback } from "./_lib/turso.js";
