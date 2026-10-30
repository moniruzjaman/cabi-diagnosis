// Bengali-to-English Keyword Mapping for CABI Plant Detective
// Maps Bengali symptom chip values from the UI to English keywords
// used by the offline diagnostic engine's exclusion gates.

export const BENGALI_KEYWORD_MAP = {
  // ─── Leaf symptoms ─────────────────────────────────────────────────────
  "পাতা হলুদ হয়ে যাচ্ছে": "yellow leaves chlorosis yellowing",
  "পাতায় বাদামি গোলাকার দাগ": "brown spots lesions circular leaf spots",
  "পাতায় ধূসর মাকু আকৃতির দাগ (ব্লাস্ট)": "gray spindle diamond shaped lesions blast fungal",
  "পাতার কিনারা পুড়ে যাওয়ার মতো বাদামি": "leaf margin burn brown edges necrosis",
  "পাতা কুঁকড়িয়ে ও বাঁকিয়ে যাচ্ছে": "leaf curling curl distortion crinkling",
  "পাতা লম্বালম্বিভাবে মোড়ানো (পাতামোড়া পোকা)": "rolled leaves leaf roller insect chewing",
  "পাতার নিচে সূক্ষ্ম জাল (মাইট)": "webbing spider mite stippling fine web",
  "পাতায় দাগ": "leaf spots lesions",
  "পাতা ঝরে": "leaf drop defoliation",
  "পাতা শুকিয়ে": "leaf drying wilting",
  "পাতায় ছিদ্র": "leaf holes shot hole chewing marks",
  "পাতায় সাদা গুঁড়া": "white powder mildew powdery coating",
  "পাতায় তেলতেলে": "water soaked oily water-soaked margins",
  "পাতা পোড়া": "leaf scorch burn necrosis",

  // ─── Stem symptoms ─────────────────────────────────────────────────────
  "কান্ডের গোড়া পচে কালো বা বাদামি": "stem rot canker base rot dark discoloration",
  "কান্ড টানলে সহজে উঠে আসে, ভেতর ফাঁকা": "stem borer holes hollow stem insect borer",
  "শিকড় কালো ও পচা": "root rot black roots wilting",
  "কাণ্ড পচে": "stem rot canker",
  "কাণ্ডে ছিদ্র": "stem borer holes insect",
  "কাণ্ড ভেঙে": "stem breaking lodging",

  // ─── Fruit / grain symptoms ────────────────────────────────────────────
  "ফুল অকালে ঝরে পড়ছে": "flower drop premature abortion",
  "ফল পচে যাচ্ছে, কালো বা বাদামি দাগ": "fruit rot black brown spots fruit",
  "ধানের শীষ চিটা, দানা পূর্ণ হচ্ছে না": "ear head drying chaffy grains white head stem borer",
  "ধানের শীষ সম্পূর্ণ সাদা হয়ে গেছে": "white head ear head drying dead panicle",
  "ফল পচে": "fruit rot",
  "ফলে দাগ": "fruit spots",
  "শীষ শুকিয়ে": "ear head drying",

  // ─── Whole plant symptoms ──────────────────────────────────────────────
  "গাছ দিনে নেতিয়ে পড়ে, রাতে সতেজ হয়": "wilting bacterial wilt temporary recovery",
  "গাছ হঠাৎ শুকিয়ে মারা যাচ্ছে": "plant death dieback sudden wilt",
  "গাছ শুকিয়ে": "wilting drying",
  "গাছ মরে": "plant death dieback",
  "আগায় শুকিয়ে": "tip burn dieback",

  // ─── Pest signs ────────────────────────────────────────────────────────
  "গাছে পোকা দেখা যাচ্ছে": "insect visible pest insects",
  "পাতায় ছিদ্র বা চিবানোর দাগ": "chewing marks holes leaf damage insect",
  "গাছে পিঁপড়া বা আঠালো মধুরস": "sticky honeydew ants aphid whitefly",
  মাকড়: "web spider mite webbing",
  গাঁদ: "gall swelling insect",
  আঠালো: "sticky honeydew",
  "সাদা মাছি": "whitefly insect",
  "মাটির পোকা": "soil insect grub root feeding",

  // ─── Environment / abiotic ─────────────────────────────────────────────
  "বন্যার ক্ষতি": "flood water damage waterlogging",
  খরা: "drought stress",
  ঠান্ডা: "cold injury frost",

  // ─── Short labels from SYMPTOM_CHIPS (label field) ────────────────────
  "পাতা হলুদ": "yellow leaves chlorosis",
  "বাদামি দাগ": "brown spots lesions",
  "ধূসর দাগ (ব্লাস্ট)": "blast gray diamond lesions fungal",
  "পাতা কুঁকড়ানো": "leaf curling curl",
  "পাতা মোড়ানো": "rolled leaves leaf roller insect",
  "পাতায় জাল": "web spider mite webbing",
  "কান্ড পচা": "stem rot canker",
  "কান্ড ফাঁপা": "stem borer hollow insect",
  "শিকড় পচা": "root rot",
  "ফুল ঝরা": "flower drop",
  "ফল পচা": "fruit rot",
  "শীষ চিটা": "ear head drying chaffy",
  "শীষ সাদা": "white head dead panicle",
  "পোকা দেখা": "insect visible pest",
  "পিঁপড়া/মধুরস": "sticky honeydew ants aphid",
  "গাছ নেতিয়ে": "wilting",
  "গাছ মরছে": "plant death dieback",
  "সাদা গুঁড়া": "white powder mildew powdery coating",

  // ─── Additional common Bengali agricultural terms ──────────────────────
  "পাতায় হীরার মত দাগ": "diamond shaped lesions blast fungal",
  "আগায় শুকিয়ে যাওয়া": "tip burn dieback",
  "শীষ শুকিয়ে যাওয়া": "ear head drying",
  "পাতার কিনারা হলুদ-বাদামি": "water soaked margins leaf edge yellow brown bacterial",
  "পাতায় মোজেইক": "mosaic virus chlorotic patterns",
  "গাছ বামন": "stunting virus dwarf",
  "ফল বিকৃত": "fruit distortion virus",
  ছত্রাক: "fungal fungi fruiting bodies",
  ব্যাকটেরিয়া: "bacteria bacterial ooze",
  ভাইরাস: "virus mosaic distortion",
  পোকা: "insect pest",
  রসুন: "garlic",
  পেঁয়াজ: "onion",
  মরিচ: "chilli",
};

