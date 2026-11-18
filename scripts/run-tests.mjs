// Plant Detective — test runner.
// Runs the offline ensemble + every intelligence suite, exits non-zero on
// any failure. Each suite is a self-running .mjs that process.exit(1)s on
// failure (see e.g. protectionDecisionEngine.test.mjs:225).
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SUITE_DIR = join(ROOT, "src/intelligence/__tests__");
const ENSEMBLE = join(ROOT, "src/offline/test-ensemble.mjs");

const suites = readdirSync(SUITE_DIR)
  .filter((f) => f.endsWith(".test.mjs"))
  .sort()
  .map((f) => ({ name: f, path: join(SUITE_DIR, f) }));

const runs = [{ name: "offline/test-ensemble.mjs", path: ENSEMBLE }, ...suites];

let totalPass = 0;
let totalFail = 0;
let failed = 0;
const rows = [];

for (const r of runs) {
  const res = spawnSync(process.execPath, [r.path], { encoding: "utf8" });
  const out = (res.stdout || "") + (res.stderr || "");
  const m = out.match(/(\d+)\s+passed/i);
  const fm = out.match(/(\d+)\s+failed/i);
  const pass = m ? Number(m[1]) : null;
  const fnum = fm ? Number(fm[1]) : null;
  if (pass != null) totalPass += pass;
  if (fnum != null) totalFail += fnum;
  const ok = res.status === 0;
  if (!ok) failed++;
  rows.push({ name: r.name, status: ok ? "PASS" : "FAIL", exit: res.status, pass, fail: fnum });
}

const w = Math.max(...rows.map((r) => r.name.length), 30);
console.log("\n─".repeat(w + 28));
for (const r of rows) {
  const p = r.pass != null ? `${r.pass}p` : "—";
  const f = r.fail != null ? `${r.fail}f` : "—";
  console.log(
    `  ${r.status.padEnd(4)} ${r.name.padEnd(w)}  ${p.padStart(5)} ${f.padStart(5)}  exit=${r.exit}`,
  );
}
console.log("─".repeat(w + 28));
console.log(`  TOTAL: ${totalPass} passed, ${totalFail} failed across ${rows.length} suites\n`);

if (failed > 0) {
  console.error(`✗ ${failed} suite(s) failed`);
  process.exit(1);
}
console.log("✓ All suites passed");
