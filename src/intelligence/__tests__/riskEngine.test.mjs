// Risk Engine tests — asserts thresholds are externalized to config,
// confidence scheme is honest (returns limitations), and risk levels
// map correctly.
import { computeRiskDashboard, getRiskLevel, RISK_THRESHOLDS } from "../riskEngine.js";

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

// 1. Risk level bands
assert(getRiskLevel(0) === "low", "0 → low");
assert(getRiskLevel(25) === "low", "25 → low");
assert(getRiskLevel(26) === "moderate", "26 → moderate");
assert(getRiskLevel(50) === "moderate", "50 → moderate");
assert(getRiskLevel(51) === "high", "51 → high");
assert(getRiskLevel(75) === "high", "75 → high");
assert(getRiskLevel(76) === "very_high", "76 → very_high");
assert(getRiskLevel(100) === "very_high", "100 → very_high");

// 2. Thresholds are externalized (not inline magic numbers)
assert(RISK_THRESHOLDS.disease.humidityVeryHigh === 85, "disease.humidityVeryHigh externalized");
assert(RISK_THRESHOLDS.disease.humidityVeryHighScore === 30, "disease.humidityVeryHighScore externalized");
assert(RISK_THRESHOLDS.spray.windHigh === 20, "spray.windHigh externalized");
assert(RISK_THRESHOLDS.levelBands.low === 25, "levelBands.low externalized");
assert(RISK_THRESHOLDS.waterlogging.clayBoost === 10, "waterlogging.clayBoost externalized");

// 3. Build a stub weather + crop
const stubWeather = {
  current: {
    temperature: 27,
    humidity: 92,
    windSpeed: 5,
    windGusts: 10,
    precipitation: 3,
    precipitationProbability: 70,
    cloudCover: 80,
    visibility: 5,
    uvIndex: 4,
    dewPoint: 24,
    pressure: 1010,
    weatherCode: 3,
    isDay: true,
    feelsLike: 30,
  },
  hourly: Array.from({ length: 24 }, (_, i) => ({
    time: `2026-11-18T${String(i).padStart(2, "0")}:00`,
    temperature: 27,
    humidity: 92,
    windSpeed: 5,
    precipitation: 0.1,
    precipitationProbability: 70,
    cloudCover: 80,
    uvIndex: 4,
    dewPoint: 24,
    weatherCode: 3,
    pressure: 1010,
    visibility: 5,
    feelsLike: 30,
    windDirection: 0,
  })),
  daily: Array.from({ length: 7 }, (_, i) => ({
    date: `2026-11-${String(18 + i).padStart(2, "0")}`,
    weatherCode: 3,
    tempMax: 30,
    tempMin: 22,
    tempApparentMax: 32,
    tempApparentMin: 20,
    sunrise: "",
    sunset: "",
    precipitationSum: 5,
    precipitationProbabilityMax: 70,
    windSpeedMax: 10,
    windGustsMax: 15,
    windDirectionDominant: 0,
    uvIndexMax: 6,
    et0Sum: 4,
    growingDegreeDays: 16,
  })),
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

// 4. computeRiskDashboard returns 14 risks with modelLimitations
const dash = computeRiskDashboard(stubWeather, [stubCrop]);
assert(dash.risks.length === 14, `14 risks (got ${dash.risks.length})`);
assert(
  dash.risks.every((r) => Array.isArray(r.modelLimitations) && r.modelLimitations.length > 0),
  "every risk has modelLimitations",
);
assert(typeof dash.overallRiskScore === "number", "overallRiskScore is a number");
assert(["low", "moderate", "high", "very_high"].includes(dash.overallRiskLevel), "overallRiskLevel valid");

// 5. Disease risk should be elevated (humidity 92%, leafWetness 12h, temp 27°C in 20-30 band)
const disease = dash.risks.find((r) => r.category === "disease");
assert(disease.score > 25, `disease score > 25 with favorable conditions (got ${disease.score})`);

// 6. Confidence is honest — capped modestly (≤ 82), not the inverted 60-92
const heat = dash.risks.find((r) => r.category === "heat_stress");
assert(heat.confidence <= 82, `confidence capped at 82 (got ${heat.confidence})`);
assert(heat.confidence >= 50, `confidence floor 50 (got ${heat.confidence})`);

console.log(`\nriskEngine.test: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
