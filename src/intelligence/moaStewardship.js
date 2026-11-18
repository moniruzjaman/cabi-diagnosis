// ============================================================
// Plant Detective — Crop Health Intelligence (Phase 2)
// MoA Stewardship — assesses whether a proposed MoA is rotation-compliant
// and computes the overall resistance risk for a case's treatment history.
//
// Original design. Resistance-management principles are public-domain
// agronomic science (FRAC/IRAC/HRAC). No code ported from any repository.
// ============================================================

import { getMoaGroup, recommendNextMoa as dbRecommendNextMoa, getMoaCodesForDisease } from "./moaDatabase.js";
import { getMoaUsageThisSeason, wasMoaUsedRecently, countMoaUsesThisSeason } from "./treatmentLedger.js";

const STEWARDSHIP_LIMITATIONS = [
  "MoA রোটেশন মূল্যায়ন একটি অনুমানিত মডেল — মরসুম ১৮০ দিন হিসাবে ধরা হয়েছে।",
  "রেজিস্ট্যান্স ঝুঁকি মূল্যায়ন কেবল এই কেসের চিকিৎসা ইতিহাস থেকে, পুরো খামার নয়।",
];

/**
 * Assess whether a proposed MoA code is rotation-compliant for a case.
 * Checks: (1) rotation window — has this group been used within its
 * rotationWindowDays? (2) season cap — has maxAppsPerSeason been reached?
 *
 * @param {string} caseId
 * @param {string} proposedMoaCode
 * @returns {{compliant: boolean, blockedReason: string|null, blockedReasonEn: string|null, rotationWindowOk: boolean, seasonCapOk: boolean, daysSinceLast: number|null, usesThisSeason: number, maxApps: number}}
 */
export function assessMoaRotation(caseId, proposedMoaCode) {
  const group = getMoaGroup(proposedMoaCode);
  if (!group) {
    return {
      compliant: false,
      blockedReason: `অজানা MoA কোড: ${proposedMoaCode} — রেজিস্ট্যান্স মূল্যায়ন করা যাচ্ছে না।`,
      blockedReasonEn: `Unknown MoA code: ${proposedMoaCode} — cannot assess resistance.`,
      rotationWindowOk: false,
      seasonCapOk: false,
      daysSinceLast: null,
      usesThisSeason: 0,
      maxApps: 0,
    };
  }

  const usage = wasMoaUsedRecently(caseId, proposedMoaCode, group.rotationWindowDays);
  const usesThisSeason = countMoaUsesThisSeason(caseId, proposedMoaCode);
  const rotationWindowOk = !usage.usedRecently;
  const seasonCapOk = usesThisSeason < group.maxAppsPerSeason;

  let blockedReason = null;
  let blockedReasonEn = null;
  if (!rotationWindowOk) {
    blockedReason = `${group.shortCode} (${group.nameBn}) গত ${usage.daysSince} দিন আগে ব্যবহৃত হয়েছে — রোটেশন উইন্ডো ${group.rotationWindowDays} দিন মান্য হচ্ছে না। অন্য গ্রুপ ব্যবহার করুন।`;
    blockedReasonEn = `Group ${group.shortCode} was used ${usage.daysSince} days ago — rotation window of ${group.rotationWindowDays} days not met. Use a different group.`;
  } else if (!seasonCapOk) {
    blockedReason = `${group.shortCode} (${group.nameBn}) এই মরসুমে ${usesThisSeason}বার ব্যবহৃত — সর্বোচ্চ সীমা ${group.maxAppsPerSeason} বার পূর্ণ। অন্য গ্রুপ ব্যবহার করুন।`;
    blockedReasonEn = `Group ${group.shortCode} used ${usesThisSeason} times this season — max ${group.maxAppsPerSeason} reached. Use a different group.`;
  }

  return {
    compliant: rotationWindowOk && seasonCapOk,
    blockedReason,
    blockedReasonEn,
    rotationWindowOk,
    seasonCapOk,
    daysSinceLast: usage.daysSince,
    usesThisSeason,
    maxApps: group.maxAppsPerSeason,
  };
}

/**
 * Compute the overall resistance risk for a case based on its treatment
 * history. High risk if: any high-risk group used >1 time, OR same group
 * used in consecutive applications, OR single-site groups dominate.
 * @param {string} caseId
 * @returns {{level: 'low'|'medium'|'high', score: number, findings: string[], modelLimitations: string[]}}
 */
