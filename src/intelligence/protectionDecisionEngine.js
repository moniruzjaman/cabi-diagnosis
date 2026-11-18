// ============================================================
// Plant Detective — Crop Health Intelligence (Phase 2)
// Crop Protection Decision Engine — the compliance layer any chemical
// treatment must pass before being shown as "approved".
//
// This makes the Phase 1 spray recommendation's "follow the Crop
// Protection Decision Engine" warning real. A spray is NEVER approved
// unless ALL five gates pass:
//
//   Gate 1 — diagnosis_confirmed : is there a scouting observation confirming the disease?
//   Gate 2 — economic_threshold  : is disease risk ≥ 50 (justifies intervention)?
//   Gate 3 — moa_rotation        : is the proposed MoA rotation-compliant (window + cap)?
//   Gate 4 — weather_suitable    : is there a suitable spray window in the next 48h?
//   Gate 5 — pre_harvest_interval: if near harvest, is the PHI respected?
//
// Original design. Resistance-management principles are public-domain
// agronomic science (FRAC/IRAC/HRAC).
//
// Ported protection-intelligence STATUS LAYER (from the AgriChem/
// PesticideNext decision engine, adapted to this repo's case model):
// evaluateProtectionDecision now ALSO derives an explainable STATUS —
//   MONITOR · SCOUT_REQUIRED · IPM_ACTION · PREVENTIVE_ACTION ·
//   INTERVENTION_CONSIDERATION · CONDITIONS_UNSUITABLE · INSUFFICIENT_DATA
// — plus IPM-ladder-ordered actions (preventive → cultural → mechanical →
// biological → monitoring → chemical consideration) and a freshness gate
// (stale weather never approves a spray). The 5 gates are unchanged and
// remain the chemical-approval compliance layer; the status layer is the
// advisory wrapper around them.
// ============================================================

import { getMoaGroup, recommendNextMoa, getMoaCodesForPest, recommendNextMoaForPest } from "./moaDatabase.js";
import { getAllPests } from "./pestEngine.js";
import { assessMoaRotation, getAlternativeMoaOptions } from "./moaStewardship.js";
import { getMoaCodesForDisease } from "./moaDatabase.js";

const DECISION_LIMITATIONS = [
  "এই সিদ্ধান্ত ইঞ্জিন একটি সহায়ক সরঞ্জাম, চূড়ান্ত কর্তৃপক্ষ নয় — স্প্রে করার আগে উপসহকারী অফিসারের পরামর্শ নিন।",
  "অর্থনৈতিক সীমা (risk ≥ 50) একটি অনুমানিত হিউরিস্টিক, ক্যালিব্রেটেড সম্ভাবনা নয়।",
  "প্রি-হার্ভেস্ট ব্যবধান মূল্যায়ন ফসলের পর্যায় অনুমানের উপর নির্ভর করে।",
];

// Approximate days-to-harvest by growth stage (honest agronomic estimate).
const STAGE_DAYS_TO_HARVEST = {
  seedling: 90,
  germination: 95,
  vegetative: 70,
  tillering: 60,
  stem_elongation: 50,
  booting: 40,
  heading: 35,
  flowering: 30,
  grain_filling: 20,
  dough: 12,
  ripening: 7,
  harvest: 0,
  sowing: 100,
};

// ────────────────────────────────────────────────────────────
// Individual gate evaluators
// ────────────────────────────────────────────────────────────

/**
 * Gate 1: Is the disease diagnosis confirmed by a scouting observation?
 * Passes if the case has ≥1 observation with severity moderate+ (i.e. the
 * farmer actually looked and recorded symptoms). Without confirmation,
 * spraying is premature — scouting-first.
 * @param {object} caseObj
 * @param {string} _diseaseId - reserved for disease-specific confirmation (future)
 * @returns {import('./types.js').ProtectionGate}
 */
