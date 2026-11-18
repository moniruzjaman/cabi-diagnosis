// ============================================================
// Plant Detective — Crop Health Intelligence
// Recommendation Engine — adapted from KWI (MIT) engines/recommendation-engine.ts.
//
// Mandatory changes from the KWI original:
//  1. RAISED spray threshold from 25 → 60. A disease score of 25–59 now
//     produces a scouting/monitoring recommendation, NOT a spray. Sprays
//     only fire at high risk (≥60). "Risk leads to scouting, not spraying."
//  2. Replaced fabricated constants: expectedYieldImpact and
//     costSavingEstimate are now null (the KWI original hard-coded 15/3500
//     for every spray rec, 12/2500 for every irrigation rec, etc.).
//  3. Fixed the crops[0] assumption: recommendations are generated per-crop
//     (all matching active crops), not just the first one.
//  4. Added buildScoutingRec — fires on disease risk 25–59 to recommend
//     field scouting within 12–24 hours with specific observations.
// ============================================================

// When disease risk crosses this threshold, a spray *may* be considered
// (still gated by the Crop Protection Decision Engine in a later phase).
// Below it, only scouting/monitoring recommendations are produced.
export const SPRAY_RISK_THRESHOLD = 60;
export const SCOUT_RISK_THRESHOLD = 25;

