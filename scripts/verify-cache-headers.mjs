#!/usr/bin/env node
/**
 * verify-cache-headers.mjs — offline simulation of the vercel.json header rules.
 *
 * vercel.json `headers[].source` uses path-to-regexp (same engine as Express).
 * CRITICAL semantics (verified against Vercel docs + observed production
 * behavior): header rules match the *request path*, NOT the resolved
 * filesystem/rewrite destination. The SPA rewrite `/((.*)) -> /index.html`
 * means a request to `/` never matches the `/index.html` rule.
 *
 * This script re-implements the matching for our known sources with plain
 * regexes (equivalent to path-to-regexp for these simple patterns) and
 * asserts the intended Cache-Control for each critical path.
 */

import { readFileSync } from "fs";
import { execSync } from "child_process";

const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf-8"));

// Map each source pattern to a JS regex (path-to-regexp simple cases)
function sourceToRegex(source) {
  // Protect the wildcard before escaping dots, then restore as match-all
  const WILDCARD = "\u0000";
  let pattern = source
    .replace(/\(\.\*\)/g, WILDCARD)
    .replace(/\./g, "\\.") // escape literal dots
    .replace(new RegExp(WILDCARD, "g"), ".*")
    .replace(/\//g, "\\/");
  return new RegExp(`^${pattern}$`);
}

function headersFor(pathname) {
  // Header rules match the path only — query strings are not part of matching
  const path = pathname.split("?")[0];
  const matched = [];
  for (const rule of config.headers) {
    const re = sourceToRegex(rule.source);
    if (re.test(path)) matched.push(...rule.headers);
  }
  return Object.fromEntries(matched.map((h) => [h.key, h.value]));
}

const NO_STORE = "no-cache, no-store, must-revalidate, max-age=0, s-maxage=0";
const IMMUTABLE = "public, max-age=31536000, immutable";

let failures = 0;
function expect(desc, actual, expected) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌"} ${desc}`);
  if (!ok) console.log(`   expected Cache-Control: ${expected}\n   actual:   ${actual}`);
}

// ── Critical HTML shell paths ─────────────────────────────────────────────
expect("GET /            → no-store (was: Vercel default public,max-age=0)", headersFor("/")["Cache-Control"], NO_STORE);
expect("GET /index.html  → no-store (unchanged)", headersFor("/index.html")["Cache-Control"], NO_STORE);
expect("GET /?source=pwa → no-store (PWA start_url)", headersFor("/?source=pwa")["Cache-Control"], NO_STORE);

// ── SW + manifest ─────────────────────────────────────────────────────────
expect(
  "GET /sw.js        → no-cache (SW must bypass browser cache)",
  headersFor("/sw.js")["Cache-Control"],
  "no-cache, no-store, must-revalidate",
);
expect(
  "GET /manifest.json→ no-cache (manifest changes visible)",
  headersFor("/manifest.json")["Cache-Control"],
  "no-cache, no-store, must-revalidate",
);

// ── Hashed assets stay immutable (regression guard) ──────────────────────
expect("GET /assets/index-DI0g--Qa.js → immutable", headersFor("/assets/index-DI0g--Qa.js")["Cache-Control"], IMMUTABLE);
expect("GET /assets/agrichem-abc123.css → immutable", headersFor("/assets/agrichem-abc123.css")["Cache-Control"], IMMUTABLE);

// ── API never cached ──────────────────────────────────────────────────────
expect("GET /api/health  → no-store", headersFor("/api/health")["Cache-Control"], "no-store");

// ── Verbose: rule→path matrix (for the PR report) ────────────────────────
console.log("\n── Rule → path matrix ──");
for (const p of ["/", "/index.html", "/sw.js", "/manifest.json", "/assets/x-123.js", "/api/health", "/favicon.png"]) {
  const h = headersFor(p);
  console.log(`  ${p.padEnd(26)} → ${h["Cache-Control"] || "(no rule — Vercel default)"}`);
}

if (failures > 0) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\nAll header simulation checks passed.");
