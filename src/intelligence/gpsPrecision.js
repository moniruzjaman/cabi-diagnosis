// ============================================================
// Plant Detective — Crop Health Intelligence (Phase 3)
// GPS Precision — accuracy tiers + rejection threshold for the
// Field Location Picker. Low-accuracy readings are rejected before
// they pollute the field-health record.
//
// Original design. Accuracy tiers are a standard engineering pattern.
// No code ported from any repository.
// ============================================================

/**
 * Readings worse than this (in metres) are rejected outright — the field
 * boundary would be unreliable. 25 m is a generous cap that still lets a
 * phone-grade GPS through when it has a decent fix.
 */
export const ACCURACY_REJECTION_THRESHOLD = 25;

const TIER_LABELS_BN = {
  high: "উচ্চ নির্ভুলতা",
  medium: "মাঝারি নির্ভুলতা",
  low: "কম নির্ভুলতা",
  rejected: "প্রত্যাখ্যাত",
};

const PRECISION_LIMITATIONS = [
  "নির্ভুলতা স্তর GPS সেন্সরের রিপোর্টকৃত মানের উপর নির্ভর করে — বাস্তব নির্ভুলতা আলাদা হতে পারে।",
  "২৫ মিটারের বেশি ভুল থাকলে রিডিং প্রত্যাখ্যাত — ক্ষেতের সীমানা নির্ধারণে অনির্ভরযোগ্য।",
];

/**
 * Classify a GPS accuracy value (metres) into a tier.
 *   < 5 m   → high
 *   5–15 m  → medium
 *   15–25 m → low
 *   > 25 m  → rejected
 *
 * @param {number} accuracyMeters
 * @returns {"high"|"medium"|"low"|"rejected"}
 */
export function getAccuracyTier(accuracyMeters) {
  if (accuracyMeters == null || Number.isNaN(accuracyMeters)) return "rejected";
  if (accuracyMeters < 5) return "high";
  if (accuracyMeters < 15) return "medium";
  if (accuracyMeters <= 25) return "low";
  return "rejected";
}

/**
 * Should a reading with this accuracy be rejected? True when accuracy
 * exceeds the max-allowed metres (default 25).
 *
 * @param {number} accuracyMeters
 * @param {number} [maxMeters=25]
 * @returns {boolean}
 */
export function shouldRejectReading(accuracyMeters, maxMeters = ACCURACY_REJECTION_THRESHOLD) {
  if (accuracyMeters == null || Number.isNaN(accuracyMeters)) return true;
  return accuracyMeters > maxMeters;
}

/**
 * Bangla display label for an accuracy tier.
 * @param {"high"|"medium"|"low"|"rejected"} tier
 * @returns {string}
 */
export function tierLabelBn(tier) {
  return TIER_LABELS_BN[tier] ?? "অজানা";
}

export const GPS_PRECISION_LIMITATIONS = PRECISION_LIMITATIONS;
