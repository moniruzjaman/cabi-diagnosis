// ============================================================
// Plant Detective — Crop Health Intelligence
// Open-Meteo weather adapter. Ported from KWI (MIT) providers/open-meteo.ts.
// Keyless (Open-Meteo is free + CORS-friendly → works browser-side).
// Preserves the honest proxy-labeling in IntelligenceMetadata.metrics
// so derived indices are never mistaken for direct measurements.
// ============================================================

import { WeatherTimeoutError, WeatherApiError } from "./weatherCache.js";

const CURRENT_PARAMS = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "is_day",
  "precipitation",
  "weather_code",
  "cloud_cover",
  "pressure_msl",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "visibility",
  "uv_index",
  "dew_point_2m",
];

const HOURLY_PARAMS = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "precipitation_probability",
  "precipitation",
  "weather_code",
  "cloud_cover",
  "pressure_msl",
  "visibility",
  "wind_speed_10m",
  "wind_direction_10m",
  "uv_index",
  "dew_point_2m",
  "evapotranspiration",
];

const DAILY_PARAMS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "apparent_temperature_max",
  "apparent_temperature_min",
  "sunrise",
  "sunset",
  "precipitation_sum",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "wind_direction_10m_dominant",
  "uv_index_max",
  "et0_fao_evapotranspiration",
];

/** Tetens saturation vapor pressure (kPa) at temperature t (°C). */
function svp(t) {
  return 0.6108 * Math.exp((17.27 * t) / (237.3 + t));
}

/** Slope of saturation vapor pressure curve (kPa/°C) at temperature t (°C). */
function svpSlope(t) {
  return (4098 * svp(t)) / Math.pow(237.3 + t, 2);
}

export class OpenMeteoAdapter {
  constructor(options = {}) {
    this.providerId = "open-meteo";
    this.providerVersion = "forecast-v1";
    this.baseUrl = options.baseUrl ?? "https://api.open-meteo.com/v1";
    this.timeoutMs = options.timeoutMs ?? 10000;
    this.forecastDays = Math.min(16, Math.max(1, options.forecastDays ?? 16));
    this.hourlyHours = Math.min(this.forecastDays * 24, Math.max(24, options.hourlyHours ?? 168));
  }

