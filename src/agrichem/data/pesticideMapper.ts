/**
 * PesticideProduct → ChemicalProduct mapper.
 *
 * Bridges the official DAE database (`./all_pesticides.ts`, 5,453 entries)
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
 *        by code
 *      - formulation parsed from the brand name (e.g. "Pithion 46.5EC" → "EC")
 *
 * 2. Where a curated entry exists with the same `(registrationNo, tradeName)`
 *    key, we merge in its richer hand-curated fields (toxicityClass,
 *    whoColor, phiDays, reiHours, waterVolumeLPerHa, safetyNotes,
 *    targetLifeCycle, and any MoA fields the curated entry overrides).
 *    This preserves the editorial work in `pesticidesData.ts` /
 *    `additionalPesticides.ts` for the ~187 products that have it.
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

// ─── Stable ID ───────────────────────────────────────────────────────────────

/**
 * Build a deterministic ID from the DAE registration number + brand name.
 * Existing curated IDs (e.g. "mit-001", "ins-032") are preserved when
 * a curated match is found, so any downstream references remain stable.
 */
function buildId(p: PesticideProduct): string {
  const reg = p.registrationNo.replace(/[^a-zA-Z0-9]/g, '');
  const brand = p.brandName
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
    .slice(0, 24);
  const tail = `${p.slNoCommonName}-${p.slNoProduct}`;
  return `dae-${reg}-${tail}-${brand}`;
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

// ─── Single-entry mapper ─────────────────────────────────────────────────────

export function mapPesticideToChemical(p: PesticideProduct): ChemicalProduct {
  const moa = p.moaCode ? MOA_BY_CODE.get(p.moaCode) : undefined;
  const formulation = inferFormulation(p.brandName);
  const curatedKey = `${p.registrationNo}|${p.brandName.toLowerCase()}`;
  const curated = CURATED_LOOKUP.get(curatedKey);

  return {
    // Identity
    id: curated?.id ?? buildId(p),
    type: toChemicalType(p.pesticideType),
    commonName: p.commonName,
    tradeName: p.brandName,
    registrationNo: p.registrationNo,
    registrationHolder: p.registrationHolder,

    // Recommendation arrays (defensive copies — callers may sort/filter in place)
    crops: p.recommendedCrops.slice(),
    pests: p.recommendedPests.slice(),
    dosageRate: p.dosageRate,

    // MoA enrichment (curated value wins when present)
    moaCode: p.moaCode ?? curated?.moaCode,
    moaGroup: curated?.moaGroup ?? moa?.name,
    moaSubGroup: curated?.moaSubGroup ?? moa?.subGroup,
    moaTargetSite: curated?.moaTargetSite ?? moa?.targetSite,
    resistanceRisk: curated?.resistanceRisk ?? moa?.resistanceRisk,
    rotationNotes: curated?.rotationNotes ?? moa?.rotationStrategy,

    // Formulation: curated value wins, otherwise inferred from brand name
    formulation: curated?.formulation ?? formulation,

    // Curated-only rich fields (undefined for the ~5,266 DAE-only entries;
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
 *   - 5,453 DAE-registered products (mapped to ChemicalProduct, MoA-enriched)
 *   - + ~57 curated products that exist only in pesticidesData.ts (mostly
 *     bio-pesticides with `AP (Bio)-X` registrations not yet in the DAE
 *     registry export)
 *
 * Total: ~5,510 products.
 */
export const PESTICIDES_DATABASE_OFFICIAL: ChemicalProduct[] = [
  ...DAE_MAPPED,
  ...ORPHAN_CURATED,
];

export default PESTICIDES_DATABASE_OFFICIAL;
