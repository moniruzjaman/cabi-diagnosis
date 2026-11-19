import { useMemo } from "react";
import { CROP_DISEASES, resolveCropKey } from "../../data/cropDiseases";
import { CROP_CALENDAR, getCurrentRiskAlerts } from "../../data/cropCalendar";
import { getPestsByCrop } from "../../intelligence/pestEngine.js";

/**
 * PreventionPlan — Pillar 3 (PREVENT).
 *
 * Builds a preventive crop-health plan for a selected crop from:
 *   - resistant varieties documented in cropDiseases.js recommendations
 *   - cultural/hygiene practices from disease recommendations
 *   - seasonal risk alerts from the crop calendar (getCurrentRiskAlerts)
 *   - crop calendar season windows (what to do this month)
 *
 * Nothing is invented here — every line shown is derived from the existing
 * agronomic datasets (cropDiseases.js / cropCalendar.js) or the diagnosis
 * context passed in. Where a crop has no documented data, we say so.
 */

const HYGIENE_KEYWORDS = [
  "সরিয়ে",
  "পরিষ্কার",
  "শোধন",
  "সান",
  "পুড়িয়ে",
  "সরান",
  "নষ্ট",
  "আগাছা",
  "স্যানিটাইজ",
  "বীজ শোধন",
];
const VARIETY_KEYWORDS = ["জাত", "প্রতিরোধী"];
const ROTATION_KEYWORDS = ["চষা", "ক্রম", "ফসল পরিবর্তন", "রোটেশন", "পালা", "বর্ষা"];

function isPreventionLine(rec) {
  const r = rec || "";
  return (
    HYGIENE_KEYWORDS.some((k) => r.includes(k)) ||
    ROTATION_KEYWORDS.some((k) => r.includes(k)) ||
    r.includes("দূরত্ব") ||
    r.includes("নিষ্কাশন") ||
    r.includes("জল") ||
    r.includes("সেচ")
  );
}

function isVarietyLine(rec) {
  const r = rec || "";
  return VARIETY_KEYWORDS.some((k) => r.includes(k));
}

export default function PreventionPlan({ C, crop, district, weatherRisk, onOpenProtection }) {
  const data = useMemo(() => {
    // form.crop may be bilingual ("Rice / ধান") — resolveCropKey maps any
    // format to the CROP_DISEASES key, exactly like the diagnose flow does.
    const cropKey = crop ? (CROP_DISEASES[crop] ? crop : resolveCropKey(crop)) : null;
    if (!cropKey || !CROP_DISEASES[cropKey]) return null;

    const varieties = new Set();
  ...[truncated]