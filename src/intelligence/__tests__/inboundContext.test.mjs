// Inbound context adapter tests — Phase 1 Workstream D.
//  - valid contract payload parses to the documented context shape
//  - unknown crop/symptom/cause-group IDs are rejected/ignored, never mapped
//  - ambiguous "pepper" cropId rejected with candidates
//  - arbitrary return URLs rejected; app-enum returnTo accepted
//  - privacy-hostile params rejected unread
//  - unknown query params ignored + reported
//  - guideReference shape + page range
//  - version enforcement
//  - pinned snapshots stay in sync with the draft JSON files
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseInboundContext, ALLOWED_PARAMS, isInboundResultValid } from "../../integration/inboundContext.js";
import { CONTRACT_SNAPSHOT, APP_IDS, CROP_IDS, SYMPTOM_IDS, CAUSE_GROUP_IDS } from "../../integration/contractSnapshot.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

let pass = 0,
  fail = 0;
function assert(cond, msg) {
  if (cond) pass++;
  else {
    fail++;
    console.error("FAIL:", msg);
  }
}

// ── 1. Valid payload ──────────────────────────────────────────────────────
const valid = parseInboundContext(
  "v=1.0.0&source=diagnostic-field-guide&cropId=rice&plantPartId=leaf&symptomIds=leaf_spot,yellowing&causeGroupIds=fungal&guideId=bd-guide&guidePage=42&chapterId=ch-3&trainingTopicId=ipm-basics&returnTo=diagnostic-field-guide",
);
assert(valid.ok, `valid payload parses: ${valid.errors.join("; ")}`);
assert(valid.context.schemaVersion === "1.0.0", "schemaVersion pinned");
assert(valid.context.sourceApp === "diagnostic-field-guide", "sourceApp parsed");
assert(valid.context.destinationApp === "cabi-diagnosis", "destination pinned to cabi");
assert(valid.context.cropId === "rice", "cropId parsed");
assert(valid.context.plantPartId === "leaf", "plantPartId parsed");
assert(valid.context.symptomIds.join(",") === "leaf_spot,yellowing", "symptomIds parsed");
assert(valid.context.causeGroupIds.join(",") === "fungal", "causeGroupIds parsed");
assert(valid.context.guideReference.guideId === "bd-guide" && valid.context.guideReference.page === 42, "guideReference parsed");
assert(valid.context.guideReference.chapterId === "ch-3", "chapterId parsed");
assert(valid.context.trainingTopicId === "ipm-basics", "trainingTopicId parsed");
assert(valid.returnTo === "diagnostic-field-guide", "returnTo parsed");
assert(isInboundResultValid(valid), "result shape valid");
assert(valid.errors.length === 0 && valid.warnings.length === 0, "no warnings/errors for clean payload");

// alias normalization of cropId is allowed with warning
const aliasIn = parseInboundContext("source=diagnosis-assistant&cropId=bell%20pepper");
assert(aliasIn.ok && aliasIn.context.cropId === "capsicum_bell", "alias cropId normalizes to canonical");
assert(aliasIn.warnings.some((w) => w.includes("capsicum_bell")), "alias normalization warned");

// rice season attribute flows through display-style inputs
const seasonIn = parseInboundContext("source=diagnosis-assistant&cropId=Rice%20-%20Boro");
assert(seasonIn.ok && seasonIn.context.cropId === "rice" && seasonIn.context.cropSeason === "boro", "season stays attribute of rice");

// URLSearchParams input works
const sp = new URLSearchParams("source=diagnosis-assistant&cropId=tomato");
const spRes = parseInboundContext(sp);
assert(spRes.ok && spRes.context.cropId === "tomato", "URLSearchParams input works");

