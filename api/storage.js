import { promises as fs } from "fs";
import path from "path";

const DEFAULT_DATA = {
  totalVisits: 0,
  uniqueVisitors: 0,
  visitors: {},
  sections: {},
  feedback: [],
  updatedAt: null,
};

function getStoragePath() {
  if (process.env.VERCEL) return path.join("/tmp", "cabi-analytics.json");
  return path.join(process.cwd(), ".data", "cabi-analytics.json");
}

function hasSupabase() {
  return !!(
    (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY)
  );
}

function getSupabaseHeaders(prefer = "") {
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  return {
    "Content-Type": "application/json",
    apikey: publishableKey,
    Authorization: `Bearer ${publishableKey}`,
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

export async function readStore() {
  if (hasSupabase()) {
    try {
      const baseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const url = `${baseUrl}/rest/v1/analytics_state?id=eq.main&select=*`;
      const res = await fetch(url, { headers: getSupabaseHeaders() });
      const data = await res.json();
      if (Array.isArray(data) && data[0]) {
        const row = data[0];
        return {
          ...DEFAULT_DATA,
          totalVisits: row.total_visits || 0,
          uniqueVisitors: row.unique_visitors || 0,
          visitors: row.visitors || {},
          sections: row.sections || {},
          updatedAt: row.updated_at || null,
        };
      }
    } catch {}
    return { ...DEFAULT_DATA };
  }
  const filePath = getStoragePath();
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return { ...DEFAULT_DATA, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_DATA };
  }
}

export async function writeStore(data) {
  if (hasSupabase()) {
    const payload = {
      id: "main",
      total_visits: data.totalVisits || 0,
      unique_visitors: data.uniqueVisitors || 0,
      visitors: data.visitors || {},
      sections: data.sections || {},
      updated_at: new Date().toISOString(),
    };
    const baseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const url = `${baseUrl}/rest/v1/analytics_state?on_conflict=id`;
    await fetch(url, {
      method: "POST",
      headers: getSupabaseHeaders("resolution=merge-duplicates,return=representation"),
      body: JSON.stringify(payload),
    });
    return;
  }
  const filePath = getStoragePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify({ ...data, updatedAt: new Date().toISOString() }, null, 2), "utf8");
}

export async function appendFeedback(item) {
  if (hasSupabase()) {
    const baseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const url = `${baseUrl}/rest/v1/feedback_entries`;
    await fetch(url, {
      method: "POST",
      headers: getSupabaseHeaders("return=minimal"),
      body: JSON.stringify({
        context: item.context || "Unknown",
        rating: item.rating || 0,
        feedback: item.feedback || "",
        email: item.email || "",
        summary: item.summary || "",
        visitor_id: item.visitorId || "",
        created_at: item.createdAt || new Date().toISOString(),
      }),
    });
    return;
  }

  const store = await readStore();
  store.feedback = [...(store.feedback || []), item].slice(-200);
  await writeStore(store);
}