  /**
   * @param {{latitude: number, longitude: number}} location
   * @returns {Promise<import('./types.js').WeatherData>}
   */
  async fetchWeather(location) {
    const params = new URLSearchParams({
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      current: CURRENT_PARAMS.join(","),
      hourly: HOURLY_PARAMS.join(","),
      daily: DAILY_PARAMS.join(","),
      timezone: "auto",
      forecast_days: String(this.forecastDays),
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let res;
    try {
      res = await fetch(`${this.baseUrl}/forecast?${params}`, { signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new WeatherTimeoutError(`Open-Meteo request timed out after ${this.timeoutMs}ms`, {
          timeoutMs: this.timeoutMs,
          provider: this.providerId,
        });
      }
      throw new WeatherApiError(
        `Open-Meteo request failed: ${error instanceof Error ? error.message : String(error)}`,
        {
          statusCode: 0,
          provider: this.providerId,
        },
      );
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      throw new WeatherApiError(`Open-Meteo API error: ${res.status} ${res.statusText}`, {
        statusCode: res.status,
        provider: this.providerId,
      });
    }

    const data = await res.json();
    const current = this.parseCurrent(data.current || {});
    const hourly = this.parseHourly(data.hourly || {});
    const daily = this.parseDaily(data.daily || {});

    // Open-Meteo's `current` block does NOT include precipitation_probability.
    // Backfill from the matching hourly point (or daily max as fallback).
    current.precipitationProbability = this.resolveCurrentPrecipProbability(data.current?.time, hourly, daily);

    const agriculturalIndices = this.computeAgriculturalIndices(current, hourly, daily);

    return {
      current,
      hourly,
      daily,
      agriculturalIndices,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        name: location.name ?? "",
        country: location.country ?? "BD",
      },
      fetchedAt: new Date().toISOString(),
    };
  }

  /** @private */
  parseCurrent(c) {
    return {
      temperature: c.temperature_2m ?? 0,
      feelsLike: c.apparent_temperature ?? 0,
      humidity: c.relative_humidity_2m ?? 0,
      windSpeed: c.wind_speed_10m ?? 0,
      windDirection: c.wind_direction_10m ?? 0,
      windGusts: c.wind_gusts_10m ?? 0,
      pressure: c.pressure_msl ?? 0,
      cloudCover: c.cloud_cover ?? 0,
      visibility: c.visibility ?? 0,
      uvIndex: c.uv_index ?? 0,
      dewPoint: c.dew_point_2m ?? 0,
      precipitation: c.precipitation ?? 0,
      precipitationProbability: 0,
      weatherCode: c.weather_code ?? 0,
      isDay: c.is_day === 1,
    };
  }

  /** @private */
  parseHourly(h) {
    if (!h?.time) return [];
    const times = h.time;
    const count = Math.min(times.length, this.hourlyHours);
    const temp = h.temperature_2m ?? [];
    const feels = h.apparent_temperature ?? [];
    const rh = h.relative_humidity_2m ?? [];
    const ws = h.wind_speed_10m ?? [];
    const wd = h.wind_direction_10m ?? [];
    const precip = h.precipitation ?? [];
    const precipProb = h.precipitation_probability ?? [];
    const cc = h.cloud_cover ?? [];
    const uv = h.uv_index ?? [];
    const dp = h.dew_point_2m ?? [];
    const wc = h.weather_code ?? [];
    const pres = h.pressure_msl ?? [];
    const vis = h.visibility ?? [];
    const et = h.evapotranspiration ?? [];

    return Array.from({ length: count }, (_, i) => ({
      time: times[i],
      temperature: temp[i] ?? 0,
      feelsLike: feels[i] ?? 0,
      humidity: rh[i] ?? 0,
      windSpeed: ws[i] ?? 0,
      windDirection: wd[i] ?? 0,
      precipitation: precip[i] ?? 0,
      precipitationProbability: precipProb[i] ?? 0,
      cloudCover: cc[i] ?? 0,
      uvIndex: uv[i] ?? 0,
      dewPoint: dp[i] ?? 0,
      weatherCode: wc[i] ?? 0,
      pressure: pres[i] ?? 0,
      visibility: vis[i] ?? 0,
      evapotranspiration: et[i] ?? 0,
    }));
  }

  /** @private */
  parseDaily(d) {
    if (!d?.time) return [];
    const times = d.time;
    const count = Math.min(times.length, 16);
    const wc = d.weather_code ?? [];
    const tmax = d.temperature_2m_max ?? [];
    const tmin = d.temperature_2m_min ?? [];
    const tamax = d.apparent_temperature_max ?? [];
    const tamin = d.apparent_temperature_min ?? [];
    const sr = d.sunrise ?? [];
    const ss = d.sunset ?? [];
    const psum = d.precipitation_sum ?? [];
    const pmax = d.precipitation_probability_max ?? [];
    const wsmax = d.wind_speed_10m_max ?? [];
    const wgmax = d.wind_gusts_10m_max ?? [];
    const wddom = d.wind_direction_10m_dominant ?? [];
    const uvmax = d.uv_index_max ?? [];
    const et0 = d.et0_fao_evapotranspiration ?? [];

    return Array.from({ length: count }, (_, i) => ({
      date: times[i],
      weatherCode: wc[i] ?? 0,
      tempMax: tmax[i] ?? 0,
      tempMin: tmin[i] ?? 0,
      tempApparentMax: tamax[i] ?? 0,
      tempApparentMin: tamin[i] ?? 0,
      sunrise: sr[i] ?? "",
      sunset: ss[i] ?? "",
      precipitationSum: psum[i] ?? 0,
      precipitationProbabilityMax: pmax[i] ?? 0,
      windSpeedMax: wsmax[i] ?? 0,
      windGustsMax: wgmax[i] ?? 0,
      windDirectionDominant: wddom[i] ?? 0,
      uvIndexMax: uvmax[i] ?? 0,
      et0Sum: et0[i] ?? undefined,
      growingDegreeDays: Math.max(0, ((tmax[i] ?? 0) + (tmin[i] ?? 0)) / 2 - 10),
    }));
  }

  /** @private */
  resolveCurrentPrecipProbability(currentIsoTime, hourly, daily) {
    if (currentIsoTime) {
      const exact = hourly.find((h) => h.time === currentIsoTime);
      if (exact) return exact.precipitationProbability;
      const prefix = currentIsoTime.slice(0, 13);
      const byPrefix = hourly.find((h) => h.time.slice(0, 13) === prefix);
      if (byPrefix) return byPrefix.precipitationProbability;
    }
    return daily[0]?.precipitationProbabilityMax ?? 0;
  }

  /** @private */
  computeAgriculturalIndices(current, hourly, daily) {
    const today = daily[0];
    const et0 = today?.et0Sum ?? this.estimateET0(current);
    const avgTemp = today ? (today.tempMax + today.tempMin) / 2 : current.temperature;
    const gdd = Math.max(0, avgTemp - 10);

    const hni = Math.min(
      100,
      Math.max(
        0,
        (current.temperature > 35 ? (current.temperature - 35) * 5 : 0) +
          (current.humidity > 80 ? (current.humidity - 80) * 0.5 : 0),
      ),
    );
    const cni = Math.min(100, Math.max(0, current.temperature < 10 ? (10 - current.temperature) * 6 : 0));

    // Leaf wetness is a humidity + precipitation PROXY, not a direct measurement.
    const highHumidityHours = hourly.slice(0, 24).filter((h) => h.humidity > 90 || h.precipitation > 0).length;
    const leafWetnessHours = Math.min(24, highHumidityHours);

    // Simplified water balance PROXY.
    const soilMoistureDeficit = Math.max(0, et0 - (current.precipitation + current.humidity * 0.05));

    // VPD (FAO convention). Fixed: KWI original swapped es/ea producing inverted values.
    const es = svp(current.temperature);
    const ea = svp(current.dewPoint);
    const vpd = Math.max(0, es - ea);

    // Solar radiation PROXY from UV (only valid near midday).
    const solarRadiation = current.uvIndex * 25;

    const chillHours = hourly.slice(0, 24).filter((h) => h.temperature < 7).length;

    return {
      et0,
      gdd,
      hni,
      cni,
      leafWetnessHours,
      soilMoistureDeficit,
      chillHours,
      dewPoint: current.dewPoint,
      vaporPressureDeficit: vpd,
      solarRadiation,
    };
  }

  /** @private */
  estimateET0(current) {
    const tempK = current.temperature + 273.15;
    const rn = current.uvIndex * 2.5;
    const g = 0;
    const delta = svpSlope(current.temperature);
    const gamma = 0.066;
    const es = svp(current.temperature);
    const ea = es * (current.humidity / 100);
    const vpd = Math.max(0, es - ea);
    const u2 = current.windSpeed * 0.7;
    const et0 = (0.408 * delta * (rn - g) + gamma * (900 / tempK) * u2 * vpd) / (delta + gamma * (1 + 0.34 * u2));
    return Math.max(0, et0);
  }
}

/**
 * Honest provenance metadata for derived indices. Each entry labels whether
 * the value is a direct measurement or a proxy, so the explanation engine can
 * surface "leaf wetness is a humidity proxy" to the user.
 * @returns {{metric: string, method: string, isProxy: boolean, confidence: number}[]}
 */
export function describeWeatherProvenance(weather) {
  const ai = weather.agriculturalIndices;
  return [
    { metric: "temperature", method: "direct_measurement", isProxy: false, confidence: 0.95 },
    { metric: "humidity", method: "direct_measurement", isProxy: false, confidence: 0.95 },
    { metric: "precipitation", method: "direct_measurement", isProxy: false, confidence: 0.9 },
    { metric: "windSpeed", method: "direct_measurement", isProxy: false, confidence: 0.95 },
    {
      metric: "leafWetnessHours",
      method: "humidity_precipitation_proxy",
      isProxy: true,
      confidence: 0.6,
      note: `Estimated ${ai.leafWetnessHours}h from hours with humidity>90% or precipitation>0.`,
    },
    {
      metric: "soilMoistureDeficit",
      method: "water_balance_proxy",
      isProxy: true,
      confidence: 0.5,
      note: `Estimated ${ai.soilMoistureDeficit.toFixed(1)}mm from ET0 minus precipitation + humidity contribution.`,
    },
    {
      metric: "solarRadiation",
      method: "uv_index_proxy",
      isProxy: true,
      confidence: 0.4,
      note: `Estimated ${ai.solarRadiation} W/m² from UV index (only valid near midday).`,
    },
    {
      metric: "et0",
      method: weather.daily[0]?.et0Sum != null ? "provider_fao56" : "penman_monteith_estimate",
      isProxy: weather.daily[0]?.et0Sum == null,
      confidence: weather.daily[0]?.et0Sum != null ? 0.85 : 0.55,
    },
    { metric: "vaporPressureDeficit", method: "tetens_from_dewpoint", isProxy: false, confidence: 0.8 },
  ];
}

/**
 * @param {{latitude: number, longitude: number}} location
 * @param {Object} [options]
 * @returns {Promise<import('./types.js').WeatherData>}
 */
export function fetchWeather(location, options = {}) {
  const adapter = new OpenMeteoAdapter(options);
  return adapter.fetchWeather(location);
}
