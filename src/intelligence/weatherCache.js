// ============================================================
// Plant Detective — Crop Health Intelligence
// LRU cache + input validation. Ported from KWI (MIT) utils/cache.ts.
// Structured error hierarchy inlined (KWI errors.ts) so this module
// has zero cross-file imports.
// ============================================================

/** Base class for all intelligence-package errors. */
export class WeatherProviderError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = options.code ?? "WEATHER_PROVIDER_ERROR";
    this.provider = options.provider;
    if (options.cause !== undefined) this.cause = options.cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidLocationError extends WeatherProviderError {
  constructor(message, options = {}) {
    super(message, { code: "INVALID_LOCATION", ...options });
    this.latitude = options.latitude;
    this.longitude = options.longitude;
  }
}

export class WeatherTimeoutError extends WeatherProviderError {
  constructor(message, options) {
    super(message, { code: "WEATHER_TIMEOUT", ...options });
    this.timeoutMs = options.timeoutMs;
  }
}

export class WeatherApiError extends WeatherProviderError {
  constructor(message, options) {
    super(message, { code: "WEATHER_API_ERROR", ...options });
    this.statusCode = options.statusCode;
  }
}

export class ValidationError extends WeatherProviderError {
  constructor(field, message) {
    super(`${field}: ${message}`, { code: "VALIDATION_ERROR" });
    this.field = field;
  }
}

// ────────────────────────────────────────────────────────────
// LRU cache — Map insertion order gives us LRU semantics for free.
// The previous unbounded Map leaked one entry per distinct lat/lng pair.
// ────────────────────────────────────────────────────────────

/**
 * @template K, V
 */
export class LruCache {
  /**
   * @param {number} [maxEntries=256]
   */
  constructor(maxEntries = 256) {
    this.maxEntries = Math.max(1, maxEntries);
    /** @type {Map<K, {value: V, expiresAt: number}>} */
    this.store = new Map();
  }

  /**
   * @param {K} key
   * @returns {{value: V, expiresAt: number}|undefined}
   */
  get(key) {
    const entry = this.store.get(key);
    if (entry === undefined) return undefined;
    // Move to end (most recently used).
    this.store.delete(key);
    this.store.set(key, entry);
    return entry;
  }

  /**
   * @param {K} key
   * @param {{value: V, expiresAt: number}} entry
   */
  set(key, entry) {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) this.store.delete(oldestKey);
    }
    this.store.set(key, entry);
  }

  /** @param {K} key */
  has(key) {
    return this.store.has(key);
  }

  /** @param {K} key */
  delete(key) {
    return this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  get size() {
    return this.store.size;
  }

  keys() {
    return this.store.keys();
  }
}

// ────────────────────────────────────────────────────────────
// Input validation
// ────────────────────────────────────────────────────────────

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate latitude / longitude. Throws InvalidLocationError if out of range.
 * @param {{latitude: number, longitude: number}} location
 */
export function validateLocation(location) {
  const { latitude, longitude } = location;
  if (typeof latitude !== "number" || Number.isNaN(latitude)) {
    throw new InvalidLocationError(`location.latitude must be a number, got ${typeof latitude}`, {
      latitude: latitude,
    });
  }
  if (typeof longitude !== "number" || Number.isNaN(longitude)) {
    throw new InvalidLocationError(`location.longitude must be a number, got ${typeof longitude}`, {
      longitude: longitude,
    });
  }
  if (latitude < -90 || latitude > 90) {
    throw new InvalidLocationError(`latitude ${latitude} out of range [-90, 90]`, { latitude, longitude });
  }
  if (longitude < -180 || longitude > 180) {
    throw new InvalidLocationError(`longitude ${longitude} out of range [-180, 180]`, { latitude, longitude });
  }
}

/**
 * Validate an ISO date string (YYYY-MM-DD) and confirm it is a real calendar date.
 * @param {string} value
 * @param {string} field
 */
export function validateIsoDate(value, field) {
  if (!ISO_DATE_RE.test(value)) {
    throw new ValidationError(field, `expected ISO date YYYY-MM-DD, got '${value}'`);
  }
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new ValidationError(field, `'${value}' is not a valid calendar date`);
  }
}
