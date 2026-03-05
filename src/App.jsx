import { useState, useRef } from "react";

// ─── Bangladesh Crops (Comprehensive) ────────────────────────────────────────
const CROPS = {
  "ধান / Rice": [
    "ধান (বোরো) / Rice - Boro",
    "ধান (আমন) / Rice - Aman",
    "ধান (আউশ) / Rice - Aus",
  ],
  "গম ও অন্যান্য শস্য / Wheat & Cereals": [
    "গম / Wheat",
    "ভুট্টা / Maize",
    "যব / Barley",
    "জোয়ার / Sorghum",
    "বাজরা / Pearl Millet",
    "চিনা / Foxtail Millet",
    "কাউন / Little Millet",
  ],
  "ডাল ফসল / Pulses": [
    "মসুর / Lentil",
    "মুগ / Mungbean",
    "মাষকলাই / Blackgram",
    "খেসারি / Grass Pea / Khesari",
    "ছোলা / Chickpea",
    "মটর / Field Pea",
    "সয়াবিন / Soybean",
    "ফেলন / Hyacinth Bean",
    "শিম / Lablab Bean",
    "বরবটি / Yard-Long Bean",
    "ঢেঁড়স মটর / Cowpea",
  ],
  "তেলবীজ / Oilseeds": [
    "সরিষা / Mustard",
    "তিল / Sesame",
    "চিনাবাদাম / Groundnut",
    "সূর্যমুখী / Sunflower",
    "তিসি / Linseed",
    "রেপসিড / Rapeseed",
  ],
  "সবজি / Vegetables": [
    "আলু / Potato",
    "টমেটো / Tomato",
    "বেগুন / Eggplant / Brinjal",
    "মরিচ / Chilli",
    "কাঁচামরিচ / Green Pepper",
    "শিমলা মরিচ / Capsicum",
    "লাউ / Bottle Gourd",
    "কুমড়া / Pumpkin",
    "মিষ্টি কুমড়া / Sweet Pumpkin",
    "চালকুমড়া / Ash Gourd",
    "তিত করলা / Bitter Gourd",
    "চিচিঙ্গা / Snake Gourd",
    "ঝিঙা / Sponge Gourd / Luffa",
    "ধুন্দুল / Ridge Gourd",
    "কাকরোল / Spiny Gourd",
    "পটোল / Pointed Gourd",
    "ঢেঁড়স / Okra / Ladyfinger",
    "পালং শাক / Spinach",
    "লালশাক / Red Amaranth",
    "পুঁইশাক / Malabar Spinach",
    "কলমিশাক / Water Spinach",
    "মুলা / Radish",
    "গাজর / Carrot",
    "বাঁধাকপি / Cabbage",
    "ফুলকপি / Cauliflower",
    "ব্রকলি / Broccoli",
    "ওলকপি / Kohlrabi",
    "ব্রাসেলস স্প্রাউট / Brussels Sprout",
    "পেঁয়াজ / Onion",
    "রসুন / Garlic",
    "আদা / Ginger",
    "হলুদ / Turmeric",
    "মেথি / Fenugreek",
    "পেঁয়াজপাতা / Spring Onion",
    "সজনে / Moringa / Drumstick",
    "কচু / Taro / Arum",
    "মুখিকচু / Elephant Foot Yam",
    "কাসাভা / Cassava",
    "শকরকন্দ / Sweet Potato",
  ],
  "ফল / Fruits": [
    "আম / Mango",
    "কাঁঠাল / Jackfruit",
    "কলা / Banana",
    "পেঁপে / Papaya",
    "আনারস / Pineapple",
    "পেয়ারা / Guava",
    "লিচু / Lychee",
    "নারিকেল / Coconut",
    "সুপারি / Betelnut / Areca",
    "তাল / Palmyra Palm",
    "খেজুর / Date Palm",
    "জাম / Java Plum / Blackberry",
    "জামরুল / Rose Apple",
    "আমলকি / Amla / Indian Gooseberry",
    "বরই / Jujube / Ber",
    "বেল / Wood Apple / Bael",
    "তেঁতুল / Tamarind",
    "কামরাঙা / Starfruit / Carambola",
    "লেবু / Lemon",
    "কমলা / Orange",
    "মাল্টা / Malta Orange",
    "জাম্বুরা / Pomelo",
    "আঙুর / Grape",
    "স্ট্রবেরি / Strawberry",
    "ড্রাগন ফ্রুট / Dragon Fruit",
    "অ্যাভোকাডো / Avocado",
    "পেশন ফ্রুট / Passion Fruit",
  ],
  "আঁশ ফসল / Fiber Crops": [
    "পাট / Jute",
    "মেস্তা / Kenaf / Mesta",
    "তুলা / Cotton",
  ],
  "চিনি ও মসলা / Sugar & Spice": [
    "আখ / Sugarcane",
    "ধনিয়া / Coriander",
    "জিরা / Cumin",
    "মৌরি / Fennel",
    "কালোজিরা / Black Cumin / Nigella",
    "পোস্তা / Poppy",
    "লবঙ্গ / Clove",
    "দারচিনি / Cinnamon",
    "এলাচ / Cardamom",
    "পান / Betel Leaf",
  ],
  "ঘাস ও চারণ / Forage & Fodder": [
    "নেপিয়ার ঘাস / Napier Grass",
    "ভুট্টা (সবুজ চারা) / Maize Fodder",
    "জার্মান ঘাস / German Grass",
    "পারা ঘাস / Para Grass",
  ],
  "বিবিধ / Miscellaneous": [
    "তামাক / Tobacco",
    "চা / Tea",
    "রাবার / Rubber",
    "পুদিনা / Mint",
    "অ্যালোভেরা / Aloe Vera",
    "স্টিভিয়া / Stevia",
  ],
};

