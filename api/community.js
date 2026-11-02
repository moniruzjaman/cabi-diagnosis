/**
 * Community API — consolidated resource endpoints.
 *
 * Routed via vercel.json rewrites (URLs are unchanged for the frontend):
 *   /api/feedback   -> /api/community?resource=feedback
 *   /api/outbreaks  -> /api/community?resource=outbreaks
 *   /api/presence   -> /api/community?resource=presence
 *   /api/diagnoses  -> /api/community?resource=diagnoses
 *   /api/analytics  -> /api/community?resource=analytics
 *
 * These five routes were merged into one serverless function to stay
 * within the Vercel Hobby plan's 12-function-per-deployment limit while
 * leaving headroom for future endpoints. Each resource's logic below is
 * unchanged from its original standalone file — only the dispatch and
 * (previously duplicated) imports are shared.
 *
 * NOTE: analytics/feedback/presence used to import { readStore, writeStore,
 * appendFeedback } from a "./storage.js" shim that does not exist in this
 * repo (see git history: #36/#43/#44/#46 — the shim was added and reverted
 * multiple times). That bug is fixed here by importing directly from
 * ./_lib/turso.js, which already implements all three functions.
 */

import crypto from "crypto";
import { handleCORSPreflight, setCORSHeaders } from "./_lib/cors.js";
import { createRateLimiter, feedbackLimiter, analyticsLimiter, presenceLimiter } from "./_lib/rateLimit.js";
import { parseBody, validateVisitorId, validateSection, validateFeedback } from "./_lib/validation.js";
import { escapeHtml, escapeHtmlWithBr, sanitizeEmail } from "./_lib/htmlEscape.js";
import { requireSignedRequest, verifyRequestToken } from "./_lib/requestSigning.js";
import {
  readStore,
  writeStore,
  appendFeedback,
  reportOutbreak,
  getOutbreaks,
  saveDiagnosis,
  getDiagnoses,
  upsertPresence,
  removePresence,
  getOnlineStats,
  getDailyStats,
  cleanupStalePresence,
  getDiseaseStats,
  hasTurso,
} from "./_lib/turso.js";

const RESOURCE_HANDLERS = {
  feedback: feedbackResource,
  outbreaks: outbreaksResource,
  presence: presenceResource,
  diagnoses: diagnosesResource,
  analytics: analyticsResource,
};

export default async function handler(req, res) {
  const resource = req.query?.resource;
  const routeHandler = RESOURCE_HANDLERS[resource];

  if (!routeHandler) {
    return res.status(404).json({ error: "Unknown resource" });
  }

  return routeHandler(req, res);
}

// ═══════════════════════════════════════════════════════════════════
// feedback — POST /api/feedback
// ═══════════════════════════════════════════════════════════════════

const SUPPORT_EMAIL = "support@krishiai.live";

async function feedbackResource(req, res) {
  if (handleCORSPreflight(req, res, "POST, OPTIONS")) return;
  setCORSHeaders(req, res, "POST, OPTIONS");

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (requireSignedRequest(req, res)) return;
  if (feedbackLimiter(req, res)) return;

  const body = parseBody(req);
  if (!body) return res.status(400).json({ error: "Invalid JSON body" });

  const item = validateFeedback(body);
  const safeEmail = sanitizeEmail(item.email);

  const feedbackItem = {
    context: item.context,
    rating: item.rating,
    feedback: item.feedback,
    email: safeEmail,
    summary: item.summary,
    visitorId: item.visitorId,
    createdAt: new Date().toISOString(),
  };

  try {
    await appendFeedback(feedbackItem);
  } catch (err) {
    console.error("Feedback save error:", err.message);
    return res.status(500).json({ error: "Failed to save feedback" });
  }

  sendFeedbackEmailNotification({ ...feedbackItem, email: safeEmail }).catch(() => {});

  let store;
  try {
    store = await readStore();
  } catch (err) {
    console.error("Feedback read error:", err.message);
    store = { feedback: [] };
  }

  return res.status(200).json({
    ok: true,
    count: Array.isArray(store.feedback) ? store.feedback.length : null,
    persistence: process.env.TURSO_DATABASE_URL
      ? "turso"
      : process.env.VERCEL
        ? "temporary-instance-storage"
        : "local-file-storage",
  });
}

