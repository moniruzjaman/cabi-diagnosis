import { useState, useRef, useEffect, useCallback } from "react";

// ─── Inject global styles ─────────────────────────────────────────────────────
const GLOBAL_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', 'Noto Sans Bengali', sans-serif; background: #f0f4f0; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
  @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: #f0f4f0; }
  ::-webkit-scrollbar-thumb { background: #2d7a3a; border-radius: 4px; }
  input, select, textarea, button { font-family: inherit; }
`;
if (typeof document !== "undefined" && !document.getElementById("cabi-global-style")) {
  const s = document.createElement("style");
  s.id = "cabi-global-style";
  s.textContent = GLOBAL_STYLE;
  document.head.appendChild(s);
}

const C = {
  primary: "#1a7a3a", primaryLight: "#2d9d52", primaryDark: "#0f5a28",
  accent: "#f59e0b", bg: "#f0f6f1", bgCard: "#ffffff", bgMuted: "#f8faf8",
  text: "#1a2e1a", textMuted: "#6b7c6b", textLight: "#9aac9a",
  border: "#d4e8d4", success: "#16a34a", warning: "#d97706", danger: "#dc2626",
  blue: "#2563eb", shadow: "0 2px 8px rgba(0,80,30,0.10)",
};

const QUICK_CROPS = [
  { id: "rice", label: "ধান", en: "Rice", emoji: "🌾", color: "#fbbf24" },
  { id: "potato", label: "আলু", en: "Potato", emoji: "🥔", color: "#92400e" },
  { id: "tomato", label: "টমেটো", en: "Tomato", emoji: "🍅", color: "#dc2626" },
  { id: "brinjal", label: "বেগুন", en: "Brinjal", emoji: "🍆", color: "#7c3aed" },
  { id: "mustard", label: "সরিষা", en: "Mustard", emoji: "🌼", color: "#f59e0b" },
  { id: "jute", label: "পাট", en: "Jute", emoji: "🌿", color: "#16a34a" },
  { id: "mango", label: "আম", en: "Mango", emoji: "🥭", color: "#ea580c" },
  { id: "banana", label: "কলা", en: "Banana", emoji: "🍌", color: "#ca8a04" },
];

const CROPS = {
  "ধান / Rice": ["ধান (বোরো) / Rice - Boro","ধান (আমন) / Rice - Aman","ধান (আউশ) / Rice - Aus"],
  "গম ও শস্য / Cereals": ["গম / Wheat","ভুট্টা / Maize","যব / Barley"],
  "ডাল / Pulses": ["মসুর / Lentil","মুগ / Mungbean","মাষকলাই / Blackgram","সয়াবিন / Soybean","শিম / Lablab Bean","বরবটি / Yard-Long Bean"],
  "তেলবীজ / Oilseeds": ["সরিষা / Mustard","তিল / Sesame","চিনাবাদাম / Groundnut","সূর্যমুখী / Sunflower"],
  "সবজি / Vegetables": ["আলু / Potato","টমেটো / Tomato","বেগুন / Brinjal","মরিচ / Chilli","শিমলা মরিচ / Capsicum","লাউ / Bottle Gourd","কুমড়া / Pumpkin","তিত করলা / Bitter Gourd","ঢেঁড়স / Okra","পালং শাক / Spinach","মুলা / Radish","গাজর / Carrot","বাঁধাকপি / Cabbage","ফুলকপি / Cauliflower","পেঁয়াজ / Onion","রসুন / Garlic","আদা / Ginger","হলুদ / Turmeric"],
  "ফল / Fruits": ["আম / Mango","কাঁঠাল / Jackfruit","কলা / Banana","পেঁপে / Papaya","আনারস / Pineapple","পেয়ারা / Guava","লিচু / Lychee","নারিকেল / Coconut","লেবু / Lemon","কমলা / Orange","ড্রাগন ফ্রুট / Dragon Fruit"],
  "আঁশ / Fiber": ["পাট / Jute","তুলা / Cotton"],
  "চিনি ও মসলা": ["আখ / Sugarcane","ধনিয়া / Coriander","কালোজিরা / Nigella","পান / Betel Leaf"],
};

const DISTRICTS = ["ঢাকা / Dhaka","চট্টগ্রাম / Chattogram","রাজশাহী / Rajshahi","খুলনা / Khulna","বরিশাল / Barisal","সিলেট / Sylhet","রংপুর / Rangpur","ময়মনসিংহ / Mymensingh","কুমিল্লা / Cumilla","গাজীপুর / Gazipur","নারায়ণগঞ্জ / Narayanganj","টাঙ্গাইল / Tangail","কিশোরগঞ্জ / Kishoreganj","নেত্রকোণা / Netrokona","জামালপুর / Jamalpur","মৌলভীবাজার / Moulvibazar","হবিগঞ্জ / Habiganj","সুনামগঞ্জ / Sunamganj","চাঁপাইনবাবগঞ্জ / Chapainawabganj","নাটোর / Natore","নওগাঁ / Naogaon","বগুড়া / Bogura","পাবনা / Pabna","সিরাজগঞ্জ / Sirajganj","দিনাজপুর / Dinajpur","কুড়িগ্রাম / Kurigram","গাইবান্ধা / Gaibandha","নীলফামারী / Nilphamari","পঞ্চগড় / Panchagarh","বাগেরহাট / Bagerhat","সাতক্ষীরা / Satkhira","যশোর / Jashore","ঝিনাইদহ / Jhenaidah","কুষ্টিয়া / Kushtia","পটুয়াখালী / Patuakhali","বরগুনা / Barguna","ভোলা / Bhola","কক্সবাজার / Cox's Bazar","ফেনী / Feni","নোয়াখালী / Noakhali","ব্রাহ্মণবাড়িয়া / Brahmanbaria","বান্দরবান / Bandarban","রাঙামাটি / Rangamati","খাগড়াছড়ি / Khagrachhari"];

const SEASONS = ["বোরো মৌসুম / Boro Season (Nov–May)","আমন মৌসুম / Aman Season (Jun–Nov)","আউশ মৌসুম / Aus Season (Mar–Aug)","রবি মৌসুম / Rabi Season (Oct–Mar)","খরিপ মৌসুম / Kharif Season (Apr–Sep)","সারা বছর / Year-round"];
const GROWTH_STAGES = ["বীজ অঙ্কুরোদগম / Germination","চারা / Seedling","কুশি / Tillering","শাখা-প্রশাখা / Vegetative","ফুল ফোটা / Flowering","ফল ধারণ / Fruit Set","পরিপক্বতা / Maturity","ফসল কাটা / Harvesting"];

const SYMPTOM_CHIPS = {
  "🍃 পাতা": [
    { label: "পাতা হলুদ", value: "পাতা হলুদ হয়ে যাচ্ছে" },
    { label: "বাদামি দাগ", value: "পাতায় বাদামি গোলাকার দাগ" },
    { label: "ধূসর দাগ (ব্লাস্ট)", value: "পাতায় ধূসর মাকু আকৃতির দাগ (ব্লাস্ট)" },
    { label: "পাতা পোড়া", value: "পাতার কিনারা পুড়ে যাওয়ার মতো বাদামি" },
    { label: "পাতা কুঁকড়ানো", value: "পাতা কুঁকড়িয়ে ও বাঁকিয়ে যাচ্ছে" },
    { label: "পাতা মোড়ানো", value: "পাতা লম্বালম্বিভাবে মোড়ানো (পাতামোড়া পোকা)" },
    { label: "পাতায় জাল", value: "পাতার নিচে সূক্ষ্ম জাল (মাইট)" },
  ],
  "🌿 কান্ড ও শিকড়": [
    { label: "কান্ড পচা", value: "কান্ডের গোড়া পচে কালো বা বাদামি" },
    { label: "কান্ড ফাঁপা", value: "কান্ড টানলে সহজে উঠে আসে, ভেতর ফাঁকা (মরা ডিল)" },
    { label: "শিকড় পচা", value: "শিকড় কালো ও পচা" },
  ],
  "🌸 ফুল ও ফল": [
    { label: "ফুল ঝরা", value: "ফুল অকালে ঝরে পড়ছে" },
    { label: "ফল পচা", value: "ফল পচে যাচ্ছে, কালো বা বাদামি দাগ" },
    { label: "শীষ চিটা", value: "ধানের শীষ চিটা, দানা পূর্ণ হচ্ছে না" },
    { label: "শীষ সাদা", value: "ধানের শীষ সম্পূর্ণ সাদা হয়ে গেছে" },
  ],
  "🐛 পোকামাকড়": [
    { label: "পোকা দেখা", value: "গাছে পোকা দেখা যাচ্ছে" },
    { label: "পাতায় ছিদ্র", value: "পাতায় ছিদ্র বা চিবানোর দাগ" },
    { label: "পিঁপড়া দেখা", value: "গাছে পিঁপড়া দেখা যাচ্ছে (জাব পোকার লক্ষণ)" },
    { label: "মধুরস", value: "পাতায় আঠালো চকচকে পদার্থ (মধুরস)" },
  ],
  "💧 অন্যান্য": [
    { label: "গাছ নেতিয়ে", value: "গাছ দিনে নেতিয়ে পড়ে, রাতে সতেজ হয়" },
    { label: "গাছ মরছে", value: "গাছ হঠাৎ শুকিয়ে মারা যাচ্ছে" },
    { label: "সাদা গুঁড়া", value: "পাতায় সাদা গুঁড়া বা ছাতার মতো আবরণ" },
  ],
};

const AREA_CHIPS = [
  { label: "৫% এর কম", value: "৫% এর কম" },
  { label: "১০%", value: "প্রায় ১০%" },
  { label: "২৫%", value: "প্রায় ২৫%" },
  { label: "৫০%", value: "প্রায় ৫০%" },
  { label: "৭৫%+", value: "৭৫% এরও বেশি" },
  { label: "বিক্ষিপ্ত", value: "বিক্ষিপ্তভাবে ছড়িয়ে" },
  { label: "সমস্ত মাঠ", value: "সমস্ত মাঠ" },
];

const DURATION_CHIPS = [
  { label: "আজই", value: "আজই শুরু" },
  { label: "১-২ দিন", value: "১-২ দিন আগে" },
  { label: "৩-৫ দিন", value: "৩-৫ দিন ধরে" },
  { label: "১ সপ্তাহ", value: "প্রায় ১ সপ্তাহ" },
  { label: "২ সপ্তাহ", value: "প্রায় ২ সপ্তাহ" },
  { label: "১ মাস+", value: "১ মাসেরও বেশি" },
];

const LIBRARY = {
  pests: [
    { name: "ধানের মাজরা পোকা", en: "Rice Stem Borer", icon: "🐛", crops: ["ধান"], symptoms: "মরা ডিল (dead heart), সাদা শীষ, কান্ড কাটা", ipm: "ট্রাইকোকার্ড ব্যবহার, আলোক ফাঁদ, পরজীবী পোকা সংরক্ষণ, প্রয়োজনে ক্লোরপাইরিফস" },
    { name: "ধানের পাতামোড়া পোকা", en: "Rice Leaf Folder", icon: "🌿", crops: ["ধান"], symptoms: "পাতা লম্বালম্বিভাবে মোড়ানো, ভেতরে সাদা দাগ", ipm: "প্রাকৃতিক শত্রু সংরক্ষণ, কার্বোফুরান শেষ উপায়" },
    { name: "জাব পোকা / এফিড", en: "Aphid", icon: "🟢", crops: ["সরিষা","সবজি","ধান"], symptoms: "পাতা কুঁকড়ানো, মধুরস, পিঁপড়ার উপস্থিতি", ipm: "হলুদ স্টিকি ট্র্যাপ, নিম তেল ০.৫%, প্রাকৃতিক শত্রু" },
    { name: "সবজির থ্রিপস", en: "Thrips", icon: "🔸", crops: ["বেগুন","মরিচ","পেঁয়াজ"], symptoms: "পাতায় রুপালি দাগ, পাতা কুঁকড়ানো, ফুলের ক্ষতি", ipm: "নীল স্টিকি ট্র্যাপ, নিম তেল স্প্রে, স্পিনোসাড" },
    { name: "লাল মাকড়সা মাইট", en: "Red Spider Mite", icon: "🔴", crops: ["বেগুন","মরিচ","শিম"], symptoms: "পাতায় সূক্ষ্ম জাল, পাতা হলুদ ও ঝরা", ipm: "পানি স্প্রে, সালফার, অ্যাবামেকটিন" },
  ],
  diseases: [
    { name: "ধানের ব্লাস্ট", en: "Rice Blast", icon: "💥", crops: ["ধান"], symptoms: "পাতায় মাকু আকৃতির ধূসর দাগ, বাদামি কিনারা, ঘাড় ব্লাস্টে শীষ পড়ে যায়", ipm: "প্রতিরোধী জাত (BRRI dhan28), ট্রাইসাইক্লাজল ৭৫ WP, সুষম সার" },
    { name: "শিথ ব্লাইট", en: "Sheath Blight", icon: "🍂", crops: ["ধান"], symptoms: "কান্ডের আবরণে ডিম্বাকৃতি ধূসর দাগ, কেন্দ্রে সাদা", ipm: "কম ঘনত্বে রোপণ, হেক্সাকোনাজল, জৈব সার" },
    { name: "টমেটো আর্লি ব্লাইট", en: "Early Blight", icon: "🍅", crops: ["টমেটো","আলু"], symptoms: "পাতায় কালো বৃত্তাকার দাগ, হলুদ বলয়, নিচের পাতা থেকে শুরু", ipm: "ম্যানকোজেব ৮০ WP, ক্লোরোথ্যালোনিল, ক্ষেত পরিষ্কার" },
    { name: "আলু লেট ব্লাইট", en: "Late Blight", icon: "🥔", crops: ["আলু","টমেটো"], symptoms: "পানিভেজা দাগ যা দ্রুত কালো হয়, নিচে সাদা ছত্রাক আবরণ", ipm: "মেটালাক্সিল, রোগমুক্ত বীজআলু, ভালো নিষ্কাশন" },
    { name: "সরিষার অল্টারনেরিয়া", en: "Alternaria Blight", icon: "🌼", crops: ["সরিষা"], symptoms: "পাতায় কালো বৃত্তাকার দাগ, শুঁটি কালো হয়", ipm: "ইপ্রোডিওন, বীজ শোধন, মৌসুম পরিবর্তন" },
  ],
  deficiencies: [
    { name: "নাইট্রোজেন অভাব", en: "Nitrogen Deficiency", icon: "🟡", crops: ["সব ফসল"], symptoms: "নিচের পাতা থেকে হলুদ শুরু, বৃদ্ধি কম, গাছ ফ্যাকাশে সবুজ", fix: "ইউরিয়া সার ১০-১৫ কেজি/বিঘা উপরি প্রয়োগ" },
    { name: "আয়রন অভাব", en: "Iron Deficiency", icon: "🟠", crops: ["ধান","সবজি"], symptoms: "নতুন পাতা হলুদ, শিরা সবুজ থাকে (আন্তঃশিরা ক্লোরোসিস)", fix: "ফেরাস সালফেট ০.৫% দ্রবণ পাতায় স্প্রে" },
    { name: "জিংক অভাব", en: "Zinc Deficiency", icon: "🔵", crops: ["ধান"], symptoms: "পাতায় বাদামি মরচে দাগ, বৃদ্ধি থমকে যায়, পাতা ছোট", fix: "জিংক সালফেট ৪ কেজি/বিঘা মাটিতে প্রয়োগ" },
    { name: "পটাশিয়াম অভাব", en: "Potassium Deficiency", icon: "🟤", crops: ["আলু","কলা","ধান"], symptoms: "পাতার কিনারা পুড়ে যাওয়ার মতো বাদামি, পাতা ঝরা", fix: "মিউরেট অফ পটাশ সার প্রয়োগ" },
  ],
};

function assessWeatherRisks(w) {
  const risks = [];
  if (!w) return risks;
  if (w.humidity >= 80 && w.temp >= 26 && w.temp <= 36)
    risks.push({ level: "high", icon: "🔴", text: "Blast ও Sheath Blight ঝুঁকি বেশি" });
  if (w.rain24h >= 50)
    risks.push({ level: "high", icon: "🔴", text: "মাজরা পোকা ও শিকড় পচা ঝুঁকি বেশি" });
  if (w.rain24h === 0 && w.humidity < 55)
    risks.push({ level: "medium", icon: "🟡", text: "মাইট ও থ্রিপস ঝুঁকি (শুষ্ক আবহাওয়া)" });
  if (w.temp < 20)
    risks.push({ level: "medium", icon: "🟡", text: "টুংরো ভাইরাস ঝুঁকি (ঠান্ডা)" });
  if (w.humidity >= 85)
    risks.push({ level: "high", icon: "🔴", text: "BLB ব্যাকটেরিয়াল ব্লাইট ঝুঁকি বেশি" });
  if (risks.length === 0)
    risks.push({ level: "low", icon: "🟢", text: "আবহাওয়া স্বাভাবিক — রোগ বালাই চাপ কম" });
  return risks;
}

function getSprayingCondition(w) {
  if (!w) return null;
  if (w.windSpeed > 20) return { ok: false, reason: `বাতাসের গতি বেশি (${w.windSpeed} km/h)`, until: "বাতাস কমলে" };
  if (w.rain24h > 5) return { ok: false, reason: "বৃষ্টির সম্ভাবনা আছে", until: "বৃষ্টি থামলে" };
  if (w.temp > 38) return { ok: false, reason: "তাপমাত্রা অতিরিক্ত বেশি", until: "বিকালে" };
  if (w.uvIndex > 8) return { ok: false, reason: "UV বেশি, কীটনাশক নষ্ট হবে", until: "সন্ধ্যায়" };
  return { ok: true, reason: "স্প্রে করার উপযুক্ত সময়", until: null };
}

function weatherPromptText(w, locationName) {
  if (!w) return "";
  const risks = assessWeatherRisks(w);
  return `REAL-TIME WEATHER (Auto-detected):\nLocation: ${locationName || "Bangladesh"}\nTemperature: ${w.temp}°C | Humidity: ${w.humidity}% | Rain 24h: ${w.rain24h}mm | Wind: ${w.windSpeed} km/h | UV: ${w.uvIndex}\nDisease risks: ${risks.map(r => r.text).join("; ")}\nFactor this weather data into your diagnosis.`;
}

function renderTokens(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} style={{ color: C.primaryDark }}>{p.slice(2,-2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*")) return <em key={i} style={{ color: C.warning }}>{p.slice(1,-1)}</em>;
    if (p.startsWith("`") && p.endsWith("`")) return <code key={i} style={{ background: "#f0fdf4", borderRadius: 4, padding: "1px 6px", fontSize: 12, color: C.primary }}>{p.slice(1,-1)}</code>;
    return p;
  });
}

function renderInline(text) {
  return text.split("\n").map((line, li) => {
    if (/^#{1,4}\s/.test(line)) {
      const t = line.replace(/^#{1,4}\s/, "");
      return <div key={li} style={{ fontWeight: 700, color: C.primaryDark, fontSize: 14, marginTop: 10, marginBottom: 4 }}>{renderTokens(t)}</div>;
    }
    if (/^[-•*]\s/.test(line)) {
      return <div key={li} style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <span style={{ color: C.primary, flexShrink: 0 }}>▸</span>
        <span>{renderTokens(line.replace(/^[-•*]\s/, ""))}</span>
      </div>;
    }
    if (line.trim() === "") return <div key={li} style={{ height: 8 }} />;
    return <div key={li} style={{ marginTop: 3 }}>{renderTokens(line)}</div>;
  });
}

function parseIntoSections(text) {
  if (!text) return [];
  const lines = text.split("\n");
  const sections = [];
  let current = null;
  for (const line of lines) {
    const h = line.match(/^#{1,2}\s+(.+)/);
    if (h) {
      if (current) sections.push(current);
      current = { title: h[1].replace(/^\d+\.\s*/, ""), body: [] };
    } else if (current) {
      current.body.push(line);
    }
  }
  if (current) sections.push(current);
  if (sections.length === 0) return [{ title: null, body: text.split("\n") }];
  return sections;
}

const SECTION_META = {
  "সম্ভাব্য": { icon: "🦠", color: C.danger, bg: "#fef2f2", border: "#fecaca" },
  "Diagnosis": { icon: "🦠", color: C.danger, bg: "#fef2f2", border: "#fecaca" },
  "CABI": { icon: "🔬", color: C.blue, bg: "#eff6ff", border: "#bfdbfe" },
  "Exclusion": { icon: "🔬", color: C.blue, bg: "#eff6ff", border: "#bfdbfe" },
  "IPM": { icon: "🌿", color: C.success, bg: "#f0fdf4", border: "#bbf7d0" },
  "সমন্বিত": { icon: "🌿", color: C.success, bg: "#f0fdf4", border: "#bbf7d0" },
  "তীব্রতা": { icon: "📊", color: C.warning, bg: "#fffbeb", border: "#fed7aa" },
  "Severity": { icon: "📊", color: C.warning, bg: "#fffbeb", border: "#fed7aa" },
  "প্রতিরোধ": { icon: "🛡️", color: "#7c3aed", bg: "#faf5ff", border: "#e9d5ff" },
  "Prevention": { icon: "🛡️", color: "#7c3aed", bg: "#faf5ff", border: "#e9d5ff" },
  "DAE": { icon: "📞", color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc" },
  "Consult": { icon: "📞", color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc" },
  "মাঠে": { icon: "🧪", color: "#065f46", bg: "#ecfdf5", border: "#a7f3d0" },
  "Field": { icon: "🧪", color: "#065f46", bg: "#ecfdf5", border: "#a7f3d0" },
};

function getMeta(title) {
  for (const [key, val] of Object.entries(SECTION_META)) {
    if ((title || "").includes(key)) return val;
  }
  return { icon: "📄", color: C.text, bg: C.bgMuted, border: C.border };
}

function SectionCard({ title, bodyLines, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen !== false);
  const meta = getMeta(title);
  const bodyText = bodyLines.join("\n").trim();
  if (!bodyText && !title) return null;
  return (
    <div style={{ borderRadius: 12, border: `1px solid ${meta.border}`, marginBottom: 10, overflow: "hidden" }}>
      {title && (
        <button onClick={() => setOpen(o => !o)}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: meta.bg, border: "none", cursor: "pointer", textAlign: "left" }}>
          <span style={{ fontSize: 20 }}>{meta.icon}</span>
          <span style={{ color: meta.color, fontWeight: 700, fontSize: 14, flex: 1 }}>{title}</span>
          <span style={{ color: meta.color, fontSize: 14, opacity: 0.7 }}>{open ? "▲" : "▼"}</span>
        </button>
      )}
      {open && (
        <div style={{ padding: "14px 18px", background: "#fff", color: C.text, fontSize: 13.5, lineHeight: 1.85 }}>
          {renderInline(bodyText)}
        </div>
      )}
    </div>
  );
}

function SprayingWidget({ weather, weatherLoading }) {
  if (weatherLoading || !weather) return null;
  const spray = getSprayingCondition(weather);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: spray.ok ? "#f0fdf4" : "#fff7ed", border: `1px solid ${spray.ok ? "#bbf7d0" : "#fed7aa"}`, borderRadius: 12, marginBottom: 14 }}>
      <div style={{ fontSize: 22 }}>{spray.ok ? "✅" : "⚠️"}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: spray.ok ? C.success : C.warning }}>
          স্প্রে অবস্থা: {spray.ok ? "অনুকূল" : "প্রতিকূল"}
        </div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{spray.reason}</div>
      </div>
      {!spray.ok && spray.until && (
        <div style={{ fontSize: 11, color: C.warning, fontWeight: 600, textAlign: "right", whiteSpace: "nowrap" }}>{spray.until} পর্যন্ত</div>
      )}
    </div>
  );
}

function WeatherBar({ weather, weatherLoading, weatherError, locationName, locationSource, onRefresh }) {
  const risks = assessWeatherRisks(weather);
  const topRisk = risks[0];
  return (
    <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "#0ea5e9", color: "#fff" }}>
        <span>🌦️</span>
        <span style={{ fontWeight: 700, fontSize: 13 }}>আবহাওয়া {locationSource === "gps" ? "📍" : "🌐"}</span>
        {locationName && <span style={{ fontSize: 11, opacity: 0.85, flex: 1 }}>— {locationName}</span>}
        <button onClick={onRefresh} style={{ marginLeft: "auto", background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 8, color: "#fff", padding: "3px 10px", cursor: "pointer", fontSize: 11 }}>🔄</button>
      </div>
      {weatherLoading && !weather && <div style={{ padding: "10px 16px", color: "#0369a1", fontSize: 12 }}>⏳ আবহাওয়া সংগ্রহ করছি...</div>}
      {weather && (
        <div style={{ padding: "10px 16px" }}>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 6 }}>
            {[{ icon: "🌡️", v: `${weather.temp}°C` }, { icon: "💧", v: `${weather.humidity}%` }, { icon: "🌧️", v: `${weather.rain24h}mm` }, { icon: "💨", v: `${weather.windSpeed}km/h` }, { icon: "☀️", v: `UV ${weather.uvIndex}` }].map(({ icon, v }) => (
              <div key={v} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C.text }}>
                <span>{icon}</span><span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
          {topRisk && <div style={{ fontSize: 11, color: topRisk.level === "high" ? C.danger : topRisk.level === "medium" ? C.warning : C.success, fontWeight: 600 }}>{topRisk.icon} {topRisk.text}</div>}
        </div>
      )}
    </div>
  );
}

function QuickCropRow({ onSelect, selected }) {
  return (
    <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}>
      {QUICK_CROPS.map(crop => {
        const active = (selected || "").includes(crop.en);
        return (
          <button key={crop.id} onClick={() => onSelect(crop.en + " / " + crop.label)}
            style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", border: `3px solid ${active ? crop.color : C.border}`, background: active ? crop.color + "22" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, transition: "all 0.2s", boxShadow: active ? `0 0 0 2px ${crop.color}66` : "none" }}>{crop.emoji}</div>
            <span style={{ fontSize: 11, color: active ? C.primaryDark : C.text, fontWeight: active ? 700 : 400, whiteSpace: "nowrap" }}>{crop.label}</span>
          </button>
        );
      })}
      <button onClick={() => onSelect("__more__")}
        style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", padding: 4 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", border: `2px dashed ${C.border}`, background: "#f8faf8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>➕</div>
        <span style={{ fontSize: 11, color: C.textMuted, whiteSpace: "nowrap" }}>আরও</span>
      </button>
    </div>
  );
}

function DiagnosisHistory({ history, onLoad }) {
  if (history.length === 0) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, marginBottom: 8 }}>📋 সাম্প্রতিক রোগ নির্ণয়</div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
        {[...history].reverse().slice(0, 4).map((h, i) => (
          <button key={i} onClick={() => onLoad(h)}
            style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 20, border: `1px solid ${C.border}`, background: "#fff", cursor: "pointer", fontSize: 12, color: C.text, display: "flex", alignItems: "center", gap: 8 }}>
            <span>🌾</span>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 600, fontSize: 11 }}>{h.crop?.split("/")[0]?.trim() || "Unknown"}</div>
              <div style={{ color: C.textMuted, fontSize: 10 }}>{h.date}</div>
            </div>
            <span style={{ background: "#dcfce7", color: "#166534", borderRadius: 10, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>সম্পন্ন</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SeveritySurvey({ onSubmit }) {
  const [selected, setSelected] = useState("");
  const options = ["মাঠ সম্পূর্ণ সুস্থ, কোনো লক্ষণ নেই","কয়েকটি গাছে লক্ষণ দেখা যাচ্ছে","মাঠের কিছু অংশে লক্ষণ (৫০% এর কম)","অর্ধেক মাঠ আক্রান্ত","বেশিরভাগ মাঠ আক্রান্ত (৫০%+)","সমস্ত মাঠ আক্রান্ত — প্রতিটি গাছ"];
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 12 }}>📊 আপনার ফসলের কতটুকু আক্রান্ত?</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {options.map(opt => (
          <button key={opt} onClick={() => setSelected(opt)}
            style={{ padding: "12px 16px", borderRadius: 10, border: `1.5px solid ${selected === opt ? C.primary : C.border}`, background: selected === opt ? "#f0fdf4" : "#fff", cursor: "pointer", textAlign: "left", fontSize: 13, color: C.text, display: "flex", alignItems: "center", gap: 10, transition: "all 0.15s" }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${selected === opt ? C.primary : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {selected === opt && <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.primary }} />}
            </div>
            {opt}
          </button>
        ))}
      </div>
      <button onClick={() => selected && onSubmit(selected)} disabled={!selected}
        style={{ marginTop: 14, width: "100%", padding: "13px", borderRadius: 12, border: "none", background: selected ? C.primary : C.border, color: "#fff", fontWeight: 700, fontSize: 14, cursor: selected ? "pointer" : "not-allowed" }}>
        সংরক্ষণ করুন
      </button>
    </div>
  );
}

function LibrarySection() {
  const [activeTab, setActiveTab] = useState("pests");
  const [selected, setSelected] = useState(null);
  const tabs = [{ id: "pests", label: "পোকামাকড়", icon: "🐛" }, { id: "diseases", label: "রোগ", icon: "🦠" }, { id: "deficiencies", label: "পুষ্টি অভাব", icon: "🌿" }];
  const items = LIBRARY[activeTab] || [];
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); setSelected(null); }}
            style={{ flex: 1, padding: "10px 8px", borderRadius: 10, border: `1px solid ${activeTab === t.id ? C.primary : C.border}`, background: activeTab === t.id ? "#f0fdf4" : "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, color: activeTab === t.id ? C.primaryDark : C.text }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {selected ? (
        <div>
          <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: C.primary, cursor: "pointer", fontSize: 13, marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}>← ফিরে যান</button>
          <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${C.border}`, padding: 20 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{selected.icon}</div>
            <h3 style={{ color: C.primaryDark, fontSize: 18, marginBottom: 4 }}>{selected.name}</h3>
            <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 16 }}>{selected.en}</div>
            <div style={{ background: "#f8faf8", borderRadius: 10, padding: 14, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 6 }}>🔍 লক্ষণসমূহ</div>
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7 }}>{selected.symptoms}</div>
            </div>
            {(selected.ipm || selected.fix) && (
              <div style={{ background: "#f0fdf4", borderRadius: 10, padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.success, marginBottom: 6 }}>{selected.ipm ? "🌿 IPM ব্যবস্থাপনা" : "💊 প্রতিকার"}</div>
                <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7 }}>{selected.ipm || selected.fix}</div>
              </div>
            )}
            <div style={{ marginTop: 12, padding: "8px 12px", background: "#eff6ff", borderRadius: 8, fontSize: 12, color: "#1d4ed8" }}>
              🌾 ফসল: {Array.isArray(selected.crops) ? selected.crops.join(", ") : selected.crops}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((item, i) => (
            <button key={i} onClick={() => setSelected(item)}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, cursor: "pointer", textAlign: "left" }}>
              <div style={{ fontSize: 28, flexShrink: 0 }}>{item.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{item.name}</div>
                <div style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>{item.en}</div>
              </div>
              <span style={{ color: C.textLight, fontSize: 18 }}>›</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductRecommendations({ products, crop }) {
  const [selected, setSelected] = useState(null);
  const typeColor = (t) => ({
    insecticide: { bg: "#fef3c7", border: "#fcd34d", color: "#92400e", label: "কীটনাশক" },
    fungicide: { bg: "#eff6ff", border: "#bfdbfe", color: "#1e40af", label: "ছত্রাকনাশক" },
    herbicide: { bg: "#fdf4ff", border: "#e9d5ff", color: "#6b21a8", label: "আগাছানাশক" },
    acaricide: { bg: "#fff7ed", border: "#fed7aa", color: "#9a3412", label: "মাকড়নাশক" },
    bactericide: { bg: "#ecfdf5", border: "#a7f3d0", color: "#065f46", label: "ব্যাকটেরিয়ানাশক" },
    trap: { bg: "#f0f9ff", border: "#bae6fd", color: "#0c4a6e", label: "ফাঁদ" },
    biocontrol: { bg: "#f0fdf4", border: "#bbf7d0", color: "#14532d", label: "জৈব নিয়ন্ত্রণ" },
    biofungicide: { bg: "#f0fdf4", border: "#bbf7d0", color: "#14532d", label: "জৈব ছত্রাকনাশক" },
    bioinsecticide: { bg: "#f0fdf4", border: "#bbf7d0", color: "#14532d", label: "জৈব কীটনাশক" },
    botanical: { bg: "#fefce8", border: "#fef08a", color: "#713f12", label: "উদ্ভিজ্জ" },
    fertilizer: { bg: "#ecfdf5", border: "#a7f3d0", color: "#065f46", label: "সার" },
    soil_amendment: { bg: "#fafaf9", border: "#d6d3d1", color: "#292524", label: "মাটি সংশোধন" },
    pgr: { bg: "#fdf2f8", border: "#f5d0fe", color: "#701a75", label: "বৃদ্ধি নিয়ন্ত্রক" },
  }[t] || { bg: C.bgMuted, border: C.border, color: C.text, label: t });

  if (selected) {
    const tc = typeColor(selected.type);
    return (
      <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginTop: 12, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
        <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: C.primary, cursor: "pointer", fontSize: 13, marginBottom: 14, display: "flex", alignItems: "center", gap: 4 }}>← পণ্য তালিকায় ফিরুন</button>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: C.primaryDark }}>{selected.trade_name}</div>
            <div style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>{selected.company}</div>
            <span style={{ display: "inline-block", background: tc.bg, border: `1px solid ${tc.border}`, color: tc.color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, marginTop: 6 }}>{tc.label}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <InfoRow icon="🧪" label="সক্রিয় উপাদান" val={selected.active_ingredient} />
          <InfoRow icon="🎯" label="কার্যকর পোকা/রোগ" val={selected.target_bn?.join(", ") || selected.targets?.join(", ")} />
          <InfoRow icon="🌾" label="ফসল" val={selected.crops_bn?.join(", ") || selected.crops?.join(", ")} />
          <InfoRow icon="⚗️" label="প্রতি লিটারে মাত্রা" val={selected.dosage_per_litre} />
          <InfoRow icon="🌿" label="প্রতি বিঘায় মাত্রা" val={selected.dosage_per_bigha} />
          <InfoRow icon="📅" label="ফসল কাটার আগে বন্ধ (PHI)" val={`${selected.phi_days} দিন`} />
          <InfoRow icon="🔬" label="ব্যবহারের পদ্ধতি" val={selected.method} />
        </div>
        {selected.ipm_note && (
          <div style={{ marginTop: 12, background: "#f0fdf4", borderRadius: 10, padding: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: C.success, marginBottom: 4 }}>🌿 IPM পরামর্শ</div>
            <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>{selected.ipm_note}</div>
          </div>
        )}
        <div style={{ marginTop: 10, background: "#fffbeb", borderRadius: 10, padding: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: C.warning, marginBottom: 4 }}>⚠️ সতর্কতা</div>
          <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>{selected.caution_bn || selected.caution}</div>
        </div>
        <div style={{ marginTop: 12, padding: "10px 12px", background: "#fef2f2", borderRadius: 8, fontSize: 11, color: C.danger }}>
          ⚠️ শুধুমাত্র একটি পণ্য ব্যবহার করুন। চূড়ান্ত সিদ্ধান্তের জন্য DAE কর্মকর্তার পরামর্শ নিন।
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginTop: 12, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 20 }}>💊</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: C.primaryDark }}>সুপারিশকৃত পণ্যসমূহ</div>
          <div style={{ fontSize: 11, color: C.textMuted }}>{crop?.split("/")[0]?.trim()} · DAE নিবন্ধিত</div>
        </div>
      </div>
      <div style={{ background: "#fffbeb", border: "1px solid #fed7aa", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 11, color: C.warning, fontWeight: 600 }}>
        ⚠️ নিচের পণ্যগুলো থেকে শুধুমাত্র একটি বেছে নিন। সব একসাথে ব্যবহার করবেন না।
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {products.map((p, i) => {
          const tc = typeColor(p.type);
          return (
            <button key={p.id} onClick={() => setSelected(p)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: C.bgMuted, border: `1px solid ${C.border}`, borderRadius: 12, cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.primary}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: tc.bg, border: `1.5px solid ${tc.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: tc.color, flexShrink: 0 }}>
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{p.trade_name}</div>
                <div style={{ color: C.textMuted, fontSize: 11, marginTop: 1 }}>{p.active_ingredient?.split(" ").slice(0, 4).join(" ")}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                  <span style={{ background: tc.bg, border: `1px solid ${tc.border}`, color: tc.color, borderRadius: 10, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>{tc.label}</span>
                  <span style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#065f46", borderRadius: 10, padding: "1px 8px", fontSize: 10 }}>PHI: {p.phi_days}d</span>
                  {(p.type === "trap" || p.type === "biocontrol" || p.type === "bioinsecticide" || p.type === "biofungicide" || p.type === "botanical") && (
                    <span style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", borderRadius: 10, padding: "1px 8px", fontSize: 10 }}>🌿 IPM</span>
                  )}
                </div>
              </div>
              <span style={{ color: C.textLight, fontSize: 18 }}>›</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, val }) {
  if (!val) return null;
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{val}</div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CABIDiagnosis() {
  const [activeTab, setActiveTab] = useState("diagnose");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ crop: "", district: "", season: "", growthStage: "", symptoms: "", duration: "", affectedArea: "" });
  const [showMoreCrops, setShowMoreCrops] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [result, setResult] = useState(null);
  const [showEnglish, setShowEnglish] = useState(false);
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [severity, setSeverity] = useState(null);
  const [history, setHistory] = useState(() => { try { return JSON.parse(localStorage.getItem("cabi-history") || "[]"); } catch { return []; } });
  const [pesticideDb, setPesticideDb] = useState(null);
  const [recommendedProducts, setRecommendedProducts] = useState([]);

  // Load pesticide DB once
  useEffect(() => {
    fetch("/pesticides.json").then(r => r.json()).then(d => setPesticideDb(d)).catch(() => {});
  }, []);

  // Match products when result + db available
  useEffect(() => {
    if (!pesticideDb || !result || !form.crop) return;
    const text = (result.bn + " " + result.en).toLowerCase();
    const cropKey = Object.keys(pesticideDb.crop_to_product_map).find(k =>
      form.crop.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(form.crop.split("/")[0].trim().toLowerCase())
    );
    const cropIds = cropKey ? pesticideDb.crop_to_product_map[cropKey] || [] : [];
    const pestIds = [];
    for (const [pest, ids] of Object.entries(pesticideDb.pest_to_product_map)) {
      if (text.includes(pest.toLowerCase())) ids.forEach(id => pestIds.push(id));
    }
    const allIds = [...new Set([...pestIds, ...cropIds])];
    const matched = allIds.map(id => pesticideDb.products.find(p => p.id === id)).filter(Boolean);
    // Sort: pest matches first, then by rating desc, limit 4
    const pestSet = new Set(pestIds);
    matched.sort((a, b) => {
      const aP = pestSet.has(a.id) ? 1 : 0;
      const bP = pestSet.has(b.id) ? 1 : 0;
      if (bP !== aP) return bP - aP;
      return (b.rating || 0) - (a.rating || 0);
    });
    setRecommendedProducts(matched.slice(0, 5));
  }, [pesticideDb, result, form.crop]);

  const fileRef = useRef();
  const recognitionRef = useRef(null);
  const resultRef = useRef(null);

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);

  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(null);
  const [locationName, setLocationName] = useState(null);
  const [coords, setCoords] = useState(null);
  const [locationSource, setLocationSource] = useState(null);

  const fetchWeather = useCallback(async (lat, lon) => {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,uv_index,weather_code&daily=precipitation_sum&timezone=Asia%2FDhaka&forecast_days=1`;
      const res = await fetch(url);
      const d = await res.json();
      const c = d.current;
      const rain24h = d.daily?.precipitation_sum?.[0] ?? c.precipitation ?? 0;
      setWeather({ temp: Math.round(c.temperature_2m), feelsLike: Math.round(c.apparent_temperature), humidity: Math.round(c.relative_humidity_2m), rain24h: Math.round(rain24h * 10) / 10, windSpeed: Math.round(c.wind_speed_10m), uvIndex: Math.round(c.uv_index) });
    } catch { setWeatherError("আবহাওয়া ডেটা পাওয়া যায়নি"); }
  }, []);

  const reverseGeocode = useCallback(async (lat, lon) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`, { headers: { "User-Agent": "CABI-Bangladesh/1.0" } });
      const d = await res.json();
      const district = d.address?.county || d.address?.state_district || d.address?.city || "";
      setLocationName([district, "Bangladesh"].filter(Boolean).join(", "));
      const matched = DISTRICTS.find(dd => dd.toLowerCase().includes(district.toLowerCase()) || district.toLowerCase().includes(dd.split("/")[0].trim().toLowerCase()));
      if (matched) setForm(f => ({ ...f, district: f.district || matched }));
    } catch { setLocationName("Bangladesh"); }
  }, []);

  const fetchByIP = useCallback(async () => {
    try {
      const res = await fetch("https://ip-api.com/json/?fields=lat,lon,city,regionName");
      const d = await res.json();
      if (d.lat && d.lon) {
        setCoords({ lat: d.lat, lon: d.lon }); setLocationSource("ip");
        setLocationName([d.city, d.regionName, "Bangladesh"].filter(Boolean).join(", "));
        await fetchWeather(d.lat, d.lon);
        const matched = DISTRICTS.find(dd => dd.toLowerCase().includes((d.city || "").toLowerCase()));
        if (matched) setForm(f => ({ ...f, district: f.district || matched }));
      } else { setCoords({ lat: 23.685, lon: 90.356 }); setLocationName("Bangladesh"); await fetchWeather(23.685, 90.356); }
    } catch { setWeatherError("অবস্থান সনাক্ত করা যায়নি"); }
  }, [fetchWeather]);

  useEffect(() => {
    setWeatherLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => { const { latitude: lat, longitude: lon } = pos.coords; setCoords({ lat, lon }); setLocationSource("gps"); await Promise.all([fetchWeather(lat, lon), reverseGeocode(lat, lon)]); setWeatherLoading(false); },
        async () => { await fetchByIP(); setWeatherLoading(false); },
        { timeout: 8000 }
      );
    } else { fetchByIP().then(() => setWeatherLoading(false)); }
  }, [fetchWeather, reverseGeocode, fetchByIP]);

  useEffect(() => { setVoiceSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition)); setTtsSupported(!!window.speechSynthesis); }, []);

  const refreshWeather = async () => { if (!coords) return; setWeatherLoading(true); setWeatherError(null); await fetchWeather(coords.lat, coords.lon); setWeatherLoading(false); };

  const handleImage = (e) => {
    const file = e.target.files[0]; if (!file) return;
    setImage(URL.createObjectURL(file));
    const img = new Image();
    img.onload = () => {
      const MAX = 800; let { width, height } = img;
      if (width > MAX || height > MAX) { if (width > height) { height = Math.round(height * MAX / width); width = MAX; } else { width = Math.round(width * MAX / height); height = MAX; } }
      const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      setImageBase64(canvas.toDataURL("image/jpeg", 0.7).split(",")[1]);
    };
    img.src = URL.createObjectURL(file);
  };

  const handleSubmit = async () => {
    if (!form.crop || !form.symptoms) { setError("অনুগ্রহ করে ফসল এবং লক্ষণ উভয়ই পূরণ করুন।"); return; }
    setLoading(true); setError(null); setResult(null); setSeverity(null);
    const userContent = [];
    if (imageBase64) userContent.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } });
    userContent.push({ type: "text", text: `Crop: ${form.crop}\nDistrict: ${form.district || locationName || "Not specified"}\nSeason: ${form.season || "Not specified"}\nGrowth Stage: ${form.growthStage || "Not specified"}\nDuration: ${form.duration || "Not specified"}\nAffected Area: ${form.affectedArea || "Not specified"}\nSymptoms: ${form.symptoms}\n${imageBase64 ? "Photo attached." : "No photo."}\n${weatherPromptText(weather, locationName)}\n\nDiagnose using CABI Plantwise methodology. Respond in both Bangla and English.\n---BANGLA_SECTION---\n[Full Bangla diagnosis]\n---END_BANGLA---\n---ENGLISH_SECTION---\n[Full English diagnosis]\n---END_ENGLISH---` });
    try {
      const response = await fetch("/api/diagnose", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2000, messages: [{ role: "user", content: userContent }] }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
      const raw = data.content?.map(b => b.text || "").join("\n") || "";
      const bnMatch = raw.match(/---BANGLA_SECTION---([\s\S]*?)---END_BANGLA---/);
      const enMatch = raw.match(/---ENGLISH_SECTION---([\s\S]*?)---END_ENGLISH---/);
      const bn = bnMatch ? bnMatch[1].trim() : raw;
      const en = enMatch ? enMatch[1].trim() : "";
      setResult({ bn, en }); setProvider(data.provider || null); setStep(2);
      const entry = { crop: form.crop, district: form.district, date: new Date().toLocaleDateString("bn-BD"), resultPreview: bn.slice(0, 80) };
      const newHistory = [...history, entry].slice(-10); setHistory(newHistory);
      try { localStorage.setItem("cabi-history", JSON.stringify(newHistory)); } catch {}
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) { setError(`রোগ নির্ণয়ে সমস্যা হয়েছে: ${err.message}`); }
    finally { setLoading(false); }
  };

  const stopSpeaking = () => { window.speechSynthesis?.cancel(); setIsSpeaking(false); };

  const reset = () => {
    setForm({ crop: "", district: "", season: "", growthStage: "", symptoms: "", duration: "", affectedArea: "" });
    setImage(null); setImageBase64(null); setResult(null); setError(null); setProvider(null); setShowEnglish(false); setStep(1); setSeverity(null); setShowMoreCrops(false); setRecommendedProducts([]); stopSpeaking();
  };

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return; stopSpeaking();
    const r = new SR(); recognitionRef.current = r; r.lang = "bn-BD"; r.interimResults = true; r.continuous = false;
    r.onstart = () => setIsListening(true);
    r.onresult = (e) => { const t = Array.from(e.results).map(r => r[0].transcript).join(""); setForm(f => ({ ...f, symptoms: f.symptoms ? f.symptoms.trimEnd() + " " + t : t })); };
    r.onerror = () => setIsListening(false); r.onend = () => setIsListening(false); r.start();
  };
  const stopListening = () => { recognitionRef.current?.stop(); setIsListening(false); };

  const speakResult = (text) => {
    if (!window.speechSynthesis) return; stopSpeaking();
    const clean = text.replace(/#{1,6}\s/g, "").replace(/\*\*/g, "").replace(/---[\w_]+---/g, "").replace(/\*/g, "").replace(/`/g, "").trim();
    const u = new SpeechSynthesisUtterance(clean); u.lang = showEnglish ? "en-US" : "bn-BD"; u.rate = 0.88;
    if (!showEnglish) { const voices = window.speechSynthesis.getVoices(); const v = voices.find(v => v.lang.startsWith("bn")); if (v) u.voice = v; }
    u.onstart = () => setIsSpeaking(true); u.onend = () => setIsSpeaking(false); u.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(u);
  };

  const handleCropQuickSelect = (val) => { if (val === "__more__") { setShowMoreCrops(true); return; } setForm(f => ({ ...f, crop: val })); setShowMoreCrops(false); };

  const navTabs = [{ id: "diagnose", label: "রোগ নির্ণয়", icon: "🔬" }, { id: "library", label: "তথ্যভাণ্ডার", icon: "📚" }, { id: "history", label: "ইতিহাস", icon: "📋" }];

  const labelSt = { display: "block", color: C.text, fontSize: 12, fontWeight: 700, marginBottom: 6 };
  const selSt = { width: "100%", background: C.bgMuted, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: "9px 10px", fontSize: 13, outline: "none" };
  const chipSt = { padding: "5px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer", transition: "all 0.15s" };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, maxWidth: 520, margin: "0 auto", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: C.primary, padding: "16px 20px 0", position: "sticky", top: 0, zIndex: 100, boxShadow: C.shadow }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🌾</div>
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 18, letterSpacing: -0.3 }}>CABI কৃষি নির্ণয়</div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11 }}>Crop Disease Diagnosis · Bangladesh</div>
          </div>
          {step === 2 && result && <button onClick={reset} style={{ marginLeft: "auto", background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, color: "#fff", padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>🔁 নতুন</button>}
        </div>
        <div style={{ display: "flex" }}>
          {navTabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ flex: 1, padding: "10px 4px", border: "none", cursor: "pointer", background: "none", color: activeTab === t.id ? "#fff" : "rgba(255,255,255,0.6)", borderBottom: `3px solid ${activeTab === t.id ? "#fff" : "transparent"}`, fontSize: 12, fontWeight: activeTab === t.id ? 700 : 400, transition: "all 0.15s" }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, padding: "14px", overflowY: "auto" }}>
        {/* DIAGNOSE TAB */}
        {activeTab === "diagnose" && (
          <div>
            <WeatherBar weather={weather} weatherLoading={weatherLoading} weatherError={weatherError} locationName={locationName} locationSource={locationSource} onRefresh={refreshWeather} />
            <SprayingWidget weather={weather} weatherLoading={weatherLoading} />
            <DiagnosisHistory history={history} onLoad={(h) => setForm(f => ({ ...f, crop: h.crop || "", district: h.district || "" }))} />

            {step === 1 && (
              <div>
                {/* Crop select */}
                <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 12 }}>🌱 ফসল নির্বাচন করুন *</div>
                  {!form.crop && !showMoreCrops && <QuickCropRow onSelect={handleCropQuickSelect} selected={form.crop} />}
                  {form.crop && !showMoreCrops && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ background: "#f0fdf4", border: `1.5px solid ${C.primary}`, borderRadius: 12, padding: "8px 16px", color: C.primaryDark, fontWeight: 700, fontSize: 14, flex: 1 }}>✅ {form.crop}</div>
                      <button onClick={() => { setForm(f => ({ ...f, crop: "" })); setShowMoreCrops(false); }} style={{ background: "#fef2f2", border: `1px solid #fecaca`, borderRadius: 8, color: C.danger, padding: "8px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>পরিবর্তন</button>
                    </div>
                  )}
                  {showMoreCrops && (
                    <div>
                      <button onClick={() => setShowMoreCrops(false)} style={{ background: "none", border: "none", color: C.primary, cursor: "pointer", fontSize: 13, marginBottom: 10 }}>← ফিরে যান</button>
                      {Object.keys(CROPS).map(group => (
                        <div key={group} style={{ marginBottom: 8 }}>
                          <button onClick={() => setExpandedGroup(expandedGroup === group ? null : group)} style={{ width: "100%", background: expandedGroup === group ? "#f0fdf4" : C.bgMuted, border: `1px solid ${expandedGroup === group ? C.primary : C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, cursor: "pointer", textAlign: "left", fontSize: 12, fontWeight: 600 }}>
                            {group} {expandedGroup === group ? "▲" : "▼"}
                          </button>
                          {expandedGroup === group && (
                            <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderTop: "none", borderRadius: "0 0 8px 8px", padding: 8, maxHeight: 200, overflowY: "auto" }}>
                              {CROPS[group].map(crop => (
                                <div key={crop} onClick={() => { handleCropQuickSelect(crop); setExpandedGroup(null); }} style={{ padding: "7px 10px", cursor: "pointer", fontSize: 12, color: C.text, borderRadius: 6 }} onMouseEnter={e => e.currentTarget.style.background = "#f0fdf4"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>{crop}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Location & Season */}
                <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={labelSt}>📍 জেলা {locationSource && <span style={{ color: C.blue, fontSize: 9 }}>(auto)</span>}</label>
                      <select value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} style={selSt}>
                        <option value="">-- জেলা --</option>
                        {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelSt}>🗓️ মৌসুম</label>
                      <select value={form.season} onChange={e => setForm(f => ({ ...f, season: e.target.value }))} style={selSt}>
                        <option value="">-- মৌসুম --</option>
                        {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={labelSt}>🌿 বৃদ্ধির পর্যায়</label>
                    <select value={form.growthStage} onChange={e => setForm(f => ({ ...f, growthStage: e.target.value }))} style={selSt}>
                      <option value="">-- পর্যায় --</option>
                      {GROWTH_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Duration */}
                <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
                  <label style={labelSt}>⏱️ সমস্যার সময়কাল</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {DURATION_CHIPS.map(chip => { const active = form.duration === chip.value; return <button key={chip.label} onClick={() => setForm(f => ({ ...f, duration: active ? "" : chip.value }))} style={{ ...chipSt, border: `1px solid ${active ? C.primary : C.border}`, background: active ? "#f0fdf4" : "#f8faf8", color: active ? C.primaryDark : C.text, fontWeight: active ? 700 : 400 }}>{chip.label}</button>; })}
                  </div>
                </div>

                {/* Affected area */}
                <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
                  <label style={labelSt}>🗺️ আক্রান্ত এলাকা</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {AREA_CHIPS.map(chip => { const active = form.affectedArea === chip.value; return <button key={chip.label} onClick={() => setForm(f => ({ ...f, affectedArea: active ? "" : chip.value }))} style={{ ...chipSt, border: `1px solid ${active ? C.primary : C.border}`, background: active ? "#f0fdf4" : "#f8faf8", color: active ? C.primaryDark : C.text, fontWeight: active ? 700 : 400 }}>{chip.label}</button>; })}
                  </div>
                </div>

                {/* Symptoms */}
                <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <label style={{ ...labelSt, marginBottom: 0 }}>🩺 লক্ষণ বর্ণনা করুন *</label>
                    {voiceSupported && (
                      <button onClick={isListening ? stopListening : startListening} style={{ width: 42, height: 42, borderRadius: "50%", border: `2px solid ${isListening ? C.danger : C.primary}`, background: isListening ? "#fef2f2" : "#f0fdf4", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {isListening ? <span style={{ animation: "pulse 1s infinite" }}>⏹</span> : "🎙️"}
                      </button>
                    )}
                  </div>
                  {Object.entries(SYMPTOM_CHIPS).map(([group, chips]) => (
                    <div key={group} style={{ marginBottom: 10 }}>
                      <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>{group}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {chips.map(chip => { const active = form.symptoms.includes(chip.value); return <button key={chip.label} onClick={() => { if (active) setForm(f => ({ ...f, symptoms: f.symptoms.replace(chip.value, "").replace(/\n\n+/g, "\n").trim() })); else setForm(f => ({ ...f, symptoms: f.symptoms ? f.symptoms.trimEnd() + "\n" + chip.value : chip.value })); }} style={{ ...chipSt, border: `1px solid ${active ? C.primary : C.border}`, background: active ? "#f0fdf4" : "#f8faf8", color: active ? C.primaryDark : C.text, fontWeight: active ? 700 : 400 }}>{active ? "✓ " : ""}{chip.label}</button>; })}
                      </div>
                    </div>
                  ))}
                  <textarea value={form.symptoms} onChange={e => setForm(f => ({ ...f, symptoms: e.target.value }))} placeholder="এখানে বিস্তারিত লিখুন বা উপরে ট্যাপ করুন..." rows={3} style={{ width: "100%", background: C.bgMuted, border: `1px solid ${isListening ? C.danger : C.border}`, borderRadius: 8, color: C.text, padding: "9px 12px", fontSize: 13, outline: "none", resize: "vertical", marginTop: 8, boxSizing: "border-box" }} />
                </div>

                {/* Image Upload */}
                <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
                  <label style={labelSt}>📷 ছবি আপলোড (ঐচ্ছিক)</label>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />
                  {!image ? (
                    <button onClick={() => fileRef.current.click()} style={{ width: "100%", padding: "20px", border: `2px dashed ${C.border}`, borderRadius: 12, background: C.bgMuted, cursor: "pointer", color: C.textMuted, fontSize: 13, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 28 }}>📁</span><span>ছবি বেছে নিন বা ক্যামেরা ব্যবহার করুন</span>
                      <span style={{ fontSize: 11, color: C.textLight }}>JPG, PNG · AI দ্বারা বিশ্লেষণ হবে</span>
                    </button>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <img src={image} alt="preview" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 10, border: `2px solid ${C.primary}` }} />
                      <div style={{ flex: 1 }}><div style={{ fontSize: 13, color: C.success, fontWeight: 600 }}>✅ ছবি সংযুক্ত</div><div style={{ fontSize: 11, color: C.textMuted }}>AI দ্বারা বিশ্লেষণ হবে</div></div>
                      <button onClick={() => { setImage(null); setImageBase64(null); }} style={{ background: "#fef2f2", border: `1px solid #fecaca`, borderRadius: 8, color: C.danger, padding: "6px 10px", cursor: "pointer", fontSize: 12 }}>✕</button>
                    </div>
                  )}
                </div>

                {error && <div style={{ background: "#fef2f2", border: `1px solid #fecaca`, borderRadius: 12, padding: "12px 16px", color: C.danger, marginBottom: 12, fontSize: 13 }}>⚠️ {error}</div>}

                <button onClick={handleSubmit} disabled={loading} style={{ width: "100%", padding: "16px", borderRadius: 14, border: "none", background: loading ? C.border : `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`, color: "#fff", fontWeight: 800, fontSize: 16, cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : `0 4px 20px rgba(26,122,58,0.4)`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s" }}>
                  {loading ? <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span> বিশ্লেষণ হচ্ছে...</> : <>📸 রোগ নির্ণয় করুন</>}
                </button>
              </div>
            )}

            {/* Step 2: Result */}
            {step === 2 && result && (
              <div ref={resultRef}>
                <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 26 }}>📋</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color: C.primaryDark }}>রোগ নির্ণয় প্রতিবেদন</div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>{form.crop?.split("/")[0]?.trim()} · {form.district?.split("/")[0]?.trim() || locationName}</div>
                    </div>
                    {provider && <span style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 20, padding: "3px 10px", color: C.blue, fontSize: 11, fontWeight: 600 }}>{provider}</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ display: "flex", background: C.bgMuted, borderRadius: 20, padding: 3, gap: 2 }}>
                      <button onClick={() => { setShowEnglish(false); stopSpeaking(); }} style={{ borderRadius: 16, padding: "5px 16px", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: !showEnglish ? C.primary : "transparent", color: !showEnglish ? "#fff" : C.textMuted, transition: "all 0.2s" }}>বাংলা</button>
                      <button onClick={() => { setShowEnglish(true); stopSpeaking(); }} style={{ borderRadius: 16, padding: "5px 16px", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: showEnglish ? C.primary : "transparent", color: showEnglish ? "#fff" : C.textMuted, transition: "all 0.2s" }}>English</button>
                    </div>
                    {ttsSupported && <button onClick={() => isSpeaking ? stopSpeaking() : speakResult(showEnglish ? result.en : result.bn)} style={{ width: 38, height: 38, borderRadius: "50%", border: `2px solid ${isSpeaking ? C.warning : C.primary}`, background: isSpeaking ? "#fffbeb" : "#f0fdf4", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>{isSpeaking ? "⏹" : "🔊"}</button>}
                    {weather && <span style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 20, padding: "3px 10px", color: "#0369a1", fontSize: 11 }}>🌡️ {weather.temp}°C · 💧{weather.humidity}%</span>}
                  </div>
                </div>

                <div>
                  {(() => {
                    const text = showEnglish ? (result.en || "") : (result.bn || result.en || "");
                    if (!text) return <div style={{ color: C.textMuted, fontSize: 13, textAlign: "center", padding: 20 }}>কোনো ফলাফল পাওয়া যায়নি।</div>;
                    const sections = parseIntoSections(text);
                    if (sections.length <= 1 && !sections[0]?.title) return <div style={{ background: "#fff", borderRadius: 14, padding: 16, color: C.text, fontSize: 13.5, lineHeight: 1.85, border: `1px solid ${C.border}` }}>{renderInline(text)}</div>;
                    return sections.map((sec, i) => <SectionCard key={i} title={sec.title} bodyLines={sec.body} defaultOpen={i < 3} />);
                  })()}
                </div>

                {/* Product Recommendations */}
                {recommendedProducts.length > 0 && (
                  <ProductRecommendations products={recommendedProducts} crop={form.crop} />
                )}

                {!severity ? (
                  <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginTop: 12, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
                    <SeveritySurvey onSubmit={(s) => setSeverity(s)} />
                  </div>
                ) : (
                  <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "12px 16px", marginTop: 12, border: `1px solid #bbf7d0`, fontSize: 13, color: C.success, fontWeight: 600 }}>✅ তীব্রতা নথিভুক্ত: {severity}</div>
                )}

                <div style={{ marginTop: 12, padding: "10px 14px", background: "#fffbeb", border: `1px solid #fed7aa`, borderRadius: 10, color: C.warning, fontSize: 12 }}>
                  ⚠️ এই রিপোর্টটি প্রাথমিক গাইডেন্সের জন্য। চূড়ান্ত সিদ্ধান্তের জন্য স্থানীয় কৃষি কর্মকর্তার (DAE) পরামর্শ নিন।
                </div>
                <button onClick={reset} style={{ width: "100%", marginTop: 12, padding: "14px", borderRadius: 14, border: `1px solid ${C.border}`, background: "#fff", color: C.text, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>🔁 নতুন রোগ নির্ণয়</button>
              </div>
            )}
          </div>
        )}

        {/* LIBRARY TAB */}
        {activeTab === "library" && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: C.primaryDark, marginBottom: 4 }}>📚 তথ্যভাণ্ডার</div>
            <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 16 }}>পোকামাকড়, রোগ ও পুষ্টি অভাব সম্পর্কে জানুন</div>
            <LibrarySection />
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: C.primaryDark, marginBottom: 16 }}>📋 রোগ নির্ণয়ের ইতিহাস</div>
            {history.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: C.textMuted }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🌾</div>
                <div style={{ fontWeight: 600 }}>এখনো কোনো রোগ নির্ণয় নেই</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>প্রথম নির্ণয় করুন!</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[...history].reverse().map((h, i) => (
                  <div key={i} style={{ padding: "14px 16px", background: C.bgMuted, borderRadius: 12, border: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{h.crop?.split("/")[0]?.trim()}</div>
                      <span style={{ background: "#dcfce7", color: "#166534", borderRadius: 10, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>সম্পন্ন</span>
                    </div>
                    <div style={{ color: C.textMuted, fontSize: 12 }}>📍 {h.district?.split("/")[0]?.trim() || "—"} · 📅 {h.date}</div>
                    {h.resultPreview && <div style={{ color: C.textLight, fontSize: 11, marginTop: 6, lineHeight: 1.5 }}>{h.resultPreview}...</div>}
                  </div>
                ))}
                <button onClick={() => { setHistory([]); try { localStorage.removeItem("cabi-history"); } catch {} }} style={{ padding: "10px", borderRadius: 10, border: `1px solid #fecaca`, background: "#fef2f2", color: C.danger, cursor: "pointer", fontSize: 12, fontWeight: 600, marginTop: 4 }}>🗑️ সব ইতিহাস মুছুন</button>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", padding: "8px", color: C.textLight, fontSize: 10, borderTop: `1px solid ${C.border}`, background: "#fff" }}>
        CABI Plantwise · BRRI · BARI · DAE Bangladesh · Open-Meteo
      </div>
    </div>
  );
}
