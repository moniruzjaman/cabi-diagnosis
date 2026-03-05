import { useState, useRef, useCallback } from "react";

const MODEL = "claude-sonnet-4-20250514";

// No JSON — use labeled plain text to completely avoid parse errors
const SYSTEM_PROMPT = `You are an expert agricultural diagnostic assistant for Bangladesh farmers and extension workers. You know Bangladesh crops, pests, diseases, DAE/BRRI/BARI recommendations, and CABI Plantwise data deeply.

When given a crop problem, respond using EXACTLY this format with these exact labels. Do not add any extra text before or after. Do not use JSON, markdown, or bullet points. Use the pipe | character only as shown.

DIAGNOSIS_EN: English name of the disease/pest/problem
DIAGNOSIS_BN: বাংলায় রোগ বা পোকার নাম
CONFIDENCE: High OR Medium OR Low
CATEGORY: Disease OR Pest OR Deficiency OR Abiotic
CAUSAL_AGENT: Scientific name — English common name — বাংলা নাম
CROPS_BD: crop1 | crop2 | crop3
SEVERITY: Low OR Moderate OR High OR Critical
URGENCY: Immediate OR Within a week OR Monitor
SYMPTOM_EN_1: First symptom in English
SYMPTOM_EN_2: Second symptom in English
SYMPTOM_EN_3: Third symptom in English
SYMPTOM_BN_1: প্রথম লক্ষণ বাংলায়
SYMPTOM_BN_2: দ্বিতীয় লক্ষণ বাংলায়
SYMPTOM_BN_3: তৃতীয় লক্ষণ বাংলায়
SPREAD: How the disease or pest spreads in Bangladesh context (one paragraph)
CULTURAL_EN_1: First cultural management practice
CULTURAL_EN_2: Second cultural management practice
CULTURAL_BN_1: প্রথম কৃষি ব্যবস্থাপনা পদ্ধতি
CULTURAL_BN_2: দ্বিতীয় কৃষি ব্যবস্থাপনা পদ্ধতি
BIOLOGICAL: Biological control option available in Bangladesh
CHEMICAL_EN_1: First chemical option with active ingredient and Bangladesh brand name
CHEMICAL_EN_2: Second chemical option with active ingredient and Bangladesh brand name
CHEMICAL_BN_1: প্রথম রাসায়নিক বালাইনাশক
CHEMICAL_BN_2: দ্বিতীয় রাসায়নিক বালাইনাশক
PREVENTIVE_EN_1: First preventive measure
PREVENTIVE_EN_2: Second preventive measure
PREVENTIVE_BN_1: প্রথম প্রতিরোধমূলক ব্যবস্থা
PREVENTIVE_BN_2: দ্বিতীয় প্রতিরোধমূলক ব্যবস্থা
DAE_NOTE: Specific recommendation from DAE, BRRI, or BARI for Bangladesh farmers
CABI_NOTE: Relevant CABI Plantwise note for South Asia or Bangladesh context
ALTERNATIVE_1: First alternative diagnosis to consider
ALTERNATIVE_2: Second alternative diagnosis to consider`;

const BD_CROPS = [
  "ধান - বোরো (Boro Rice)","ধান - আমন (Aman Rice)","ধান - আউশ (Aus Rice)",
  "পাট (Jute)","গম (Wheat)","সরিষা (Mustard)","আলু (Potato)",
  "টমেটো (Tomato)","বেগুন (Brinjal)","মরিচ (Chili)","পেঁয়াজ (Onion)",
  "রসুন (Garlic)","মসুর ডাল (Lentil)","ছোলা (Chickpea)",
  "আম (Mango)","কলা (Banana)","কাঁঠাল (Jackfruit)","লিচু (Lychee)",
  "পান (Betel Leaf)","আখ (Sugarcane)","শসা (Cucumber)",
  "লাউ (Bottle Gourd)","করলা (Bitter Gourd)","ঢেঁড়স (Okra)",
  "অন্যান্য (Other)"
];