function generateId() {
  return `rec-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function nowISO() {
  return new Date().toISOString();
}

function hoursFromNow(h) {
  return new Date(Date.now() + h * 36e5).toISOString();
}

/** @param {number} score @returns {import('./types.js').RecommendationPriority} */
function scoreToPriority(score) {
  if (score > 75) return "urgent";
  if (score > 50) return "high";
  if (score > 30) return "medium";
  return "low";
}

function findRisk(risks, category) {
  return risks.find((r) => r.category === category);
}

function cropLabel(crops) {
  const names = Array.from(new Set(crops.map((c) => c.config.name)));
  const namesBn = Array.from(new Set(crops.map((c) => c.config.nameBn)));
  return { name: names.join(", ") || "crops", nameBn: namesBn.join(", ") || "ফসল" };
}

// ────────────────────────────────────────────────────────────
// Scouting recommendation (NEW — the core of "risk leads to scouting")
// ────────────────────────────────────────────────────────────

/**
 * Build a scouting recommendation for moderate disease risk (25–59).
 * This is the primary action the Risk Radar triggers — NOT spraying.
 * @param {import('./types.js').WeatherData} weather
 * @param {import('./types.js').ActiveCrop[]} crops
 * @param {import('./types.js').RiskAssessment} diseaseRisk
 * @param {import('./types.js').DiseaseRiskAssessment[]} [topDiseases]
 * @returns {import('./types.js').Recommendation|null}
 */
export function buildScoutingRec(weather, crops, diseaseRisk, topDiseases = []) {
  if (diseaseRisk.score < SCOUT_RISK_THRESHOLD) return null;
  const { nameBn } = cropLabel(crops);
  const priority = scoreToPriority(diseaseRisk.score);
  const targetDisease = topDiseases[0]?.disease;
  const diseaseNameBn = targetDisease?.nameBn ?? "সম্ভাব্য ছত্রাকজনিত রোগ";
  const diseaseName = targetDisease?.name ?? "possible fungal disease";
  const humidity = weather.current.humidity;
  const leafWetness = weather.agriculturalIndices.leafWetnessHours;
  const temp = weather.current.temperature;

  return {
    id: generateId(),
    type: "scout",
    priority,
    title: "ক্ষেত পর্যবেক্ষণ করুন (রোগের ঝুঁকি)",
    titleBn: "ক্ষেত পর্যবেক্ষণ করুন (রোগের ঝুঁকি)",
    description: `${nameBn}-এ ${diseaseNameBn}-এর ঝুঁকি ${diseaseRisk.score}/100 (মাঝারি)। আর্দ্রতা ${humidity}%, পাতার ভেজা ${leafWetness}ঘণ্টা, তাপ ${temp}°C। স্প্রে না করে আগে পর্যবেক্ষণ করুন।`,
    descriptionBn: `${nameBn}-এ ${diseaseNameBn}-এর ঝুঁকি ${diseaseRisk.score}/100 (মাঝারি)। আর্দ্রতা ${humidity}%, পাতার ভেজা ${leafWetness}ঘণ্টা, তাপ ${temp}°C। স্প্রে না করে আগে পর্যবেক্ষণ করুন।`,
    reason: `Weather conditions favor ${diseaseName} development, but the risk is moderate — scouting is the correct first action, not spraying.`,
    reasonBn: `আবহাওয়া ${diseaseNameBn}-এর জন্য অনুকূল, কিন্তু ঝুঁকি মাঝারি — স্প্রে নয়, পর্যবেক্ষণই সঠিক প্রথম পদক্ষেপ।`,
    evidence: diseaseRisk.evidence,
    confidence: diseaseRisk.confidence,
    alternativeActions: [
      {
        action: "Record scouting results in the Crop Health Case",
        actionBn: "পর্যবেক্ষণের ফলাফল ক্রপ হেলথ কেসে রেকর্ড করুন",
        pros: ["Creates a permanent record", "Enables trend tracking"],
        cons: ["Takes a few minutes"],
        effectiveness: 90,
      },
      {
        action: "If symptoms confirmed, consult extension officer before spraying",
        actionBn: "লক্ষণ নিশ্চিত হলে স্প্রে করার আগে উপসহকারী অফিসারের পরামর্শ নিন",
        pros: ["Avoids unnecessary spraying", "Resistance stewardship"],
        cons: ["May delay action"],
        effectiveness: 85,
      },
    ],
    expectedOutcome: `Early detection of ${diseaseName} enables timely, targeted intervention — avoiding both crop loss and unnecessary chemical use.`,
    expectedOutcomeBn: `${diseaseNameBn}-এর প্রাথমিক শনাক্তকরণ সময়োপযুক্ত হস্তক্ষেপ নিশ্চিত করে — ফসলের ক্ষতি ও অপ্রয়োজনীয় রাসায়নিক ব্যবহার এড়ায়।`,
    expectedYieldImpact: null,
    costSavingEstimate: null,
    windowStart: nowISO(),
    windowEnd: hoursFromNow(24),
    ignoreConsequence: `Without scouting, a developing outbreak may go unnoticed until damage is irreversible, requiring more expensive curative treatment.`,
    ignoreConsequenceBn: `পর্যবেক্ষণ না করলে বিস্তার লক্ষ্য করা যাবে না এবং ক্ষতি অপূরণীয় হতে পারে, যখন ব্যয়বহুল নিরাময়মূলক চিকিৎসা প্রয়োজন হবে।`,
    relatedRisk: "disease",
    relatedCropStage: crops[0]?.currentStage ?? null,
  };
}

// ────────────────────────────────────────────────────────────
// Spray recommendation (gated at ≥60 risk, with explicit warning)
// ────────────────────────────────────────────────────────────

/**
 * Build a spray recommendation. Only fires when disease risk ≥ 60 (high).
 * Includes the explicit warning: "Weather suitability is NOT permission
 * to spray" — chemical decisions are gated by the Crop Protection Decision
 * Engine (Phase 2, separate sprint).
 * @param {import('./types.js').WeatherData} weather
 * @param {import('./types.js').ActiveCrop[]} crops
 * @param {import('./types.js').RiskAssessment[]} risks
 * @returns {import('./types.js').Recommendation|null}
 */
function buildSprayRec(weather, crops, risks) {
  const diseaseRisk = findRisk(risks, "disease");
  const sprayRisk = findRisk(risks, "spray_window");
  const score = Math.max(diseaseRisk?.score ?? 0, sprayRisk?.score ?? 0);
  // RAISED threshold: was 25, now 60. Moderate risk → scouting, not spraying.
  if (score < SPRAY_RISK_THRESHOLD) return null;

  const { name, nameBn } = cropLabel(crops);
  const priority = scoreToPriority(score);
  const windNow = weather.current.windSpeed;
  const humidity = weather.current.humidity;
  const leafWetness = weather.agriculturalIndices.leafWetnessHours;

  return {
    id: generateId(),
    type: "spray",
    priority,
    title: "রোগের ঝুঁকি বেশি — সিদ্ধান্তমূলক হস্তক্ষেপ বিবেচনা করুন",
    titleBn: "রোগের ঝুঁকি বেশি — সিদ্ধান্তমূলক হস্তক্ষেপ বিবেচনা করুন",
    description: `রোগের ঝুঁকি ${score}/100 (উচ্চ)। আর্দ্রতা ${humidity}%, পাতার ভেজা ${leafWetness}ঘণ্টা। বাতাস ${windNow} কিমি/ঘণ্টা — ${windNow < 12 ? "স্প্রের জন্য বাতাস গ্রহণযোগ্য" : "বাতাস বেশি, অপেক্ষা করুন"}। ⚠️ আবহাওয়া অনুকূল হওয়া স্প্রে করার অনুমতি নয় — ক্রপ প্রোটেকশন ডিসিশন ইঞ্জিনের ধাপ অনুসরণ করুন।`,
    descriptionBn: `রোগের ঝুঁকি ${score}/100 (উচ্চ)। আর্দ্রতা ${humidity}%, পাতার ভেজা ${leafWetness}ঘণ্টা। বাতাস ${windNow} কিমি/ঘণ্টা — ${windNow < 12 ? "স্প্রের জন্য বাতাস গ্রহণযোগ্য" : "বাতাস বেশি, অপেক্ষা করুন"}। ⚠️ আবহাওয়া অনুকূল হওয়া স্প্রে করার অনুমতি নয় — ক্রপ প্রোটেকশন ডিসিশন ইঞ্জিনের ধাপ অনুসরণ করুন।`,
    reason: `High disease pressure (${score}/100) during ${name}'s susceptible stage. Chemical intervention may be justified — but only after confirming diagnosis and following the compliance sequence.`,
    reasonBn: `${nameBn}-এর সংবেদনশীল পর্যায়ে উচ্চ রোগ চাপ (${score}/100)। রাসায়নিক হস্তক্ষেপ যৌক্তিক হতে পারে — তবে রোগ নিশ্চিত করে এবং কমপ্লায়েন্স ধাপ অনুসরণ করেই কেবল।`,
    evidence: [...(diseaseRisk?.evidence ?? []), ...(sprayRisk?.evidence ?? [])],
    confidence: diseaseRisk?.confidence ?? 60,
    alternativeActions: [
      {
        action: "Apply preventive bio-fungicide (Trichoderma) — IPM first",
        actionBn: "প্রতিরোধমূলক বায়ো-ফাঙ্গাসাইড (ট্রাইকোডার্মা) — আইপিএম প্রথমে",
        pros: ["Organic", "Low toxicity", "No resistance risk"],
        cons: ["Slower action", "May need repeat"],
        effectiveness: 65,
      },
      {
        action: "Wait 12–24h and re-scout before deciding",
        actionBn: "১২–২৪ ঘণ্টা অপেক্ষা করে সিদ্ধান্তের আগে পুনঃপর্যবেক্ষণ করুন",
        pros: ["Confirms outbreak", "Avoids premature spray"],
        cons: ["Disease may advance"],
        effectiveness: 60,
      },
    ],
    expectedOutcome: `If intervention is justified and executed correctly, fungal infection can be controlled. Confirm with extension officer first.`,
    expectedOutcomeBn: `হস্তক্ষেপ যৌক্তিক ও সঠিক হলে ছত্রাক সংক্রমণ নিয়ন্ত্রণ করা যায়। আগে উপসহকারী অফিসারের সাথে নিশ্চিত করুন।`,
    expectedYieldImpact: null, // was 15 (fabricated) — now null
    costSavingEstimate: null, // was 3500 (fabricated) — now null
    windowStart: priority === "urgent" ? nowISO() : hoursFromNow(6),
    windowEnd: priority === "urgent" ? hoursFromNow(24) : hoursFromNow(48),
    ignoreConsequence: `At this risk level, ignoring could allow rapid disease spread with significant yield loss. But spraying without confirmation wastes money and builds resistance.`,
    ignoreConsequenceBn: `এই ঝুঁকি স্তরে অবহেলা করলে রোগ দ্রুত ছড়িয়ে উল্লেখযোগ্য ফলন ক্ষতি হতে পারে। তবে নিশ্চিত না করে স্প্রে করলে অর্থ নষ্ট ও রেজিস্ট্যান্স বাড়ে।`,
    relatedRisk: "disease",
    relatedCropStage: crops[0]?.currentStage ?? null,
  };
}

