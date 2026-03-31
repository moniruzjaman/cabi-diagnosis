import { appendFeedback, readStore } from "./storage.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const item = {
    context: body.context || "Unknown",
    rating: body.rating || 0,
    feedback: body.feedback || "",
    email: body.email || "",
    summary: body.summary || "",
    visitorId: body.visitorId || "",
    createdAt: new Date().toISOString(),
  };

  await appendFeedback(item);
  const store = await readStore();

  return res.status(200).json({ ok: true, count: Array.isArray(store.feedback) ? store.feedback.length : null, persistence: (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) ? "supabase-rls" : (process.env.VERCEL ? "temporary-instance-storage" : "local-file-storage") });
}
