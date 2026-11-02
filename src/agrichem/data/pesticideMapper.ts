/**
 * PesticideProduct → ChemicalProduct mapper.
 *
 * Bridges the official DAE database (`./all_pesticides.ts`, 5,452 entries)
 * to the rich `ChemicalProduct` schema consumed by the AgriChem UI
 * (`./pesticidesData.ts`-shaped objects).
 *
 * Strategy
 * --------
 * 1. For every DAE entry we synthesize a `ChemicalProduct` with the
 *    fields that can be derived mechanically:
 *      - basic identity (id, type, commonName, tradeName, registrationNo,
 *        registrationHolder, crops, pests, dosageRate, moaCode)
 *      - MoA enrichment (moaGroup / moaSubGroup / moaTargetSite /
 *        resistanceRisk / rotationNotes) looked up from `MOA_DATABASE`
 *        by code (with old→new code aliasing and combo-code handling)
 *      - formulation parsed from the brand name (e.g. "Pithion 46.5EC" → "EC")
 *      - crop-name de-fragmentation (e.g. ["Ridge","gourd"] → ["Ridge gourd"])
 *      - empty-field fallbacks (empty registrationNo/holder/dosage/crops
 *        get sensible defaults so the UI never breaks)
 *
 * 2. Where a curated entry exists with the same `(registrationNo, tradeName)`
 *    key, we merge in its richer hand-curated fields (toxicityClass,
 *    whoColor, phiDays, reiHours, waterVolumeLPerHa, safetyNotes,
 *    targetLifeCycle, and any MoA fields the curated entry overrides).
 *    This preserves the editorial work in `pesticidesData.ts` /
 *    `additionalPesticides.ts` for the 187 products that have it.
 *
 * 3. Curated entries that do NOT match any DAE entry (e.g. bio-pesticides
 *    with `AP (Bio)-X` registration numbers, or any other orphan) are
 *    appended at the end so no editorial data is lost.
 *
 * The result is `PESTICIDES_DATABASE_OFFICIAL` — a single array of
 * `ChemicalProduct` that powers the mounted Pesticide tab in App.tsx.
 */

import {
  pesticides,
  PesticideProduct,
  PesticideType,
} from './all_pesticides';
import { PESTICIDES_DATABASE as CURATED_DATABASE } from './pesticidesData';
import { MOA_DATABASE } from './moaData';
import {
  ChemicalProduct,
  ChemicalType,
  MoAClassification,
} from '../types';

// ─── MoA lookup by code ──────────────────────────────────────────────────────

const MOA_BY_CODE: ReadonlyMap<string, MoAClassification> = new Map(
  MOA_DATABASE.map((m) => [m.code, m]),
);

/**
 * Aliases for old MoA code formats that the DAE registry still uses
 * but `MOA_DATABASE` only contains in the new format.
 *
 *   - FRAC dropped the leading-zero convention briefly (M1→M01, M2→M02…)
 *   - HRAC moved from letters (A, B, C1…) to numbers (1, 2, 5…) in 2020
 *
 * Source for HRAC letter→number mapping:
 *   https://www.hracglobal.com/resources/pages/classificationofherbicidesitesofaction.aspx
 */
const MOA_CODE_ALIASES: Readonly<Record<string, string>> = {
  // FRAC: legacy single-digit M-codes → zero-padded
  'FRAC M1': 'FRAC M01',
  'FRAC M2': 'FRAC M02',
  'FRAC M3': 'FRAC M03',
  'FRAC M4': 'FRAC M04',
  'FRAC M5': 'FRAC M05',

  // HRAC: legacy letter codes → 2020 numeric codes
  'HRAC A': 'HRAC 1',
  'HRAC B': 'HRAC 2',
  'HRAC C1': 'HRAC 5',
  'HRAC C2': 'HRAC 6',
  'HRAC C3': 'HRAC 6',
  'HRAC D': 'HRAC 22',
  'HRAC E': 'HRAC 14',
  'HRAC F2': 'HRAC 4',
  'HRAC F3': 'HRAC 4',
  'HRAC G': 'HRAC 9',
  'HRAC H': 'HRAC 24',
  'HRAC I': 'HRAC 27',
  'HRAC J': 'HRAC 11',
  'HRAC K1': 'HRAC 3',
  'HRAC K2': 'HRAC 4',
  'HRAC K3': 'HRAC 15',
  'HRAC L': 'HRAC 27',
  'HRAC N': 'HRAC 13',
  'HRAC O': 'HRAC 4',
  'HRAC P': 'HRAC 12',
  'HRAC Z': 'HRAC 27',
};