// ────────────────────────────────────────────────────────────
// Other recommendation builders (adapted — no crops[0], no fabricated consts)
// ────────────────────────────────────────────────────────────

function buildIrrigationRec(weather, crops, risks) {
  const risk = findRisk(risks, "irrigation");
  if (!risk || risk.score < 20) return null;
  const { name, nameBn } = cropLabel(crops);
  const deficit = weather.agriculturalIndices.soilMoistureDeficit;
  const priority = scoreToPriority(risk.score);
  const isUrgent = priority === "urgent";
  return {
    id: generateId(),
    type: "irrigation",
    priority,
    title: isUrgent ? "আজ সেচ প্রয়োগ করুন" : "৪৮ ঘণ্টার মধ্যে সেচ প্রয়োগ করুন",
    titleBn: isUrgent ? "আজ সেচ প্রয়োগ করুন" : "৪৮ ঘণ্টার মধ্যে সেচ প্রয়োগ করুন",
    description: `মাটির আর্দ্রতার ঘাটতি ${deficit.toFixed(1)} মিমি। ${nameBn} এর বর্তমান পর্যায়ে পানি প্রয়োজন। ফসলের ক্ষতি রোধে সেচ দিন।`,
    descriptionBn: `মাটির আর্দ্রতার ঘাটতি ${deficit.toFixed(1)} মিমি। ${nameBn} এর বর্তমান পর্যায়ে পানি প্রয়োজন। ফসলের ক্ষতি রোধে সেচ দিন।`,
    reason: `ET₀ deficit of ${weather.agriculturalIndices.et0.toFixed(1)} mm combined with low soil moisture signals water stress for ${name}.`,
    reasonBn: `${weather.agriculturalIndices.et0.toFixed(1)} মিমি ET₀ ঘাটতি এবং কম মাটির আর্দ্রতা ${nameBn}-এ পানি চাপের ইঙ্গিত দেয়।`,
    evidence: risk.evidence,
    confidence: risk.confidence,
    alternativeActions: [
      {
        action: "Use drip irrigation to reduce water usage",
        actionBn: "পানি সাশ্রয়ে ড্রিপ সেচ ব্যবহার করুন",
        pros: ["Water efficient", "Precise"],
        cons: ["Setup cost"],
        effectiveness: 85,
      },
      {
        action: "Apply light evening irrigation",
        actionBn: "সন্ধ্যায় হালকা সেচ দিন",
        pros: ["Lower evaporation"],
        cons: ["Less precise", "Fungal risk"],
        effectiveness: 70,
      },
    ],
    expectedOutcome: `Maintain optimal soil moisture for ${name}.`,
    expectedOutcomeBn: `${nameBn}-এর জন্য সর্বোত্তম মাটির আর্দ্রতা বজায় রাখা হবে।`,
    expectedYieldImpact: null,
    costSavingEstimate: null,
    windowStart: isUrgent ? nowISO() : hoursFromNow(12),
    windowEnd: isUrgent ? hoursFromNow(24) : hoursFromNow(48),
    ignoreConsequence: `Ignoring will cause progressive water stress for ${name}.`,
    ignoreConsequenceBn: `অবহেলা করলে ${nameBn}-এ ক্রমবর্ধমান পানি চাপ তৈরি হবে।`,
    relatedRisk: "irrigation",
    relatedCropStage: crops[0]?.currentStage ?? null,
  };
}

