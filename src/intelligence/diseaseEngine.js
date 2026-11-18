// ============================================================
// Plant Detective — Crop Health Intelligence
// Disease Engine — forecasts crop disease risk from weather,
// crop growth stage, and known pathogen profiles.
//
// Adapted from KWI (MIT) engines/disease-engine.ts with mandatory fixes:
//  1. FIXED inverted confidence formula (KWI line 468):
//       confidence = clamp(60 + Math.abs(humidity - 75) * 0.4, 60, 92)
//     This was backwards — confidence ROSE as humidity moved AWAY from
//     disease-favorable conditions. Replaced with a scheme that is HIGHER
//     when more favorability factors are satisfied and HONESTLY capped at
//     a modest ceiling (the model is a heuristic, not calibrated).
//  2. Replaced stringly-typed thresholds (parsed by brittle regex at
//     runtime — the '70-85%' humidity band silently scored 0) with
//     structured condition objects: { operator, min, max, value }.
//  3. Expanded the disease DB from 6 to 14 major Bangladesh crop diseases.
//     Each carries a `sources` field (cited where known, "uncited" otherwise).
//  4. modelLimitations[] added to the DiseaseForecast output.
// ============================================================

import { getRiskLevel } from "./riskEngine.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// ────────────────────────────────────────────────────────────
// Bangladesh Crop Disease Database (expanded)
// Thresholds are structured objects. `sources` cites the origin or
// marks the threshold as "uncited" (an honest gap, not a fake citation).
// ────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────
// Phase 5 enrichment (optional fields, additive — original fields kept):
//   greenList    — Bangla names of curative treatments safe for this disease
//   yellowList   — treatments requiring caution (resistance/PHI/toxicity)
//   similarDiseases — disease ids with overlapping symptoms (differential dx)
//   causalType   — 'fungal'|'bacterial'|'viral'|'pest'|'abiotic'
//   districts    — Bangla district names where the disease is prevalent
//   seasonality  — Bangla months (বৈশাখ..চৈত্র) of peak risk
// modelLimitations: greenList/yellowList are general Bangladesh agronomic
//   guidance and do NOT replace the registered-product pesticide registry
//   (src/data/pesticideRegistry.js) or MoA stewardship (moaStewardship.js).
//   districts are broad prevalence zones (not exhaustive); seasonality
//   reflects typical peak-risk months, not a forecast. Unknown values are []
//   (never fabricated). Content authored from general BRRI/BARI knowledge.
/** @type {import('./types.js').DiseaseInfo[]} */
const DISEASES = [
  {
    id: "rice_blast",
    name: "Rice Blast",
    nameBn: "ধানের ব্লাস্ট",
    greenList: ["ট্রাইসাইক্লাজোল", "আইসোপ্রোথিয়োলেন"],
    yellowList: ["কার্বেন্ডাজিম"],
    similarDiseases: ["sheath_blight", "rice_brown_spot"],
    causalType: "fungal",
    districts: ["নাটোর", "বগুড়া", "রাজশাহী", "নওগাঁ"],
    seasonality: ["মাঘ", "ফাল্গুন", "চৈত্র"],
    cropIds: ["rice"],
    affectedStages: ["seedling", "vegetative", "tillering", "heading", "flowering"],
    favorabilityFactors: [
      { factor: "temperature", condition: { operator: "range", min: 25, max: 30 }, weight: 30, source: "uncited" },
      { factor: "humidity", condition: { operator: "gt", value: 89 }, weight: 25, source: "uncited" },
      { factor: "leafWetness", condition: { operator: "gt", value: 8 }, weight: 20, source: "uncited" },
      { factor: "precipitation", condition: { operator: "gt", value: 1 }, weight: 15, source: "uncited" },
      { factor: "cropStage", condition: { operator: "gt", value: 0 }, weight: 10, source: "uncited" },
    ],
    symptoms: [
      "Diamond-shaped lesions on leaves",
      "Wilting and drying of leaf tips",
      "Neck rot at panicle base",
      "Spindle-shaped spots with grey centers",
    ],
    symptomsBn: [
      "পাতায় হীরার আকৃতির দাগ",
      "পাতার ডগা শুকিয়ে যাওয়া",
      "শঙ্কুর গোড়ায় ঘাড় পচা",
      "ধূসর কেন্দ্রসহ কাঁচির মত দাগ",
    ],
    preventiveActions: [
      "Use resistant varieties (BRRI dhan47, dhan58)",
      "Avoid excess nitrogen application",
      "Maintain proper plant spacing",
      "Apply Tricyclazole at heading stage",
    ],
    preventiveActionsBn: [
      "রোগ প্রতিরোধী জাত ব্যবহার করুন (ব্রিধান ৪৭, ৫৮)",
      "অতিরিক্ত নাইট্রোজেন সার পরিহার করুন",
      "সঠিক দূরত্বে চারা রোপণ করুন",
      "শির বের হওয়ার সময় ট্রাইসাইক্লাজোল স্প্রে করুন",
    ],
    curativeActions: [
      "Spray Tricyclazole 75WP @ 0.6g/L",
      "Remove and destroy infected plant debris",
      "Apply Potassium silicate as foliar spray",
    ],
    curativeActionsBn: [
      "ট্রাইসাইক্লাজোল ৭৫WP @ ০.৬ গ্রাম/লিটার স্প্রে করুন",
      "আক্রান্ত উদ্ভিদ অপসারণ ও ধ্বংস করুন",
      "পটাশিয়াম সিলিকেট পাতায় স্প্রে করুন",
    ],
    economicThreshold: "5-10% leaf area affected or neck blast symptoms on 1% of panicles",
    sources: ["uncited"],
  },
  {
    id: "bacterial_leaf_blight",
    name: "Bacterial Leaf Blight",
    nameBn: "ব্যাকটেরিয়াল পাতা পোড়া",
    greenList: ["কপার অক্সিক্লোরাইড", "স্ট্রেপটোসাইক্লিন"],
    yellowList: ["কপার হাইড্রক্সাইড"],
    similarDiseases: ["rice_brown_spot", "rice_blast"],
    causalType: "bacterial",
    districts: ["কুড়িগ্রাম", "রংপুর", "নীলফামারী", "টাঙ্গাইল"],
    seasonality: ["আষাঢ়", "ভাদ্র", "আশ্বিন"],
    cropIds: ["rice"],
    affectedStages: ["vegetative", "tillering", "booting", "heading"],
    favorabilityFactors: [
      { factor: "temperature", condition: { operator: "range", min: 27, max: 33 }, weight: 30, source: "uncited" },
      { factor: "humidity", condition: { operator: "gt", value: 85 }, weight: 25, source: "uncited" },
      { factor: "leafWetness", condition: { operator: "gt", value: 10 }, weight: 20, source: "uncited" },
      { factor: "precipitation", condition: { operator: "gt", value: 5 }, weight: 15, source: "uncited" },
      { factor: "cropStage", condition: { operator: "gt", value: 0 }, weight: 10, source: "uncited" },
    ],
    symptoms: [
      "Water-soaked yellowish stripes along leaf margins",
      "Lesions turn white to yellow as they enlarge",
      "Leaves dry out and wilt from tips",
      "Milky bacterial ooze on leaves in morning",
    ],
    symptomsBn: [
      "পাতার কিনারা বরাবর পানি-ভেজা হলুদ ডোরা",
      "দাগ বড় হলে সাদা থেকে হলুদ হয়",
      "পাতার ডগা থেকে শুকিয়ে যায়",
      "সকালে পাতায় দুগ্ধজাত ব্যাকটেরিয়াল নির্যাস",
    ],
    preventiveActions: [
      "Use BLB-resistant varieties (BRRI dhan54, dhan63)",
      "Avoid clipping of seedling tips during transplanting",
      "Balanced fertilization — avoid excess N",
      "Drain fields during high humidity periods",
    ],
    preventiveActionsBn: [
      "ব্যাকটেরিয়াল পাতা পোড়া প্রতিরোধী জাত ব্যবহার করুন",
      "রোপণের সময় চারার ডগা না কাটা",
      "সুষম সার প্রয়োগ — অতিরিক্ত নাইট্রোজেন এড়িয়ে চলুন",
      "উচ্চ আর্দ্রতার সময় ক্ষেত শুকান",
    ],
    curativeActions: [
      "Spray Streptocycline + Copper oxychloride",
      "Remove affected leaves to reduce inoculum",
      "Apply bactericidal spray at 10-day intervals",
    ],
    curativeActionsBn: [
      "স্ট্রেপ্টোসাইক্লিন + কপার অক্সিক্লোরাইড স্প্রে করুন",
      "জীবাণু কমাতে আক্রান্ত পাতা সরান",
      "১০ দিন অন্তর ব্যাকটেরিয়ানাশক স্প্রে করুন",
    ],
    economicThreshold: "10-15% leaf area with lesions during tillering stage",
    sources: ["uncited"],
  },
  {
    id: "sheath_blight",
    name: "Sheath Blight",
    nameBn: "পাতার আবরণ পোড়া",
    greenList: ["হেক্সাকোনাজোল", "ভ্যালিডামাইসিন"],
    yellowList: ["কার্বেন্ডাজিম"],
    similarDiseases: ["rice_blast", "rice_brown_spot"],
    causalType: "fungal",
    districts: ["দিনাজপুর", "বগুড়া", "যশোর", "কুমিল্লা"],
    seasonality: ["ভাদ্র", "আশ্বিন", "কার্তিক"],
    cropIds: ["rice"],
    affectedStages: ["tillering", "stem_elongation", "booting", "heading"],
    favorabilityFactors: [
      { factor: "temperature", condition: { operator: "range", min: 28, max: 32 }, weight: 25, source: "uncited" },
      { factor: "humidity", condition: { operator: "gt", value: 90 }, weight: 25, source: "uncited" },
      { factor: "leafWetness", condition: { operator: "gt", value: 12 }, weight: 20, source: "uncited" },
      { factor: "precipitation", condition: { operator: "gt", value: 2 }, weight: 20, source: "uncited" },
      { factor: "cropStage", condition: { operator: "gt", value: 0 }, weight: 10, source: "uncited" },
    ],
    symptoms: [
      "Oval greenish-grey lesions on leaf sheaths",
      "Lesions enlarge and coalesce, girdling the stem",
      "White mycelial mat at water level",
      "Infected tillers produce unfilled grains",
    ],
    symptomsBn: [
      "পাতার আবরণে ডিম্বাকৃতি সবুজ-ধূসর দাগ",
      "দাগ বড় হয়ে কাণ্ড পরিবেষ্টন করে",
      "পানির স্তরে সাদা ছত্রাকের আস্তরণ",
      "আক্রান্ত কুলায় অপূর্ণ দানা হয়",
    ],
    preventiveActions: [
      "Avoid dense planting and excess nitrogen",
      "Maintain proper water management — avoid continuous flooding",
      "Use resistant varieties when available",
      "Apply Tricyclazole or Propiconazole preventively",
    ],
    preventiveActionsBn: [
      "ঘন রোপণ ও অতিরিক্ত নাইট্রোজেন এড়িয়ে চলুন",
      "সঠিক পানি ব্যবস্থাপনা — অবিরাম প্লাবন এড়ান",
      "সম্ভব হলে প্রতিরোধী জাত ব্যবহার করুন",
      "প্রতিরোধমূলক ট্রাইসাইক্লাজোল বা প্রোপিকোনাজোল প্রয়োগ",
    ],
    curativeActions: [
      "Spray Propiconazole 25EC @ 1ml/L",
      "Remove infected lower leaves",
      "Improve field drainage immediately",
    ],
    curativeActionsBn: [
      "প্রোপিকোনাজোল ২৫ইসি @ ১ মিলি/লিটার স্প্রে করুন",
      "আক্রান্ত নিচের পাতা সরান",
      "অবিলম্বে ক্ষেতের নিকাশ ব্যবস্থা উন্নত করুন",
    ],
    economicThreshold: "Lesions reaching 2nd-3rd leaf from flag leaf at booting",
    sources: ["uncited"],
  },
  {
    id: "rice_brown_spot",
    name: "Brown Spot",
    nameBn: "বাদামি দাগ",
    greenList: ["ম্যানকোজেব", "প্রোপিকোনাজোল"],
    yellowList: ["কার্বেন্ডাজিম"],
    similarDiseases: ["rice_blast", "sheath_blight"],
    causalType: "fungal",
    districts: ["রাজশাহী", "নাটোর", "নওগাঁ", "চাঁপাইনবাবগঞ্জ"],
    seasonality: ["ভাদ্র", "আশ্বিন", "অগ্রহায়ণ"],
    cropIds: ["rice"],
    affectedStages: ["seedling", "vegetative", "tillering", "grain_filling"],
    favorabilityFactors: [
      { factor: "temperature", condition: { operator: "range", min: 25, max: 30 }, weight: 30, source: "uncited" },
      { factor: "humidity", condition: { operator: "gt", value: 80 }, weight: 25, source: "uncited" },
      { factor: "leafWetness", condition: { operator: "gt", value: 6 }, weight: 20, source: "uncited" },
      { factor: "precipitation", condition: { operator: "gt", value: 1 }, weight: 15, source: "uncited" },
      { factor: "cropStage", condition: { operator: "gt", value: 0 }, weight: 10, source: "uncited" },
    ],
    symptoms: [
      "Brown oval spots on leaves",
      "Spots with grey center and brown margin",
      "Reduced grain filling",
      "Seedling blight in severe cases",
    ],
    symptomsBn: [
      "পাতায় বাদামি ডিম্বাকৃতি দাগ",
      "ধূসর কেন্দ্র ও বাদামি প্রান্তসহ দাগ",
      "দানা ভরাট কমে যাওয়া",
      "তীব্র ক্ষেত্রে চারা পচা",
    ],
    preventiveActions: [
      "Use certified disease-free seed",
      "Balanced potassium fertilization",
      "Avoid continuous flooding",
      "Seed treatment with Carbendazim",
    ],
    preventiveActionsBn: [
      "সনদপ্রাপ্ত রোগমুক্ত বীজ ব্যবহার করুন",
      "সুষম পটাশ সার প্রয়োগ",
      "অবিরাম প্লাবন এড়ান",
      "কার্বেন্ডাজিম দিয়ে বীজ শোধন",
    ],
    curativeActions: ["Spray Mancozeb 75WP @ 2.5g/L", "Apply Propiconazole if severe", "Improve field nutrition"],
    curativeActionsBn: [
      "ম্যাংকোজেব ৭৫WP @ ২.৫ গ্রাম/লিটার স্প্রে করুন",
      "তীব্র হলে প্রোপিকোনাজোল প্রয়োগ",
      "ক্ষেতের পুষ্টি উন্নত করুন",
    ],
    economicThreshold: "5% leaf area affected at tillering",
    sources: ["uncited"],
  },
  {
    id: "wheat_rust",
    name: "Wheat Rust",
    nameBn: "গমের মরিচা",
    greenList: ["প্রোপিকোনাজোল", "টেবুকোনাজোল"],
    yellowList: ["ট্রায়াডিমেফন"],
    similarDiseases: ["powdery_mildew"],
    causalType: "fungal",
    districts: ["দিনাজপুর", "রংপুর", "বগুড়া", "রাজশাহী"],
    seasonality: ["মাঘ", "ফাল্গুন", "চৈত্র"],
    cropIds: ["wheat"],
    affectedStages: ["vegetative", "stem_elongation", "heading", "flowering", "grain_filling"],
    favorabilityFactors: [
      { factor: "temperature", condition: { operator: "range", min: 15, max: 25 }, weight: 30, source: "uncited" },
      { factor: "humidity", condition: { operator: "gt", value: 80 }, weight: 25, source: "uncited" },
      { factor: "leafWetness", condition: { operator: "gt", value: 6 }, weight: 20, source: "uncited" },
      { factor: "precipitation", condition: { operator: "gt", value: 1 }, weight: 15, source: "uncited" },
      { factor: "cropStage", condition: { operator: "gt", value: 0 }, weight: 10, source: "uncited" },
    ],
    symptoms: [
      "Orange-brown pustules on leaves and stems",
      "Yellow stripe patterns on leaf blades",
      "Premature leaf drying",
      "Reduced grain filling and shriveled grains",
    ],
    symptomsBn: [
      "পাতা ও কাণ্ডে কমলা-বাদামি ফুসকুড়ি",
      "পাতায় হলুদ ডোরাকাটা নকশা",
      "অকালে পাতা শুকিয়ে যাওয়া",
      "দানা ভরাট কমে যাওয়া ও রুগ্ন দানা",
    ],
    preventiveActions: [
      "Grow rust-resistant varieties (BARI Gom 24, 27)",
      "Timely sowing within recommended window",
      "Balanced NPK fertilization",
      "Apply Propiconazole at first sign of infection",
    ],
    preventiveActionsBn: [
      "মরিচা প্রতিরোধী জাত চাষ করুন (বারি গম ২৪, ২৭)",
      "সুপারিশকৃত সময়ে সময়মতো বুনন",
      "সুষম এনপিকে সার প্রয়োগ",
      "সংক্রমণের প্রথম লক্ষণে প্রোপিকোনাজোল প্রয়োগ",
    ],
    curativeActions: [
      "Spray Mancozeb 75WP @ 2.5g/L or Propiconazole 25EC @ 1ml/L",
      "Remove heavily infected plants if localized",
      "Increase potassium application for plant vigor",
    ],
    curativeActionsBn: [
      "ম্যাংকোজেব ৭৫WP @ ২.৫ গ্রাম/লিটার অথবা প্রোপিকোনাজোল স্প্রে করুন",
      "স্থানীয়ভাবে ঘন সংক্রমিত গাছ সরান",
      "গাছের শক্তি বাড়াতে পটাশ প্রয়োগ বৃদ্ধি করুন",
    ],
    economicThreshold: "5% leaf area with pustules at flag leaf stage",
    sources: ["uncited"],
  },
  {
    id: "powdery_mildew",
    name: "Powdery Mildew",
    nameBn: "ধুলো ছাতা রোগ",
    greenList: ["সালফার (গন্ধক)", "ডাইনোক্যাপ"],
    yellowList: ["ট্রায়াডিমেফন", "মাইক্লোবিউটানিল"],
    similarDiseases: ["wheat_rust", "chili_anthracnose"],
    causalType: "fungal",
    districts: ["দিনাজপুর", "বগুড়া", "যশোর", "নওগাঁ"],
    seasonality: ["মাঘ", "ফাল্গুন", "চৈত্র"],
    cropIds: ["wheat", "chili", "brinjal"],
    affectedStages: ["vegetative", "stem_elongation", "heading", "grain_filling", "flowering"],
    favorabilityFactors: [
      { factor: "temperature", condition: { operator: "range", min: 15, max: 22 }, weight: 30, source: "uncited" },
      // Fixed: was '70-85%' as a free-text string that the regex parser
      // (>(\d+)) could not match — silently scored 0. Now a range band.
      { factor: "humidity", condition: { operator: "range", min: 70, max: 85 }, weight: 25, source: "uncited" },
      { factor: "leafWetness", condition: { operator: "range", min: 4, max: 8 }, weight: 20, source: "uncited" },
      { factor: "precipitation", condition: { operator: "lt", value: 1 }, weight: 15, source: "uncited" },
      { factor: "cropStage", condition: { operator: "gt", value: 0 }, weight: 10, source: "uncited" },
    ],
    symptoms: [
      "White powdery patches on upper leaf surface",
      "Patches enlarge and coalesce covering entire leaf",
      "Leaves turn yellow and die prematurely",
      "Black fruiting bodies appear on older lesions",
    ],
    symptomsBn: [
      "পাতার উপরিভাগে সাদা গুঁড়োর মত দাগ",
      "দাগ বড় হয়ে পুরো পাতা ঢেকে ফেলে",
      "পাতা হলুদ হয়ে অকালে মারা যায়",
      "পুরনো দাগে কালো ফলিঙ্গ বডি দেখা যায়",
    ],
    preventiveActions: [
      "Use tolerant varieties (BARI Gom 26, 28)",
      "Avoid excessive nitrogen — favors lush growth",
      "Maintain adequate plant spacing for air circulation",
      "Apply Sulphur dust or wettable Sulphur preventively",
    ],
    preventiveActionsBn: [
      "সহনশীল জাত ব্যবহার করুন (বারি গম ২৬, ২৮)",
      "অতিরিক্ত নাইট্রোজেন এড়িয়ে চলুন",
      "বায়ু চলাচলের জন্য পর্যাপ্ত দূরত্ব রাখুন",
      "প্রতিরোধমূলক সালফার ডাস্ট বা ভেজ্যাবল সালফার প্রয়োগ",
    ],
    curativeActions: [
      "Spray Propiconazole 25EC @ 1ml/L",
      "Apply Dinocap 48EC @ 1ml/L as contact fungicide",
      "Remove severely infected lower leaves",
    ],
    curativeActionsBn: [
      "প্রোপিকোনাজোল ২৫ইসি @ ১ মিলি/লিটার স্প্রে করুন",
      "ডাইনোক্যাপ ৪৮ইসি @ ১ মিলি/লিটার স্প্রে করুন",
      "তীব্রভাবে আক্রান্ত নিচের পাতা সরান",
    ],
    economicThreshold: "Powdery mildew covering 5% of flag leaf area",
    sources: ["uncited"],
  },
  {
    id: "jute_stem_rot",
    name: "Stem Rot",
    nameBn: "পাটের কাণ্ড পচা",
    greenList: ["কার্বেন্ডাজিম", "ম্যানকোজেব"],
    yellowList: ["কপার অক্সিক্লোরাইড"],
    similarDiseases: ["brinjal_phomopsis"],
    causalType: "fungal",
    districts: ["ফরিদপুর", "টাঙ্গাইল", "যশোর", "মানিকগঞ্জ"],
    seasonality: ["জ্যৈষ্ঠ", "আষাঢ়", "ভাদ্র"],
    cropIds: ["jute"],
    affectedStages: ["vegetative", "stem_elongation"],
    favorabilityFactors: [
      { factor: "temperature", condition: { operator: "range", min: 28, max: 35 }, weight: 30, source: "uncited" },
      { factor: "humidity", condition: { operator: "gt", value: 85 }, weight: 25, source: "uncited" },
      { factor: "leafWetness", condition: { operator: "gt", value: 10 }, weight: 20, source: "uncited" },
      { factor: "precipitation", condition: { operator: "gt", value: 10 }, weight: 15, source: "uncited" },
      { factor: "cropStage", condition: { operator: "gt", value: 0 }, weight: 10, source: "uncited" },
    ],
    symptoms: [
      "Brown to black lesions at base of stem",
      "Soft rotting of stem base with foul smell",
      "Yellowing and wilting of lower leaves",
      "Stem becomes weak and may lodge easily",
    ],
    symptomsBn: [
      "কাণ্ডের গোড়ায় বাদামি থেকে কালো দাগ",
      "কাণ্ডের গোড়া নরম পচা ও দুর্গন্ধ",
      "নিচের পাতা হলুদ হয়ে শুকিয়ে যায়",
      "কাণ্ড দুর্বল হয়ে সহজেই হেলে পড়ে",
    ],
    preventiveActions: [
      "Treat seeds with Trichoderma viride before sowing",
      "Avoid waterlogging — ensure proper drainage",
      "Crop rotation with non-host crops",
      "Remove and burn infected plant debris after harvest",
    ],
    preventiveActionsBn: [
      "বুননের আগে ট্রাইকোডার্মা ভিরিডি দিয়ে বীজ শোধন",
      "পানি জমে থাকা এড়ান — সঠিক নিকাশ নিশ্চিত করুন",
      "অ-আশ্রয়কারী ফসলের সাথে ফসল পরিবর্তন",
      "ফসল কাটার পর আক্রান্ত অবশিষ্ট পোড়ান",
    ],
    curativeActions: [
      "Drench with Carbendazim 50WP @ 2g/L at stem base",
      "Improve field drainage immediately",
      "Apply Trichoderma-based bio-fungicide to soil",
    ],
    curativeActionsBn: [
      "কার্বেন্ডাজিম ৫০WP @ ২ গ্রাম/লিটার কাণ্ডের গোড়ায় ঢেলে দিন",
      "অবিলম্বে ক্ষেতের নিকাশ ব্যবস্থা উন্নত করুন",
      "মাটিতে ট্রাইকোডার্মা-ভিত্তিক বায়ো-ফাঙ্গাসাইড প্রয়োগ",
    ],
    economicThreshold: "Stem rot lesions on >3% of plants at vegetative stage",
    sources: ["uncited"],
  },
  {
    id: "potato_late_blight",
    name: "Late Blight",
    nameBn: "আলুর লেট ব্লাইট",
    greenList: ["মেটাল্যাক্সিল+ম্যানকোজেব", "কপার হাইড্রক্সাইড"],
    yellowList: ["ডাইমেথোমর্ফ"],
    similarDiseases: ["tomato_early_blight"],
    causalType: "fungal",
    districts: ["মুন্সিগঞ্জ", "রংপুর", "বগুড়া", "নীলফামারী"],
    seasonality: ["অগ্রহায়ণ", "পৌষ", "মাঘ"],
    cropIds: ["potato"],
    affectedStages: ["vegetative", "stem_elongation", "flowering"],
    favorabilityFactors: [
      { factor: "temperature", condition: { operator: "range", min: 12, max: 22 }, weight: 30, source: "uncited" },
      { factor: "humidity", condition: { operator: "gt", value: 90 }, weight: 25, source: "uncited" },
      { factor: "leafWetness", condition: { operator: "gt", value: 10 }, weight: 20, source: "uncited" },
      { factor: "precipitation", condition: { operator: "gt", value: 5 }, weight: 15, source: "uncited" },
      { factor: "cropStage", condition: { operator: "gt", value: 0 }, weight: 10, source: "uncited" },
    ],
    symptoms: [
      "Water-soaked dark lesions on leaves",
      "White sporangia on undersides of leaves",
      "Rapid browning and collapse of foliage",
      "Tubers develop rusty brown dry rot",
    ],
    symptomsBn: [
      "পাতায় পানি-ভেজা কালো দাগ",
      "পাতার নিচে সাদা স্পোরাঞ্জিয়া",
      "দ্রুত পাতা বাদামি হয়ে নষ্ট",
      "কন্দে মরচে-বাদামি শুষ্ক পচা",
    ],
    preventiveActions: [
      "Use resistant varieties (BARI Alu 7, 13)",
      "Avoid overhead irrigation",
      "Ensure good drainage and spacing",
      "Apply Mancozeb preventively during cool wet weather",
    ],
    preventiveActionsBn: [
      "রোগ প্রতিরোধী জাত ব্যবহার করুন (বারি আলু ৭, ১৩)",
      "উপরিভাগ সেচ এড়ান",
      "ভালো নিকাশ ও দূরত্ব নিশ্চিত করুন",
      "শীতল ভেজা আবহাওয়ায় প্রতিরোধমূলক ম্যাংকোজেব প্রয়োগ",
    ],
    curativeActions: [
      "Spray Mancozeb 75WP @ 2.5g/L at 7-day intervals",
      "Remove and destroy infected plants",
      "Apply Metalaxyl + Mancozeb if outbreak confirmed",
    ],
    curativeActionsBn: [
      "৭ দিন অন্তর ম্যাংকোজেব ৭৫WP @ ২.৫ গ্রাম/লিটার স্প্রে করুন",
      "আক্রান্ত গাছ সরিয়ে ধ্বংস করুন",
      "প্রাদুর্ভাব নিশ্চিত হলে মেটাল্যাক্সিল + ম্যাংকোজেব প্রয়োগ",
    ],
    economicThreshold: "First sign of lesions — act immediately (destructive disease)",
    sources: ["uncited"],
  },
  {
    id: "tomato_early_blight",
    name: "Early Blight",
    nameBn: "টমেটোর আর্লি ব্লাইট",
    greenList: ["ম্যানকোজেব", "ক্লোরোথালোনিল", "আইপ্রোডিয়ন"],
    yellowList: ["কার্বেন্ডাজিম"],
    similarDiseases: ["potato_late_blight", "mustard_alternaria"],
    causalType: "fungal",
    districts: ["বগুড়া", "রংপুর", "যশোর", "কুমিল্লা"],
    seasonality: ["অগ্রহায়ণ", "পৌষ", "মাঘ", "ফাল্গুন"],
    cropIds: ["tomato"],
    affectedStages: ["vegetative", "stem_elongation", "flowering", "grain_filling"],
    favorabilityFactors: [
      { factor: "temperature", condition: { operator: "range", min: 24, max: 30 }, weight: 30, source: "uncited" },
      { factor: "humidity", condition: { operator: "gt", value: 85 }, weight: 25, source: "uncited" },
      { factor: "leafWetness", condition: { operator: "gt", value: 8 }, weight: 20, source: "uncited" },
      { factor: "precipitation", condition: { operator: "gt", value: 2 }, weight: 15, source: "uncited" },
      { factor: "cropStage", condition: { operator: "gt", value: 0 }, weight: 10, source: "uncited" },
    ],
    symptoms: [
      "Concentric ring spots on older leaves (target board)",
      "Yellow halos around lesions",
      "Defoliation from bottom up",
      "Dark sunken lesions on stems and fruits",
    ],
    symptomsBn: [
      "পুরনো পাতায় কেন্দ্রীয় রিং দাগ (টার্গেট বোর্ড)",
      "দাগের চারপাশে হলুদ বলয়",
      "নিচ থেকে পাতা ঝরে যাওয়া",
      "কাণ্ড ও ফলে কালো খাদ",
    ],
    preventiveActions: [
      "Use resistant varieties",
      "Crop rotation with non-solanaceous crops",
      "Stake plants to improve air circulation",
      "Avoid overhead irrigation",
    ],
    preventiveActionsBn: [
      "রোগ প্রতিরোধী জাত ব্যবহার করুন",
      "অ-সোলানেসিয়াস ফসলের সাথে ফসল পরিবর্তন",
      "বায়ু চলাচলের জন্য গাছ খুঁটি দিন",
      "উপরিভাগ সেচ এড়ান",
    ],
    curativeActions: ["Spray Mancozeb 75WP @ 2.5g/L", "Apply Azoxystrobin alternately", "Remove infected lower leaves"],
    curativeActionsBn: [
      "ম্যাংকোজেব ৭৫WP @ ২.৫ গ্রাম/লিটার স্প্রে করুন",
      "পর্যায়ক্রমে অ্যাজোক্সিস্ট্রোবিন প্রয়োগ",
      "আক্রান্ত নিচের পাতা সরান",
    ],
    economicThreshold: "5% foliage affected at early fruit set",
    sources: ["uncited"],
  },
  {
    id: "chili_anthracnose",
    name: "Anthracnose",
    nameBn: "মরিচের অ্যানথ্রাকনোজ",
    greenList: ["ম্যানকোজেব", "অ্যাজক্সিস্ট্রোবিন", "কার্বেন্ডাজিম"],
    yellowList: ["কপার অক্সিক্লোরাইড"],
    similarDiseases: ["powdery_mildew", "tomato_early_blight"],
    causalType: "fungal",
    districts: ["বগুড়া", "রংপুর", "নওগাঁ", "রাজশাহী"],
    seasonality: ["চৈত্র", "বৈশাখ", "জ্যৈষ্ঠ"],
    cropIds: ["chili"],
    affectedStages: ["flowering", "grain_filling"],
    favorabilityFactors: [
      { factor: "temperature", condition: { operator: "range", min: 25, max: 32 }, weight: 30, source: "uncited" },
      { factor: "humidity", condition: { operator: "gt", value: 90 }, weight: 25, source: "uncited" },
      { factor: "leafWetness", condition: { operator: "gt", value: 8 }, weight: 20, source: "uncited" },
      { factor: "precipitation", condition: { operator: "gt", value: 2 }, weight: 15, source: "uncited" },
      { factor: "cropStage", condition: { operator: "gt", value: 0 }, weight: 10, source: "uncited" },
    ],
    symptoms: [
      "Dark sunken lesions on ripe fruits",
      "Concentric rings of pinkish spore masses",
      "Fruit rot and shrivel",
      "Premature fruit drop",
    ],
    symptomsBn: [
      "পাকা ফলে কালো খাদ দাগ",
      "গোলাপি স্পোর গাদের কেন্দ্রীয় রিং",
      "ফল পচে শুকিয়ে যায়",
      "অকালে ফল ঝরে যাওয়া",
    ],
    preventiveActions: [
      "Use disease-free seed",
      "Remove infected fruits promptly",
      "Avoid overhead irrigation during fruiting",
      "Crop rotation with non-host crops",
    ],
    preventiveActionsBn: [
      "রোগমুক্ত বীজ ব্যবহার করুন",
      "আক্রান্ত ফল দ্রুত সরান",
      "ফল ধরার সময় উপরিভাগ সেচ এড়ান",
      "অ-আশ্রয়কারী ফসলের সাথে ফসল পরিবর্তন",
    ],
    curativeActions: [
      "Spray Mancozeb 75WP @ 2.5g/L",
      "Apply Azoxystrobin or Carbendazim alternately",
      "Remove and destroy infected fruits",
    ],
    curativeActionsBn: [
      "ম্যাংকোজেব ৭৫WP @ ২.৫ গ্রাম/লিটার স্প্রে করুন",
      "পর্যায়ক্রমে অ্যাজোক্সিস্ট্রোবিন বা কার্বেন্ডাজিম প্রয়োগ",
      "আক্রান্ত ফল সরিয়ে ধ্বংস করুন",
    ],
    economicThreshold: "2-3% of fruits affected",
    sources: ["uncited"],
  },
  {
    id: "mustard_alternaria",
    name: "Alternaria Blight",
    nameBn: "সরিষার অল্টারনারিয়া",
    greenList: ["ম্যানকোজেব", "ক্লোরোথালোনিল"],
    yellowList: ["কার্বেন্ডাজিম"],
    similarDiseases: ["tomato_early_blight", "onion_purple_blotch"],
    causalType: "fungal",
    districts: ["দিনাজপুর", "বগুড়া", "যশোর", "রাজশাহী"],
    seasonality: ["মাঘ", "ফাল্গুন", "চৈত্র"],
    cropIds: ["mustard"],
    affectedStages: ["stem_elongation", "flowering", "grain_filling"],
    favorabilityFactors: [
      { factor: "temperature", condition: { operator: "range", min: 18, max: 25 }, weight: 30, source: "uncited" },
      { factor: "humidity", condition: { operator: "gt", value: 85 }, weight: 25, source: "uncited" },
      { factor: "leafWetness", condition: { operator: "gt", value: 8 }, weight: 20, source: "uncited" },
      { factor: "precipitation", condition: { operator: "gt", value: 2 }, weight: 15, source: "uncited" },
      { factor: "cropStage", condition: { operator: "gt", value: 0 }, weight: 10, source: "uncited" },
    ],
    symptoms: [
      "Round dark brown spots with concentric rings on leaves",
      "Black spots on stems and pods",
      "Premature defoliation",
      "Shriveled seeds with low oil content",
    ],
    symptomsBn: [
      "পাতায় কেন্দ্রীয় রিংসহ গোল কালো দাগ",
      "কাণ্ড ও শুঁড়ে কালো দাগ",
      "অকালে পাতা ঝরে যাওয়া",
      "বীজ রুগ্ন ও তেল কম",
    ],
    preventiveActions: [
      "Use resistant varieties (BARI Sarisha 14, 16)",
      "Clean cultivation and remove debris",
      "Timely sowing to avoid cool humid period",
      "Seed treatment with Thiram",
    ],
    preventiveActionsBn: [
      "রোগ প্রতিরোধী জাত ব্যবহার করুন (বারি সরিষা ১৪, ১৬)",
      "পরিষ্কার চাষ ও অবশিষ্ট অপসারণ",
      "শীতল আর্দ্র সময় এড়াতে সময়মতো বুনন",
      "থিরাম দিয়ে বীজ শোধন",
    ],
    curativeActions: ["Spray Mancozeb 75WP @ 2.5g/L", "Apply Iprodione alternately", "Remove infected plants"],
    curativeActionsBn: [
      "ম্যাংকোজেব ৭৫WP @ ২.৫ গ্রাম/লিটার স্প্রে করুন",
      "পর্যায়ক্রমে আইপ্রোডিয়ন প্রয়োগ",
      "আক্রান্ত গাছ সরান",
    ],
    economicThreshold: "5% leaf area affected at flowering",
    sources: ["uncited"],
  },
  {
    id: "onion_purple_blotch",
    name: "Purple Blotch",
    nameBn: "পেঁয়াজের বেগুনি দাগ",
    greenList: ["ম্যানকোজেব", "ক্লোরোথালোনিল", "আইপ্রোডিয়ন"],
    yellowList: ["কার্বেন্ডাজিম"],
    similarDiseases: ["mustard_alternaria", "tomato_early_blight"],
    causalType: "fungal",
    districts: ["পাবনা", "যশোর", "রাজশাহী", "ফরিদপুর"],
    seasonality: ["অগ্রহায়ণ", "পৌষ", "মাঘ"],
    cropIds: ["onion"],
    affectedStages: ["vegetative", "stem_elongation"],
    favorabilityFactors: [
      { factor: "temperature", condition: { operator: "range", min: 20, max: 28 }, weight: 30, source: "uncited" },
      { factor: "humidity", condition: { operator: "gt", value: 85 }, weight: 25, source: "uncited" },
      { factor: "leafWetness", condition: { operator: "gt", value: 8 }, weight: 20, source: "uncited" },
      { factor: "precipitation", condition: { operator: "gt", value: 2 }, weight: 15, source: "uncited" },
      { factor: "cropStage", condition: { operator: "gt", value: 0 }, weight: 10, source: "uncited" },
    ],
    symptoms: [
      "Small water-soaked lesions on leaves",
      "Lesions enlarge with purple centers and yellow halos",
      "Leaves bend and break at lesion site",
      "Bulb size reduced",
    ],
    symptomsBn: [
      "পাতায় ছোট পানি-ভেজা দাগ",
      "দাগ বড় হয়ে বেগুনি কেন্দ্র ও হলুদ বলয়",
      "দাগের জায়গায় পাতা ভেঙে যায়",
      "কন্দের আকার ছোট",
    ],
    preventiveActions: [
      "Use resistant varieties (BARI Piaz 1, 2)",
      "Avoid overhead irrigation",
      "Ensure good spacing and drainage",
      "Crop rotation",
    ],
    preventiveActionsBn: [
      "রোগ প্রতিরোধী জাত ব্যবহার করুন (বারি পেঁয়াজ ১, ২)",
      "উপরিভাগ সেচ এড়ান",
      "ভালো দূরত্ব ও নিকাশ নিশ্চিত করুন",
      "ফসল পরিবর্তন",
    ],
    curativeActions: [
      "Spray Mancozeb 75WP @ 2.5g/L at 7-day intervals",
      "Apply Copper oxychloride alternately",
      "Remove infected leaves",
    ],
    curativeActionsBn: [
      "৭ দিন অন্তর ম্যাংকোজেব ৭৫WP @ ২.৫ গ্রাম/লিটার স্প্রে করুন",
      "পর্যায়ক্রমে কপার অক্সিক্লোরাইড প্রয়োগ",
      "আক্রান্ত পাতা সরান",
    ],
    economicThreshold: "2-3% leaf area affected",
    sources: ["uncited"],
  },
  {
    id: "maize_downy_mildew",
    name: "Downy Mildew",
    nameBn: "ভুট্টার ডাউনি মিলডিউ",
    greenList: ["মেটাল্যাক্সিল", "ম্যানকোজেব"],
    yellowList: ["কার্বেন্ডাজিম"],
    similarDiseases: ["powdery_mildew"],
    causalType: "fungal",
    districts: ["দিনাজপুর", "রংপুর", "বগুড়া", "কুড়িগ্রাম"],
    seasonality: ["বৈশাখ", "জ্যৈষ্ঠ", "আষাঢ়"],
    cropIds: ["maize"],
    affectedStages: ["seedling", "vegetative", "tillering"],
    favorabilityFactors: [
      { factor: "temperature", condition: { operator: "range", min: 20, max: 28 }, weight: 30, source: "uncited" },
      { factor: "humidity", condition: { operator: "gt", value: 90 }, weight: 25, source: "uncited" },
      { factor: "leafWetness", condition: { operator: "gt", value: 10 }, weight: 20, source: "uncited" },
      { factor: "precipitation", condition: { operator: "gt", value: 5 }, weight: 15, source: "uncited" },
      { factor: "cropStage", condition: { operator: "gt", value: 0 }, weight: 10, source: "uncited" },
    ],
    symptoms: [
      "Yellowish streaks on leaves",
      "White downy growth on undersides in morning",
      "Leaves become chlorotic and stunted",
      "Reduced ear formation",
    ],
    symptomsBn: ["পাতায় হলুদ ডোরা", "সকালে পাতার নিচে সাদা তুলোর মত গাদ", "পাতা বিবর্ণ ও খাটো", "ভুট্টা কম ধরে"],
    preventiveActions: [
      "Use resistant hybrids",
      "Avoid dense planting",
      "Improve drainage",
      "Seed treatment with Metalaxyl",
    ],
    preventiveActionsBn: [
      "রোগ প্রতিরোধী হাইব্রিড ব্যবহার করুন",
      "ঘন রোপণ এড়ান",
      "নিকাশ উন্নত করুন",
      "মেটাল্যাক্সিল দিয়ে বীজ শোধন",
    ],
    curativeActions: [
      "Spray Mancozeb 75WP @ 2.5g/L",
      "Apply Metalaxyl + Mancozeb if confirmed",
      "Remove infected plants",
    ],
    curativeActionsBn: [
      "ম্যাংকোজেব ৭৫WP @ ২.৫ গ্রাম/লিটার স্প্রে করুন",
      "নিশ্চিত হলে মেটাল্যাক্সিল + ম্যাংকোজেব প্রয়োগ",
      "আক্রান্ত গাছ সরান",
    ],
    economicThreshold: "5% plants showing symptoms at seedling stage",
    sources: ["uncited"],
  },
  {
    id: "brinjal_phomopsis",
    name: "Phomopsis Blight",
    nameBn: "বেগুনের ফোমোপসিস পচা",
    greenList: ["কার্বেন্ডাজিম", "ম্যানকোজেব", "কপার অক্সিক্লোরাইড"],
    yellowList: ["ক্লোরোথালোনিল"],
    similarDiseases: ["jute_stem_rot", "chili_anthracnose"],
    causalType: "fungal",
    districts: ["বগুড়া", "রংপুর", "যশোর", "নওগাঁ"],
    seasonality: ["বৈশাখ", "জ্যৈষ্ঠ", "আষাঢ়", "ভাদ্র"],
    cropIds: ["brinjal"],
    affectedStages: ["vegetative", "flowering", "grain_filling"],
    favorabilityFactors: [
      { factor: "temperature", condition: { operator: "range", min: 25, max: 32 }, weight: 30, source: "uncited" },
      { factor: "humidity", condition: { operator: "gt", value: 85 }, weight: 25, source: "uncited" },
      { factor: "leafWetness", condition: { operator: "gt", value: 8 }, weight: 20, source: "uncited" },
      { factor: "precipitation", condition: { operator: "gt", value: 2 }, weight: 15, source: "uncited" },
      { factor: "cropStage", condition: { operator: "gt", value: 0 }, weight: 10, source: "uncited" },
    ],
    symptoms: [
      "Dark brown spots on leaves and stems",
      "Lesions on fruits with pycnidia dots",
      "Fruit rot and drop",
      "Wilting of branches",
    ],
    symptomsBn: ["পাতা ও কাণ্ডে কালচে বাদামি দাগ", "ফলে পাইকনিডিয়া বিন্দুসহ দাগ", "ফল পচে ঝরে যায়", "ডাল মরচে ধরা"],
    preventiveActions: [
      "Use resistant varieties",
      "Crop rotation with non-solanaceous crops",
      "Remove infected plant debris",
      "Avoid overhead irrigation",
    ],
    preventiveActionsBn: [
      "রোগ প্রতিরোধী জাত ব্যবহার করুন",
      "অ-সোলানেসিয়াস ফসলের সাথে ফসল পরিবর্তন",
      "আক্রান্ত অবশিষ্ট অপসারণ",
      "উপরিভাগ সেচ এড়ান",
    ],
    curativeActions: [
      "Spray Mancozeb 75WP @ 2.5g/L",
      "Apply Carbendazim alternately",
      "Remove and destroy infected fruits",
    ],
    curativeActionsBn: [
      "ম্যাংকোজেব ৭৫WP @ ২.৫ গ্রাম/লিটার স্প্রে করুন",
      "পর্যায়ক্রমে কার্বেন্ডাজিম প্রয়োগ",
      "আক্রান্ত ফল সরিয়ে ধ্বংস করুন",
    ],
    economicThreshold: "3% fruits affected",
    sources: ["uncited"],
  },
];