async function sendFeedbackEmailNotification(item) {
  if (!process.env.VERCEL) return; // Only send in production

  const subject = `[উদ্ভিদ গোয়েন্দা] ${escapeHtml(item.context)} — ${getFeedbackRatingLabel(item.rating)}`;

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:12px;">
      <div style="background:#006028;color:#fff;padding:16px 20px;border-radius:12px 12px 0 0;">
        <h2 style="margin:0;font-size:18px;">🌿 উদ্ভিদ গোয়েন্দা — New Feedback</h2>
      </div>
      <div style="padding:20px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:8px 0;color:#6b7280;font-weight:600;width:120px;">Section</td><td style="padding:8px 0;">${escapeHtml(item.context)}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-weight:600;">Rating</td><td style="padding:8px 0;">${"⭐".repeat(item.rating)}${"☆".repeat(5 - item.rating)} (${item.rating}/5)</td></tr>
          ${item.email ? `<tr><td style="padding:8px 0;color:#6b7280;font-weight:600;">User Email</td><td style="padding:8px 0;"><a href="mailto:${escapeHtml(item.email)}">${escapeHtml(item.email)}</a></td></tr>` : ""}
          ${item.summary ? `<tr><td style="padding:8px 0;color:#6b7280;font-weight:600;">Summary</td><td style="padding:8px 0;">${escapeHtml(item.summary)}</td></tr>` : ""}
          ${item.feedback ? `<tr><td style="padding:8px 0;color:#6b7280;font-weight:600;vertical-align:top;">Feedback</td><td style="padding:8px 0;background:#f9fafb;padding:12px;border-radius:8px;">${escapeHtmlWithBr(item.feedback)}</td></tr>` : ""}
          <tr><td style="padding:8px 0;color:#6b7280;font-weight:600;">Time</td><td style="padding:8px 0;">${escapeHtml(item.createdAt)}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-weight:600;">Visitor</td><td style="padding:8px 0;font-family:monospace;font-size:12px;">${escapeHtml(item.visitorId) || "N/A"}</td></tr>
        </table>
      </div>
      <div style="padding:12px 20px;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;color:#9ca3af;">
        উদ্ভিদ গোয়েন্দা (Plant Detective) · CABI Plantwise · DAE Bangladesh<br>
        <a href="https://cabi-diagnosis.vercel.app">cabi-diagnosis.vercel.app</a>
      </div>
    </div>
  `;

  try {
    await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: SUPPORT_EMAIL, name: "Krishi AI Support" }] }],
        from: { email: "noreply@cabi-diagnosis.vercel.app", name: "উদ্ভিদ গোয়েন্দা" },
        subject,
        content: [{ type: "text/html", value: htmlBody }],
      }),
    });
  } catch (err) {
    console.error("Email notification failed:", err.message);
  }
}

function getFeedbackRatingLabel(rating) {
  if (rating >= 4) return "Positive";
  if (rating >= 3) return "Neutral";
  if (rating >= 1) return "Negative";
  return "No Rating";
}

// ═══════════════════════════════════════════════════════════════════
// outbreaks — GET/POST /api/outbreaks
// ═══════════════════════════════════════════════════════════════════

const outbreaksLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 20 });

async function outbreaksResource(req, res) {
  if (handleCORSPreflight(req, res, "GET, POST, OPTIONS")) return;
  setCORSHeaders(req, res, "GET, POST, OPTIONS");

  if (!hasTurso()) {
    return res.status(503).json({ error: "Database not configured", persistence: "none" });
  }

  if (req.method === "GET") {
    return handleOutbreaksGet(req, res);
  }

  if (req.method === "POST") {
    if (requireSignedRequest(req, res)) return;
    if (outbreaksLimiter(req, res)) return;
    return handleOutbreaksPost(req, res);
  }

  return res.status(405).json({ error: "Method not allowed" });
}

async function handleOutbreaksGet(req, res) {
  try {
    const filters = {
      district: req.query?.district || undefined,
      crop: req.query?.crop || undefined,
      recentDays: req.query?.recentDays ? parseInt(req.query.recentDays, 10) : undefined,
      limit: req.query?.limit || 50,
    };

    const outbreaks = await getOutbreaks(filters);
    return res.status(200).json({
      outbreaks,
      count: outbreaks.length,
      persistence: "turso",
    });
  } catch (err) {
    console.error("Outbreaks GET error:", err.message);
    return res.status(500).json({ error: "Failed to fetch outbreaks" });
  }
}

async function handleOutbreaksPost(req, res) {
  const body = parseBody(req);
  if (!body) return res.status(400).json({ error: "Invalid JSON body" });

  if (!body.district || typeof body.district !== "string") {
    return res.status(400).json({ error: "district is required" });
  }
  if (!body.crop || typeof body.crop !== "string") {
    return res.status(400).json({ error: "crop is required" });
  }
  if (!body.disease_name || typeof body.disease_name !== "string") {
    return res.status(400).json({ error: "disease_name is required" });
  }

  const reporterInput = body.reporter_id || req.headers["x-forwarded-for"] || "anonymous";
  const reporter_hash = crypto.createHash("sha256").update(String(reporterInput)).digest("hex").slice(0, 16);

  const entry = {
    district: String(body.district).slice(0, 100),
    crop: String(body.crop).slice(0, 100),
    disease_name: String(body.disease_name).slice(0, 300),
    reporter_hash,
    confirmed: body.confirmed === true,
  };

  try {
    const id = await reportOutbreak(entry);
    if (id === null) {
      return res.status(500).json({ error: "Failed to report outbreak" });
    }
    return res.status(201).json({ ok: true, id, persistence: "turso" });
  } catch (err) {
    console.error("Outbreaks POST error:", err.message);
    return res.status(500).json({ error: "Failed to report outbreak" });
  }
}

// ═══════════════════════════════════════════════════════════════════
// presence — GET/POST/DELETE /api/presence
// ═══════════════════════════════════════════════════════════════════

async function presenceResource(req, res) {
  if (handleCORSPreflight(req, res)) return;
  setCORSHeaders(req, res);
  res.setHeader("Cache-Control", "no-store");

  // Periodically clean stale records (1 in 20 chance)
  if (hasTurso() && Math.random() < 0.05) cleanupStalePresence().catch(() => {});

  if (req.method === "GET") {
    return handlePresenceGet(req, res);
  }
  if (req.method === "POST") {
    if (requireSignedRequest(req, res)) return;
    if (presenceLimiter(req, res)) return;
    return handlePresencePost(req, res);
  }
  if (req.method === "DELETE") {
    if (requireSignedRequest(req, res)) return;
    return handlePresenceDelete(req, res);
  }
  return res.status(405).json({ error: "Method not allowed" });
}

async function handlePresenceGet(req, res) {
  const days = Math.min(parseInt(req.query?.days) || 7, 30);

  if (hasTurso()) {
    try {
      const [onlineStats, dailyStats] = await Promise.all([getOnlineStats(), getDailyStats(days)]);
      return res.status(200).json({
        onlineCount: onlineStats.onlineCount,
        bySection: onlineStats.bySection,
        recentVisitors: onlineStats.visitors,
        dailyStats,
        persistence: "turso",
      });
    } catch (err) {
      console.error("Presence GET error:", err.message);
    }
  }

  const store = await readStore();
  return res.status(200).json({
    onlineCount: 0,
    bySection: {},
    recentVisitors: [],
    dailyStats: [],
    totalVisits: store.totalVisits,
    uniqueVisitors: store.uniqueVisitors,
    sections: store.sections,
    persistence: "fallback",
  });
}

async function handlePresencePost(req, res) {
  const body = parseBody(req);
  if (!body) return res.status(400).json({ error: "Invalid JSON body" });

  const visitorId = validateVisitorId(body.visitorId);
  const section = validateSection(body.section);

  if (!visitorId) return res.status(400).json({ error: "visitorId is required" });

  const userAgent = req.headers["user-agent"] || "";
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "";
  const ipHash = ip ? crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16) : "unknown";
  const country = req.headers["x-vercel-ip-country"] || req.headers["cf-ipcountry"] || "";
  const isPwa = body.isPwa === true;

  if (hasTurso()) {
    try {
      await upsertPresence(visitorId, section, userAgent, ipHash, country, isPwa);
      return res.status(200).json({ ok: true, persistence: "turso" });
    } catch (err) {
      console.error("Presence POST error:", err.message);
    }
  }

  return res.status(200).json({ ok: true, persistence: "fallback" });
}

async function handlePresenceDelete(req, res) {
  const body = parseBody(req);
  const visitorId = validateVisitorId(body?.visitorId || req.query?.visitorId);

  if (!visitorId) return res.status(400).json({ error: "visitorId is required" });

  if (hasTurso()) {
    try {
      await removePresence(visitorId);
      return res.status(200).json({ ok: true, persistence: "turso" });
    } catch (err) {
      console.error("Presence DELETE error:", err.message);
    }
  }

  return res.status(200).json({ ok: true, persistence: "fallback" });
}

// ═══════════════════════════════════════════════════════════════════
// diagnoses — GET/POST /api/diagnoses
// ═══════════════════════════════════════════════════════════════════

const diagnosesLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 30 });

const DIAGNOSES_MAX_LIMIT = 500;
const DIAGNOSES_DEFAULT_LIMIT = 50;

const DIAGNOSES_TEXT_FIELDS = {
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

const DIAGNOSES_REQUIRED_FIELDS = ["session_id", "crop"];

function sanitizeDiagnosisString(value, maxLength) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str.length === 0 ? null : str.slice(0, maxLength);
}

/**
 * Builds a sanitized diagnosis entry from a request body.
 * Returns { entry } on success or { error } when required fields are missing.
 */
export function sanitizeDiagnosisEntry(body = {}) {
  const missing = DIAGNOSES_REQUIRED_FIELDS.find(
    (field) => typeof body[field] !== "string" || body[field].trim() === "",
  );
  if (missing) return { error: `${missing} is required` };

  const entry = {};
  for (const [field, maxLength] of Object.entries(DIAGNOSES_TEXT_FIELDS)) {
    entry[field] = sanitizeDiagnosisString(body[field], maxLength);
  }
  entry.image_count = Math.min(Math.max(Number(body.image_count) || 0, 0), 10);

  return { entry };
}

function parseDiagnosesFilters(query = {}) {
  const limit = Number(query.limit) || DIAGNOSES_DEFAULT_LIMIT;
  return {
    crop: sanitizeDiagnosisString(query.crop, 100),
    district: sanitizeDiagnosisString(query.district, 100),
    dateFrom: sanitizeDiagnosisString(query.dateFrom, 30),
    dateTo: sanitizeDiagnosisString(query.dateTo, 30),
    limit: Math.min(Math.max(limit, 1), DIAGNOSES_MAX_LIMIT),
  };
}

const diagnosesMethodHandlers = {
  GET: handleDiagnosesGet,
  POST: handleDiagnosesPost,
};

function requireProtectedDiagnosesRead(req, res) {
  if (!process.env.VERCEL) return false;
  const token = req.headers["x-request-signature"] || "";
  if (!token || !verifyRequestToken(token)) {
    res.status(403).json({ error: "Invalid or missing request signature" });
    return true;
  }
  return false;
}

async function diagnosesResource(req, res) {
  if (handleCORSPreflight(req, res, "GET, POST, OPTIONS")) return;
  setCORSHeaders(req, res, "GET, POST, OPTIONS");

  const routeHandler = diagnosesMethodHandlers[req.method];
  if (!routeHandler) {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (req.method === "GET" && requireProtectedDiagnosesRead(req, res)) return;

  if (!hasTurso()) {
    return res.status(503).json({ error: "Database not configured", persistence: "none" });
  }

  return routeHandler(req, res);
}

async function handleDiagnosesGet(req, res) {
  try {
    const diagnoses = await getDiagnoses(parseDiagnosesFilters(req.query));
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

async function handleDiagnosesPost(req, res) {
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

// ═══════════════════════════════════════════════════════════════════
// analytics — GET/POST /api/analytics
// ═══════════════════════════════════════════════════════════════════

async function analyticsResource(req, res) {
  if (handleCORSPreflight(req, res, "GET, POST, OPTIONS")) return;
  setCORSHeaders(req, res, "GET, POST, OPTIONS");

  if (req.method === "GET") {
    return handleAnalyticsGet(req, res);
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (requireSignedRequest(req, res)) return;
  if (analyticsLimiter(req, res)) return;

  const body = parseBody(req);
  if (!body) return res.status(400).json({ error: "Invalid JSON body" });

  const visitorId = validateVisitorId(body.visitorId);
  const section = validateSection(body.section);

  if (!visitorId) return res.status(400).json({ error: "visitorId is required" });

  try {
    const store = await readStore();
    const isNewVisitor = !store.visitors[visitorId];

    store.totalVisits += 1;
    store.sections[section] = (store.sections[section] || 0) + 1;
    store.visitors[visitorId] = {
      firstSeen: store.visitors[visitorId]?.firstSeen || new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      visits: (store.visitors[visitorId]?.visits || 0) + 1,
    };
    if (isNewVisitor) store.uniqueVisitors += 1;

    if (Array.isArray(body.telemetry)) {
      if (!store.telemetryStats) {
        store.telemetryStats = { vitInferenceMs: [], webVitals: {} };
      }
      for (const t of body.telemetry) {
        if (t.category === "vit_inference" && typeof t.durationMs === "number") {
          store.telemetryStats.vitInferenceMs = [
            ...(store.telemetryStats.vitInferenceMs || []).slice(-49),
            t.durationMs,
          ];
        } else if (t.category === "web_vital" && t.name && typeof t.valueMs === "number") {
          store.telemetryStats.webVitals = store.telemetryStats.webVitals || {};
          store.telemetryStats.webVitals[t.name] = t.valueMs;
        }
      }
    }

    await writeStore(store);

    return res.status(200).json({
      totalVisits: store.totalVisits,
      uniqueVisitors: store.uniqueVisitors,
      sections: store.sections,
      visitor: store.visitors[visitorId],
      telemetryStats: store.telemetryStats || null,
      updatedAt: store.updatedAt,
      persistence: process.env.TURSO_DATABASE_URL
        ? "turso"
        : process.env.VERCEL
          ? "temporary-instance-storage"
          : "local-file-storage",
    });
  } catch (err) {
    console.error("Analytics POST error:", err.message);
    return res.status(500).json({ error: "Failed to update analytics" });
  }
}

async function handleAnalyticsGet(req, res) {
  try {
    const store = await readStore();

    const response = {
      totalVisits: store.totalVisits,
      uniqueVisitors: store.uniqueVisitors,
      sections: store.sections,
      updatedAt: store.updatedAt,
    };

    if (req.query?.disease === "true" && hasTurso()) {
      try {
        const days = Math.min(Math.max(parseInt(req.query?.days) || 30, 1), 365);
        const diseaseStats = await getDiseaseStats(days);
        response.diseaseStats = diseaseStats;
      } catch (err) {
        console.error("Analytics disease stats error:", err.message);
        response.diseaseStats = { error: "Failed to fetch disease stats" };
      }
    }

    return res.status(200).json(response);
  } catch (err) {
    console.error("Analytics GET error:", err.message);
    return res.status(500).json({ error: "Failed to fetch analytics" });
  }
}