/**
 * Canonical synonym dictionary (Crop-Doctor doctoral advice layer).
 * Maps English keyword variants and common farmer spellings to one canonical
 * token so that symptom texts written with different vocabulary still match.
 * Keys are matched as whole words on normalized (lowercase, punctuation-free)
 * text; longest keys are applied first so multi-word phrases win over singles.
 */
export const SYMPTOM_SYNONYMS = {
  "yellowing of leaves": "yellow leaves",
  "leaves turning yellow": "yellow leaves",
  "leaf yellowing": "yellow leaves",
  chlorotic: "chlorosis",
  chlorosis: "chlorosis",
  "yellow spots": "yellow spots",
  lesion: "lesions",
  spots: "spots",
  specks: "spots",
  blight: "blight necrosis",
  scorch: "burn necrosis",
  burnt: "burn",
  burned: "burn",
  wilting: "wilt",
  drooping: "wilt",
  "droops down": "wilt",
  rotting: "rot",
  rots: "rot",
  decaying: "rot",
  curling: "curl",
  curled: "curl",
  crinkling: "crinkle distortion",
  distortion: "deformity",
  deformed: "deformity",
  stunting: "stunted",
  dwarf: "stunted",
  dwarfing: "stunted",
  holes: "shot hole",
  chewing: "chewed",
  webbing: "web",
  honeydew: "sticky",
  mould: "mold fungus",
  mildew: "fungus powdery",
  powder: "powdery",
  grubs: "grub insect",
  caterpillars: "caterpillar insect",
  borers: "borer insect",
  aphids: "aphid insect",
};

