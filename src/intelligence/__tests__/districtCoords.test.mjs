// District Coords tests (Phase 5) — asserts:
//  - getDistrictCoord returns {lat,lng} for a known district
//  - getDistrictCoord returns null for unknown / bad input
//  - DISTRICT_COORDS covers all 64 Bangladesh districts
//  - nearestDistrict returns the closest by haversine
//  - nearestDistrict returns null for bad input
//  - haversineKm returns 0 for identical points and a sane distance for Dhaka→Chittagong
//  - modelLimitations present
import {
  DISTRICT_COORDS,
  getDistrictCoord,
  nearestDistrict,
  haversineKm,
  DISTRICT_COORDS_MODEL_LIMITATIONS,
} from "../districtCoords.js";

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

// 1. Known district returns a {lat,lng} centroid.
const dhaka = getDistrictCoord("ঢাকা");
assert(dhaka && typeof dhaka.lat === "number" && typeof dhaka.lng === "number", "ঢাকা → {lat,lng}");
assert(dhaka.lat === 23.81 && dhaka.lng === 90.41, "ঢাকা centroid matches expected value");

// 2. Another known district (Rajshahi belt).
const bogura = getDistrictCoord("বগুড়া");
assert(bogura && bogura.lat === 24.85, "বগুড়া centroid present");

// 3. Unknown district → null.
assert(getDistrictCoord("XYZ") === null, "unknown district → null");

// 4. Bad input → null.
assert(getDistrictCoord(null) === null, "null input → null");
assert(getDistrictCoord("") === null, "empty string → null");
assert(getDistrictCoord(123) === null, "non-string → null");

// 5. All 64 Bangladesh districts are covered.
assert(Object.keys(DISTRICT_COORDS).length === 64, `64 districts (got ${Object.keys(DISTRICT_COORDS).length})`);

// 6. A sampling of major districts all resolve.
for (const name of ["চট্টগ্রাম", "রাজশাহী", "খুলনা", "সিলেট", "বরিশাল", "রংপুর", "ময়মনসিংহ", "কুমিল্লা"]) {
  assert(getDistrictCoord(name) !== null, `major district resolves: ${name}`);
}

// 7. nearestDistrict: a point in Dhaka → "ঢাকা".
assert(nearestDistrict(23.81, 90.41) === "ঢাকা", "point in Dhaka → nearest = ঢাকা");

// 8. nearestDistrict: a point near Bogura → "বগুড়া".
assert(nearestDistrict(24.85, 89.37) === "বগুড়া", "point near Bogura → nearest = বগুড়া");

// 9. nearestDistrict: bad input → null.
assert(nearestDistrict(null, null) === null, "nearestDistrict(null,null) → null");
assert(nearestDistrict(NaN, NaN) === null, "nearestDistrict(NaN,NaN) → null");

// 10. haversineKm: identical points → 0.
assert(haversineKm(23.81, 90.41, 23.81, 90.41) === 0, "haversine identical → 0");

// 11. haversineKm: Dhaka → Chittagong is roughly 200-230 km (great-circle).
const d = haversineKm(23.81, 90.41, 22.36, 91.8);
assert(d > 200 && d < 230, `Dhaka→Chittagong ~200-230km (got ${d.toFixed(1)})`);

// 12. nearestDistrict picks the geographically closest, not the alphabetically first.
// A point just west of Dhaka (Manikganj area) should resolve to মানিকগঞ্জ, not ঢাকা.
assert(nearestDistrict(23.86, 90.13) === "মানিকগঞ্জ", "point in Manikganj → nearest = মানিকগঞ্জ");

// 13. modelLimitations present.
assert(
  DISTRICT_COORDS_MODEL_LIMITATIONS.some((m) => m.includes("approximate district centroids")),
  "modelLimitations notes approximate centroids",
);

console.log(`\ndistrictCoords.test: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
