// ============================================================
// Plant Detective — Crop Health Intelligence
// Risk Radar — the orchestrator that wires weather → risk → disease →
// explanation → scouting action. This is the single entry point the
// RiskRadarWidget component calls.
//
// Safety gates:
//  - Risk score < 25 → info only, no alert
//  - Risk score 25–50 → scouting recommendation (monitoring), NOT spraying
//  - Risk score > 50 → high-risk alert + scouting + (separately) treatment
//  - Every result carries modelLimitations (never a calibrated probability)
//  - dataFreshness flag: weather >2h old → "stale"; null → "unavailable"
// ============================================================

import { computeRiskDashboard } from "./riskEngine.js";
import { generateDiseaseForecast } from "./diseaseEngine.js";
import { generatePestForecast } from "./pestEngine.js";
import { generateRecommendations, SCOUT_RISK_THRESHOLD } from "./recommendationEngine.js";
import { generateExplanation } from "./explanationEngine.js";
import { calculateOperationWindows } from "./operationWindows.js";

const STALE_WEATHER_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Assess weather data freshness.
 * @param {import('./types.js').WeatherData|null} weather
 * @returns {'current'|'stale'|'unavailable'}
 */
function assessFreshness(weather) {
  if (!weather || !weather.fetchedAt) return "unavailable";
  const age = Date.now() - new Date(weather.fetchedAt).getTime();
  if (age > STALE_WEATHER_MS) return "stale";
  return "current";
}

/**
 * Build a scouting action from the risk radar result.
 * @param {import('./types.js').RiskDashboard} dashboard
 * @param {import('./types.js').DiseaseForecast} forecast
 * @param {import('./types.js').ActiveCrop[]} crops
 * @returns {import('./types.js').Recommendation|null}
 */
function buildScoutingAction(dashboard, forecast, crops) {
  const diseaseRisk = dashboard.risks.find((r) => r.category === "disease");
  if (!diseaseRisk || diseaseRisk.score < SCOUT_RISK_THRESHOLD) return null;
  const topDiseases = forecast.diseases.slice(0, 3);
  // Reuse the recommendation engine's scouting builder.
  const recs = generateRecommendations(
    // weather is not needed here because the disease risk already encodes it;
    // pass a minimal stub for the description formatter.
    {
      current: { humidity: 0, temperature: 0, windSpeed: 0, precipitation: 0 },
      // soilMoistureDeficit/et0 are required by buildIrrigationRec when an
      // irrigation risk is present — the old stub crashed on dry weather.
      agriculturalIndices: { leafWetnessHours: 0, soilMoistureDeficit: 0, et0: 0 },
    },
    crops,
    dashboard,
    topDiseases,
  );
  return recs.find((r) => r.type === "scout") ?? null;
}

/**
 * Compute the full Risk Radar result for a case's crop + stage.
 *
 * @param {Object} input
 * @param {import('./types.js').WeatherData|null} input.weather
 * @param {import('./types.js').ActiveCrop[]} input.activeCrops
 * @returns {Object} RiskRadarResult
 */
export function computeRiskRadar({ weather, activeCrops }) {
  const dataFreshness = assessFreshness(weather);

  // If weather is unavailable, return an honest "unknown" result — do NOT
  // fabricate a risk score.
  if (dataFreshness === "unavailable" || !weather) {
    return {
      riskLevel: "unknown",
      overallRiskScore: null,
      topRisks: [],
      diseaseForecast: null,
      pestForecast: null,
      explanation: null,
      scoutingAction: null,
      dataFreshness: "unavailable",
      allRisks: [],
      modelLimitations: ["আবহাওয়ার তথ্য অনুপস্থিত — ঝুঁকি গণনা করা হয়নি।"],
      computedAt: new Date().toISOString(),
    };
  }

  const dashboard = computeRiskDashboard(weather, activeCrops);
  const forecast = generateDiseaseForecast(weather, activeCrops);
  // Pest forecast (ported protection-intelligence): insect pests are scored
  // by the opposite weather model (warm nights + dry spells).
  const pestForecast = generatePestForecast(weather, activeCrops);
  const topRisks = [...dashboard.risks].sort((a, b) => b.score - a.score).slice(0, 5);
  const scoutingAction = buildScoutingAction(dashboard, forecast, activeCrops);

  // Build an explanation for the top recommendation (scouting-first).
  const recommendations = generateRecommendations(weather, activeCrops, dashboard, forecast.diseases.slice(0, 3));
  const topRec = recommendations[0] ?? null;
  const explanation = topRec ? generateExplanation(topRec, weather, forecast.modelLimitations) : null;

  // Merge all model limitations from disease + pest forecasts + risk engine.
  const modelLimitations = [
    ...(forecast.modelLimitations || []),
    ...(pestForecast?.modelLimitations || []),
    ...(topRisks[0]?.modelLimitations || []),
  ];

  return {
    riskLevel: dashboard.overallRiskLevel,
    overallRiskScore: dashboard.overallRiskScore,
    risks: dashboard.risks,
    topRisks,
    allRisks: dashboard.risks,
    diseaseForecast: forecast,
    pestForecast,
    explanation,
    scoutingAction,
    recommendations,
    alerts: dashboard.alerts,
    operationWindows: calculateOperationWindows(weather, activeCrops),
    dataFreshness,
    modelLimitations: Array.from(new Set(modelLimitations)),
    computedAt: new Date().toISOString(),
  };
}

/**
 * A minimal ActiveCrop helper for callers that have a crop + stage but no
 * full CropConfig (e.g. from the host's cropHealthCases case model).
 * Builds a minimal config with sensible default stage thresholds.
 * @param {string} cropId
 * @param {string} cropNameBn
 * @param {import('./types.js').GrowthStageId} stage
 * @returns {import('./types.js').ActiveCrop}
 */
export function makeMinimalActiveCrop(cropId, cropNameBn, stage) {
  return {
    cropId,
    currentStage: stage,
    config: {
      id: cropId,
      name: cropId,
      nameBn: cropNameBn,
      growthStages: [
        {
          id: stage,
          name: stage,
          nameBn: stage,
          durationDays: 30,
          waterRequirementMm: 5,
          diseaseSusceptibility: 50,
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
}
