#!/usr/bin/env node
// ============================================================
// validate_registry.mjs — build-time data-quality validation of the
// embedded pesticide registry (src/agrichem/data/all_pesticides.ts).
//
// Ported from the AgriChem/PesticideNext scripts/validate_registry.py,
// adapted to this repo: the registry here is the synced .ts file (not a
// CSV), so validation runs on the evaluated array via esbuild — the same
// technique scripts/sync_agrichem.mjs uses.
//
// CHECKS (directive: registry validation pipeline):
//   - duplicate registration numbers (strongly normalized)
//   - missing registration numbers
//   - invalid registration-number format (DAE pattern)
//   - missing active ingredient / common name
//   - missing crop registrations
//   - missing target-pest registrations
//   - missing dosage
//   - missing MoA code
//   - registry load/import errors
//
// OUTPUT:
//   src/data/registryValidationReport.js  — machine-readable report
//     (counts + sample details) imported by the UI to surface data
//     provenance & quality, with zero runtime CSV/TSV parsing.
//   src/data/registryImportMeta.js       — provenance manifest:
//     upstream commit SHA (from upstreamMeta.js), record counts,
//     sha256 checksum of the evaluated registry JSON, generation date.
//
// USAGE:
//   node scripts/validate_registry.mjs           # validate + write reports
//   node scripts/validate_registry.mjs --check   # exit 1 if error thresholds exceeded
//
// Run after scripts/sync_agrichem.mjs (and npm run build fails safe: the
// reports are committed, the build never parses the registry).
// ============================================================

import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REGISTRY_TS = path.join(ROOT, "src/agrichem/data/all_pesticides.ts");
const OUT_REPORT = path.join(ROOT, "src/data/registryValidationReport.js");
const OUT_META = path.join(ROOT, "src/data/registryImportMeta.js");
const TMP = path.join(ROOT, ".tmp_registry.cjs");
const CHECK_MODE = process.argv.includes("--check");

// Quality thresholds for --check (fractions of total records).
const MAX_MISSING_REGNO = 0.001;
const MAX_INVALID_REGNO = 0.002;
const MAX_MISSING_AI = 0.05;


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

const REG_NO_RE = /^[A-Z]{1,4}\s*\(?[A-Z]{0,4}\)?\s*-\s*\d+$/i;

if (!fs.existsSync(REGISTRY_TS)) {
  console.error(`Missing ${REGISTRY_TS} — run scripts/sync_agrichem.mjs first.`);
  process.exit(2);
}

// ── 1. Evaluate the registry .ts (esbuild → CJS → require) ─────────────────
let pesticides;
try {
  execSync(
    `"${path.join(ROOT, "node_modules/.bin/esbuild")}" "${REGISTRY_TS}" --bundle=false --loader:.ts=ts ` +
      `--format=cjs --platform=node --outfile="${TMP}" --log-level=error`,
    { stdio: "pipe" },
  );
  const mod = require(TMP);
  pesticides = mod.pesticides ?? mod.default;
  if (!Array.isArray(pesticides)) throw new Error("`pesticides` export is not an array — upstream format changed?");
} catch (err) {
  console.error(`Registry import error: ${err.message}`);
  fs.rmSync(TMP, { force: true });
  process.exit(2);
} finally {
  fs.rmSync(TMP, { force: true });
}

// ── 2. Validate ────────────────────────────────────────────────────────────
const norm = (raw) =>
  String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
const seen = new Map(); // regKey → first index
const duplicates = []; // {regNo, count, tradeNames}
const missingRegNo = [];
const invalidRegNo = [];
const missingAI = [];
const missingCrops = [];
const missingPests = [];
const missingDosage = [];
const missingMoa = [];

pesticides.forEach((p, i) => {
  const key = norm(p.registrationNo);
  const trade = p.brandName || `row ${i}`;
  if (key) {
    if (seen.has(key)) {
      const entry = duplicates.find((d) => d.regNo === seen.get(key).regNo);
      if (entry) {
        entry.count += 1;
        entry.tradeNames.push(trade);
      }
    } else {
      seen.set(key, { regNo: p.registrationNo, tradeNames: [trade] });
    }
  }
  if (!p.registrationNo || !String(p.registrationNo).trim()) missingRegNo.push({ trade });
  else if (!REG_NO_RE.test(String(p.registrationNo).trim())) invalidRegNo.push({ regNo: p.registrationNo, trade });
  if (!p.commonName || !String(p.commonName).trim()) missingAI.push({ trade });
  if (!p.recommendedCrops || p.recommendedCrops.length === 0) missingCrops.push({ trade });
  if (!p.recommendedPests || p.recommendedPests.length === 0) missingPests.push({ trade });
  if (!p.dosageRate || !String(p.dosageRate).trim()) missingDosage.push({ trade });
  if (!p.moaCode || !String(p.moaCode).trim()) missingMoa.push({ trade });
});

for (const [key, first] of seen) {
  const count = pesticides.filter((p) => norm(p.registrationNo) === key).length;
  if (count > 1) duplicates.push({ regNo: first.regNo, count, tradeNames: first.tradeNames });
}

const counts = {
  totalRecords: pesticides.length,
  duplicateRegNoGroups: duplicates.length,
  duplicateRegNoRows: duplicates.reduce((s, d) => s + d.count - 1, 0),
  missingRegistrationNo: missingRegNo.length,
  invalidRegistrationNo: invalidRegNo.length,
  missingActiveIngredient: missingAI.length,
  missingCrops: missingCrops.length,
  missingTargetPests: missingPests.length,
  missingDosage: missingDosage.length,
  missingMoa: missingMoa.length,
  importErrors: 0,
};

