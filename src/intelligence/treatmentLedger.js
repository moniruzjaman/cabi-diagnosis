// ============================================================
// Plant Detective — Crop Health Intelligence (Phase 2)
// Treatment Ledger — reads the case's treatment history from
// cropHealthCases.js and normalizes it into TreatmentRecord objects
// that the MoA Stewardship + Protection Decision Engine consume.
//
// This module does NOT write to localStorage directly — it reads via the
// existing loadCases() from cropHealthCases.js (the single source of truth
// for case persistence). The only writer is addTreatment() / recordTreatment().
// ============================================================

import { loadCases } from "../data/cropHealthCases.js";
import { resolveMoaCode, getMoaGroup } from "./moaDatabase.js";

/**
 * Normalize a raw case.treatments[] entry into a TreatmentRecord.
 * Resolves the free-text `moaGroup` string to a canonical MoA code.
 * @param {object} raw - a case.treatments[] entry
 * @returns {import('./types.js').TreatmentRecord}
 */
export function normalizeTreatment(raw) {
  const moaCode = resolveMoaCode(raw.moaGroup) || "";
  const group = moaCode ? getMoaGroup(moaCode) : null;
  return {
    id: raw.id || "",
    date: raw.date || "",
    type: raw.type || "cultural",
    description: raw.description || "",
    productName: raw.productName || "",
    activeIngredient: raw.activeIngredient || "",
    moaCode,
    moaGroupRaw: raw.moaGroup || "",
    dosage: raw.dosage || "",
    cost: raw.cost ?? null,
    targetDisease: raw.targetDisease || null,
    phiDays: group?.phiDays ?? 0,
  };
}

/**
 * Get the full normalized treatment history for a case (oldest first).
 * @param {string} caseId
 * @returns {import('./types.js').TreatmentRecord[]}
 */
export function getTreatmentHistory(caseId) {
  const c = loadCases().find((x) => x.id === caseId);
  if (!c || !c.treatments) return [];
  return c.treatments.map(normalizeTreatment);
}

/**
 * Get treatments of a specific type (e.g. only 'chemical' for MoA rotation).
 * @param {string} caseId
 * @param {'cultural'|'biological'|'chemical'|'mechanical'} type
 * @returns {import('./types.js').TreatmentRecord[]}
 */
export function getTreatmentsByType(caseId, type) {
  return getTreatmentHistory(caseId).filter((t) => t.type === type);
}

/**
 * Get chemical + biological treatments applied within the last N days.
 * These are the ones that count toward MoA rotation windows.
 * @param {string} caseId
 * @param {number} days - lookback window
 * @returns {import('./types.js').TreatmentRecord[]}
 */
export function getRecentTreatments(caseId, days) {
  const cutoff = Date.now() - days * 86400000;
  return getTreatmentHistory(caseId).filter((t) => {
    if (!t.date) return false;
    if (t.type !== "chemical" && t.type !== "biological") return false;
    return new Date(t.date).getTime() >= cutoff;
  });
}

/**
 * Get all MoA codes applied this season (for rotation tracking + caps).
 * "Season" is approximated as the last 180 days (covers a typical
 * Bangladesh crop cycle). This is an honest approximation, not a precise
 * agronomic season boundary — flagged in modelLimitations.
 * @param {string} caseId
 * @returns {{code: string, count: number, lastDate: string}[]}
 */
export function getMoaUsageThisSeason(caseId) {
  const recent = getRecentTreatments(caseId, 180);
  const byCode = new Map();
  for (const t of recent) {
    if (!t.moaCode) continue;
    const entry = byCode.get(t.moaCode) || { code: t.moaCode, count: 0, lastDate: "" };
    entry.count += 1;
    if (t.date > entry.lastDate) entry.lastDate = t.date;
    byCode.set(t.moaCode, entry);
  }
  return Array.from(byCode.values());
}

/**
 * Has a specific MoA code been used within its rotation window?
 * @param {string} caseId
 * @param {string} moaCode
 * @param {number} rotationWindowDays - from the MoA group definition
 * @returns {{usedRecently: boolean, lastDate: string|null, daysSince: number|null}}
 */
export function wasMoaUsedRecently(caseId, moaCode, rotationWindowDays) {
  const history = getTreatmentHistory(caseId);
  const matching = history.filter((t) => t.moaCode === moaCode);
  if (matching.length === 0) return { usedRecently: false, lastDate: null, daysSince: null };
  const last = matching.sort((a, b) => (b.date > a.date ? 1 : -1))[0];
  const daysSince = Math.floor((Date.now() - new Date(last.date).getTime()) / 86400000);
  return {
    usedRecently: daysSince < rotationWindowDays,
    lastDate: last.date,
    daysSince,
  };
}

/**
 * Count how many times a specific MoA code has been applied this season.
 * @param {string} caseId
 * @param {string} moaCode
 * @returns {number}
 */
export function countMoaUsesThisSeason(caseId, moaCode) {
  const usage = getMoaUsageThisSeason(caseId);
  const entry = usage.find((u) => u.code === moaCode);
  return entry?.count || 0;
}