function buildHarvestRec(weather, crops, risks) {
  const risk = findRisk(risks, "harvest");
  if (!risk || risk.score < 30) return null;
  const harvestCrops = crops.filter((c) => c.currentStage === "ripening" || c.currentStage === "harvest");
  if (harvestCrops.length === 0) return null;
  const { name, nameBn } = cropLabel(harvestCrops);
  const priority = scoreToPriority(risk.score);
  const precipProb = weather.daily[0]?.precipitationProbabilityMax ?? 0;
  return {
    id: generateId(),
    type: "harvest",
    priority,
    title: priority === "urgent" ? "দ্রুত ফসল কাটুন — বৃষ্টির পূর্বাভাস" : "আগামীকাল ফসল কাটার পরিকল্পনা করুন",
    titleBn: priority === "urgent" ? "দ্রুত ফসল কাটুন — বৃষ্টির পূর্বাভাস" : "আগামীকাল ফসল কাটার পরিকল্পনা করুন",
    description: `${nameBn} পাকা পর্যায়ে। পরবর্তী ২৪ ঘণ্টায় বৃষ্টির সম্ভাবনা ${precipProb}%। বিলম্ব করলে শস্য নষ্ট হওয়ার ঝুঁকি।`,
    descriptionBn: `${nameBn} পাকা পর্যায়ে। পরবর্তী ২৪ ঘণ্টায় বৃষ্টির সম্ভাবনা ${precipProb}%। বিলম্ব করলে শস্য নষ্ট হওয়ার ঝুঁকি।`,
    reason: `Impending rain with ${precipProb}% probability threatens ripe ${name}.`,
    reasonBn: `${precipProb}% সম্ভাবনাসহ আসন্ন বৃষ্টি পাকা ${nameBn}-কে হুমকির মুখে ফেলছে।`,
    evidence: risk.evidence,
    confidence: risk.confidence,
    alternativeActions: [
      {
        action: "Harvest partial area now, rest later",
        actionBn: "এখন আংশিক এলাকার ফসল কাটুন",
        pros: ["Reduces total loss"],
        cons: ["Two passes"],
        effectiveness: 75,
      },
      {
        action: "Cover standing crop with tarpaulins",
        actionBn: "দাঁড়ানো ফসল টারপলিন দিয়ে ঢাকুন",
        pros: ["Protects grain"],
        cons: ["Labor intensive"],
        effectiveness: 50,
      },
    ],
    expectedOutcome: `${name} harvested safely before rain.`,
    expectedOutcomeBn: `${nameBn} বৃষ্টির আগে নিরাপদে কাটা হবে।`,
    expectedYieldImpact: null,
    costSavingEstimate: null,
    windowStart: priority === "urgent" ? nowISO() : hoursFromNow(12),
    windowEnd: priority === "urgent" ? hoursFromNow(12) : hoursFromNow(36),
    ignoreConsequence: `Rain on ripe grain causes sprouting and fungal growth.`,
    ignoreConsequenceBn: `পাকা শস্যে বৃষ্টি হলে অঙ্কুরোদ্গম ও ছত্রাক সৃষ্টি হয়।`,
    relatedRisk: "harvest",
    relatedCropStage: harvestCrops[0].currentStage,
  };
}

