// ============================================================
// Plant Detective — Crop Health Intelligence
// Diagnosis Merger (Phase 5) — fuses diagnostic results from
// multiple sources (host ONNX matcher, structured symptom
// wizard, copilot) into a single ranked verdict with an honest
// agreement signal and modelLimitations.
//
// This is a weighted heuristic, NOT a calibrated ensemble:
//  - source weights are author-chosen defaults (onnx 0.5,
//    symptom_wizard 0.3, copilot 0.2). They are not learned.
//  - agreement is a simple top-disease vote, not a statistical
//    measure of classifier correlation.
//  - confidence is a weighted average of per-source confidences
//    clamped to [0,100]; it is not a calibrated probability.
// ============================================================

/**
 * Default source weights. Higher = more trusted.
 * ONNX image matcher carries the most signal (a leaf photo is the
 * strongest single piece of evidence), the symptom wizard is a
 * structured-rules second opinion, and the copilot is an LLM
 * suggestion (lowest trust — verify before acting).
 */
export const SOURCE_WEIGHTS = {
  onnx: 0.5,
  symptom_wizard: 0.3,
  copilot: 0.2,
};

/**
 * @typedef {'onnx'|'symptom_wizard'|'copilot'} DiagnosisSourceId
 */

/**
 * @typedef {Object} DiagnosisMatch
 * @property {string} diseaseId
 * @property {number} confidence — 0..100
 * @property {string[]} [evidence] — human-readable evidence lines FOR the disease
 * @property {string[]} [contradicts] — human-readable evidence AGAINST the disease
 */

/**
 * @typedef {Object} DiagnosisSource
 * @property {DiagnosisSourceId} source
 * @property {DiagnosisMatch[]} matches — sorted by confidence desc
 */

/**
 * @typedef {Object} MergedDiagnosis
 * @property {{diseaseId: string, confidence: number, evidence: string[],
 *   evidenceAgainst: string[], sources: string[]}|null} topDisease
 * @property {{diseaseId: string, confidence: number, sources: string[]}[]} alternatives
 * @property {number} confidence — 0..100, weighted
 * @property {string[]} sources — the source ids that contributed
 * @property {'high'|'medium'|'low'} agreement
 * @property {string[]} modelLimitations
 * @property {'candidate'} diagnosisStatus — output is NEVER a confirmed
 *   diagnosis; a symptom match or a model label is always only a candidate
 *   that requires field verification.
 * @property {string} statusNoteBn — Bangla-first status note for the UI.
 * @property {{level: 'low'|'medium'|'high', reasons: string[]}} uncertainty
 * @property {string[]} verificationSteps — Bangla-first next verification steps.
 */

/**
 * Merge diagnostic results from multiple sources.
 *
 * Agreement rules:
 *   - high   : >=2 distinct sources name the same disease as their top match
 *   - medium : 2+ sources agree the disease appears somewhere (not necessarily top),
 *              OR only one source but it is the only source present and confident
 *   - low    : sources disagree on the top disease and share < 2 votes anywhere
 *
 * Confidence is a weighted average of the per-source confidence for the
 * winning diseaseId (sources that did not include the disease contribute 0).
 *
 * @param {DiagnosisSource[]} sources
 * @returns {MergedDiagnosis}
 */