const BD_DISTRICTS = [
  "ঢাকা","চট্টগ্রাম","রাজশাহী","খুলনা","বরিশাল","সিলেট",
  "রংপুর","ময়মনসিংহ","কুমিল্লা","ফরিদপুর","যশোর","দিনাজপুর",
  "বগুড়া","পাবনা","নোয়াখালী","সুনামগঞ্জ","নেত্রকোনা","কিশোরগঞ্জ",
  "টাঙ্গাইল","জামালপুর","নরসিংদী","মুন্সিগঞ্জ","অন্যান্য"
];

const SEASONS = [
  "বোরো মৌসুম (Boro - Dec to May)",
  "আমন মৌসুম (Aman - Jun to Nov)",
  "রবি মৌসুম (Rabi - Oct to Mar)",
  "খরিফ-১ (Kharif-1 Mar to Jun)",
  "খরিফ-২ (Kharif-2 Jul to Oct)"
];

// Parse plain-text labeled response into object
function parseResponse(text) {
  const d = {};
  const lines = text.split("\n");
  for (const line of lines) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();
    if (key && val) d[key] = val;
  }

  const get = k => d[k] || "";
  const getArr = (...keys) => keys.map(k => d[k]).filter(Boolean);

  return {
    diagnosis_en:   get("DIAGNOSIS_EN"),
    diagnosis_bn:   get("DIAGNOSIS_BN"),
    confidence:     get("CONFIDENCE"),
    category:       get("CATEGORY"),
    causal_agent:   get("CAUSAL_AGENT"),
    crops:          get("CROPS_BD").split("|").map(s => s.trim()).filter(Boolean),
    severity:       get("SEVERITY"),
    urgency:        get("URGENCY"),
    symptoms_en:    getArr("SYMPTOM_EN_1","SYMPTOM_EN_2","SYMPTOM_EN_3"),
    symptoms_bn:    getArr("SYMPTOM_BN_1","SYMPTOM_BN_2","SYMPTOM_BN_3"),
    spread:         get("SPREAD"),
    cultural_en:    getArr("CULTURAL_EN_1","CULTURAL_EN_2"),
    cultural_bn:    getArr("CULTURAL_BN_1","CULTURAL_BN_2"),
    biological:     getArr("BIOLOGICAL"),
    chemical_en:    getArr("CHEMICAL_EN_1","CHEMICAL_EN_2"),
    chemical_bn:    getArr("CHEMICAL_BN_1","CHEMICAL_BN_2"),
    preventive_en:  getArr("PREVENTIVE_EN_1","PREVENTIVE_EN_2"),
    preventive_bn:  getArr("PREVENTIVE_BN_1","PREVENTIVE_BN_2"),
    dae_note:       get("DAE_NOTE"),
    cabi_note:      get("CABI_NOTE"),
    alternatives:   getArr("ALTERNATIVE_1","ALTERNATIVE_2"),
  };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function callAPI(messages, onStatus) {
  const RETRYABLE = new Set([429, 500, 502, 503, 529]);
  for (let i = 1; i <= 4; i++) {
    if (i > 1) {
      onStatus(`Retrying ${i}/4 — server busy...`);
      await sleep(i * 2000);
    }
    let res;
    try {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 2000,
          system: SYSTEM_PROMPT,
          messages
        })
      });
    } catch (netErr) {
      if (i === 4) throw new Error("Network error: " + netErr.message);
      continue;
    }

    if (RETRYABLE.has(res.status)) {
      if (i === 4) throw new Error(`Server unavailable (${res.status}). Please try again shortly.`);
      continue;
    }
    if (!res.ok) {
      let msg = `API error ${res.status}`;
      try { const j = await res.json(); msg = j?.error?.message || msg; } catch {}
      throw new Error(msg);
    }

    const data = await res.json();
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
    if (!text) throw new Error("Empty response from API.");
    return parseResponse(text);
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen]     = useState("form");
  const [lang, setLang]         = useState("bn");
  const [crop, setCrop]         = useState("");
  const [district, setDistrict] = useState("");
  const [season, setSeason]     = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [imgFile, setImgFile]   = useState(null);
  const [imgB64, setImgB64]     = useState(null);
  const [result, setResult]     = useState(null);
  const [errMsg, setErrMsg]     = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();
  const bn = lang === "bn";

  const loadImage = useCallback(file => {
    if (!file || !file.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = e => { setImgFile(file); setImgB64(e.target.result); };
    r.readAsDataURL(file);
  }, []);

  const onDrop = e => { e.preventDefault(); setDragOver(false); loadImage(e.dataTransfer.files[0]); };

  const submit = async () => {
    if (!crop)           { setErrMsg(bn ? "অনুগ্রহ করে ফসলের নাম বেছে নিন।" : "Please select a crop."); setScreen("error"); return; }
    if (!symptoms.trim()){ setErrMsg(bn ? "অনুগ্রহ করে রোগের লক্ষণ বর্ণনা করুন।" : "Please describe the symptoms."); setScreen("error"); return; }

    setScreen("loading");
    setStatusMsg(bn ? "বিশ্লেষণ শুরু হচ্ছে..." : "Starting analysis...");

    const text = `Crop: ${crop}
District: ${district || "Not specified"}
Season: ${season || "Not specified"}
Symptoms: ${symptoms}
${imgB64 ? "Field photo attached." : "No photo."}
Please diagnose this crop problem for a Bangladesh farmer.`;

    const userContent = imgB64
      ? [{ type: "image", source: { type: "base64", media_type: imgFile.type, data: imgB64.split(",")[1] } }, { type: "text", text }]
      : text;

    try {
      const data = await callAPI([{ role: "user", content: userContent }], msg => setStatusMsg(msg));
      setResult(data);
      setScreen("result");
    } catch (e) {
      setErrMsg(e.message);
      setScreen("error");
    }
  };

  const reset = () => {
    setScreen("form"); setResult(null); setErrMsg(""); setStatusMsg("");
    setCrop(""); setDistrict(""); setSeason(""); setSymptoms("");
    setImgFile(null); setImgB64(null);
  };

  const sevColor = s => ({ Low:"#4ade80", Moderate:"#fbbf24", High:"#f97316", Critical:"#ef4444" })[s] || "#94a3b8";
  const urgColor = u => ({ Immediate:"#ef4444", "Within a week":"#f97316", Monitor:"#4ade80" })[u] || "#94a3b8";
  const catIcon  = c => ({ Pest:"🦗", Disease:"🦠", Deficiency:"🍂", Abiotic:"🌡️" })[c] || "🔬";

  const G = {
    bg:"#0b160b", surface:"#121e12", border:"#1e3a1e",
    green:"#4a8c3f", greenDark:"#2d6b24", text:"#e2f0de", muted:"#527a4f", dim:"#2d4a2d"
  };
  const card = { background:G.surface, border:`1px solid ${G.border}`, borderRadius:12, padding:18 };
  const lbl  = { display:"block", fontSize:11, color:G.muted, marginBottom:5, textTransform:"uppercase", letterSpacing:1 };
  const sel  = { width:"100%", background:G.surface, border:`1px solid ${G.border}`, borderRadius:8, padding:"11px 14px", color:G.text, fontSize:14, outline:"none", cursor:"pointer", fontFamily:"inherit" };

  return (
    <div style={{ minHeight:"100vh", background:G.bg, fontFamily:"'Noto Sans Bengali',Georgia,serif", color:G.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap');
        * { box-sizing:border-box; }
        select option { background:#121e12; color:#e2f0de; }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .fade { animation:fadeUp 0.3s ease both; }
        .btn:hover { filter:brightness(1.1); transform:translateY(-1px); }
        .btn:active { transform:translateY(0); }
        textarea:focus, select:focus { border-color:#4a8c3f !important; outline:none; }
      `}</style>

      {/* HEADER */}
      <header style={{ background:`linear-gradient(135deg,#162616,${G.bg})`, borderBottom:`1px solid ${G.border}` }}>
        <div style={{ maxWidth:880, margin:"0 auto", padding:"16px 20px", display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:46, height:46, background:`linear-gradient(135deg,${G.green},${G.greenDark})`, borderRadius:11, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, boxShadow:"0 3px 16px rgba(74,140,63,0.45)", flexShrink:0 }}>🌾</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:18, fontWeight:700, color:"#a8d5a0" }}>{bn ? "স্মার্ট ফসল রোগ নির্ণয়" : "Smart Crop Diagnosis"}</div>
            <div style={{ fontSize:11, color:G.muted, marginTop:1 }}>{bn ? "কৃষক ও উপসহকারী কৃষি কর্মকর্তাদের জন্য · Bangladesh" : "For Farmers & Extension Workers · Bangladesh"}</div>
          </div>
          <div style={{ display:"flex", background:G.bg, border:`1px solid ${G.border}`, borderRadius:7, overflow:"hidden", flexShrink:0 }}>
            {["bn","en"].map(l => (
              <button key={l} onClick={() => setLang(l)} style={{ padding:"6px 13px", border:"none", cursor:"pointer", fontSize:12, fontWeight:700, background:lang===l?G.greenDark:"transparent", color:lang===l?"#fff":G.muted, fontFamily:"inherit", transition:"all 0.2s" }}>
                {l==="bn"?"বাংলা":"EN"}
              </button>
            ))}
          </div>
          <div style={{ fontSize:10, color:G.green, fontWeight:700, textAlign:"right", flexShrink:0, lineHeight:1.6 }}>DAE · BRRI<br/>BARI · CABI</div>
        </div>
      </header>

      <main style={{ maxWidth:880, margin:"0 auto", padding:"28px 20px" }}>

        {/* FORM */}
        {screen === "form" && (
          <div className="fade">
            <div style={{ textAlign:"center", marginBottom:28 }}>
              <h1 style={{ fontSize:24, fontWeight:700, color:"#c8e6c0", margin:0, lineHeight:1.3 }}>
                {bn ? "আপনার ফসলের সমস্যা নির্ণয় করুন" : "Diagnose Your Crop Problem"}
              </h1>
              <p style={{ color:G.muted, marginTop:8, fontSize:14, maxWidth:500, margin:"8px auto 0" }}>
                {bn ? "মাঠের পরিস্থিতি বর্ণনা করুন — তাৎক্ষণিক বিশেষজ্ঞ পরামর্শ পান" : "Describe what you see in the field and get instant expert guidance"}
              </p>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
              <div>
                <label style={lbl}>{bn ? "ফসলের নাম *" : "Crop *"}</label>
                <select value={crop} onChange={e => setCrop(e.target.value)} style={{ ...sel, color:crop?G.text:G.muted }}>
                  <option value="">{bn ? "ফসল বেছে নিন..." : "Select crop..."}</option>
                  {BD_CROPS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>{bn ? "জেলা" : "District"}</label>
                <select value={district} onChange={e => setDistrict(e.target.value)} style={{ ...sel, color:district?G.text:G.muted }}>
                  <option value="">{bn ? "জেলা বেছে নিন..." : "Select district..."}</option>
                  {BD_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={lbl}>{bn ? "মৌসুম" : "Season"}</label>
              <select value={season} onChange={e => setSeason(e.target.value)} style={{ ...sel, color:season?G.text:G.muted }}>
                <option value="">{bn ? "মৌসুম বেছে নিন..." : "Select season..."}</option>
                {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={lbl}>{bn ? "রোগের লক্ষণ বর্ণনা করুন *" : "Describe Symptoms *"}</label>
              <textarea rows={5} value={symptoms} onChange={e => setSymptoms(e.target.value)}
                placeholder={bn
                  ? "যেমন: পাতায় বাদামি দাগ, গাছ হলুদ হয়ে যাচ্ছে, পাতার নিচে পোকা, কাণ্ড পচে যাচ্ছে..."
                  : "e.g. Brown spots on leaves, yellowing, insects under leaves, stem rotting, wilting..."}
                style={{ width:"100%", background:G.surface, border:`1px solid ${G.border}`, borderRadius:8, padding:"12px 14px", color:G.text, fontSize:14, resize:"vertical", fontFamily:"inherit", minHeight:100, outline:"none", transition:"border-color 0.2s" }} />
            </div>

            <div style={{ marginBottom:24 }}>
              <label style={lbl}>{bn ? "ছবি সংযুক্ত করুন (ঐচ্ছিক)" : "Attach Photo (Optional)"}</label>
              <div onClick={() => fileRef.current.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                style={{ border:`2px dashed ${dragOver?G.green:G.border}`, borderRadius:10, padding:18, textAlign:"center", cursor:"pointer", background:dragOver?"#162616":G.surface, transition:"all 0.2s" }}>
                {imgB64 ? (
                  <div style={{ display:"flex", alignItems:"center", gap:12, justifyContent:"center" }}>
                    <img src={imgB64} alt="" style={{ width:56, height:56, objectFit:"cover", borderRadius:8, border:`1px solid ${G.border}` }} />
                    <div style={{ textAlign:"left" }}>
                      <div style={{ color:"#a8d5a0", fontSize:14 }}>{imgFile.name}</div>
                      <div style={{ color:G.muted, fontSize:12 }}>{bn ? "পরিবর্তন করতে ক্লিক করুন" : "Click to change"}</div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); setImgFile(null); setImgB64(null); }}
                      style={{ background:"#2a1212", border:"1px solid #4a2020", borderRadius:6, color:"#ef9a9a", fontSize:12, padding:"4px 10px", cursor:"pointer", fontFamily:"inherit" }}>
                      ✕ {bn?"সরান":"Remove"}
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize:28, marginBottom:4 }}>📷</div>
                    <div style={{ color:G.muted, fontSize:13 }}>{bn ? "ছবি টেনে আনুন বা এখানে ক্লিক করুন" : "Drag & drop or click to upload"}</div>
                    <div style={{ color:G.dim, fontSize:11, marginTop:3 }}>JPG · PNG · WEBP</div>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => loadImage(e.target.files[0])} />
              </div>
            </div>

            <button className="btn" onClick={submit}
              style={{ width:"100%", padding:"16px", borderRadius:10, border:"none", background:`linear-gradient(135deg,${G.green},${G.greenDark})`, color:"#fff", fontSize:17, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 22px rgba(74,140,63,0.45)", fontFamily:"inherit", letterSpacing:0.3, transition:"all 0.15s" }}>
              {bn ? "🔬 রোগ নির্ণয় করুন" : "🔬 Run Diagnosis"}
            </button>
            <p style={{ textAlign:"center", color:G.dim, fontSize:12, marginTop:12 }}>
              {bn ? "ফসলের নাম ও লক্ষণ পূরণ করলেই নির্ণয় শুরু হবে · ছবি ঐচ্ছিক" : "Crop and symptoms required · Photo is optional"}
            </p>
          </div>
        )}

        {/* LOADING */}
        {screen === "loading" && (
          <div style={{ textAlign:"center", padding:"80px 20px" }}>
            <div style={{ fontSize:54, animation:"spin 2s linear infinite", display:"inline-block", marginBottom:20 }}>🌿</div>
            <h2 style={{ color:"#a8d5a0", margin:0, fontSize:22 }}>{bn ? "বিশ্লেষণ করা হচ্ছে..." : "Analyzing..."}</h2>
            <p style={{ color:G.muted, marginTop:8, fontSize:14 }}>{bn ? "ফসলের তথ্য যাচাই করা হচ্ছে" : "Cross-referencing Bangladesh crop health databases"}</p>
            {statusMsg && (
              <div style={{ marginTop:18, background:"#162616", border:`1px solid ${G.border}`, borderRadius:8, padding:"10px 20px", display:"inline-block", color:"#a8d5a0", fontSize:13 }}>
                🔄 {statusMsg}
              </div>
            )}
          </div>
        )}

        {/* ERROR */}
        {screen === "error" && (
          <div className="fade" style={{ textAlign:"center", padding:"60px 20px" }}>
            <div style={{ fontSize:46, marginBottom:12 }}>⚠️</div>
            <h2 style={{ color:"#ef4444", margin:"0 0 16px" }}>{bn ? "সমস্যা হয়েছে" : "Something went wrong"}</h2>
            <div style={{ background:"#180c0c", border:"1px solid #4a2020", borderRadius:10, padding:"14px 20px", maxWidth:520, margin:"0 auto 20px", textAlign:"left" }}>
              <div style={{ fontSize:10, color:"#6a3a3a", marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>Error Details</div>
              <div style={{ color:"#ef9a9a", fontSize:13, lineHeight:1.7, wordBreak:"break-word" }}>{errMsg}</div>
            </div>
            <p style={{ color:G.muted, fontSize:13, maxWidth:400, margin:"0 auto 20px" }}>
              {bn ? "কিছুক্ষণ পরে আবার চেষ্টা করুন।" : "Wait a moment and try again."}
            </p>
            <button className="btn" onClick={reset}
              style={{ padding:"12px 30px", background:G.dim, border:"none", borderRadius:8, color:"#a8d5a0", cursor:"pointer", fontSize:14, fontFamily:"inherit", transition:"all 0.15s" }}>
              {bn ? "← ফিরে যান" : "← Go Back"}
            </button>
          </div>
        )}

        {/* RESULT */}
        {screen === "result" && result && (
          <div className="fade">

            {/* Title */}
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20, gap:12, flexWrap:"wrap" }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:14 }}>
                <span style={{ fontSize:38, lineHeight:1, flexShrink:0 }}>{catIcon(result.category)}</span>
                <div>
                  <div style={{ fontSize:22, fontWeight:700, color:"#c8e6c0", lineHeight:1.2 }}>{result.diagnosis_bn || result.diagnosis_en}</div>
                  <div style={{ fontSize:14, color:"#a8d5a0", marginTop:3 }}>{result.diagnosis_en}</div>
                  <div style={{ fontSize:12, color:G.muted, marginTop:3, fontStyle:"italic" }}>{result.causal_agent}</div>
                </div>
              </div>
              <button className="btn" onClick={reset}
                style={{ padding:"9px 18px", background:G.surface, border:`1px solid ${G.border}`, borderRadius:8, color:"#6a9a65", cursor:"pointer", fontSize:13, fontFamily:"inherit", flexShrink:0, transition:"all 0.15s" }}>
                {bn ? "← নতুন নির্ণয়" : "← New Diagnosis"}
              </button>
            </div>

            {/* Pills */}
            <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
              {[
                { label:bn?"নিশ্চিততা":"Confidence", val:result.confidence,  color:G.green },
                { label:bn?"তীব্রতা":"Severity",     val:result.severity,    color:sevColor(result.severity) },
                { label:bn?"জরুরিতা":"Urgency",       val:result.urgency,     color:urgColor(result.urgency) },
              ].map(p => (
                <div key={p.label} style={{ background:G.surface, border:`1px solid ${p.color}55`, borderRadius:20, padding:"6px 14px", fontSize:13 }}>
                  <span style={{ color:G.muted }}>{p.label}: </span>
                  <span style={{ color:p.color, fontWeight:700 }}>{p.val}</span>
                </div>
              ))}
              {result.crops?.length > 0 && (
                <div style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:20, padding:"6px 14px", fontSize:12, color:"#6a9a65" }}>
                  🌾 {result.crops.join(" · ")}
                </div>
              )}
            </div>

            {/* Symptoms + Spread */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
              <div style={card}>
                <h3 style={{ color:"#a8d5a0", margin:"0 0 12px", fontSize:12, textTransform:"uppercase", letterSpacing:1 }}>🔍 {bn?"মূল লক্ষণসমূহ":"Key Symptoms"}</h3>
                {(bn ? result.symptoms_bn : result.symptoms_en).map((s,i) => (
                  <div key={i} style={{ display:"flex", gap:8, marginBottom:8, fontSize:14, color:"#c8e6c0", lineHeight:1.5 }}>
                    <span style={{ color:G.green, flexShrink:0 }}>▸</span>{s}
                  </div>
                ))}
              </div>
              <div style={card}>
                <h3 style={{ color:"#a8d5a0", margin:"0 0 12px", fontSize:12, textTransform:"uppercase", letterSpacing:1 }}>📡 {bn?"বিস্তার ও পরিবেশ":"Spread & Environment"}</h3>
                <p style={{ fontSize:14, color:"#c8e6c0", lineHeight:1.7, margin:0 }}>{result.spread}</p>
                {result.alternatives?.length > 0 && (
                  <div style={{ marginTop:14, paddingTop:12, borderTop:`1px solid ${G.border}` }}>
                    <div style={{ fontSize:11, color:G.muted, marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>{bn?"অন্য সম্ভাবনা":"Also Consider"}</div>
                    {result.alternatives.map((a,i) => <div key={i} style={{ fontSize:13, color:"#6a9a65", marginBottom:4 }}>• {a}</div>)}
                  </div>
                )}
              </div>
            </div>

            {/* Management */}
            <div style={{ ...card, marginBottom:14 }}>
              <h3 style={{ color:"#a8d5a0", margin:"0 0 18px", fontSize:12, textTransform:"uppercase", letterSpacing:1 }}>💊 {bn?"ব্যবস্থাপনা পরামর্শ":"Management Recommendations"}</h3>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
                {[
                  { icon:"🌾", bn:"কৃষি ব্যবস্থাপনা",   en:"Cultural Controls",  iBn:result.cultural_bn,   iEn:result.cultural_en },
                  { icon:"🐛", bn:"জৈব নিয়ন্ত্রণ",     en:"Biological Control", iBn:result.biological,    iEn:result.biological },
                  { icon:"🧪", bn:"রাসায়নিক দমন",       en:"Chemical Options",   iBn:result.chemical_bn,   iEn:result.chemical_en },
                  { icon:"🛡️", bn:"প্রতিরোধ ব্যবস্থা",  en:"Prevention",         iBn:result.preventive_bn, iEn:result.preventive_en },
                ].map(sec => {
                  const items = bn ? (sec.iBn?.length ? sec.iBn : sec.iEn) : (sec.iEn?.length ? sec.iEn : sec.iBn);
                  if (!items?.length) return null;
                  return (
                    <div key={sec.en}>
                      <div style={{ fontSize:13, color:"#6a9a65", marginBottom:10, fontWeight:700 }}>{sec.icon} {bn?sec.bn:sec.en}</div>
                      {items.map((item,i) => (
                        <div key={i} style={{ fontSize:13, color:"#c8e6c0", marginBottom:7, paddingLeft:12, borderLeft:`2px solid ${G.border}`, lineHeight:1.6 }}>{item}</div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DAE + CABI */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:18 }}>
              {result.dae_note && (
                <div style={{ background:"#0c1c0c", border:"1px solid #2a5a22", borderRadius:12, padding:16 }}>
                  <div style={{ fontSize:11, color:G.green, marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>🏛️ DAE / BRRI / BARI</div>
                  <div style={{ fontSize:13, color:"#a8d5a0", lineHeight:1.7 }}>{result.dae_note}</div>
                </div>
              )}
              {result.cabi_note && (
                <div style={{ background:"#0c1420", border:"1px solid #1e3a60", borderRadius:12, padding:16 }}>
                  <div style={{ fontSize:11, color:"#4a8aaa", marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>📚 CABI Plantwise</div>
                  <div style={{ fontSize:13, color:"#90bcd5", lineHeight:1.7 }}>{result.cabi_note}</div>
                </div>
              )}
            </div>

            {/* Disclaimer */}
            <div style={{ background:"#141a10", border:`1px solid ${G.border}`, borderRadius:10, padding:"12px 16px", textAlign:"center", color:G.muted, fontSize:12, lineHeight:1.7 }}>
              {bn
                ? "⚠️ এটি AI-ভিত্তিক প্রাথমিক পরামর্শ। চূড়ান্ত সিদ্ধান্তের আগে উপজেলা কৃষি অফিসে যোগাযোগ করুন।"
                : "⚠️ AI-assisted initial guidance only. Confirm with your Upazila Agriculture Office before applying treatments."}
            </div>
          </div>
        )}
      </main>

      <footer style={{ borderTop:`1px solid ${G.border}`, padding:"14px 20px", textAlign:"center", marginTop:24 }}>
        <div style={{ fontSize:12, color:G.dim }}>কৃষি সম্প্রসারণ অধিদপ্তর (DAE) · BRRI · BARI · CABI Plantwise</div>
        <div style={{ fontSize:11, color:"#1e3a1e", marginTop:3 }}>Smart Agri EcoSystem — Bangladesh Extension Service Tool · v3.0</div>
      </footer>
    </div>
  );
}
