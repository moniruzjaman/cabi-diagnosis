// Canonical crop identity layer — Phase 1, Workstream A.
//
// Stable machine IDs for the CABI crop selector. Display strings in
// cropRegistry.js stay untouched (UI labels, ordering, season/variety
// selection all keep working); this module adds the ID/alias layer on top.
//
// Sources:
//   - docs/integration/crop-registry-v1.json (1.1.0-draft) — canonical IDs and
//     aliases for registry:true crops (CANONICAL_CROPS below, verbatim).
//   - docs/integration/model-coverage-v1.json — modelCoverageRef values.
//     Crop identity is NOT model eligibility; routing checks coverage separately
//     (see src/offline/visionRouter.js).
//   - src/data/cropRegistry.js — the 205 selectable display strings. The
//     display-string -> ID map is DERIVED at module init with deterministic
//     rules (base name -> snake_case; "X - Variant" -> variant attribute;
//     explicit OVERRIDES for the identity-critical rows). The mapping is
//     locked by src/intelligence/__tests__/canonicalCrops.test.mjs, which
//     asserts every display string resolves deterministically.
//
// Identity rules (Phase 0 evidence):
//   - capsicum_bell (মিষ্টি মরিচ), chili (মরিচ), ornamental_pepper
//     (অর্নামেন্টাল মরিচ) and black_pepper (গোলমরিচ) are four DISTINCT crops.
//   - The bare token "pepper" is ambiguous and is never auto-resolved.
//     Bare Bangla "মরিচ" is NOT ambiguous: crop-registry-v1.json records it as
//     the source name of chili.
//   - Rice seasons (Boro/Aman/Aus) stay attributes of rice, per the draft
//     integration spec recommendation.
//   - Unknown inputs resolve to ok:false "unknown" — never silently mapped to
//     another crop.
//
// tomato is validated by the PlantVillage models (model-coverage-v1.json) but
// is absent from the draft crop registry; it is included here as
// registry:false and this gap is flagged for owner review in the Phase 1 PR.

import { CROP_REGISTRY } from "./cropRegistry.js";

// Pinned snapshot metadata of the draft registry this layer was generated from.
export const CROP_REGISTRY_SNAPSHOT = {
  registry: "krishiai-crop-registry",
  version: "1.1.0-draft",
  status: "draft-owner-review-required",
  pinnedFrom: "docs/integration/crop-registry-v1.json",
};

