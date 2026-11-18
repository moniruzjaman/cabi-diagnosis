// ============================================================
// Plant Detective — Crop Health Intelligence (Phase 2)
// MoA (Mode of Action) Database — FRAC/IRAC/HRAC classifications.
//
// This is ORIGINAL work: the MoA group classifications, resistance-risk
// ratings, rotation windows, and season caps are PUBLIC-DOMAIN agronomic
// science published by:
//   - FRAC (Fungicide Resistance Action Committee) — https://www.frac.info
//   - IRAC (Insecticide Resistance Action Committee) — https://www.irac-online.org
//   - HRAC (Herbicide Resistance Action Committee) — https://www.hracglobal.com
// No code was ported from any repository. Each entry's `sources` field
// cites the committee publication or marks the threshold as "uncited"
// where a specific value is an agronomic approximation not directly
// published by the committee.
//
// Scope: the MoA groups relevant to the 14 diseases in diseaseEngine.js.
// This is NOT the complete FRAC code list (which has 50+ groups).
// ============================================================

/** @type {import('./types.js').MoaGroup[]} */
const MOA_GROUPS = [
  // ── FRAC Group 1 — MBC (Methyl Benzimidazole Carbamates) ──────────────
  {
    code: "FRAC_1",
    shortCode: "1",
    committee: "FRAC",
    name: "Methyl Benzimidazole Carbamates (MBC)",
    nameBn: "মেথাইল বেনজিমিডাজল কার্বামেট (MBC)",
    pesticideClass: "fungicide",
    resistanceRisk: "high",
    maxAppsPerSeason: 2,
    rotationWindowDays: 21,
    phiDays: 14,
    activeIngredients: ["Carbendazim", "Thiophanate-methyl", "Benomyl"],
    targetPathogenClasses: ["ascomycetes", "basidiomycetes"],
    sources: ["FRAC Code List 2024 — Group 1 (MBC)"],
  },
  // ── FRAC Group 2 — Dicarboximides ─────────────────────────────────────
  {
    code: "FRAC_2",
    shortCode: "2",
    committee: "FRAC",
    name: "Dicarboximides",
    nameBn: "ডাইকার্বক্সিমাইড",
    pesticideClass: "fungicide",
    resistanceRisk: "medium",
    maxAppsPerSeason: 3,
    rotationWindowDays: 14,
    phiDays: 7,
    activeIngredients: ["Iprodione", "Procymidone", "Vinclozolin"],
    targetPathogenClasses: ["ascomycetes"],
    sources: ["FRAC Code List 2024 — Group 2 (Dicarboximides)"],
  },
  // ── FRAC Group 3 — DMI (Demethylation Inhibitors, triazoles) ──────────
  {
    code: "FRAC_3",
    shortCode: "3",
    committee: "FRAC",
    name: "Demethylation Inhibitors (DMI / triazoles)",
    nameBn: "ডিমেথিলেশন ইনহিবিটর (DMI / ট্রায়াজল)",
    pesticideClass: "fungicide",
    resistanceRisk: "medium",
    maxAppsPerSeason: 4,
    rotationWindowDays: 14,
    phiDays: 21,
    activeIngredients: ["Propiconazole", "Hexaconazole", "Tebuconazole", "Difenconazole"],
    targetPathogenClasses: ["ascomycetes", "basidiomycetes", "rusts"],
    sources: ["FRAC Code List 2024 — Group 3 (DMI)"],
  },
  // ── FRAC Group 4 — PA (Phenylamides) ──────────────────────────────────
  {
    code: "FRAC_4",
    shortCode: "4",
    committee: "FRAC",
    name: "Phenylamides (PA)",
    nameBn: "ফিনাইলামাইড (PA)",
    pesticideClass: "fungicide",
    resistanceRisk: "high",
    maxAppsPerSeason: 2,
    rotationWindowDays: 14,
    phiDays: 14,
    activeIngredients: ["Metalaxyl", "Metalaxyl-M", "Mefenoxam"],
    targetPathogenClasses: ["oomycetes"],
    // FRAC mandates phenylamides always be mixed with a multi-site partner.
    mixingPartnerRequired: true,
    sources: ["FRAC Code List 2024 — Group 4 (PA) — resistance management guidelines"],
  },
  // ── FRAC Group 11 — QoI (Quinone outside Inhibitors, strobilurins) ────
  {
    code: "FRAC_11",
    shortCode: "11",
    committee: "FRAC",
    name: "Quinone outside Inhibitors (QoI / strobilurins)",
    nameBn: "কুইনোন আউটসাইড ইনহিবিটর (QoI / স্ট্রোবিলুরিন)",
    pesticideClass: "fungicide",
    resistanceRisk: "high",
    maxAppsPerSeason: 2,
    rotationWindowDays: 21,
    phiDays: 14,
    activeIngredients: ["Azoxystrobin", "Trifloxystrobin", "Kresoxim-methyl", "Pyraclostrobin"],
    targetPathogenClasses: ["ascomycetes", "basidiomycetes", "oomycetes"],
    // FRAC: QoI must NOT be used consecutively; mix with multi-site.
    mixingPartnerRequired: true,
    sources: ["FRAC Code List 2024 — Group 11 (QoI) — resistance management guidelines"],
  },
  // ── FRAC Group P1 — MBIs (Melanin Biosynthesis Inhibitors) — rice blast ─
  {
    code: "FRAC_P1",
    shortCode: "P1",
    committee: "FRAC",
    name: "Melanin Biosynthesis Inhibitors – Reductase (P1)",
    nameBn: "মেলানিন বায়োসিনথেসিস ইনহিবিটর (P1)",
    pesticideClass: "fungicide",
    resistanceRisk: "low",
    maxAppsPerSeason: 3,
    rotationWindowDays: 14,
    phiDays: 14,
    activeIngredients: ["Tricyclazole"],
    targetPathogenClasses: ["magnaporthe"],
    sources: ["FRAC Code List 2024 — Group P1"],
  },
  // ── FRAC Group M — Multi-site contact fungicides ──────────────────────
  // The resistance-management partners. Low risk, no rotation cap.
  {
    code: "FRAC_M",
    shortCode: "M",
    committee: "FRAC",
    name: "Multi-site contact fungicides",
    nameBn: "মাল্টি-সাইট কন্টাক্ট ফাঙ্গাসাইড",
    pesticideClass: "multi_site",
    resistanceRisk: "low",
    maxAppsPerSeason: 6,
    rotationWindowDays: 7,
    phiDays: 7,
    activeIngredients: ["Mancozeb", "Chlorothalonil", "Copper oxychloride", "Sulphur", "Captan"],
    targetPathogenClasses: ["ascomycetes", "basidiomycetes", "oomycetes", "bacteria"],
    sources: ["FRAC Code List 2024 — Group M (Multi-site)"],
  },
  // ── Bactericide (antibacterial — not FRAC-classified) ─────────────────
  // Streptocycline + Copper for bacterial leaf blight. No standard MoA
  // rotation framework; resistance management is via copper alternation.
  {
    code: "BACT_COPPER",
    shortCode: "Cu",
    committee: "FRAC",
    name: "Copper-based bactericide / fungicide (multi-site)",
    nameBn: "তামাভিত্তিক ব্যাকটেরিয়ানাশক (মাল্টি-সাইট)",
    pesticideClass: "bactericide",
    resistanceRisk: "low",
    maxAppsPerSeason: 4,
    rotationWindowDays: 10,
    phiDays: 7,
    activeIngredients: ["Copper oxychloride", "Copper hydroxide", "Bordeaux mixture"],
    targetPathogenClasses: ["bacteria", "oomycetes"],
    sources: ["uncited — copper is a multi-site contact bactericide; no FRAC MoA group"],
  },
  {
    code: "BACT_ANTIBIOTIC",
    shortCode: "Ab",
    committee: "FRAC",
    name: "Antibiotic bactericide",
    nameBn: "অ্যান্টিবায়োটিক ব্যাকটেরিয়ানাশক",
    pesticideClass: "bactericide",
    resistanceRisk: "high",
    maxAppsPerSeason: 2,
    rotationWindowDays: 21,
    phiDays: 21,
    activeIngredients: ["Streptocycline", "Streptomycin", "Oxytetracycline"],
    targetPathogenClasses: ["bacteria"],
    sources: ["uncited — agricultural antibiotics; resistance stewardship via rotation with copper"],
  },
  // ── Biocontrol (Trichoderma) — no MoA group, no resistance risk ───────
  {
    code: "BIO_TRICHODERMA",
    shortCode: "Bio",
    committee: "FRAC",
    name: "Biocontrol — Trichoderma spp.",
    nameBn: "বায়োকন্ট্রোল — ট্রাইকোডার্মা",
    pesticideClass: "biocontrol",
    resistanceRisk: "low",
    maxAppsPerSeason: 4,
    rotationWindowDays: 7,
    phiDays: 0,
    activeIngredients: ["Trichoderma viride", "Trichoderma harzianum"],
    targetPathogenClasses: ["soil-borne pathogens"],
    sources: ["uncited — biocontrol agent; no FRAC resistance classification"],
  },
];

