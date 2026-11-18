// ============================================================
// Plant Detective — Crop Health Intelligence
// Operation Windows — adapted from KWI (MIT) engines/operation-windows.ts.
//
// Changes from the KWI original:
//  1. SUITABLE_THRESHOLD externalized (was hardcoded 70).
//  2. confidence is now computed from forecast horizon (closer hours =
//     higher confidence) instead of a flat 0.65.
//  3. Added a 'scout' window type (favors moderate temps + low rain +
//     good visibility for field scouting).
//  4. Crop-aware: inspects ALL active crops' stage thresholds (the KWI
//     original only looked at crops[0]).
// ============================================================

export const SUITABLE_THRESHOLD = 70;

const WINDOW_TYPES = ["spray", "irrigation", "fertilizer", "planting", "harvest", "field_access", "scout"];

/**
 * @param {import('./types.js').WeatherWindowType} type
 * @param {import('./types.js').WeatherHourly} h
 * @param {import('./types.js').ActiveCrop[]} crops
 * @param {number} hoursAhead - hours from now (for confidence decay)
 * @returns {import('./types.js').OperationWindow}
 */
function makeWindow(type, h, crops, hoursAhead) {
  const rain = h.precipitationProbability;
  const wind = h.windSpeed;
  const temp = h.temperature;
  let score = 100;
  const reasons = [];
  const reasonsBn = [];

  if (rain > 60) {
    score -= 50;
    reasons.push(`Rain probability ${rain}%`);
    reasonsBn.push(`বৃষ্টির সম্ভাবনা ${rain}%`);
  } else if (rain > 30) {
    score -= 20;
    reasons.push(`Rain probability ${rain}%`);
    reasonsBn.push(`বৃষ্টির সম্ভাবনা ${rain}%`);
  }

  if (wind > 15) {
    score -= 35;
    reasons.push(`Wind ${wind} km/h`);
    reasonsBn.push(`বাতাস ${wind} কিমি/ঘণ্টা`);
  } else if (wind > 10) {
    score -= 15;
    reasons.push(`Moderate wind ${wind} km/h`);
    reasonsBn.push(`মাঝারি বাতাস ${wind} কিমি/ঘণ্টা`);
  }

  // Operation-specific adjustments
  if (type === "spray" && rain < 30 && wind < 10) {
    reasons.push("Low rain and wind support spray operations");
    reasonsBn.push("কম বৃষ্টি ও বাতাস স্প্রে কাজের জন্য সহায়ক");
  }
  if (type === "irrigation" && rain > 60) {
    score -= 25;
    reasons.push("Heavy rain expected — defer irrigation");
    reasonsBn.push("ভারী বৃষ্টির পূর্বাভাস — সেচ বিলম্বিত করুন");
  }
  if (type === "field_access" && rain > 50) {
    score -= 20;
  }
  // Scout windows favor moderate temperatures + low rain + good visibility.
  if (type === "scout") {
    if (temp < 18 || temp > 35) {
      score -= 15;
      reasons.push(`Temperature ${temp}°C outside comfortable scouting range`);
      reasonsBn.push(`তাপমাত্রা ${temp}°C পর্যবেক্ষণের জন্য অস্বাচ্ছন্দ্যকর`);
    }
    if (rain > 40) {
      score -= 20;
      reasons.push("Rain reduces scouting effectiveness");
      reasonsBn.push("বৃষ্টি পর্যবেক্ষণের কার্যকারিতা কমায়");
    }
    if (h.visibility < 2) {
      score -= 15;
      reasons.push("Poor visibility limits scouting");
      reasonsBn.push("দুর্বল দৃশ্যমানতা পর্যবেক্ষণ সীমিত করে");
    }
  }

  // Crop-aware temperature threshold (inspect ALL active crops, not just crops[0]).
  for (const crop of crops) {
    const stage = crop.config.growthStages.find((s) => s.id === crop.currentStage);
    if (stage && temp > stage.heatStressThreshold) {
      score -= 10;
      reasons.push(`${crop.config.name}: ${temp}°C above ${stage.heatStressThreshold}°C stage threshold`);
      reasonsBn.push(`${crop.config.nameBn}: তাপমাত্রা ${temp}°C ফসলের পর্যায়ের সীমার ওপরে`);
      break;
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  // Confidence decays with forecast horizon: 0.9 at now, 0.5 at 48h.
  const confidence = Math.max(0.45, Math.round((0.9 - (hoursAhead / 48) * 0.4) * 100) / 100);
  const end = new Date(new Date(h.time).getTime() + 3_600_000).toISOString();

  return {
    type,
    start: h.time,
    end,
    score,
    suitable: score >= SUITABLE_THRESHOLD,
    reasons,
    reasonsBn,
    confidence,
  };
}

/**
 * Walk the next 48 hours of hourly forecast and produce operation windows.
 * @param {import('./types.js').WeatherData} weather
 * @param {import('./types.js').ActiveCrop[]} [crops]
 * @returns {import('./types.js').WeatherWindows}
 */
export function calculateOperationWindows(weather, crops = []) {
  const out = { spray: [], irrigation: [], fertilizer: [], planting: [], harvest: [], fieldAccess: [], scout: [] };
  const now = Date.now();
  for (let i = 0; i < Math.min(48, weather.hourly.length); i++) {
    const h = weather.hourly[i];
    const hoursAhead = Math.max(0, (new Date(h.time).getTime() - now) / 36e5);
    for (const type of WINDOW_TYPES) {
      const w = makeWindow(type, h, crops, hoursAhead);
      if (!w.suitable) continue;
      if (type === "field_access") out.fieldAccess.push(w);
      else out[type].push(w);
    }
  }
  return out;
}
