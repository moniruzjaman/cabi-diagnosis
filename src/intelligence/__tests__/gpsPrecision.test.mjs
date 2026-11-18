// GPS Precision tests — asserts accuracy-tier boundaries, the rejection
// threshold, Bangla tier labels, and that modelLimitations are present.
import {
  getAccuracyTier,
  shouldRejectReading,
  tierLabelBn,
  ACCURACY_REJECTION_THRESHOLD,
  GPS_PRECISION_LIMITATIONS,
} from "../gpsPrecision.js";

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

// 1. Tier boundaries (spec examples)
assert(getAccuracyTier(4) === "high", "4m → high");
assert(getAccuracyTier(6) === "medium", "6m → medium");
assert(getAccuracyTier(20) === "low", "20m → low");
assert(getAccuracyTier(30) === "rejected", "30m → rejected");

// 2. Edge cases at tier boundaries
assert(getAccuracyTier(5) === "medium", "5m boundary → medium");
assert(getAccuracyTier(15) === "low", "15m boundary → low");
assert(getAccuracyTier(25) === "low", "25m boundary → low (not rejected)");
assert(getAccuracyTier(26) === "rejected", "26m → rejected");
assert(getAccuracyTier(null) === "rejected", "null accuracy → rejected");
assert(getAccuracyTier(Number.NaN) === "rejected", "NaN accuracy → rejected");

// 3. shouldRejectReading (spec examples + boundary)
assert(shouldRejectReading(24) === false, "24m → not rejected");
assert(shouldRejectReading(26) === true, "26m → rejected");
assert(shouldRejectReading(25) === false, "25m boundary → not rejected");
assert(shouldRejectReading(50) === true, "50m → rejected");
assert(shouldRejectReading(null) === true, "null → rejected");

// 4. Custom max threshold honoured
assert(shouldRejectReading(12, 10) === true, "12m with max=10 → rejected");
assert(shouldRejectReading(8, 10) === false, "8m with max=10 → not rejected");

// 5. Rejection threshold constant + Bangla labels
assert(ACCURACY_REJECTION_THRESHOLD === 25, "ACCURACY_REJECTION_THRESHOLD is 25");
assert(tierLabelBn("high") === "উচ্চ নির্ভুলতা", "tierLabelBn(high)");
assert(tierLabelBn("medium") === "মাঝারি নির্ভুলতা", "tierLabelBn(medium)");
assert(tierLabelBn("low") === "কম নির্ভুলতা", "tierLabelBn(low)");
assert(tierLabelBn("rejected") === "প্রত্যাখ্যাত", "tierLabelBn(rejected)");

// 6. modelLimitations present
assert(GPS_PRECISION_LIMITATIONS.length > 0, "gpsPrecision exposes modelLimitations");

console.log(`\ngpsPrecision.test: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