// ────────────────────────────────────────────────────────────
// Disease → recommended MoA groups mapping.
// Derived from the curativeActions in diseaseEngine.js, mapped to canonical
// MoA codes. Used by recommendNextMoa() and the decision engine.
// ────────────────────────────────────────────────────────────

/** @type {Record<string, string[]>} diseaseId → preferred MoA codes (best first) */
const DISEASE_MOA_MAP = {
  rice_blast: ["FRAC_P1", "FRAC_M"],
  bacterial_leaf_blight: ["BACT_ANTIBIOTIC", "BACT_COPPER"],
  sheath_blight: ["FRAC_3", "FRAC_11", "FRAC_M"],
  rice_brown_spot: ["FRAC_M", "FRAC_3"],
  wheat_rust: ["FRAC_3", "FRAC_M"],
  powdery_mildew: ["FRAC_3", "FRAC_M", "FRAC_2"],
  jute_stem_rot: ["FRAC_1", "BIO_TRICHODERMA"],
  potato_late_blight: ["FRAC_M", "FRAC_4"],
  tomato_early_blight: ["FRAC_M", "FRAC_11", "FRAC_3"],
  chili_anthracnose: ["FRAC_M", "FRAC_11", "FRAC_1"],
  mustard_alternaria: ["FRAC_M", "FRAC_2"],
  onion_purple_blotch: ["FRAC_M", "BACT_COPPER"],
  maize_downy_mildew: ["FRAC_M", "FRAC_4"],
  brinjal_phomopsis: ["FRAC_M", "FRAC_1"],
};