export function mergeDiagnoses(sources) {
  const modelLimitations = [
    "merger is a weighted heuristic, not a calibrated ensemble",
    "source weights are author-chosen defaults",
    "agreement is a top-disease vote count, not a correlation measure",
    "a symptom match or a model label is never a confirmed diagnosis",
  ];

  const verificationStepsBase = [
    "চূড়ান্ত সিদ্ধান্তের আগে স্থানীয় কৃষি সম্প্রসারণ কর্মকর্তা বা উপজেলা কৃষি অফিসের সাথে রোগ শনাক্তকরণ যাচাই করুন।",
  ];

  function buildVerificationSteps(top, srcIds, alternativesCount) {
    const steps = [];
    if (srcIds.includes("onnx")) {
      steps.push("মডেলের প্রস্তাব মাঠের লক্ষণের সাথে মিলিয়ে দেখুন — ছবি-শনাক্তকরণ শুধুই ইঙ্গিত, প্রমাণ নয়।");
    }
    if (srcIds.includes("symptom_wizard")) {
      steps.push("বাছাই করা লক্ষণগুলো আরও একবার যাচাই করুন (দাগের আকৃতি, অবস্থান ও বিস্তার)।");
    }
    if (srcIds.includes("copilot")) {
      steps.push("এআই পরামর্শটি কৃষি কর্মকর্তার সাথে অবশ্যই যাচাই করুন।");
    }
    if (alternativesCount > 0) {
      steps.push("বিকল্প রোগগুলোর লক্ষণও মিলিয়ে দেখুন — একই লক্ষণে একাধিক রোগ মেলে।");
    }
    steps.push(...verificationStepsBase);
    return steps;
  }

  function buildUncertainty(top, agreement, hasContradictory) {
    const reasons = [];
    let level = "low";
    if (!top) {
      return { level: "high", reasons: ["কোনো প্রার্থী রোগ পাওয়া যায়নি — সিদ্ধান্তে যাওয়া যাবে না।"] };
    }
    if (hasContradictory) reasons.push("বিরোধী লক্ষণ পাওয়া গেছে — প্রার্থী রোগের বিপরীতে প্রমাণ আছে।");
    if (agreement === "low") reasons.push("শুধুমাত্র একটি উৎস এই রোগকে প্রার্থী হিসেবে দিয়েছে।");
    if (top.confidence < 40) reasons.push("সামগ্রিক আস্থা ৪০% এর নিচে।");
    else if (top.confidence < 70) reasons.push("সামগ্রিক আস্থা মাঝারি (৭০% এর নিচে)।");
    if (hasContradictory) level = "high";
    else if (agreement === "low" || top.confidence < 40) level = "high";
    else if (agreement === "medium" || top.confidence < 70) level = "medium";
    if (reasons.length === 0) reasons.push("একাধিক উৎস একমত; তবুও মাঠ পর্যায়ে যাচাই প্রয়োজন।");
    return { level, reasons };
  }

  // Empty / no usable input → honest "unknown" verdict (never fabricate).
  const usable = Array.isArray(sources)
    ? sources.filter((s) => s && Array.isArray(s.matches) && s.matches.length > 0)
    : [];
  if (usable.length === 0) {
    return {
      topDisease: null,
      alternatives: [],
      confidence: 0,
      sources: [],
      agreement: "low",
      modelLimitations,
      diagnosisStatus: "candidate",
      statusNoteBn: "কোনো প্রার্থী রোগ নিশ্চিত করা যায়নি — ম্যানুয়াল যাচাই প্রয়োজন।",
      uncertainty: buildUncertainty(null, "low", false),
      verificationSteps: verificationStepsBase,
    };
  }

  // Tally votes + accumulate weighted confidence per diseaseId.
  // A disease "vote" from a source = that source naming it among its matches
  // (top match counts double for agreement purposes — handled below).
  const tally = new Map(); // diseaseId -> {sumWeightedConf, totalWeight, sources:Set, topVotes}
  for (const s of usable) {
    const weight = SOURCE_WEIGHTS[s.source] ?? 0;
    if (weight <= 0) continue;
    for (let i = 0; i < s.matches.length; i++) {
      const m = s.matches[i];
      const conf = clamp01(m.confidence ?? 0);
      const entry = tally.get(m.diseaseId) ?? {
        sumWeightedConf: 0,
        totalWeight: 0,
        sources: new Set(),
        topVotes: 0,
        evidence: [],
        evidenceAgainst: [],
      };
      entry.sumWeightedConf += weight * conf * 100;
      entry.totalWeight += weight;
      entry.sources.add(s.source);
      if (i === 0) entry.topVotes += 1; // this source's top pick
      if (Array.isArray(m.evidence)) entry.evidence.push(...m.evidence);
      if (Array.isArray(m.contradicts)) entry.evidenceAgainst.push(...m.contradicts);
      tally.set(m.diseaseId, entry);
    }
  }

  if (tally.size === 0) {
    return {
      topDisease: null,
      alternatives: [],
      confidence: 0,
      sources: usable.map((s) => s.source),
      agreement: "low",
      modelLimitations,
      diagnosisStatus: "candidate",
      statusNoteBn: "কোনো প্রার্থী রোগ নিশ্চিত করা যায়নি — ম্যানুয়াল যাচাই প্রয়োজন।",
      uncertainty: buildUncertainty(null, "low", false),
      verificationSteps: verificationStepsBase,
    };
  }

  // Build candidate list with weighted confidence (0..100).
  const candidates = [];
  for (const [diseaseId, e] of tally) {
    const confidence = e.totalWeight > 0 ? Math.round(e.sumWeightedConf / e.totalWeight) : 0;
    candidates.push({
      diseaseId,
      confidence,
      sources: Array.from(e.sources),
      topVotes: e.topVotes,
      evidence: Array.from(new Set(e.evidence)),
      evidenceAgainst: Array.from(new Set(e.evidenceAgainst)),
    });
  }
  // Sort: confidence desc, then topVotes desc, then source-count desc.
  candidates.sort(
    (a, b) => b.confidence - a.confidence || b.topVotes - a.topVotes || b.sources.length - a.sources.length,
  );

  const top = candidates[0];

  // Agreement from the TOP disease's source spread + top-vote count.
  let agreement;
  if (top.topVotes >= 2) {
    agreement = "high"; // >=2 sources made it their #1 pick
  } else if (top.sources.length >= 2) {
    agreement = "medium"; // appears in >=2 sources but not all as top
  } else {
    agreement = "low"; // single-source top pick
  }

  return {
    topDisease: {
      diseaseId: top.diseaseId,
      confidence: top.confidence,
      evidence: top.evidence,
      evidenceAgainst: top.evidenceAgainst,
      hasContradictoryEvidence: top.evidenceAgainst.length > 0,
      sources: top.sources,
    },
    alternatives: candidates.slice(1).map((c) => ({
      diseaseId: c.diseaseId,
      confidence: c.confidence,
      sources: c.sources,
    })),
    confidence: top.confidence,
    sources: Array.from(new Set(usable.map((s) => s.source))),
    agreement,
    modelLimitations,
    diagnosisStatus: "candidate",
    statusNoteBn: "এটি প্রার্থী রোগ — নিশ্চিত শনাক্তকরণ নয়; মাঠ পর্যায়ে যাচাই প্রয়োজন।",
    uncertainty: buildUncertainty(top, agreement, top.evidenceAgainst.length > 0),
    verificationSteps: buildVerificationSteps(
      top,
      Array.from(new Set(usable.map((s) => s.source))),
      candidates.length - 1,
    ),
  };
}

function clamp01(v) {
  if (typeof v !== "number" || Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
}