// Canonical crops with display labels, aliases and (draft) model coverage refs.
// Aliases are verbatim from crop-registry-v1.json (plus the CABI selector's own
// Bangla display segment where it differs, e.g. শিমলা মরিচ / বাটি মরিচ).
export const CANONICAL_CROPS = {
  rice: { labelEn: "Rice", labelBn: null, aliases: ["rice", "ধান"], modelCoverageRef: null, registry: true },
  wheat: { labelEn: "Wheat", labelBn: null, aliases: ["wheat", "গম"], modelCoverageRef: null, registry: true },
  maize: {
    labelEn: "Maize",
    labelBn: null,
    aliases: ["maize", "corn", "ভুট্টা"],
    modelCoverageRef: null,
    registry: true,
  },
  mustard: { labelEn: "Mustard", labelBn: null, aliases: ["mustard", "সরিষা"], modelCoverageRef: null, registry: true },
  soybean: { labelEn: "Soybean", labelBn: null, aliases: ["soybean"], modelCoverageRef: null, registry: true },
  sesame: { labelEn: "Sesame", labelBn: null, aliases: ["sesame", "তিল"], modelCoverageRef: null, registry: true },
  chili: {
    labelEn: "Chili",
    labelBn: "মরিচ",
    aliases: ["chili", "chilli", "hot pepper", "মরিচ"],
    modelCoverageRef: null,
    registry: true,
  },
  turmeric: {
    labelEn: "Turmeric",
    labelBn: null,
    aliases: ["turmeric", "হলুদ"],
    modelCoverageRef: null,
    registry: true,
  },
  ginger: { labelEn: "Ginger", labelBn: null, aliases: ["ginger", "আদা"], modelCoverageRef: null, registry: true },
  lentil: { labelEn: "Lentil", labelBn: null, aliases: ["lentil", "মসুর"], modelCoverageRef: null, registry: true },
  chickpea: {
    labelEn: "Chickpea",
    labelBn: null,
    aliases: ["chickpea", "ছোলা"],
    modelCoverageRef: null,
    registry: true,
  },
  black_gram: {
    labelEn: "Black gram",
    labelBn: null,
    aliases: ["black gram", "মাষকলাই"],
    modelCoverageRef: null,
    registry: true,
  },
  mango: { labelEn: "Mango", labelBn: null, aliases: ["mango", "আম"], modelCoverageRef: null, registry: true },
  jackfruit: {
    labelEn: "Jackfruit",
    labelBn: null,
    aliases: ["jackfruit", "কাঁঠাল"],
    modelCoverageRef: null,
    registry: true,
  },
  litchi: {
    labelEn: "Litchi",
    labelBn: null,
    aliases: ["litchi", "lychee", "লিচু"],
    modelCoverageRef: null,
    registry: true,
  },
  potato: {
    labelEn: "Potato",
    labelBn: null,
    aliases: ["potato", "আলু"],
    modelCoverageRef: "plantvillage-mobilenetv3-light",
    registry: true,
  },
  brinjal: {
    labelEn: "Brinjal",
    labelBn: null,
    aliases: ["brinjal", "eggplant", "বেগুন"],
    modelCoverageRef: null,
    registry: true,
  },
  cabbage: {
    labelEn: "Cabbage",
    labelBn: null,
    aliases: ["cabbage", "বাঁধাকপি"],
    modelCoverageRef: null,
    registry: true,
  },
  cotton: { labelEn: "Cotton", labelBn: null, aliases: ["cotton", "তুলা"], modelCoverageRef: null, registry: true },
  tea: { labelEn: "Tea", labelBn: null, aliases: ["tea", "চা"], modelCoverageRef: null, registry: true },
  tobacco: { labelEn: "Tobacco", labelBn: null, aliases: ["tobacco", "তামাক"], modelCoverageRef: null, registry: true },
  capsicum_bell: {
    labelEn: "Bell pepper",
    labelBn: "মিষ্টি মরিচ",
    aliases: [
      "bell pepper",
      "sweet pepper",
      "capsicum",
      "capsicum annuum (bell type)",
      "মিষ্টি মরিচ",
      "শিমলা মরিচ",
      "বাটি মরিচ",
    ],
    modelCoverageRef: "plantvillage-mobilenetv3-light",
    registry: true,
  },
  ornamental_pepper: {
    labelEn: "Ornamental pepper",
    labelBn: "অর্নামেন্টাল মরিচ",
    aliases: ["ornamental pepper", "ornamental chilli", "অর্নামেন্টাল মরিচ"],
    modelCoverageRef: null,
    registry: true,
  },
  black_pepper: {
    labelEn: "Black pepper",
    labelBn: "গোলমরিচ",
    aliases: ["black pepper", "গোলমরিচ"],
    modelCoverageRef: null,
    registry: true,
  },
  tomato: {
    labelEn: "Tomato",
    labelBn: "টমেটো",
    aliases: ["tomato", "টমেটো", "টমাটো"],
    modelCoverageRef: "plantvillage-mobilenetv3-light",
    registry: false,
  },
};

// The four distinct pepper identities — never interchangeable.
export const PEPPER_IDENTITY_IDS = ["capsicum_bell", "chili", "ornamental_pepper", "black_pepper"];

// Tokens that are deliberately ambiguous and must not auto-resolve.
export const AMBIGUOUS_CROP_TOKENS = ["pepper"];

