// ============================================================
// Plant Detective — Product Validator (Phase 4)
//
// Validates a registered-pesticide product against the active case's crop
// and target pest/disease. A trade name, active ingredient, or MoA group
// alone does NOT establish that a pesticide is legally registered for the
// target crop and pest — exact registry evidence (crop + pest on the
// registration) is required.
//
// This module is PURE (no localStorage/React) so it is unit-testable under
// plain Node, independent of the Vite-resolved .ts registry. It operates
// on the product shape exported by src/data/pesticideRegistry.js.
//
// IMPORTANT data-integrity rule: missing registration/label information is
// NEVER interpreted as passing. `verified` is false unless registrationValid,
// cropMatch, and pestMatch are all true (when a target was supplied).
//
// Ported protection-intelligence upgrades (from the AgriChem/PesticideNext
// productEligibility engine, adapted to this validator's shape):
//   1. regNo FORMAT validation (DAE register pattern) — a junk regNo is a
//      disclosed invalid registration, not a verified one;
//   2. POLICY BAN gate — active regulatory alerts (regulatoryAlerts.js)
//      whose targetChemicals match the product's active ingredient block
//      verification for the alert's crops, with the alert disclosed;
//   3. LABEL-DATA disclosure — missing dosage / PHI / REI are reported in
//      missingData (never fabricated, never silently zero).
// ============================================================

import { REGULATORY_ALERTS } from "./regulatoryAlerts.js";

// DAE registration number pattern: prefix letters (AP, AP (BIO), PHP, …),
// optional parenthesized qualifier, dash, digits. 'AP5615', bare numbers
// and other noise fail this check.
const REG_NO_RE = /^[A-Z]{1,4}\s*\(?[A-Z]{0,4}\)?\s*-\s*\d+$/i;

/**
 * Is a regulatory alert currently active? (date ≤ today, and validUntil
 * not yet passed when present).
 * @param {import('./regulatoryAlerts.js').RegulatoryAlert} alert
 * @returns {boolean}
 */
function isAlertActive(alert) {
  const now = new Date();
  if (alert.date && new Date(alert.date) > now) return false;
  if (alert.validUntil && new Date(alert.validUntil) < now) return false;
  return true;
}

/**
 * Find active regulatory alerts that restrict this product's active
 * ingredient on the given crop.
 * @param {object} product
 * @param {string} [crop] - target crop name
 * @returns {import('./regulatoryAlerts.js').RegulatoryAlert[]}
 */
export function findRestrictingAlerts(product, crop) {
  const ai = String(product?.activeIngredient || "").toLowerCase();
  if (!ai) return [];
  return REGULATORY_ALERTS.filter((alert) => {
    if (alert.category !== "regulatory" || !isAlertActive(alert)) return false;
    const chemMatch = (alert.targetChemicals || []).some((c) => ai.includes(c.toLowerCase()));
    if (!chemMatch) return false;
    // Crop-scoped alert: only restricts on the alert's crops. Alerts with
    // no targetCrops are general restrictions.
    if (crop && (alert.targetCrops || []).length > 0) {
      const c = crop.toLowerCase();
      return alert.targetCrops.some((t) => t.toLowerCase().includes(c) || c.includes(t.toLowerCase()));
    }
    return true;
  });
}

/**
 * @typedef {Object} ProductValidation
 * @property {boolean} verified - true ONLY when registration identity is present AND the target crop+pest are on the registration AND no active policy restriction blocks it
 * @property {boolean} registrationValid - regNo + activeIngredient present
 * @property {boolean} registrationFormatValid - regNo matches the DAE register pattern (new)
 * @property {boolean|null} cropMatch - true/false when a crop target was supplied; null when no target
 * @property {boolean|null} pestMatch - true/false when a pest target was supplied; null when no target
 * @property {boolean} moaResolved - product carries an MoA code
 * @property {boolean} policyRestricted - an active regulatory alert restricts this product (new)
 * @property {{id: string, title: string, summary: string}[]} restrictingAlerts - the active alerts that blocked verification (new)
 * @property {string[]} missingData - fields absent on the product
 * @property {string} note - English status note
 * @property {string} noteBn - Bangla status note
 */

