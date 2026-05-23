/**
 * Admin-only health-check endpoint.
 *
 * SECURITY:
 * - Requires ADMIN_SECRET env var passed as ?secret= query param
 * - No API key values are ever exposed
 * - Does NOT make live AI provider calls (prevents credit burning & info leakage)
 * - Only checks if env vars are set
 *
 * Visit: https://your-app.vercel.app/api/test?secret=YOUR_ADMIN_SECRET
 *
 * If ADMIN_SECRET is not configured, this endpoint returns 403 in production.
 */

import { handleCORSPreflight, setCORSHeaders } from "./_lib/cors.js";

export default async function handler(req, res) {
  if (handleCORSPreflight(req, res, "GET, OPTIONS")) return;
  setCORSHeaders(req, res, "GET, OPTIONS");

  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  // Require admin secret in production
  if (process.env.VERCEL) {
    const adminSecret = process.env.ADMIN_SECRET;
    const providedSecret = req.query?.secret || req.headers["x-admin-secret"];

    if (!adminSecret) {
      return res.status(403).json({
        error: "ADMIN_SECRET not configured — endpoint disabled for security",
        hint: "Set ADMIN_SECRET env var and pass it as ?secret= parameter",
      });
    }

    if (providedSecret !== adminSecret) {
      return res.status(403).json({ error: "Invalid or missing admin secret" });
    }
  }

  // Check env vars exist — do NOT expose any part of the key, NOT even which ones are set
  // Just report overall system readiness
  const aiReady = !!(process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY);
  const dbReady = !!(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY);

  return res.status(200).json({
    status: aiReady ? "operational" : "degraded",
    timestamp: new Date().toISOString(),
    checks: {
      aiProviders: aiReady ? "configured" : "NOT CONFIGURED — at least one AI API key required",
      database: dbReady ? "configured" : "not configured — analytics will use temp storage",
    },
    version: "4.0.0",
  });
}