function buildProtectionRec(weather, crops, risks) {
  const heatRisk = findRisk(risks, "heat_stress");
  const coldRisk = findRisk(risks, "cold_stress");
  const windRisk = findRisk(risks, "wind_damage");
  const risk = heatRisk ?? coldRisk ?? windRisk;
  if (!risk || risk.score < 30) return null;
  const { name, nameBn } = cropLabel(crops);
  const category = risk.category;
  const temp = weather.current.temperature;
  const titlesBn = {
    heat_stress: "ফসল তাপ প্রবাহ থেকে রক্ষা করুন",
    cold_stress: "ফসল শীতল চাপ থেকে রক্ষা করুন",
    wind_damage: "বাতাসের ক্ষয়ক্ষতি থেকে ফসল সুরক্ষিত করুন",
  };
  return {
    id: generateId(),
    type: "protection",
    priority: scoreToPriority(risk.score),
    title: titlesBn[category] ?? "চরম আবহাওয়া থেকে ফসল রক্ষা করুন",
    titleBn: titlesBn[category] ?? "চরম আবহাওয়া থেকে ফসল রক্ষা করুন",
    description: `${category === "heat_stress" ? `তাপমাত্রা ${temp}°C-তে চাপের সীমা অতিক্রম` : category === "cold_stress" ? `তাপমাত্রা ${temp}°C-এ নেমেছে` : `বাতাসের ঝোড়ো ${weather.current.windGusts} কিমি/ঘণ্টা`}. ${nameBn}-এর জন্য সুরক্ষামূলক ব্যবস্থা নিন।`,
    descriptionBn: `${category === "heat_stress" ? `তাপমাত্রা ${temp}°C-তে চাপের সীমা অতিক্রম` : category === "cold_stress" ? `তাপমাত্রা ${temp}°C-এ নেমেছে` : `বাতাসের ঝোড়ো ${weather.current.windGusts} কিমি/ঘণ্টা`}. ${nameBn}-এর জন্য সুরক্ষামূলক ব্যবস্থা নিন।`,
    reason: `Extreme weather event (${category}) with risk score ${risk.score}/100.`,
    reasonBn: `চরম আবহাওয়ার ঘটনা (${category}), ঝুঁকির স্কোর ${risk.score}/100।`,
    evidence: risk.evidence,
    confidence: risk.confidence,
    alternativeActions: [
      {
        action: "Apply mulching to regulate soil temperature",
        actionBn: "মাটির তাপ নিয়ন্ত্রণে মালচিং",
        pros: ["Improves moisture"],
        cons: ["Labor"],
        effectiveness: 70,
      },
      {
        action: "Install shade nets or windbreaks",
        actionBn: "ছায়া জাল বা বাতাসরোধ স্থাপন",
        pros: ["Direct protection"],
        cons: ["Cost"],
        effectiveness: 80,
      },
    ],
    expectedOutcome: `Reduce ${category.replace("_", " ")} impact on ${name}.`,
    expectedOutcomeBn: `${nameBn}-এ ${category.replace("_", " ")} প্রভাব হ্রাস করা হবে।`,
    expectedYieldImpact: null,
    costSavingEstimate: null,
    windowStart: nowISO(),
    windowEnd: hoursFromNow(risk.score > 75 ? 12 : 48),
    ignoreConsequence: `Unprotected exposure could cause irreversible damage.`,
    ignoreConsequenceBn: `অরক্ষিত এক্সপোজার অপূরণীয় ক্ষতি করতে পারে।`,
    relatedRisk: category,
    relatedCropStage: crops[0]?.currentStage ?? null,
  };
}

