import { useState, useRef, useEffect, useCallback } from "react";

// ─── Bangladesh Crops ─────────────────────────────────────────────────────────
const CROPS = {
  "ধান / Rice": ["ধান (বোরো) / Rice - Boro","ধান (আমন) / Rice - Aman","ধান (আউশ) / Rice - Aus"],
  "গম ও শস্য / Cereals": ["গম / Wheat","ভুট্টা / Maize","যব / Barley","জোয়ার / Sorghum","বাজরা / Pearl Millet","চিনা / Foxtail Millet","কাউন / Little Millet"],
  "ডাল / Pulses": ["মসুর / Lentil","মুগ / Mungbean","মাষকলাই / Blackgram","খেসারি / Grass Pea","ছোলা / Chickpea","মটর / Field Pea","সয়াবিন / Soybean","ফেলন / Hyacinth Bean","শিম / Lablab Bean","বরবটি / Yard-Long Bean","ঢেঁড়স মটর / Cowpea"],
  "তেলবীজ / Oilseeds": ["সরিষা / Mustard","তিল / Sesame","চিনাবাদাম / Groundnut","সূর্যমুখী / Sunflower","তিসি / Linseed","রেপসিড / Rapeseed"],
  "সবজি / Vegetables": ["আলু / Potato","টমেটো / Tomato","বেগুন / Brinjal","মরিচ / Chilli","শিমলা মরিচ / Capsicum","লাউ / Bottle Gourd","কুমড়া / Pumpkin","মিষ্টি কুমড়া / Sweet Pumpkin","চালকুমড়া / Ash Gourd","তিত করলা / Bitter Gourd","চিচিঙ্গা / Snake Gourd","ঝিঙা / Luffa","ধুন্দুল / Ridge Gourd","কাকরোল / Spiny Gourd","পটোল / Pointed Gourd","ঢেঁড়স / Okra","পালং শাক / Spinach","লালশাক / Red Amaranth","পুঁইশাক / Malabar Spinach","কলমিশাক / Water Spinach","মুলা / Radish","গাজর / Carrot","বাঁধাকপি / Cabbage","ফুলকপি / Cauliflower","ব্রকলি / Broccoli","ওলকপি / Kohlrabi","পেঁয়াজ / Onion","রসুন / Garlic","আদা / Ginger","হলুদ / Turmeric","সজনে / Moringa","কচু / Taro","মুখিকচু / Yam","কাসাভা / Cassava","শকরকন্দ / Sweet Potato"],
  "ফল / Fruits": ["আম / Mango","কাঁঠাল / Jackfruit","কলা / Banana","পেঁপে / Papaya","আনারস / Pineapple","পেয়ারা / Guava","লিচু / Lychee","নারিকেল / Coconut","সুপারি / Areca","জাম / Java Plum","জামরুল / Rose Apple","আমলকি / Amla","বরই / Jujube","বেল / Wood Apple","তেঁতুল / Tamarind","কামরাঙা / Starfruit","লেবু / Lemon","কমলা / Orange","মাল্টা / Malta","জাম্বুরা / Pomelo","স্ট্রবেরি / Strawberry","ড্রাগন ফ্রুট / Dragon Fruit"],
  "আঁশ / Fiber": ["পাট / Jute","মেস্তা / Kenaf","তুলা / Cotton"],
  "চিনি ও মসলা / Sugar & Spice": ["আখ / Sugarcane","ধনিয়া / Coriander","জিরা / Cumin","মৌরি / Fennel","কালোজিরা / Nigella","পোস্তা / Poppy","পান / Betel Leaf"],
  "চারণ / Forage": ["নেপিয়ার ঘাস / Napier Grass","জার্মান ঘাস / German Grass","পারা ঘাস / Para Grass"],
  "বিবিধ / Misc": ["তামাক / Tobacco","চা / Tea","রাবার / Rubber","পুদিনা / Mint","অ্যালোভেরা / Aloe Vera"],
};

