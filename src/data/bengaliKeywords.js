// Bengali-to-English Keyword Mapping for CABI Plant Detective
// Maps Bengali symptom chip values from the UI to English keywords
// used by the offline diagnostic engine's exclusion gates.

export const BENGALI_KEYWORD_MAP = {
  //  Leaf symptoms 
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

  //  Stem symptoms 
  "কান্ডের গোড়া পচে কালো বা বাদামি": "stem rot canker base rot dark discoloration",
  "কান্ড টানলে সহজে উঠে আসে, ভেতর ফাঁকা": "stem borer holes hollow stem insect borer",
  "শিকড় কালো ও পচা": "root rot black roots wilting",
  "কাণ্ড পচে": "stem rot canker",
  "কাণ্ডে ছিদ্র": "stem borer holes insect",
  "কাণ্ড ভেঙে": "stem breaking lodging",

  //  Fruit / grain symptoms 
  "ফুল অকালে ঝরে পড়ছে": "flower drop premature abortion",
  "ফল পচে যাচ্ছে, কালো বা বাদামি দাগ": "fruit rot black brown spots fruit",
  "ধানের শীষ চিটা, দানা পূর্ণ হচ্ছে না": "ear head drying chaffy grains white head stem borer",
  "ধানের শীষ সম্পূর্ণ সাদা হয়ে গেছে": "white head ear head drying dead panicle",
  "ফল পচে": "fruit rot",
  "ফলে দাগ": "fruit spots",
  "শীষ শুকিয়ে": "ear head drying",

  //  Whole plant symptoms 
  "গাছ দিনে নেতিয়ে পড়ে, রাতে সতেজ হয়": "wilting bacterial wilt temporary recovery",
  "গাছ হঠাৎ শুকিয়ে মারা যাচ্ছে": "plant death dieback sudden wilt",
  "গাছ শুকিয়ে": "wilting drying",
  "গাছ মরে": "plant death dieback",
  "আগায় শুকিয়ে": "tip burn dieback",

  //  Pest signs 
  "গাছে পোকা দেখা যাচ্ছে": "insect visible pest insects",
  "পাতায় ছিদ্র বা চিবানোর দাগ": "chewing marks holes leaf damage insect",
  "গাছে পিঁপড়া বা আঠালো মধুরস": "sticky honeydew ants aphid whitefly",
  মাকড়: "web spider mite webbing",
  গাঁদ: "gall swelling insect",
  আঠালো: "sticky honeydew",
  "সাদা মাছি": "whitefly insect",
  "মাটির পোকা": "soil insect grub root feeding",

  //  Environment / abiotic 
  "বন্যার ক্ষতি": "flood water damage waterlogging",
  খরা: "drought stress",
  ঠান্ডা: "cold injury frost",

  //  Short labels from SYMPTOM_CHIPS (label field) 
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

  //  Additional common Bengali agricultural terms 
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
 * term so that symptom texts written with different vocabulary still match.
 *
 * Matching is strictly WORD-BOUNDARY based (see normalizeSymptomText): a key
 * only fires when its tokens line up with whole tokens of the input. That is
 * what prevents the substring bugs this layer replaced ("holes" inside
 * "holostem", "powder" inside "powdery", "curl" inside "curly"). Each value is
 * an equivalence class  never a superstring of another key  so no cascade or
 * double-expansion can occur.
 *
 * Multi-word keys are applied before single-word keys, so the most specific
 * phrase wins ("yellowing of leaves" beats bare "yellowing").
 */
export const SYMPTOM_SYNONYMS = {
  //  Chlorosis / yellowing 
  "yellowing of leaves": "yellow leaves",
  "leaves turning yellow": "yellow leaves",
  "leaves are turning yellow": "yellow leaves",
  "leaf yellowing": "yellow leaves",
  "yellowing leaves": "yellow leaves",
  yellowing: "yellow leaves",
  chlorotic: "chlorosis",
  chlorosis: "chlorosis",
  "pale green": "chlorosis",

  //  Spots / lesions 
  lesions: "spots",
  lesion: "spots",
  specks: "spots",
  flecks: "spots",
  "dead spots": "necrotic spots",

  //  Necrosis / burning 
  blight: "necrosis",
  scorch: "necrosis",
  scorched: "necrosis",
  burnt: "necrosis",
  burned: "necrosis",
  necrotic: "necrosis",
  "dried up": "necrosis",
  drying: "necrosis",
  dieback: "dieback",

  //  Wilting 
  wilting: "wilt",
  drooping: "wilt",
  "droops down": "wilt",

  //  Rot 
  rotting: "rot",
  rots: "rot",
  decayed: "rot",
  decaying: "rot",
  putrefaction: "rot",

  //  Distortion 
  curling: "curl",
  curled: "curl",
  crinkling: "crinkle",
  crinkled: "crinkle",
  distortion: "deformity",
  deformed: "deformity",

  //  Growth 
  stunting: "stunted",
  dwarfing: "stunted",
  dwarf: "stunted",
  "stunted growth": "stunted",

  //  Insect damage / signs 
  holes: "chewing marks",
  perforations: "chewing marks",
  chewed: "chewing marks",
  chewing: "chewing marks",
  skeletonized: "chewing marks",
  mined: "mines",
  mining: "mines",
  webbing: "web",
  webs: "web",
  honeydew: "sticky",
  frass: "excrement",
  castskins: "cast skins",
  stippling: "speckling",

  //  Fungal signs 
  mould: "mold",
  mouldy: "mold",
  mildew: "fungus",
  powdery: "fungus",
  powder: "fungus",
  rust: "fungus",
  smut: "fungus",
  sclerotia: "sclerotia",

  //  Pest names (plural  canonical singular) 
  aphids: "aphid",
  whiteflies: "whitefly",
  mealybugs: "mealybug",
  thrips: "thrips",
  mites: "mite",
  grubs: "grub",
  beetles: "beetle",
  caterpillars: "caterpillar",
  borers: "borer",
  hoppers: "hopper",
  worms: "worm",
  nematodes: "nematode",
};

// Pre-sorted key list: longest (most specific) phrase first.
const SORTED_SYNONYM_KEYS = Object.keys(SYMPTOM_SYNONYMS).sort(
  (a, b) => b.split(" ").length - a.split(" ").length || b.length - a.length,
);

/**
 * Normalizes free text for reliable, language-agnostic comparison:
 * lowercases, converts hyphens to spaces, strips punctuation/digits, collapses
 * whitespace, then applies word-boundary-safe canonical synonym resolution.
 *
 * Bengali text passes through unchanged except for whitespace/punctuation
 * normalization (BengaliEnglish mapping happens in translateBengaliToEnglish
 * before normalization).
 * @param {string} text
 * @returns {string} normalized text
 */
export function normalizeSymptomText(text) {
  if (!text) return "";

  let out = String(text)
    .toLowerCase()
    .replace(/[-_/\\]/g, " ")
    .replace(/[.,;:!?"'()\[\]{}]/g, " ")
    .replace(/[৳৲]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Word-boundary synonym resolution: tokenize once, expand each token group
  // against the sorted phrase table, and emit canonical forms. Because every
  // synonym value is a fixed equivalence class (never a key of another rule),
  // a single left-to-right pass is sufficient and cannot cascade.
  const tokens = out.split(" ");
  const outTokens = [];
  for (let i = 0; i < tokens.length; ) {
    let matched = false;
    for (const key of SORTED_SYNONYM_KEYS) {
      const keyTokens = key.split(" ");
      const len = keyTokens.length;
      if (len > tokens.length - i) continue;
      let hit = true;
      for (let j = 0; j < len; j++) {
        if (tokens[i + j] !== keyTokens[j]) {
          hit = false;
          break;
        }
      }
      if (hit) {
        outTokens.push(...SYMPTOM_SYNONYMS[key].split(" "));
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      outTokens.push(tokens[i]);
      i += 1;
    }
  }

  return outTokens.join(" ").replace(/\s+/g, " ").trim();
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
 * True if the text contains Bengali (Bangla) script characters.
 * @param {string} text
 * @returns {boolean}
 */
export function hasBengaliScript(text) {
  return /[\u0980-\u09FF]/.test(String(text || ""));
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
      if (pos === -1) continue;
      if (bestKey === null || pos < bestPos || (pos === bestPos && key.length > bestKey.length)) {
        bestKey = key;
        bestPos = pos;
      }
    }
    if (!bestKey) break;
    const value = BENGALI_KEYWORD_MAP[bestKey];
    if (!found.includes(value)) found.push(value);
    remaining = remaining.slice(bestPos + bestKey.length);
  }

  if (found.length > 0) return found.join(" ");

  // No mapped phrase found. If the text still carries Bengali script it is an
  // unmapped farmer phrase — return "" rather than leaking raw Bengali tokens
  // into an English-keyword pipeline (which would silently produce zero
  // matches downstream). Purely English input passes through untouched.
  if (hasBengaliScript(bengaliText)) return "";
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
