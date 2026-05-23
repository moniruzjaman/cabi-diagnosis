import { readStore, writeStore } from "./storage.js";
import { handleCORSPreflight, setCORSHeaders } from "./_lib/cors.js";
import { analyticsLimiter } from "./_lib/rateLimit.js";
import { parseBody, validateVisitorId, validateSection } from "./_lib/validation.js";
import { requireSignedRequest } from "./_lib/requestSigning.js";

export default async function handler(req, res) {
  if (handleCORSPreflight(req, res, "GET, POST, OPTIONS")) return;
  setCORSHeaders(req, res, "GET, POST, OPTIONS");

  if (req.method === "GET") {
    const store = await readStore();
    return res.status(200).json({
      totalVisits: store.totalVisits,
      uniqueVisitors: store.uniqueVisitors,
      sections: store.sections,
      updatedAt: store.updatedAt,
    });
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Verify request signature on POST (prevents external API abuse)
  if (requireSignedRequest(req, res)) return;

  // Rate limiting on POST
  if (analyticsLimiter(req, res)) return;

  const body = parseBody(req);
  if (!body) return res.status(400).json({ error: "Invalid JSON body" });

  const visitorId = validateVisitorId(body.visitorId);
  const section = validateSection(body.section);

  if (!visitorId) return res.status(400).json({ error: "visitorId is required" });

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

  await writeStore(store);

  return res.status(200).json({
    totalVisits: store.totalVisits,
    uniqueVisitors: store.uniqueVisitors,
    sections: store.sections,
    visitor: store.visitors[visitorId],
    updatedAt: store.updatedAt,
    persistence: (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) ? "supabase-rls" : (process.env.VERCEL ? "temporary-instance-storage" : "local-file-storage"),
  });
}