const DISTRICTS = [
  "ঢাকা / Dhaka","চট্টগ্রাম / Chattogram","রাজশাহী / Rajshahi","খুলনা / Khulna","বরিশাল / Barisal","সিলেট / Sylhet","রংপুর / Rangpur","ময়মনসিংহ / Mymensingh","কুমিল্লা / Cumilla","গাজীপুর / Gazipur","নারায়ণগঞ্জ / Narayanganj","টাঙ্গাইল / Tangail","কিশোরগঞ্জ / Kishoreganj","মানিকগঞ্জ / Manikganj","মুন্সীগঞ্জ / Munshiganj","নরসিংদী / Narsingdi","ফরিদপুর / Faridpur","মাদারীপুর / Madaripur","গোপালগঞ্জ / Gopalganj","শরীয়তপুর / Shariatpur","রাজবাড়ী / Rajbari","নেত্রকোণা / Netrokona","জামালপুর / Jamalpur","শেরপুর / Sherpur","মৌলভীবাজার / Moulvibazar","হবিগঞ্জ / Habiganj","সুনামগঞ্জ / Sunamganj","চাঁপাইনবাবগঞ্জ / Chapainawabganj","নাটোর / Natore","নওগাঁ / Naogaon","বগুড়া / Bogura","জয়পুরহাট / Joypurhat","পাবনা / Pabna","সিরাজগঞ্জ / Sirajganj","দিনাজপুর / Dinajpur","কুড়িগ্রাম / Kurigram","গাইবান্ধা / Gaibandha","লালমনিরহাট / Lalmonirhat","নীলফামারী / Nilphamari","পঞ্চগড় / Panchagarh","ঠাকুরগাঁও / Thakurgaon","বাগেরহাট / Bagerhat","সাতক্ষীরা / Satkhira","যশোর / Jashore","ঝিনাইদহ / Jhenaidah","মাগুরা / Magura","নড়াইল / Narail","কুষ্টিয়া / Kushtia","চুয়াডাঙ্গা / Chuadanga","মেহেরপুর / Meherpur","পটুয়াখালী / Patuakhali","পিরোজপুর / Pirojpur","ঝালকাঠি / Jhalokati","বরগুনা / Barguna","ভোলা / Bhola","কক্সবাজার / Cox's Bazar","ফেনী / Feni","নোয়াখালী / Noakhali","লক্ষ্মীপুর / Lakshmipur","চাঁদপুর / Chandpur","ব্রাহ্মণবাড়িয়া / Brahmanbaria","বান্দরবান / Bandarban","রাঙামাটি / Rangamati","খাগড়াছড়ি / Khagrachhari",
];

const SEASONS = [
  "বোরো মৌসুম / Boro Season (Nov–May)","আমন মৌসুম / Aman Season (Jun–Nov)","আউশ মৌসুম / Aus Season (Mar–Aug)","রবি মৌসুম / Rabi Season (Oct–Mar)","খরিপ মৌসুম / Kharif Season (Apr–Sep)","সারা বছর / Year-round",
];

const GROWTH_STAGES = [
  "বীজ অঙ্কুরোদগম / Germination","চারা / Seedling","কুশি / Tillering","শাখা-প্রশাখা / Vegetative","ফুল ফোটা / Flowering","ফল ধারণ / Fruit Set","পরিপক্বতা / Maturity","ফসল কাটা / Harvesting",
];

// ─── Weather risk engine (Bangladesh-specific) ────────────────────────────────
function assessWeatherRisks(w) {
  const risks = [];
  if (!w) return risks;
  if (w.humidity >= 80 && w.temp >= 26 && w.temp <= 36)
    risks.push({ level: "high", icon: "🔴", text: "Blast & Sheath Blight risk HIGH (high humidity + warm temp)" });
  if (w.rain24h >= 50)
    risks.push({ level: "high", icon: "🔴", text: "Stem borer & root rot risk HIGH (heavy rainfall)" });
  if (w.rain24h === 0 && w.humidity < 55)
    risks.push({ level: "medium", icon: "🟡", text: "Mite & Thrips risk elevated (dry conditions)" });
  if (w.temp < 20)
    risks.push({ level: "medium", icon: "🟡", text: "Tungro virus & cold injury risk (cool temperature)" });
  if (w.humidity >= 85)
    risks.push({ level: "high", icon: "🔴", text: "Bacterial Leaf Blight (BLB) risk HIGH" });
  if (w.rain24h > 0 && w.rain24h < 20 && w.humidity > 70)
    risks.push({ level: "medium", icon: "🟡", text: "Brown spot & leaf scald conditions present" });
  if (risks.length === 0)
    risks.push({ level: "low", icon: "🟢", text: "Weather conditions normal — low disease pressure" });
  return risks;
}