/**
 * Validate a registered product against the active case's crop + target.
 * @param {object} product - a registry entry (regNo, activeIngredient, crops, pest, moaCode, dosage, phiDays, reiHours)
 * @param {object} [target]
 * @param {string} [target.crop]
 * @param {string} [target.pest]
 * @returns {ProductValidation}
 */
export function validateProductForTarget(product, target = {}) {
  if (!product) {
    return {
      verified: false,
      registrationValid: false,
      registrationFormatValid: false,
      cropMatch: null,
      pestMatch: null,
      moaResolved: false,
      policyRestricted: false,
      restrictingAlerts: [],
      missingData: ["product"],
      note: "No product supplied.",
      noteBn: "কোনো পণ্য দেওয়া হয়নি।",
    };
  }
  const missingData = [];
  if (!product.regNo) missingData.push("regNo");
  if (!product.activeIngredient) missingData.push("activeIngredient");
  if (!product.crops) missingData.push("crops");
  if (!product.pest) missingData.push("pest");
  if (!product.moaCode) missingData.push("moaCode");
  // Ported label-data disclosure: absent label values are disclosed,
  // never fabricated (the product label remains authoritative).
  if (!product.dosage) missingData.push("dosage");
  if (product.phiDays == null) missingData.push("phiDays");
  if (product.reiHours == null) missingData.push("reiHours");

  const registrationValid = Boolean(product.regNo && product.activeIngredient);
  const registrationFormatValid = Boolean(product.regNo) && REG_NO_RE.test(String(product.regNo).trim());
  const moaResolved = Boolean(product.moaCode);

  const tokens = (csv) =>
    String(csv || "")
      .split(/[,;]/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  const cropTokens = tokens(product.crops);
  const pestTokens = tokens(product.pest);

  let cropMatch = null;
  if (target.crop) {
    const c = String(target.crop).trim().toLowerCase();
    cropMatch = cropTokens.some((t) => t === c || t.includes(c) || c.includes(t));
  }
  let pestMatch = null;
  if (target.pest) {
    const p = String(target.pest).trim().toLowerCase();
    pestMatch = pestTokens.some((t) => t === p || t.includes(p) || p.includes(t));
  }

  // Ported policy-ban gate.
  const restrictingAlerts = findRestrictingAlerts(product, target.crop);
  const policyRestricted = restrictingAlerts.length > 0;

  // Verified only when registration identity AND format are present AND at
  // least one target was supplied AND every supplied target (crop + pest)
  // is on the registration AND no active policy restriction blocks it.
  // No target supplied → cannot confirm eligibility → not verified.
  const cropOk = target.crop ? cropMatch === true : true;
  const pestOk = target.pest ? pestMatch === true : true;
  const hasTarget = Boolean(target.crop || target.pest);
  const verified = registrationValid && registrationFormatValid && hasTarget && cropOk && pestOk && !policyRestricted;

  let note, noteBn;
  if (verified) {
    note = "Registered for the target crop and pest.";
    noteBn = "লক্ষ্য ফসল ও রোগ/পোকার জন্য নিবন্ধিত।";
  } else if (policyRestricted) {
    note = `Policy restriction active: ${restrictingAlerts[0].summary}`;
    noteBn = `নীতিগত বিধিনিষেধ সক্রিয়: ${restrictingAlerts[0].summary}`;
  } else if (product.regNo && !registrationFormatValid) {
    note = `Registration number "${product.regNo}" does not match the DAE register format.`;
    noteBn = `নিবন্ধন নম্বর "${product.regNo}" ডিএই ফরম্যাটে নেই।`;
  } else {
    note = "Registration/label validation unavailable — not verified.";
    noteBn = "নিবন্ধন/লেবেল যাচাই অনুপস্থিত — নিশ্চিত নয়।";
  }

  return {
    verified,
    registrationValid,
    registrationFormatValid,
    cropMatch,
    pestMatch,
    moaResolved,
    policyRestricted,
    restrictingAlerts: restrictingAlerts.map((a) => ({ id: a.id, title: a.title, summary: a.summary })),
    missingData,
    note,
    noteBn,
  };
}