function evaluateDiagnosisGate(caseObj, _diseaseId) {
  const observations = caseObj.observations || [];
  const confirmed = observations.filter(
    (o) => o.severity === "moderate" || o.severity === "severe" || o.severity === "high",
  );
  // R3 — explicit confirmation required. An unconfirmed diagnosis (the
  // default) blocks chemical approval even when a moderate+ observation
  // exists. "rejected" (officer overturned) also blocks.
  const status = caseObj.confirmationStatus || "unconfirmed";
  const passed = status === "confirmed" && confirmed.length > 0;

  return {
    id: "diagnosis_confirmed",
    name: "Diagnosis Confirmed",
    nameBn: "রোগ নিশ্চিত",
    passed,
    reason: passed
      ? `${confirmed.length}টি পর্যবেক্ষণে রোগের লক্ষণ নিশ্চিত হয়েছে।`
      : "কোনো নিশ্চিত পর্যবেক্ষণ নেই — প্রথমে ক্ষেত পর্যবেক্ষণ করুন, তারপর স্প্রে বিবেচনা করুন।",
    reasonEn: passed
      ? `${confirmed.length} observation(s) confirm disease symptoms.`
      : "No confirmed observation — scout the field first before considering a spray.",
    evidence: confirmed.map((o) => o.notes || o.symptoms || `obs ${o.id}`).filter(Boolean),
  };
}

/**
 * Gate 2: Is disease risk ≥ the economic threshold (50)?
 * Below 50, scouting continues (Phase 1 scouting-first policy).
 * @param {object} riskRadar - Phase 1 computeRiskRadar result
 * @param {string} diseaseId
 * @returns {import('./types.js').ProtectionGate}
 */
function evaluateEconomicThresholdGate(riskRadar, diseaseId) {
  const diseaseForecast = riskRadar?.diseaseForecast;
  const target = diseaseForecast?.diseases?.find((d) => d.disease.id === diseaseId);
  const riskScore = target?.risk ?? 0;
  const THRESHOLD = 50;
  const passed = riskScore >= THRESHOLD;

  return {
    id: "economic_threshold",
    name: "Economic Threshold",
    nameBn: "অর্থনৈতিক সীমা",
    passed,
    reason: passed
      ? `রোগের ঝুঁকি ${riskScore}/১০০ (≥${THRESHOLD}) — হস্তক্ষেপ অর্থনৈতিকভাবে যৌক্তিক।`
      : `রোগের ঝুঁকি ${riskScore}/১০০ (<${THRESHOLD}) — স্কাউটিং চালিয়ে যান, এখনই স্প্রে প্রয়োজন নেই।`,
    reasonEn: passed
      ? `Disease risk ${riskScore}/100 (≥${THRESHOLD}) — intervention economically justified.`
      : `Disease risk ${riskScore}/100 (<${THRESHOLD}) — continue scouting, no spray needed yet.`,
    evidence: target
      ? [`Disease: ${target.disease.nameBn}`, `Risk score: ${riskScore}`]
      : ["No disease forecast available"],
  };
}

/**
 * Gate 3: Is the proposed (or recommended) MoA rotation-compliant?
 * Checks rotation window + season cap via moaStewardship.assessMoaRotation.
 * If blocked, populates alternativeMoaOptions.
 * @param {string} caseId
 * @param {string} diseaseId
 * @param {{moaCode: string, activeIngredient: string, productName: string}|null} proposedTreatment
 * @returns {{gate: import('./types.js').ProtectionGate, alternatives: {code: string, group: object, compliant: boolean, used: boolean}[], approvedMoaCode: string|null}}
 */