// ─── Weather summary string for AI prompt ─────────────────────────────────────
function weatherPromptText(w, locationName) {
  if (!w) return "";
  const risks = assessWeatherRisks(w);
  return `
REAL-TIME WEATHER DATA (auto-detected):
Location: ${locationName || "Bangladesh"}
Temperature: ${w.temp}°C (feels like ${w.feelsLike}°C)
Humidity: ${w.humidity}%
Rainfall last 24h: ${w.rain24h} mm
Wind speed: ${w.windSpeed} km/h
Soil temperature (0-6cm): ${w.soilTemp}°C
UV Index: ${w.uvIndex}
Weather condition: ${w.condition}
Current weather-based disease risks: ${risks.map(r => r.text).join("; ")}

IMPORTANT: Factor the above real-time weather data into your diagnosis. Mention specific weather-related risk factors that are currently elevated for this crop and location.
`.trim();
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CABIDiagnosis() {
  const [form, setForm] = useState({
    crop: "", district: "", season: "", growthStage: "",
    symptoms: "", duration: "", affectedArea: "",
  });
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [result, setResult] = useState(null); // {bn, en}
  const [showEnglish, setShowEnglish] = useState(false);
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const fileRef = useRef();
  const recognitionRef = useRef(null);

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);

  // Weather state
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(null);
  const [locationName, setLocationName] = useState(null);
  const [coords, setCoords] = useState(null);
  const [locationSource, setLocationSource] = useState(null); // 'gps' | 'ip'

  // ── Fetch weather from Open-Meteo (free, no key) ──────────────────────────
  const fetchWeather = useCallback(async (lat, lon) => {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,uv_index,weather_code&hourly=soil_temperature_0cm&daily=precipitation_sum&timezone=Asia%2FDhaka&forecast_days=1`;
      const res = await fetch(url);
      const d = await res.json();
      const c = d.current;
      const rain24h = d.daily?.precipitation_sum?.[0] ?? c.precipitation ?? 0;
      const soilTemp = d.hourly?.soil_temperature_0cm?.[0] ?? "N/A";
      const wCode = c.weather_code;
      const condition =
        wCode === 0 ? "Clear sky" :
        wCode <= 3 ? "Partly cloudy" :
        wCode <= 49 ? "Foggy/misty" :
        wCode <= 69 ? "Drizzle/light rain" :
        wCode <= 79 ? "Rain" :
        wCode <= 99 ? "Thunderstorm" : "Unknown";

      setWeather({
        temp: Math.round(c.temperature_2m),
        feelsLike: Math.round(c.apparent_temperature),
        humidity: Math.round(c.relative_humidity_2m),
        rain24h: Math.round(rain24h * 10) / 10,
        windSpeed: Math.round(c.wind_speed_10m),
        uvIndex: Math.round(c.uv_index),
        soilTemp: typeof soilTemp === "number" ? Math.round(soilTemp) : soilTemp,
        condition,
      });
    } catch {
      setWeatherError("Weather data unavailable");
    }
  }, []);

  // ── Reverse geocode with Nominatim (free, no key) ─────────────────────────
  const reverseGeocode = useCallback(async (lat, lon) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`,
        { headers: { "User-Agent": "CABI-Bangladesh-Diagnosis/1.0" } }
      );
      const d = await res.json();
      const district = d.address?.county || d.address?.state_district || d.address?.city || d.address?.state || "";
      const division = d.address?.state || "";
      const name = [district, division, "Bangladesh"].filter(Boolean).join(", ");
      setLocationName(name);

      // Auto-fill district dropdown if we can match
      const districtLower = district.toLowerCase();
      const matched = DISTRICTS.find(dd => dd.toLowerCase().includes(districtLower) || districtLower.includes(dd.split("/")[0].trim().toLowerCase()));
      if (matched) setForm(f => ({ ...f, district: f.district || matched }));
    } catch {
      setLocationName("Bangladesh (location detected)");
    }
  }, []);

  // ── IP-based location fallback ────────────────────────────────────────────
  const fetchByIP = useCallback(async () => {
    try {
      const res = await fetch("https://ip-api.com/json/?fields=lat,lon,city,regionName");
      const d = await res.json();
      if (d.lat && d.lon) {
        setCoords({ lat: d.lat, lon: d.lon });
        setLocationSource("ip");
        const name = [d.city, d.regionName, "Bangladesh"].filter(Boolean).join(", ");
        setLocationName(name);
        await fetchWeather(d.lat, d.lon);
        const districtLower = (d.city || "").toLowerCase();
        const matched = DISTRICTS.find(dd => dd.toLowerCase().includes(districtLower) || districtLower.includes(dd.split("/")[0].trim().toLowerCase()));
        if (matched) setForm(f => ({ ...f, district: f.district || matched }));
      } else {
        // Bangladesh center as final fallback
        setCoords({ lat: 23.685, lon: 90.356 });
        setLocationName("Bangladesh (default)");
        await fetchWeather(23.685, 90.356);
      }
    } catch {
      setWeatherError("Could not detect location");
    }
  }, [fetchWeather]);

  // ── Request GPS on load ───────────────────────────────────────────────────
  useEffect(() => {
    setWeatherLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lon } = pos.coords;
          setCoords({ lat, lon });
          setLocationSource("gps");
          await Promise.all([fetchWeather(lat, lon), reverseGeocode(lat, lon)]);
          setWeatherLoading(false);
        },
        async () => {
          // GPS denied — fall back to IP
          await fetchByIP();
          setWeatherLoading(false);
        },
        { timeout: 8000 }
      );
    } else {
      fetchByIP().then(() => setWeatherLoading(false));
    }
  }, [fetchWeather, reverseGeocode, fetchByIP]);

  // ── Manual refresh weather ────────────────────────────────────────────────
  const refreshWeather = async () => {
    if (!coords) return;
    setWeatherLoading(true);
    setWeatherError(null);
    await fetchWeather(coords.lat, coords.lon);
    setWeatherLoading(false);
  };

  const weatherRisks = assessWeatherRisks(weather);

  // ── Image handler — compress to max 800px / 0.7 quality before upload ─────
  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(URL.createObjectURL(file));
    const img = new Image();
    img.onload = () => {
      const MAX = 800;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
        else { width = Math.round(width * MAX / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      const base64 = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];
      setImageBase64(base64);
    };
    img.src = URL.createObjectURL(file);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
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
      userContent.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } });
    }

    const weatherText = weatherPromptText(weather, locationName);

    userContent.push({
      type: "text",
      text: `
Crop: ${form.crop}
District: ${form.district || locationName || "Not specified"}
Season: ${form.season || "Not specified"}
Growth Stage: ${form.growthStage || "Not specified"}
Duration of problem: ${form.duration || "Not specified"}
Affected area: ${form.affectedArea || "Not specified"}

Symptoms described by farmer:
${form.symptoms}

${imageBase64 ? "A photo of the affected crop has been attached for visual diagnosis." : "No photo provided."}

${weatherText}

Please diagnose this crop problem using CABI Plantwise methodology. Factor in the real-time weather data above. Respond in both Bangla and English.
      `.trim(),
    });

    try {
      const response = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [{ role: "user", content: userContent }],
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        const detail = data?.attempts?.length ? "\n\nDetails:\n" + data.attempts.join("\n") : "";
        throw new Error((data?.error || `HTTP ${response.status}`) + detail);
      }

      const raw = data.content?.map((b) => b.text || "").join("\n") || "";

      // Split into Bangla and English sections
      const bnMatch = raw.match(/---BANGLA_SECTION---([\s\S]*?)---END_BANGLA---/);
      const enMatch = raw.match(/---ENGLISH_SECTION---([\s\S]*?)---END_ENGLISH---/);
      const bn = bnMatch ? bnMatch[1].trim() : raw;
      const en = enMatch ? enMatch[1].trim() : "";

      setResult({ bn, en });
      setProvider(data.provider || null);
    } catch (err) {
      setError(`রোগ নির্ণয়ে সমস্যা হয়েছে: ${err.message}\nDiagnosis failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  };

  const reset = () => {
    setForm({ crop: "", district: "", season: "", growthStage: "", symptoms: "", duration: "", affectedArea: "" });
    setImage(null); setImageBase64(null); setResult(null); setError(null); setProvider(null); setShowEnglish(false);
    stopSpeaking();
  };

  // ── Check browser support on mount ────────────────────────────────────────
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(!!SR);
    setTtsSupported(!!(window.speechSynthesis));
  }, []);

  // ── Start voice input ─────────────────────────────────────────────────────
  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    stopSpeaking();
    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = "bn-BD";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join("");
      setForm(f => ({ ...f, symptoms: f.symptoms ? f.symptoms.trimEnd() + " " + transcript : transcript }));
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    // Audible "বলুন" cue
    if (window.speechSynthesis) {
      const cue = new SpeechSynthesisUtterance("বলুন");
      cue.lang = "bn-BD"; cue.volume = 0.5;
      window.speechSynthesis.speak(cue);
    }
    recognition.start();
  };

  const stopListening = () => { recognitionRef.current?.stop(); setIsListening(false); };

  // ── Read diagnosis aloud ──────────────────────────────────────────────────
  const speakResult = (text, lang) => {
    if (!window.speechSynthesis) return;
    stopSpeaking();
    const clean = text
      .replace(/#{1,6}\s/g, "").replace(/\*\*/g, "").replace(/---[\w_]+---/g, "")
      .replace(/\*/g, "").replace(/`/g, "").replace(/\n{3,}/g, "\n\n").trim();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = lang || (showEnglish ? "en-US" : "bn-BD");
    utterance.rate = 0.88; utterance.pitch = 1.0; utterance.volume = 1.0;
    if (!showEnglish) {
      const voices = window.speechSynthesis.getVoices();
      const bnVoice = voices.find(v => v.lang.startsWith("bn") || v.name.toLowerCase().includes("bangla") || v.name.toLowerCase().includes("bengali"));
      if (bnVoice) utterance.voice = bnVoice;
    }
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // ── Weather widget ────────────────────────────────────────────────────────
  const WeatherWidget = () => (
    <div style={{ marginBottom: 20, borderRadius: 14, overflow: "hidden", border: "1px solid rgba(100,200,255,0.2)" }}>
      {/* Header bar */}
      <div style={{ background: "rgba(20,60,100,0.6)", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 16 }}>🌦️</span>
        <span style={{ color: "#a0d8ff", fontWeight: 700, fontSize: 13 }}>
          Real-time Weather {locationSource === "gps" ? "📍 GPS" : locationSource === "ip" ? "🌐 Auto" : ""}
        </span>
        {locationName && (
          <span style={{ color: "#7abfe8", fontSize: 11, marginLeft: 4 }}>— {locationName}</span>
        )}
        <button onClick={refreshWeather} style={{ marginLeft: "auto", background: "rgba(100,180,255,0.15)", border: "1px solid rgba(100,180,255,0.3)", borderRadius: 6, color: "#a0d8ff", padding: "3px 10px", cursor: "pointer", fontSize: 11 }}>
          🔄 Refresh
        </button>
      </div>

      {weatherLoading && !weather && (
        <div style={{ background: "rgba(10,30,60,0.5)", padding: "12px 16px", color: "#7abfe8", fontSize: 12 }}>
          ⏳ Detecting location & fetching weather...
        </div>
      )}

      {weatherError && !weather && (
        <div style={{ background: "rgba(10,30,60,0.5)", padding: "10px 16px", color: "#ffaaaa", fontSize: 12 }}>
          ⚠️ {weatherError}
        </div>
      )}

      {weather && (
        <>
          {/* Weather metrics */}
          <div style={{ background: "rgba(10,30,60,0.5)", padding: "12px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8 }}>
            {[
              { icon: "🌡️", label: "Temp", value: `${weather.temp}°C` },
              { icon: "💧", label: "Humidity", value: `${weather.humidity}%` },
              { icon: "🌧️", label: "Rain 24h", value: `${weather.rain24h} mm` },
              { icon: "💨", label: "Wind", value: `${weather.windSpeed} km/h` },
              { icon: "🌱", label: "Soil Temp", value: `${weather.soilTemp}°C` },
              { icon: "☀️", label: "UV Index", value: weather.uvIndex },
            ].map(({ icon, label, value }) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "6px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 16 }}>{icon}</div>
                <div style={{ color: "#7abfe8", fontSize: 9, marginTop: 2 }}>{label}</div>
                <div style={{ color: "#e0f4ff", fontSize: 13, fontWeight: 700 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Risk alerts */}
          <div style={{ background: "rgba(5,20,40,0.6)", padding: "8px 16px", borderTop: "1px solid rgba(100,200,255,0.1)" }}>
            {weatherRisks.map((r, i) => (
              <div key={i} style={{ fontSize: 11, color: r.level === "high" ? "#ffaaaa" : r.level === "medium" ? "#ffe08a" : "#88f0a8", padding: "2px 0" }}>
                {r.icon} {r.text}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Segoe UI', Tahoma, sans-serif", minHeight: "100vh", background: "linear-gradient(135deg, #0a2e0f 0%, #1a5c24 50%, #0d3b15 100%)", padding: "20px" }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.08)", backdropFilter: "blur(10px)", borderRadius: 16, padding: "14px 28px", border: "1px solid rgba(255,255,255,0.15)" }}>
          <span style={{ fontSize: 36 }}>🌾</span>
          <div style={{ textAlign: "left" }}>
            <div style={{ color: "#7fff7f", fontSize: 22, fontWeight: 700 }}>CABI Plantwise</div>
            <div style={{ color: "#b8f0c0", fontSize: 13 }}>ফসল রোগ নির্ণয় | Crop Disease Diagnosis — Bangladesh</div>
          </div>
          <span style={{ fontSize: 36 }}>🔬</span>
        </div>
      </div>

      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(12px)", borderRadius: 20, border: "1px solid rgba(255,255,255,0.12)", padding: 28 }}>

          {/* Weather Widget */}
          <WeatherWidget />

          {/* Crop Selector */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>🌱 ফসল নির্বাচন / Select Crop *</label>
            {!form.crop ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 8 }}>
                {Object.keys(CROPS).map((group) => (
                  <div key={group}>
                    <button
                      onClick={() => setExpandedGroup(expandedGroup === group ? null : group)}
                      style={{ ...groupBtnStyle, background: expandedGroup === group ? "rgba(100,220,100,0.25)" : "rgba(255,255,255,0.08)" }}
                    >{group}</button>
                    {expandedGroup === group && (
                      <div style={{ marginTop: 4, background: "rgba(0,30,0,0.7)", borderRadius: 8, padding: 6, maxHeight: 200, overflowY: "auto" }}>
                        {CROPS[group].map((crop) => (
                          <div key={crop} onClick={() => { setForm(f => ({ ...f, crop })); setExpandedGroup(null); }}
                            style={{ color: "#c8ffd0", fontSize: 12, padding: "5px 8px", cursor: "pointer", borderRadius: 5 }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(100,220,100,0.2)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
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

          {/* District + Season */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>
                📍 জেলা / District
                {locationSource && <span style={{ color: "#7abfe8", fontSize: 10, marginLeft: 6 }}>(auto-detected)</span>}
              </label>
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

          {/* Growth Stage + Duration */}
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
              <input value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                placeholder="e.g. ৩ দিন / 3 days" style={inputStyle} />
            </div>
          </div>

          {/* Affected Area */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>🗺️ আক্রান্ত এলাকা / Affected Area</label>
            <input value={form.affectedArea} onChange={e => setForm(f => ({ ...f, affectedArea: e.target.value }))}
              placeholder="e.g. ২০% জমি / 20% of field, বিক্ষিপ্ত / scattered patches" style={inputStyle} />
          </div>

          {/* Symptoms + Voice Input */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>🩺 লক্ষণ বর্ণনা / Describe Symptoms *</label>
              {voiceSupported && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {isListening && (
                    <span style={{ color: "#ff6b6b", fontSize: 11, animation: "pulse 1s infinite" }}>
                      ● শুনছি...
                    </span>
                  )}
                  <button
                    onClick={isListening ? stopListening : startListening}
                    title={isListening ? "থামুন" : "কথা বলে লক্ষণ বলুন"}
                    style={{
                      background: isListening
                        ? "rgba(255,80,80,0.25)"
                        : "rgba(100,220,100,0.15)",
                      border: isListening
                        ? "2px solid rgba(255,80,80,0.6)"
                        : "2px solid rgba(100,220,100,0.4)",
                      borderRadius: "50%", width: 44, height: 44,
                      cursor: "pointer", fontSize: 20,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: isListening ? "0 0 0 4px rgba(255,80,80,0.2)" : "none",
                      transition: "all 0.2s",
                    }}
                  >
                    {isListening ? "⏹" : "🎙️"}
                  </button>
                </div>
              )}
            </div>
            <textarea value={form.symptoms} onChange={e => setForm(f => ({ ...f, symptoms: e.target.value }))}
              placeholder={voiceSupported
                ? "🎙️ মাইক বাটন চাপুন এবং কথা বলুন, অথবা এখানে লিখুন... / Tap mic and speak, or type here..."
                : "পাতায় হলুদ দাগ, কান্ড পচা, পোকার উপস্থিতি... / Yellow spots on leaves, stem rot, insect presence..."}
              rows={4} style={{ ...inputStyle, resize: "vertical",
                border: isListening ? "1px solid rgba(255,100,100,0.6)" : "1px solid rgba(100,200,100,0.3)" }} />
            {!voiceSupported && (
              <div style={{ color: "#888", fontSize: 11, marginTop: 4 }}>
                ⚠️ এই ব্রাউজারে ভয়েস সাপোর্ট নেই। Chrome/Android ব্যবহার করুন।
              </div>
            )}
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
            <button onClick={handleSubmit} disabled={loading}
              style={{ background: loading ? "rgba(100,150,100,0.3)" : "linear-gradient(135deg, #2d7a2d, #4db84d)", border: "none", borderRadius: 14, color: "white", padding: "14px 40px", fontSize: 16, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : "0 4px 20px rgba(77,184,77,0.4)", transition: "all 0.2s" }}>
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

            {/* Result header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <span style={{ fontSize: 24 }}>📋</span>
              <h2 style={{ color: "#7fff7f", margin: 0, fontSize: 18 }}>রোগ নির্ণয় প্রতিবেদন</h2>

              {/* Lang toggle */}
              <div style={{ display: "flex", background: "rgba(0,0,0,0.3)", borderRadius: 20, padding: 3, gap: 2 }}>
                <button onClick={() => { setShowEnglish(false); stopSpeaking(); }}
                  style={{ borderRadius: 16, padding: "4px 14px", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                    background: !showEnglish ? "rgba(100,220,100,0.35)" : "transparent",
                    color: !showEnglish ? "#7fff7f" : "#888" }}>
                  বাংলা
                </button>
                <button onClick={() => { setShowEnglish(true); stopSpeaking(); }}
                  style={{ borderRadius: 16, padding: "4px 14px", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                    background: showEnglish ? "rgba(100,180,255,0.35)" : "transparent",
                    color: showEnglish ? "#a0d8ff" : "#888" }}>
                  English
                </button>
              </div>

              {weather && (
                <span style={{ background: "rgba(20,80,150,0.3)", border: "1px solid rgba(100,180,255,0.3)", borderRadius: 20, padding: "3px 10px", color: "#90c8f8", fontSize: 11 }}>
                  🌡️ {weather.temp}°C · 💧 {weather.humidity}% · 🌧️ {weather.rain24h}mm
                </span>
              )}
              {provider && (
                <span style={{ background: "rgba(100,200,255,0.15)", border: "1px solid rgba(100,200,255,0.35)", borderRadius: 20, padding: "3px 12px", color: "#a0d8ff", fontSize: 11, fontWeight: 600 }}>
                  {provider}
                </span>
              )}
              {/* Read aloud button */}
              {ttsSupported && (
                <button
                  onClick={() => isSpeaking ? stopSpeaking() : speakResult(showEnglish ? result.en : result.bn)}
                  title={isSpeaking ? "থামুন / Stop" : "পড়ে শোনাও / Read Aloud"}
                  style={{
                    marginLeft: "auto",
                    background: isSpeaking ? "rgba(255,180,50,0.25)" : "rgba(100,220,100,0.15)",
                    border: isSpeaking ? "2px solid rgba(255,180,50,0.6)" : "2px solid rgba(100,220,100,0.4)",
                    borderRadius: "50%", width: 40, height: 40, cursor: "pointer", fontSize: 18,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: isSpeaking ? "0 0 0 4px rgba(255,180,50,0.2)" : "none",
                    transition: "all 0.2s", flexShrink: 0,
                  }}
                >
                  {isSpeaking ? "⏹" : "🔊"}
                </button>
              )}
            </div>

            {/* Report content */}
            <div style={{ color: "#d0f0d8", lineHeight: 1.9, fontSize: 14, whiteSpace: "pre-wrap", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 16 }}>
              {showEnglish
                ? (result.en || "English translation not available.")
                : (result.bn || result.en || "No response.")}
            </div>

            {/* Disclaimer */}
            <div style={{ marginTop: 16, padding: "10px 14px", background: "rgba(255,200,50,0.1)", border: "1px solid rgba(255,200,50,0.3)", borderRadius: 10, color: "#ffe08a", fontSize: 12 }}>
              {showEnglish
                ? "⚠️ This report is for preliminary guidance only. Consult your local DAE officer for final decisions."
                : "⚠️ এই রিপোর্টটি প্রাথমিক গাইডেন্সের জন্য। চূড়ান্ত সিদ্ধান্তের জন্য স্থানীয় কৃষি কর্মকর্তার (DAE) পরামর্শ নিন।"}
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 16, color: "rgba(255,255,255,0.3)", fontSize: 11 }}>
          Powered by CABI Plantwise · BRRI · BARI · DAE Bangladesh · Open-Meteo Weather
        </div>
      </div>
    </div>
  );
}

// ─── Pulse animation injected into DOM ───────────────────────────────────────
const PULSE_STYLE = `
@keyframes pulse {
  0%,100% { opacity:1; }
  50% { opacity:0.3; }
}
`;
if (typeof document !== "undefined" && !document.getElementById("cabi-voice-style")) {
  const s = document.createElement("style");
  s.id = "cabi-voice-style";
  s.textContent = PULSE_STYLE;
  document.head.appendChild(s);
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const labelStyle = { display: "block", color: "#9fe8a8", fontSize: 13, fontWeight: 600, marginBottom: 6 };
const selectStyle = { width: "100%", background: "rgba(0,20,0,0.5)", border: "1px solid rgba(100,200,100,0.3)", borderRadius: 10, color: "#d0f0d8", padding: "10px 12px", fontSize: 13, outline: "none" };
const inputStyle = { width: "100%", background: "rgba(0,20,0,0.5)", border: "1px solid rgba(100,200,100,0.3)", borderRadius: 10, color: "#d0f0d8", padding: "10px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" };
const groupBtnStyle = { width: "100%", border: "1px solid rgba(100,200,100,0.25)", borderRadius: 9, color: "#b0e8b8", padding: "8px 10px", cursor: "pointer", fontSize: 11, textAlign: "left", transition: "background 0.15s" };
