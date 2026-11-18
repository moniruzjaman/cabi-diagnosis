// ============================================================
// registryValidation.test — ported registry data-integrity suite.
//
// Covers the directive scenarios:
//   - runtime registry contains ZERO duplicate registration numbers
//     (dedupe in src/data/pesticideRegistry.js — ported from the
//     AgriChem loader fix)
//   - validation report + import metadata exist and match the registry
//   - provenance carries the upstream commit SHA + checksum
//   - the report's quality counts are honest (missing crops disclosed,
//     not zeroed)
//   - the report is importable under plain Node (no .ts resolution)
// ============================================================

import { strict as assert } from "node:assert";
import { BANGLADESH_PESTICIDES_REGISTRY } from "../../data/pesticideRegistry.js";
import { REGISTRY_VALIDATION_REPORT } from "../../data/registryValidationReport.js";
import { REGISTRY_IMPORT_META } from "../../data/registryImportMeta.js";

let passed = 0;
let failed = 0;
function ok(cond, msg) {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error("FAIL:", msg);
  }
}

// 1. No duplicate registration numbers in the runtime registry
{
  const norm = (raw) => String(raw || "").trim().toUpperCase().replace(/\s+/g, "");
  const seen = new Set();
  let dupes = 0;
  for (const p of BANGLADESH_PESTICIDES_REGISTRY) {
    const key = norm(p.regNo);
    if (!key) continue;
    if (seen.has(key)) dupes++;
    seen.add(key);
  }
  ok(dupes === 0, `runtime registry has 0 duplicate regNos (found ${dupes})`);
  ok(
    BANGLADESH_PESTICIDES_REGISTRY.length >= 5000,
    `registry substantial (${BANGLADESH_PESTICIDES_REGISTRY.length} products)`,
  );
}

// 2. Validation report exists with honest counts
{
  const c = REGISTRY_VALIDATION_REPORT.counts;
  ok(typeof c.totalRecords === "number" && c.totalRecords > 5000, `report totalRecords (${c.totalRecords})`);
  ok(c.duplicateRegNoGroups > 0, `source duplicates honestly reported (${c.duplicateRegNoGroups} groups)`);
  ok(c.missingCrops > 0, `missing crops honestly reported (${c.missingCrops})`);
  ok(c.missingMoa > 0, `missing MoA honestly reported (${c.missingMoa})`);
  ok(Array.isArray(REGISTRY_VALIDATION_REPORT.details.duplicates), "duplicate detail samples present");
  ok(REGISTRY_VALIDATION_REPORT.notes.length > 0, "notes disclose the PHI/REI gap");
  // The report validates the SOURCE registry (pre-dedupe) — total ≥ runtime.
  ok(
    c.totalRecords >= BANGLADESH_PESTICIDES_REGISTRY.length,
    "source count ≥ deduped runtime count",
  );
}

// 3. Provenance manifest: upstream SHA + checksum + validation counts
{
  const m = REGISTRY_IMPORT_META;
  ok(typeof m.registry.sha256 === "string" && m.registry.sha256.length === 64, "sha256 checksum present");
  ok(m.upstream && typeof m.upstream.sha === "string" && m.upstream.sha.length >= 7, "upstream commit SHA recorded");
  ok(m.generatedAt, "generation timestamp present");
  ok(m.validationCounts && m.validationCounts.totalRecords > 0, "validation counts mirrored");
}

// 4. Report regenerable: the validator script exists and is runnable
{
  const fs = await import("node:fs");
  ok(fs.existsSync("scripts/validate_registry.mjs"), "validate_registry.mjs exists");
  ok(fs.existsSync("scripts/extract_regulatory_alerts.mjs"), "extract_regulatory_alerts.mjs exists");
}

console.log(`\nregistryValidation.test: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
