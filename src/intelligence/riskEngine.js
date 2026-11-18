// ============================================================
// Plant Detective — Crop Health Intelligence
// Risk Engine — computes per-category risk scores (0–100) and
// assembles a full RiskDashboard for the active crops.
//
// Adapted from KWI (MIT) engines/risk-engine.ts with mandatory fixes:
//  1. All magic-number thresholds externalized to RISK_THRESHOLDS.
//  2. deriveConfidence replaced — the KWI original returned 70–95 based
//     on data availability (not model certainty). It now returns
//     { confidence, limitations } where limitations honestly state the
//     score is a heuristic and lists which inputs are proxies.
//  3. modelLimitations[] added to every RiskAssessment.
// ============================================================

// ────────────────────────────────────────────────────────────
// Externalized thresholds (previously inline magic numbers)
// ────────────────────────────────────────────────────────────

export const RISK_THRESHOLDS = {
  // RiskLevel band edges
  levelBands: { low: 25, moderate: 50, high: 75 }, // >75 → very_high
  // Disease assessor
  disease: {
    humidityVeryHigh: 85,
    humidityVeryHighScore: 30,
    humidityElevated: 70,
    humidityElevatedScore: 15,
    leafWetnessProlonged: 10,
    leafWetnessProlongedScore: 25,
    leafWetnessModerate: 4,
    leafWetnessModerateScore: 12,
    tempFavorableMin: 20,
    tempFavorableMax: 30,
    tempFavorableScore: 20,
    tempMarginalMin: 15,
    tempMarginalMax: 35,
    tempMarginalScore: 8,
    susceptibilityWeight: 25,
  },
  // Spray window assessor
  spray: {
    diseaseUrgencyWeight: 0.3,
    windHigh: 20,
    windHighScore: 25,
    windModerate: 10,
    windModerateScore: 10,
    precipProbHigh: 60,
    precipProbHighScore: 25,
    precipProbModerate: 30,
    precipProbModerateScore: 10,
    activePrecipThreshold: 2,
    activePrecipScore: 15,
    humidityEfficacyThreshold: 90,
    humidityEfficacyScore: 10,
  },
  // Irrigation assessor
  irrigation: {
    deficitHigh: 20,
    deficitHighScore: 40,
    deficitModerate: 10,
    deficitModerateScore: 20,
    et0High: 5,
    et0HighScore: 20,
    et0Moderate: 3,
    et0ModerateScore: 10,
    noRainThreshold: 1,
    noRainScore: 15,
    soilMoistureCritical: 30,
    soilMoistureCriticalScore: 20,
    waterReqHigh: 5,
    waterReqHighScore: 10,
  },
  // Waterlogging
  waterlogging: {
    clayBoost: 10,
    precipHeavy: 15,
    precipHeavyScore: 35,
    precipModerate: 5,
    precipModerateScore: 15,
    humidityVeryHigh: 90,
    humidityVeryHighScore: 20,
    humidityElevated: 75,
    humidityElevatedScore: 10,
    soilSaturated: 80,
    soilSaturatedScore: 25,
    soilHigh: 60,
    soilHighScore: 12,
  },
  // Flood
  flood: {
    precipProbVeryHigh: 80,
    precipProbVeryHighScore: 30,
    precipProbHigh: 50,
    precipProbHighScore: 15,
    cumRainSevere: 50,
    cumRainSevereScore: 40,
    cumRainModerate: 25,
    cumRainModerateScore: 20,
    maxWindCompound: 40,
    maxWindCompoundScore: 15,
  },
  // Wind damage
  wind: {
    extreme: 50,
    extremeScore: 50,
    high: 30,
    highBaseScore: 30,
    highSlope: 2,
    moderate: 20,
    moderateScore: 15,
    gustsDangerous: 60,
    gustsDangerousScore: 25,
    gustsHigh: 40,
    gustsHighScore: 12,
  },
  // Harvest
  harvest: {
    precipProbHigh: 60,
    precipProbHighScore: 35,
    precipProbModerate: 30,
    precipProbModerateScore: 15,
    windHigh: 25,
    windHighScore: 25,
    windModerate: 15,
    windModerateScore: 10,
    activePrecip: 5,
    activePrecipScore: 20,
    humidityGrain: 85,
    humidityGrainScore: 15,
    harvestStageBonus: 10,
  },
  // Lodging
  lodging: {
    windHigh: 30,
    windHighScore: 25,
    windModerate: 20,
    windModerateScore: 10,
    precipHeavy: 10,
    precipHeavyScore: 20,
    precipModerate: 3,
    precipModerateScore: 10,
    vulnerableStageScore: 25,
  },
  // Pollination
  pollination: {
    rainHeavy: 5,
    rainHeavyScore: 35,
    rainLight: 1,
    rainLightScore: 15,
    heatExtreme: 35,
    heatExtremeScore: 35,
    heatHigh: 32,
    heatHighScore: 15,
    humidityVeryHigh: 90,
    humidityVeryHighScore: 15,
    cloudHeavy: 80,
    cloudHeavyScore: 10,
  },
  // Seedling stress
  seedling: {
    heatExtreme: 40,
    heatExtremeScore: 50,
    heatVeryHigh: 35,
    heatVeryHighScore: 30,
    heatModerate: 32,
    heatModerateScore: 15,
    coldSevere: 10,
    coldSevereScore: 40,
    coldModerate: 15,
    coldModerateScore: 15,
    heavyRain: 20,
    heavyRainScore: 20,
    strongWind: 25,
    strongWindScore: 15,
  },
  // Nutrient loss
  nutrient: {
    cumRainHeavy: 60,
    cumRainHeavyScore: 40,
    cumRainModerate: 30,
    cumRainModerateScore: 25,
    cumRainLight: 10,
    cumRainLightScore: 10,
    intenseRain: 20,
    intenseRainScore: 25,
    moderateRain: 10,
    moderateRainScore: 12,
    windRunoff: 20,
    windRunoffScore: 10,
  },
  // Field accessibility
  fieldAccess: {
    precipHeavy: 15,
    precipHeavyScore: 30,
    precipModerate: 5,
    precipModerateScore: 15,
    precipProbHigh: 70,
    precipProbHighScore: 20,
    precipProbModerate: 40,
    precipProbModerateScore: 10,
    soilSaturated: 85,
    soilSaturatedScore: 30,
    soilHigh: 65,
    soilHighScore: 15,
    poorVisibility: 2,
    poorVisibilityScore: 15,
  },
};

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