const DISTRICTS = [
  "ঢাকা / Dhaka","চট্টগ্রাম / Chattogram","রাজশাহী / Rajshahi","খুলনা / Khulna",
  "বরিশাল / Barisal","সিলেট / Sylhet","রংপুর / Rangpur","ময়মনসিংহ / Mymensingh",
  "কুমিল্লা / Cumilla","গাজীপুর / Gazipur","নারায়ণগঞ্জ / Narayanganj","টাঙ্গাইল / Tangail",
  "কিশোরগঞ্জ / Kishoreganj","মানিকগঞ্জ / Manikganj","মুন্সীগঞ্জ / Munshiganj",
  "নরসিংদী / Narsingdi","ফরিদপুর / Faridpur","মাদারীপুর / Madaripur",
  "গোপালগঞ্জ / Gopalganj","শরীয়তপুর / Shariatpur","রাজবাড়ী / Rajbari",
  "ময়মনসিংহ / Mymensingh","নেত্রকোণা / Netrokona","জামালপুর / Jamalpur",
  "শেরপুর / Sherpur","সিলেট / Sylhet","মৌলভীবাজার / Moulvibazar",
  "হবিগঞ্জ / Habiganj","সুনামগঞ্জ / Sunamganj","রাজশাহী / Rajshahi",
  "চাঁপাইনবাবগঞ্জ / Chapainawabganj","নাটোর / Natore","নওগাঁ / Naogaon",
  "বগুড়া / Bogura","জয়পুরহাট / Joypurhat","পাবনা / Pabna","সিরাজগঞ্জ / Sirajganj",
  "রংপুর / Rangpur","দিনাজপুর / Dinajpur","কুড়িগ্রাম / Kurigram",
  "গাইবান্ধা / Gaibandha","লালমনিরহাট / Lalmonirhat","নীলফামারী / Nilphamari",
  "পঞ্চগড় / Panchagarh","ঠাকুরগাঁও / Thakurgaon","খুলনা / Khulna",
  "বাগেরহাট / Bagerhat","সাতক্ষীরা / Satkhira","যশোর / Jashore",
  "ঝিনাইদহ / Jhenaidah","মাগুরা / Magura","নড়াইল / Narail","কুষ্টিয়া / Kushtia",
  "চুয়াডাঙ্গা / Chuadanga","মেহেরপুর / Meherpur","বরিশাল / Barisal",
  "পটুয়াখালী / Patuakhali","পিরোজপুর / Pirojpur","ঝালকাঠি / Jhalokati",
  "বরগুনা / Barguna","ভোলা / Bhola","চট্টগ্রাম / Chattogram",
  "কক্সবাজার / Cox's Bazar","ফেনী / Feni","নোয়াখালী / Noakhali",
  "লক্ষ্মীপুর / Lakshmipur","চাঁদপুর / Chandpur","ব্রাহ্মণবাড়িয়া / Brahmanbaria",
  "কুমিল্লা / Cumilla","বান্দরবান / Bandarban","রাঙামাটি / Rangamati",
  "খাগড়াছড়ি / Khagrachhari",
];