/**
 * Non-standard codes used by the DAE for products that don't fit the
 * IRAC/FRAC/HRAC framework (pheromones, anticoagulants, inorganic
 * acute toxins). For these we use the code itself as the moaGroup label
 * so the UI has something to display.
 */
const NON_STANDARD_MOA_LABELS: Readonly<Record<string, string>> = {
  'IPM Biological Pheromone': 'IPM Biological Pheromone (Mating Disruption)',
  'Pheromone Mating Disruption': 'Pheromone Mating Disruption',
  'Second-generation Anticoagulant': 'Second-generation Anticoagulant (Vitamin K1 antagonist)',
  'Acute Metabolic Toxin': 'Acute Metabolic Toxin (Zinc Phosphide)',
};

/**
 * Look up a MoA classification by code, trying:
 *   1. exact match
 *   2. alias normalization (old → new code)
 *   3. combo-code splitting on " / " or " + " (return first component that matches)
 *
 * Returns `undefined` only when no component of the code can be resolved.
 */
function lookupMoA(rawCode: string | null | undefined): MoAClassification | undefined {
  if (!rawCode) return undefined;
  const code = rawCode.trim();
  if (!code) return undefined;

  // 1. Exact match
  const exact = MOA_BY_CODE.get(code);
  if (exact) return exact;

  // 2. Alias normalization
  const aliased = MOA_CODE_ALIASES[code];
  if (aliased) {
    const m = MOA_BY_CODE.get(aliased);
    if (m) return m;
  }

  // 3. Combo code: split on " / " or " + " and return first matching component
  //    (e.g. "FRAC M02 / IRAC UN" → try "FRAC M02" then "IRAC UN")
  const parts = code.split(/\s*(?:\/|\+)\s*/);
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const direct = MOA_BY_CODE.get(trimmed);
    if (direct) return direct;
    const alias = MOA_CODE_ALIASES[trimmed];
    if (alias) {
      const m = MOA_BY_CODE.get(alias);
      if (m) return m;
    }
  }

  return undefined;
}

/**
 * Build a human-readable MoA group label for codes that have no
 * `MOA_DATABASE` entry but are still valid (e.g. "FRAC 12", "IRAC 31",
 * combo codes like "IRAC 1B + IRAC 3A").
 *
 * Heuristic:
 *   - For combos: "Combination MoA — A + B"
 *   - For single IRAC/FRAC/HRAC codes: just return the code itself
 *     (the UI shows "MoA Code: IRAC 31" + "MoA Group: IRAC 31" which
 *     is redundant but informative)
 *   - For non-standard codes: use the friendly label from
 *     NON_STANDARD_MOA_LABELS, or fall back to the raw code
 */
function buildMoAGroupLabel(rawCode: string | null | undefined): string | undefined {
  if (!rawCode) return undefined;
  const code = rawCode.trim();
  if (!code) return undefined;

  // Non-standard codes (pheromones, anticoagulants, etc.)
  if (NON_STANDARD_MOA_LABELS[code]) return NON_STANDARD_MOA_LABELS[code];

  // Combo codes
  if (/\s*(?:\/|\+)\s*/.test(code)) {
    return `Combination MoA — ${code}`;
  }

  // Single codes that aren't in MOA_DATABASE (e.g. "IRAC 31", "FRAC NC")
  return code;
}

// ─── PesticideType → ChemicalType ────────────────────────────────────────────