// ────────────────────────────────────────────────────────────
// Structured-threshold scoring (replaces the brittle regex parsers)
// ────────────────────────────────────────────────────────────

/**
 * Calculate temperature score (0–30) from a structured range condition.
 * @param {number} temp
 * @param {import('./types.js').DiseaseFavorabilityFactor[]} factors
 */
function scoreTemperature(temp, factors) {
  const ff = factors.find((f) => f.factor === "temperature");
  if (!ff || ff.condition.operator !== "range") return 0;
  const { min, max } = ff.condition;
  if (min == null || max == null) return 0;
  const optimal = (min + max) / 2;
  const spread = (max - min) / 2;
  if (spread <= 0) return temp === optimal ? ff.weight : 0;
  const distance = Math.abs(temp - optimal);
  if (distance > spread) return 0;
  return Math.round(ff.weight * (1 - distance / spread));
}

/**
 * Calculate humidity score from a structured condition (gt or range).
 * @param {number} humidity
 * @param {import('./types.js').DiseaseFavorabilityFactor[]} factors
 */
function scoreHumidity(humidity, factors) {
  const ff = factors.find((f) => f.factor === "humidity");
  if (!ff) return 0;
  const c = ff.condition;
  if (c.operator === "gt" && c.value != null) {
    if (humidity < c.value) return 0;
    const excess = humidity - c.value;
    return Math.round(clamp(ff.weight * (excess / (100 - c.value)), 0, ff.weight));
  }
  if (c.operator === "range" && c.min != null && c.max != null) {
    if (humidity < c.min || humidity > c.max) {
      // Partial credit near the band edges (within 5 units).
      const distToBand = Math.min(Math.abs(humidity - c.min), Math.abs(humidity - c.max));
      if (distToBand > 5) return 0;
      return Math.round(ff.weight * 0.3);
    }
    const optimal = (c.min + c.max) / 2;
    const spread = (c.max - c.min) / 2;
    if (spread <= 0) return ff.weight;
    const distance = Math.abs(humidity - optimal);
    return Math.round(ff.weight * (1 - distance / spread));
  }
  return 0;
}

