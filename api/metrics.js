/**
 * Bounded operational metrics for administrators.
 * POST is intentional: production calls must carry the existing request signature.
 */

import { handleCORSPreflight, setCORSHeaders } from "./_lib/cors.js";
import { createRateLimiter } from "./_lib/rateLimit.js";
import { requireSignedRequest } from "./_lib/requestSigning.js";
import { getPolicyUsage } from "./_lib/freeTierPolicy.js";
import { getTelemetrySnapshot } from "./_lib/observability.js";

const metricsLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 5 });

export default async function handler(req, res) {
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