// ────────────────────────────────────────────────────────────
// Free-text MoA normalization (resolves what farmers/CaseManager enter
// into a canonical code). The case treatment model stores `moaGroup` as
// a free-text string — this maps common spellings to canonical codes.
// ────────────────────────────────────────────────────────────

/** @type {Record<string, string>} normalized substring → MoA code */
const MOA_ALIASES = {
  // FRAC 1 / MBC / benzimidazoles
  "frac 1": "FRAC_1",
  frac_1: "FRAC_1",
  benzimidazole: "FRAC_1",
  carbendazim: "FRAC_1",
  thiophanate: "FRAC_1",
  "group 1": "FRAC_1",
  // FRAC 2 / dicarboximides
  "frac 2": "FRAC_2",
  frac_2: "FRAC_2",
  iprodione: "FRAC_2",
  dicarboximide: "FRAC_2",
  "group 2": "FRAC_2",
  // FRAC 3 / DMI / triazoles
  "frac 3": "FRAC_3",
  frac_3: "FRAC_3",
  dmi: "FRAC_3",
  triazole: "FRAC_3",
  propiconazole: "FRAC_3",
  hexaconazole: "FRAC_3",
  tebuconazole: "FRAC_3",
  "group 3": "FRAC_3",
  // FRAC 4 / phenylamides
  "frac 4": "FRAC_4",
  frac_4: "FRAC_4",
  phenylamide: "FRAC_4",
  metalaxyl: "FRAC_4",
  mefenoxam: "FRAC_4",
  "group 4": "FRAC_4",
  // FRAC 11 / QoI / strobilurins
  "frac 11": "FRAC_11",
  frac_11: "FRAC_11",
  qoi: "FRAC_11",
  strobilurin: "FRAC_11",
  azoxystrobin: "FRAC_11",
  trifloxystrobin: "FRAC_11",
  "group 11": "FRAC_11",
  // FRAC P1 / MBIs
  "frac p1": "FRAC_P1",
  frac_p1: "FRAC_P1",
  tricyclazole: "FRAC_P1",
  melanin: "FRAC_P1",
  // FRAC M / multi-site
  "frac m": "FRAC_M",
  frac_m: "FRAC_M",
  multi: "FRAC_M",
  mancozeb: "FRAC_M",
  chlorothalonil: "FRAC_M",
  copper: "BACT_COPPER",
  sulphur: "FRAC_M",
  sulfur: "FRAC_M",
  captan: "FRAC_M",
  // Bactericides
  streptocycline: "BACT_ANTIBIOTIC",
  streptomycin: "BACT_ANTIBIOTIC",
  oxytetracycline: "BACT_ANTIBIOTIC",
  // Biocontrol
  trichoderma: "BIO_TRICHODERMA",
  biocontrol: "BIO_TRICHODERMA",
};