/**
 * Calculate leaf-wetness score from a structured condition.
 * @param {number} wetnessHours
 * @param {import('./types.js').DiseaseFavorabilityFactor[]} factors
 */
function scoreLeafWetness(wetnessHours, factors) {
  const ff = factors.find((f) => f.factor === "leafWetness");
  if (!ff) return 0;
  const c = ff.condition;
  if (c.operator === "gt" && c.value != null) {
    if (wetnessHours < c.value) return 0;
    const excess = wetnessHours - c.value;
    return Math.round(clamp(ff.weight * (excess / 12), 0, ff.weight));
  }
  if (c.operator === "range" && c.min != null && c.max != null) {
    if (wetnessHours < c.min || wetnessHours > c.max) {
      const distToBand = Math.min(Math.abs(wetnessHours - c.min), Math.abs(wetnessHours - c.max));
      if (distToBand > 2) return 0;
      return Math.round(ff.weight * 0.3);
    }
    const optimal = (c.min + c.max) / 2;
    const spread = (c.max - c.min) / 2;
    if (spread <= 0) return ff.weight;
    const distance = Math.abs(wetnessHours - optimal);
    return Math.round(ff.weight * (1 - distance / spread));
  }
  return 0;
}

/**
 * Calculate precipitation score (0–15).
 * @param {number} precipMm
 * @param {import('./types.js').DiseaseFavorabilityFactor[]} factors
 */
