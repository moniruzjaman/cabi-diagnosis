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
// agronomic science (FRAC/IRAC/HRAC). No code ported from any repository.
// ============================================================

import { getMoaGroup, recommendNextMoa } from "./moaDatabase.js";
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
  const passed = confirmed.length > 0;

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
function evaluateMoaRotationGate(caseId, diseaseId, proposedTreatment) {
  // Determine the MoA code to assess: proposed, or recommended.
  let moaCode = proposedTreatment?.moaCode || null;
  let reasonPrefix = "";
  if (!moaCode) {
    const rec = recommendNextMoa(diseaseId, []);
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
export function evaluateProtectionDecision({ caseObj, diseaseId, riskRadar, proposedTreatment = null }) {
  const caseId = caseObj.id;

  const gate1 = evaluateDiagnosisGate(caseObj, diseaseId);
  const gate2 = evaluateEconomicThresholdGate(riskRadar, diseaseId);
  const moaResult = evaluateMoaRotationGate(caseId, diseaseId, proposedTreatment);
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
    const preferred = getMoaCodesForDisease(diseaseId);
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

  return {
    approved,
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