/**
 * DAE's `PesticideType` has two values that don't exist in the UI's
 * `ChemicalType` union:
 *   - "Store Grain Insecticide"  → maps to "Stored Grain"
 *   - "Public Health"            → kept as "Public Health" (the union was
 *                                  extended in types/index.ts to support it)
 */
function toChemicalType(t: PesticideType): ChemicalType {
  switch (t) {
    case 'Insecticide':
      return 'Insecticide';
    case 'Fungicide':
      return 'Fungicide';
    case 'Herbicide':
      return 'Herbicide';
    case 'Miticide':
      return 'Miticide';
    case 'Bio Pesticide':
      return 'Bio Pesticide';
    case 'Store Grain Insecticide':
      return 'Stored Grain';
    case 'Rodenticide':
      return 'Rodenticide';
    case 'Public Health':
      return 'Public Health';
    default:
      // Fall back to Insecticide for any future DAE category not yet wired up.
      return 'Insecticide';
  }
}

// ─── Formulation inference from brand name ───────────────────────────────────

/**
 * Recognised FAO formulation codes. Sorted by length descending so the
 * regex prefers longer matches (e.g. "WDG" over "WG").
 */
const FORMULATION_CODES: ReadonlyArray<string> = [
  'WDG', 'WG', 'WP', 'SP', 'SG', 'GR', 'SC', 'SL', 'EC', 'DC',
  'EW', 'ME', 'OD', 'FS', 'CS', 'ST', 'DS', 'WS', 'SS', 'PS',
  'ES', 'GL', 'LN', 'TN', 'TE', 'RB',
];

const FORMULATION_REGEX = new RegExp(
  // Match an optional concentration like "46.5" or "25" or "50"
  // immediately followed by a formulation code at word boundary,
  // OR a standalone code at end of string.
  `(?:\\d+(?:\\.\\d+)?\\s*|\\b)(${FORMULATION_CODES.join('|')})\\b`,
  'i',
);

const SPECIAL_FORMULATION_REGEX =
  /\b(tablet|tablets|bait|block|powder|granule|granules|liquid|lure|lures)\b/i;

function inferFormulation(brandName: string): string | undefined {
  if (!brandName) return undefined;
  const m = brandName.match(FORMULATION_REGEX);
  if (m) return m[1].toUpperCase();
  const sm = brandName.match(SPECIAL_FORMULATION_REGEX);
  if (sm) {
    const s = sm[1].toLowerCase();
    if (s.startsWith('tablet')) return 'Tablet';
    if (s === 'bait') return 'Bait';
    if (s === 'block') return 'Block';
    if (s === 'powder') return 'Powder';
    if (s.startsWith('granule')) return 'GR';
    if (s === 'liquid') return 'Liquid';
    if (s.startsWith('lure')) return 'Lure';
  }
  return undefined;
}

// ─── Crop-name de-fragmentation ──────────────────────────────────────────────

/**
 * Known compound crop names where the DAE CSV split on a stray comma
 * inside the name (e.g. "Ridge gourd" stored as "Ridge,gourd" in the
 * source data, then split by the import script into two array entries).
 *
 * We check for the two-word pattern appearing consecutively in the
 * crops array and merge them back into the proper compound name.
 */
const COMPOUND_CROPS: ReadonlyArray<string> = [
  // Gourd family (the worst offenders — every variety got split)
  'Ridge gourd',
  'Sweet gourd',
  'Ribbed gourd',
  'Bottle gourd',
  'Bitter gourd',
  'Snake gourd',
  'Teasle gourd',
  'Pointed gourd',
  'Wax gourd',
  'Ash gourd',
  'Sponge gourd',
  'Ivy gourd',
  'Apple gourd',
  'Round gourd',
  // Melons
  'Water melon', // (also accept the merged "Watermelon" — see below)
  'Sweet melon',
  'Musk melon',
  // Other common split patterns
  'Sweet pepper',
  'Black gram',
  'Green gram',
  'Red gram',
  'Horse gram',
  'Chick pea',
  'Pigeon pea',
  'Lab lab',
  'Pointed',
  'Wood apple',
  'Curry leaf',
  'Sweet flag',
];