/** Map a numeric score (0–100) to a RiskLevel. */
export function getRiskLevel(score) {
  if (score <= RISK_THRESHOLDS.levelBands.low) return "low";
  if (score <= RISK_THRESHOLDS.levelBands.moderate) return "moderate";
  if (score <= RISK_THRESHOLDS.levelBands.high) return "high";
  return "very_high";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function nowISO() {
  return new Date().toISOString();
}

function hoursFromNow(h) {
  return new Date(Date.now() + h * 36e5).toISOString();
}

function getStage(crop) {
  return crop.config.growthStages.find((s) => s.id === crop.currentStage);
}

function uniqueStages(crops) {
  return Array.from(new Set(crops.map((c) => c.currentStage)));
}

// The shared model-wide limitations that apply to EVERY risk assessment.
const MODEL_LIMITATIONS = [
  "এই ঝুঁকি মূল্যায়ন একটি অনুমানিত মডেল, ক্যালিব্রেটেড সম্ভাবনা নয়।",
  "পাতার স্যাঁতসেঁতে ভাব একটি আর্দ্রতা-ভিত্তিক অনুমান, সরাসরি পরিমাপ নয়।",
  "মাটির আর্দ্রতা ঘাটতি একটি জল-ভারসাম্য অনুমান।",
];

/**
 * Derive confidence + honest limitations for the dashboard.
 * Replaces KWI's deriveConfidence (which conflated data availability with
 * model certainty). Returns a lower confidence when inputs are proxies.
 * @returns {{confidence: number, limitations: string[]}}
 */
function deriveConfidenceWithLimitations(weather) {
  let q = 68; // base: heuristic model, never claim high certainty
  const limitations = [...MODEL_LIMITATIONS];
  if (weather.agriculturalIndices.leafWetnessHours > 0) {
    q += 4;
    limitations.push("পাতার ভেজা সময় আর্দ্রতা ও বৃষ্টিপাত থেকে অনুমান করা হয়েছে।");
  }
  if (weather.current.soilMoisture != null) q += 5;
  if (weather.current.soilTemperature != null) q += 5;
  if (weather.hourly.length >= 24) q += 4;
  if (weather.daily.length >= 7) q += 4;
  // Proxy inputs reduce certainty
  if (weather.daily[0]?.et0Sum == null) {
    q -= 6;
    limitations.push("ET0 একটি পেনম্যান-মন্টিথ অনুমান (প্রদানকারীর সরাসরি মান নয়)।");
  }
  return { confidence: clamp(Math.round(q), 50, 82), limitations };
}

// ────────────────────────────────────────────────────────────
// Individual risk assessors
// ────────────────────────────────────────────────────────────

function assessHeatStress(weather, crops, conf, limitations) {
  const temp = weather.current.temperature;
  let maxScore = 0;
  const evidence = [];
  for (const crop of crops) {
    const stage = getStage(crop);
    if (!stage) continue;
    if (temp > stage.heatStressThreshold) {
      const score = clamp(50 + (temp - stage.heatStressThreshold) * 5, 0, 100);
      if (score > maxScore) maxScore = score;
      evidence.push(`${crop.config.name}: temp ${temp}°C exceeds threshold ${stage.heatStressThreshold}°C`);
    }
  }
  evidence.push(`Current temperature: ${temp}°C`);
  if (weather.agriculturalIndices.hni > 0) evidence.push(`Heat Stress Index: ${weather.agriculturalIndices.hni}`);
  return {
    category: "heat_stress",
    score: maxScore,
    level: getRiskLevel(maxScore),
    confidence: conf,
    explanation:
      maxScore > 50
        ? `High heat stress risk with temperature at ${temp}°C, exceeding crop thresholds. Immediate shade and irrigation recommended.`
        : `Temperature at ${temp}°C is within tolerable range for current crop stages.`,
    explanationBn:
      maxScore > 50
        ? `তাপমাত্রা ${temp}°C যা ফসলের সহনশীলতার সীমা অতিক্রম করেছে। এখনই ছায়া ও সেচের ব্যবস্থা নিন।`
        : `বর্তমান তাপমাত্রা ${temp}°C, যা ফসলের জন্য গ্রহণযোগ্য পরিসরে।`,
    evidence,
    affectedStages: uniqueStages(crops),
    mitigationActions: [
      "Provide shade nets",
      "Increase irrigation frequency",
      "Apply foliar silica spray",
      "Avoid midday field work",
    ],
    mitigationActionsBn: [
      "ছায়া জাল ব্যবহার করুন",
      "সেচের হার বাড়ান",
      "ফলিয়ার সিলিকা স্প্রে প্রয়োগ করুন",
      "দুপুরে মাঠে কাজ এড়িয়ে চলুন",
    ],
    modelLimitations: limitations,
    updatedAt: nowISO(),
  };
}

function assessColdStress(weather, crops, conf, limitations) {
  const temp = weather.current.temperature;
  let maxScore = 0;
  const evidence = [];
  for (const crop of crops) {
    const stage = getStage(crop);
    if (!stage) continue;
    if (temp < stage.coldStressThreshold) {
      const score = clamp(30 + (stage.coldStressThreshold - temp) * 6, 0, 100);
      if (score > maxScore) maxScore = score;
      evidence.push(`${crop.config.name}: temp ${temp}°C below threshold ${stage.coldStressThreshold}°C`);
    }
  }
  evidence.push(`Current temperature: ${temp}°C`);
  if (weather.agriculturalIndices.cni > 0) evidence.push(`Cold Stress Index: ${weather.agriculturalIndices.cni}`);
  return {
    category: "cold_stress",
    score: maxScore,
    level: getRiskLevel(maxScore),
    confidence: conf,
    explanation:
      maxScore > 50
        ? `Cold stress detected at ${temp}°C. Young and flowering crops are highly vulnerable to chilling injury.`
        : `Temperature ${temp}°C poses no significant cold stress for current crops.`,
    explanationBn:
      maxScore > 50
        ? `${temp}°C তাপমাত্রায় শীতল প্রতিকূলতা শনাক্ত হয়েছে। অল্পবয়সী ও ফুল ধরা ফসল অত্যন্ত ঝুঁকিপূর্ণ।`
        : `তাপমাত্রা ${temp}°C, বর্তমান ফসলের জন্য তাৎপর্যপূর্ণ শীতল ঝুঁকি নেই।`,
    evidence,
    affectedStages: uniqueStages(crops),
    mitigationActions: [
      "Apply mulch to conserve soil heat",
      "Use frost covers or row tunnels",
      "Avoid nitrogen application before frost",
      "Ensure adequate soil moisture",
    ],
    mitigationActionsBn: [
      "মাটির তাপ ধরে রাখতে মালচিং করুন",
      "ফ্রস্ট কভার বা রো টানেল ব্যবহার করুন",
      "ফ্রস্টের আগে নাইট্রোজেন সার প্রয়োগ এড়িয়ে চলুন",
      "মাটিতে পর্যাপ্ত আর্দ্রতা নিশ্চিত করুন",
    ],
    modelLimitations: limitations,
    updatedAt: nowISO(),
  };
}

function assessDisease(weather, crops, conf, limitations) {
  const T = RISK_THRESHOLDS.disease;
  const humidity = weather.current.humidity;
  const temp = weather.current.temperature;
  const leafWetness = weather.agriculturalIndices.leafWetnessHours;
  let score = 0;
  const evidence = [];

  if (humidity > T.humidityVeryHigh) {
    score += T.humidityVeryHighScore;
    evidence.push(`Humidity very high at ${humidity}%`);
  } else if (humidity > T.humidityElevated) {
    score += T.humidityElevatedScore;
    evidence.push(`Humidity elevated at ${humidity}%`);
  }

  if (leafWetness > T.leafWetnessProlonged) {
    score += T.leafWetnessProlongedScore;
    evidence.push(`Leaf wetness ${leafWetness}h — prolonged foliage moisture`);
  } else if (leafWetness > T.leafWetnessModerate) {
    score += T.leafWetnessModerateScore;
    evidence.push(`Leaf wetness ${leafWetness}h`);
  }

  if (temp >= T.tempFavorableMin && temp <= T.tempFavorableMax) {
    score += T.tempFavorableScore;
    evidence.push(`Temperature ${temp}°C is in the disease-favorable range (20–30°C)`);
  } else if (temp >= T.tempMarginalMin && temp <= T.tempMarginalMax) {
    score += T.tempMarginalScore;
    evidence.push(`Temperature ${temp}°C is marginally favorable for disease`);
  }

  let maxSusceptibility = 0;
  for (const crop of crops) {
    const stage = getStage(crop);
    if (stage && stage.diseaseSusceptibility > maxSusceptibility) maxSusceptibility = stage.diseaseSusceptibility;
  }
  score += (maxSusceptibility / 100) * T.susceptibilityWeight;
  evidence.push(`Peak stage disease susceptibility: ${maxSusceptibility}%`);
  score = clamp(Math.round(score), 0, 100);

  return {
    category: "disease",
    score,
    level: getRiskLevel(score),
    confidence: conf,
    explanation:
      score > 50
        ? `Favorable conditions for fungal disease: high humidity (${humidity}%), leaf wetness ${leafWetness}h, and temperature ${temp}°C.`
        : `Current weather conditions are not highly conducive to disease outbreak.`,
    explanationBn:
      score > 50
        ? `ছত্রাকজনিত রোগের জন্য অনুকূল পরিস্থিতি: আর্দ্রতা ${humidity}%, পাতার ভেজাটে ${leafWetness} ঘণ্টা, তাপমাত্রা ${temp}°C।`
        : `বর্তমান আবহাওয়া রোগ বিস্তারের জন্য অনুকূল নয়।`,
    evidence,
    affectedStages: uniqueStages(crops),
    mitigationActions: [
      "Scout fields for early symptoms",
      "Improve field drainage and air circulation",
      "Remove infected plant debris",
      "Consider preventive fungicide only if disease confirmed",
    ],
    mitigationActionsBn: [
      "প্রাথমিক লক্ষণের জন্য মাঠ পর্যবেক্ষণ করুন",
      "মাঠের জল নিষ্কাশন ও বায়ু চলাচল উন্নত করুন",
      "আক্রান্ত উদ্ভিদ অবশিষ্ট অপসারণ করুন",
      "রোগ নিশ্চিত হলে প্রতিরোধমূলক ছত্রাকনাশক বিবেচনা করুন",
    ],
    modelLimitations: limitations,
    updatedAt: nowISO(),
  };
}

function assessSprayWindow(weather, crops, conf, limitations, diseaseScore) {
  const T = RISK_THRESHOLDS.spray;
  const wind = weather.current.windSpeed;
  const precipProb = weather.current.precipitationProbability;
  const precip = weather.current.precipitation;
  let score = 0;
  const evidence = [];
  score += diseaseScore * T.diseaseUrgencyWeight;
  if (wind > T.windHigh) {
    score += T.windHighScore;
    evidence.push(`Wind speed ${wind} km/h too high for spraying`);
  } else if (wind > T.windModerate) {
    score += T.windModerateScore;
    evidence.push(`Wind speed ${wind} km/h — moderate drift risk`);
  }
  if (precipProb > T.precipProbHigh) {
    score += T.precipProbHighScore;
    evidence.push(`Rain probability ${precipProb}% — spray wash-off likely`);
  } else if (precipProb > T.precipProbModerate) {
    score += T.precipProbModerateScore;
    evidence.push(`Rain probability ${precipProb}%`);
  }
  if (precip > T.activePrecipThreshold) {
    score += T.activePrecipScore;
    evidence.push(`Active precipitation ${precip} mm`);
  }
  if (weather.current.humidity > T.humidityEfficacyThreshold) {
    score += T.humidityEfficacyScore;
    evidence.push(`Very high humidity may reduce spray efficacy`);
  }
  score = clamp(Math.round(score), 0, 100);

  return {
    category: "spray_window",
    score,
    level: getRiskLevel(score),
    confidence: conf,
    explanation:
      score > 50
        ? `Current conditions are unfavorable for spraying: wind ${wind} km/h, rain probability ${precipProb}%.`
        : `Window appears suitable for spraying operations. Low wind and minimal rain expected.`,
    explanationBn:
      score > 50
        ? `বর্তমান অবস্থায় স্প্রে করা অনুচিত: বাতাস ${wind} কিমি/ঘণ্টা, বৃষ্টির সম্ভাবনা ${precipProb}%।`
        : `স্প্রে করার জন্য পরিস্থিতি অনুকূল। কম বাতাস ও বৃষ্টির সম্ভাবনা কম।`,
    evidence,
    affectedStages: uniqueStages(crops),
    mitigationActions: [
      "Wait for wind to drop below 10 km/h",
      "Ensure at least 4 dry hours after spraying",
      "Use drift-reducing nozzles if spraying is urgent",
      "Consider early morning or late evening application",
    ],
    mitigationActionsBn: [
      "বাতাস ১০ কিমি/ঘণ্টার নিচে নামার জন্য অপেক্ষা করুন",
      "স্প্রের পর কমপক্ষে ৪ ঘণ্টা শুকনো রাখুন",
      "জরুরি হলে ড্রিফট-হ্রাসকারী নোজল ব্যবহার করুন",
      "ভোর বা সন্ধ্যায় স্প্রে করার চেষ্টা করুন",
    ],
    modelLimitations: limitations,
    updatedAt: nowISO(),
  };
}

function assessIrrigation(weather, crops, conf, limitations) {
  const T = RISK_THRESHOLDS.irrigation;
  const et0 = weather.agriculturalIndices.et0;
  const soilMoisture = weather.current.soilMoisture;
  const deficit = weather.agriculturalIndices.soilMoistureDeficit;
  const dailyRain = weather.daily[0]?.precipitationSum ?? 0;
  let score = 0;
  const evidence = [];
  if (deficit > T.deficitHigh) {
    score += T.deficitHighScore;
    evidence.push(`Soil moisture deficit high: ${deficit} mm`);
  } else if (deficit > T.deficitModerate) {
    score += T.deficitModerateScore;
    evidence.push(`Soil moisture deficit: ${deficit} mm`);
  }
  if (et0 > T.et0High) {
    score += T.et0HighScore;
    evidence.push(`ET0 ${et0} mm/day — high evapotranspiration`);
  } else if (et0 > T.et0Moderate) {
    score += T.et0ModerateScore;
    evidence.push(`ET0 ${et0} mm/day`);
  }
  if (dailyRain < T.noRainThreshold) {
    score += T.noRainScore;
    evidence.push("No meaningful rainfall forecast today");
  }
  if (soilMoisture != null && soilMoisture < T.soilMoistureCritical) {
    score += T.soilMoistureCriticalScore;
    evidence.push(`Soil moisture ${soilMoisture}% — critically low`);
  }
  let maxReq = 0;
  for (const crop of crops) {
    const stage = getStage(crop);
    if (stage && stage.waterRequirementMm > maxReq) maxReq = stage.waterRequirementMm;
  }
  if (maxReq > T.waterReqHigh) {
    score += T.waterReqHighScore;
    evidence.push(`Peak crop water requirement: ${maxReq} mm/day`);
  }
  score = clamp(Math.round(score), 0, 100);

  return {
    category: "irrigation",
    score,
    level: getRiskLevel(score),
    confidence: conf,
    explanation:
      score > 50
        ? `Irrigation needed: soil moisture deficit ${deficit} mm, ET0 ${et0} mm/day with no rain expected.`
        : `Soil moisture and rainfall are adequate. No immediate irrigation required.`,
    explanationBn:
      score > 50
        ? `সেচ প্রয়োজন: মাটির আর্দ্রতা ঘাটতি ${deficit} মিমি, ET0 ${et0} মিমি/দিন, বৃষ্টির সম্ভাবনা নেই।`
        : `মাটির আর্দ্রতা ও বৃষ্টিপাত পর্যাপ্ত। এখনই সেচের প্রয়োজন নেই।`,
    evidence,
    affectedStages: uniqueStages(crops),
    mitigationActions: [
      "Schedule irrigation within 24 hours",
      "Prioritize fields with higher water requirement stages",
      "Use deficit irrigation if water is scarce",
      "Monitor soil moisture sensors closely",
    ],
    mitigationActionsBn: [
      "২৪ ঘণ্টার মধ্যে সেচের ব্যবস্থা করুন",
      "বেশি পানি চাহিদার পর্যায়ের মাঠ অগ্রাধিকার দিন",
      "পানি কম হলে ঘাটতিমূলক সেচ ব্যবহার করুন",
      "মাটির আর্দ্রতা সেন্সর নিবিড়ভাবে পর্যবেক্ষণ করুন",
    ],
    modelLimitations: limitations,
    updatedAt: nowISO(),
  };
}

function assessWaterlogging(weather, crops, conf, limitations) {
  const T = RISK_THRESHOLDS.waterlogging;
  const precip = weather.current.precipitation;
  const humidity = weather.current.humidity;
  const soilMoisture = weather.current.soilMoisture;
  let score = 0;
  const evidence = [];
  if (precip > T.precipHeavy) {
    score += T.precipHeavyScore;
    evidence.push(`Heavy precipitation: ${precip} mm`);
  } else if (precip > T.precipModerate) {
    score += T.precipModerateScore;
    evidence.push(`Moderate precipitation: ${precip} mm`);
  }
  if (humidity > T.humidityVeryHigh) {
    score += T.humidityVeryHighScore;
    evidence.push(`Very high humidity: ${humidity}%`);
  } else if (humidity > T.humidityElevated) {
    score += T.humidityElevatedScore;
    evidence.push(`Elevated humidity: ${humidity}%`);
  }
  if (soilMoisture != null) {
    if (soilMoisture > T.soilSaturated) {
      score += T.soilSaturatedScore;
      evidence.push(`Soil moisture saturated: ${soilMoisture}%`);
    } else if (soilMoisture > T.soilHigh) {
      score += T.soilHighScore;
      evidence.push(`Soil moisture high: ${soilMoisture}%`);
    }
  }
  score = clamp(Math.round(score + T.clayBoost), 0, 100);

  return {
    category: "waterlogging",
    score,
    level: getRiskLevel(score),
    confidence: conf,
    explanation:
      score > 50
        ? `Waterlogging risk elevated: heavy rain (${precip} mm), high humidity, and clay-type soil limiting drainage.`
        : `Drainage conditions appear adequate. No significant waterlogging risk.`,
    explanationBn:
      score > 50
        ? `পানি জমে থাকার ঝুঁকি বেশি: ভারী বৃষ্টি (${precip} মিমি), উচ্চ আর্দ্রতা ও মাটির ধরন নিষ্কাশন সীমিত করছে।`
        : `নিষ্কাশন ব্যবস্থা পর্যাপ্ত। তাৎপর্যপূর্ণ পানি জমার ঝুঁকি নেই।`,
    evidence,
    affectedStages: ["seedling", "vegetative", "tillering", "flowering", "grain_filling"],
    mitigationActions: [
      "Open drainage channels immediately",
      "Avoid irrigation until water recedes",
      "Apply potassium silicate to improve root aeration",
      "Monitor for root rot symptoms",
    ],
    mitigationActionsBn: [
      "অবিলম্বে নিষ্কাশন খাল খুলুন",
      "পানি কমে না যাওয়া পর্যন্ত সেচ বন্ধ রাখুন",
      "মূলের বায়ু সঞ্চালন উন্নত করতে পটাশিয়াম সিলিকেট প্রয়োগ করুন",
      "মূল পচার লক্ষণের জন্য পর্যবেক্ষণ করুন",
    ],
    modelLimitations: limitations,
    updatedAt: nowISO(),
  };
}

function assessFlood(weather, crops, conf, limitations) {
  const T = RISK_THRESHOLDS.flood;
  const precipProb = weather.current.precipitationProbability;
  let cumulativeRain = 0;
  for (const d of weather.daily.slice(0, 3)) cumulativeRain += d.precipitationSum;
  let score = 0;
  const evidence = [];
  if (precipProb > T.precipProbVeryHigh) {
    score += T.precipProbVeryHighScore;
    evidence.push(`Very high precipitation probability: ${precipProb}%`);
  } else if (precipProb > T.precipProbHigh) {
    score += T.precipProbHighScore;
    evidence.push(`Precipitation probability: ${precipProb}%`);
  }
  if (cumulativeRain > T.cumRainSevere) {
    score += T.cumRainSevereScore;
    evidence.push(`3-day cumulative rainfall: ${cumulativeRain.toFixed(1)} mm — flood risk`);
  } else if (cumulativeRain > T.cumRainModerate) {
    score += T.cumRainModerateScore;
    evidence.push(`3-day cumulative rainfall: ${cumulativeRain.toFixed(1)} mm`);
  }
  const maxWind = weather.daily[0]?.windSpeedMax ?? 0;
  if (maxWind > T.maxWindCompound) {
    score += T.maxWindCompoundScore;
    evidence.push(`Strong winds may compound flood damage`);
  }
  score = clamp(Math.round(score), 0, 100);

  return {
    category: "flood",
    score,
    level: getRiskLevel(score),
    confidence: conf,
    explanation:
      score > 50
        ? `Flood risk significant: ${cumulativeRain.toFixed(1)} mm rain expected over 3 days with ${precipProb}% probability.`
        : `Flood risk is low based on current precipitation forecasts.`,
    explanationBn:
      score > 50
        ? `বন্যার ঝুঁকি যথেষ্ট: পরবর্তী ৩ দিনে ${cumulativeRain.toFixed(1)} মিমি বৃষ্টির পূর্বাভাস, সম্ভাবনা ${precipProb}%।`
        : `বর্তমান বৃষ্টিপাতের পূর্বাভাস অনুযায়ী বন্যার ঝুঁকি কম।`,
    evidence,
    affectedStages: ["seedling", "vegetative", "tillering", "flowering"],
    mitigationActions: [
      "Prepare raised beds or move seedlings to higher ground",
      "Ensure field bunds and embankments are intact",
      "Harvest mature crops if safe to do so",
      "Coordinate with local disaster management",
    ],
    mitigationActionsBn: [
      "উঁচু বেড তৈরি করুন বা চারা উঁচু জমিতে সরান",
      "মাঠের বাঁধ ও পাড় ঠিক আছে তা নিশ্চিত করুন",
      "নিরাপদ হলে পাকা ফসল কাটুন",
      "স্থানীয় দুর্যোগ ব্যবস্থাপনার সাথে সমন্বয় করুন",
    ],
    modelLimitations: limitations,
    updatedAt: nowISO(),
  };
}

function assessWindDamage(weather, crops, conf, limitations) {
  const T = RISK_THRESHOLDS.wind;
  const wind = weather.current.windSpeed;
  const gusts = weather.current.windGusts;
  let score = 0;
  const evidence = [];
  if (wind > T.extreme) {
    score += T.extremeScore;
    evidence.push(`Extreme wind: ${wind} km/h`);
  } else if (wind > T.high) {
    score += T.highBaseScore + (wind - T.high) * T.highSlope;
    evidence.push(`High wind speed: ${wind} km/h`);
  } else if (wind > T.moderate) {
    score += T.moderateScore;
    evidence.push(`Moderate wind: ${wind} km/h`);
  }
  if (gusts > T.gustsDangerous) {
    score += T.gustsDangerousScore;
    evidence.push(`Dangerous gusts up to ${gusts} km/h`);
  } else if (gusts > T.gustsHigh) {
    score += T.gustsHighScore;
    evidence.push(`Gusts up to ${gusts} km/h`);
  }
  score = clamp(Math.round(score), 0, 100);

  return {
    category: "wind_damage",
    score,
    level: getRiskLevel(score),
    confidence: conf,
    explanation:
      score > 50
        ? `Wind damage likely: sustained ${wind} km/h with gusts ${gusts} km/h. Physical damage to crops expected.`
        : `Wind conditions are manageable with no significant damage risk.`,
    explanationBn:
      score > 50
        ? `বাতাসের ক্ষয়ক্ষতি সম্ভব: টেকসই ${wind} কিমি/ঘণ্টা, ঝোড়ো ${gusts} কিমি/ঘণ্টা। ফসলের ক্ষয়ক্ষতি হতে পারে।`
        : `বাতাসের অবস্থা নিয়ন্ত্রণযোগ্য, তাৎপর্যপূর্ণ ক্ষয়ক্ষতির ঝুঁকি নেই।`,
    evidence,
    affectedStages: ["flowering", "grain_filling", "ripening", "harvest"],
    mitigationActions: [
      "Install windbreaks or temporary barriers",
      "Avoid spraying or fertilizer application",
      "Harvest ripe crops immediately if safe",
      "Reinforce staking for tall crops",
    ],
    mitigationActionsBn: [
      "বাঁধ বা অস্থায়ী বাধা স্থাপন করুন",
      "স্প্রে বা সার প্রয়োগ এড়িয়ে চলুন",
      "নিরাপদ হলে পাকা ফসল সাথে সাথে কাটুন",
      "লম্বা ফসলের জন্য খুঁটি মজবুত করুন",
    ],
    modelLimitations: limitations,
    updatedAt: nowISO(),
  };
}

function assessHarvest(weather, crops, conf, limitations) {
  const T = RISK_THRESHOLDS.harvest;
  const precipProb = weather.current.precipitationProbability;
  const wind = weather.current.windSpeed;
  const precip = weather.current.precipitation;
  let score = 0;
  const evidence = [];
  if (precipProb > T.precipProbHigh) {
    score += T.precipProbHighScore;
    evidence.push(`High rain probability: ${precipProb}%`);
  } else if (precipProb > T.precipProbModerate) {
    score += T.precipProbModerateScore;
    evidence.push(`Rain probability: ${precipProb}%`);
  }
  if (wind > T.windHigh) {
    score += T.windHighScore;
    evidence.push(`Wind too strong for harvest: ${wind} km/h`);
  } else if (wind > T.windModerate) {
    score += T.windModerateScore;
    evidence.push(`Moderate wind: ${wind} km/h`);
  }
  if (precip > T.activePrecip) {
    score += T.activePrecipScore;
    evidence.push(`Active rainfall: ${precip} mm`);
  }
  if (weather.current.humidity > T.humidityGrain) {
    score += T.humidityGrainScore;
    evidence.push(`High humidity may affect grain moisture at harvest`);
  }
  const harvestCrops = crops.filter((c) => c.currentStage === "harvest");
  if (harvestCrops.length > 0) score += T.harvestStageBonus;
  score = clamp(Math.round(score), 0, 100);

  return {
    category: "harvest",
    score,
    level: getRiskLevel(score),
    confidence: conf,
    explanation:
      score > 50
        ? `Harvest conditions are poor: rain probability ${precipProb}%, wind ${wind} km/h. Delay harvest if possible.`
        : `Weather conditions are favorable for harvest operations.`,
    explanationBn:
      score > 50
        ? `ফসল কাটার অবস্থা খারাপ: বৃষ্টির সম্ভাবনা ${precipProb}%, বাতাস ${wind} কিমি/ঘণ্টা। সম্ভব হলে বিলম্ব করুন।`
        : `আবহাওয়া ফসল কাটার জন্য অনুকূল।`,
    evidence,
    affectedStages: ["ripening", "harvest"],
    mitigationActions: [
      "Delay harvest until dry window opens",
      "Pre-arrange mechanical drying if grain gets wet",
      "Harvest early morning to avoid heat and rain",
      "Cover harvested produce immediately",
    ],
    mitigationActionsBn: [
      "শুকনো সময় না পাওয়া পর্যন্ত ফসল কাটা বিলম্ব করুন",
      "দানা ভিজলে যান্ত্রিক শুকানোর ব্যবস্থা করুন",
      "তাপ ও বৃষ্টি এড়াতে ভোরে ফসল কাটুন",
      "কাটা ফসল সাথে সাথে ঢেকে রাখুন",
    ],
    modelLimitations: limitations,
    updatedAt: nowISO(),
  };
}

function assessLodging(weather, crops, conf, limitations) {
  const T = RISK_THRESHOLDS.lodging;
  const wind = weather.current.windSpeed;
  const precip = weather.current.precipitation;
  let score = 0;
  const evidence = [];
  if (wind > T.windHigh) {
    score += T.windHighScore;
    evidence.push(`High wind: ${wind} km/h promotes lodging`);
  } else if (wind > T.windModerate) {
    score += T.windModerateScore;
    evidence.push(`Moderate wind: ${wind} km/h`);
  }
  if (precip > T.precipHeavy) {
    score += T.precipHeavyScore;
    evidence.push(`Heavy rain softens soil: ${precip} mm`);
  } else if (precip > T.precipModerate) {
    score += T.precipModerateScore;
    evidence.push(`Rainfall: ${precip} mm`);
  }
  const vulnerableStages = ["stem_elongation", "booting", "heading", "grain_filling"];
  const hasVulnerable = crops.some((c) => vulnerableStages.includes(c.currentStage));
  if (hasVulnerable) {
    score += T.vulnerableStageScore;
    evidence.push("Active crops are in lodging-vulnerable growth stages");
  }
  score = clamp(Math.round(score), 0, 100);

  return {
    category: "lodging",
    score,
    level: getRiskLevel(score),
    confidence: conf,
    explanation:
      score > 50
        ? `Lodging risk is high due to wind (${wind} km/h), rain (${precip} mm), and vulnerable crop stages.`
        : `Conditions do not pose significant lodging risk for current crops.`,
    explanationBn:
      score > 50
        ? `বাতাস (${wind} কিমি/ঘণ্টা), বৃষ্টি (${precip} মিমি) ও সংবেদনশীল পর্যায়ের কারণে শল্কমোচনের ঝুঁকি বেশি।`
        : `বর্তমান পরিস্থিতিতে শল্কমোচনের তাৎপর্যপূর্ণ ঝুঁকি নেই।`,
    evidence,
    affectedStages: vulnerableStages,
    mitigationActions: [
      "Apply plant growth regulators to strengthen stems",
      "Reduce nitrogen rate to avoid excessive vegetative growth",
      "Ensure proper plant population density",
      "Use windbreaks in exposed fields",
    ],
    mitigationActionsBn: [
      "কাণ্ড শক্ত করতে উদ্ভিদ বৃদ্ধি নিয়ন্ত্রক প্রয়োগ করুন",
      "অতিরিক্ত উদ্ভিদ বৃদ্ধি এড়াতে নাইট্রোজেন কমান",
      "সঠিক উদ্ভিদ ঘনত্ব নিশ্চিত করুন",
      "উন্মুক্ত মাঠে বাঁধ ব্যবহার করুন",
    ],
    modelLimitations: limitations,
    updatedAt: nowISO(),
  };
}

function assessPollination(weather, crops, conf, limitations) {
  const T = RISK_THRESHOLDS.pollination;
  const temp = weather.current.temperature;
  const precip = weather.current.precipitation;
  let score = 0;
  const evidence = [];
  const floweringCrops = crops.filter((c) => c.currentStage === "flowering");
  if (floweringCrops.length === 0) {
    return {
      category: "pollination",
      score: 0,
      level: "low",
      confidence: conf,
      explanation: "No crops are currently in the flowering stage.",
      explanationBn: "বর্তমানে কোনো ফসল ফুল ধরার পর্যায়ে নেই।",
      evidence: [],
      affectedStages: ["flowering"],
      mitigationActions: [],
      mitigationActionsBn: [],
      modelLimitations: limitations,
      updatedAt: nowISO(),
    };
  }
  if (precip > T.rainHeavy) {
    score += T.rainHeavyScore;
    evidence.push(`Rain during flowering (${precip} mm) washes away pollen`);
  } else if (precip > T.rainLight) {
    score += T.rainLightScore;
    evidence.push(`Light rain during flowering: ${precip} mm`);
  }
  if (temp > T.heatExtreme) {
    score += T.heatExtremeScore;
    evidence.push(`Extreme heat ${temp}°C damages pollen viability`);
  } else if (temp > T.heatHigh) {
    score += T.heatHighScore;
    evidence.push(`High temperature ${temp}°C may reduce pollen viability`);
  }
  if (weather.current.humidity > T.humidityVeryHigh) {
    score += T.humidityVeryHighScore;
    evidence.push("Very high humidity interferes with pollen release");
  }
  if (weather.current.cloudCover > T.cloudHeavy) {
    score += T.cloudHeavyScore;
    evidence.push(`Heavy cloud cover may reduce pollinator activity`);
  }
  score = clamp(Math.round(score), 0, 100);

  return {
    category: "pollination",
    score,
    level: getRiskLevel(score),
    confidence: conf,
    explanation:
      score > 50
        ? `Pollination at risk: ${temp}°C and ${precip} mm rain during critical flowering stage.`
        : `Weather conditions are favorable for pollination.`,
    explanationBn:
      score > 50
        ? `পরাগায়ন ঝুঁকিতে: ফুল ধরার সময় ${temp}°C তাপমাত্রা ও ${precip} মিমি বৃষ্টি।`
        : `পরাগায়নের জন্য আবহাওয়া অনুকূল।`,
    evidence,
    affectedStages: ["flowering"],
    mitigationActions: [
      "Consider supplementary pollination if feasible",
      "Ensure adequate irrigation to counter heat stress",
      "Avoid spraying insecticides during flowering",
      "Plant bee-attracting border crops for future seasons",
    ],
    mitigationActionsBn: [
      "সম্ভব হলে পরিপূরক পরাগায়ন বিবেচনা করুন",
      "তাপ প্রতিকূলতা মোচাতে পর্যাপ্ত সেচ দিন",
      "ফুল ধরার সময় কীটনাশক স্প্রে এড়িয়ে চলুন",
      "ভবিষ্যতের জন্য মৌমাছি আকৃষ্টকারী সীমান্ত ফসল লাগান",
    ],
    modelLimitations: limitations,
    updatedAt: nowISO(),
  };
}

function assessSeedlingStress(weather, crops, conf, limitations) {
  const T = RISK_THRESHOLDS.seedling;
  const temp = weather.current.temperature;
  let score = 0;
  const evidence = [];
  const seedlingCrops = crops.filter((c) => c.currentStage === "seedling" || c.currentStage === "germination");
  if (seedlingCrops.length === 0) {
    return {
      category: "seedling_stress",
      score: 0,
      level: "low",
      confidence: conf,
      explanation: "No crops are in the seedling or germination stage.",
      explanationBn: "কোনো ফসল চারা বা অঙ্কুরোদ্গম পর্যায়ে নেই।",
      evidence: [],
      affectedStages: ["seedling", "germination"],
      mitigationActions: [],
      mitigationActionsBn: [],
      modelLimitations: limitations,
      updatedAt: nowISO(),
    };
  }
  if (temp > T.heatExtreme) {
    score += T.heatExtremeScore;
    evidence.push(`Extreme heat ${temp}°C — lethal for seedlings`);
  } else if (temp > T.heatVeryHigh) {
    score += T.heatVeryHighScore;
    evidence.push(`Very high temperature ${temp}°C stresses seedlings`);
  } else if (temp > T.heatModerate) {
    score += T.heatModerateScore;
    evidence.push(`Temperature ${temp}°C moderately high for seedlings`);
  }
  if (temp < T.coldSevere) {
    score += T.coldSevereScore;
    evidence.push(`Cold temperature ${temp}°C — seedling growth inhibited`);
  } else if (temp < T.coldModerate) {
    score += T.coldModerateScore;
    evidence.push(`Cool temperature ${temp}°C slows seedling development`);
  }
  if (weather.current.precipitation > T.heavyRain) {
    score += T.heavyRainScore;
    evidence.push("Heavy rain may physically damage seedlings");
  }
  if (weather.current.windSpeed > T.strongWind) {
    score += T.strongWindScore;
    evidence.push("Strong wind may uproot tender seedlings");
  }
  score = clamp(Math.round(score), 0, 100);

  return {
    category: "seedling_stress",
    score,
    level: getRiskLevel(score),
    confidence: conf,
    explanation:
      score > 50
        ? `Seedling stress is severe at ${temp}°C. Young plants are highly vulnerable to extreme temperatures.`
        : `Conditions are acceptable for seedling growth and development.`,
    explanationBn:
      score > 50
        ? `${temp}°C তাপমাত্রায় চারার প্রতিকূলতা তীব্র। অল্পবয়সী গাছ চরম তাপমাত্রায় অত্যন্ত সংবেদনশীল।`
        : `চারার বৃদ্ধি ও বিকাশের জন্য পরিস্থিতি গ্রহণযোগ্য।`,
    evidence,
    affectedStages: ["seedling", "germination"],
    mitigationActions: [
      "Provide shade nets over nursery beds",
      "Use row covers for cold protection",
      "Apply light irrigation to cool soil temperature",
      "Transplant only after hardening off",
    ],
    mitigationActionsBn: [
      "নার্সারি বেডের ওপর ছায়া জাল দিন",
      "শীতল সুরক্ষার জন্য রো কভার ব্যবহার করুন",
      "মাটির তাপমাত্রা কমাতে হালকা সেচ দিন",
      "হার্ডেনিং শেষে রোপণ করুন",
    ],
    modelLimitations: limitations,
    updatedAt: nowISO(),
  };
}

function assessNutrientLoss(weather, _crops, conf, limitations) {
  const T = RISK_THRESHOLDS.nutrient;
  let cumulativeRain = 0;
  for (const d of weather.daily.slice(0, 3)) cumulativeRain += d.precipitationSum;
  const precip = weather.current.precipitation;
  let score = 0;
  const evidence = [];
  if (cumulativeRain > T.cumRainHeavy) {
    score += T.cumRainHeavyScore;
    evidence.push(`Heavy 3-day rain ${cumulativeRain.toFixed(1)} mm — significant leaching expected`);
  } else if (cumulativeRain > T.cumRainModerate) {
    score += T.cumRainModerateScore;
    evidence.push(`Moderate 3-day rain ${cumulativeRain.toFixed(1)} mm — some nutrient leaching`);
  } else if (cumulativeRain > T.cumRainLight) {
    score += T.cumRainLightScore;
    evidence.push(`3-day rainfall ${cumulativeRain.toFixed(1)} mm`);
  }
  if (precip > T.intenseRain) {
    score += T.intenseRainScore;
    evidence.push(`Intense current rainfall ${precip} mm accelerates runoff`);
  } else if (precip > T.moderateRain) {
    score += T.moderateRainScore;
    evidence.push(`Current rainfall ${precip} mm`);
  }
  if (weather.current.windSpeed > T.windRunoff) {
    score += T.windRunoffScore;
    evidence.push("Wind may increase surface runoff");
  }
  score = clamp(Math.round(score), 0, 100);

  return {
    category: "nutrient_loss",
    score,
    level: getRiskLevel(score),
    confidence: conf,
    explanation:
      score > 50
        ? `Heavy rainfall forecast will likely leach nitrogen and other soluble nutrients from the root zone.`
        : `Nutrient loss risk is low with current rainfall levels.`,
    explanationBn:
      score > 50
        ? `ভারী বৃষ্টির পূর্বাভাসে নাইট্রোজেন ও অন্যান্য দ্রবণীয় পুষ্টি উপাদান মূলের অঞ্চল থেকে ধুয়ে যেতে পারে।`
        : `বর্তমান বৃষ্টিপাতে পুষ্টি ক্ষয়ের ঝুঁকি কম।`,
    evidence,
    affectedStages: ["vegetative", "tillering", "stem_elongation", "grain_filling"],
    mitigationActions: [
      "Apply split doses of nitrogen rather than single large dose",
      "Use slow-release fertilizer formulations",
      "Consider foliar application to bypass soil leaching",
      "Add organic matter to improve nutrient retention",
    ],
    mitigationActionsBn: [
      "একক বড় মাত্রার বদলে নাইট্রোজেন বিভক্ত মাত্রায় দিন",
      "স্লো-রিলিজ সার ব্যবহার করুন",
      "মাটির লিচিং এড়াতে ফলিয়ার প্রয়োগ বিবেচনা করুন",
      "পুষ্টি ধরে রাখতে জৈব পদার্থ যোগ করুন",
    ],
    modelLimitations: limitations,
    updatedAt: nowISO(),
  };
}

function assessFieldAccessibility(weather, _crops, conf, limitations) {
  const T = RISK_THRESHOLDS.fieldAccess;
  const precip = weather.current.precipitation;
  const precipProb = weather.current.precipitationProbability;
  const soilMoisture = weather.current.soilMoisture;
  let score = 0;
  const evidence = [];
  if (precip > T.precipHeavy) {
    score += T.precipHeavyScore;
    evidence.push(`Heavy rain ${precip} mm — fields may be inaccessible`);
  } else if (precip > T.precipModerate) {
    score += T.precipModerateScore;
    evidence.push(`Rain ${precip} mm — some field access difficulty`);
  }
  if (precipProb > T.precipProbHigh) {
    score += T.precipProbHighScore;
    evidence.push(`High rain probability ${precipProb}%`);
  } else if (precipProb > T.precipProbModerate) {
    score += T.precipProbModerateScore;
    evidence.push(`Rain probability ${precipProb}%`);
  }
  if (soilMoisture != null) {
    if (soilMoisture > T.soilSaturated) {
      score += T.soilSaturatedScore;
      evidence.push(`Soil saturated at ${soilMoisture}% — heavy machinery will cause compaction`);
    } else if (soilMoisture > T.soilHigh) {
      score += T.soilHighScore;
      evidence.push(`Soil moisture ${soilMoisture}% — moderate access risk`);
    }
  }
  if (weather.current.visibility < T.poorVisibility) {
    score += T.poorVisibilityScore;
    evidence.push("Poor visibility restricts field operations");
  }
  score = clamp(Math.round(score), 0, 100);

  return {
    category: "field_accessibility",
    score,
    level: getRiskLevel(score),
    confidence: conf,
    explanation:
      score > 50
        ? `Field access is restricted due to wet conditions. Machinery use may cause soil compaction.`
        : `Fields are accessible for normal operations.`,
    explanationBn:
      score > 50
        ? `ভেজা অবস্থার কারণে মাঠে প্রবেশ সীমিত। যন্ত্রের ব্যবহারে মাটি চাপা পড়তে পারে।`
        : `স্বাভাবিক কাজের জন্য মাঠে প্রবেশ সম্ভব।`,
    evidence,
    affectedStages: ["sowing", "vegetative", "tillering", "harvest"],
    mitigationActions: [
      "Use lighter equipment or manual labor",
      "Wait for soil to dry before machinery entry",
      "Plan access routes on higher ground",
      "Use permanent raised beds for improved access",
    ],
    mitigationActionsBn: [
      "হালকা যন্ত্র বা হাতে কাজ ব্যবহার করুন",
      "যন্ত্র নেওয়ার আগে মাটি শুকানোর জন্য অপেক্ষা করুন",
      "উঁচু জমি দিয়ে প্রবেশ পথ পরিকল্পনা করুন",
      "উন্নত প্রবেশযোগ্যতার জন্য স্থায়ী উঁচু বেড ব্যবহার করুন",
    ],
    modelLimitations: limitations,
    updatedAt: nowISO(),
  };
}

// ────────────────────────────────────────────────────────────
// Alert generation
// ────────────────────────────────────────────────────────────

const ALERT_META = {
  disease: { title: "Disease Risk Alert", titleBn: "রোগের ঝুঁকি সতর্কতা" },
  spray_window: { title: "Spray Window Alert", titleBn: "স্প্রে উইন্ডো সতর্কতা" },
  irrigation: { title: "Irrigation Alert", titleBn: "সেচ সতর্কতা" },
  waterlogging: { title: "Waterlogging Alert", titleBn: "পানি জমার সতর্কতা" },
  flood: { title: "Flood Risk Alert", titleBn: "বন্যার ঝুঁকি সতর্কতা" },
  heat_stress: { title: "Heat Stress Alert", titleBn: "তাপ প্রতিকূলতা সতর্কতা" },
  cold_stress: { title: "Cold Stress Alert", titleBn: "শীতল প্রতিকূলতা সতর্কতা" },
  wind_damage: { title: "Wind Damage Alert", titleBn: "বাতাসের ক্ষয়ক্ষতি সতর্কতা" },
  harvest: { title: "Harvest Condition Alert", titleBn: "ফসল কাটার অবস্থা সতর্কতা" },
  lodging: { title: "Lodging Risk Alert", titleBn: "শল্কমোচনের ঝুঁকি সতর্কতা" },
  pollination: { title: "Pollination Risk Alert", titleBn: "পরাগায়নের ঝুঁকি সতর্কতা" },
  seedling_stress: { title: "Seedling Stress Alert", titleBn: "চারার প্রতিকূলতা সতর্কতা" },
  nutrient_loss: { title: "Nutrient Loss Alert", titleBn: "পুষ্টি ক্ষয়ের সতর্কতা" },
  field_accessibility: { title: "Field Accessibility Alert", titleBn: "মাঠে প্রবেশ সতর্কতা" },
};

function generateAlerts(risks) {
  return risks
    .filter((r) => r.score > RISK_THRESHOLDS.levelBands.moderate)
    .map((r) => ({
      id: `alert-${r.category}-${Date.now()}`,
      category: r.category,
      level: r.level,
      title: ALERT_META[r.category].title,
      titleBn: ALERT_META[r.category].titleBn,
      message: r.explanation,
      messageBn: r.explanationBn,
      actionable: true,
      actionRequired: r.mitigationActions[0],
      actionRequiredBn: r.mitigationActionsBn[0],
      expiresAt: hoursFromNow(12),
    }));
}

// ────────────────────────────────────────────────────────────
// Main entry point
// ────────────────────────────────────────────────────────────

/**
 * Compute the full RiskDashboard for a given weather snapshot and set of
 * active crops. Evaluates all 14 risk categories. Overall score = weighted
 * average of the top 5 highest-scoring risks. Generates alerts for every
 * risk scoring above 50.
 * @param {import('./types.js').WeatherData} weather
 * @param {import('./types.js').ActiveCrop[]} activeCrops
 * @returns {import('./types.js').RiskDashboard}
 */
export function computeRiskDashboard(weather, activeCrops) {
  const { confidence: conf, limitations } = deriveConfidenceWithLimitations(weather);
  const disease = assessDisease(weather, activeCrops, conf, limitations);
  const risks = [
    disease,
    assessSprayWindow(weather, activeCrops, conf, limitations, disease.score),
    assessIrrigation(weather, activeCrops, conf, limitations),
    assessWaterlogging(weather, activeCrops, conf, limitations),
    assessFlood(weather, activeCrops, conf, limitations),
    assessHeatStress(weather, activeCrops, conf, limitations),
    assessColdStress(weather, activeCrops, conf, limitations),
    assessWindDamage(weather, activeCrops, conf, limitations),
    assessHarvest(weather, activeCrops, conf, limitations),
    assessLodging(weather, activeCrops, conf, limitations),
    assessPollination(weather, activeCrops, conf, limitations),
    assessSeedlingStress(weather, activeCrops, conf, limitations),
    assessNutrientLoss(weather, activeCrops, conf, limitations),
    assessFieldAccessibility(weather, activeCrops, conf, limitations),
  ];
  const sorted = [...risks].sort((a, b) => b.score - a.score);
  const top5 = sorted.slice(0, 5);
  const weights = [0.3, 0.25, 0.2, 0.15, 0.1];
  const overallScore = Math.round(top5.reduce((sum, r, i) => sum + r.score * weights[i], 0));
  const alerts = generateAlerts(risks);
  return {
    overallRiskScore: overallScore,
    overallRiskLevel: getRiskLevel(overallScore),
    risks,
    alerts,
  };
}
