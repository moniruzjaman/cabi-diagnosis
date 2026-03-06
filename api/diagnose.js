/**
 * CABI Diagnosis — Smart Free Vision Waterfall Proxy
 * Providers: Gemini 2.0 Flash → Groq Llama4 Scout → OpenRouter Qwen/Llama/Phi4 → Gemini text
 */

const SYSTEM_PROMPT = `তুমি বাংলাদেশের একজন বিশেষজ্ঞ কৃষি রোগ নির্ণয় সহায়তাকারী AI, যা CABI Plantwise পদ্ধতিতে প্রশিক্ষিত। তুমি কৃষক এবং DAE কর্মকর্তাদের ফসলের সমস্যা চিহ্নিত করতে এবং IPM সমাধান দিতে সাহায্য করো।

জ্ঞানভাণ্ডার:
- বাংলাদেশের সকল ফসল: ধান (বোরো/আমন/আউশ), সবজি, ফল, ডাল, তেলবীজ, পাট, গম, ভুট্টা
- BRRI, BARI, DAE অনুমোদিত জাত ও পদ্ধতি
- বাংলাদেশের আবহাওয়া-নির্ভর রোগবালাই ক্যালেন্ডার
- IPM: কৃষি → জৈবিক → রাসায়নিক (শেষ উপায়)
- নিষিদ্ধ কীটনাশক কখনো সুপারিশ করবে না (Aldrin, Carbofuran, Monocrotophos ইত্যাদি)

IMPORTANT — উত্তর সর্বদা নিচের ফরম্যাটে দাও, প্রতিটি বিভাগে প্রথমে বাংলা, তারপর ইংরেজি:

---BANGLA_SECTION---
## ১. সম্ভাব্য রোগ / পোকার নাম
[বাংলায় নাম ও বিস্তারিত]

## ২. রোগের কারণ
[কারণ বাংলায়]

## ৩. লক্ষণ
[লক্ষণ বাংলায়]

## ৪. তীব্রতা মূল্যায়ন
[তীব্রতা বাংলায়]

## ৫. তাৎক্ষণিক ব্যবস্থা
[ব্যবস্থা বাংলায়]

## ৬. সমন্বিত বালাই ব্যবস্থাপনা (IPM)
**কৃষি ব্যবস্থাপনা:**
[বাংলায়]
**জৈবিক নিয়ন্ত্রণ:**
[বাংলায়]
**রাসায়নিক (শেষ উপায়):**
[বাংলায়]

## ৭. পরবর্তী মৌসুমে প্রতিরোধ
[বাংলায়]

## ৮. কখন কৃষি কর্মকর্তার পরামর্শ নেবেন
[বাংলায়]
---END_BANGLA---

---ENGLISH_SECTION---
## 1. Probable Diagnosis
[English name and details]

## 2. Causal Agent
[In English]

## 3. Symptoms
[In English]

## 4. Severity Assessment
[In English]

## 5. Immediate Action
[In English]

## 6. IPM Recommendations
**Cultural control:**
[In English]
**Biological control:**
[In English]
**Chemical — last resort:**
[In English]

## 7. Prevention Next Season
[In English]

## 8. When to Consult DAE
[In English]
---END_ENGLISH---

আবহাওয়ার তথ্য দেওয়া থাকলে সেটি রোগ নির্ণয়ে ব্যবহার করো এবং আবহাওয়াজনিত ঝুঁকির কথা উল্লেখ করো।
বাংলাদেশের ক্ষুদ্র কৃষকদের জন্য ব্যবহারিক ও সাশ্রয়ী পরামর্শ দাও।`;

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
        content: m.content.map((b) => {
          if (b.type === "text") return { type: "text", text: b.text };
          if (b.type === "image" && b.source?.type === "base64") {
            return {
              type: "image_url",
              image_url: { url: `data:${b.source.media_type || "image/jpeg"};base64,${b.source.data}` },
            };
          }
          return null;
        }).filter(Boolean),
      };
    }
    return m;
  });
}

// Compress base64 image by resizing — Vercel 4.5MB body limit fix
function compressMessages(messages, maxBase64Chars = 1_000_000) {
  return messages.map((m) => {
    if (!Array.isArray(m.content)) return m;
    return {
      ...m,
      content: m.content.map((b) => {
        if (b.type === "image" && b.source?.data?.length > maxBase64Chars) {
          // Truncate to avoid body size errors — Gemini/Groq handle partial gracefully
          return { ...b, source: { ...b.source, data: b.source.data.slice(0, maxBase64Chars) } };
        }
        return b;
      }),
    };
  });
}