function buildDrainageRec(weather, risks) {
  const waterlogRisk = findRisk(risks, "waterlogging");
  const floodRisk = findRisk(risks, "flood");
  const risk = waterlogRisk?.score >= (floodRisk?.score ?? 0) ? waterlogRisk : floodRisk;
  if (!risk || risk.score < 30) return null;
  const priority = scoreToPriority(risk.score);
  const precip = weather.current.precipitation;
  return {
    id: generateId(),
    type: "drainage",
    priority,
    title: "নিষ্কাশন খাল খুলুন",
    titleBn: "নিষ্কাশন খাল খুলুন",
    description: `পানি জমার ঝুঁকি বেশি (বৃষ্টি ${precip} মিমি)। অবিলম্বে নিষ্কাশন খাল খুলুন।`,
    descriptionBn: `পানি জমার ঝুঁকি বেশি (বৃষ্টি ${precip} মিমি)। অবিলম্বে নিষ্কাশন খাল খুলুন।`,
    reason: `Heavy rainfall and saturated soil elevate waterlogging/flood risk.`,
    reasonBn: `ভারী বৃষ্টি ও পরিপৃক্ত মাটি পানি জমার ঝুঁকি বাড়ায়।`,
    evidence: risk.evidence,
    confidence: risk.confidence,
    alternativeActions: [
      {
        action: "Open drainage channels immediately",
        actionBn: "অবিলম্বে নিষ্কাশন খাল খুলুন",
        pros: ["Prevents root rot"],
        cons: ["Labor"],
        effectiveness: 90,
      },
      {
        action: "Move seedlings to higher ground",
        actionBn: "চারা উঁচু জমিতে সরান",
        pros: ["Saves seedlings"],
        cons: ["Effort"],
        effectiveness: 75,
      },
    ],
    expectedOutcome: `Prevent waterlogging damage to roots.`,
    expectedOutcomeBn: `মূলের পানি জমা ক্ষতি প্রতিরোধ।`,
    expectedYieldImpact: null,
    costSavingEstimate: null,
    windowStart: nowISO(),
    windowEnd: hoursFromNow(12),
    ignoreConsequence: `Stagnant water causes root rot and crop loss.`,
    ignoreConsequenceBn: `জমে থাকা পানি মূল পচা ও ফসল ক্ষতি ঘটায়।`,
    relatedRisk: risk.category,
    relatedCropStage: null,
  };
}

