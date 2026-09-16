/**
 * Health check endpoint for uptime monitoring (GET /api/health) and
 * bounded operational metrics for administrators (POST /api/metrics).
 *
 * NOTE: metrics is served from this same serverless function via a
 * vercel.json rewrite (/api/metrics → /api/health?endpoint=metrics) to stay
 * within the Vercel Hobby plan's 12-function deployment limit.
 * Returns system status — no sensitive information exposed.
 */

import { handleCORSPreflight, setCORSHeaders } from "./_lib/cors.js";
import { createRateLimiter } from "./_lib/rateLimit.js";
import { requireSignedRequest } from "./_lib/requestSigning.js";
import { getPolicyUsage } from "./_lib/freeTierPolicy.js";
import { getTelemetrySnapshot } from "./_lib/observability.js";

const startTime = Date.now();
const metricsLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 5 });

async function handleMetrics(req, res) {
  if (handleCORSPreflight(req, res, "POST, OPTIONS")) return;
  setCORSHeaders(req, res, "POST, OPTIONS");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (requireSignedRequest(req, res)) return;
  if (metricsLimiter(req, res)) return;

  const policy = getPolicyUsage();
  return res.status(200).json({
    policy: {
      maxAttempts: policy.maxAttempts,
      maxRequestsPerDay: policy.maxRequestsPerDay,
      maxVisionRequestsPerDay: policy.maxVisionRequestsPerDay,
      maxOutputTokens: policy.maxOutputTokens,
    },
    usage: policy.usage,
    telemetry: getTelemetrySnapshot(),
    persistence: "ephemeral-instance-only",
  });
}

export default async function handler(req, res) {
  // Rewritten route: POST /api/metrics → /api/health?endpoint=metrics
  if (req.query?.endpoint === "metrics") return handleMetrics(req, res);

  if (handleCORSPreflight(req, res, "GET, OPTIONS")) return;
  setCORSHeaders(req, res, "GET, OPTIONS");

  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  return res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: `${uptimeSeconds}s`,
    env: {
      VERCEL: !!process.env.VERCEL,
      TURSO: !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN),
      // Only report whether keys exist, never their values or partial content
      AI_PROVIDERS_CONFIGURED: !!(
        process.env.GEMINI_API_KEY ||
        process.env.GROQ_API_KEY ||
        process.env.OPENROUTER_API_KEY
      ),
    },
    version: "4.0.0",
  });
}
