  /**
 * Diagnoses API — Save and query diagnosis records.
 *
 * POST  /api/diagnoses  — Save a diagnosis record (signed + rate-limited)
 * GET   /api/diagnoses  — List diagnoses with optional filters
 *                         (crop, district, dateFrom, dateTo, limit)
 */

import { saveDiagnosis, getDiagnoses, hasTurso } from "./_lib/turso.js";
import { handleCORSPreflight, setCORSHeaders } from "./_lib/cors.js";
import { createRateLimiter } from "./_lib/rateLimit.js";
import { parseBody } from "./_lib/validation.js";
import { requireSignedRequest } from "./_lib/requestSigning.js";

const diagnosesLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 30 });

// ─── Field schema — single source of truth for POST sanitization ──
// Every value is a string field with a max length. Anything absent
// or falsy becomes null.
const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 50;

const TEXT_FIELDS = {
  session_id: 200,
  crop: 100,
  disease_name: 300,
  disease_name_bn: 300,
  confidence: 20,
  severity: 20,
  biotic_abiotic: 20,
  provider: 100,
  symptoms: 2000,
  recommendations: 4000,
  weather_snapshot: 2000,
  district: 100,
  vit_prediction: 4000,
};

const REQUIRED_FIELDS = ["session_id", "crop"];

/** Trim + truncate a string field, or return null when absent. */
function sanitizeString(value, maxLength) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str.length === 0 ? null : str.slice(0, maxLength);
}

/**
 * Builds a sanitized diagnosis entry from a request body.
 * Returns { entry } on success or { error } when required fields are missing.
 */
export function sanitizeDiagnosisEntry(body = {}) {
  const missing = REQUIRED_FIELDS.find(
    (field) => typeof body[field] !== "string" || body[field].trim() === ""
  );
  if (missing) return { error: `${missing} is required` };

  const entry = {};
  for (const [field, maxLength] of Object.entries(TEXT_FIELDS)) {
    entry[field] = sanitizeString(body[field], maxLength);
  }
  entry.image_count = Math.min(Math.max(Number(body.image_count) || 0, 0), 10);

  return { entry };
}

/** Normalizes query-string filters for the GET listing. */
function parseFilters(query = {}) {
  const limit = Number(query.limit) || DEFAULT_LIMIT;
  return {
    crop: sanitizeString(query.crop, 100),
    district: sanitizeString(query.district, 100),
    dateFrom: sanitizeString(query.dateFrom, 30),
    dateTo: sanitizeString(query.dateTo, 30),
    limit: Math.min(Math.max(limit, 1), MAX_LIMIT),
  };
}

const methodHandlers = {
  GET: handleGet,
  POST: handlePost,
};

export default async function handler(req, res) {
  if (handleCORSPreflight(req, res, "GET, POST, OPTIONS")) return;
  setCORSHeaders(req, res, "GET, POST, OPTIONS");

  const routeHandler = methodHandlers[req.method];
  if (!routeHandler) {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!hasTurso()) {
    return res.status(503).json({ error: "Database not configured", persistence: "none" });
  }

  return routeHandler(req, res);
}

async function handleGet(req, res) {
  try {
    const diagnoses = await getDiagnoses(parseFilters(req.query));
    return res.status(200).json({
      diagnoses,
      count: diagnoses.length,
      persistence: "turso",
    });
  } catch (err) {
    console.error("Diagnoses GET error:", err.message);
    return res.status(500).json({ error: "Failed to fetch diagnoses" });
  }
}

async function handlePost(req, res) {
  if (requireSignedRequest(req, res)) return;
  if (diagnosesLimiter(req, res)) return;

  const body = parseBody(req);
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const { entry, error } = sanitizeDiagnosisEntry(body);
  if (error) return res.status(400).json({ error });

  try {
    const id = await saveDiagnosis(entry);
    if (id === null) {
      return res.status(500).json({ error: "Failed to save diagnosis" });
    }
    return res.status(201).json({ ok: true, id, persistence: "turso" });
  } catch (err) {
    console.error("Diagnoses POST error:", err.message);
    return res.status(500).json({ error: "Failed to save diagnosis" });
  }
}
