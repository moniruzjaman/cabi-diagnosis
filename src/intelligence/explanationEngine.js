// ============================================================
// Plant Detective — Crop Health Intelligence
// Explanation Engine — redesigned from KWI (MIT) engines/explanation-engine.ts.
//
// The KWI original was a thin projection that copied fields from a
// Recommendation. This redesign adds three honest fields the original lacked:
//   - limitations[] : model caveats (heuristic, proxy inputs, unvalidated)
//   - assumptions[] : what the recommendation assumes about the field
//   - provenance[]  : per-metric data origin (direct vs proxy)
// Bangla-first presentation.
// ============================================================

import { describeWeatherProvenance } from "./weatherProvider.js";

const MODEL_LIMITATIONS = [
  "এই পরামর্শ একটি অনুমানিত মডেল থেকে এসেছে, ক্যালিব্রেটেড সম্ভাবনা নয়।",
  "পাতার স্যাঁতসেঁতে ভাব ও মাটির আর্দ্রতা অনুমানভিত্তিক।",
];

function confidenceReason(confidence) {
  if (confidence >= 75)
    return "বর্তমান আবহাওয়া ও ফসল মডেলের উপর ভিত্তি করে, মাঝারি আত্মবিশ্বাস (অনুমানিত, ক্যালিব্রেটেড নয়)।";
  if (confidence >= 60) return "উপলব্ধ আবহাওয়া তথ্যের ভিত্তিতে, কিছু ইনপুট অনুমানভিত্তিক।";
  return "সীমিত তথ্যের ভিত্তিতে, উল্লেখযোগ্য অনিশ্চয়তা রয়েছে। ঘনিষ্ঠভাবে পর্যবেক্ষণ করুন।";
}

function confidenceReasonEn(confidence) {
  if (confidence >= 75)
    return "Based on current weather and crop models with moderate confidence (heuristic, not calibrated).";
  if (confidence >= 60) return "Based on available weather data; some inputs are proxy estimates.";
  return "Based on limited data with significant uncertainty. Monitor closely.";
}

/**
 * Build a rich Explanation for a recommendation, including honest
 * limitations, assumptions, and per-metric provenance.
 * @param {import('./types.js').Recommendation} rec
 * @param {import('./types.js').WeatherData} [weather] - for provenance labeling
 * @param {string[]} [extraLimitations]
 * @returns {import('./types.js').Explanation}
 */
export function generateExplanation(rec, weather, extraLimitations = []) {
  const provenance = weather
    ? describeWeatherProvenance(weather).map((p) => ({ metric: p.metric, method: p.method, isProxy: p.isProxy }))
    : [];
  const limitations = [...MODEL_LIMITATIONS, ...extraLimitations];
  const assumptions = [
    "ফসলের বর্তমান বৃদ্ধি পর্যায় সঠিকভাবে চিহ্নিত করা হয়েছে।",
    "আবহাওয়ার পূর্বাভাস পরবর্তী ২৪–৪৮ ঘণ্টার জন্য নির্ভুল।",
  ];
  return {
    recommendationId: rec.id,
    why: rec.reason,
    whyBn: rec.reasonBn,
    dataUsed: rec.evidence,
    confidence: rec.confidence,
    confidenceReason: confidenceReasonEn(rec.confidence),
    confidenceReasonBn: confidenceReason(rec.confidence),
    alternativeActions: rec.alternativeActions,
    expectedOutcome: rec.expectedOutcome,
    expectedOutcomeBn: rec.expectedOutcomeBn,
    whatIfIgnored: rec.ignoreConsequence,
    whatIfIgnoredBn: rec.ignoreConsequenceBn,
    limitations,
    assumptions,
    provenance,
  };
}

/**
 * Format an explanation for display (Bangla-first).
 * @param {import('./types.js').Explanation} explanation
 * @param {'bn'|'en'} [lang]
 * @returns {string}
 */
export function formatExplanation(explanation, lang = "bn") {
  const isBn = lang === "bn";
  const lines = [
    `**${isBn ? "কেন?" : "Why?"}** ${isBn ? explanation.whyBn : explanation.why}`,
    `**${isBn ? "ব্যবহৃত তথ্য" : "Data Used"}:** ${explanation.dataUsed.map((d) => `• ${d}`).join("\n")}`,
    `**${isBn ? "আত্মবিশ্বাস" : "Confidence"}:** ${explanation.confidence}% — ${isBn ? explanation.confidenceReasonBn : explanation.confidenceReason}`,
    explanation.limitations.length > 0
      ? `**${isBn ? "সীমাবদ্ধতা" : "Limitations"}:**\n${explanation.limitations.map((l) => `• ${l}`).join("\n")}`
      : "",
    explanation.provenance.filter((p) => p.isProxy).length > 0
      ? `**${isBn ? "অনুমানভিত্তিক ইনপুট" : "Proxy Inputs"}:** ${explanation.provenance
          .filter((p) => p.isProxy)
          .map((p) => p.metric)
          .join(", ")}`
      : "",
    `**${isBn ? "প্রত্যাশিত ফলাফল" : "Expected Outcome"}:** ${isBn ? explanation.expectedOutcomeBn : explanation.expectedOutcome}`,
    `**${isBn ? "উপেক্ষা করলে" : "What if Ignored?"}:** ${isBn ? explanation.whatIfIgnoredBn : explanation.whatIfIgnored}`,
    explanation.alternativeActions.length > 0
      ? `**${isBn ? "বিকল্প পদক্ষেপ" : "Alternatives"}:**\n${explanation.alternativeActions.map((a) => `• ${isBn ? a.actionBn : a.action} (${a.effectiveness}%)`).join("\n")}`
      : "",
  ];
  return lines.filter(Boolean).join("\n\n");
}