// Stable lowercase-ASCII normalization. Bangla characters are kept (trimmed);
// Latin text is lowercased, quotes unified and punctuation collapsed.
export function normalizeCropAlias(value) {
  return String(value ?? "")
    .replace(/\(.*?\)/g, " ")
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// ── Display-string -> canonical ID derivation ───────────────────────────────
// Explicit overrides for identity-critical selector rows (verbatim display
// strings from src/data/cropRegistry.js). Everything else derives from the
// English display segment: base name -> snake_case, "X - Variant" -> variant.
const OVERRIDES = {
  "ধান (বোরো) / Rice - Boro": { id: "rice", season: "boro" },
  "ধান (আমন) / Rice - Aman": { id: "rice", season: "aman" },
  "ধান (আউশ) / Rice - Aus": { id: "rice", season: "aus" },
  "মরিচ / Chilli": { id: "chili" },
  "শিমলা মরিচ / Capsicum": { id: "capsicum_bell" },
  "বাটি মরিচ / Bell Pepper": { id: "capsicum_bell" },
  "গোলমরিচ / Black Pepper": { id: "black_pepper" },
  "টমাটো / Tomato": { id: "tomato" },
};

// Registry-alias lookup for base English names (avoids mis-derivation for
// registry crops whose selector name differs, e.g. "Chilli" -> chili).
const BASE_NAME_OVERRIDES = { chilli: "chili", capsicum: "capsicum_bell", "bell pepper": "capsicum_bell" };

function baseOf(en) {
  const m = en.match(/^(.*?)\s+-\s+\S+$/);
  return m ? m[1] : en;
}

function snake(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/__+/g, "_");
}

function flattenDisplays() {
  return Object.values(CROP_REGISTRY).flat();
}

function deriveDisplay(display) {
  const slash = display.indexOf(" / ");
  const enPart = slash >= 0 ? display.slice(slash + 3) : display;
  const base = baseOf(enPart);
  const normBase = normalizeCropAlias(base);
  const id = BASE_NAME_OVERRIDES[normBase] || snake(base);
  const variant = enPart !== base ? snake(enPart.slice(base.length + 3)) : undefined;
  return variant ? { id, variant } : { id };
}

// Derived export: display string -> { id, season?, variant? }.
export const DISPLAY_CROP_MAP = Object.fromEntries(
  flattenDisplays().map((display) => [
    display,
    OVERRIDES[display] ? { ...OVERRIDES[display] } : deriveDisplay(display),
  ]),
);

// Derived export: stable phase-1 local IDs for selector crops that are NOT in
// the draft registry (labels = the selector's own Bangla/English display pair).
// Publication in the shared registry requires separate review — flagged in the
// Phase 1 PR.
export const DERIVED_CROPS = Object.fromEntries(
  Object.entries(DISPLAY_CROP_MAP)
    .map(([display, meta]) => {
      if (CANONICAL_CROPS[meta.id]) return null; // registry-backed crop, skip
      const slash = display.indexOf(" / ");
      const labelEn = slash >= 0 ? display.slice(slash + 3) : display;
      const labelBn = slash >= 0 ? display.slice(0, slash) : null;
      return [meta.id, { labelEn, labelBn, registry: false }];
    })
    .filter(Boolean)
    // keep the FIRST display string that maps to each derived id (stable order)
    .filter(([id], i, all) => all.findIndex(([other]) => other === id) === i),
);