function scorePrecipitation(precipMm, factors) {
  const ff = factors.find((f) => f.factor === "precipitation");
  if (!ff) return 0;
  const c = ff.condition;
  if (c.operator === "gt" && c.value != null) {
    if (precipMm <= c.value) return 0;
    return Math.round(clamp(ff.weight * ((precipMm - c.value) / 20), 0, ff.weight));
  }
  if (c.operator === "lt" && c.value != null) {
    // Low-rainfall diseases (e.g. powdery mildew) favor dry conditions.
    if (precipMm >= c.value) return 0;
    return Math.round(ff.weight * (1 - precipMm / c.value));
  }
  if (c.operator === "range" && c.min != null && c.max != null) {
    if (precipMm < c.min || precipMm > c.max) return 0;
    const optimal = (c.min + c.max) / 2;
    const spread = (c.max - c.min) / 2;
    if (spread <= 0) return ff.weight;
    return Math.round(ff.weight * (1 - Math.abs(precipMm - optimal) / spread));
  }
  return 0;
}

/**
 * Calculate crop-stage susceptibility score (0–10).
 * @param {import('./types.js').GrowthStageId} currentStage
 * @param {import('./types.js').DiseaseInfo} disease
 */
function scoreCropStage(currentStage, disease) {
  if (!disease.affectedStages.includes(currentStage)) return 0;
  const stageOrder = [
    "seedling",
    "vegetative",
    "tillering",
    "stem_elongation",
    "booting",
    "heading",
    "flowering",
    "grain_filling",
  ];
  const idx = stageOrder.indexOf(currentStage);
  if (idx < 0) return 2;
  return Math.round(clamp(2 + idx * 1.1, 0, 10));
}

