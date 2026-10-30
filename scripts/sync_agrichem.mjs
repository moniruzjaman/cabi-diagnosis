#!/usr/bin/env node
/**
 * sync_agrichem.mjs — keep the embedded "বালাইনাশক" (Pesticide) tab in sync
 * with its upstream source of truth:
 *
 *   https://github.com/moniruzjaman/AgriChem-Guide-Pest-Control-Database
 *
 * WHAT IT DOES
 * ------------
 * 1. Clones (or fetches) the upstream repo into `.agrichem-upstream/`
 *    (a plain git clone — NOT a submodule; submodules have repeatedly
 *    caused broken `160000` gitlinks in this repo).
 * 2. Copies the files that power the Pesticide database UI into
 *    `src/agrichem/`, rewriting imports so the upstream layout maps onto
 *    ours:
 *        upstream src/data/all_pesticides.ts   -> src/agrichem/data/all_pesticides.ts
 *        upstream src/data/moaData.ts          -> src/agrichem/data/moaData.ts
 *        upstream src/data/regulatoryAlertsData.ts
 *                                              -> src/agrichem/data/regulatoryAlertsData.ts
 *        upstream src/types/index.ts           -> src/agrichem/types/index.ts
 *        upstream src/utils/{calculator,i18n,notifications,pdfExport}.ts
 *                                              -> src/agrichem/utils/<same>.ts
 * 3. Regenerates `src/agrichem/data/additionalPesticides.ts` from the
 *    upstream curated datasets (insecticides / fungicides / herbicides /
 *    miticides / bioAndOther) — these enrich DAE rows with toxicity, PHI,
 *    safety notes etc. The local `pesticideMapper.ts` merges them with the
 *    DAE register at build time.
 * 4. Writes `src/agrichem/data/upstreamMeta.js` recording the upstream
 *    commit SHA + sync date (surfaced in the UI as a "database synced"
 *    stamp, and used for staleness checks).
 *
 * The DAE register (`all_pesticides.ts`) is the authoritative product list;
 * the curated data only enriches it (toxicity, PHI, safety notes). So after
 * running this script, the Pesticide tab always reflects the LATEST upstream
 * database.
 *
 * USAGE
 * -----
 *   node scripts/sync_agrichem.mjs            # full sync (clone/fetch + copy)
 *   node scripts/sync_agrichem.mjs --check    # exit 1 if upstream has new commits
 *
 * CI: .github/workflows/sync-agrichem.yml runs this weekly and opens a PR
 * when the database changes, so releases are never built on stale data.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const UPSTREAM_URL =
  'https://github.com/moniruzjaman/AgriChem-Guide-Pest-Control-Database.git';
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UPSTREAM_DIR = path.join(REPO_ROOT, '.agrichem-upstream');
const UP_SRC = path.join(UPSTREAM_DIR, 'src');
const DEST = path.join(REPO_ROOT, 'src', 'agrichem');

const CHECK_ONLY = process.argv.includes('--check');

function sh(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf-8', cwd: REPO_ROOT, stdio: 'pipe', ...opts }).trim();
}

// ── 1. Clone or fetch upstream ──────────────────────────────────────────────
if (!fs.existsSync(path.join(UPSTREAM_DIR, '.git'))) {
  console.log(`Cloning upstream AgriChem database into ${path.relative(REPO_ROOT, UPSTREAM_DIR)} …`);
  sh(`git clone --depth 1 ${UPSTREAM_URL} ${UPSTREAM_DIR}`);
} else {
  console.log('Fetching latest upstream AgriChem database …');
  sh(`git -C ${UPSTREAM_DIR} fetch --depth 1 origin main`);
  sh(`git -C ${UPSTREAM_DIR} reset --hard origin/main`);
}
const sha = sh(`git -C ${UPSTREAM_DIR} rev-parse HEAD`);
const shortSha = sha.slice(0, 7);
const commitDate = sh(`git -C ${UPSTREAM_DIR} log -1 --format=%cI`);
console.log(`Upstream HEAD: ${shortSha} (${commitDate})`);

// ── 2. --check mode: report whether we are behind upstream ─────────────────
if (CHECK_ONLY) {
  const metaPath = path.join(DEST, 'data', 'upstreamMeta.js');
  let localSha = null;
  try {
    localSha = fs.readFileSync(metaPath, 'utf-8').match(/sha:\s*'([0-9a-f]+)'/)[1];
  } catch {
    /* no metadata yet */
  }
  if (localSha === sha) {
    console.log('✅ Embedded pesticide database is up to date with upstream.');
    process.exit(0);
  }
  console.log(`⚠️  Embedded database is STALE (local ${localSha || 'none'} → upstream ${shortSha}). Run: node scripts/sync_agrichem.mjs`);
  process.exit(1);
}

// ── helpers ──────────────────────────────────────────────────────────────────
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/** Copy a TS file, applying string rewrites, into DEST at rel path. */
function copyTs(srcRel, destRel, rewrites = []) {
  const srcPath = path.join(UP_SRC, srcRel);
  if (!fs.existsSync(srcPath)) {
    throw new Error(`Upstream file missing: src/${srcRel} (repo layout changed?)`);
  }
  let code = fs.readFileSync(srcPath, 'utf-8');
  for (const [from, to] of rewrites) code = code.replace(from, to);
  const destPath = path.join(DEST, destRel);
  ensureDir(path.dirname(destPath));
  fs.writeFileSync(destPath, code);
  console.log(`  copied src/${srcRel} → ${path.relative(REPO_ROOT, destPath)}`);
}

