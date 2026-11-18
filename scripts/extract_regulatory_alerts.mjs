#!/usr/bin/env node
// ============================================================
// extract_regulatory_alerts.mjs — regenerate
// src/intelligence/regulatoryAlerts.js from the upstream-synced
// src/agrichem/data/regulatoryAlertsData.ts.
//
// Why: plain-Node test suites and src/intelligence modules cannot
// import .ts directly; this keeps ONE source of truth (the synced
// .ts) while exposing a plain-JS projection for the validator and
// tests. Run after scripts/sync_agrichem.mjs.
//
// Usage: node scripts/extract_regulatory_alerts.mjs
// ============================================================

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src/agrichem/data/regulatoryAlertsData.ts");
const OUT = path.join(ROOT, "src/intelligence/regulatoryAlerts.js");
const TMP = path.join(ROOT, ".tmp_alerts.cjs");


/** Format generated JS with the repo's prettier (no-op if unavailable). */
function formatGenerated(filePath) {
  const prettierBin = path.join(ROOT, "node_modules/.bin/prettier");
  if (!fs.existsSync(prettierBin)) return;
  try {
    execSync(`"${prettierBin}" --write "${filePath}"`, { stdio: "pipe" });
  } catch {
    /* formatting is cosmetic — never fail the pipeline on it */
  }
}

if (!fs.existsSync(SRC)) {
  console.error(`Missing ${SRC} — run scripts/sync_agrichem.mjs first.`);
  process.exit(1);
}

try {
  execSync(
    `"${path.join(ROOT, "node_modules/.bin/esbuild")}" "${SRC}" --bundle=false --loader:.ts=ts ` +
      `--format=cjs --platform=node --outfile="${TMP}" --log-level=error`,
    { stdio: "pipe" },
  );
  const mod = require(TMP);
  const alerts = mod.INITIAL_REGULATORY_ALERTS ?? mod.default;
  if (!Array.isArray(alerts)) {
    throw new Error("INITIAL_REGULATORY_ALERTS is not an array — upstream format changed?");
  }
  const banner = `// ============================================================
// Plant Detective — Regulatory Alerts (policy bans/restrictions).
//
// AUTO-EXTRACTED from src/agrichem/data/regulatoryAlertsData.ts (the
// synced upstream file) by scripts/extract_regulatory_alerts.mjs —
// DO NOT EDIT BY HAND; re-run the extractor after sync_agrichem.
//
// Consumed by productValidator.js for policy-ban eligibility gating:
// a product whose active ingredient matches a \`targetChemicals\` entry
// of an active alert is NOT verified for that crop, with the alert
// disclosed as the reason.
// ============================================================

/**
 * @typedef {Object} RegulatoryAlert
 * @property {string} id
 * @property {string} title
 * @property {'regulatory'|'seasonal'} category
 * @property {'high'|'medium'|'low'} severity
 * @property {string} date
 * @property {string} [validUntil] - alert expires after this date
 * @property {string[]} [targetCrops]
 * @property {string[]} [targetChemicals]
 * @property {string} summary
 * @property {string} details
 * @property {string} actionRequired
 */

/** @type {RegulatoryAlert[]} */
export const REGULATORY_ALERTS = ${JSON.stringify(alerts, null, 2)};

export default REGULATORY_ALERTS;
`;
  fs.writeFileSync(OUT, banner);
formatGenerated(OUT);
  console.log(`✅ Extracted ${alerts.length} regulatory alerts → src/intelligence/regulatoryAlerts.js`);
} finally {
  fs.rmSync(TMP, { force: true });
}