// ────────────────────────────────────────────────────────────
// Confidence (FIXED — was inverted in KWI)
// ────────────────────────────────────────────────────────────

/**
 * Derive a per-disease confidence that is HIGHER when conditions are MORE
 * favorable for that disease, capped modestly because the model is a
 * heuristic (not a calibrated probability).
 *
 * KWI original (line 468) was:
 *   confidence = clamp(60 + Math.abs(humidity - 75) * 0.4, 60, 92)
 * which ROSE as humidity moved AWAY from 75% — backwards. It has been
 * replaced with a favorability-based scheme.
 * @param {number} riskScore - the computed disease risk (0–100)
 * @param {number} factorsMet - how many of the 5 favorability factors contributed
 * @returns {number}
 */
function deriveDiseaseConfidence(riskScore, factorsMet) {
  // Base confidence scales with how favorable conditions actually are.
  const base = 55 + Math.min(riskScore, 100) * 0.18; // 55..73
  const factorBonus = factorsMet * 3; // up to +15 for all 5 factors met
  return clamp(Math.round(base + factorBonus), 50, 80);
}

// ────────────────────────────────────────────────────────────
// Main forecast function
// ────────────────────────────────────────────────────────────

const DISEASE_MODEL_LIMITATIONS = [
  "১৪টি রোগের জন্য থ্রেশহোল্ড ক্যালিব্রেটেড নয়; এটি একটি অনুমানিক স্কোর।",
  "পাতার স্যাঁতসেঁতে ভাব আর্দ্রতা ও বৃষ্টিপাত থেকে অনুমান করা হয়েছে, সরাসরি পরিমাপ নয়।",
  "রোগ ঝুঁকি স্কোর ক্যালিব্রেটেড সম্ভাবনা নয় — এটি একটি স্কাউটিং সংকেত।",
];

