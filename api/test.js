/**
 * Quick health-check endpoint — tests each provider and returns results
 * Visit: https://your-app.vercel.app/api/test
 */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const results = {};

  // Check env vars exist
  results.env = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? `set (${process.env.GEMINI_API_KEY.slice(0,8)}...)` : "❌ NOT SET",
    GROQ_API_KEY: process.env.GROQ_API_KEY ? `set (${process.env.GROQ_API_KEY.slice(0,8)}...)` : "❌ NOT SET",
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ? `set (${process.env.OPENROUTER_API_KEY.slice(0,8)}...)` : "❌ NOT SET",
  };

  // Test Gemini
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
    results.gemini = r.ok ? `✅ OK — ${d?.candidates?.[0]?.content?.parts?.[0]?.text}` : `❌ ${d?.error?.message}`;
  } catch (e) {
    results.gemini = `❌ ${e.message}`;
  }

  // Test Groq
  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "llama-3.2-11b-vision-preview",
        max_tokens: 10,
        messages: [{ role: "user", content: "Reply with just: OK" }],
      }),
    });
    const d = await r.json();
    results.groq = r.ok ? `✅ OK — ${d?.choices?.[0]?.message?.content}` : `❌ ${d?.error?.message}`;
  } catch (e) {
    results.groq = `❌ ${e.message}`;
  }

  // Test OpenRouter
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
    results.openrouter = r.ok ? `✅ OK — ${d?.choices?.[0]?.message?.content}` : `❌ ${d?.error?.message || JSON.stringify(d?.error)}`;
  } catch (e) {
    results.openrouter = `❌ ${e.message}`;
  }

  return res.status(200).json(results);
}
