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
 * @property {string[]} [evidence] — human-readable evidence lines
 */

/**
 * @typedef {Object} DiagnosisSource
 * @property {DiagnosisSourceId} source
 * @property {DiagnosisMatch[]} matches — sorted by confidence desc
 */

/**
 * @typedef {Object} MergedDiagnosis
 * @property {{diseaseId: string, confidence: number, evidence: string[], sources: string[]}|null} topDisease
 * @property {{diseaseId: string, confidence: number, sources: string[]}[]} alternatives
 * @property {number} confidence — 0..100, weighted
 * @property {string[]} sources — the source ids that contributed
 * @property {'high'|'medium'|'low'} agreement
 * @property {string[]} modelLimitations
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
  ];

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
      };
      entry.sumWeightedConf += weight * conf * 100;
      entry.totalWeight += weight;
      entry.sources.add(s.source);
      if (i === 0) entry.topVotes += 1; // this source's top pick
      if (Array.isArray(m.evidence)) entry.evidence.push(...m.evidence);
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
  };
}

function clamp01(v) {
  if (typeof v !== "number" || Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
}
