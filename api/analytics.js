import { readStore, writeStore } from "./storage.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

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

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const visitorId = String(body.visitorId || "").trim();
  const section = String(body.section || "app").trim();

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
    persistence: process.env.SUPABASE_URL ? "supabase" : (process.env.VERCEL ? "temporary-instance-storage" : "local-file-storage"),
  });
}
