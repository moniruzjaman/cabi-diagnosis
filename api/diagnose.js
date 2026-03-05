/**
 * CABI Diagnosis — Smart Free Vision Waterfall Proxy
 *
 * Provider chain (all FREE):
 *  1. Google Gemini 2.0 Flash        — 1,500 req/day, best vision quality
 *  2. Groq Llama 3.2 90B Vision      — ~14,400 req/day, ultra fast
 *  3. OpenRouter qwen2.5-vl-72b:free — strong vision
 *  4. OpenRouter llama-3.2-11b:free  — fallback vision
 *  5. OpenRouter phi-4-multimodal    — fallback vision
 *  6. Gemini text-only (image strip) — last resort, still diagnoses from text
 *
 * Vercel env vars needed (all free):
 *   GEMINI_API_KEY       → https://aistudio.google.com/app/apikey
 *   GROQ_API_KEY         → https://console.groq.com
 *   OPENROUTER_API_KEY   → https://openrouter.ai
 */

const SYSTEM_PROMPT = `You are an expert agricultural plant disease and pest diagnostic AI assistant for Bangladesh, trained in the CABI Plantwise methodology. You help farmers and extension officers (DAE) identify crop problems and recommend IPM solutions suitable for Bangladesh.

Knowledge base:
- All Bangladesh crops: rice (Boro/Aman/Aus), vegetables, fruits, pulses, oilseeds, jute, wheat, maize
- BRRI, BARI, DAE recommended practices and varieties
- Bangladesh-specific pests, diseases, nutrient deficiencies
- Seasonal pest calendars for Bangladesh agro-ecological zones
- IPM: cultural → biological → chemical (last resort only)
- Plantwise Red List: NEVER recommend Aldrin, Carbofuran, Monocrotophos or other banned pesticides

Always respond in BOTH Bangla and English using this format:
1. **Probable Diagnosis** (রোগ/পোকার নাম)
2. **Causal Agent** (রোগের কারণ)
3. **Symptoms Observed** (লক্ষণ)
4. **Severity Assessment** (তীব্রতা)
5. **Immediate Action** (তাৎক্ষণিক ব্যবস্থা)
6. **IPM Recommendations**
   - Cultural control (কৃষি ব্যবস্থাপনা)
   - Biological control (জৈবিক নিয়ন্ত্রণ)
   - Chemical — last resort (রাসায়নিক — শেষ উপায়)
7. **Prevention Next Season** (প্রতিরোধ)
8. **When to Consult DAE** (কৃষি কর্মকর্তার পরামর্শ কখন নেবেন)

Be practical and affordable for smallholder farmers in Bangladesh.`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasImage(messages) {
  return messages.some(
    (m) => Array.isArray(m.content) && m.content.some((b) => b.type === "image")
  );
}

function stripImages(messages) {
  return messages.map((m) => ({
    ...m,
    content: Array.isArray(m.content)
      ? m.content.filter((b) => b.type !== "image")
      : m.content,
  }));
}

function toOpenAIMessages(messages) {
  return messages.map((m) => {
    if (typeof m.content === "string") return { role: m.role, content: m.content };
    if (Array.isArray(m.content)) {
      return {
        role: m.role,
        content: m.content
          .map((b) => {
            if (b.type === "text") return { type: "text", text: b.text };
            if (b.type === "image" && b.source?.type === "base64") {
              return {
                type: "image_url",
                image_url: {
                  url: `data:${b.source.media_type || "image/jpeg"};base64,${b.source.data}`,
                },
              };
            }
            return null;
          })
          .filter(Boolean),
      };
    }
    return m;
  });
}

// ─── Provider 1: Google Gemini 2.0 Flash ─────────────────────────────────────
async function tryGemini(messages, withVision = true) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const src = withVision ? messages : stripImages(messages);
  const lastMsg = src[src.length - 1];

  const parts = [];
  const content = Array.isArray(lastMsg.content) ? lastMsg.content : [{ type: "text", text: lastMsg.content }];
  for (const block of content) {
    if (block.type === "image" && block.source?.type === "base64") {
      parts.push({ inlineData: { mimeType: block.source.media_type || "image/jpeg", data: block.source.data } });
    } else if (block.type === "text") {
      parts.push({ text: block.text });
    }
  }

  const body = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts }],
    generationConfig: { maxOutputTokens: 2048, temperature: 0.4 },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Gemini HTTP ${res.status}`);

  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("\n") || "No response.";
  return { text, provider: withVision ? "Google Gemini 2.0 Flash 👁️" : "Google Gemini 2.0 Flash (text only)" };
}

// ─── Provider 2: Groq Llama 3.2 90B Vision ───────────────────────────────────
async function tryGroq(messages) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");

  const body = {
    model: "llama-3.2-90b-vision-preview",
    max_tokens: 2048,
    temperature: 0.4,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...toOpenAIMessages(messages)],
  };

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Groq HTTP ${res.status}`);

  return { text: data?.choices?.[0]?.message?.content || "No response.", provider: "Groq Llama 3.2 90B Vision ⚡" };
}

