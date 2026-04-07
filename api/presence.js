// ─── Presence / Real-time User Tracking API ────────────────────────
// POST /api/presence  — Register/update heartbeat (called every 30s)
// GET  /api/presence  — Get current online users count & stats
// DELETE /api/presence — Remove presence (on app close)

import { readStore } from "./storage.js";

const HEARTBEAT_WINDOW = 5; // minutes — users active if heartbeat within this window

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}

function getSupabaseHeaders(prefer = "") {
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  return {
    "Content-Type": "application/json",
    apikey: publishableKey,
    Authorization: `Bearer ${publishableKey}`,
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

function hasSupabase() {
  return !!(getSupabaseUrl() && (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY));
}

// ─── Supabase presence helpers ──────────────────────────────────────
async function supabaseUpsertPresence(visitorId, section, userAgent, ip, country, isPwa) {
  const baseUrl = getSupabaseUrl();
  const now = new Date().toISOString();
  const ipHash = ip ? crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16) : "unknown";

  // Check if existing record for this visitor
  const existingUrl = `${baseUrl}/rest/v1/presence_log?visitor_id=eq.${encodeURIComponent(visitorId)}&select=id`;
  const existingRes = await fetch(existingUrl, { headers: getSupabaseHeaders() });
  const existing = await existingRes.json();

  if (Array.isArray(existing) && existing.length > 0) {
    // Update heartbeat
    const updateUrl = `${baseUrl}/rest/v1/presence_log?id=eq.${existing[0].id}`;
    await fetch(updateUrl, {
      method: "PATCH",
      headers: getSupabaseHeaders("return=minimal"),
      body: JSON.stringify({
        section: section || "home",
        user_agent: (userAgent || "").slice(0, 500),
        ip_hash: ipHash,
        country: (country || "").slice(0, 100),
        is_pwa: isPwa || false,
        last_heartbeat: now,
      }),
    });
  } else {
    // Insert new
    await fetch(`${baseUrl}/rest/v1/presence_log`, {
      method: "POST",
      headers: getSupabaseHeaders("return=minimal"),
      body: JSON.stringify({
        visitor_id: visitorId,
        section: section || "home",
        user_agent: (userAgent || "").slice(0, 500),
        ip_hash: ipHash,
        country: (country || "").slice(0, 100),
        is_pwa: isPwa || false,
        last_heartbeat: now,
      }),
    });
  }
}

async function supabaseRemovePresence(visitorId) {
  const baseUrl = getSupabaseUrl();
  await fetch(`${baseUrl}/rest/v1/presence_log?visitor_id=eq.${encodeURIComponent(visitorId)}`, {
    method: "DELETE",
    headers: getSupabaseHeaders(),
  });
}

async function supabaseGetOnlineStats() {
  const baseUrl = getSupabaseUrl();
  const cutoff = new Date(Date.now() - HEARTBEAT_WINDOW * 60 * 1000).toISOString();

  // Get active users in last 5 minutes
  const url = `${baseUrl}/rest/v1/presence_log?last_heartbeat=gte.${cutoff}&select=visitor_id,section,user_agent,is_pwa,last_heartbeat,country,created_at`;
  const res = await fetch(url, { headers: getSupabaseHeaders() });
  const rows = await res.json();

  if (!Array.isArray(rows)) return { onlineCount: 0, bySection: {}, visitors: [] };

  // Deduplicate by visitor_id (keep latest heartbeat)
  const seen = new Map();
  for (const row of rows) {
    if (!seen.has(row.visitor_id) || new Date(row.last_heartbeat) > new Date(seen.get(row.visitor_id).last_heartbeat)) {
      seen.set(row.visitor_id, row);
    }
  }

  const visitors = Array.from(seen.values());
  const bySection = {};
  for (const v of visitors) {
    bySection[v.section] = (bySection[v.section] || 0) + 1;
  }

  return {
    onlineCount: visitors.length,
    bySection,
    visitors: visitors.slice(0, 50).map((v) => ({
      visitorId: v.visitor_id.slice(0, 12) + "...",
      section: v.section,
      isPwa: v.is_pwa,
      lastSeen: v.last_heartbeat,
      country: v.country,
    })),
  };
}

async function supabaseGetDailyStats(days = 7) {
  const baseUrl = getSupabaseUrl();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const url = `${baseUrl}/rest/v1/presence_log?created_at=gte.${since}&select=visitor_id,section,created_at`;
  const res = await fetch(url, { headers: getSupabaseHeaders() });
  const rows = await res.json();
  if (!Array.isArray(rows)) return [];

  // Group by date
  const byDate = {};
  for (const row of rows) {
    const date = row.created_at?.split("T")[0];
    if (!date) continue;
    if (!byDate[date]) byDate[date] = { date, uniqueVisitors: new Set(), sections: {}, totalVisits: 0 };
    byDate[date].uniqueVisitors.add(row.visitor_id);
    byDate[date].sections[row.section] = (byDate[date].sections[row.section] || 0) + 1;
    byDate[date].totalVisits++;
  }

  return Object.values(byDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      date: d.date,
      uniqueVisitors: d.uniqueVisitors.size,
      totalVisits: d.totalVisits,
      sections: d.sections,
    }));
}

