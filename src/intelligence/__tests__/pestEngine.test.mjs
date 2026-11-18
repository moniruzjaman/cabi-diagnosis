// ============================================================
// pestEngine.test — ported pest-forecast engine suite.
//
// Covers the directive scenarios:
//   - weather-driven pest scoring (warm night + dry spell + stage)
//   - opposite-of-disease model: rain SUPPRESSES pest risk
//   - no crop context → empty forecast (safe)
//   - unknown crop → empty forecast
//   - risk bounds 0-100 + level mapping
//   - economic thresholds carried as strings (never parsed)
//   - bilingual names + actions present
//   - IRAC stewardship mapping (moaDatabase integration)
// ============================================================

import { strict as assert } from "node:assert";
import { generatePestForecast, getAllPests, getPestsByCrop } from "../pestEngine.js";
import { getMoaCodesForPest, recommendNextMoaForPest, resolveMoaCode, getMoaGroup } from "../moaDatabase.js";
import { computeRiskRadar, makeMinimalActiveCrop } from "../riskRadar.js";

let passed = 0;
let failed = 0;
function ok(cond, msg) {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error("FAIL:", msg);
  }
}

// Weather fixture in the same shape riskRadar tests use.
function makeWeather({ tempMin = 25, rain = 0, humidity = 60 } = {}) {
  return {
    current: {
      temperature: 28,
      humidity,
      windSpeed: 5,
      precipitation: rain > 5 ? 10 : 0,
      feelsLike: 31,
      windDirection: 0,
      windGusts: 8,
      pressure: 1010,
      cloudCover: 40,
      visibility: 10,
      uvIndex: 5,
      dewPoint: 22,
      weatherCode: 1,
      precipitationProbability: 10,
    },
    hourly: Array.from({ length: 24 }, (_, i) => ({
      time: `2026-11-18T${String(i).padStart(2, "0")}:00`,
      temperature: 27,
      humidity,
      windSpeed: 5,
      precipitation: 0,
      precipitationProbability: 10,
      cloudCover: 40,
      uvIndex: 4,
      dewPoint: 22,
      weatherCode: 1,
      pressure: 1010,
      visibility: 10,
      feelsLike: 29,
      windDirection: 0,
    })),
    daily: Array.from({ length: 7 }, (_, i) => ({
      date: `2026-11-${String(18 + i).padStart(2, "0")}`,
      weatherCode: 1,
      tempMax: 31,
      tempMin,
      tempApparentMax: 33,
      tempApparentMin: 24,
      sunrise: "",
      sunset: "",
      precipitationSum: rain,
      precipitationProbabilityMax: 10,
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
      leafWetnessHours: 2,
      soilMoistureDeficit: 0,
      chillHours: 0,
      dewPoint: 22,
      vaporPressureDeficit: 0.8,
      solarRadiation: 100,
    },
    location: { latitude: 23.8, longitude: 90.4, name: "Dhaka", country: "BD" },
    fetchedAt: new Date().toISOString(),
  };
}

// 1. Warm + dry + tillering rice → high pest pressure with scored pests
{
  const f = generatePestForecast(makeWeather(), [makeMinimalActiveCrop("rice", "ধান", "tillering")]);
  ok(f.pests.length >= 4, `rice has ≥4 scored pests (got ${f.pests.length})`);
  ok(f.pests.every((p) => p.risk >= 0 && p.risk <= 100), "risks within 0-100");
  ok(f.pests[0].risk >= f.pests[f.pests.length - 1].risk, "pests sorted by risk desc");
  ok(f.overallFavorability > 40, `overall favorability high on warm+dry (${f.overallFavorability})`);
  ok(f.pests[0].pest.nameBn.length > 0, "bilingual name present");
}

// 2. OPPOSITE-OF-DISEASE model: heavy rain suppresses pest risk
{
  const dry = generatePestForecast(makeWeather({ rain: 0 }), [makeMinimalActiveCrop("rice", "ধান", "tillering")]);
  const wet = generatePestForecast(makeWeather({ rain: 40 }), [makeMinimalActiveCrop("rice", "ধান", "tillering")]);
  ok(
    wet.overallFavorability < dry.overallFavorability,
    `rain suppresses pests (dry ${dry.overallFavorability} > wet ${wet.overallFavorability})`,
  );
  // Cold nights also suppress (below minNightTempC)
  const cold = generatePestForecast(makeWeather({ tempMin: 15 }), [
    makeMinimalActiveCrop("rice", "ধান", "tillering"),
  ]);
  ok(
    cold.overallFavorability < dry.overallFavorability,
    `cold nights suppress pests (cold ${cold.overallFavorability} < warm ${dry.overallFavorability})`,
  );
}

// 3. No crops / unknown crop → empty, no crash
{
  const f = generatePestForecast(makeWeather(), []);
  ok(f.pests.length === 0, "no crops → empty forecast");
  ok(f.overallFavorability === 0, "no crops → 0 favorability");
  const f2 = generatePestForecast(makeWeather(), [makeMinimalActiveCrop("potato", "আলু", "vegetative")]);
  ok(f2.pests.length === 0, "potato (no pest DB entries) → empty forecast");
}

// 4. Economic thresholds carried as strings, disclosed not parsed
{
  const pests = getAllPests();
  ok(pests.length === 8, `8 pests ported (got ${pests.length})`);
  ok(pests.every((p) => typeof p.economicThreshold === "string" && p.economicThreshold.length > 0), "thresholds are non-empty strings");
  ok(getPestsByCrop("rice").length === 5, "5 rice pests");
  ok(getPestsByCrop("wheat").length === 1, "1 wheat pest (aphid)");
  ok(getPestsByCrop("jute").length === 2, "2 jute pests");
}

// 5. IRAC stewardship mapping (moaDatabase integration)
{
  const bph = getMoaCodesForPest("brown_planthopper");
  ok(bph.length >= 3, `BPH has ≥3 MoA options (got ${bph.length})`);
  ok(bph.includes("IRAC_16") && bph.includes("IRAC_15"), "BPH options include pymetrozine + buprofezin groups");
  const next = recommendNextMoaForPest("brown_planthopper", ["IRAC_16", "IRAC_15"]);
  ok(next && next.code === "IRAC_4A", `rotation picks unused group (got ${next?.code})`);
  ok(resolveMoaCode("Imidacloprid") === "IRAC_4A", "imidacloprid resolves to IRAC 4A");
  ok(resolveMoaCode("Cartap") === "IRAC_14", "cartap resolves to IRAC 14");
  ok(getMoaGroup("IRAC_28").pesticideClass === "insecticide", "diamide group is insecticide class");
  ok(getMoaGroup("IRAC_28").activeIngredients.includes("Chlorantraniliprole"), "diamide lists chlorantraniliprole");
}

// 6. riskRadar integration: pestForecast present + limitations merged
{
  const r = computeRiskRadar({ weather: makeWeather(), activeCrops: [makeMinimalActiveCrop("rice", "ধান", "tillering")] });
  ok(r.pestForecast && r.pestForecast.pests.length > 0, "riskRadar carries pestForecast");
  ok(Array.isArray(r.modelLimitations) && r.modelLimitations.length > 0, "limitations merged");
  // weather unavailable → pestForecast null (safe fallback)
  const none = computeRiskRadar({ weather: null, activeCrops: [makeMinimalActiveCrop("rice", "ধান", "tillering")] });
  ok(none.pestForecast === null, "no weather → pestForecast null");
}

console.log(`\npestEngine.test: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