// ── 3. Provenance (upstream SHA from upstreamMeta) + checksum ──────────────
let upstream = { url: "", sha: "", commitDate: "", syncedAt: "" };
try {
  // upstreamMeta.js is plain ESM JS — import it directly.
  const metaPath = new URL(path.join("file://", path.join(ROOT, "src/agrichem/data/upstreamMeta.js")));
  const mod = await import(metaPath.href);
  upstream = mod.AGRICHEM_UPSTREAM || upstream;
} catch {
  /* upstreamMeta not generated yet — provenance fields stay empty */
}
const registryJson = JSON.stringify(pesticides);
const checksum = createHash("sha256").update(registryJson).digest("hex");
const generatedAt = new Date().toISOString();

// ── 4. Write reports ───────────────────────────────────────────────────────
const reportJs = `// AUTO-GENERATED by scripts/validate_registry.mjs — DO NOT EDIT BY HAND.
// Registry data-quality validation report (build-time; the app reads this,
// it never parses the registry at runtime).

/** @typedef {Object} RegistryValidationReport
 * @property {number} schemaVersion
 * @property {string} generatedAt - ISO
 * @property {{totalRecords: number, duplicateRegNoGroups: number, duplicateRegNoRows: number, missingRegistrationNo: number, invalidRegistrationNo: number, missingActiveIngredient: number, missingCrops: number, missingTargetPests: number, missingDosage: number, missingMoa: number, importErrors: number}} counts
 * @property {{duplicates: Array<{regNo: string, count: number, tradeNames: string[]}>, invalidRegistrationNo: Array<{regNo: string, trade: string}>}} details - capped samples
 * @property {string[]} notes
 */

/** @type {RegistryValidationReport} */
export const REGISTRY_VALIDATION_REPORT = {
  schemaVersion: 1,
  generatedAt: ${JSON.stringify(generatedAt)},
  counts: ${JSON.stringify(counts, null, 2)},
  details: {
    duplicates: ${JSON.stringify(duplicates.slice(0, 50), null, 2)},
    invalidRegistrationNo: ${JSON.stringify(invalidRegNo.slice(0, 50), null, 2)},
  },
  notes: [
    "PHI/REI are NOT present in the DAE register source — they come from curated enrichment only and are disclosed as missing otherwise.",
    "Products with missing crops/pests cannot pass crop/target eligibility verification (correct behavior, disclosed per product).",
    "Duplicate regNo groups in the SOURCE register are deduplicated at load time by src/data/pesticideRegistry.js (first occurrence wins).",
  ],
};

export default REGISTRY_VALIDATION_REPORT;
`;
fs.writeFileSync(OUT_REPORT, reportJs);
formatGenerated(OUT_REPORT);

const metaJs = `// AUTO-GENERATED by scripts/validate_registry.mjs — DO NOT EDIT BY HAND.
// Provenance manifest for the embedded pesticide registry.

/** @typedef {Object} RegistryImportMeta
 * @property {number} schemaVersion
 * @property {string} generatedAt - ISO
 * @property {{url: string, sha: string, commitDate: string, syncedAt: string}} upstream - AgriChem commit this registry was synced from
 * @property {{records: number, sha256: string}} registry - evaluated registry checksum + size
 * @property {Record<string, number>} validationCounts
 */

/** @type {RegistryImportMeta} */
export const REGISTRY_IMPORT_META = {
  schemaVersion: 1,
  generatedAt: ${JSON.stringify(generatedAt)},
  upstream: ${JSON.stringify(upstream)},
  registry: {
    records: ${counts.totalRecords},
    sha256: ${JSON.stringify(checksum)},
  },
  validationCounts: ${JSON.stringify(counts, null, 2)},
};

export default REGISTRY_IMPORT_META;
`;
fs.writeFileSync(OUT_META, metaJs);
formatGenerated(OUT_META);

// ── 5. Report ──────────────────────────────────────────────────────────────
console.log(`Registry records:        ${counts.totalRecords}`);
console.log(`Duplicate regNo groups:  ${counts.duplicateRegNoGroups} (${counts.duplicateRegNoRows} extra rows)`);
console.log(`Missing regNo:           ${counts.missingRegistrationNo}`);
console.log(`Invalid regNo format:    ${counts.invalidRegistrationNo}`);
console.log(`Missing AI:              ${counts.missingActiveIngredient}`);
console.log(`Missing crops:           ${counts.missingCrops}`);
console.log(`Missing pests:           ${counts.missingTargetPests}`);
console.log(`Missing dosage:          ${counts.missingDosage}`);
console.log(`Missing MoA:             ${counts.missingMoa}`);
console.log(`Import errors:           ${counts.importErrors}`);
console.log(
  `Upstream:                ${upstream.sha ? upstream.sha.slice(0, 7) : "?"} (${upstream.syncedAt || "not synced"})`,
);
console.log(`\nWrote src/data/registryValidationReport.js`);
console.log(`Wrote src/data/registryImportMeta.js`);

if (CHECK_MODE) {
  const total = Math.max(1, counts.totalRecords);
  const problems = [];
  if (counts.missingRegistrationNo / total > MAX_MISSING_REGNO) problems.push("missing regNo above threshold");
  if (counts.invalidRegNo / total > MAX_INVALID_REGNO) problems.push("invalid regNo above threshold");
  if (counts.missingActiveIngredient / total > MAX_MISSING_AI)
    problems.push("missing active ingredient above threshold");
  if (counts.importErrors > 0) problems.push("import errors present");
  if (problems.length > 0) {
    console.error("\nCHECK FAILED: " + problems.join("; "));
    process.exit(1);
  }
  console.log("\nCheck passed.");
}