// ─── Cleanup stale records (called periodically) ────────────────────
async function supabaseCleanup() {
  if (!hasSupabase()) return;
  const baseUrl = getSupabaseUrl();
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  await fetch(`${baseUrl}/rest/v1/presence_log?last_heartbeat=lt.${cutoff}`, {
    method: "DELETE",
    headers: getSupabaseHeaders(),
  });
}

// ─── Main handler ──────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(200).end();

  // Periodically clean stale records (1 in 20 chance)
  if (Math.random() < 0.05) supabaseCleanup().catch(() => {});

  if (req.method === "GET") {
    return handleGet(req, res);
  }
  if (req.method === "POST") {
    return handlePost(req, res);
  }
  if (req.method === "DELETE") {
    return handleDelete(req, res);
  }
  return res.status(405).json({ error: "Method not allowed" });
}

async function handleGet(req, res) {
  const days = Math.min(parseInt(req.query?.days) || 7, 30);

  if (hasSupabase()) {
    try {
      const [onlineStats, dailyStats] = await Promise.all([
        supabaseGetOnlineStats(),
        supabaseGetDailyStats(days),
      ]);
      return res.status(200).json({
        onlineCount: onlineStats.onlineCount,
        bySection: onlineStats.bySection,
        recentVisitors: onlineStats.visitors,
        dailyStats,
        persistence: "supabase",
      });
    } catch (err) {
      console.error("Presence GET error:", err.message);
    }
  }

  // Fallback: return from local analytics
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

async function handlePost(req, res) {
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const visitorId = String(body.visitorId || "").trim();
  const section = String(body.section || "home").trim();

  if (!visitorId) return res.status(400).json({ error: "visitorId is required" });

  const userAgent = req.headers["user-agent"] || "";
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "";
  const country = req.headers["x-vercel-ip-country"] || req.headers["cf-ipcountry"] || "";
  const isPwa = body.isPwa === true;

  if (hasSupabase()) {
    try {
      await supabaseUpsertPresence(visitorId, section, userAgent, ip, country, isPwa);
      return res.status(200).json({ ok: true, persistence: "supabase" });
    } catch (err) {
      console.error("Presence POST error:", err.message);
    }
  }

  return res.status(200).json({ ok: true, persistence: "fallback" });
}

async function handleDelete(req, res) {
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const visitorId = String(body.visitorId || req.query?.visitorId || "").trim();

  if (!visitorId) return res.status(400).json({ error: "visitorId is required" });

  if (hasSupabase()) {
    try {
      await supabaseRemovePresence(visitorId);
      return res.status(200).json({ ok: true, persistence: "supabase" });
    } catch (err) {
      console.error("Presence DELETE error:", err.message);
    }
  }

  return res.status(200).json({ ok: true, persistence: "fallback" });
}