const MOA_BY_CODE = new Map(MOA_GROUPS.map((g) => [g.code, g]));

/**
 * Resolve a free-text moaGroup string (as stored in cropHealthCases) to a
 * canonical MoA code. Returns null if no match (unstructured/unknown).
 * @param {string} raw
 * @returns {string|null}
 */
export function resolveMoaCode(raw) {
  if (!raw) return null;
  const lower = String(raw).trim().toLowerCase();
  if (!lower) return null;
  // Exact alias match
  if (MOA_ALIASES[lower]) return MOA_ALIASES[lower];
  // Substring match (handles "FRAC Group 3", "triazole (DMI)", etc.)
  for (const [alias, code] of Object.entries(MOA_ALIASES)) {
    if (lower.includes(alias)) return code;
  }
  // Bare short-code match (e.g. "1", "11", "m", "p1") — handles records
  // written by older callers that stored group.shortCode instead of the
  // canonical code. Without this they resolve to null and silently drop out
  // of rotation/resistance tracking.
  for (const g of MOA_GROUPS) {
    if (g.shortCode && g.shortCode.toLowerCase() === lower) return g.code;
  }
  return null;
}

/**
 * @param {string} code
 * @returns {import('./types.js').MoaGroup|undefined}
 */
export function getMoaGroup(code) {
  return MOA_BY_CODE.get(code);
}

/**
 * @returns {import('./types.js').MoaGroup[]}
 */
export function getAllMoaGroups() {
  return MOA_GROUPS;
}

/**
 * Get the preferred MoA codes for a disease (best rotation order).
 * @param {string} diseaseId
 * @returns {string[]}
 */
export function getMoaCodesForDisease(diseaseId) {
  return DISEASE_MOA_MAP[diseaseId] || [];
}

/**
 * Recommend the next MoA to use for a disease, given the history of MoA
 * codes already applied this season. Rotates to the first preferred group
 * that has NOT been used, falling back to multi-site (the safe partner).
 * @param {string} diseaseId
 * @param {string[]} usedMoaCodes - codes already applied this season
 * @returns {{code: string, group: import('./types.js').MoaGroup, reason: string}|null}
 */
export function recommendNextMoa(diseaseId, usedMoaCodes = []) {
  const preferred = getMoaCodesForDisease(diseaseId);
  const used = new Set(usedMoaCodes);

  // 1. First preferred group not yet used this season.
  for (const code of preferred) {
    if (!used.has(code)) {
      const group = getMoaGroup(code);
      if (group) {
        return {
          code,
          group,
          reason: `${group.shortCode} (${group.nameBn}) এই মরসুমে এখনও ব্যবহৃত হয়নি — রোটেশন সম্মত।`,
        };
      }
    }
  }

  // 2. If all preferred groups used, fall back to multi-site (FRAC_M) — the
  //    resistance-safe partner that has no rotation cap.
  const multiSite = getMoaGroup("FRAC_M");
  if (multiSite && !used.has("FRAC_M")) {
    return {
      code: "FRAC_M",
      group: multiSite,
      reason: `সব পছন্দের গ্রুপ ব্যবহৃত হয়েছে — মাল্টি-সাইট (${multiSite.nameBn}) নিরাপদ বিকল্প, রেজিস্ট্যান্স ঝুঁকি কম।`,
    };
  }

  // 3. Last resort: the preferred group with the lowest resistance risk that
  //    hasn't exceeded its season cap (caller must check caps separately).
  const riskOrder = { low: 0, medium: 1, high: 2 };
  const candidates = preferred
    .map((c) => getMoaGroup(c))
    .filter(Boolean)
    .sort((a, b) => riskOrder[a.resistanceRisk] - riskOrder[b.resistanceRisk]);
  if (candidates.length > 0) {
    return {
      code: candidates[0].code,
      group: candidates[0],
      reason: `সব গ্রুপ ব্যবহৃত — সর্বনিম্ন ঝুঁকির গ্রুপ ${candidates[0].shortCode} পুনরায় বিবেচনা করুন। সচেতনতার সাথে ব্যবহার করুন।`,
    };
  }
  return null;
}