function evaluateMoaRotationGate(caseId, diseaseId, proposedTreatment, pestMode = false) {
  // Determine the MoA code to assess: proposed, or recommended.
  let moaCode = proposedTreatment?.moaCode || null;
  let reasonPrefix = "";
  if (!moaCode) {
    const rec = pestMode ? recommendNextMoaForPest(diseaseId, []) : recommendNextMoa(diseaseId, []);
    if (rec) {
      moaCode = rec.code;
      reasonPrefix = `সুপারিশকৃত `;
    }
  }

  if (!moaCode) {
    return {
      gate: {
        id: "moa_rotation",
        name: "MoA Rotation",
        nameBn: "MoA রোটেশন",
        passed: false,
        reason: "এই রোগের জন্য কোনো MoA গ্রুপ ম্যাপ করা হয়নি — রাসায়নিক হস্তক্ষেপ মূল্যায়ন করা যাচ্ছে না।",
        reasonEn: "No MoA group mapped for this disease — cannot assess chemical intervention.",
        evidence: [],
      },
      alternatives: [],
      approvedMoaCode: null,
    };
  }

  const group = getMoaGroup(moaCode);
  const assessment = assessMoaRotation(caseId, moaCode);
  const alternatives = getAlternativeMoaOptions(caseId, diseaseId);

  return {
    gate: {
      id: "moa_rotation",
      name: "MoA Rotation",
      nameBn: "MoA রোটেশন",
      passed: assessment.compliant,
      reason: assessment.compliant
        ? `${reasonPrefix}${group.shortCode} (${group.nameBn}) রোটেশন-সম্মত — এই মরসুমে ${assessment.usesThisSeason}/${group.maxAppsPerSeason} বার ব্যবহৃত।`
        : assessment.blockedReason || `${group.shortCode} রোটেশন-সম্মত নয়।`,
      reasonEn: assessment.compliant
        ? `${reasonPrefix}Group ${group.shortCode} rotation-compliant — ${assessment.usesThisSeason}/${group.maxAppsPerSeason} uses this season.`
        : assessment.blockedReasonEn || `Group ${group.shortCode} not rotation-compliant.`,
      evidence: [
        `Proposed MoA: ${group.shortCode} (${group.name})`,
        `Resistance risk: ${group.resistanceRisk}`,
        `Uses this season: ${assessment.usesThisSeason}/${group.maxAppsPerSeason}`,
        `Rotation window: ${group.rotationWindowDays} days`,
      ],
    },
    alternatives,
    approvedMoaCode: assessment.compliant ? moaCode : null,
  };
}

/**
 * Gate 4: Is there a suitable spray window in the next 48h?
 * Reads from Phase 1's riskRadar.operationWindows.spray.
 * @param {object} riskRadar - Phase 1 computeRiskRadar result
 * @returns {import('./types.js').ProtectionGate}
 */
function evaluateWeatherGate(riskRadar) {
  const windows = riskRadar?.operationWindows?.spray || [];
  const suitable = windows.filter((w) => w.suitable);
  const passed = suitable.length > 0;

  return {
    id: "weather_suitable",
    name: "Weather Suitable",
    nameBn: "আবহাওয়া উপযুক্ত",
    passed,
    reason: passed
      ? `পরবর্তী ৪৮ ঘণ্টায় ${suitable.length}টি উপযুক্ত স্প্রে উইন্ডো আছে (বাতাস <১০ কিমি/ঘণ্টা, বৃষ্টি <৩০%)।`
      : "পরবর্তী ৪৮ ঘণ্টায় কোনো উপযুক্ত স্প্রে উইন্ডো নেই — বাতাস/বৃষ্টির জন্য অপেক্ষা করুন।",
    reasonEn: passed
      ? `${suitable.length} suitable spray window(s) in the next 48h (wind <10 km/h, rain <30%).`
      : "No suitable spray window in the next 48h — wait for wind/rain to settle.",
    evidence: suitable.slice(0, 3).map((w) => `${w.start.slice(11, 16)} — score ${w.score}`),
  };
}

/**
 * Gate 5: Is the pre-harvest interval (PHI) respected?
 * If the crop is near harvest (ripening/harvest stage), checks whether
 * the chemical's PHI fits before harvest. Blocks if PHI > days-to-harvest.
 * @param {string} growthStage
 * @param {number} phiDays - pre-harvest interval of the proposed MoA
 * @returns {import('./types.js').ProtectionGate}
 */
function evaluatePhiGate(growthStage, phiDays) {
  const daysToHarvest = STAGE_DAYS_TO_HARVEST[growthStage] ?? 60;
  // Only enforce PHI when crop is approaching harvest (< 30 days).
  const nearHarvest = daysToHarvest < 30;
  const passed = !nearHarvest || phiDays <= daysToHarvest;

  let reason;
  if (!nearHarvest) {
    reason = `ফসল পাকা থেকে ${daysToHarvest} দিন দূরে — PHI ${phiDays} দিন সম্মত।`;
  } else if (passed) {
    reason = `ফসল পাকা থেকে ${daysToHarvest} দিন দূরে, PHI ${phiDays} দিন — সম্মত কিন্তু সতর্কতার সাথে।`;
  } else {
    reason = `ফসল পাকা থেকে মাত্র ${daysToHarvest} দিন দূরে, কিন্তু PHI ${phiDays} দিন — স্প্রে করলে অবশিষ্ট রাসায়নিক থাকবে। স্প্রে নিষিদ্ধ।`;
  }

  return {
    id: "pre_harvest_interval",
    name: "Pre-Harvest Interval",
    nameBn: "প্রি-হার্ভেস্ট ব্যবধান",
    passed,
    reason,
    reasonEn: !nearHarvest
      ? `Crop is ${daysToHarvest} days from harvest — PHI ${phiDays}d compliant.`
      : passed
        ? `Crop is ${daysToHarvest} days from harvest, PHI ${phiDays}d — compliant but with caution.`
        : `Crop only ${daysToHarvest} days from harvest, PHI ${phiDays}d — residue risk. Spray BLOCKED.`,
    evidence: [`Growth stage: ${growthStage}`, `Days to harvest: ~${daysToHarvest}`, `PHI: ${phiDays} days`],
  };
}

