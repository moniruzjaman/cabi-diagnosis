// ============================================================
// Plant Detective — Crop Health Intelligence
// Pest Engine — forecasts INSECT PEST pressure from weather.
//
// Ported from the AgriChem/PesticideNext protection-intelligence
// pest engine (itself ported from KWI, MIT), adapted to this repo's
// conventions:
//   - pure ESM JS with JSDoc types (no TS syntax in src/intelligence);
//   - same structured-factor scoring style as diseaseEngine.js;
//   - modelLimitations[] on the output (heuristic, not calibrated);
//   - every pest carries `sources` (cited or "uncited").
//
// Insect pest ecology is the OPPOSITE of the disease model above:
// diseases score UP with humidity/leaf-wetness/rain, while most
// major rice/jute insect pests (BPH, stem borer, hispa, aphids)
// favor WARM NIGHTS and DRY SPELLS — so a separate engine is
// required rather than forcing pests through generateDiseaseForecast.
//
// Scoring (mirrors the reference implementation):
//   nightTemp : minNightTempC exceeded → 30 + 4/°C (cap 50)
//   drySpell  : rain below maxFavorableRainMm → up to 40
//   stage     : affected stage → 4–10 by stage progression
//   risk      0–100, level via riskEngine.getRiskLevel
// ============================================================

import { getRiskLevel } from "./riskEngine.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// ────────────────────────────────────────────────────────────
// Bangladesh Insect Pest Database
// Ported from AgriChem pest-engine PESTS (8 pests). Economic
// thresholds are the strings carried by the source — they are
// disclosed, never silently converted to numbers.
// ────────────────────────────────────────────────────────────