// ── 2. Unknown / ambiguous IDs ────────────────────────────────────────────────
const unknownCrop = parseInboundContext("source=diagnosis-assistant&cropId=space_pumpkin");
assert(!unknownCrop.ok, "unknown cropId rejected");
assert(unknownCrop.errors.some((e) => e.includes("not mapped to any other crop")), "explicit never-mapped message");
const ambiguousCrop = parseInboundContext("source=diagnosis-assistant&cropId=pepper");
assert(!ambiguousCrop.ok, "ambiguous pepper cropId rejected");
assert(ambiguousCrop.errors.some((e) => e.includes("capsicum_bell") && e.includes("black_pepper")), "ambiguity lists the 4 identities");
const unknownSymptom = parseInboundContext("source=diagnosis-assistant&cropId=rice&symptomIds=leaf_spot,headache");
assert(unknownSymptom.ok, "unknown symptom is a warning (non-strict), not a hard failure");
assert(unknownSymptom.context.symptomIds.join(",") === "leaf_spot", "unknown symptom dropped, valid kept");
assert(unknownSymptom.warnings.some((w) => w.includes("headache")), "unknown symptom warned");
const strictUnknown = parseInboundContext("source=diagnosis-assistant&cropId=rice&symptomIds=headache", { strict: true });
assert(!strictUnknown.ok, "strict mode escalates unknown symptom to error");
const unknownCause = parseInboundContext("source=diagnosis-assistant&cropId=rice&causeGroupIds=magic");
assert(unknownCause.ok, "unknown cause group warned");
assert(!unknownCause.context.causeGroupIds, "unknown cause group dropped");

// ── 3. returnTo: enum only, never URLs ────────────────────────────────────────
for (const bad of [
  "https://evil.example.com/back",
  "/diagnose",
  "javascript:alert(1)",
  "../../wallet",
  "cabi-diagnosis.x",
  "%2e%2e%2f",
]) {
  const r = parseInboundContext(`source=diagnosis-assistant&cropId=rice&returnTo=${encodeURIComponent(bad)}`);
  const r2 = parseInboundContext({ source: "diagnosis-assistant", cropId: "rice", returnTo: bad });
  assert(!r.ok || !r.returnTo, `URL-like returnTo rejected (query): ${bad}`);
  assert(!r2.ok, `URL-like returnTo rejected (object): ${bad}`);
}
const enumBack = parseInboundContext("source=diagnosis-assistant&cropId=rice&returnTo=diagnosis-assistant");
assert(enumBack.ok && enumBack.returnTo === "diagnosis-assistant", "enum returnTo accepted");
const unknownApp = parseInboundContext("source=diagnosis-assistant&cropId=rice&returnTo=unknown-app");
assert(!unknownApp.ok, "unknown returnTo app rejected");
const selfSource = parseInboundContext("source=cabi-diagnosis&cropId=rice");
assert(!selfSource.ok, "source==destination rejected");
const unknownSource = parseInboundContext("source=random-app&cropId=rice");
assert(!unknownSource.ok, "unknown source app rejected");

// ── 4. Privacy-hostile params ─────────────────────────────────────────────────
const privacy = parseInboundContext({
  source: "diagnosis-assistant",
  cropId: "rice",
  photo: "data:image/jpeg;base64,AAAA",
  gps: "23.8103,90.4125",
  lat: "23.8103",
  farmerPhone: "01712345678",
  accessToken: "secret",
  caseNotes: "free text about farmer",
});
assert(!privacy.ok, "privacy params cause rejection");
assert(!("cropId" in privacy.context) || privacy.context.cropId === "rice", "valid fields still parsed alongside");
assert(
  privacy.context && privacy.context.cropId === "rice" && privacy.context.photo === undefined,
  "privacy param values never enter context",
);
assert(privacy.rejectedPrivacyParams.join(",") === "photo,gps,lat,farmerPhone,accessToken,caseNotes", "all privacy params reported");
assert(
  !JSON.stringify(privacy).includes("01712345678") && !JSON.stringify(privacy).includes("AAAA") && !JSON.stringify(privacy).includes("secret"),
  "privacy values never echoed anywhere in the result",
);

// ── 5. Unknown params ignored + reported ─────────────────────────────────────
const extra = parseInboundContext("source=diagnosis-assistant&cropId=rice&utm_campaign=x&theme=dark&foo=1");
assert(extra.ok, "unknown params don't break parsing");
assert(extra.ignoredParams.join(",") === "utm_campaign,theme,foo", "unknown params listed as ignored");
assert(extra.context.cropId === "rice", "context unaffected by unknown params");

