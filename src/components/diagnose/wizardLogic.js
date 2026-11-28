// Structured Intake Wizard — pure logic (framework-free).
//
// Extracted from StructuredIntakeWizard.jsx so the 5-step navigation,
// inline-validation gating, and symptom scoring can be unit-tested in plain
// node (the .jsx component itself needs a React renderer). The component
// imports these helpers; behaviour is unchanged.
//
// Step model: 1 ফসল → 2 অংশ → 3 লক্ষণ → 4 ছবি (optional) → 5 ফলাফল.

import { getDiseasesByCrop } from "../../intelligence/diseaseEngine.js";
import { mergeDiagnoses } from "../../intelligence/diagnosisMerger.js";

// Crops offered in Step 1. ids match diseaseEngine.js cropIds.
export const CROPS = [
  { id: "rice", bn: "ধান", emoji: "🌾" },
  { id: "potato", bn: "আলু", emoji: "🥔" },
  { id: "tomato", bn: "টমেটো", emoji: "🍅" },
  { id: "brinjal", bn: "বেগুন", emoji: "🍆" },
  { id: "chili", bn: "মরিচ", emoji: "🌶️" },
  { id: "mustard", bn: "সরিষা", emoji: "🌼" },
  { id: "jute", bn: "পাট", emoji: "🌿" },
  { id: "wheat", bn: "গম", emoji: "🌾" },
  { id: "onion", bn: "পেঁয়াজ", emoji: "🧅" },
  { id: "maize", bn: "ভুট্টা", emoji: "🌽" },
];

// Step 2 — affected plant part.
export const PARTS = [
  { id: "leaf", bn: "পাতা" },
  { id: "stem", bn: "কাণ্ড" },
  { id: "fruit", bn: "ফল" },
  { id: "root", bn: "মূল" },
  { id: "whole", bn: "পুরো গাছ" },
];

// Step 3 — 8-way symptom taxonomy. Keywords match against diseaseEngine
// symptomsBn/symptoms text. Authored for Bangla symptom phrasing.
export const SYMPTOM_TYPES = [
  { id: "discolor", bn: "বিবর্ণতা", keys: ["হলুদ", "বিবর্ণ", "পোড়া", "সাদা", "কমলা", "লাল-বাদামি", "পাতা হলুদ"] },
  {
    id: "spots",
    bn: "দাগ",
    keys: ["দাগ", "গোলাকার", "মাকু", "বেগুনি", "কালো দাগ", "পাউডার", "গুঁড়া", "মরিচা", "মরচে"],
  },
  { id: "rot", bn: "পচন", keys: ["পচা", "পচে", "পচন", "ঘাড়", "শিথ", "গোড়া পচে", "কাণ্ড পচা", "স্টেম এন্ড"] },
  {
    id: "wilt",
    bn: "কুঁচকানো",
    keys: ["কুঁচক", "কুঁকড়ি", "বাঁকিয়ে", "নেতিয়ে", "শুকিয়ে", "ঝরে", "মরছে", "শুকিয়ে যাওয়া"],
  },
  { id: "deform", bn: "বিকৃতি", keys: ["বিকৃত", "মোজেইক", "মালফরমেশন", "ঘন", "গুচ্ছ", "বাঁকিয়ে যাচ্ছে"] },
  { id: "pest_damage", bn: "পোকার ক্ষতি", keys: ["পোকা", "ছিদ্র", "পাতাফড়িং", "বোরার", "মাকড়", "ছিদ্রকারী"] },
  { id: "growth", bn: "বৃদ্ধি সমস্যা", keys: ["বামন", "ছোট", "ফল ধারণ", "শীষ চিটা", "দানা ছোট", "ফল ছোট", "ছোট হয়ে"] },
  { id: "not_sure", bn: "নিশ্চিত নই", keys: [] },
];

// Part → keyword hints for part-aware scoring.
export const PART_KEYS = {
  leaf: ["পাতা", "পাতায়", "পাতার"],
  stem: ["কাণ্ড", "কান্ড", "গোড়া", "শিথ", "ঘাড়", "ডগা", "আগা", "কাণ্ডের"],
  fruit: ["ফল", "শীষ", "দানা", "ফলে", "ফুল"],
  root: ["শিকড়", "মূল", "শেকড়"],
  whole: ["গাছ", "পুরো"],
};