/** @type {import('./types.js').PestInfo[]} */
const PESTS = [
  {
    id: "brown_planthopper",
    name: "Brown Planthopper",
    nameBn: "বাদামী গাছ ফড়িং",
    cropIds: ["rice"],
    affectedStages: ["tillering", "stem_elongation", "booting", "heading", "flowering"],
    minNightTempC: 24,
    maxFavorableRainMm: 5,
    symptoms: [
      'Yellowing and browning of lower leaves ("hopper burn")',
      "Circular patches of dead, dried-out plants",
      "Sticky honeydew on leaves leading to sooty mold",
      "Stunted growth, reduced tillering",
    ],
    symptomsBn: [
      'নিচের পাতা হলুদ থেকে বাদামী হয়ে যাওয়া ("হপার বার্ন")',
      "গোলাকার আকারে গাছ শুকিয়ে মরে যাওয়া",
      "পাতায় আঠালো মধু নিঃসরণ ও কালো ছত্রাক জন্মানো",
      "গাছের বৃদ্ধি ব্যাহত হওয়া, কুশি কম হওয়া",
    ],
    preventiveActions: [
      "Use resistant varieties (BRRI dhan62, dhan75)",
      "Avoid excess nitrogen — it increases hopper susceptibility",
      "Maintain wider plant spacing for airflow",
      "Conserve natural predators (spiders, mirid bugs) — avoid broad-spectrum insecticide",
    ],
    preventiveActionsBn: [
      "প্রতিরোধী জাত ব্যবহার করুন (ব্রিধান ৬২, ৭৫)",
      "অতিরিক্ত নাইট্রোজেন পরিহার করুন — এতে ফড়িং আক্রমণ বাড়ে",
      "বাতাস চলাচলের জন্য পর্যাপ্ত দূরত্বে চারা রোপণ করুন",
      "প্রাকৃতিক শত্রু (মাকড়সা, মিরিড বাগ) সংরক্ষণ করুন — বিস্তৃত-বর্ণালী কীটনাশক এড়িয়ে চলুন",
    ],
    curativeActions: [
      "Apply Imidacloprid or Buprofezin at base of plant, targeting hopper zone",
      "Drain field temporarily if infestation is severe (hoppers dislike dry base)",
      "Spot-treat affected patches rather than blanket spraying",
    ],
    curativeActionsBn: [
      "গাছের গোড়ায় ইমিডাক্লোপ্রিড বা বুপ্রোফেজিন প্রয়োগ করুন",
      "আক্রমণ গুরুতর হলে সাময়িকভাবে জমি শুকিয়ে ফেলুন (ফড়িং শুকনো গোড়া অপছন্দ করে)",
      "পুরো জমিতে না ছিটিয়ে শুধু আক্রান্ত অংশে প্রয়োগ করুন",
    ],
    economicThreshold: "5-10 hoppers per hill (BPH)",
    sources: ["AgriChem pest-engine (KWI-derived)"],
  },
  {
    id: "yellow_stemborer",
    name: "Yellow Stem Borer",
    nameBn: "হলুদ কাণ্ড মাছি",
    cropIds: ["rice"],
    affectedStages: ["vegetative", "tillering", "booting", "heading", "flowering"],
    minNightTempC: 22,
    maxFavorableRainMm: 10,
    symptoms: [
      "Deadheart — central shoot withers and dries in vegetative stage",
      "White ear heads at flowering — empty panicles that pull out easily",
      "Stem borer larvae inside stems near nodes",
    ],
    symptomsBn: [
      "ডেডহার্ট — অবচয়ী পর্যায়ে মাঝের চারা শুকিয়ে যাওয়া",
      "ফুল ফোটার সময় সাদা কাণ্ড (শীষ শূন্য ও সহজে বের হয়ে আসে)",
      "কাণ্ডের গিঁটের কাছে পোকার কীড় দেখা যাওয়া",
    ],
    preventiveActions: [
      "Remove and destroy stubbles after harvest (overwintering site)",
      "Install pheromone traps (10/ha) for monitoring",
      "Adjust planting date to avoid peak moth flight",
      "Clip egg masses on leaf tips during transplanting",
    ],
    preventiveActionsBn: [
      "ফসল কাটার পর খোসা/ডিগা পুড়িয়ে ধ্বংস করুন",
      "পর্যবেক্ষণের জন্য ফেরোমন ট্র্যাপ (১০/হেক্টর) লাগান",
      "মথের প্রাচুর্য এড়িয়ে রোপণের সময় ঠিক করুন",
      "রোপণের সময় পাতার ডগায় ডিমের গুচ্ছ কেটে ফেলুন",
    ],
    curativeActions: [
      "Apply Cartap hydrochloride or Chlorantraniliprole at early symptom",
      "Use Trichogramma japonicum cards (biological)",
      "Light traps at night to monitor adult moth emergence",
    ],
    curativeActionsBn: [
      "প্রাথমিক লক্ষণে কার্টাপ হাইড্রোক্লোরাইড বা ক্লোরানট্রানিলিপ্রোল প্রয়োগ করুন",
      "ট্রাইকোগ্রামা জাপোনিকাম কার্ড ব্যবহার করুন (জৈবিক)",
      "রাতে আলোর ফাঁদ দিয়ে প্রাপ্তবয়স্ক মথ পর্যবেক্ষণ করুন",
    ],
    economicThreshold: "1 egg mass/m² or 5% deadheart / 2% white ear",
    sources: ["AgriChem pest-engine (KWI-derived)"],
  },
  {
    id: "rice_leaf_folder",
    name: "Rice Leaf Folder",
    nameBn: "ধান পাতা মোড়ানো পোকা",
    cropIds: ["rice"],
    affectedStages: ["tillering", "stem_elongation", "booting", "heading"],
    minNightTempC: 23,
    maxFavorableRainMm: 15,
    symptoms: [
      "Longitudinal rolling of leaves — larvae feed inside the fold",
      "Whitish transparent streaks on folded leaves",
      "Reduced photosynthesis when >30% leaves are folded",
    ],
    symptomsBn: [
      "পাতা লম্বালম্বিভাবে মোড়ানো — ভিতরে কীড় পাতা খায়",
      "মোড়ানো পাতায় সাদাটে স্বচ্ছ দাগ",
      "৩০% এর বেশি পাতা মোড়ালে খাদ্য তৈরি কমে যাওয়া",
    ],
    preventiveActions: [
      "Avoid dense canopy and excess nitrogen",
      "Conserve egg parasitoids (Trichogramma spp.)",
      "Deep irrigation intermittently to disrupt larval habitat",
    ],
    preventiveActionsBn: [
      "ঘন চারা ও অতিরিক্ত নাইট্রোজেন এড়িয়ে চলুন",
      "ডিমের পরজীবী (ট্রাইকোগ্রামা) সংরক্ষণ করুন",
      "মাঝে মাঝে গভীর সেচ দিয়ে কীড়ের বাসা নষ্ট করুন",
    ],
    curativeActions: [
      "Spray Chlorantraniliprole or Cartap if threshold breached",
      "Remove folded leaves manually in small plots",
    ],
    curativeActionsBn: [
      "সীমা ছাড়ালে ক্লোরানট্রানিলিপ্রোল বা কার্টাপ স্প্রে করুন",
      "ছোট জমিতে মোড়ানো পাতা হাতে সরিয়ে ফেলুন",
    ],
    economicThreshold: "2-3 folded leaves per hill at tillering",
    sources: ["AgriChem pest-engine (KWI-derived)"],
  },
  {
    id: "rice_hispa",
    name: "Rice Hispa",
    nameBn: "ধানের হিসপা পোকা",
    cropIds: ["rice"],
    affectedStages: ["seedling", "vegetative", "tillering", "grain_filling"],
    minNightTempC: 22,
    maxFavorableRainMm: 8,
    symptoms: [
      "White parallel streaks along leaf veins (adult feeding)",
      "Larvae mine inside leaves producing blister-like patches",
      "Leaves appear papery and dry in heavy infestation",
    ],
    symptomsBn: [
      "পাতার শিরার সমান্তরাল সাদা দাগ (প্রাপ্তবয়স্ক পোকার কামড়)",
      "কীড় পাতার ভিতরে সুড়ঙ্গ কেটে ফোস্কার মতো দাগ তৈরি করে",
      "ভারী আক্রমণে পাতা কাগজের মতো শুকিয়ে যাওয়া",
    ],
    preventiveActions: [
      "Destroy weed hosts (Echinochloa, Leersia) around the field",
      "Hand-pick adults + leaf tips with eggs in seedbeds",
      "Avoid late transplanting",
    ],
    preventiveActionsBn: [
      "জমির আশেপাশের আগাছা ধ্বংস করুন",
      "বীজতলায় প্রাপ্তবয়স্ক পোকা ও ডিমযুক্ত পাতার ডগা সংগ্রহ করে ধ্বংস করুন",
      "দেরিতে রোপণ এড়িয়ে চলুন",
    ],
    curativeActions: [
      "Apply Imidacloprid seedling drench if >5% dead tops",
      "Foliar Cypermethrin at vegetative if damage continues",
    ],
    curativeActionsBn: [
      "৫% এর বেশি ডেড টপ হলে চারায় ইমিডাক্লোপ্রিড ড্রেঞ্চ দিন",
      "ক্ষতি চললে অবচয়ী পর্যায়ে সাইপারমেথ্রিন স্প্রে করুন",
    ],
    economicThreshold: "5% plants with dead tops at seedling / early vegetative",
    sources: ["AgriChem pest-engine (KWI-derived)"],
  },
  {
    id: "green_leafhopper",
    name: "Green Leafhopper",
    nameBn: "সবুজ পাতা ফড়িং",
    cropIds: ["rice"],
    affectedStages: ["vegetative", "stem_elongation", "heading", "flowering", "grain_filling"],
    minNightTempC: 23,
    maxFavorableRainMm: 12,
    symptoms: [
      "Green wedge-shaped insects on upper leaves",
      "Yellowing leaf tips and virus transmission (tungro vector)",
      "Sooty mold on honeydew deposits",
    ],
    symptomsBn: [
      "উপরের পাতায় সবুজ ত্রিভুজাকার পোকা",
      "পাতার ডগা হলুদ হওয়া ও টুংরো ভাইরাস ছড়ানো",
      "মধুর উপর কালো ছত্রাক",
    ],
    preventiveActions: [
      "Use tungro-resistant varieties where available",
      "Synchronous planting to break the vector cycle",
      "Control grassy weeds that harbor hoppers",
    ],
    preventiveActionsBn: [
      "সম্ভব হলে টুংরো-প্রতিরোধী জাত লাগান",
      "ভাইরাস চক্র ভাঙতে একসাথে রোপণ করুন",
      "আগাছা পরিষ্কার রাখুন যেখানে ফড়িং লুকিয়ে থাকে",
    ],
    curativeActions: ["Apply insecticide only at tungro-risk zones (vector control)", "Monitor with sweep nets weekly"],
    curativeActionsBn: [
      "শুধু টুংরো-ঝুঁকির এলাকায় কীটনাশক প্রয়োগ করুন (ভাইরাস বাহক নিয়ন্ত্রণ)",
      "সপ্তাহে একবার ঝাঁটা দিয়ে পোকা গুনুন",
    ],
    economicThreshold: "5-10 hoppers per sweep (vector zones lower)",
    sources: ["AgriChem pest-engine (KWI-derived)"],
  },
  {
    id: "wheat_aphid",
    name: "Wheat Aphid",
    nameBn: "গমের অ্যাফিড",
    cropIds: ["wheat"],
    affectedStages: ["heading", "flowering", "grain_filling", "dough"],
    minNightTempC: 15,
    maxFavorableRainMm: 3,
    symptoms: [
      "Colonies on ear heads and flag leaves",
      "Curled leaves and sticky honeydew",
      "Sooty mold reducing grain fill",
    ],
    symptomsBn: ["শীষ ও পতাকা পাতায় পোকার দল", "পাতা মোচড়ানো ও আঠালো মধু", "কালো ছত্রাকে দানা ভরাট কমে যাওয়া"],
    preventiveActions: [
      "Encourage ladybird beetles and hoverflies",
      "Avoid excess nitrogen late in the season",
      "Early sowing to escape peak aphid buildup",
    ],
    preventiveActionsBn: [
      "বিটল ও হোভারফ্লাইয়ের সংখ্যা বাড়াতে উদ্যোগ নিন",
      "মরসুমের শেষে অতিরিক্ত নাইট্রোজেন এড়িয়ে চলুন",
      "অ্যাফিডের প্রাচুর্য এড়াতে আগে বপন করুন",
    ],
    curativeActions: [
      "Spray only when >10-15 aphids per ear at flowering",
      "Use selective insecticide (e.g. pymetrozine) sparingly",
    ],
    curativeActionsBn: [
      "ফুল ফোটার সময় প্রতি শীষে ১০-১৫ এর বেশি অ্যাফিড হলেই স্প্রে করুন",
      "সংরক্ষী কীটনাশক (যেমন পাইমেট্রোজিন) সংযত ব্যবহার করুন",
    ],
    economicThreshold: "10-15 aphids per ear at flowering",
    sources: ["AgriChem pest-engine (KWI-derived)"],
  },
  {
    id: "jute_semilooper",
    name: "Jute Semilooper",
    nameBn: "পাটের অর্ধগোলাকার কীট",
    cropIds: ["jute"],
    affectedStages: ["seedling", "vegetative", "stem_elongation"],
    minNightTempC: 22,
    maxFavorableRainMm: 20,
    symptoms: [
      "Defoliation from leaf margins — caterpillars loop while moving",
      "Green larvae with white stripes on underside of leaves",
      "Severe defoliation stunts fiber development",
    ],
    symptomsBn: [
      "পাতার কিনারা থেকে খাওয়া — কীট ইঁদুরের লেজের মতো বেঁকে চলে",
      "পাতার নিচে সাদা ডোরাকাটা সবুজ কীট",
      "ভারী আক্রমণে আঁশের বৃদ্ধি কমে যাওয়া",
    ],
    preventiveActions: [
      "Hand-pick larvae in small plots",
      "Encourage parasitoids (Apanteles spp.)",
      "Deep ploughing after harvest to expose pupae",
    ],
    preventiveActionsBn: [
      "ছোট জমিতে কীট হাতে সংগ্রহ করে ধ্বংস করুন",
      "পরজীবী পোকা (অ্যাপান্টেলিস) সংরক্ষণ করুন",
      "ফসল কাটার পর গভীর চাষ দিয়ে কীটের কোষ ধ্বংস করুন",
    ],
    curativeActions: [
      "Spray Bacillus thuringiensis (Bt) or Diazinon at severe infestation",
      "Night spraying reaches feeding larvae better",
    ],
    curativeActionsBn: [
      "ভারী আক্রমণে বিটি (Bt) বা ডায়াজিনন স্প্রে করুন",
      "রাতে স্প্রে করলে খাওয়ার সময়ে কীট মারা যায়",
    ],
    economicThreshold: "2-3 larvae per plant at 30 days",
    sources: ["AgriChem pest-engine (KWI-derived)"],
  },
  {
    id: "jute_stem_weevil",
    name: "Jute Stem Weevil",
    nameBn: "পাটের কাণ্ড গুবরে পোকা",
    cropIds: ["jute"],
    affectedStages: ["vegetative", "stem_elongation"],
    minNightTempC: 21,
    maxFavorableRainMm: 25,
    symptoms: [
      "Stem swellings (galls) where larvae tunnel",
      "Stunted plants with deformed bark",
      "Fiber quality degrades at the galled sections",
    ],
    symptomsBn: [
      "কীড় কাণ্ডে সুড়ঙ্গ কাটলে ফোলা দাগ",
      "গাছ খর্ব ও ছাল বিকৃত হওয়া",
      "ফোলা অংশে আঁশের গুণমান কমে যাওয়া",
    ],
    preventiveActions: [
      "Uproot and burn infested plants early",
      "Avoid dense sowing",
      "Rotate with non-malvaceous crops",
    ],
    preventiveActionsBn: [
      "আক্রান্ত গাছ আগেই তুলে পুড়িয়ে ফেলুন",
      "ঘন করে বীজ বুনবেন না",
      "পাট জাতীয় ফসল ছাড়া অন্য ফসলে ফসল-পরিবর্তন করুন",
    ],
    curativeActions: [
      "Remove galled stems — chemical control rarely justified",
      "Apply Malathion dust only at mass emergence",
    ],
    curativeActionsBn: [
      "ফোলা কাণ্ড সরিয়ে ফেলুন — রাসায়নিক খুব কমই প্রয়োজন",
      "শুধু ব্যাপক বিস্তারে ম্যালাথিয়ন গুঁড়া প্রয়োগ করুন",
    ],
    economicThreshold: "5% plants with stem galls",
    sources: ["AgriChem pest-engine (KWI-derived)"],
  },
];

