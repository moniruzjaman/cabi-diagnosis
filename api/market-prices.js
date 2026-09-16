/**
 * GET /api/market-prices
 * Returns the latest market prices scraped from dam.gov.bd and stored in Turso.
 */

import { getTursoClient, hasTurso, ensureSchema } from "./_lib/turso.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, max-age=1800"); // 30 min cache

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!hasTurso()) {
    return res.status(200).json({ prices: [], source: "unavailable" });
  }

  try {
    await ensureSchema();
    const db = getTursoClient();

    const result = await db.execute(
      `SELECT commodity, market, retail_price_min, retail_price_max, wholesale_price_min, wholesale_price_max, date, updated_at
       FROM market_prices
       ORDER BY updated_at DESC
       LIMIT 50`
    );

    const prices = result.rows.map((r) => ({
      commodity: r.commodity,
      market: r.market,
      retail_price_min: r.retail_price_min,
      retail_price_max: r.retail_price_max,
      wholesale_price_min: r.wholesale_price_min,
      wholesale_price_max: r.wholesale_price_max,
      date: r.date,
      updated_at: r.updated_at,
    }));

    return res.status(200).json({ prices, source: "turso", count: prices.length });
  } catch (err) {
    console.error("[market-prices] Error:", err.message);
    return res.status(500).json({ error: "Failed to fetch market prices", prices: [] });
  }
}