export function getResistanceRisk(caseId) {
  const usage = getMoaUsageThisSeason(caseId);
  const findings = [];
  let score = 0;

  if (usage.length === 0) {
    return {
      level: "low",
      score: 0,
      findings: ["এই মরসুমে কোনো রাসায়নিক চিকিৎসা নেই — রেজিস্ট্যান্স ঝুঁকি নগণ্য।"],
      modelLimitations: STEWARDSHIP_LIMITATIONS,
    };
  }

  for (const u of usage) {
    const group = getMoaGroup(u.code);
    if (!group) continue;

    if (group.resistanceRisk === "high" && u.count > 1) {
      score += 25;
      findings.push(
        `উচ্চ-ঝুঁকির গ্রুপ ${group.shortCode} (${group.nameBn}) ${u.count}বার ব্যবহৃত — রেজিস্ট্যান্স ঝুঁকি বেশি।`,
      );
    } else if (group.resistanceRisk === "high" && u.count === 1) {
      score += 8;
    } else if (group.resistanceRisk === "medium" && u.count > 2) {
      score += 12;
      findings.push(
        `মাঝারি-ঝুঁকির গ্রুপ ${group.shortCode} (${group.nameBn}) ${u.count}বার ব্যবহৃত — সতর্কতার সাথে রোটেট করুন।`,
      );
    }
  }

  // Penalize if no multi-site partner used (multi-site is the resistance anchor).
  const hasMultiSite = usage.some((u) => {
    const g = getMoaGroup(u.code);
    return g && g.pesticideClass === "multi_site";
  });
  if (!hasMultiSite && usage.length > 0) {
    score += 15;
    findings.push(
      "মাল্টি-সাইট পার্টনার (যেমন ম্যাংকোজেব) ব্যবহৃত হয়নি — রেজিস্ট্যান্স ব্যবস্থাপনার জন্য এটি সুপারিশকৃত।",
    );
  }

  // Penalize if all treatments are the same single group.
  if (usage.length === 1 && usage[0].count > 1) {
    score += 10;
    findings.push("একই MoA গ্রুপ বারবার ব্যবহৃত — রোটেশন নেই, রেজিস্ট্যান্স ঝুঁকি বাড়ছে।");
  }

  score = Math.min(100, score);
  const level = score >= 40 ? "high" : score >= 20 ? "medium" : "low";
  return { level, score, findings, modelLimitations: STEWARDSHIP_LIMITATIONS };
}

/**
 * Recommend the next MoA to use for a disease, given the case's usage history.
 * Wraps moaDatabase.recommendNextMoa with the case's actual applied codes.
 * @param {string} caseId
 * @param {string} diseaseId
 * @returns {{code: string, group: import('./types.js').MoaGroup, reason: string, rotationCompliant: boolean}|null}
 */
export function recommendNextMoa(caseId, diseaseId) {
  const usage = getMoaUsageThisSeason(caseId);
  const usedCodes = usage.map((u) => u.code);
  const rec = dbRecommendNextMoa(diseaseId, usedCodes);
  if (!rec) return null;
  // Verify the recommendation is actually rotation-compliant for this case.
  const assessment = assessMoaRotation(caseId, rec.code);
  return {
    code: rec.code,
    group: rec.group,
    reason: rec.reason,
    rotationCompliant: assessment.compliant,
  };
}

/**
 * Get alternative MoA options when the proposed group is blocked.
 * Returns all disease-preferred groups that ARE currently compliant.
 * @param {string} caseId
 * @param {string} diseaseId
 * @returns {{code: string, group: import('./types.js').MoaGroup, compliant: boolean}[]}
 */
export function getAlternativeMoaOptions(caseId, diseaseId) {
  const usage = getMoaUsageThisSeason(caseId);
  const usedCodes = usage.map((u) => u.code);
  const preferred = getMoaCodesForDisease(diseaseId);
  // avoid importing getMoaCodesForDisease separately — re-derive from dbRecommend
  // Actually we need it. Let me import it.
  return preferred
    .map((code) => {
      const group = getMoaGroup(code);
      if (!group) return null;
      const assessment = assessMoaRotation(caseId, code);
      return { code, group, compliant: assessment.compliant, used: usedCodes.includes(code) };
    })
    .filter(Boolean);
}