const PEST_MODEL_LIMITATIONS = [
  "পোকার ঝুঁকি মডেল একটি হিউরিস্টিক — এটি রাতের তাপমাত্রা, বৃষ্টিপাত ও ফসলের পর্যায় থেকে অনুকূলতা অনুমান করে, ক্যালিব্রেটেড প্রাদুর্ভাব সম্ভাবনা নয়।",
  "পোকার সংখ্যা পরিমাপ করা হয় না — নিশ্চিত সিদ্ধান্তের আগে ক্ষেত পর্যবেক্ষণ (স্কাউটিং) আবশ্যক।",
  "অর্থনৈতিক সীমামান উৎস থেকে আনা স্ট্রিং — এগুলো যাচাইকৃত সংখ্যাসূচক বাংলাদেশী সীমামান নয়, তাই সিদ্ধান্তে স্পষ্টভাবে প্রকাশ করা হয়।",
];

// ────────────────────────────────────────────────────────────
// Scoring
// ────────────────────────────────────────────────────────────

/**
 * Night temperature score: pest activity favored above minNightTempC.
 * @param {number} tempMin - today's minimum temperature (°C)
 * @param {import('./types.js').PestInfo} pest
 * @returns {number} 0 | 30–50
 */
function scoreNightTemp(tempMin, pest) {
  if (tempMin < pest.minNightTempC) return 0;
  const excess = tempMin - pest.minNightTempC;
  return Math.round(clamp(30 + excess * 4, 30, 50));
}

