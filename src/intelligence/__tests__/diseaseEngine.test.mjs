// Disease Engine tests — asserts the inverted-confidence fix, structured
// thresholds parse correctly, the DB is expanded (≥14 diseases), and each
// disease carries a sources field.
import { generateDiseaseForecast, getAllDiseases, getDiseasesByCrop } from "../diseaseEngine.js";

let pass = 0,
  fail = 0;
function assert(cond, msg) {
  if (cond) {
    pass++;
  } else {
    fail++;
    console.error("FAIL:", msg);
  }
}

const stubWeather = {
  current: { temperature: 27, humidity: 92, windSpeed: 5, precipitation: 3, feelsLike: 30 },
  hourly: [],
  daily: [],
  agriculturalIndices: {
    et0: 4,
    gdd: 16,
    hni: 0,
    cni: 0,
    leafWetnessHours: 12,
    soilMoistureDeficit: 0,
    chillHours: 0,
    dewPoint: 24,
    vaporPressureDeficit: 0.5,
    solarRadiation: 100,
  },
  location: { latitude: 23.8, longitude: 90.4, name: "Dhaka", country: "BD" },
  fetchedAt: new Date().toISOString(),
};
const stubCrop = {
  cropId: "rice",
  currentStage: "tillering",
  config: {
    id: "rice",
    name: "Rice",
    nameBn: "ধান",
    growthStages: [
      {
        id: "tillering",
        name: "Tillering",
        nameBn: "গুলা",
        durationDays: 30,
        waterRequirementMm: 6,
        diseaseSusceptibility: 60,
        heatStressThreshold: 38,
        coldStressThreshold: 8,
        description: "",
        descriptionBn: "",
      },
    ],
    totalDurationDays: 120,
    baseTemperature: 10,
    optimalTempRange: [20, 30],
    icon: "",
    color: "",
  },
};

// 1. DB expanded to ≥ 14 diseases
const all = getAllDiseases();
assert(all.length >= 14, `DB has ≥ 14 diseases (got ${all.length})`);

// 2. Each disease has a sources field (even if ["uncited"])
assert(
  all.every((d) => Array.isArray(d.sources) && d.sources.length > 0),
  "every disease has sources[]",
);

// 3. Structured thresholds (no stringly-typed conditions)
assert(
  all.every((d) => d.favorabilityFactors.every((f) => typeof f.condition === "object" && f.condition.operator)),
  "every factor has structured condition",
);

// 4. Covers the host's top crops
assert(getDiseasesByCrop("rice").length >= 3, "rice has ≥ 3 diseases");
assert(getDiseasesByCrop("wheat").length >= 2, "wheat has ≥ 2 diseases");
assert(getDiseasesByCrop("potato").length >= 1, "potato has ≥ 1 disease");
assert(getDiseasesByCrop("tomato").length >= 1, "tomato has ≥ 1 disease");
assert(getDiseasesByCrop("chili").length >= 1, "chili has ≥ 1 disease");
assert(getDiseasesByCrop("jute").length >= 1, "jute has ≥ 1 disease");

// 5. Forecast with favorable conditions → high disease risk
const forecast = generateDiseaseForecast(stubWeather, [stubCrop]);
assert(forecast.diseases.length > 0, "forecast returns diseases for rice");
assert(
  forecast.overallFavorability > 20,
  `overall favorability > 20 with favorable conditions (got ${forecast.overallFavorability})`,
);

// 6. THE CRITICAL FIX: confidence is HIGHER for favorable conditions.
// With humidity 92% (near the >89% threshold) + temp 27°C (in 25-30 band) +
// leafWetness 12h (>8h threshold), rice_blast confidence should be ≥ 65.
const blast = forecast.diseases.find((d) => d.disease.id === "rice_blast");
assert(
  blast.confidence >= 65,
  `rice_blast confidence ≥ 65 with favorable conditions (got ${blast.confidence}) — inverted-formula fix verified`,
);

// 7. Confidence with UNfavorable conditions should be LOWER (the fix).
const unfavorableWeather = {
  ...stubWeather,
  current: { ...stubWeather.current, temperature: 40, humidity: 30, precipitation: 0 },
  agriculturalIndices: { ...stubWeather.agriculturalIndices, leafWetnessHours: 0 },
};
const unfavorableForecast = generateDiseaseForecast(unfavorableWeather, [stubCrop]);
const blastUnfav = unfavorableForecast.diseases.find((d) => d.disease.id === "rice_blast");
assert(
  blastUnfav.confidence < blast.confidence,
  `confidence lower with unfavorable conditions (${blastUnfav.confidence} < ${blast.confidence})`,
);
assert(blastUnfav.risk < blast.risk, `risk lower with unfavorable conditions (${blastUnfav.risk} < ${blast.risk})`);

// 8. Powdery mildew '70-85%' humidity band now parses (was silently 0 in KWI)
const wheatCrop = {
  cropId: "wheat",
  currentStage: "heading",
  config: {
    id: "wheat",
    name: "Wheat",
    nameBn: "গম",
    growthStages: [
      {
        id: "heading",
        name: "Heading",
        nameBn: "শির",
        durationDays: 20,
        waterRequirementMm: 4,
        diseaseSusceptibility: 70,
        heatStressThreshold: 35,
        coldStressThreshold: 5,
        description: "",
        descriptionBn: "",
      },
    ],
    totalDurationDays: 120,
    baseTemperature: 10,
    optimalTempRange: [15, 25],
    icon: "",
    color: "",
  },
};
const mildewWeather = {
  ...stubWeather,
  current: { ...stubWeather.current, temperature: 18, humidity: 78, precipitation: 0 },
  agriculturalIndices: { ...stubWeather.agriculturalIndices, leafWetnessHours: 6 },
};
const mildewForecast = generateDiseaseForecast(mildewWeather, [wheatCrop]);
const mildew = mildewForecast.diseases.find((d) => d.disease.id === "powdery_mildew");
assert(
  mildew.risk > 0,
  `powdery_mildew scores > 0 with 78% humidity in 70-85 band (got ${mildew.risk}) — structured-threshold fix verified`,
);

// 9. modelLimitations present on forecast
assert(
  Array.isArray(forecast.modelLimitations) && forecast.modelLimitations.length > 0,
  "forecast has modelLimitations",
);

console.log(`\ndiseaseEngine.test: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
