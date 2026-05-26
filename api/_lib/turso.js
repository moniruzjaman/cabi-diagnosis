/**
 * Turso (LibSQL) Database Helper
 *
 * Replaces Supabase with Turso — edge-native SQLite with:
 *   - Free tier: 9GB storage, 1B reads/month, 25M writes/month
 *   - No project pausing (unlike Supabase free tier)
 *   - No quota limits for this app's usage
 *   - Low latency from Vercel serverless (edge-native)
 *
 * Required env vars:
 *   TURSO_DATABASE_URL  — e.g. libsql://your-db-name-your-org.turso.io
 *   TURSO_AUTH_TOKEN    — authentication token from Turso dashboard
 *
 * If not configured, falls back to local JSON file storage.
 */

import { createClient } from "@libsql/client";
import { promises as fs } from "fs";
import path from "path";

// ─── Singleton Turso client ────────────────────────────────────
let _tursoClient = null;

function hasTurso() {
  return !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
}

export function getTursoClient() {
  if (_tursoClient) return _tursoClient;
  if (!hasTurso()) return null;

  _tursoClient = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  return _tursoClient;
}

// ─── Schema initialization (auto-creates tables) ───────────────
let _schemaInitialized = false;

export async function ensureSchema() {
  if (_schemaInitialized) return;
  const db = getTursoClient();
  if (!db) return;

  try {
    // Analytics state — single-row table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS analytics_state (
        id TEXT PRIMARY KEY DEFAULT 'main',
        total_visits INTEGER DEFAULT 0,
        unique_visitors INTEGER DEFAULT 0,
        visitors TEXT DEFAULT '{}',
        sections TEXT DEFAULT '{}',
        updated_at TEXT
      )
    `);

    // Feedback entries
    await db.execute(`
      CREATE TABLE IF NOT EXISTS feedback_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        context TEXT DEFAULT '',
        rating INTEGER DEFAULT 0,
        feedback TEXT DEFAULT '',
        email TEXT DEFAULT '',
        summary TEXT DEFAULT '',
        visitor_id TEXT DEFAULT '',
        created_at TEXT
      )
    `);

    // Online presence
    await db.execute(`
      CREATE TABLE IF NOT EXISTS presence_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        visitor_id TEXT NOT NULL,
        section TEXT DEFAULT 'home',
        user_agent TEXT DEFAULT '',
        ip_hash TEXT DEFAULT '',
        country TEXT DEFAULT '',
        is_pwa INTEGER DEFAULT 0,
        last_heartbeat TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Index for fast presence lookups
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_presence_visitor ON presence_log(visitor_id)
    `);
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_presence_heartbeat ON presence_log(last_heartbeat)
    `);
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback_entries(created_at)
    `);

    // Ensure analytics row exists
    await db.execute(`
      INSERT OR IGNORE INTO analytics_state (id) VALUES ('main')
    `);

    _schemaInitialized = true;
  } catch (err) {
    console.error("Turso schema init error:", err.message);
  }
}

// ─── Local file fallback ────────────────────────────────────────
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

// ─── Read/Write store (Turso → local file fallback) ────────────

export async function readStore() {
  const db = getTursoClient();

  if (db) {
    try {
      await ensureSchema();
      const result = await db.execute("SELECT * FROM analytics_state WHERE id = 'main'");
      const row = result.rows[0];

      if (row) {
        return {
          ...DEFAULT_DATA,
          totalVisits: Number(row.total_visits) || 0,
          uniqueVisitors: Number(row.unique_visitors) || 0,
          visitors: typeof row.visitors === "string" ? JSON.parse(row.visitors) : (row.visitors || {}),
          sections: typeof row.sections === "string" ? JSON.parse(row.sections) : (row.sections || {}),
          updatedAt: row.updated_at || null,
        };
      }
    } catch (err) {
      console.error("Turso readStore error:", err.message);
    }
    return { ...DEFAULT_DATA };
  }

  // Fallback: local JSON file
  const filePath = getStoragePath();
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return { ...DEFAULT_DATA, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_DATA };
  }
}

export async function writeStore(data) {
  const db = getTursoClient();

  if (db) {
    try {
      await ensureSchema();
      await db.execute({
        sql: `UPDATE analytics_state SET
                total_visits = ?,
                unique_visitors = ?,
                visitors = ?,
                sections = ?,
                updated_at = ?
              WHERE id = 'main'`,
        args: [
          data.totalVisits || 0,
          data.uniqueVisitors || 0,
          JSON.stringify(data.visitors || {}),
          JSON.stringify(data.sections || {}),
          new Date().toISOString(),
        ],
      });
      return;
    } catch (err) {
      console.error("Turso writeStore error:", err.message);
    }
  }

  // Fallback: local JSON file
  const filePath = getStoragePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify({ ...data, updatedAt: new Date().toISOString() }, null, 2), "utf8");
}

export async function appendFeedback(item) {
  const db = getTursoClient();

  if (db) {
    try {
      await ensureSchema();
      await db.execute({
        sql: `INSERT INTO feedback_entries (context, rating, feedback, email, summary, visitor_id, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          item.context || "Unknown",
          item.rating || 0,
          item.feedback || "",
          item.email || "",
          item.summary || "",
          item.visitorId || "",
          item.createdAt || new Date().toISOString(),
        ],
      });
      return;
    } catch (err) {
      console.error("Turso appendFeedback error:", err.message);
    }
  }

  // Fallback: append to local store
  const store = await readStore();
  store.feedback = [...(store.feedback || []), item].slice(-200);
  await writeStore(store);
}