const SORTED_SYNONYM_KEYS = Object.keys(SYMPTOM_SYNONYMS).sort((a, b) => b.length - a.length);

/**
 * Normalizes free text for reliable, language-agnostic comparison:
 * lowercases, strips punctuation/digits, collapses whitespace, and applies
 * canonical synonym resolution. Bengali text passes through unchanged except
 * for whitespace/punctuation normalization (Bengali mapping happens in
 * translateBengaliToEnglish before normalization).
 * @param {string} text
 * @returns {string} normalized text
 */
export function normalizeSymptomText(text) {
  if (!text) return "";
  let out = String(text)
    .toLowerCase()
    .replace(/[.,;:!?"'()\[\]{}]/g, " ")
    .replace(/[৳৲।–—]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Apply synonym resolution (longest phrase first)
  for (const key of SORTED_SYNONYMS_KEYS()) {
    if (out.includes(key)) {
      out = out.split(key).join(" " + SYMPTOM_SYNONYMS[key] + " ");
      out = out.replace(/\s+/g, " ").trim();
    }
  }
  return out;
}

function SORTED_SYNONYMS_KEYS() {
  return SORTED_SYNONYM_KEYS;
}

/**
 * Tokenizes normalized text into significant tokens (2+ chars).
 * @param {string} text
 * @returns {string[]}
 */
export function tokenizeSymptomText(text) {
  return normalizeSymptomText(text)
    .split(" ")
    .filter((t) => t.length >= 2);
}

/**
 * Translate Bengali symptom text to English keywords.
 * Crop-Doctor improvement: instead of returning only the FIRST matching key
 * (which discarded all other symptoms present in the same string), this now
 * collects ALL non-overlapping matches (longest key wins at each position)
 * and joins them into a combined English keyword string. Text already in
 * English passes through untouched.
 * @param {string} bengaliText - Symptom text in Bengali (or English)
 * @returns {string} - English keywords or the original text if no match
 */
export function translateBengaliToEnglish(bengaliText) {
  if (!bengaliText) return "";

  const sortedKeys = Object.keys(BENGALI_KEYWORD_MAP).sort((a, b) => b.length - a.length);

  // Collect every distinct mapped phrase found in the input, consuming
  // matched spans left-to-right so overlapping keys don't double-count.
  const found = [];
  let remaining = String(bengaliText);
  let guard = 0;
  while (remaining && guard < 32) {
    guard++;
    let bestKey = null;
    let bestPos = -1;
    for (const key of sortedKeys) {
      const pos = remaining.indexOf(key);
      if (pos !== -1 && (bestKey === null || pos < bestPos || (pos === bestPos && key.length > bestKey.length))) {
        bestKey = key;
        bestPos = pos;
      }
      if (bestPos === 0 && key.length >= bestKey.length) {
        // earliest possible match; keep scanning only for longer key at same pos
        if (key.length > bestKey.length) bestKey = key;
      }
    }
    if (!bestKey) break;
    const value = BENGALI_KEYWORD_MAP[bestKey];
    if (!found.includes(value)) found.push(value);
    remaining = remaining.slice(bestPos + bestKey.length);
  }

  if (found.length > 0) return found.join(" ");

  // No match found — return original text (may already be English)
  return bengaliText;
}

/**
 * Translate an array of Bengali symptom values into a single English keyword string.
 * @param {string[]} bengaliSymptoms - Array of Bengali symptom strings
 * @returns {string} - Space-separated English keywords
 */
export function translateSymptomsToEnglish(bengaliSymptoms) {
  if (!Array.isArray(bengaliSymptoms)) return "";
  const translated = bengaliSymptoms.map((s) => translateBengaliToEnglish(s)).filter(Boolean);
  return translated.join(" ");
}
