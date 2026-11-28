// Symptom-path crop-identity disclosure (F2) + ambiguous-route copy (F3).
// Acceptance review A2 follow-ups:
//   F2 — the non-vision symptom path must NOT silently alias a selectable crop
//        to a different crop's disease section. When it does (bell pepper →
//        মরিচ), diagnoseOffline returns a one-line Bangla disclosure.
//   F3 — the ambiguous-route reasonBn references the ENTERED name generically
//        (bare মরিচ resolves to chili; only bare English "pepper" is ambiguous).
import { diagnoseOffline } from "../../offline/diagnosticEngine.js";
import { resolveVisionRoute } from "../../offline/visionRouter.js";
import { resolveCanonicalCrop } from "../../data/canonicalCrops.js";

let pass = 0,
  fail = 0;
function assert(cond, msg) {
  if (cond) pass++;
  else {
    fail++;
    console.error("FAIL:", msg);
  }
}

const diag = (crop) => diagnoseOffline({ crop, symptoms: { leafSymptoms: "পাতায় কালো দাগ" } });

// ── F2: bell-pepper family selected → disclosed alias to মরিচ. ────────────
for (const crop of ["বাটি মরিচ / Bell Pepper", "শিমলা মরিচ / Capsicum", "Bell pepper", "মিষ্টি মরিচ"]) {
  const r = diag(crop);
  assert(
    typeof r.cropIdentityDisclosure === "string" && r.cropIdentityDisclosure.length > 0,
    `disclosure shown for ${crop}`,
  );
  assert(r.cropIdentityDisclosure.includes("রেফারেন্স"), `disclosure explains nearby-crop reference for ${crop}`);
}

// ── F2: identity-true crops are NOT disclosed (no false positives). ────────
for (const crop of ["মরিচ / Chilli", "মরিচ", "ধান", "আলু", "টমেটো", "বেগুন"]) {
  const r = diag(crop);
  assert(r.cropIdentityDisclosure === null, `no disclosure for identity-true crop ${crop}`);
}

// The disclosure only fires when a disease section is actually resolved.
const noSection = diagnoseOffline({ crop: "অজানা ফসল", symptoms: { leafSymptoms: "দাগ" } });
assert(noSection.cropIdentityDisclosure === null, "no disclosure when no disease section resolves");

// Disclosure is additive — existing diagnosis fields remain intact.
const r = diag("Bell pepper");
assert(
  "primarySuspect" in r && "specificDisease" in r && "confidence" in r,
  "disclosure is additive; core fields intact",
);

// ── F3: ambiguous route copy references the entered token, not a fixed one. ─
const amb = resolveVisionRoute("pepper");
assert(amb.engine === "ambiguous", "bare 'pepper' is ambiguous");
assert(amb.reasonBn.includes('"pepper"'), "ambiguous copy quotes the entered name (pepper)");
assert(!amb.reasonBn.includes('"মরিচ"'), "ambiguous copy no longer hardcodes মরিচ");

// Bare মরিচ is source-backed → chili, NOT ambiguous (so the old copy was wrong).
const morich = resolveVisionRoute("মরিচ");
assert(morich.engine !== "ambiguous", "bare মরিচ is not ambiguous");
assert(resolveCanonicalCrop("মরিচ").cropId === "chili", "bare মরিচ resolves to chili");

console.log(`\ncropIdentityDisclosure.test: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