// ─── Presence helpers ───────────────────────────────────────────

export async function upsertPresence(visitorId, section, userAgent, ipHash, country, isPwa) {
  const db = getTursoClient();
  if (!db) return;

  try {
    await ensureSchema();
    const now = new Date().toISOString();

    // Check existing
    const existing = await db.execute({
      sql: "SELECT id FROM presence_log WHERE visitor_id = ? LIMIT 1",
      args: [visitorId],
    });

    if (existing.rows.length > 0) {
      // Update heartbeat
      await db.execute({
        sql: `UPDATE presence_log SET
                section = ?, user_agent = ?, ip_hash = ?, country = ?,
                is_pwa = ?, last_heartbeat = ?
              WHERE id = ?`,
        args: [section || "home", (userAgent || "").slice(0, 500), ipHash, (country || "").slice(0, 100), isPwa ? 1 : 0, now, existing.rows[0].id],
      });
    } else {
      // Insert new
      await db.execute({
        sql: `INSERT INTO presence_log (visitor_id, section, user_agent, ip_hash, country, is_pwa, last_heartbeat, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [visitorId, section || "home", (userAgent || "").slice(0, 500), ipHash, (country || "").slice(0, 100), isPwa ? 1 : 0, now, now],
      });
    }
  } catch (err) {
    console.error("Turso upsertPresence error:", err.message);
  }
}

export async function removePresence(visitorId) {
  const db = getTursoClient();
  if (!db) return;

  try {
    await db.execute({
      sql: "DELETE FROM presence_log WHERE visitor_id = ?",
      args: [visitorId],
    });
  } catch (err) {
    console.error("Turso removePresence error:", err.message);
  }
}

export async function getOnlineStats(heartbeatWindowMinutes = 5) {
  const db = getTursoClient();
  if (!db) return { onlineCount: 0, bySection: {}, visitors: [] };

  try {
    const cutoff = new Date(Date.now() - heartbeatWindowMinutes * 60 * 1000).toISOString();

    const result = await db.execute({
      sql: `SELECT visitor_id, section, user_agent, is_pwa, last_heartbeat, country, created_at
            FROM presence_log
            WHERE last_heartbeat >= ?
            ORDER BY last_heartbeat DESC`,
      args: [cutoff],
    });

    // Deduplicate by visitor_id (keep latest)
    const seen = new Map();
    for (const row of result.rows) {
      const vid = row.visitor_id;
      if (!seen.has(vid) || new Date(row.last_heartbeat) > new Date(seen.get(vid).last_heartbeat)) {
        seen.set(vid, row);
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
        visitorId: String(v.visitor_id).slice(0, 12) + "...",
        section: v.section,
        isPwa: !!v.is_pwa,
        lastSeen: v.last_heartbeat,
        country: v.country,
      })),
    };
  } catch (err) {
    console.error("Turso getOnlineStats error:", err.message);
    return { onlineCount: 0, bySection: {}, visitors: [] };
  }
}

export async function getDailyStats(days = 7) {
  const db = getTursoClient();
  if (!db) return [];

  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const result = await db.execute({
      sql: `SELECT visitor_id, section, created_at
            FROM presence_log
            WHERE created_at >= ?
            ORDER BY created_at ASC`,
      args: [since],
    });

    const byDate = {};
    for (const row of result.rows) {
      const date = String(row.created_at).split("T")[0];
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
  } catch (err) {
    console.error("Turso getDailyStats error:", err.message);
    return [];
  }
}

export async function cleanupStalePresence(maxAgeMinutes = 15) {
  const db = getTursoClient();
  if (!db) return;

  try {
    const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000).toISOString();
    await db.execute({
      sql: "DELETE FROM presence_log WHERE last_heartbeat < ?",
      args: [cutoff],
    });
  } catch (err) {
    console.error("Turso cleanupStalePresence error:", err.message);
  }
}
