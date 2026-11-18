// ============================================================
// Plant Detective — Crop Health Intelligence
// District Coordinates (Phase 5) — a lookup table of Bangladesh's
// 64 districts with approximate {lat, lng} centroids.
//
// Used by the copilot + case context to translate a Bangla district
// name into a geographic centroid, and to find the nearest district
// for a given lat/lng (e.g. from device geolocation).
//
// modelLimitations:
//  - coordinates are approximate district centroids, not field-level.
//  - centroids are rounded to 2 decimal places (~1-2 km precision);
//    they are public geographic knowledge, not survey-grade data.
//  - nearestDistrict() uses the haversine great-circle distance, which
//    ignores roads/rivers — useful only for "which district am I in".
// ============================================================

/**
 * Bangladesh's 64 districts (zila) with approximate centroid coordinates.
 * Coordinates are public geographic data, rounded to 2 decimals.
 * @type {Record<string, {lat: number, lng: number}>}
 */
export const DISTRICT_COORDS = {
  // Division: Dhaka
  ঢাকা: { lat: 23.81, lng: 90.41 },
  গাজীপুর: { lat: 24.0, lng: 90.43 },
  নারায়ণগঞ্জ: { lat: 23.62, lng: 90.5 },
  নরসিংদী: { lat: 23.92, lng: 90.72 },
  মানিকগঞ্জ: { lat: 23.86, lng: 90.13 },
  মুন্সিগঞ্জ: { lat: 23.46, lng: 90.47 },
  ফরিদপুর: { lat: 23.6, lng: 89.84 },
  রাজবাড়ী: { lat: 23.75, lng: 89.65 },
  মাদারীপুর: { lat: 23.17, lng: 89.92 },
  গোপালগঞ্জ: { lat: 23.0, lng: 89.82 },
  শরীয়তপুর: { lat: 23.24, lng: 90.43 },
  টাঙ্গাইল: { lat: 24.25, lng: 89.92 },
  কিশোরগঞ্জ: { lat: 24.43, lng: 90.78 },
  // Division: Chittagong
  চট্টগ্রাম: { lat: 22.36, lng: 91.8 },
  কক্সবাজার: { lat: 21.43, lng: 92.01 },
  কুমিল্লা: { lat: 23.46, lng: 91.18 },
  ব্রাহ্মণবাড়িয়া: { lat: 23.96, lng: 91.11 },
  চাঁদপুর: { lat: 23.23, lng: 90.65 },
  নোয়াখালী: { lat: 22.83, lng: 91.1 },
  ফেনী: { lat: 23.02, lng: 91.39 },
  লক্ষ্মীপুর: { lat: 22.95, lng: 90.84 },
  খাগড়াছড়ি: { lat: 23.12, lng: 91.98 },
  রাঙ্গামাটি: { lat: 22.53, lng: 92.2 },
  বান্দরবান: { lat: 22.2, lng: 92.27 },
  // Division: Rajshahi
  রাজশাহী: { lat: 24.36, lng: 88.6 },
  নাটোর: { lat: 24.42, lng: 89.0 },
  নওগাঁ: { lat: 24.8, lng: 88.93 },
  চাঁপাইনবাবগঞ্জ: { lat: 24.57, lng: 88.27 },
  পাবনা: { lat: 24.0, lng: 89.23 },
  সিরাজগঞ্জ: { lat: 24.45, lng: 89.7 },
  বগুড়া: { lat: 24.85, lng: 89.37 },
  জয়পুরহাট: { lat: 25.1, lng: 89.02 },
  // Division: Khulna
  খুলনা: { lat: 22.82, lng: 89.56 },
  যশোর: { lat: 23.17, lng: 89.2 },
  মাগুরা: { lat: 23.29, lng: 89.42 },
  ঝিনাইদহ: { lat: 23.55, lng: 89.0 },
  নড়াইল: { lat: 23.03, lng: 89.5 },
  কুষ্টিয়া: { lat: 23.9, lng: 89.12 },
  চুয়াডাঙ্গা: { lat: 23.64, lng: 88.86 },
  মেহেরপুর: { lat: 23.8, lng: 88.63 },
  বাগেরহাট: { lat: 22.67, lng: 89.79 },
  সাতক্ষীরা: { lat: 22.59, lng: 89.08 },
  // Division: Barisal
  বরিশাল: { lat: 22.7, lng: 90.37 },
  বরগুনা: { lat: 22.19, lng: 90.13 },
  ভোলা: { lat: 22.69, lng: 90.65 },
  পটুয়াখালী: { lat: 22.36, lng: 90.32 },
  পিরোজপুর: { lat: 22.58, lng: 89.99 },
  ঝালকাঠি: { lat: 22.64, lng: 90.2 },
  // Division: Sylhet
  সিলেট: { lat: 24.89, lng: 91.87 },
  মৌলভীবাজার: { lat: 24.48, lng: 91.78 },
  হবিগঞ্জ: { lat: 24.38, lng: 91.42 },
  সুনামগঞ্জ: { lat: 25.07, lng: 91.4 },
  // Division: Rangpur
  রংপুর: { lat: 25.74, lng: 89.28 },
  দিনাজপুর: { lat: 25.63, lng: 88.64 },
  গাইবান্ধা: { lat: 25.33, lng: 89.54 },
  কুড়িগ্রাম: { lat: 25.81, lng: 89.65 },
  লালমনিরহাট: { lat: 25.99, lng: 89.28 },
  নীলফামারী: { lat: 25.93, lng: 88.86 },
  পঞ্চগড়: { lat: 26.33, lng: 88.56 },
  ঠাকুরগাঁও: { lat: 26.03, lng: 88.47 },
  // Division: Mymensingh
  ময়মনসিংহ: { lat: 24.75, lng: 90.4 },
  নেত্রকোণা: { lat: 24.89, lng: 90.73 },
  জামালপুর: { lat: 24.92, lng: 89.95 },
  শেরপুর: { lat: 25.02, lng: 90.03 },
};

/** @returns {string[]} modelLimitations for this module */
export const DISTRICT_COORDS_MODEL_LIMITATIONS = [
  "coordinates are approximate district centroids, not field-level",
  "centroids rounded to 2 decimals (~1-2 km); not survey-grade",
  "nearestDistrict uses haversine great-circle distance, ignoring roads/rivers",
];

/**
 * Look up a district's centroid by Bangla name.
 * @param {string} nameBn — Bangla district name (e.g. "ঢাকা")
 * @returns {{lat: number, lng: number}|null} — null if unknown
 */
export function getDistrictCoord(nameBn) {
  if (typeof nameBn !== "string" || nameBn.length === 0) return null;
  const c = DISTRICT_COORDS[nameBn];
  return c ? { lat: c.lat, lng: c.lng } : null;
}

/**
 * Find the nearest district (by name) to a lat/lng using haversine distance.
 * @param {number} lat
 * @param {number} lng
 * @returns {string|null} — Bangla district name, or null if coords invalid
 */
export function nearestDistrict(lat, lng) {
  if (typeof lat !== "number" || typeof lng !== "number" || Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }
  let best = null;
  let bestDist = Infinity;
  for (const [name, c] of Object.entries(DISTRICT_COORDS)) {
    const d = haversineKm(lat, lng, c.lat, c.lng);
    if (d < bestDist) {
      bestDist = d;
      best = name;
    }
  }
  return best;
}

/**
 * Haversine great-circle distance in kilometres.
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} kilometres
 */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius, km
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