/**
 * Dry-spell score: most pests favor rainfall below maxFavorableRainMm.
 * @param {number} rainMm - today's precipitation sum (mm)
 * @param {import('./types.js').PestInfo} pest
 * @returns {number} 0–40
 */
function scoreDrySpell(rainMm, pest) {
  if (pest.maxFavorableRainMm <= 0) return 0;
  if (rainMm > pest.maxFavorableRainMm) return 0;
  const dryness = 1 - rainMm / pest.maxFavorableRainMm;
  return Math.round(clamp(40 * dryness, 0, 40));
}

/**
 * Crop-stage score: vulnerable stages score by progression.
 * @param {string} currentStage
 * @param {import('./types.js').PestInfo} pest
 * @returns {number} 0–10
 */
function scoreCropStage(currentStage, pest) {
  if (!pest.affectedStages.includes(currentStage)) return 0;
  const stageOrder = ["tillering", "stem_elongation", "booting", "heading", "flowering"];
  const idx = stageOrder.indexOf(currentStage);
  if (idx < 0) return 4;
  return Math.round(clamp(4 + idx * 1.5, 0, 10));
}

// ────────────────────────────────────────────────────────────
// Forecast
// ────────────────────────────────────────────────────────────

/**
 * Generate a weather-driven insect-pest forecast for the active crops.
 * Mirrors generateDiseaseForecast's shape: per-pest assessment with risk,
 * level, contributing factors and actions, plus an overall favorability.
 *
 * @param {import('./types.js').WeatherData} weather
 * @param {import('./types.js').ActiveCrop[]} activeCrops
 * @returns {import('./types.js').PestForecast}
 */