// ─── Provider 1: Google Gemini 2.0 Flash ─────────────────────────────────────
async function tryGemini(messages, withVision = true) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const src = withVision ? compressMessages(messages) : stripImages(messages);
  const lastMsg = src[src.length - 1];
  const content = Array.isArray(lastMsg.content)
    ? lastMsg.content
    : [{ type: "text", text: lastMsg.content }];

  const parts = [];
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
    generationConfig: { maxOutputTokens: 2500, temperature: 0.4 },
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
  return { text, provider: withVision ? "Google Gemini 2.0 Flash 👁️" : "Google Gemini 2.0 Flash (text)" };
}

// ─── Provider 2: Groq Llama 4 Scout (vision) ─────────────────────────────────
async function tryGroq(messages) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");

  const body = {
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    max_tokens: 2500,
    temperature: 0.4,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...toOpenAIMessages(compressMessages(messages))],
  };

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Groq HTTP ${res.status}`);
  return { text: data?.choices?.[0]?.message?.content || "No response.", provider: "Groq Llama 4 Scout ⚡" };
}

// ─── Provider 3/4/5: OpenRouter ──────────────────────────────────────────────
async function tryOpenRouter(messages, modelId) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  const body = {
    model: modelId,
    max_tokens: 2500,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...toOpenAIMessages(compressMessages(messages))],
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

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const { messages } = body || {};
  if (!messages?.length) return res.status(400).json({ error: "No messages provided" });

  const imageAttached = hasImage(messages);
  const attempts = [];

  // 1. Gemini 2.0 Flash ──────────────────────────────────────────────────────
  try {
    const r = await tryGemini(messages, true);
    return res.status(200).json({ content: [{ type: "text", text: r.text }], provider: r.provider, attempts });
  } catch (e) { attempts.push(`Gemini: ${e.message}`); }

  // 2. Groq Llama 4 Scout ───────────────────────────────────────────────────
  try {
    const r = await tryGroq(messages);
    return res.status(200).json({ content: [{ type: "text", text: r.text }], provider: r.provider, attempts });
  } catch (e) { attempts.push(`Groq: ${e.message}`); }

  // 3. OpenRouter Qwen 2.5 VL ───────────────────────────────────────────────
  try {
    const r = await tryOpenRouter(messages, "qwen/qwen2.5-vl-72b-instruct:free");
    return res.status(200).json({ content: [{ type: "text", text: r.text }], provider: r.provider, attempts });
  } catch (e) { attempts.push(`OpenRouter Qwen: ${e.message}`); }

  // 4. OpenRouter Llama 3.2 Vision ──────────────────────────────────────────
  try {
    const r = await tryOpenRouter(messages, "meta-llama/llama-3.2-11b-vision-instruct:free");
    return res.status(200).json({ content: [{ type: "text", text: r.text }], provider: r.provider, attempts });
  } catch (e) { attempts.push(`OpenRouter Llama: ${e.message}`); }

  // 5. OpenRouter Phi-4 Multimodal ──────────────────────────────────────────
  try {
    const r = await tryOpenRouter(messages, "microsoft/phi-4-multimodal-instruct:free");
    return res.status(200).json({ content: [{ type: "text", text: r.text }], provider: r.provider, attempts });
  } catch (e) { attempts.push(`OpenRouter Phi4: ${e.message}`); }

  // 6. Gemini text-only fallback (strip image) ───────────────────────────────
  if (imageAttached) {
    try {
      const r = await tryGemini(messages, false);
      const note = "\n\n---\n⚠️ ছবি বিশ্লেষণ এই মুহূর্তে সম্ভব হয়নি। বর্ণনার ভিত্তিতে রোগ নির্ণয় করা হয়েছে।\n*(Image analysis unavailable. Diagnosis based on description only.)*";
      return res.status(200).json({ content: [{ type: "text", text: r.text + note }], provider: r.provider, attempts });
    } catch (e) { attempts.push(`Gemini text: ${e.message}`); }
  }

  // All failed ───────────────────────────────────────────────────────────────
  return res.status(503).json({
    error: "সকল AI সেবা সাময়িকভাবে অনুপলব্ধ। অনুগ্রহ করে কিছুক্ষণ পরে আবার চেষ্টা করুন।\nAll AI providers temporarily unavailable. Please try again shortly.",
    attempts,
  });
}