/**
 * Fix crop-name fragmentation in the DAE data.
 *
 * Mutates a copy of the input array, scanning for two consecutive entries
 * that — when concatenated with a space — form a known compound crop name.
 * Returns the cleaned array.
 */
function defragmentCrops(crops: ReadonlyArray<string>): string[] {
  if (crops.length < 2) return crops.slice();

  const out: string[] = [];
  let i = 0;
  while (i < crops.length) {
    const cur = crops[i].trim();
    const next = (i + 1 < crops.length) ? crops[i + 1].trim() : null;

    if (next !== null) {
      const merged = `${cur} ${next}`;
      // Match case-insensitively against the known compound list.
      const matched = COMPOUND_CROPS.find(
        (c) => c.toLowerCase() === merged.toLowerCase(),
      );
      if (matched) {
        out.push(matched);
        i += 2;
        continue;
      }
    }
    out.push(cur);
    i += 1;
  }

  return out;
}

// ─── Stable ID ───────────────────────────────────────────────────────────────

/**
 * Build a deterministic ID from the DAE registration number + brand name.
 * Existing curated IDs (e.g. "mit-001", "ins-032") are preserved when
 * a curated match is found, so any downstream references remain stable.
 *
 * For DAE entries with an empty registrationNo (1 entry in the registry:
 * "Golder Aerosol"), we fall back to a synthetic prefix using the
 * pesticideType + slNoCommonName + slNoProduct so the ID is still unique.
 */
function buildId(p: PesticideProduct): string {
  const reg = p.registrationNo?.trim() || `noreg-${p.pesticideType.replace(/\s+/g, '')}`;
  const regClean = reg.replace(/[^a-zA-Z0-9]/g, '');
  const brand = (p.brandName || 'unknown')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
    .slice(0, 24);
  const tail = `${p.slNoCommonName}-${p.slNoProduct}`;
  return `dae-${regClean}-${tail}-${brand}`;
}

// ─── Curated lookup ──────────────────────────────────────────────────────────

/**
 * Key = `${registrationNo}|${tradeNameLower}`. We use lower-case brand
 * comparison because DAE occasionally tweaks capitalisation between
 * the curated dataset and the official registry.
 */
const CURATED_LOOKUP: ReadonlyMap<string, ChemicalProduct> = new Map(
  CURATED_DATABASE.map((c) => [
    `${c.registrationNo}|${c.tradeName.toLowerCase()}`,
    c,
  ]),
);

// ─── Empty-field fallbacks ───────────────────────────────────────────────────

/**
 * Default fallback values for entries where DAE has missing data.
 * These prevent the UI from rendering empty strings or crashing on
 * `.map()` of undefined.
 */
function fallbackString(value: string | undefined, fallback: string): string {
  return value && value.trim() ? value : fallback;
}

/**
 * For products with no crop recommendations (675 entries — mostly
 * Public Health mosquito sprays but also some fungicides/insecticides
 * where DAE data is incomplete), we use a type-aware placeholder so
 * the UI's "Recommended Crops" section isn't just empty whitespace.
 */
function fallbackCrops(crops: ReadonlyArray<string>, type: ChemicalType): string[] {
  if (crops.length > 0) return defragmentCrops(crops);
  switch (type) {
    case 'Public Health':
      return ['Public Health Use'];
    case 'Stored Grain':
      return ['Stored Grain'];
    case 'Rodenticide':
      return ['Field / Storage'];
    default:
      return ['Not specified in DAE registry'];
  }
}

// ─── Single-entry mapper ─────────────────────────────────────────────────────

