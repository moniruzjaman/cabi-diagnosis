/**
 * Six-Pillar configuration — single source of truth shared by the Home
 * dashboard grid, the case workflow, and the Learn hub cross-links.
 *
 * DETECT → TREAT → PREVENT → MONITOR → EVALUATE → LEARN
 */

export const SIX_PILLARS = [
  {
    id: "detect",
    step: 1,
    labelBn: "শনাক্ত",
    labelEn: "DETECT",
    descBn: "ছবি বা লক্ষণ থেকে রোগ শনাক্ত",
    icon: "🔍",
    color: "#046A1A",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    tab: "diagnose",
  },
  {
    id: "treat",
    step: 2,
    labelBn: "চিকিৎসা",
    labelEn: "TREAT",
    descBn: "IPM ভিত্তিক ব্যবস্থাপনা পরিকল্পনা",
    icon: "💊",
    color: "#B45309",
    bg: "#fffbeb",
    border: "#fcd34d",
    tab: "diagnose",
  },
  {
    id: "prevent",
    step: 3,
    labelBn: "প্রতিরোধ",
    labelEn: "PREVENT",
    descBn: "মৌসুমে ও আবহাওয়ায় পূর্ব-সতর্কতা",
    icon: "🛡️",
    color: "#1D4ED8",
    bg: "#eff6ff",
    border: "#bfdbfe",
    tab: "prevent",
  },
  {
    id: "monitor",
    step: 4,
    labelBn: "পর্যবেক্ষণ",
    labelEn: "MONITOR",
    descBn: "ক্ষেতের কেস ফলো-আপ ও রিমাইন্ডার",
    icon: "📋",
    color: "#0E7490",
    bg: "#ecfeff",
    border: "#a5f3fc",
    tab: "cases",
  },
  {
    id: "evaluate",
    step: 5,
    labelBn: "মূল্যায়ন",
    labelEn: "EVALUATE",
    descBn: "চিকিৎসার ফলাফল যাচাই",
    icon: "📊",
    color: "#7C3AED",
    bg: "#faf5ff",
    border: "#e9d5ff",
    tab: "cases",
  },
  {
    id: "learn",
    step: 6,
    labelBn: "শিখুন",
    labelEn: "LEARN",
    descBn: "প্রোটোকল, ভিজ্যুয়াল লাইব্রেরি ও কেস শিক্ষা",
    icon: "🎓",
    color: "#BE185D",
    bg: "#fdf2f8",
    border: "#fbcfe8",
    tab: "learn",
  },
];

export function getPillar(id) {
  return SIX_PILLARS.find((p) => p.id === id) || null;
}

/**
 * Where each pillar lands given the current app state — lets the grid
 * route intelligently (e.g. TREAT with a live result opens the report;
 * without one it opens the diagnose flow).
 */
export function pillarTarget(pillarId, { hasActiveCase } = {}) {
  const p = getPillar(pillarId);
  if (!p) return { tab: "home" };
  if (pillarId === "evaluate") {
    return { tab: hasActiveCase ? "cases" : "cases", view: "evaluate" };
  }
  return { tab: p.tab };
}