// ────────────────────────────────────────────────────────────
// Main entry point
// ────────────────────────────────────────────────────────────

/**
 * Evaluate the full Crop Protection Decision for a case + disease.
 *
 * @param {Object} input
 * @param {object} input.caseObj - the crop health case (with observations, treatments, growthStage)
 * @param {string} input.diseaseId - target disease id
 * @param {object} input.riskRadar - Phase 1 computeRiskRadar result (for weather + disease forecast)
 * @param {{moaCode: string, activeIngredient: string, productName: string}|null} [input.proposedTreatment] - optional proposed treatment; if null, engine recommends
 * @returns {import('./types.js').ProtectionDecision}
 */
// ────────────────────────────────────────────────────────────
// Ported STATUS LAYER — derives the advisory status + IPM-ordered actions
// from the 5-gate results + risk radar. Pure function, no I/O.
// ────────────────────────────────────────────────────────────

/**
 * Map a 5-gate + risk-radar state to the 7 advisory statuses.
 * Safety invariants (ported from the reference decision engine):
 *   - high weather risk WITHOUT confirmed field evidence → SCOUT_REQUIRED,
//     never an automatic pesticide recommendation;
 *   - stale (>2h) weather can never yield an intervention-approval status;
 *   - unconfirmed diagnosis always degrades to non-chemical statuses.
 *
 * @param {object} input
 * @param {object} input.caseObj
 * @param {object|null} input.riskRadar
 * @param {{passed: boolean, id: string}[]} input.gates
 * @param {boolean} input.approved - all 5 gates passed
 * @param {boolean} input.pestMode - target is an insect pest (pestEngine id) vs disease
 * @returns {{status: string, statusBn: string, explanation: string, explanationBn: string, ipmTier: number|null, actions: Array<{ipmTier: number, action: string, actionBn: string, chemical: boolean}>, reassessAfter: string|null, missingInformation: string[]}}
 */
