/**
 * Quick health-check endpoint — tests each provider and returns results
 * Visit: https://your-app.vercel.app/api/test
 *
 * SECURITY: No API key values are exposed — only "set" or "not set" status.
 */

import { handleCORSPreflight, setCORSHeaders } from "./_lib/cors.js";

export default async function handler(req, res) {
  if (handleCORSPreflight(req, res, "GET, OPTIONS")) return;
  setCORSHeaders(req, res, "GET, OPTIONS");

  const results = {};

  // Check env vars exist — do NOT expose any part of the key
  results.env = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? "set" : "NOT SET",
    GROQ_API_KEY: process.env.GROQ_API_KEY ? "set" : "NOT SET",
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ? "set" : "NOT SET",
    SUPABASE_URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "NOT SET",
  };

  // Test Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "Reply with just: OK" }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
      });
      const d = await r.json();
      results.gemini = r.ok ? `OK — ${d?.candidates?.[0]?.content?.parts?.[0]?.text}` : `FAILED — ${d?.error?.message?.slice(0, 80)}`;
    } catch (e) {
      results.gemini = `FAILED — ${e.message?.slice(0, 80)}`;
    }
  } else {
    results.gemini = "SKIPPED — key not set";
  }

  // Test Groq
  if (process.env.GROQ_API_KEY) {
    try {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          max_tokens: 10,
          messages: [{ role: "user", content: "Reply with just: OK" }],
        }),
      });
      const d = await r.json();
      results.groq = r.ok ? `OK — ${d?.choices?.[0]?.message?.content}` : `FAILED — ${d?.error?.message?.slice(0, 80)}`;
    } catch (e) {
      results.groq = `FAILED — ${e.message?.slice(0, 80)}`;
    }
  } else {
    results.groq = "SKIPPED — key not set";
  }

  // Test OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://cabi-diagnosis.vercel.app",
        },
        body: JSON.stringify({
          model: "qwen/qwen2.5-vl-72b-instruct:free",
          max_tokens: 10,
          messages: [{ role: "user", content: "Reply with just: OK" }],
        }),
      });
      const d = await r.json();
      results.openrouter = r.ok ? `OK — ${d?.choices?.[0]?.message?.content}` : `FAILED — ${d?.error?.message?.slice(0, 80)}`;
    } catch (e) {
      results.openrouter = `FAILED — ${e.message?.slice(0, 80)}`;
    }
  } else {
    results.openrouter = "SKIPPED — key not set";
  }

  return res.status(200).json(results);
}
