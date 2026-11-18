// ============================================================
// Plant Detective — Crop Health Intelligence
// Copilot Context (Phase 5) — builds a Bangla context string from an
// active crop-health case so the AI Copilot can answer case-aware
// questions (e.g. "এই কেসের জন্য পরবর্তী স্কাউটিং কখন?").
//
// This module is the single source of truth for how a case becomes
// copilot context. The copilot UI (AICopilotTab in src/App.jsx) calls
// buildCaseContext(caseObj) and appends the result to the LLM system
// prompt whenever a case is open.
//
// modelLimitations:
//  - The context is a projection of stored case fields; if those are
//    null/stale, the context honestly omits them (never fabricates).
//  - The LLM may still hallucinate beyond this context — callers should
//    treat copilot answers as suggestions, verify before acting.
// ============================================================

/**
 * @typedef {Object} CaseObj
 * @property {string} [crop]
 * @property {string} [growthStage]
 * @property {string} [district]
 * @property {string} [variety]
 * @property {string} [season]
 * @property {{overallRiskScore?: number|null, riskLevel?: string}} [riskAssessment]
 * @property {{titleBn?: string, title?: string}} [scoutingAction]
 * @property {{diseaseName?: string, diseaseNameBn?: string, topDisease?: string}} [diagnosisEvidence]
 */

/**
 * Build a Bangla context string from an active case. Returns "" when the
 * case is null/empty or carries no usable context (the copilot then falls
 * back to its crop/district/weather context).
 *
 * @param {CaseObj|null|undefined} caseObj
 * @returns {string} — a single Bangla paragraph to append to the system prompt
 */
export function buildCaseContext(caseObj) {
  if (!caseObj || typeof caseObj !== "object") return "";

  const parts = [];
  if (caseObj.crop) parts.push(`ফসল ${caseObj.crop}`);
  if (caseObj.variety) parts.push(`জাত ${caseObj.variety}`);
  if (caseObj.growthStage) parts.push(`অবস্থা ${caseObj.growthStage}`);
  if (caseObj.season) parts.push(`মৌসুম ${caseObj.season}`);
  if (caseObj.district) parts.push(`জেলা ${caseObj.district}`);

  const riskScore = caseObj.riskAssessment?.overallRiskScore;
  if (typeof riskScore === "number" && !Number.isNaN(riskScore)) {
    parts.push(`ঝুঁকি মূল্যায়ন ${riskScore}`);
  } else if (caseObj.riskAssessment?.riskLevel) {
    parts.push(`ঝুঁকি স্তর ${caseObj.riskAssessment.riskLevel}`);
  }

  const scoutTitle = caseObj.scoutingAction?.titleBn || caseObj.scoutingAction?.title;
  if (scoutTitle) parts.push(`স্কাউটিং ক্রিয়া ${scoutTitle}`);

  // diagnosisEvidence.topDisease is set by the diagnosis merger; fall back to
  // the stored diseaseName/diseaseNameBn if the merger field is absent.
  const dxTop = caseObj.diagnosisEvidence?.topDisease;
  const dxName = caseObj.diagnosisEvidence?.diseaseNameBn || caseObj.diagnosisEvidence?.diseaseName;
  if (dxTop) parts.push(`রোগ নিদর্শন ${dxTop}`);
  else if (dxName) parts.push(`রোগ নিদর্শন ${dxName}`);

  if (parts.length === 0) return "";

  return `সক্রিয় কেস প্রসঙ্গ: ${parts.join(", ")}। এই প্রসঙ্গে উত্তর দিন।`;
}

/**
 * Wrap a base system prompt with optional case context.
 * @param {string} basePrompt
 * @param {CaseObj|null|undefined} caseObj
 * @returns {string}
 */
export function buildCopilotSystemPrompt(basePrompt, caseObj) {
  const ctx = buildCaseContext(caseObj);
  if (!ctx) return basePrompt;
  return `${basePrompt}\n\n${ctx}`;
}

/** modelLimitations for callers that want the caveats. */
export const COPILOT_CONTEXT_MODEL_LIMITATIONS = [
  "context is a projection of stored case fields; null/stale fields are omitted, never fabricated",
  "the LLM may hallucinate beyond this context — treat copilot answers as suggestions",
];