export function deriveProtectionStatus({ caseObj, riskRadar, gates, approved, pestMode = false }) {
  const gate1 = gates.find((g) => g.id === "diagnosis_confirmed");
  const gate4 = gates.find((g) => g.id === "weather_suitable");
  const confirmed = Boolean(gate1?.passed);
  const weatherOk = Boolean(gate4?.passed);
  const weatherUnavailable = !riskRadar || riskRadar.dataFreshness === "unavailable";
  const weatherStale = riskRadar?.dataFreshness === "stale";
  const overallRisk = riskRadar?.overallRiskScore ?? null;
  const forecast = pestMode ? riskRadar?.pestForecast : riskRadar?.diseaseForecast;
  // The entry for the REQUESTED target (diseaseId may be a pest id in pest
  // mode) — not just the top-of-list, which can be a different target.
  const topEntry = pestMode
    ? (forecast?.pests?.find((p) => p.pest.id === caseObj?._targetId) ?? forecast?.pests?.[0])
    : (forecast?.diseases?.find((d) => d.disease.id === caseObj?._targetId) ?? forecast?.diseases?.[0]);
  const topName = pestMode ? topEntry?.pest?.nameBn : topEntry?.disease?.nameBn;
  const topRisk = topEntry?.risk ?? 0;
  const observations = caseObj?.observations || [];
  const hasObservations = observations.length > 0;
  const missing = [];
  const actions = [];

  // Threshold honesty (ported): the numeric threshold is a heuristic, and
  // validated Bangladesh numeric thresholds are not in the dataset.
  missing.push(
    "নিশ্চিত সংখ্যাসূচক অর্থনৈতিক সীমামান (validated economic threshold) এই ডেটাসেটে নেই — সীমামান-ভিত্তিক সিদ্ধান্ত যাচাই করা যায় না।",
  );
  if (weatherUnavailable) missing.push("আবহাওয়ার তথ্য অনুপস্থিত — আবহাওয়া-ভিত্তিক গেট যাচাই করা যায়নি।");
  if (weatherStale) missing.push("আবহাওয়ার তথ্য ২ ঘণ্টার বেশি পুরনো — স্প্রে-উইন্ডো পরামর্শ পুরনো হতে পারে।");
  if (!hasObservations) missing.push("কোনো ক্ষেত পর্যবেক্ষণ রেকর্ড নেই।");
  else if (!confirmed) missing.push("রোগ/পোকা নির্ণয় নিশ্চিত করা হয়নি — শনাক্তকরণ অস্থায়ী।");

  let status,
    statusBn,
    explanation,
    explanationBn,
    ipmTier = null;

  if (weatherUnavailable && !hasObservations) {
    status = "INSUFFICIENT_DATA";
    statusBn = "তথ্য অপর্যাপ্ত";
    explanation =
      "Neither weather intelligence nor a field observation is available. Record a scouting observation (and allow weather access) before a protection decision can be made.";
    explanationBn =
      "আবহাওয়ার তথ্য বা ক্ষেত পর্যবেক্ষণ — কোনোটিই নেই। সুরক্ষা সিদ্ধান্তের আগে ক্ষেত পর্যবেক্ষণ রেকর্ড করুন (এবং আবহাওয়া অ্যাক্সেস দিন)।";
    actions.push({
      ipmTier: 5,
      action: "Scout the field now: record symptoms, severity, and photo evidence",
      actionBn: "এখনই ক্ষেত পর্যবেক্ষণ করুন: লক্ষণ, তীব্রতা ও ছবি রেকর্ড করুন",
      chemical: false,
    });
    ipmTier = 5;
  } else if (!hasObservations && topRisk >= 45) {
    // SAFETY INVARIANT: weather-driven risk without field evidence → SCOUT.
    status = "SCOUT_REQUIRED";
    statusBn = "ক্ষেত পর্যবেক্ষণ দরকার";
    explanation = `Weather conditions favor ${topName || "pest/disease development"} (risk ${topRisk}/100), but no field observation is recorded. Scout first — weather risk alone never justifies a pesticide application.`;
    explanationBn = `আবহাওয়া ${topName || "রোগ/পোকার বিস্তারে"} অনুকূল (ঝুঁকি ${topRisk}/১০০), কিন্তু ক্ষেত পর্যবেক্ষণ নেই। আগে ক্ষেত পর্যবেক্ষণ করুন — শুধু আবহাওয়ার ঝুঁকি কখনোই কীটনাশক প্রয়োগের যথেষ্ট নয়।`;
    actions.push({
      ipmTier: 5,
      action: `Scout within 24h specifically for ${topName || "the forecast target"} (symptoms, incidence, severity)`,
      actionBn: `২৪ ঘণ্টার মধ্যে ${topName || "পূর্বাভাসের লক্ষ্যের"} জন্য নির্দিষ্টভাবে ক্ষেত পর্যবেক্ষণ করুন (লক্ষণ, আক্রমণ, তীব্রতা)`,
      chemical: false,
    });
    ipmTier = 5;
  } else if (!hasObservations) {
    status = "MONITOR";
    statusBn = "নজরদারি";
    explanation = `Weather risk is low (${overallRisk ?? "?"}/100) and no symptoms have been scouted. Continue monitoring; scout if conditions change.`;
    explanationBn = `আবহাওয়ার ঝুঁকি কম (${overallRisk ?? "?"}/১০০) এবং কোনো লক্ষণ পর্যবেক্ষণ করা যায়নি। নজরদারি চালিয়ে যান; অবস্থা বদলালে ক্ষেত পর্যবেক্ষণ করুন।`;
    actions.push({
      ipmTier: 5,
      action: "Continue monitoring weather + field; re-check in 3 days",
      actionBn: "আবহাওয়া ও ক্ষেত পর্যবেক্ষণ চালিয়ে যান; ৩ দিন পর আবার দেখুন",
      chemical: false,
    });
    ipmTier = 1;
  } else if (!confirmed && !weatherStale && !weatherOk) {
    // Observation exists but no suitable spray window → weather-blocked.
    status = "CONDITIONS_UNSUITABLE";
    statusBn = "পরিস্থিতি অনুপযুক্ত";
    explanation =
      "Field observations exist, but no suitable spray window in the next 48h (wind/rain restrictions). Apply non-chemical measures and wait for a suitable window.";
    explanationBn =
      "ক্ষেত পর্যবেক্ষণ আছে, কিন্তু আগামী ৪৮ ঘণ্টায় উপযুক্ত স্প্রে সময় নেই (বাতাস/বৃষ্টি বিধিনিষেধ)। অ-রাসায়নিক ব্যবস্থা নিন এবং উপযুক্ত সময়ের জন্য অপেক্ষা করুন।";
    actions.push({
      ipmTier: 2,
      action: "Apply cultural/mechanical measures now; re-check the spray window tomorrow",
      actionBn: "এখনই কালচারাল/যান্ত্রিক ব্যবস্থা নিন; কাল আবার স্প্রে সময় দেখুন",
      chemical: false,
    });
    ipmTier = 2;
  } else if (!confirmed) {
    // Observed but unconfirmed → IPM first, never chemical.
    status = "IPM_ACTION";
    statusBn = "IPM ব্যবস্থা";
    explanation =
      "Field observation recorded, but the diagnosis is not confirmed and severity is below acute levels. Apply IPM (non-chemical) measures first; pesticide consideration requires a confirmed diagnosis or threshold-level incidence.";
    explanationBn =
      "ক্ষেত পর্যবেক্ষণ রেকর্ড হয়েছে, কিন্তু রোগ নিশ্চিত নয়। আগে IPM (অ-রাসায়নিক) ব্যবস্থা নিন; কীটনাশক বিবেচনার জন্য নিশ্চিত রোগ নির্ণয় বা সীমা-স্তরের আক্রমণ প্রয়োজন।";
    ipmTier = 2;
    actions.push({
      ipmTier: 2,
      action: "Apply cultural/mechanical controls (remove infected material, adjust water/nitrogen)",
      actionBn: "কালচারাল/যান্ত্রিক ব্যবস্থা নিন (আক্রান্ত অংশ সরান, পানি/নাইট্রোজেন ঠিক করুন)",
      chemical: false,
    });
    if (topEntry?.preventiveActions?.length) {
      actions.push({
        ipmTier: 1,
        action: `Preventive: ${topEntry.preventiveActions[0]}`,
        actionBn: `প্রতিরোধ: ${topEntry.preventiveActions[0]}`,
        chemical: false,
      });
    }
    if (pestMode) {
      actions.push({
        ipmTier: 4,
        action: "Biological: conserve natural enemies — avoid broad-spectrum insecticides",
        actionBn: "জৈবিক: প্রাকৃতিক শত্রু সংরক্ষণ করুন — বিস্তৃত-বর্ণালী কীটনাশক এড়িয়ে চলুন",
        chemical: false,
      });
    }
    actions.push({
      ipmTier: 5,
      action: "Re-scout in 3 days; request officer confirmation if symptoms persist",
      actionBn: "৩ দিন পর আবার ক্ষেত পর্যবেক্ষণ করুন; লক্ষণ থাকলে কর্মকর্তার নিশ্চিতকরণ চান",
      chemical: false,
    });
  } else if (weatherStale) {
    // Confirmed but weather stale → cannot verify spray window now.
    status = "CONDITIONS_UNSUITABLE";
    statusBn = "পরিস্থিতি অনুপযুক্ত";
    explanation =
      "Diagnosis is confirmed, but the weather data is more than 2 hours old — the spray-window gate cannot be trusted. Refresh weather and verify conditions at the field before any application.";
    explanationBn =
      "রোগ নিশ্চিত, কিন্তু আবহাওয়ার তথ্য ২ ঘণ্টার বেশি পুরনো — স্প্রে-উইন্ডো গেট বিশ্বাসযোগ্য নয়। আবহাওয়া হালনাগাদ করে ক্ষেতে অবস্থা যাচাই করুন।";
    actions.push({
      ipmTier: 5,
      action: "Refresh weather data and re-evaluate before considering application",
      actionBn: "আবহাওয়ার তথ্য হালনাগাদ করে প্রয়োগের আগে পুনর্মূল্যায়ন করুন",
      chemical: false,
    });
    ipmTier = 2;
  } else if (approved) {
    status = "INTERVENTION_CONSIDERATION";
    statusBn = "হস্তক্ষেপ বিবেচনা";
    explanation =
      "All five gates passed (confirmed diagnosis, threshold-level risk, rotation-compliant MoA, suitable weather, PHI respected). Chemical intervention MAY be considered — IPM alternatives remain first choice. Follow the approved-treatment guidance and record the application.";
    explanationBn =
      "পাঁচটি গেটই উত্তীর্ণ (নিশ্চিত রোগ নির্ণয়, সীমা-স্তরের ঝুঁকি, রোটেশন-সম্মত MoA, উপযুক্ত আবহাওয়া, PHI মানা)। রাসায়নিক হস্তক্ষেপ বিবেচনা করা যেতে পারে — তবে IPM বিকল্প এখনও প্রথম পছন্দ। অনুমোদিত চিকিৎসার নির্দেশনা মেনে প্রয়োগ রেকর্ড করুন।";
    ipmTier = 6;
    actions.push({
      ipmTier: 6,
      action: "Consider the approved product ONLY at label dosage, in the verified spray window",
      actionBn: "শুধুমাত্র লেবেল ডোজে, যাচাইকৃত স্প্রে সময়ে অনুমোদিত পণ্য বিবেচনা করুন",
      chemical: true,
    });
    actions.push({
      ipmTier: 5,
      action: "Record the application and schedule a 5-7 day follow-up observation to verify effectiveness",
      actionBn: "প্রয়োগ রেকর্ড করুন এবং কার্যকারিতা যাচাইয়ের জন্য ৫-৭ দিনের ফলো-আপ পর্যবেক্ষণ নির্ধারণ করুন",
      chemical: false,
    });
  } else {
    // Confirmed + weather fine, but a compliance gate blocked (threshold
    // not met / MoA rotation / PHI). Not an automatic chemical path.
    status = "IPM_ACTION";
    statusBn = "IPM ব্যবস্থা";
    const blocker = gates.find((g) => !g.passed);
    explanation = `Diagnosis is confirmed, but the ${blocker ? blocker.name : "compliance"} gate blocked chemical approval (${blocker ? blocker.reasonEn : "gate failed"}). Continue IPM measures; re-evaluate after the blocking condition changes.`;
    explanationBn = `রোগ নিশ্চিত, কিন্তু ${blocker ? blocker.nameBn : "কম্প্লায়েন্স"} গেট রাসায়নিক অনুমোদন আটকে দিয়েছে। IPM ব্যবস্থা চালিয়ে যান; আটকে দেওয়া শর্ত বদলালে পুনর্মূল্যায়ন করুন।`;
    ipmTier = 2;
    actions.push({
      ipmTier: 2,
      action: "Continue cultural/mechanical IPM measures while the gate is blocked",
      actionBn: "গেট আটকে থাকা পর্যন্ত কালচারাল/যান্ত্রিক IPM ব্যবস্থা চালিয়ে যান",
      chemical: false,
    });
  }

  // Sort actions by IPM tier (preventive → … → chemical) for the UI.
  actions.sort((a, b) => a.ipmTier - b.ipmTier);

  const reassessDays =
    status === "SCOUT_REQUIRED" || status === "CONDITIONS_UNSUITABLE" || status === "INSUFFICIENT_DATA"
      ? 1
      : status === "INTERVENTION_CONSIDERATION"
        ? 2
        : 3;
  const reassessAfter = new Date(Date.now() + reassessDays * 86400000).toISOString();

  return { status, statusBn, explanation, explanationBn, ipmTier, actions, reassessAfter, missingInformation: missing };
}

