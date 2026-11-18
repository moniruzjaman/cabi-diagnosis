// ============================================================
// Plant Detective — Crop Health Intelligence (Phase 3)
// GPS Utilities — haversine distance + Bangla-first coordinate
// formatting for the Field Health Passport.
//
// Original design. Haversine is standard spherical-geometry math
// (public domain). No code ported from any repository.
// ============================================================

// Mean Earth radius (km). Haversine assumes a sphere — good enough for
// field-scale distances (a few km); the ellipsoidal correction is <0.5%.
const EARTH_RADIUS_KM = 6371;

const GPS_LIMITATIONS = [
  "দূরত্ব গণনা Haversine সূত্র দিয়ে — এটি গোলকীয় পৃথিবী ধরে, স্থানীয় ভূসংস্থান বা উচ্চতা বিবেচনা করে না।",
  "GPS নির্ভুলতা মিটারে — প্রকৃত ক্ষেতের সীমানা থেকে কয়েক মিটার ব্যবধান থাকতে পারে।",
];

const toRad = (deg) => (deg * Math.PI) / 180;

/**
 * Haversine distance between two {lat, lng} coordinates, in kilometres.
 *
 * @param {{lat: number, lng: number}} a
 * @param {{lat: number, lng: number}} b
 * @returns {number} distance in km (0 if either point is missing)
 */
export function haversineDistance(a, b) {
  if (!a || !b || a.lat == null || a.lng == null || b.lat == null || b.lng == null) {
    return 0;
  }
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_KM * c;
}

/**
 * Format a {lat, lng} pair for Bangla display.
 *
 * Uses English numerals for precision (a Bangla-numeric "২৩.৮১" can be
 * misread by agronomic tools that expect ASCII), with cardinal-direction
 * suffixes (°N/°S/°E/°W). This is the safest cross-tool representation;
 * the surrounding UI labels remain Bangla.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {string} e.g. "23.81°N, 90.41°E"
 */
export function formatLatLon(lat, lng) {
  if (lat == null || lng == null) return "—";
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}°${latDir}, ${Math.abs(lng).toFixed(2)}°${lngDir}`;
}

/**
 * Distance from a case's recorded field location to an arbitrary point.
 * Reads `caseObj.fieldLocation` (Phase 3 field, shape {lat, lng, accuracy}).
 * Returns null when the case has no field location recorded.
 *
 * @param {object} caseObj - crop health case with optional fieldLocation
 * @param {{lat: number, lng: number}} point
 * @returns {number|null} distance in km, or null if no field location
 */
export function distanceToField(caseObj, point) {
  const field = caseObj?.fieldLocation;
  if (!field || field.lat == null || field.lng == null || !point) {
    return null;
  }
  return haversineDistance({ lat: field.lat, lng: field.lng }, point);
}

export const GPS_MODEL_LIMITATIONS = GPS_LIMITATIONS;