export function mapPesticideToChemical(p: PesticideProduct): ChemicalProduct {
  const moa = lookupMoA(p.moaCode);
  const formulation = inferFormulation(p.brandName);
  const curatedKey = `${p.registrationNo}|${p.brandName.toLowerCase()}`;
  const curated = CURATED_LOOKUP.get(curatedKey);

  const type = toChemicalType(p.pesticideType);
  const crops = fallbackCrops(p.recommendedCrops, type);
  const pests =
    p.recommendedPests.length > 0
      ? p.recommendedPests.slice()
      : ['Not specified in DAE registry'];

  return {
    // Identity — curated IDs are preserved when matched
    id: curated?.id ?? buildId(p),
    type,
    commonName: fallbackString(p.commonName, 'Unknown active ingredient'),
    tradeName: fallbackString(p.brandName, 'Unknown brand'),
    registrationNo: fallbackString(p.registrationNo, 'N/A'),
    registrationHolder: fallbackString(p.registrationHolder, 'Unknown registrant'),

    // Recommendation arrays (defensive copies — callers may sort/filter in place)
    crops,
    pests,
    dosageRate: fallbackString(p.dosageRate, 'See product label'),

    // MoA enrichment (curated value wins when present; otherwise looked up
    // from MOA_DATABASE via the alias-aware resolver; otherwise a
    // human-readable label is synthesized from the raw code)
    moaCode: p.moaCode ?? curated?.moaCode,
    moaGroup:
      curated?.moaGroup ??
      moa?.name ??
      buildMoAGroupLabel(p.moaCode),
    moaSubGroup: curated?.moaSubGroup ?? moa?.subGroup,
    moaTargetSite: curated?.moaTargetSite ?? moa?.targetSite,
    resistanceRisk: curated?.resistanceRisk ?? moa?.resistanceRisk,
    rotationNotes:
      curated?.rotationNotes ??
      moa?.rotationStrategy ??
      // For combination MoA codes, give a generic rotation note
      (p.moaCode && /\s*(?:\/|\+)\s*/.test(p.moaCode)
        ? 'Rotate with a product from a different MoA group. Combination products should be alternated with single-MoA products to slow resistance development.'
        : undefined),

    // Formulation: curated value wins, otherwise inferred from brand name
    formulation: curated?.formulation ?? formulation,

    // Curated-only rich fields (undefined for the ~5,265 DAE-only entries;
    // the UI already handles undefined gracefully via `||` fallbacks)
    toxicityClass: curated?.toxicityClass,
    whoColor: curated?.whoColor,
    phiDays: curated?.phiDays,
    reiHours: curated?.reiHours,
    waterVolumeLPerHa: curated?.waterVolumeLPerHa,
    safetyNotes: curated?.safetyNotes,
    targetLifeCycle: curated?.targetLifeCycle,
  };
}

// ─── Build the official database ─────────────────────────────────────────────

const DAE_MAPPED: ChemicalProduct[] = pesticides.map(mapPesticideToChemical);

// Curated products that have no DAE counterpart (e.g. AP (Bio)-1, AP (Bio)-2,
// AP (Bio)-4). We append them so the editorial work isn't lost.
const DAE_KEYS: ReadonlySet<string> = new Set(
  pesticides.map(
    (p) => `${p.registrationNo}|${p.brandName.toLowerCase()}`,
  ),
);

const ORPHAN_CURATED: ChemicalProduct[] = CURATED_DATABASE.filter((c) => {
  const key = `${c.registrationNo}|${c.tradeName.toLowerCase()}`;
  return !DAE_KEYS.has(key);
});

/**
 * The official mounted Pesticide database for the AgriChem tab.
 *
 * Composition:
 *   - 5,452 DAE-registered products (mapped to ChemicalProduct, MoA-enriched)
 *   - + ~172 curated products that exist only in pesticidesData.ts (mostly
 *     bio-pesticides with `AP (Bio)-X` registrations not yet in the DAE
 *     registry export)
 *
 * Total: ~5,624 products.
 */
export const PESTICIDES_DATABASE_OFFICIAL: ChemicalProduct[] = [
  ...DAE_MAPPED,
  ...ORPHAN_CURATED,
];

export default PESTICIDES_DATABASE_OFFICIAL;