export function evaluateProtectionDecision({
  caseObj,
  diseaseId,
  riskRadar,
  proposedTreatment = null,
  targetKind = null,
}) {
  const caseId = caseObj.id;
  // Ported pest-mode support: when the target is an insect pest (pestEngine
  // id) rather than a disease, use the IRAC stewardship path.
  const pestIds = new Set(getAllPests().map((p) => p.id));
  const pestMode = targetKind === "pest" || (!targetKind && pestIds.has(diseaseId));

  const gate1 = evaluateDiagnosisGate(caseObj, diseaseId);
  const gate2 = evaluateEconomicThresholdGate(riskRadar, diseaseId);
  const moaResult = evaluateMoaRotationGate(caseId, diseaseId, proposedTreatment, pestMode);
  const gate3 = moaResult.gate;
  const gate4 = evaluateWeatherGate(riskRadar);

  // PHI gate needs the proposed MoA's phiDays. Use proposed, or recommended.
  let phiDays = 0;
  let approvedMoaCode = moaResult.approvedMoaCode;
  if (proposedTreatment?.moaCode) {
    const g = getMoaGroup(proposedTreatment.moaCode);
    if (g) phiDays = g.phiDays;
  } else if (approvedMoaCode) {
    const g = getMoaGroup(approvedMoaCode);
    if (g) phiDays = g.phiDays;
  } else {
    // No approved MoA yet — use the first disease-preferred group's PHI as a reference.
    const preferred = pestMode ? getMoaCodesForPest(diseaseId) : getMoaCodesForDisease(diseaseId);
    if (preferred.length > 0) {
      const g = getMoaGroup(preferred[0]);
      if (g) phiDays = g.phiDays;
    }
  }
  const gate5 = evaluatePhiGate(caseObj.growthStage, phiDays);

  const gates = [gate1, gate2, gate3, gate4, gate5];
  const approved = gates.every((g) => g.passed);

  // First blocking gate (for the blockedReason).
  const blocker = gates.find((g) => !g.passed);
  const blockedReason = blocker ? blocker.reason : null;
  const blockedReasonEn = blocker ? blocker.reasonEn : null;
  const blockedGateId = blocker ? blocker.id : null;

  // Compliance notes (rotation advice, PHI warnings, mixing partners).
  const complianceNotes = [];
  if (approvedMoaCode) {
    const group = getMoaGroup(approvedMoaCode);
    if (group) {
      if (group.mixingPartnerRequired) {
        complianceNotes.push(
          `${group.shortCode} (${group.nameBn}) এর সাথে মাল্টি-সাইট পার্টনার (যেমন ম্যাংকোজেব) মিক্স করুন — FRAC সুপারিশ।`,
        );
      }
      if (group.resistanceRisk === "high") {
        complianceNotes.push(
          `${group.shortCode} উচ্চ-ঝুঁকির গ্রুপ — সচেতনতার সাথে ব্যবহার করুন, পরের বার অন্য গ্রুপে রোটেট করুন।`,
        );
      }
    }
  }

  const approvedTreatment =
    approved && approvedMoaCode
      ? {
          moaCode: approvedMoaCode,
          activeIngredient: getMoaGroup(approvedMoaCode)?.activeIngredients[0] || "",
          productName: proposedTreatment?.productName || "",
        }
      : null;

  // Ported STATUS LAYER: advisory status + IPM-ordered actions + freshness
  // disclosure, derived from the same gate results.
  const statusLayer = deriveProtectionStatus({
    caseObj: { ...caseObj, _targetId: diseaseId },
    riskRadar,
    gates,
    approved,
    pestMode,
  });

  return {
    approved,
    status: statusLayer.status,
    statusBn: statusLayer.statusBn,
    statusExplanation: statusLayer.explanation,
    statusExplanationBn: statusLayer.explanationBn,
    ipmTier: statusLayer.ipmTier,
    ipmActions: statusLayer.actions,
    reassessAfter: statusLayer.reassessAfter,
    missingInformation: statusLayer.missingInformation,
    pestMode,
    gates,
    blockedReason,
    blockedReasonEn,
    blockedGateId,
    approvedTreatment,
    alternativeMoaOptions: moaResult.alternatives.map((a) => ({
      code: a.code,
      shortCode: a.group.shortCode,
      nameBn: a.group.nameBn,
      compliant: a.compliant,
      resistanceRisk: a.group.resistanceRisk,
    })),
    complianceNotes,
    modelLimitations: DECISION_LIMITATIONS,
    evaluatedAt: new Date().toISOString(),
  };
}