const SEASONS = [
  "বোরো মৌসুম / Boro Season (Nov–May)",
  "আমন মৌসুম / Aman Season (Jun–Nov)",
  "আউশ মৌসুম / Aus Season (Mar–Aug)",
  "রবি মৌসুম / Rabi Season (Oct–Mar)",
  "খরিপ মৌসুম / Kharif Season (Apr–Sep)",
  "সারা বছর / Year-round",
];

const GROWTH_STAGES = [
  "বীজ অঙ্কুরোদগম / Germination",
  "চারা / Seedling",
  "কুশি / Tillering",
  "শাখা-প্রশাখা / Vegetative",
  "ফুল ফোটা / Flowering",
  "ফল ধারণ / Fruit Set",
  "পরিপক্বতা / Maturity",
  "ফসল কাটা / Harvesting",
];

// ─── System Prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert agricultural plant disease and pest diagnostic AI assistant for Bangladesh, trained in the CABI Plantwise methodology. You help farmers and extension officers (DAE) identify crop problems and recommend evidence-based integrated pest management (IPM) solutions suitable for Bangladesh conditions.

Your knowledge includes:
- All major crops of Bangladesh (rice varieties: Boro, Aman, Aus; vegetables; fruits; pulses; oilseeds; jute; wheat; maize)
- BRRI, BARI, and DAE recommended practices and varieties
- Bangladesh-specific pests, diseases, and nutrient deficiencies
- Seasonal pest calendars for Bangladesh agro-ecological zones
- IPM strategies: cultural, biological, chemical (last resort)
- Common pesticides and fertilizers available in Bangladesh markets
- Cost-effective solutions for smallholder farmers

Response format:
1. **Probable Diagnosis** (Probable রোগ/পোকার নাম — both English and Bangla)
2. **Causal Agent** (রোগের কারণ)
3. **Symptoms Description** (লক্ষণ)
4. **Severity Assessment** (তীব্রতা মূল্যায়ন)
5. **Immediate Action** (তাৎক্ষণিক ব্যবস্থা)
6. **IPM Recommendations** (সমন্বিত বালাই ব্যবস্থাপনা)
   - Cultural control (কৃষি ব্যবস্থাপনা)
   - Biological control (জৈবিক নিয়ন্ত্রণ)
   - Chemical control if necessary (রাসায়নিক — শেষ উপায়)
7. **Prevention for Next Season** (প্রতিরোধমূলক ব্যবস্থা)
8. **When to Consult DAE** (কখন কৃষি কর্মকর্তার সাথে যোগাযোগ করবেন)

Always respond in BOTH Bangla and English. Be practical and affordable for smallholder farmers in Bangladesh. Recommend specific products/varieties available in Bangladesh.`;

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CABIDiagnosis() {
  const [form, setForm] = useState({
    crop: "", district: "", season: "", growthStage: "",
    symptoms: "", duration: "", affectedArea: "",
  });
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const fileRef = useRef();

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = () => setImageBase64(reader.result.split(",")[1]);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!form.crop || !form.symptoms) {
      setError("অনুগ্রহ করে ফসল এবং লক্ষণ উভয়ই পূরণ করুন। / Please fill in crop and symptoms.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    const userContent = [];

    if (imageBase64) {
      userContent.push({
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data: imageBase64 },
      });
    }

    userContent.push({
      type: "text",
      text: `
Crop: ${form.crop}
District: ${form.district || "Not specified"}
Season: ${form.season || "Not specified"}
Growth Stage: ${form.growthStage || "Not specified"}
Duration of problem: ${form.duration || "Not specified"}
Affected area: ${form.affectedArea || "Not specified"}

Symptoms described by farmer:
${form.symptoms}

${imageBase64 ? "A photo of the affected crop has been attached." : "No photo provided."}

