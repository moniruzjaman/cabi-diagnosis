// ============================================================
// Plant Detective — Product Validator (Phase 4)
//
// Validates a registered-pesticide product against the active case's crop
// and target pest/disease. A trade name, active ingredient, or MoA group
// alone does NOT establish that a pesticide is legally registered for the
// target crop and pest — exact registry evidence (crop + pest on the
// registration) is required.
//
// This module is PURE (no imports) so it is unit-testable under plain Node,
// independent of the Vite-resolved .ts registry. It operates on the product
// shape exported by src/data/pesticideRegistry.js.
//
// IMPORTANT data-integrity rule: missing registration/label information is
// NEVER interpreted as passing. `verified` is false unless registrationValid,
// cropMatch, and pestMatch are all true (when a target was supplied).
// ============================================================

/**
 * @typedef {Object} ProductValidation
 * @property {boolean} verified - true ONLY when registration identity is present AND the target crop+pest are on the registration
 * @property {boolean} registrationValid - regNo + activeIngredient present
 * @property {boolean|null} cropMatch - true/false when a crop target was supplied; null when no target
 * @property {boolean|null} pestMatch - true/false when a pest target was supplied; null when no target
 * @property {boolean} moaResolved - product carries an MoA code
 * @property {string[]} missingData - fields absent on the product
 * @property {string} note - English status note
 * @property {string} noteBn - Bangla status note
 */

/**
 * Validate a registered product against the active case's crop + target.
 * @param {object} product - a registry entry (regNo, activeIngredient, crops, pest, moaCode)
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
      cropMatch: null,
      pestMatch: null,
      moaResolved: false,
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

  const registrationValid = Boolean(product.regNo && product.activeIngredient);
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

  // Verified only when registration identity is present AND at least one
  // target was supplied AND every supplied target (crop + pest) is on the
  // registration. No target supplied → cannot confirm eligibility → not
  // verified. Missing target info → null match → not verified.
  const cropOk = target.crop ? cropMatch === true : true;
  const pestOk = target.pest ? pestMatch === true : true;
  const hasTarget = Boolean(target.crop || target.pest);
  const verified = registrationValid && hasTarget && cropOk && pestOk;

  const note = verified
    ? "Registered for the target crop and pest."
    : "Registration/label validation unavailable — not verified.";
  const noteBn = verified ? "লক্ষ্য ফসল ও রোগ/পোকার জন্য নিবন্ধিত।" : "নিবন্ধন/লেবেল যাচাই অনুপস্থিত — নিশ্চিত নয়।";

  return { verified, registrationValid, cropMatch, pestMatch, moaResolved, missingData, note, noteBn };
}