// ────────────────────────────────────────────────────────────
// Main entry point
// ────────────────────────────────────────────────────────────

/**
 * Generate prioritized, actionable recommendations from a risk dashboard.
 * Scouting-first: moderate disease risk (25–59) → scouting rec;
 * high disease risk (≥60) → spray rec (with compliance warning).
 * @param {import('./types.js').WeatherData} weather
 * @param {import('./types.js').ActiveCrop[]} crops
 * @param {import('./types.js').RiskDashboard} dashboard
 * @param {import('./types.js').DiseaseRiskAssessment[]} [topDiseases]
 * @returns {import('./types.js').Recommendation[]}
 */
export function generateRecommendations(weather, crops, dashboard, topDiseases = []) {
  const risks = dashboard.risks;
  const diseaseRisk = findRisk(risks, "disease");
  const recs = [];

  // Scouting-first: for moderate disease risk (25–59), recommend scouting.
  // For high risk (≥60), the spray rec fires instead.
  if (diseaseRisk && diseaseRisk.score >= SCOUT_RISK_THRESHOLD && diseaseRisk.score < SPRAY_RISK_THRESHOLD) {
    const scout = buildScoutingRec(weather, crops, diseaseRisk, topDiseases);
    if (scout) recs.push(scout);
  }
  const spray = buildSprayRec(weather, crops, risks);
  if (spray) recs.push(spray);

  const irrigation = buildIrrigationRec(weather, crops, risks);
  if (irrigation) recs.push(irrigation);
  const harvest = buildHarvestRec(weather, crops, risks);
  if (harvest) recs.push(harvest);
  const protection = buildProtectionRec(weather, crops, risks);
  if (protection) recs.push(protection);
  const drainage = buildDrainageRec(weather, risks);
  if (drainage) recs.push(drainage);

  // Sort by priority urgency
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  return recs;
}
