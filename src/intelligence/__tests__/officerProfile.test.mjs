// Officer Profile tests (Phase 4) — local-only identity, advisory role check.
// Mocks localStorage with a Map; no React, no network.
const STORE = new Map();
globalThis.localStorage = {
  getItem: (k) => STORE.get(k) ?? null,
  setItem: (k, v) => void STORE.set(k, String(v)),
  removeItem: (k) => void STORE.delete(k),
};

const { getOfficerProfile, setOfficerProfile, clearOfficerProfile, isOfficer, canVerify, modelLimitations } =
  await import("../officerProfile.js");

let pass = 0,
  fail = 0;
function assert(cond, msg) {
  if (cond) {
    pass++;
  } else {
    fail++;
    console.error("FAIL:", msg);
  }
}

// 1. No profile → null (user treated as farmer)
assert(getOfficerProfile() === null, "getOfficerProfile() is null when empty");

// 2. Round-trip: set then get keeps nameBn + upazila
const officer = setOfficerProfile({ nameBn: "করিম আহমেদ", upazila: "সাভার", role: "officer" });
const got = getOfficerProfile();
assert(got !== null, "getOfficerProfile() returns the stored profile");
assert(got.nameBn === "করিম আহমেদ", "nameBn round-trips");
assert(got.upazila === "সাভার", "upazila round-trips");
assert(got.id && typeof got.id === "string", "id is generated");
assert(got.createdAt && typeof got.createdAt === "string", "createdAt is generated");

// 3. role defaults to "farmer" when an invalid/missing role is given
const farmerish = setOfficerProfile({ nameBn: "রহিম", upazila: "ঢাকা", role: "nope" });
assert(farmerish.role === "farmer", "invalid role coerces to farmer");

// 4. isOfficer: officer → true, admin → true, farmer → false, null → false
assert(isOfficer(got) === true, "isOfficer(true) for officer profile");
const admin = setOfficerProfile({ nameBn: "অ্যাডমিন", role: "admin" });
assert(isOfficer(admin) === true, "isOfficer(true) for admin profile");
setOfficerProfile({ nameBn: "কৃষক", role: "farmer" });
assert(isOfficer() === false, "isOfficer(false) for farmer profile");
clearOfficerProfile();
assert(isOfficer() === false, "isOfficer(false) when no profile (null)");

// 5. canVerify mirrors isOfficer (alias)
setOfficerProfile({ nameBn: "অফিসার ২", role: "officer" });
assert(canVerify() === true, "canVerify(true) for officer");
assert(canVerify(getOfficerProfile()) === true, "canVerify(profile) works with explicit arg");
clearOfficerProfile();
assert(canVerify(null) === false, "canVerify(false) for null");

// 6. clearOfficerProfile removes the stored profile
clearOfficerProfile();
assert(getOfficerProfile() === null, "clearOfficerProfile() wipes the profile");

// 7. modelLimitations are present and honest
assert(Array.isArray(modelLimitations) && modelLimitations.length === 2, "modelLimitations has 2 entries");
assert(
  modelLimitations.some((m) => m.includes("authentication")) && modelLimitations.some((m) => m.includes("advisory")),
  "modelLimitations mention authentication + advisory",
);

console.log(`\nofficerProfile.test: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