export function generatePestForecast(weather, activeCrops) {
  const activeCropIds = new Set(activeCrops.map((c) => c.cropId));
  const relevantPests = PESTS.filter((p) => p.cropIds.some((cid) => activeCropIds.has(cid)));

  const todayMin = weather?.daily?.[0]?.tempMin ?? weather?.current?.temperature ?? 0;
  const todayRain = weather?.daily?.[0]?.precipitationSum ?? weather?.current?.precipitation ?? 0;

  const assessments = relevantPests.map((pest) => {
    const matchingCrops = activeCrops.filter((c) => pest.cropIds.includes(c.cropId));

    let maxRisk = 0;
    const contributing = [];

    for (const crop of matchingCrops) {
      const tempScore = scoreNightTemp(todayMin, pest);
      const drySpellScore = scoreDrySpell(todayRain, pest);
      const stageScore = scoreCropStage(crop.currentStage, pest);
      const risk = tempScore + drySpellScore + stageScore;

      if (risk > maxRisk) {
        maxRisk = risk;
        contributing.length = 0;
        if (tempScore > 20) contributing.push(`Warm night temp (${todayMin}°C) favors ${pest.name}`);
        if (drySpellScore > 15) contributing.push(`Dry conditions (${todayRain}mm rain) favor outbreak`);
        if (stageScore > 5) contributing.push(`Current crop stage (${crop.currentStage}) is vulnerable`);
      }
    }

    return {
      pest,
      risk: maxRisk,
      level: getRiskLevel(maxRisk),
      confidence: 72,
      contributingFactors: contributing,
      preventiveActions: pest.preventiveActions,
      curativeActions: pest.curativeActions,
    };
  });

  assessments.sort((a, b) => b.risk - a.risk);

  const overallFavorability =
    assessments.length > 0 ? Math.round(assessments.reduce((sum, a) => sum + a.risk, 0) / assessments.length) : 0;

  return {
    pests: assessments,
    overallFavorability,
    spreadRisk: getRiskLevel(overallFavorability),
    confidence: 72,
    modelLimitations: PEST_MODEL_LIMITATIONS,
  };
}

/** @returns {import('./types.js').PestInfo[]} */
export function getAllPests() {
  return PESTS;
}

/** @param {string} cropId @returns {import('./types.js').PestInfo[]} */
export function getPestsByCrop(cropId) {
  return PESTS.filter((p) => p.cropIds.includes(cropId));
}