// ─── Provider 3/4/5: OpenRouter ──────────────────────────────────────────────
async function tryOpenRouter(messages, modelId) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  const body = {
    model: modelId,
    max_tokens: 2048,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...toOpenAIMessages(messages)],
  };

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://cabi-diagnosis.vercel.app",
      "X-Title": "CABI Bangladesh Crop Diagnosis",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data?.error?.message || `OpenRouter HTTP ${res.status}`);

  const label = modelId.split("/").pop().replace(":free", "");
  return { text: data?.choices?.[0]?.message?.content || "No response.", provider: `OpenRouter / ${label} 🔀` };
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { messages } = req.body;
  if (!messages?.length) return res.status(400).json({ error: "No messages provided" });

  const imageAttached = hasImage(messages);
  const attempts = [];

  // 1. Gemini 2.0 Flash — best free vision ───────────────────────────────────
  try {
    const r = await tryGemini(messages, true);
    return res.status(200).json({ content: [{ type: "text", text: r.text }], provider: r.provider, attempts });
  } catch (e) { attempts.push(`Gemini vision: ${e.message}`); }

  // 2. Groq Llama 3.2 90B Vision — ultra fast ────────────────────────────────
  if (imageAttached) {
    try {
      const r = await tryGroq(messages);
      return res.status(200).json({ content: [{ type: "text", text: r.text }], provider: r.provider, attempts });
    } catch (e) { attempts.push(`Groq: ${e.message}`); }
  }

  // 3. OpenRouter Qwen 2.5 VL 72B ────────────────────────────────────────────
  try {
    const r = await tryOpenRouter(messages, "qwen/qwen2.5-vl-72b-instruct:free");
    return res.status(200).json({ content: [{ type: "text", text: r.text }], provider: r.provider, attempts });
  } catch (e) { attempts.push(`OpenRouter Qwen2.5-VL: ${e.message}`); }

  // 4. OpenRouter Llama 3.2 11B Vision ───────────────────────────────────────
  try {
    const r = await tryOpenRouter(messages, "meta-llama/llama-3.2-11b-vision-instruct:free");
    return res.status(200).json({ content: [{ type: "text", text: r.text }], provider: r.provider, attempts });
  } catch (e) { attempts.push(`OpenRouter Llama3.2-11B: ${e.message}`); }

  // 5. OpenRouter Phi-4 Multimodal ───────────────────────────────────────────
  try {
    const r = await tryOpenRouter(messages, "microsoft/phi-4-multimodal-instruct:free");
    return res.status(200).json({ content: [{ type: "text", text: r.text }], provider: r.provider, attempts });
  } catch (e) { attempts.push(`OpenRouter Phi-4: ${e.message}`); }

  // 6. Gemini text-only — strip image, diagnose from description ─────────────
  if (imageAttached) {
    try {
      const r = await tryGemini(messages, false);
      const note = "\n\n---\n⚠️ **ছবি বিশ্লেষণ এই মুহূর্তে সম্ভব হয়নি।** শুধুমাত্র আপনার বর্ণনার ভিত্তিতে রোগ নির্ণয় করা হয়েছে। *(Image analysis temporarily unavailable. Diagnosis based on your description only.)*";
      return res.status(200).json({ content: [{ type: "text", text: r.text + note }], provider: r.provider, attempts });
    } catch (e) { attempts.push(`Gemini text fallback: ${e.message}`); }
  }

  // All failed ────────────────────────────────────────────────────────────────
  return res.status(503).json({
    error: "সকল AI সেবা সাময়িকভাবে অনুপলব্ধ। অনুগ্রহ করে কিছুক্ষণ পরে আবার চেষ্টা করুন।\nAll AI providers temporarily unavailable. Please try again shortly.",
    attempts,
  });
}