Please diagnose this crop problem and provide IPM recommendations following the CABI Plantwise methodology, suitable for Bangladesh conditions. Respond in both Bangla and English.
      `.trim(),
    });

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userContent }],
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const text = data.content?.map((b) => b.text || "").join("\n") || "No response.";
      setResult(text);
    } catch (err) {
      setError(`রোগ নির্ণয়ে সমস্যা হয়েছে: ${err.message}\nDiagnosis failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setForm({ crop:"", district:"", season:"", growthStage:"", symptoms:"", duration:"", affectedArea:"" });
    setImage(null); setImageBase64(null); setResult(null); setError(null);
  };

  // ── UI ──────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Segoe UI', Tahoma, sans-serif", minHeight: "100vh", background: "linear-gradient(135deg, #0a2e0f 0%, #1a5c24 50%, #0d3b15 100%)", padding: "20px" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.08)", backdropFilter: "blur(10px)", borderRadius: 16, padding: "14px 28px", border: "1px solid rgba(255,255,255,0.15)" }}>
          <span style={{ fontSize: 36 }}>🌾</span>
          <div style={{ textAlign: "left" }}>
            <div style={{ color: "#7fff7f", fontSize: 22, fontWeight: 700, letterSpacing: 0.5 }}>CABI Plantwise</div>
            <div style={{ color: "#b8f0c0", fontSize: 13 }}>ফসল রোগ নির্ণয় | Crop Disease Diagnosis — Bangladesh</div>
          </div>
          <span style={{ fontSize: 36 }}>🔬</span>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(12px)", borderRadius: 20, border: "1px solid rgba(255,255,255,0.12)", padding: 28 }}>

          {/* Row 1: Crop Selector */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>🌱 ফসল নির্বাচন / Select Crop *</label>
            {!form.crop ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
                {Object.keys(CROPS).map((group) => (
                  <div key={group}>
                    <button
                      onClick={() => setExpandedGroup(expandedGroup === group ? null : group)}
                      style={{ ...groupBtnStyle, background: expandedGroup === group ? "rgba(100,220,100,0.25)" : "rgba(255,255,255,0.08)" }}
                    >
                      {group}
                    </button>
                    {expandedGroup === group && (
                      <div style={{ marginTop: 4, background: "rgba(0,30,0,0.6)", borderRadius: 8, padding: 6, maxHeight: 200, overflowY: "auto" }}>
                        {CROPS[group].map((crop) => (
                          <div key={crop} onClick={() => { setForm(f => ({ ...f, crop })); setExpandedGroup(null); }}
                            style={{ color: "#c8ffd0", fontSize: 12, padding: "5px 8px", cursor: "pointer", borderRadius: 5, transition: "background 0.15s" }}
                            onMouseEnter={e => e.target.style.background = "rgba(100,220,100,0.2)"}
                            onMouseLeave={e => e.target.style.background = "transparent"}
                          >{crop}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ background: "rgba(100,220,100,0.2)", border: "1px solid #5de05d", borderRadius: 10, padding: "8px 16px", color: "#7fff7f", fontWeight: 600, fontSize: 14 }}>
                  ✅ {form.crop}
                </div>
                <button onClick={() => setForm(f => ({ ...f, crop: "" }))} style={{ background: "rgba(255,100,100,0.2)", border: "1px solid rgba(255,100,100,0.4)", borderRadius: 8, color: "#ffaaaa", padding: "6px 12px", cursor: "pointer", fontSize: 12 }}>
                  পরিবর্তন / Change
                </button>
              </div>
            )}
          </div>

          {/* Row 2: District + Season */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>📍 জেলা / District</label>
              <select value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} style={selectStyle}>
                <option value="">-- জেলা বেছে নিন --</option>
                {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>🗓️ মৌসুম / Season</label>
              <select value={form.season} onChange={e => setForm(f => ({ ...f, season: e.target.value }))} style={selectStyle}>
                <option value="">-- মৌসুম বেছে নিন --</option>
                {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Row 3: Growth Stage + Duration */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>🌿 বৃদ্ধির পর্যায় / Growth Stage</label>
              <select value={form.growthStage} onChange={e => setForm(f => ({ ...f, growthStage: e.target.value }))} style={selectStyle}>
                <option value="">-- পর্যায় বেছে নিন --</option>
                {GROWTH_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>⏱️ সমস্যার সময়কাল / Duration</label>
              <input
                value={form.duration}
                onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                placeholder="e.g. ৩ দিন / 3 days"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Row 4: Affected Area */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>🗺️ আক্রান্ত এলাকা / Affected Area</label>
            <input
              value={form.affectedArea}
              onChange={e => setForm(f => ({ ...f, affectedArea: e.target.value }))}
              placeholder="e.g. ২০% জমি / 20% of field, বিক্ষিপ্ত / scattered patches"
              style={inputStyle}
            />
          </div>

          {/* Symptoms */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>🩺 লক্ষণ বর্ণনা / Describe Symptoms *</label>
            <textarea
              value={form.symptoms}
              onChange={e => setForm(f => ({ ...f, symptoms: e.target.value }))}
              placeholder="পাতায় হলুদ দাগ, কান্ড পচা, পোকার উপস্থিতি... / Yellow spots on leaves, stem rot, insect presence..."
              rows={4}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* Image Upload */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>📷 ছবি আপলোড / Upload Photo (optional)</label>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <button onClick={() => fileRef.current.click()} style={{ background: "rgba(100,180,255,0.15)", border: "1px dashed rgba(100,180,255,0.5)", borderRadius: 10, color: "#a0d0ff", padding: "10px 20px", cursor: "pointer", fontSize: 13 }}>
                📁 ফাইল বেছে নিন / Choose File
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />
              {image && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <img src={image} alt="preview" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8, border: "2px solid #5de05d" }} />
                  <button onClick={() => { setImage(null); setImageBase64(null); }} style={{ background: "rgba(255,80,80,0.2)", border: "none", borderRadius: 6, color: "#ffaaaa", padding: "4px 8px", cursor: "pointer", fontSize: 11 }}>✕</button>
                </div>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: "rgba(255,80,80,0.15)", border: "1px solid rgba(255,80,80,0.4)", borderRadius: 12, padding: "12px 16px", color: "#ffbbbb", marginBottom: 16, fontSize: 13, whiteSpace: "pre-wrap" }}>
              ⚠️ {error}
            </div>
          )}

          {/* Submit */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ background: loading ? "rgba(100,150,100,0.3)" : "linear-gradient(135deg, #2d7a2d, #4db84d)", border: "none", borderRadius: 14, color: "white", padding: "14px 40px", fontSize: 16, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : "0 4px 20px rgba(77,184,77,0.4)", transition: "all 0.2s", letterSpacing: 0.5 }}
            >
              {loading ? "🔄 বিশ্লেষণ হচ্ছে..." : "🔬 রোগ নির্ণয় করুন / Diagnose"}
            </button>
            {(result || error) && (
              <button onClick={reset} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 14, color: "#ccc", padding: "14px 24px", cursor: "pointer", fontSize: 14 }}>
                🔁 নতুন / New
              </button>
            )}
          </div>
        </div>

        {/* Result */}
        {result && (
          <div style={{ marginTop: 20, background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", borderRadius: 20, border: "1px solid rgba(100,220,100,0.3)", padding: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 24 }}>📋</span>
              <h2 style={{ color: "#7fff7f", margin: 0, fontSize: 18 }}>রোগ নির্ণয় প্রতিবেদন / Diagnostic Report</h2>
            </div>
            <div style={{ color: "#d0f0d8", lineHeight: 1.9, fontSize: 14, whiteSpace: "pre-wrap", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 16 }}>
              {result}
            </div>
            <div style={{ marginTop: 16, padding: "10px 14px", background: "rgba(255,200,50,0.1)", border: "1px solid rgba(255,200,50,0.3)", borderRadius: 10, color: "#ffe08a", fontSize: 12 }}>
              ⚠️ এই রিপোর্টটি প্রাথমিক গাইডেন্সের জন্য। চূড়ান্ত সিদ্ধান্তের জন্য স্থানীয় কৃষি কর্মকর্তার (DAE) পরামর্শ নিন।<br />
              This report is for preliminary guidance only. Consult your local DAE officer for final decisions.
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 16, color: "rgba(255,255,255,0.35)", fontSize: 11 }}>
          Powered by CABI Plantwise Methodology · BRRI · BARI · DAE Bangladesh
        </div>
      </div>
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const labelStyle = { display: "block", color: "#9fe8a8", fontSize: 13, fontWeight: 600, marginBottom: 6 };
const selectStyle = { width: "100%", background: "rgba(0,20,0,0.5)", border: "1px solid rgba(100,200,100,0.3)", borderRadius: 10, color: "#d0f0d8", padding: "10px 12px", fontSize: 13, outline: "none" };
const inputStyle = { width: "100%", background: "rgba(0,20,0,0.5)", border: "1px solid rgba(100,200,100,0.3)", borderRadius: 10, color: "#d0f0d8", padding: "10px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" };
const groupBtnStyle = { width: "100%", border: "1px solid rgba(100,200,100,0.25)", borderRadius: 9, color: "#b0e8b8", padding: "8px 10px", cursor: "pointer", fontSize: 11, textAlign: "left", transition: "background 0.15s" };