/**
 * Robustly extract an exported array of plain data objects from a TypeScript
 * source file by actually EVALUATING it:
 *   1. esbuild transpiles the .ts file to CommonJS (types are erased — no
 *      hand-rolled stripping needed, so escaped quotes / brackets inside
 *      strings can never break parsing).
 *   2. We require the module in-process and read the named export.
 *   3. The value is re-serialized with JSON.stringify, guaranteeing valid JS.
 * Throws loudly if the export is missing or not an array.
 */
let _esbuildCounter = 0;
function extractArrayFromTs(tsFilePath, exportName) {
  const outFile = path.join(
    REPO_ROOT,
    `.tmp_esm_${path.basename(tsFilePath, '.ts')}_${_esbuildCounter++}.cjs`
  );
  try {
    sh(
      `node_modules/.bin/esbuild "${tsFilePath}" --bundle=false --loader:.ts=ts ` +
        `--format=cjs --platform=node --outfile="${outFile}" --log-level=error`
    );
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(outFile);
    const arr = mod[exportName];
    if (!Array.isArray(arr)) {
      throw new Error(
        `Export "${exportName}" in ${path.relative(REPO_ROOT, tsFilePath)} is not an array (got ${typeof arr}). Upstream format changed?`
      );
    }
    return arr;
  } finally {
    fs.rmSync(outFile, { force: true });
  }
}

/** Find the first exported const array's name in a TS data file. */
function findExportedArrayName(code) {
  const m = code.match(/export\s+const\s+(\w+)(?:\s*:\s*[\w.<>\[\]\s|]+)?\s*=\s*\[/);
  if (!m) {
    throw new Error('Could not locate an exported const array — upstream format changed, update sync_agrichem.mjs');
  }
  return m[1];
}

// ── 3. Direct copies (same relative layout upstream ↔ ours) ────────────────
console.log('Syncing database files…');
copyTs('data/all_pesticides.ts', 'data/all_pesticides.ts');
copyTs('data/moaData.ts', 'data/moaData.ts');
copyTs('data/regulatoryAlertsData.ts', 'data/regulatoryAlertsData.ts');
copyTs('types/index.ts', 'types/index.ts');
// bnAgri + analytics are first-party dependencies of the utils below; they
// have no imports themselves, so a plain copy keeps the module graph closed.
for (const f of ['bnAgri', 'analytics', 'calculator', 'i18n', 'notifications', 'pdfExport']) {
  copyTs(`utils/${f}.ts`, `utils/${f}.ts`);
}

// ── 4. Curated products → additionalPesticides.ts (consumed by our mapper) ──
console.log('Building additionalPesticides.ts from upstream curated datasets…');
const CURATED_FILES = [
  'insecticidesData.ts',
  'fungicidesData.ts',
  'herbicidesData.ts',
  'miticidesData.ts',
  'bioAndOtherData.ts',
];
let combined = `/**
 * AUTO-GENERATED — DO NOT EDIT BY HAND.
 *
 * Curated (enriched) pesticide products bundled from the upstream
 * AgriChem Guide & Pest Control Database. Regenerated by:
 *     node scripts/sync_agrichem.mjs
 *
 * Upstream commit: ${sha}
 * Synced at:       ${new Date().toISOString()}
 *
 * Consumed by ./pesticidesData.ts → ./pesticideMapper.ts, which merges
 * these enrichments onto the official DAE register (all_pesticides.ts).
 */

import { ChemicalProduct } from '../types';

export const ADDITIONAL_PESTICIDES: ChemicalProduct[] = [\n`;

let allRecords = [];
for (const f of CURATED_FILES) {
  const p = path.join(UP_SRC, 'data', f);
  if (!fs.existsSync(p)) {
    console.warn(`  (skipping missing upstream file: src/data/${f})`);
    continue;
  }
  const code = fs.readFileSync(p, 'utf-8');
  const exportName = findExportedArrayName(code);
  const records = extractArrayFromTs(p, exportName);
  console.log(`  merged src/data/${f} (${exportName}: ${records.length} records)`);
  allRecords = allRecords.concat(records);
}

// Pretty-print one object per entry group for readable diffs.
const body = allRecords
  .map((rec) => '  ' + JSON.stringify(rec))
  .join(',\n');

combined += `${body}\n];\n\nexport default ADDITIONAL_PESTICIDES;\n`;

ensureDir(path.join(DEST, 'data'));
fs.writeFileSync(path.join(DEST, 'data', 'additionalPesticides.ts'), combined);
console.log(`  wrote ${path.relative(REPO_ROOT, path.join(DEST, 'data', 'additionalPesticides.ts'))} (${(combined.length / 1024).toFixed(0)} KB, ${allRecords.length} curated records)`);

// ── 5. Provenance metadata ──────────────────────────────────────────────────
const meta = `/**
 * AUTO-GENERATED by scripts/sync_agrichem.mjs — provenance of the embedded
 * pesticide database. Update via:  node scripts/sync_agrichem.mjs
 */
export const AGRICHEM_UPSTREAM = {
  url: '${UPSTREAM_URL}',
  sha: '${sha}',
  commitDate: '${commitDate}',
  syncedAt: '${new Date().toISOString()}',
};

export default AGRICHEM_UPSTREAM;
`;
fs.writeFileSync(path.join(DEST, 'data', 'upstreamMeta.js'), meta);
console.log('  wrote src/agrichem/data/upstreamMeta.js');

console.log('\n✅ AgriChem pesticide database synced from upstream commit ' + shortSha);
console.log('   Next: npm run build (verify), then commit the changed files under src/agrichem/.');