/**
 * Generate a disease forecast for the given weather and active crops.
 * @param {import('./types.js').WeatherData} weather
 * @param {import('./types.js').ActiveCrop[]} activeCrops
 * @returns {import('./types.js').DiseaseForecast}
 */
export function generateDiseaseForecast(weather, activeCrops) {
  const activeCropIds = new Set(activeCrops.map((c) => c.cropId));
  const relevantDiseases = DISEASES.filter((d) => d.cropIds.some((cid) => activeCropIds.has(cid)));

  const assessments = relevantDiseases.map((disease) => {
    const matchingCrops = activeCrops.filter((c) => disease.cropIds.includes(c.cropId));
    let maxRisk = 0;
    let factorsMetAtMax = 0;
    const allContributing = [];

    for (const crop of matchingCrops) {
      const tempScore = scoreTemperature(weather.current.temperature, disease.favorabilityFactors);
      const humidityScore = scoreHumidity(weather.current.humidity, disease.favorabilityFactors);
      const leafWetnessScore = scoreLeafWetness(
        weather.agriculturalIndices.leafWetnessHours,
        disease.favorabilityFactors,
      );
      const precipScore = scorePrecipitation(weather.current.precipitation, disease.favorabilityFactors);
      const stageScore = scoreCropStage(crop.currentStage, disease);
      const cropRisk = tempScore + humidityScore + leafWetnessScore + precipScore + stageScore;

      if (cropRisk > maxRisk) {
        maxRisk = cropRisk;
        factorsMetAtMax = [tempScore, humidityScore, leafWetnessScore, precipScore, stageScore].filter(
          (s) => s > 0,
        ).length;
        if (tempScore > 10) allContributing.push(`Temperature ${weather.current.temperature}°C favors ${disease.name}`);
        if (humidityScore > 10) allContributing.push(`High humidity ${weather.current.humidity}% promotes spread`);
        if (leafWetnessScore > 8)
          allContributing.push(`Leaf wetness ${weather.agriculturalIndices.leafWetnessHours}h supports infection`);
        if (precipScore > 5) allContributing.push(`Recent precipitation ${weather.current.precipitation}mm`);
        if (stageScore > 5) allContributing.push(`Current crop stage (${crop.currentStage}) is highly susceptible`);
      }
    }

    const confidence = deriveDiseaseConfidence(maxRisk, factorsMetAtMax);
    return {
      disease,
      risk: maxRisk,
      level: getRiskLevel(maxRisk),
      confidence,
      contributingFactors: allContributing,
      preventiveActions: disease.preventiveActions,
      curativeActions: disease.curativeActions,
    };
  });

  assessments.sort((a, b) => b.risk - a.risk);

  const overallFavorability =
    assessments.length > 0 ? Math.round(assessments.reduce((sum, a) => sum + a.risk, 0) / assessments.length) : 0;
  const spreadRisk = getRiskLevel(overallFavorability);
  const confidence =
    assessments.length > 0 ? Math.round(assessments.reduce((s, a) => s + a.confidence, 0) / assessments.length) : 0;

  return {
    diseases: assessments,
    overallFavorability,
    spreadRisk,
    confidence,
    modelLimitations: DISEASE_MODEL_LIMITATIONS,
  };
}

/** @returns {import('./types.js').DiseaseInfo[]} */
export function getAllDiseases() {
  return DISEASES;
}

/** @param {string} cropId @returns {import('./types.js').DiseaseInfo[]} */
export function getDiseasesByCrop(cropId) {
  return DISEASES.filter((d) => d.cropIds.includes(cropId));
}