// ── Indexes ─────────────────────────────────────────────────────────────────
function buildIndex() {
  const byAlias = new Map(); // normalized alias -> cropId
  const byId = new Map(); // cropId -> cropId (identity lookup)
  for (const [id, meta] of Object.entries(CANONICAL_CROPS)) {
    byId.set(id, id);
    for (const a of meta.aliases) {
      const key = normalizeCropAlias(a);
      if (!byAlias.has(key)) byAlias.set(key, id);
    }
  }
  const byDisplay = new Map(); // normalized full display string -> {id,...}
  const bySegment = new Map(); // normalized display segment -> {id,...} (first wins)
  const seasonRe = /(?:^|[\s-])(boro|aman|aus)(?:$|[\s-])/;
  const seasonBn = { বোরো: "boro", আমন: "aman", আউশ: "aus" };
  for (const [display, meta] of Object.entries(DISPLAY_CROP_MAP)) {
    const rec = { ...meta };
    const norm = normalizeCropAlias(display);
    const normNoSlash = normalizeCropAlias(display.replace(/\//g, " "));
    if (!byDisplay.has(normNoSlash)) byDisplay.set(normNoSlash, rec);
    byDisplay.set(norm, rec);
    const slash = display.indexOf(" / ");
    const segments = slash >= 0 ? [display.slice(0, slash), display.slice(slash + 3)] : [display];
    for (const seg of segments) {
      const key = normalizeCropAlias(seg.replace(/\//g, " "));
      const segRec = { ...rec };
      // Season detection on the segment itself ("rice - boro", "ধান (বোরো)").
      const mEn = seg.toLowerCase().match(seasonRe);
      if (mEn) segRec.season = mEn[1];
      for (const [bn, s] of Object.entries(seasonBn)) {
        if (seg.includes(bn)) segRec.season = s;
      }
      if (!bySegment.has(key)) bySegment.set(key, segRec);
    }
  }
  return { byAlias, byId, byDisplay, bySegment };
}

const INDEX = buildIndex();

/**
 * Resolve any crop reference (canonical ID, registry alias, or CABI display
 * string, English or Bangla) to its canonical identity.
 *
 * @returns {{ok: true, cropId: string, season?: string, variant?: string,
 *   labelEn: string, labelBn: string|null, modelCoverageRef: string|null,
 *   registry: boolean, matchedBy: string}
 *   | {ok: false, reason: "empty"|"unknown"|"ambiguous", candidates?: string[]}}
 */
export function resolveCanonicalCrop(input) {
  if (input == null) return { ok: false, reason: "empty" };
  const raw = String(input);
  if (!raw.trim()) return { ok: false, reason: "empty" };
  const norm = normalizeCropAlias(raw);
  const normSpaced = normalizeCropAlias(raw.replace(/\//g, " "));

  const finish = (cropId, extra, matchedBy) => {
    const meta = CANONICAL_CROPS[cropId] || DERIVED_CROPS[cropId];
    if (!meta) return { ok: false, reason: "unknown" };
    return {
      ok: true,
      cropId,
      labelEn: meta.labelEn,
      labelBn: meta.labelBn ?? null,
      modelCoverageRef: meta.modelCoverageRef || null,
      registry: !!meta.registry,
      matchedBy,
      ...extra,
    };
  };

  // 0) deliberately ambiguous bare token
  if (AMBIGUOUS_CROP_TOKENS.includes(norm)) {
    return { ok: false, reason: "ambiguous", candidates: [...PEPPER_IDENTITY_IDS] };
  }

  // 1) canonical ID itself
  if (INDEX.byId.has(normSpaced) || INDEX.byId.has(norm)) {
    const id = INDEX.byId.has(normSpaced) ? normSpaced : norm;
    return finish(id, {}, "id");
  }

  // 2) full display string ("মরিচ / Chilli", "ধান (বোরো) / Rice - Boro")
  const disp = INDEX.byDisplay.get(norm) || INDEX.byDisplay.get(normSpaced);
  if (disp) return finish(disp.id, { season: disp.season, variant: disp.variant }, "display");

  // 3) registry alias ("bell pepper", "মিষ্টি মরিচ", "hot pepper")
  const aliasId = INDEX.byAlias.get(norm) || INDEX.byAlias.get(normSpaced);
  if (aliasId) return finish(aliasId, {}, "alias");

  // 4) single segment of a mixed string; all segments must agree.
  const parts = norm
    .split("/")
    .map((p) => normalizeCropAlias(p))
    .filter(Boolean);
  if (parts.length > 1) {
    const resolved = new Map();
    for (const p of parts) {
      const seg = INDEX.bySegment.get(p) || INDEX.bySegment.get(p.replace(/\s+/g, " "));
      if (seg) resolved.set(seg.id, seg);
      else if (INDEX.byAlias.has(p)) resolved.set(INDEX.byAlias.get(p), { id: INDEX.byAlias.get(p) });
    }
    if (resolved.size === 1) {
      const [id, seg] = [...resolved.entries()][0];
      return finish(id, { season: seg.season, variant: seg.variant }, "segment");
    }
    if (resolved.size > 1) return { ok: false, reason: "ambiguous", candidates: [...resolved.keys()] };
  } else {
    const seg = INDEX.bySegment.get(norm);
    if (seg) return finish(seg.id, { season: seg.season, variant: seg.variant }, "segment");
  }

  return { ok: false, reason: "unknown" };
}

/** Convenience: canonical ID string or null. Never throws, never guesses. */
export function resolveCropId(input) {
  const r = resolveCanonicalCrop(input);
  return r.ok ? r.cropId : null;
}

/** All canonical IDs known to this layer (registry-backed + derived). */
export function listCanonicalCropIds() {
  return [...Object.keys(CANONICAL_CROPS), ...Object.keys(DERIVED_CROPS)];
}