// ── 6. guideReference shape ───────────────────────────────────────────────────
const guideOnly = parseInboundContext("source=diagnosis-assistant&guideId=bd-guide");
assert(!guideOnly.ok, "guideId without guidePage rejected");
const badPage = parseInboundContext("source=diagnosis-assistant&guideId=bd-guide&guidePage=0");
assert(!badPage.ok, "guidePage below range rejected");
const hugePage = parseInboundContext("source=diagnosis-assistant&guideId=bd-guide&guidePage=99999");
assert(!hugePage.ok, "guidePage above range rejected");
const badGuideId = parseInboundContext("source=diagnosis-assistant&guideId=BD GUIDE&guidePage=5");
assert(!badGuideId.ok, "non-conforming guideId rejected");
const okGuide = parseInboundContext("source=diagnosis-assistant&guideId=bd-guide&guidePage=12");
assert(okGuide.ok && okGuide.context.guideReference.page === 12, "guideReference without chapter ok");

// ── 7. Version + limits + input types ────────────────────────────────────────
const wrongV = parseInboundContext("v=2.0.0&source=diagnosis-assistant&cropId=rice");
assert(!wrongV.ok, "unsupported contract version rejected");
const missingSource = parseInboundContext("cropId=rice");
assert(!missingSource.ok, "missing source rejected");
const tooMany = parseInboundContext(`source=diagnosis-assistant&symptomIds=${SYMPTOM_IDS.join(",")},wilt_again`);
assert(tooMany.ok, "11 ids fine");
const limit = parseInboundContext({ source: "diagnosis-assistant", symptomIds: Array(21).fill("wilt").join(",") });
assert(!limit.ok, ">20 symptom ids rejected");
const dedup = parseInboundContext({ source: "diagnosis-assistant", cropId: "rice", symptomIds: "wilt,wilt,leaf_spot" });
assert(dedup.ok && dedup.context.symptomIds.join(",") === "wilt,leaf_spot", "duplicate ids deduped");
const badInput = parseInboundContext(12345);
assert(!badInput.ok, "invalid input type errors gracefully");

// ── 8. Snapshot sync with draft JSON files (CI drift guard) ───────────────────
const cropRegistry = JSON.parse(readFileSync(join(ROOT, "docs/integration/crop-registry-v1.json"), "utf8"));
const symptomRegistry = JSON.parse(readFileSync(join(ROOT, "docs/integration/symptom-registry-v1.json"), "utf8"));
const schema = JSON.parse(readFileSync(join(ROOT, "docs/integration/diagnostic-contract-v1.schema.json"), "utf8"));
assert(CONTRACT_SNAPSHOT.schemaVersion === schema.properties.schemaVersion.const, "schemaVersion in sync with contract schema");
for (const id of cropRegistry.crops.map((c) => c.id)) {
  assert(CROP_IDS.includes(id), `registry crop id accepted by adapter: ${id}`);
}
assert(CROP_IDS.includes("tomato"), "tomato accepted (documented registry-pending exception)");
for (const s of symptomRegistry.symptoms) {
  assert(SYMPTOM_IDS.includes(s.id), `symptom id in sync: ${s.id}`);
  assert(SYMPTOM_IDS.length === symptomRegistry.symptoms.length, "symptom count in sync");
}
for (const cg of symptomRegistry.causeGroupNamespace.existingIds) {
  assert(CAUSE_GROUP_IDS.includes(cg), `cause group id in sync: ${cg}`);
}
for (const app of schema.properties.sourceApp.enum) {
  assert(APP_IDS.includes(app), `app id in sync: ${app}`);
}
assert(ALLOWED_PARAMS.length === 11, "allowlist documented");

// cropId allowlist rejects derived (non-registry) IDs
const derivedIn = parseInboundContext({ source: "diagnosis-assistant", cropId: "barley" });
assert(!derivedIn.ok, "derived non-registry cropId (barley) rejected pending registry review");

// ── 9. UI auto-wiring stays OFF until the owner approves the draft contract ──
// Phase 1 review requirement: inbound context PARSING ships, but it must NOT
// be wired into app startup automatically. Guard: the app entry files must not
// reference the adapter at all, so existing direct entries, tab behaviour and
// browser-back semantics are provably untouched. Wiring is intentionally
// deferred and documented in docs/integration/cabi-inbound-adapter.md §3.
for (const entryFile of ["src/main.jsx", "src/App.jsx", "index.html"]) {
  const entry = readFileSync(join(ROOT, entryFile), "utf8");
  assert(!entry.includes("parseInboundContext"), `${entryFile} does not auto-wire the inbound adapter`);
  assert(!entry.includes("inboundContext"), `${entryFile} does not import the inbound adapter module`);
}

console.log(`\ninboundContext.test: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
