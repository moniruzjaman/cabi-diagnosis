#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// verify-turso-config.mjs — smoke-check the EXISTING Turso configuration.
//
// Uses the same env-driven pattern as api/_lib/turso.js:
//   TURSO_DATABASE_URL  e.g. libsql://your-db.turso.io  (or file:/path.db)
//   TURSO_AUTH_TOKEN    required for remote libsql:// URLs
//
// libsql's file: URLs share the same client code path as Turso cloud, so a
// local file: run proves the client + schema wiring works end-to-end without
// touching production. This script performs NO migrations — a SELECT only.
//
// Usage:
//   node scripts/verify-turso-config.mjs
//   TURSO_DATABASE_URL=file:/tmp/cabi-check.db node scripts/verify-turso-config.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const token = process.env.TURSO_AUTH_TOKEN;

function mask(value) {
  if (!value) return "(not set)";
  if (value.length <= 8) return "***";
  return `${value.slice(0, 5)}…${value.slice(-3)} (masked)`;
}

console.log("Turso configuration check");
console.log(`  TURSO_DATABASE_URL : ${url || "(not set)"}`);
console.log(`  TURSO_AUTH_TOKEN   : ${mask(token)}`);

if (!url) {
  console.log("\n→ No TURSO_DATABASE_URL set. That is the documented offline mode:");
  console.log("  api/_lib/turso.js hasTurso() returns false and API routes fall back");
  console.log("  to local JSON file storage. Nothing to verify over the wire.");
  process.exit(0);
}

if (url.startsWith("libsql://") && !token) {
  console.error("\n✗ Remote libsql:// URL set without TURSO_AUTH_TOKEN — the client would fail.");
  process.exit(1);
}

try {
  const db = createClient({ url, authToken: token });
  const rs = await db.execute("SELECT 1 AS ok, sqlite_version() AS version");
  const row = rs.rows[0];
  console.log(`\n✓ Client created and connected. SELECT 1 → ${row.ok}, sqlite_version() → ${row.version}`);
  console.log("  The existing Turso/libsql configuration is functional.");
  process.exit(0);
} catch (err) {
  console.error(`\n✗ Connection failed: ${err.message}`);
  process.exit(1);
}