export const STEPS = ["ফসল", "অংশ", "লক্ষণ", "ছবি", "ফলাফল"];
export const STEP_ICONS = ["🌾", "🍃", "🔎", "📷", "✅"];
// Which steps block "পরবর্তী" until a selection is made. Photo (index 3)
// is optional → false.
export const STEP_REQUIRED = [true, true, true, false, false];
export const STEP_HELP = [
  "কোন ফসলে সমস্যা হচ্ছে?",
  "গাছের কোন অংশে আগে লক্ষ করেছেন?",
  "সবচেয়ে কাছাকাছি লক্ষণটি বেছে নিন।",
  "ছবি দিলে মিলিয়ে দেখা আরও সহজ হবে।",
  "সম্ভাব্য কারণ ও পরের পদক্ষেপ দেখুন।",
];
// One-sentence "why this matters" per step (plan §7.2).
export const STEP_WHY = [
  "ফসল জানা থাকলে শুধু সেই ফসলের রোগের তালিকা মিলানো হয় — ভুল ধরার সম্ভাবনা কমে।",
  "একই রোগ পাতা ও শিকড়ে ভিন্নভাবে দেখা যায়; অংশ জানলে মিল বেশি নির্ভুল হয়।",
  "লক্ষণের ধরনই নির্ণয়ের মূল সূত্র — এটি সঠিক হলে ফলাফল বেশি আস্থার যোগ্য হয়।",
  "ছবি বাধ্যতামূলক নয়; দিলে মাঠ যাচাইয়ে তুলনা সহজ হয়। ছবি ব্রাউজারেই থাকে।",
  "এটি প্রাথমিক পরামর্শ — মাঠে মিলিয়ে নিশ্চিত করে তবেই ব্যবস্থা নিন।",
];
// Inline validation messages (plan §7.2).
export const STEP_ERROR_BN = {
  1: "অনুগ্রহ করে ফসল নির্বাচন করুন।",
  2: "ক্ষতিগ্রস্ত অংশটি নির্বাচন করুন।",
  3: "লক্ষণের ধরন নির্বাচন করুন।",
};

/**
 * Whether the user may advance past `step` given the current selections.
 * Steps 1–3 require their selection; step 4 (photo) is always optional;
 * step 5 is the result (no advance).
 */
export function canAdvance(step, sel = {}) {
  if (step === 1) return !!sel.cropId;
  if (step === 2) return !!sel.partId;
  if (step === 3) return !!sel.symptomTypeId;
  if (step === 4) return true; // photo optional
  return false;
}

/**
 * Pure "next" transition. Returns a new state object; never mutates.
 * - On step 4 it sets `pendingAnalysis: true` (the caller runs the async
 *   analysis, then dispatches COMPLETE_ANALYSIS).
 * - When the required selection for the current step is missing it sets
 *   `showError: true` and stays on the same step (inline validation).
 * - Otherwise it advances one step and clears the error.
 *
 * @param {{step:number, cropId?:string, partId?:string, symptomTypeId?:string, showError?:boolean}} state
 */
export function nextNav(state) {
  const step = state.step;
  if (step >= 5) return state;
  if (step === 4) return { ...state, pendingAnalysis: true, showError: false };
  if (!canAdvance(step, state)) return { ...state, showError: true };
  return { ...state, step: step + 1, showError: false };
}

/** Pure "back" transition. Step 1 is the floor; clears error. */
export function backNav(state) {
  if (state.step <= 1) return { ...state, showError: false };
  return { ...state, step: state.step - 1, showError: false, pendingAnalysis: false };
}

/** Transition applied after the async analysis resolves. */
export function completeAnalysis(state) {
  return { ...state, step: 5, pendingAnalysis: false, showError: false };
}

/**
 * Score a candidate disease against the selected symptom type + part.
 * Returns confidence 40..85. This is a symptom-rules heuristic, NOT a
 * calibrated model — see modelLimitations in the merger output.
 */
export function scoreDisease(disease, symptomTypeId, partId) {
  const st = SYMPTOM_TYPES.find((s) => s.id === symptomTypeId);
  const pool = [...(disease.symptomsBn || []), ...(disease.symptoms || [])];
  const text = pool.join(" ");

  // not_sure → flat low confidence for all candidates.
  if (!st || st.keys.length === 0) return 40;

  let typeHits = 0;
  for (const k of st.keys) if (text.includes(k)) typeHits += 1;
  let partHits = 0;
  const pk = PART_KEYS[partId] || [];
  for (const k of pk) if (text.includes(k)) partHits += 1;

  const conf = 40 + typeHits * 12 + partHits * 6;
  return Math.max(40, Math.min(85, conf));
}

/**
 * Build a ranked diagnosis from the structured inputs, then merge via
 * the Phase 5 diagnosisMerger (single symptom_wizard source → the merger
 * still dedups + assigns agreement + modelLimitations).
 */
export function diagnose({ cropId, partId, symptomTypeId }) {
  const candidates = getDiseasesByCrop(cropId);
  const matches = candidates
    .map((d) => {
      const confidence = scoreDisease(d, symptomTypeId, partId);
      return {
        diseaseId: d.id,
        confidence,
        evidence: [
          `${d.nameBn} — ${SYMPTOM_TYPES.find((s) => s.id === symptomTypeId)?.bn || "লক্ষণ"}`,
          `ক্ষতিগ্রস্ত অংশ: ${PARTS.find((p) => p.id === partId)?.bn || ""}`,
        ],
      };
    })
    .sort((a, b) => b.confidence - a.confidence);

  const merged = mergeDiagnoses([{ source: "symptom_wizard", matches }]);
  // Attach the full disease objects to each result for the UI.
  const byId = new Map(candidates.map((d) => [d.id, d]));
  const top = merged.topDisease ? byId.get(merged.topDisease.diseaseId) : null;
  const alternatives = merged.alternatives
    .map((a) => byId.get(a.diseaseId))
    .filter(Boolean)
    .slice(0, 2);
  return { merged, top, alternatives, candidatesCount: candidates.length };
}

/** Bengali display label for a crop id (falls back to the id). */
export function cropLabelBn(cropId) {
  return CROPS.find((c) => c.id === cropId)?.bn || cropId;
}
