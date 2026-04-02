import { useState, useRef, useEffect, useCallback } from "react";
import { diagnoseOffline } from "./offline/index";
import SymptomSpotter from "./games/SymptomSpotter";
import CauseDetective from "./games/CauseDetective";
import DiseaseTriangle from "./games/DiseaseTriangle";
import FieldScout from "./games/FieldScout";
import IPMCommander from "./games/IPMCommander";
import useTTS from "./games/useTTS";

// ─── Global styles ────────────────────────────────────────────────────────────
const GLOBAL_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap');
  :root {
    --c-primary: #006028;
    --c-primary-light: #1a7a3a;
    --c-primary-dark: #005322;
    --c-primary-x-dark: #002109;
    --c-accent: #f59e0b;
    --c-accent-light: #fbbf24;
    --c-accent-dark: #d97706;
    --c-bg: #f5fbf6;
    --c-bg-card: #ffffff;
    --c-bg-muted: #eff5f0;
    --c-text: #171d1a;
    --c-text-muted: #3f493f;
    --c-text-light: #6f7a6e;
    --c-border: #becabc;
    --c-border-focus: #1a7a3a;
    --c-success: #16a34a;
    --c-warning: #d97706;
    --c-danger: #dc2626;
    --c-blue: #2563eb;
    --c-shadow: 0 8px 24px rgba(0,33,9,0.08);
    --c-shadow-md: 0 16px 40px rgba(0,33,9,0.10);
    --c-shadow-lg: 0 22px 60px rgba(0,33,9,0.14);
    --c-scrollbar: #2d9d52;
    --c-font-sans: 'Inter', 'Noto Sans Bengali', sans-serif;
    --c-font-headline: 'Plus Jakarta Sans', 'Noto Sans Bengali', sans-serif;
    --c-radius-sm: 8px;
    --c-radius-md: 14px;
    --c-radius-lg: 20px;
    --c-radius-xl: 28px;
    --c-transition: all 0.2s ease;
    --c-glow-color: rgba(26,122,58,0.3);
    --c-glow-color-strong: rgba(26,122,58,0.6);
  }
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{font-family:var(--c-font-sans);background:var(--c-bg);color:var(--c-text);overflow-x:hidden;-webkit-tap-highlight-color:transparent}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
  @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
  @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
  @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
  @keyframes popIn{0%{transform:scale(.85);opacity:0}70%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}
  @keyframes glow{0%,100%{box-shadow:0 0 8px var(--c-glow-color)}50%{box-shadow:0 0 20px var(--c-glow-color-strong)}}
  @keyframes scan{0%{transform:translateY(-120px)}100%{transform:translateY(260px)}}
  ::-webkit-scrollbar{width:3px;height:3px}
  ::-webkit-scrollbar-thumb{background:var(--c-scrollbar);border-radius:4px}
  input,select,textarea,button{font-family:inherit}
  button:active{transform:scale(0.97)}
  .ud-headline{font-family:var(--c-font-headline)}
  .ud-editorial-shadow{box-shadow:var(--c-shadow-md)}
`;
/* Reduced header/footer heights for better game visibility */
const REDUCED_HEADER_HEIGHT = `60px`;
const REDUCED_FOOTER_HEIGHT = `35px`;
if(typeof document!=="undefined"&&!document.getElementById("ud-gs")){
  const s=document.createElement("style");s.id="ud-gs";s.textContent=GLOBAL_STYLE;document.head.appendChild(s);
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const C={
  primary:"#006028", primaryLight:"#1a7a3a", primaryDark:"#005322", primaryXDark:"#002109",
  accent:"#f59e0b", accentLight:"#fbbf24", accentDark:"#d97706",
  bg:"#f5fbf6", bgCard:"#ffffff", bgMuted:"#eff5f0",
  text:"#171d1a", textMuted:"#3f493f", textLight:"#6f7a6e",
  border:"#becabc", borderFocus:"#1a7a3a",
  success:"#16a34a", warning:"#d97706", danger:"#dc2626", blue:"#2563eb",
  shadow:"0 8px 24px rgba(0,33,9,0.08)",
  shadowMd:"0 16px 40px rgba(0,33,9,0.10)",
  shadowLg:"0 22px 60px rgba(0,33,9,0.14)",
  // game colors
  game1:"#7c3aed", game2:"#0891b2", game3:"#ea580c",
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const QUICK_CROPS=[
  {id:"rice",label:"ধান",en:"Rice",emoji:"🌾",color:"#f59e0b"},
  {id:"potato",label:"আলু",en:"Potato",emoji:"🥔",color:"#92400e"},
  {id:"tomato",label:"টমেটো",en:"Tomato",emoji:"🍅",color:"#dc2626"},
  {id:"brinjal",label:"বেগুন",en:"Brinjal",emoji:"🍆",color:"#7c3aed"},
  {id:"mustard",label:"সরিষা",en:"Mustard",emoji:"🌼",color:"#d97706"},
  {id:"jute",label:"পাট",en:"Jute",emoji:"🌿",color:"#16a34a"},
  {id:"mango",label:"আম",en:"Mango",emoji:"🥭",color:"#ea580c"},
  {id:"banana",label:"কলা",en:"Banana",emoji:"🍌",color:"#ca8a04"},
];
const CROPS={
  "ধান / Rice":["ধান (বোরো) / Rice - Boro","ধান (আমন) / Rice - Aman","ধান (আউশ) / Rice - Aus"],
  "গম ও শস্য / Cereals":["গম / Wheat","ভুট্টা / Maize","যব / Barley"],
  "ডাল / Pulses":["মসুর / Lentil","মুগ / Mungbean","মাষকলাই / Blackgram","সয়াবিন / Soybean","শিম / Lablab Bean","বরবটি / Yard-Long Bean"],
  "তেলবীজ / Oilseeds":["সরিষা / Mustard","তিল / Sesame","চিনাবাদাম / Groundnut","সূর্যমুখী / Sunflower"],
  "সবজি / Vegetables":["আলু / Potato","টমেটো / Tomato","বেগুন / Brinjal","মরিচ / Chilli","শিমলা মরিচ / Capsicum","লাউ / Bottle Gourd","কুমড়া / Pumpkin","তিত করলা / Bitter Gourd","ঢেঁড়স / Okra","পালং শাক / Spinach","মুলা / Radish","গাজর / Carrot","বাঁধাকপি / Cabbage","ফুলকপি / Cauliflower","পেঁয়াজ / Onion","রসুন / Garlic","আদা / Ginger","হলুদ / Turmeric"],
  "ফল / Fruits":["আম / Mango","কাঁঠাল / Jackfruit","কলা / Banana","পেঁপে / Papaya","আনারস / Pineapple","পেয়ারা / Guava","লিচু / Lychee","নারিকেল / Coconut","লেবু / Lemon","কমলা / Orange","ড্রাগন ফ্রুট / Dragon Fruit"],
  "আঁশ / Fiber":["পাট / Jute","তুলা / Cotton"],
  "মসলা / Spice":["আখ / Sugarcane","ধনিয়া / Coriander","কালোজিরা / Nigella","পান / Betel Leaf"],
};
const DISTRICTS=["ঢাকা / Dhaka","চট্টগ্রাম / Chattogram","রাজশাহী / Rajshahi","খুলনা / Khulna","বরিশাল / Barisal","সিলেট / Sylhet","রংপুর / Rangpur","ময়মনসিংহ / Mymensingh","কুমিল্লা / Cumilla","গাজীপুর / Gazipur","নারায়ণগঞ্জ / Narayanganj","টাঙ্গাইল / Tangail","কিশোরগঞ্জ / Kishoreganj","নেত্রকোণা / Netrokona","জামালপুর / Jamalpur","মৌলভীবাজার / Moulvibazar","হবিগঞ্জ / Habiganj","সুনামগঞ্জ / Sunamganj","চাঁপাইনবাবগঞ্জ / Chapainawabganj","নাটোর / Natore","নওগাঁ / Naogaon","বগুড়া / Bogura","পাবনা / Pabna","সিরাজগঞ্জ / Sirajganj","দিনাজপুর / Dinajpur","কুড়িগ্রাম / Kurigram","গাইবান্ধা / Gaibandha","নীলফামারী / Nilphamari","পঞ্চগড় / Panchagarh","বাগেরহাট / Bagerhat","সাতক্ষীরা / Satkhira","যশোর / Jashore","ঝিনাইদহ / Jhenaidah","কুষ্টিয়া / Kushtia","পটুয়াখালী / Patuakhali","বরগুনা / Barguna","ভোলা / Bhola","কক্সবাজার / Cox's Bazar","ফেনী / Feni","নোয়াখালী / Noakhali","ব্রাহ্মণবাড়িয়া / Brahmanbaria","বান্দরবান / Bandarban","রাঙামাটি / Rangamati","খাগড়াছড়ি / Khagrachhari"];
const SEASONS=["বোরো মৌসুম / Boro Season (Nov–May)","আমন মৌসুম / Aman Season (Jun–Nov)","আউশ মৌসুম / Aus Season (Mar–Aug)","রবি মৌসুম / Rabi Season (Oct–Mar)","খরিপ মৌসুম / Kharif Season (Apr–Sep)","সারা বছর / Year-round"];
const GROWTH_STAGES=["বীজ অঙ্কুরোদগম / Germination","চারা / Seedling","কুশি / Tillering","শাখা-প্রশাখা / Vegetative","ফুল ফোটা / Flowering","ফল ধারণ / Fruit Set","পরিপক্বতা / Maturity","ফসল কাটা / Harvesting"];
const SYMPTOM_CHIPS={
  "🍃 পাতা":[
    {label:"পাতা হলুদ",value:"পাতা হলুদ হয়ে যাচ্ছে"},
    {label:"বাদামি দাগ",value:"পাতায় বাদামি গোলাকার দাগ"},
    {label:"ধূসর দাগ (ব্লাস্ট)",value:"পাতায় ধূসর মাকু আকৃতির দাগ (ব্লাস্ট)"},
    {label:"পাতা পোড়া",value:"পাতার কিনারা পুড়ে যাওয়ার মতো বাদামি"},
    {label:"পাতা কুঁকড়ানো",value:"পাতা কুঁকড়িয়ে ও বাঁকিয়ে যাচ্ছে"},
    {label:"পাতা মোড়ানো",value:"পাতা লম্বালম্বিভাবে মোড়ানো (পাতামোড়া পোকা)"},
    {label:"পাতায় জাল",value:"পাতার নিচে সূক্ষ্ম জাল (মাইট)"},
  ],
  "🌿 কান্ড":[
    {label:"কান্ড পচা",value:"কান্ডের গোড়া পচে কালো বা বাদামি"},
    {label:"কান্ড ফাঁপা",value:"কান্ড টানলে সহজে উঠে আসে, ভেতর ফাঁকা"},
    {label:"শিকড় পচা",value:"শিকড় কালো ও পচা"},
  ],
  "🌸 ফল":[
    {label:"ফুল ঝরা",value:"ফুল অকালে ঝরে পড়ছে"},
    {label:"ফল পচা",value:"ফল পচে যাচ্ছে, কালো বা বাদামি দাগ"},
    {label:"শীষ চিটা",value:"ধানের শীষ চিটা, দানা পূর্ণ হচ্ছে না"},
    {label:"শীষ সাদা",value:"ধানের শীষ সম্পূর্ণ সাদা হয়ে গেছে"},
  ],
  "🐛 পোকা":[
    {label:"পোকা দেখা",value:"গাছে পোকা দেখা যাচ্ছে"},
    {label:"পাতায় ছিদ্র",value:"পাতায় ছিদ্র বা চিবানোর দাগ"},
    {label:"পিঁপড়া/মধুরস",value:"গাছে পিঁপড়া বা আঠালো মধুরস"},
  ],
  "💧 অন্যান্য":[
    {label:"গাছ নেতিয়ে",value:"গাছ দিনে নেতিয়ে পড়ে, রাতে সতেজ হয়"},
    {label:"গাছ মরছে",value:"গাছ হঠাৎ শুকিয়ে মারা যাচ্ছে"},
    {label:"সাদা গুঁড়া",value:"পাতায় সাদা গুঁড়া বা ছাতার মতো আবরণ"},
  ],
};
const AREA_CHIPS=[{label:"৫% এর কম",value:"৫% এর কম"},{label:"১০%",value:"প্রায় ১০%"},{label:"২৫%",value:"প্রায় ২৫%"},{label:"৫০%",value:"প্রায় ৫০%"},{label:"৭৫%+",value:"৭৫% এরও বেশি"},{label:"বিক্ষিপ্ত",value:"বিক্ষিপ্তভাবে ছড়িয়ে"},{label:"সমস্ত মাঠ",value:"সমস্ত মাঠ"}];
const DURATION_CHIPS=[{label:"আজই",value:"আজই শুরু"},{label:"১-২ দিন",value:"১-২ দিন আগে"},{label:"৩-৫ দিন",value:"৩-৫ দিন ধরে"},{label:"১ সপ্তাহ",value:"প্রায় ১ সপ্তাহ"},{label:"২ সপ্তাহ",value:"প্রায় ২ সপ্তাহ"},{label:"১ মাস+",value:"১ মাসেরও বেশি"}];
const OTHER_APPS=[
  {name:"Krishi AI Web",url:"https://web.krishiai.live/",icon:"🌐",desc:"Browser-friendly agriculture support portal"},
  {name:"Krishi AI App",url:"https://app.krishiai.live/",icon:"📱",desc:"Mobile-first support app for farmers"},
  {name:"GAP Brinjal",url:"https://gap-brinjal-krishi-ai-team.vercel.app/",icon:"🍆",desc:"Safe brinjal cultivation and GAP guidance"},
  {name:"CIRDAP GreenLoop",url:"https://cirdap-greenloop3-0.vercel.app/",icon:"♻️",desc:"Climate and circular agriculture tools"},
];
const LIBRARY_MEDIA={
  videoUrl:"https://drive.google.com/file/d/1k8A7PSsVHiuPUY5i22wnlktyJESxMpBs/preview",
  slides:[
    {title:"স্লাইড ১",id:"1TFMKiKOiQMneoZEn3PYN59JVXJspcz2X"},
    {title:"স্লাইড ২",id:"1ivvMxoVUCM1k9rl8bXpiZ7rLYg8RdMup"},
    {title:"স্লাইড ৩",id:"1yKnsuo2_6Gdv8Zkm53WnmngQiqZUKGv0"},
    {title:"স্লাইড ৪",id:"1Kit5SuPbmNIGail6HSQscRJSVoxPiF3u"},
  ],
  readings:[
    {title:"CABI Guide",id:"1yw4JPZXY06FyEQ4b8O_TxPGLes9Kn_-v"},
    {title:"IPM Manual",id:"1MOGzZhfxYCmC0vOpygpYL-zKttCVanSa"},
  ],
  audio:[
    {title:"পডকাস্ট ১",id:"1JDrGis-p0aOs1ROrgkSIrqr9m82xdj0A"},
    {title:"পডকাস্ট ২",id:"1teuRIiuPmKYQmpFmRTzuX105JHrgOfvH"},
  ],
};
const CROP_DETECT_SYSTEM_PROMPT=`You identify the crop shown in a Bangladesh farm photo.
Reply with one compact JSON object only.
Schema: {"crop":"<best match from common Bangladesh crops or Unknown>","confidence":"high|medium|low","reason":"<very short>"}
Prefer one of: Rice, Potato, Tomato, Brinjal, Mustard, Jute, Mango, Banana, Wheat, Maize, Chilli, Onion, Garlic, Cabbage, Cauliflower, Okra, Pumpkin, Papaya, Guava.
Do not include markdown, prose, or extra keys.`;
const FRIENDLY_SECTION_LABELS={
  "CABI Exclusion Analysis":"কি দেখে বোঝা গেল",
  "Probable Diagnosis":"সবচেয়ে সম্ভবত যে সমস্যা",
  "Disease Triangle Assessment":"কেন এই সমস্যা বাড়ছে",
  "Field Confirmation Method":"মাঠে কী দেখে মিলিয়ে নেবেন",
  "Severity & Economic Importance":"ক্ষতির মাত্রা",
  "IPM Recommendations":"কি করবেন এখন",
  "Prevention":"পরের বার কীভাবে ঠেকাবেন",
  "When to Consult DAE":"কখন কৃষি অফিসে বলবেন",
};

function getCurrentSeason(){
  const month=new Date().getMonth()+1;
  if(month>=10||month<=3)return "রবি মৌসুম / Rabi Season (Oct–Mar)";
  return "খরিপ মৌসুম / Kharif Season (Apr–Sep)";
}
function findDistrictMatch(...values){
  const checks=values.flat().filter(Boolean).map(v=>String(v).toLowerCase());
  for(const district of DISTRICTS){
    const bn=district.split("/")[0].trim().toLowerCase();
    const en=(district.split("/")[1]||district).trim().toLowerCase();
    if(checks.some(v=>v.includes(bn)||v.includes(en)||bn.includes(v)||en.includes(v)))return district;
  }
  return "";
}
function extractDriveId(url){
  if(!url)return "";
  const match=String(url).match(/\/d\/([^/]+)/);
  return match?.[1]||url;
}
function toDrivePreviewUrl(id){return `https://drive.google.com/file/d/${extractDriveId(id)}/preview`;}
function toDriveDownloadUrl(id){return `https://drive.google.com/uc?export=download&id=${extractDriveId(id)}`;}
function toDriveViewUrl(id){return `https://drive.google.com/file/d/${extractDriveId(id)}/view`;}
function simplifyFarmerText(text){
  if(!text)return "";
  return text
    .replace(/Abiotic vs Biotic/gi,"সমস্যার উৎস")
    .replace(/Abiotic/gi,"পরিবেশ/খাবারের ঘাটতিজনিত")
    .replace(/Biotic/gi,"পোকা/রোগজীবাণুজনিত")
    .replace(/Exclusion/gi,"কি কি বাদ গেল")
    .replace(/Host/gi,"গাছের অবস্থা")
    .replace(/Pathogen/gi,"রোগ/পোকার চাপ")
    .replace(/Environment/gi,"আবহাওয়া ও মাঠের অবস্থা")
    .replace(/Confidence level/gi,"কতটা নিশ্চিত")
    .replace(/High/gi,"উচ্চ")
    .replace(/Medium/gi,"মাঝারি")
    .replace(/Low/gi,"কম");
}
function guessCropFromText(text){
  const source=(text||"").toLowerCase();
  const known=[
    "Rice / ধান","Potato / আলু","Tomato / টমেটো","Brinjal / বেগুন","Mustard / সরিষা","Jute / পাট","Mango / আম","Banana / কলা",
    "Wheat / গম","Maize / ভুট্টা","Chilli / মরিচ","Onion / পেঁয়াজ","Garlic / রসুন","Cabbage / বাঁধাকপি","Cauliflower / ফুলকপি","Okra / ঢেঁড়স","Pumpkin / কুমড়া","Papaya / পেঁপে","Guava / পেয়ারা"
  ];
  const fromData=[...QUICK_CROPS.map(c=>`${c.en} / ${c.label}`),...Object.values(CROPS).flat()];
  for(const crop of [...new Set([...known,...fromData])]){
    const parts=crop.split("/").map(p=>p.trim().toLowerCase()).filter(Boolean);
    if(parts.some(part=>part.length>1&&source.includes(part)))return crop;
  }
  return "";
}
function getFriendlySectionTitle(title){
  return FRIENDLY_SECTION_LABELS[title]||title;
}
function extractResultHighlights(text){
  const body=simplifyFarmerText(text||"");
  const find=(patterns)=>{
    for(const pattern of patterns){
      const match=body.match(pattern);
      if(match?.[1])return match[1].trim();
    }
    return "";
  };
  return [
    {icon:"🧾",label:"সমস্যা",value:find([/\*\*প্রাথমিক সন্দেহ:\*\*\s*([^\n]+)/,/\*\*Primary suspect:\*\*\s*([^\n]+)/])},
    {icon:"📍",label:"ধরন",value:find([/\*\*অ্যাবায়োটিক নাকি বায়োটিক:\*\*\s*([^\n]+)/,/\*\*Abiotic vs Biotic:\*\*\s*([^\n]+)/])},
    {icon:"📊",label:"নিশ্চয়তা",value:find([/\*\*আস্থার মাত্রা:\*\*\s*([^\n]+)/,/\*\*Confidence level:\*\*\s*([^\n]+)/])},
    {icon:"⚠️",label:"ক্ষতি",value:find([/\*\*ক্ষয়ক্ষতির মাত্রা:\*\*\s*([^\n]+)/,/\*\*Damage level:\*\*\s*([^\n]+)/])},
  ].filter(item=>item.value);
}
function formatTime(seconds){
  if(!Number.isFinite(seconds))return "00:00";
  const mm=Math.floor(seconds/60).toString().padStart(2,"0");
  const ss=Math.floor(seconds%60).toString().padStart(2,"0");
  return `${mm}:${ss}`;
}
function buildFeedbackMessage({context,rating,feedback,email,summary,visits}){
  return [
    `App Section: ${context}`,
    `Rating: ${rating||"Not given"}/5`,
    `Feedback or Request: ${feedback||"Not written"}`,
    `Contact Email: ${email||"Not provided"}`,
    `Summary: ${summary||"N/A"}`,
    `Visitor Count (this browser): ${visits||1}`,
  ].join("\n");
}
async function postJson(url, payload){
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json().catch(() => ({}));
}

// ─── CABI Guide data ──────────────────────────────────────────────────────────
const CABI_GUIDE={
  protocol:{
    title:"CABI Plantwise রোগ নির্ণয় প্রোটোকল",subtitle:"5-Step Diagnostic Framework",
    steps:[
      {num:"১",icon:"👁️",title:"লক্ষণ পর্যবেক্ষণ",en:"Observe Symptoms",color:"#2563eb",bg:"#eff6ff",border:"#bfdbfe",desc:"ফসলের পাতা, কান্ড, ফুল ও ফলে বাহ্যিক লক্ষণ পর্যবেক্ষণ করুন।",points:["পাতার উপরে ও নিচে পরীক্ষা করুন","দাগের আকার, রং ও সীমানা লক্ষ্য করুন","পোকার উপস্থিতি বা মলের চিহ্ন খুঁজুন","আক্রান্ত গাছের বয়স নির্ধারণ করুন","সুস্থ গাছের সাথে তুলনা করুন"]},
      {num:"২",icon:"🔬",title:"CABI বর্জন পদ্ধতি",en:"CABI Exclusion",color:"#7c3aed",bg:"#faf5ff",border:"#e9d5ff",desc:"সম্ভাব্য কারণগুলো একে একে বাদ দিন।",points:["অপুষ্টি: N হলে পুরনো পাতা, Fe হলে নতুন পাতা হলুদ","পোকা: ছিদ্র, কামড়ের দাগ, পোকা বা ডিম দেখুন","ছত্রাক: দাগের গঠন, স্পোর লক্ষ্য করুন","ব্যাকটেরিয়া: পানিভেজা দাগ, দুর্গন্ধ","ভাইরাস: মোজেইক, বিকৃতি, বামনতা"]},
      {num:"৩",icon:"🔺",title:"রোগ ত্রিভুজ",en:"Disease Triangle",color:"#d97706",bg:"#fffbeb",border:"#fcd34d",desc:"রোগের জন্য তিনটি উপাদান একসাথে থাকতে হয়।",points:["পোষক: ফসলের প্রতিরোধ ক্ষমতা কম","রোগজীবাণু: ছত্রাক/ব্যাকটেরিয়া/ভাইরাস","পরিবেশ: তাপমাত্রা, আর্দ্রতা, বৃষ্টি","সময়: তিনটি একসাথে থাকলেই রোগ","যেকোনো একটি বদলালে নিয়ন্ত্রণ সম্ভব"]},
      {num:"৪",icon:"🧪",title:"মাঠ নিশ্চিতকরণ",en:"Field Confirmation",color:"#16a34a",bg:"#f0fdf4",border:"#bbf7d0",desc:"নমুনা সংগ্রহের মাধ্যমে প্রাথমিক নির্ণয় নিশ্চিত করুন।",points:["W-pattern-এ ১০টি স্থান থেকে নমুনা নিন","আক্রান্তের হার (%) গণনা করুন","ETL-এর সাথে তুলনা করুন","৩-৫ দিন রোগের অগ্রগতি দেখুন","DAE ল্যাবে নমুনা পাঠান প্রয়োজনে"]},
      {num:"৫",icon:"🌿",title:"IPM সিদ্ধান্ত",en:"IPM Decision",color:"#0891b2",bg:"#ecfeff",border:"#a5f3fc",desc:"IPM পিরামিড: প্রতিরোধ → সাংস্কৃতিক → জৈব → রাসায়নিক।",points:["প্রতিরোধী জাত ব্যবহার করুন","সুষম সার, সেচ, পরিষ্কার মাঠ","জৈব: ট্রাইকোকার্ড, নিম তেল","ETL অতিক্রমে সঠিক কীটনাশক","FRAC/IRAC রোটেশন মেনে চলুন"]},
    ]
  },
  etl:[
    {pest:"ধানের মাজরা পোকা",en:"Rice Stem Borer",etl:"২০% মরা ডিল বা ১০% সাদা শীষ",stage:"কুশি থেকে গর্ভাবস্থা",monitor:"১০ স্থান × ১০ গাছ"},
    {pest:"বাদামি গাছফড়িং",en:"Brown Planthopper",etl:"প্রতি গাছে ১০-১৫টি পোকা",stage:"সব পর্যায়",monitor:"২০ গাছ/বিঘা"},
    {pest:"পাতামোড়া পোকা",en:"Rice Leaf Folder",etl:"৫০% মোড়ানো পাতা",stage:"শাখা-প্রশাখা",monitor:"ক্ষেতের মাঝে ও কিনারে"},
    {pest:"জাব পোকা",en:"Aphid (Mustard)",etl:"৫০টির বেশি পোকা/গাছ",stage:"ফুল থেকে শুঁটি",monitor:"১০ গাছের উপরের ৩ পাতা"},
    {pest:"ধানের ব্লাস্ট",en:"Rice Blast",etl:"পাতা: ২%; ঘাড়: যেকোনো দাগ",stage:"কুশি ও ফুল",monitor:"আবহাওয়া + মাঠ পরিদর্শন"},
    {pest:"টমেটো আর্লি ব্লাইট",en:"Early Blight",etl:"১ম দাগ দেখলেই ব্যবস্থা",stage:"সব পর্যায়",monitor:"সাপ্তাহিক পরিদর্শন"},
    {pest:"আলু লেট ব্লাইট",en:"Late Blight",etl:"যেকোনো দাগ দেখলেই ব্যবস্থা",stage:"সব পর্যায়",monitor:"৩ দিনে একবার"},
    {pest:"ডায়মন্ড ব্যাক মথ",en:"Diamond Back Moth",etl:"৫টি লার্ভা/গাছ",stage:"সব পর্যায়",monitor:"১০ গাছ, সপ্তাহে ২বার"},
  ],
  nutrients:[
    {name:"নাইট্রোজেন (N)",en:"Nitrogen",color:"#f59e0b",deficiency:"নিচের পাতা হলুদ, বৃদ্ধি কম",excess:"গাঢ় সবুজ, দেরিতে পাকা, রোগে সংবেদনশীল",fix:"ইউরিয়া ১০-১৫ কেজি/বিঘা ভাগে ভাগে",crops:["ধান","গম","ভুট্টা","সব সবজি"]},
    {name:"ফসফরাস (P)",en:"Phosphorus",color:"#8b5cf6",deficiency:"পুরনো পাতায় বেগুনি-লাল, শিকড় কম",excess:"Zn ও Fe অভাব ঘটায়",fix:"TSP বা DAP বীজ বোনার সময়ে",crops:["ধান","আলু","ডাল ফসল"]},
    {name:"পটাশিয়াম (K)",en:"Potassium",color:"#ef4444",deficiency:"পুরনো পাতার কিনারা পোড়া, ফল ছোট",excess:"Mg ও Ca শোষণ বাধা",fix:"MoP বা পটাশিয়াম সালফেট",crops:["আলু","কলা","টমেটো","ধান"]},
    {name:"জিংক (Zn)",en:"Zinc",color:"#0891b2",deficiency:"বাদামি মরচে দাগ, খইরা রোগ, বৃদ্ধি থমকে",excess:"বিরল",fix:"জিংক সালফেট ৪-৫ কেজি/বিঘা",crops:["ধান","গম","সবজি"]},
    {name:"আয়রন (Fe)",en:"Iron",color:"#f97316",deficiency:"নতুন পাতা হলুদ, শিরা সবুজ",excess:"পুরনো পাতায় বাদামি দাগ",fix:"ফেরাস সালফেট ০.৫% স্প্রে",crops:["ধান","সবজি","চিনাবাদাম"]},
    {name:"বোরন (B)",en:"Boron",color:"#ec4899",deficiency:"ফুল ঝরা, ফল বিকৃত, কাণ্ডমাথা মরে",excess:"পাতার কিনারা পোড়া",fix:"বোরেক্স ০.২% ফুলের আগে স্প্রে",crops:["সরিষা","সূর্যমুখী","সবজি"]},
  ],
  ipm_pyramid:[
    {level:1,label:"প্রতিরোধ",color:"#16a34a",items:["প্রতিরোধী জাত","সুস্থ বীজ","ফসল আবর্তন","সুষম সার","রোগমুক্ত চারা"]},
    {level:2,label:"সাংস্কৃতিক",color:"#2563eb",items:["সঠিক সময়ে বপন","সঠিক দূরত্ব","পরিষ্কার মাঠ","সুষম সেচ","আক্রান্ত গাছ সরানো"]},
    {level:3,label:"জৈব/ভৌত",color:"#7c3aed",items:["ট্রাইকোগ্রামা কার্ড","হলুদ/আলোক ফাঁদ","বিউভেরিয়া","নিম তেল স্প্রে","প্রাকৃতিক শত্রু"]},
    {level:4,label:"রাসায়নিক (শেষ উপায়)",color:"#dc2626",items:["ETL অতিক্রমে","সঠিক মাত্রা","FRAC/IRAC রোটেশন","PPE পরিধান","PHI মেনে চলুন"]},
  ],
};

// ─── Library data ─────────────────────────────────────────────────────────────
const LIBRARY={
  pests:[
    {name:"ধানের মাজরা পোকা",en:"Rice Stem Borer",icon:"🐛",crops:["ধান"],symptoms:"মরা ডিল, সাদা শীষ, কান্ড কাটা",ipm:"ট্রাইকোকার্ড, আলোক ফাঁদ, পরজীবী পোকা",etl:"২০% মরা ডিল"},
    {name:"বাদামি গাছফড়িং",en:"Brown Planthopper",icon:"🟤",crops:["ধান"],symptoms:"হপার বার্ন, গাছের গোড়ায় বাদামি পোকা",ipm:"ইমিডাক্লোপ্রিড, পাইমেট্রোজিন, প্রাকৃতিক শত্রু",etl:"প্রতি গাছে ১০-১৫টি"},
    {name:"জাব পোকা / এফিড",en:"Aphid",icon:"🟢",crops:["সরিষা","সবজি"],symptoms:"পাতা কুঁকড়ানো, মধুরস, পিঁপড়া",ipm:"হলুদ ট্র্যাপ, নিম তেল, প্রাকৃতিক শত্রু",etl:"৫০টি পোকা/গাছ"},
    {name:"সবজির থ্রিপস",en:"Thrips",icon:"🔸",crops:["বেগুন","মরিচ"],symptoms:"পাতায় রুপালি দাগ, পাতা কুঁকড়ানো",ipm:"নীল ট্র্যাপ, স্পিনোসাড, নিম তেল",etl:"প্রতি পাতায় ১০টি"},
    {name:"ডায়মন্ড ব্যাক মথ",en:"Diamond Back Moth",icon:"🦋",crops:["বাঁধাকপি","ফুলকপি"],symptoms:"পাতায় অনিয়মিত ছিদ্র, লার্ভা",ipm:"Bt স্প্রে, ইমামেকটিন, ফেরোমন ট্র্যাপ",etl:"৫টি লার্ভা/গাছ"},
    {name:"লাল মাকড়সা মাইট",en:"Red Spider Mite",icon:"🔴",crops:["বেগুন","মরিচ"],symptoms:"পাতায় সূক্ষ্ম জাল, হলুদ ও ঝরা",ipm:"আবামেকটিন, সালফার, পানি স্প্রে",etl:"১০টি মাইট/পাতা"},
  ],
  diseases:[
    {name:"ধানের ব্লাস্ট",en:"Rice Blast",icon:"💥",crops:["ধান"],symptoms:"মাকু আকৃতির ধূসর দাগ, ঘাড় ব্লাস্ট",ipm:"ট্রাইসাইক্লাজোল, প্রতিরোধী জাত",etl:"২% পাতা আক্রান্ত"},
    {name:"শিথ ব্লাইট",en:"Sheath Blight",icon:"🍂",crops:["ধান"],symptoms:"কান্ডে ডিম্বাকৃতি ধূসর দাগ",ipm:"হেক্সাকোনাজোল, ভ্যালিডামাইসিন",etl:"৫% আক্রমণ"},
    {name:"ব্যাকটেরিয়াল লিফ ব্লাইট",en:"Bacterial Leaf Blight",icon:"🌊",crops:["ধান"],symptoms:"পাতার কিনারা হলুদ-বাদামি",ipm:"কপার অক্সিক্লোরাইড, BLB-প্রতিরোধী জাত",etl:"১০% পাতা আক্রান্ত"},
    {name:"টমেটো আর্লি ব্লাইট",en:"Early Blight",icon:"🍅",crops:["টমেটো","আলু"],symptoms:"কালো বৃত্তাকার দাগ, হলুদ বলয়",ipm:"ম্যানকোজেব, ক্লোরোথ্যালোনিল",etl:"১ম দাগ দেখলেই"},
    {name:"আলু লেট ব্লাইট",en:"Late Blight",icon:"🥔",crops:["আলু","টমেটো"],symptoms:"পানিভেজা দাগ দ্রুত কালো হয়",ipm:"মেটালাক্সিল+মানকোজেব",etl:"যেকোনো দাগ দেখলেই"},
    {name:"পাউডারি মিলডিউ",en:"Powdery Mildew",icon:"⚪",crops:["শসা","টমেটো"],symptoms:"পাতায় সাদা গুঁড়া আবরণ",ipm:"সালফার, পটাশিয়াম বাইকার্বোনেট",etl:"১% পাতা আক্রান্ত"},
  ],
  deficiencies:[
    {name:"নাইট্রোজেন অভাব",en:"Nitrogen Deficiency",icon:"🟡",crops:["সব ফসল"],symptoms:"নিচের পাতা হলুদ, বৃদ্ধি কম",fix:"ইউরিয়া ১০-১৫ কেজি/বিঘা",etl:"সার্বক্ষণিক"},
    {name:"জিংক অভাব (খইরা রোগ)",en:"Zinc Deficiency",icon:"🔵",crops:["ধান"],symptoms:"বাদামি মরচে দাগ, বৃদ্ধি থমকে",fix:"জিংক সালফেট ৪ কেজি/বিঘা",etl:"লক্ষণ দেখলেই"},
    {name:"আয়রন অভাব",en:"Iron Deficiency",icon:"🟠",crops:["ধান","সবজি"],symptoms:"নতুন পাতা হলুদ, শিরা সবুজ",fix:"ফেরাস সালফেট ০.৫% স্প্রে",etl:"লক্ষণ দেখলেই"},
    {name:"পটাশিয়াম অভাব",en:"Potassium Deficiency",icon:"🟤",crops:["আলু","কলা"],symptoms:"পাতার কিনারা পোড়া বাদামি",fix:"MoP সার প্রয়োগ",etl:"লক্ষণ দেখলেই"},
  ],
};

// ─── Weather helpers ──────────────────────────────────────────────────────────
function assessWeatherRisks(w){
  const r=[];if(!w)return r;
  if(w.humidity>=80&&w.temp>=26&&w.temp<=36)r.push({level:"high",icon:"🔴",text:"Blast ও Sheath Blight ঝুঁকি বেশি"});
  if(w.rain24h>=50)r.push({level:"high",icon:"🔴",text:"মাজরা পোকা ও শিকড় পচা ঝুঁকি বেশি"});
  if(w.rain24h===0&&w.humidity<55)r.push({level:"medium",icon:"🟡",text:"মাইট ও থ্রিপস ঝুঁকি (শুষ্ক)"});
  if(w.temp<20)r.push({level:"medium",icon:"🟡",text:"টুংরো ভাইরাস ঝুঁকি (ঠান্ডা)"});
  if(w.humidity>=85)r.push({level:"high",icon:"🔴",text:"BLB ব্যাকটেরিয়াল ব্লাইট ঝুঁকি বেশি"});
  if(r.length===0)r.push({level:"low",icon:"🟢",text:"আবহাওয়া স্বাভাবিক — চাপ কম"});
  return r;
}
function getSprayingCondition(w){
  if(!w)return null;
  if(w.windSpeed>20)return{ok:false,reason:`বাতাসের গতি বেশি (${w.windSpeed}km/h)`,until:"বাতাস কমলে"};
  if(w.rain24h>5)return{ok:false,reason:"বৃষ্টির সম্ভাবনা",until:"বৃষ্টি থামলে"};
  if(w.temp>38)return{ok:false,reason:"তাপমাত্রা অতিরিক্ত",until:"বিকালে"};
  if(w.uvIndex>8)return{ok:false,reason:"UV বেশি",until:"সন্ধ্যায়"};
  return{ok:true,reason:"স্প্রে করার উপযুক্ত সময়",until:null};
}
function weatherPromptText(w,loc){
  if(!w)return"";
  return`REAL-TIME WEATHER:\nLocation:${loc||"Bangladesh"}\nTemp:${w.temp}°C | Humidity:${w.humidity}% | Rain24h:${w.rain24h}mm | Wind:${w.windSpeed}km/h | UV:${w.uvIndex}\nRisks:${assessWeatherRisks(w).map(x=>x.text).join("; ")}\nFactor this into diagnosis.`;
}

// ─── Markdown renderer ────────────────────────────────────────────────────────
function renderTokens(text){
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).map((p,i)=>{
    if(p.startsWith("**")&&p.endsWith("**"))return<strong key={i} style={{color:C.primaryDark}}>{p.slice(2,-2)}</strong>;
    if(p.startsWith("*")&&p.endsWith("*"))return<em key={i} style={{color:C.warning}}>{p.slice(1,-1)}</em>;
    if(p.startsWith("`")&&p.endsWith("`"))return<code key={i} style={{background:"#f0fdf4",borderRadius:4,padding:"1px 6px",fontSize:12,color:C.primary}}>{p.slice(1,-1)}</code>;
    return p;
  });
}
function renderInline(text){
  return text.split("\n").map((line,li)=>{
    if(/^#{1,4}\s/.test(line)){const t=line.replace(/^#{1,4}\s/,"");return<div key={li} style={{fontWeight:700,color:C.primaryDark,fontSize:14,marginTop:10,marginBottom:4}}>{renderTokens(t)}</div>;}
    if(/^[-•*]\s/.test(line))return<div key={li} style={{display:"flex",gap:8,marginTop:4}}><span style={{color:C.primary,flexShrink:0}}>▸</span><span>{renderTokens(line.replace(/^[-•*]\s/,""))}</span></div>;
    if(line.trim()==="")return<div key={li} style={{height:8}}/>;
    return<div key={li} style={{marginTop:3}}>{renderTokens(line)}</div>;
  });
}
function parseIntoSections(text){
  if(!text)return[];
  const lines=text.split("\n"),sections=[];let current=null;
  for(const line of lines){const h=line.match(/^#{1,2}\s+(.+)/);if(h){if(current)sections.push(current);current={title:h[1].replace(/^\d+\.\s*/,""),body:[]};}else if(current)current.body.push(line);}
  if(current)sections.push(current);
  if(sections.length===0)return[{title:null,body:text.split("\n")}];
  return sections;
}
const SECTION_META={
  "সম্ভাব্য":{icon:"🦠",color:C.danger,bg:"#fef2f2",border:"#fecaca"},
  "Diagnosis":{icon:"🦠",color:C.danger,bg:"#fef2f2",border:"#fecaca"},
  "CABI":{icon:"🔬",color:C.blue,bg:"#eff6ff",border:"#bfdbfe"},
  "Exclusion":{icon:"🔬",color:C.blue,bg:"#eff6ff",border:"#bfdbfe"},
  "IPM":{icon:"🌿",color:C.success,bg:"#f0fdf4",border:"#bbf7d0"},
  "সমন্বিত":{icon:"🌿",color:C.success,bg:"#f0fdf4",border:"#bbf7d0"},
  "তীব্রতা":{icon:"📊",color:C.warning,bg:"#fffbeb",border:"#fed7aa"},
  "Severity":{icon:"📊",color:C.warning,bg:"#fffbeb",border:"#fed7aa"},
  "প্রতিরোধ":{icon:"🛡️",color:"#7c3aed",bg:"#faf5ff",border:"#e9d5ff"},
  "Prevention":{icon:"🛡️",color:"#7c3aed",bg:"#faf5ff",border:"#e9d5ff"},
  "DAE":{icon:"📞",color:"#0891b2",bg:"#ecfeff",border:"#a5f3fc"},
  "Consult":{icon:"📞",color:"#0891b2",bg:"#ecfeff",border:"#a5f3fc"},
  "মাঠে":{icon:"🧪",color:"#065f46",bg:"#ecfdf5",border:"#a7f3d0"},
  "Field":{icon:"🧪",color:"#065f46",bg:"#ecfdf5",border:"#a7f3d0"},
};
function getMeta(t){for(const[k,v]of Object.entries(SECTION_META))if((t||"").includes(k))return v;return{icon:"📄",color:C.text,bg:C.bgMuted,border:C.border};}
function SectionCard({title,bodyLines,defaultOpen}){
  const[open,setOpen]=useState(defaultOpen!==false);
  const meta=getMeta(title);
  const bodyText=simplifyFarmerText(bodyLines.join("\n").trim());
  if(!bodyText&&!title)return null;
  return(
    <div style={{borderRadius:14,border:`1px solid ${meta.border}`,marginBottom:10,overflow:"hidden",animation:"fadeIn .3s ease"}}>
      {title&&<button onClick={()=>setOpen(o=>!o)} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"12px 16px",background:meta.bg,border:"none",cursor:"pointer",textAlign:"left"}}>
        <span style={{fontSize:19}}>{meta.icon}</span>
        <span style={{color:meta.color,fontWeight:700,fontSize:14,flex:1}}>{getFriendlySectionTitle(title)}</span>
        <span style={{color:meta.color,fontSize:13,opacity:.7}}>{open?"▲":"▼"}</span>
      </button>}
      {open&&<div style={{padding:"14px 18px",background:"#fff",color:C.text,fontSize:13.5,lineHeight:1.85}}>{renderInline(bodyText)}</div>}
    </div>
  );
}
function InfoRow({icon,label,val}){
  if(!val)return null;
  return(
    <div style={{display:"flex",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
      <span style={{fontSize:16,flexShrink:0,marginTop:1}}>{icon}</span>
      <div style={{flex:1}}>
        <div style={{fontSize:10,color:C.textMuted,fontWeight:600,textTransform:"uppercase",letterSpacing:.5,marginBottom:2}}>{label}</div>
        <div style={{fontSize:13,color:C.text,lineHeight:1.5}}>{val}</div>
      </div>
    </div>
  );
}

// ─── Small UI components ──────────────────────────────────────────────────────
function SprayingWidget({weather,weatherLoading}){
  if(weatherLoading||!weather)return null;
  const spray=getSprayingCondition(weather);
  return(
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:spray.ok?"#f0fdf4":"#fff7ed",border:`1px solid ${spray.ok?"#bbf7d0":"#fed7aa"}`,borderRadius:14,marginBottom:12}}>
      <span style={{fontSize:20}}>{spray.ok?"✅":"⚠️"}</span>
      <div style={{flex:1}}>
        <div style={{fontWeight:700,fontSize:12,color:spray.ok?C.success:C.warning}}>স্প্রে: {spray.ok?"অনুকূল":"প্রতিকূল"}</div>
        <div style={{fontSize:11,color:C.textMuted}}>{spray.reason}</div>
      </div>
      {!spray.ok&&spray.until&&<div style={{fontSize:11,color:C.warning,fontWeight:600,whiteSpace:"nowrap"}}>{spray.until}</div>}
    </div>
  );
}
function WeatherBar({weather,weatherLoading,locationName,locationSource,onRefresh}){
  const risks=assessWeatherRisks(weather);const top=risks[0];
  return(
    <div style={{background:"#f0f9ff",border:"1px solid #bae6fd",borderRadius:14,overflow:"hidden",marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 14px",background:"linear-gradient(90deg,#0ea5e9,#0284c7)",color:"#fff"}}>
        <span style={{fontSize:15}}>🌦️</span>
        <span style={{fontWeight:700,fontSize:12}}>আবহাওয়া {locationSource==="gps"?"📍":"🌐"}</span>
        {locationName&&<span style={{fontSize:11,opacity:.85,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>— {locationName}</span>}
        <button onClick={onRefresh} style={{marginLeft:"auto",background:"rgba(255,255,255,0.2)",border:"none",borderRadius:8,color:"#fff",padding:"2px 10px",cursor:"pointer",fontSize:11,flexShrink:0}}>🔄</button>
      </div>
      {weatherLoading&&!weather&&<div style={{padding:"10px 14px",color:"#0369a1",fontSize:12}}>⏳ আবহাওয়া সংগ্রহ...</div>}
      {weather&&(
        <div style={{padding:"8px 14px"}}>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:5}}>
            {[{icon:"🌡️",v:`${weather.temp}°C`},{icon:"💧",v:`${weather.humidity}%`},{icon:"🌧️",v:`${weather.rain24h}mm`},{icon:"💨",v:`${weather.windSpeed}km/h`},{icon:"☀️",v:`UV${weather.uvIndex}`}].map(({icon,v})=>(
              <div key={v} style={{display:"flex",alignItems:"center",gap:3,fontSize:12,color:C.text}}><span>{icon}</span><span style={{fontWeight:600}}>{v}</span></div>
            ))}
          </div>
          {top&&<div style={{fontSize:11,color:top.level==="high"?C.danger:top.level==="medium"?C.warning:C.success,fontWeight:600}}>{top.icon} {top.text}</div>}
        </div>
      )}
    </div>
  );
}
function QuickCropRow({onSelect,selected}){
  return(
    <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:6,scrollbarWidth:"none"}}>
      {QUICK_CROPS.map(crop=>{
        const active=(selected||"").includes(crop.en);
        return(
          <button key={crop.id} onClick={()=>onSelect(crop.en+" / "+crop.label)} style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",gap:4,background:"none",border:"none",cursor:"pointer",padding:"2px 4px"}}>
            <div style={{width:54,height:54,borderRadius:"50%",border:`2.5px solid ${active?crop.color:C.border}`,background:active?crop.color+"18":"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,transition:"all .2s",boxShadow:active?`0 0 0 3px ${crop.color}33`:"none"}}>{crop.emoji}</div>
            <span style={{fontSize:10,color:active?C.primaryDark:C.textMuted,fontWeight:active?700:400,whiteSpace:"nowrap"}}>{crop.label}</span>
          </button>
        );
      })}
      <button onClick={()=>onSelect("__more__")} style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",gap:4,background:"none",border:"none",cursor:"pointer",padding:"2px 4px"}}>
        <div style={{width:54,height:54,borderRadius:"50%",border:`2px dashed ${C.border}`,background:C.bgMuted,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>➕</div>
        <span style={{fontSize:10,color:C.textMuted,whiteSpace:"nowrap"}}>আরও</span>
      </button>
    </div>
  );
}
function DiagnosisHistory({history,onLoad}){
  if(history.length===0)return null;
  return(
    <div style={{marginBottom:12}}>
      <div style={{fontSize:11,color:C.textMuted,fontWeight:700,marginBottom:7,textTransform:"uppercase",letterSpacing:.5}}>📋 সাম্প্রতিক নির্ণয়</div>
      <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4,scrollbarWidth:"none"}}>
        {[...history].reverse().slice(0,4).map((h,i)=>(
          <button key={i} onClick={()=>onLoad(h)} style={{flexShrink:0,padding:"7px 12px",borderRadius:20,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",gap:7,boxShadow:C.shadow}}>
            <span style={{fontSize:16}}>🌾</span>
            <div style={{textAlign:"left"}}>
              <div style={{fontWeight:700,fontSize:11,color:C.text}}>{h.crop?.split("/")[0]?.trim()||"Unknown"}</div>
              <div style={{color:C.textMuted,fontSize:10}}>{h.date}</div>
            </div>
            <span style={{background:"#dcfce7",color:"#166534",borderRadius:10,padding:"1px 7px",fontSize:9,fontWeight:700}}>✓</span>
          </button>
        ))}
      </div>
    </div>
  );
}
function SeveritySurvey({onSubmit}){
  const[selected,setSelected]=useState("");
  const options=["মাঠ সম্পূর্ণ সুস্থ","কয়েকটি গাছে লক্ষণ","মাঠের ৫০% এর কম","অর্ধেক মাঠ আক্রান্ত","বেশিরভাগ মাঠ (৫০%+)","সমস্ত মাঠ আক্রান্ত"];
  return(
    <div>
      <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:12}}>📊 কতটুকু মাঠ আক্রান্ত?</div>
      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {options.map(opt=>(
          <button key={opt} onClick={()=>setSelected(opt)} style={{padding:"11px 14px",borderRadius:12,border:`1.5px solid ${selected===opt?C.primary:C.border}`,background:selected===opt?"#f0fdf4":"#fff",cursor:"pointer",textAlign:"left",fontSize:13,color:C.text,display:"flex",alignItems:"center",gap:10,transition:"all .15s"}}>
            <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${selected===opt?C.primary:C.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              {selected===opt&&<div style={{width:8,height:8,borderRadius:"50%",background:C.primary}}/>}
            </div>
            {opt}
          </button>
        ))}
      </div>
      <button onClick={()=>selected&&onSubmit(selected)} disabled={!selected} style={{marginTop:12,width:"100%",padding:"12px",borderRadius:12,border:"none",background:selected?C.primary:C.border,color:"#fff",fontWeight:700,fontSize:14,cursor:selected?"pointer":"not-allowed",transition:"all .2s"}}>
        সংরক্ষণ করুন
      </button>
    </div>
  );
}
function ProductRecommendations({products,crop}){
  const[selected,setSelected]=useState(null);
  const typeColor=(t)=>({
    insecticide:{bg:"#fef3c7",border:"#fcd34d",color:"#92400e",label:"কীটনাশক"},
    fungicide:{bg:"#eff6ff",border:"#bfdbfe",color:"#1e40af",label:"ছত্রাকনাশক"},
    herbicide:{bg:"#fdf4ff",border:"#e9d5ff",color:"#6b21a8",label:"আগাছানাশক"},
    acaricide:{bg:"#fff7ed",border:"#fed7aa",color:"#9a3412",label:"মাকড়নাশক"},
    bactericide:{bg:"#ecfdf5",border:"#a7f3d0",color:"#065f46",label:"ব্যাকটেরিয়ানাশক"},
    trap:{bg:"#f0f9ff",border:"#bae6fd",color:"#0c4a6e",label:"ফাঁদ"},
    biocontrol:{bg:"#f0fdf4",border:"#bbf7d0",color:"#14532d",label:"জৈব নিয়ন্ত্রণ"},
    biofungicide:{bg:"#f0fdf4",border:"#bbf7d0",color:"#14532d",label:"জৈব ছত্রাকনাশক"},
    bioinsecticide:{bg:"#f0fdf4",border:"#bbf7d0",color:"#14532d",label:"জৈব কীটনাশক"},
    botanical:{bg:"#fefce8",border:"#fef08a",color:"#713f12",label:"উদ্ভিজ্জ"},
    fertilizer:{bg:"#ecfdf5",border:"#a7f3d0",color:"#065f46",label:"সার"},
    soil_amendment:{bg:"#fafaf9",border:"#d6d3d1",color:"#292524",label:"মাটি সংশোধন"},
    pgr:{bg:"#fdf2f8",border:"#f5d0fe",color:"#701a75",label:"বৃদ্ধি নিয়ন্ত্রক"},
  }[t]||{bg:C.bgMuted,border:C.border,color:C.text,label:t});
  const isBio=(t)=>["trap","biocontrol","bioinsecticide","biofungicide","botanical"].includes(t);
  if(selected){
    const tc=typeColor(selected.type);
    return(
      <div style={{background:"#fff",borderRadius:16,padding:18,marginTop:12,border:`1px solid ${C.border}`,boxShadow:C.shadow,animation:"fadeIn .3s ease"}}>
        <button onClick={()=>setSelected(null)} style={{background:"none",border:"none",color:C.primary,cursor:"pointer",fontSize:13,marginBottom:12,display:"flex",alignItems:"center",gap:4,fontWeight:600}}>← ফিরুন</button>
        <div style={{marginBottom:14}}>
          <div style={{fontWeight:800,fontSize:16,color:C.primaryDark}}>{selected.trade_name}</div>
          <div style={{color:C.textMuted,fontSize:12,marginTop:2}}>{selected.company}</div>
          {selected.dae_reg&&<div style={{fontSize:11,color:C.blue,marginTop:4}}>🏛️ DAE রেজি: {selected.dae_reg}</div>}
          <span style={{display:"inline-block",background:tc.bg,border:`1px solid ${tc.border}`,color:tc.color,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700,marginTop:6}}>{tc.label}</span>
        </div>
        <div style={{display:"flex",flexDirection:"column"}}>
          <InfoRow icon="🧪" label="সক্রিয় উপাদান" val={selected.active_ingredient}/>
          <InfoRow icon="🎯" label="কার্যকর পোকা/রোগ" val={selected.target_bn?.join(", ")||selected.targets?.join(", ")}/>
          <InfoRow icon="🌾" label="ফসল" val={selected.crops_bn?.join(", ")||selected.crops?.join(", ")}/>
          <InfoRow icon="⚗️" label="প্রতি লিটারে মাত্রা" val={selected.dosage_per_litre}/>
          <InfoRow icon="🌿" label="প্রতি বিঘায় মাত্রা" val={selected.dosage_per_bigha}/>
          <InfoRow icon="📅" label="PHI (ফসল কাটার আগে)" val={`${selected.phi_days} দিন`}/>
          <InfoRow icon="🔬" label="প্রয়োগ পদ্ধতি" val={selected.method}/>
        </div>
        {selected.ipm_note&&<div style={{marginTop:10,background:"#f0fdf4",borderRadius:10,padding:10}}><div style={{fontWeight:700,fontSize:11,color:C.success,marginBottom:3}}>🌿 IPM পরামর্শ</div><div style={{fontSize:12,color:C.text,lineHeight:1.6}}>{selected.ipm_note}</div></div>}
        <div style={{marginTop:8,background:"#fffbeb",borderRadius:10,padding:10}}><div style={{fontWeight:700,fontSize:11,color:C.warning,marginBottom:3}}>⚠️ সতর্কতা</div><div style={{fontSize:12,color:C.text,lineHeight:1.6}}>{selected.caution_bn||selected.caution}</div></div>
        <div style={{marginTop:10,padding:"8px 12px",background:"#fef2f2",borderRadius:8,fontSize:11,color:C.danger}}>⚠️ শুধুমাত্র একটি পণ্য ব্যবহার করুন। DAE কর্মকর্তার পরামর্শ নিন।</div>
      </div>
    );
  }
  return(
    <div style={{background:"#fff",borderRadius:16,padding:14,marginTop:12,border:`1px solid ${C.border}`,boxShadow:C.shadow}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <span style={{fontSize:19}}>💊</span>
        <div>
          <div style={{fontWeight:800,fontSize:13,color:C.primaryDark}}>সুপারিশকৃত পণ্যসমূহ</div>
          <div style={{fontSize:10,color:C.textMuted}}>{crop?.split("/")[0]?.trim()} · DAE নিবন্ধিত</div>
        </div>
      </div>
      <div style={{background:"#fffbeb",border:"1px solid #fed7aa",borderRadius:8,padding:"7px 10px",marginBottom:10,fontSize:11,color:C.warning,fontWeight:600}}>⚠️ শুধুমাত্র একটি পণ্য বেছে নিন</div>
      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {products.map((p,i)=>{
          const tc=typeColor(p.type);
          return(
            <button key={p.id} onClick={()=>setSelected(p)} style={{display:"flex",alignItems:"center",gap:11,padding:"11px 12px",background:C.bgMuted,border:`1px solid ${C.border}`,borderRadius:12,cursor:"pointer",textAlign:"left",transition:"all .15s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.primary} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
              <div style={{width:30,height:30,borderRadius:"50%",background:tc.bg,border:`1.5px solid ${tc.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:tc.color,flexShrink:0}}>{i+1}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:13,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.trade_name}</div>
                <div style={{color:C.textMuted,fontSize:11,marginTop:1}}>{p.active_ingredient?.split(" ").slice(0,4).join(" ")}</div>
                <div style={{display:"flex",gap:5,marginTop:4,flexWrap:"wrap"}}>
                  <span style={{background:tc.bg,border:`1px solid ${tc.border}`,color:tc.color,borderRadius:10,padding:"1px 7px",fontSize:10,fontWeight:700}}>{tc.label}</span>
                  <span style={{background:"#f0fdf4",border:"1px solid #bbf7d0",color:"#065f46",borderRadius:10,padding:"1px 7px",fontSize:10}}>PHI:{p.phi_days}d</span>
                  {isBio(p.type)&&<span style={{background:"#ecfdf5",border:"1px solid #a7f3d0",color:"#065f46",borderRadius:10,padding:"1px 7px",fontSize:10}}>🌿IPM</span>}
                </div>
              </div>
              <span style={{color:C.textLight,fontSize:16,flexShrink:0}}>›</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Library section ──────────────────────────────────────────────────────────
function FeedbackPanel({context,summary,userEmail,onEmailChange,visitorStats,visitorId}){
  const[rating,setRating]=useState(0);
  const[feedback,setFeedback]=useState("");
  const[status,setStatus]=useState("");
  const quickNotes=["খুব কাজে লেগেছে","ভাষা আরও সহজ দরকার","আরও ছবি/ইনফোগ্রাফ চাই","এখানে বাগ আছে","নতুন ফসল যোগ করুন"];
  const payload=buildFeedbackMessage({
    context,
    rating,
    feedback,
    email:userEmail,
    summary,
    visits:visitorStats?.visits,
  });
  const saveFeedback=async()=>{
    try{
      const items=JSON.parse(localStorage.getItem("ud-feedback-log")||"[]");
      items.push({context,rating,feedback,email:userEmail,summary,date:new Date().toISOString()});
      localStorage.setItem("ud-feedback-log",JSON.stringify(items.slice(-50)));
    }catch{}
    try{
      await postJson("/api/feedback",{context,rating,feedback,email:userEmail,summary,visitorId});
    }catch{}
  };
  const handleCopy=async()=>{
    await saveFeedback();
    try{
      await navigator.clipboard.writeText(payload);
      setStatus("কপি হয়েছে");
    }catch{
      setStatus("কপি করা যায়নি");
    }
  };
  const mailto=`mailto:?subject=${encodeURIComponent(`Udbhid Goenda feedback - ${context}`)}&body=${encodeURIComponent(payload)}`;
  return(
    <div className="ud-editorial-shadow" style={{marginTop:16,background:"linear-gradient(135deg,#ffffff,#eff5f0)",border:`1px solid ${C.border}`,borderRadius:28,padding:18,boxShadow:C.shadow}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap",marginBottom:10}}>
        <div>
          <div style={{fontWeight:800,fontSize:15,color:C.primaryDark}}>⭐ রেটিং ও মতামত</div>
          <div style={{fontSize:12,color:C.textMuted}}>এই অংশ শেষে আপনার মতামত কপি করুন বা এক ক্লিকে পাঠান.</div>
        </div>
        <div style={{fontSize:11,color:C.textMuted}}>This browser: {visitorStats?.visits||1} · Total: {visitorStats?.totalVisits||visitorStats?.visits||1}</div>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
        {[1,2,3,4,5].map(star=>(
          <button key={star} onClick={()=>setRating(star)} style={{width:44,height:44,borderRadius:14,border:`1px solid ${rating>=star?"#fbbf24":C.border}`,background:rating>=star?"#fffbeb":"#fff",cursor:"pointer",fontSize:22}}>
            {rating>=star?"★":"☆"}
          </button>
        ))}
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
        {quickNotes.map(note=>(
          <button key={note} onClick={()=>setFeedback(prev=>prev?`${prev}${prev.includes(note)?"":"; "+note}`:note)} style={{padding:"7px 10px",borderRadius:999,border:`1px solid ${C.border}`,background:"#f8faf8",cursor:"pointer",fontSize:11}}>
            {note}
          </button>
        ))}
      </div>
      <textarea value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="কি ভালো লেগেছে, কোথায় সমস্যা, কী নতুন চাই..." rows={3} style={{width:"100%",border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 12px",resize:"vertical",marginBottom:10,fontSize:13}}/>
      <input name="email" autoComplete="email" inputMode="email" value={userEmail} onChange={e=>onEmailChange(e.target.value)} placeholder="ইমেইল দিন (ব্রাউজার থাকলে নিজে ভরতে পারে)" style={{width:"100%",border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 12px",marginBottom:10,fontSize:13}}/>
      <div style={{fontSize:11,color:C.textLight,marginBottom:12}}>ব্রাউজার নিরাপত্তার কারণে ইমেইল সরাসরি পড়া যায় না। তবে `autocomplete=email` দেওয়া আছে, তাই সেভ করা ইমেইল থাকলে ব্রাউজার নিজে সাজেস্ট/অটোফিল করতে পারবে.</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button onClick={handleCopy} style={{padding:"10px 14px",borderRadius:12,border:"none",background:C.primary,color:"#fff",fontWeight:700,cursor:"pointer"}}>📋 কপি করুন</button>
        <a href={mailto} onClick={()=>{saveFeedback();}} style={{padding:"10px 14px",borderRadius:12,border:`1px solid ${C.border}`,background:"#f0fdf4",color:C.primary,textDecoration:"none",fontWeight:700}}>✉️ ক্লিকে পাঠান</a>
        {status&&<div style={{padding:"10px 0",fontSize:12,color:C.textMuted}}>{status}</div>}
      </div>
    </div>
  );
}
function HomeTab({setActiveTab,history,weather,locationName}){
  const highlights=[
    {icon:"🧠",title:"ছবি দেখে রোগ ধরা",desc:"গ্যালারি বা ক্যামেরা থেকে ছবি দিন, তারপর সহজ ভাষায় রিপোর্ট পান.",action:"নির্ণয়ে যান",tab:"diagnose"},
    {icon:"📚",title:"তথ্যভাণ্ডার",desc:"স্লাইড, পড়ার PDF, আর অডিও পডকাস্ট এক জায়গায়.",action:"তথ্যভাণ্ডার খুলুন",tab:"library"},
    {icon:"🌐",title:"আমাদের আরও অ্যাপ",desc:"Krishi AI, GAP Brinjal, GreenLoop সহ অন্য টুলগুলো দেখুন.",action:"অ্যাপস দেখুন",tab:"apps"},
  ];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14,animation:"fadeIn .3s ease"}}>
       <div style={{background:`linear-gradient(135deg,${C.primaryXDark},${C.primary},${C.primaryLight})`,borderRadius:20,padding:"16px 12px",color:"#fff",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",right:-24,top:-12,fontSize:110,opacity:.1}}>🌿</div>
        <div style={{maxWidth:720,position:"relative"}}>
          <div style={{fontWeight:800,fontSize:28,lineHeight:1.15,marginBottom:8}}>উদ্ভিদ গোয়েন্দা</div>
          <div style={{fontSize:14,lineHeight:1.7,opacity:.92,marginBottom:14}}>কৃষকের জন্য সহজ রোগ-পোকা সহায়তা। ছবি, অবস্থান, মৌসুম আর মাঠের লক্ষণ মিলিয়ে রিপোর্ট দেখুন.</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <button onClick={()=>setActiveTab("diagnose")} style={{background:"#fff",color:C.primaryDark,border:"none",borderRadius:14,padding:"10px 16px",fontWeight:800,cursor:"pointer"}}>🔬 এখনই নির্ণয়</button>
            <button onClick={()=>setActiveTab("library")} style={{background:"rgba(255,255,255,0.14)",color:"#fff",border:"1px solid rgba(255,255,255,0.28)",borderRadius:14,padding:"10px 16px",fontWeight:700,cursor:"pointer"}}>📚 শেখার ঘর</button>
          </div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:12}}>
        {highlights.map(card=>(
          <button key={card.title} onClick={()=>setActiveTab(card.tab)} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:18,padding:18,textAlign:"left",cursor:"pointer",boxShadow:C.shadowMd}}>
            <div style={{fontSize:28,marginBottom:10}}>{card.icon}</div>
            <div style={{fontWeight:800,fontSize:16,color:C.primaryDark,marginBottom:6}}>{card.title}</div>
            <div style={{fontSize:12.5,color:C.textMuted,lineHeight:1.65,marginBottom:12}}>{card.desc}</div>
            <div style={{fontSize:12,color:C.primary,fontWeight:700}}>{card.action} →</div>
          </button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}>
        <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:18,padding:16,boxShadow:C.shadow}}>
          <div style={{fontSize:12,color:C.textMuted,marginBottom:6}}>📍 আপনার এলাকা</div>
          <div style={{fontWeight:800,fontSize:16,color:C.text}}>{locationName||"অবস্থান সংগ্রহ হচ্ছে..."}</div>
          <div style={{fontSize:12,color:C.textMuted,marginTop:6}}>জেলা স্বয়ংক্রিয়ভাবে ভরার চেষ্টা করা হয়.</div>
        </div>
        <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:18,padding:16,boxShadow:C.shadow}}>
          <div style={{fontSize:12,color:C.textMuted,marginBottom:6}}>🗓️ বর্তমান মৌসুম</div>
          <div style={{fontWeight:800,fontSize:16,color:C.text}}>{getCurrentSeason().split("/")[0].trim()}</div>
          <div style={{fontSize:12,color:C.textMuted,marginTop:6}}>তারিখ অনুযায়ী Detection tab-এ আগেই বসে যাবে.</div>
        </div>
        <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:18,padding:16,boxShadow:C.shadow}}>
          <div style={{fontSize:12,color:C.textMuted,marginBottom:6}}>🌦️ আজকের ঝুঁকি</div>
          <div style={{fontWeight:800,fontSize:16,color:C.text}}>{weather?assessWeatherRisks(weather)[0]?.text:"আবহাওয়া আনা হচ্ছে..."}</div>
        </div>
      </div>
      {history.length>0&&(
        <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:18,padding:16,boxShadow:C.shadow}}>
          <div style={{fontWeight:800,fontSize:15,color:C.primaryDark,marginBottom:10}}>🕘 সাম্প্রতিক রিপোর্ট</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}>
            {[...history].reverse().slice(0,4).map((item,index)=>(
              <div key={index} style={{background:C.bgMuted,border:`1px solid ${C.border}`,borderRadius:14,padding:12}}>
                <div style={{fontWeight:700,fontSize:13,color:C.text,marginBottom:4}}>{item.crop?.split("/")[0]?.trim()||"ফসল"}</div>
                <div style={{fontSize:11,color:C.textMuted}}>{item.district?.split("/")[0]?.trim()||"জেলা নেই"}</div>
                <div style={{fontSize:11,color:C.textLight,marginTop:6}}>{item.date}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
function EnhancedHomeTab({setActiveTab,history,weather,locationName}){
  const { speak, stop, speaking, isSupported } = useTTS();
  
  const features = [
    { icon: "🔬", title: "ছবি দিয়ে নির্ণয়", desc: "পাতার ছবি দিন, সিস্টেম ফসল আন্দাজ করবে ও সহজ বাংলায় রিপোর্ট দেখাবে। আবহাওয়া ও মৌসুমও বিবেচনায় নেবে।", tab: "diagnose", color: "#dc2626", bg: "#fef2f2" },
    { icon: "📋", title: "CABI গাইড", desc: "CABI Plantwise ৫-ধাপ প্রোটোকল, ETL সীমা, পুষ্টি তথ্য ও IPM পিরামিড — সব এক জায়গায়।", tab: "guide", color: "#2563eb", bg: "#eff6ff" },
    { icon: "🎮", title: "গেম হাব", desc: "৫টি ইন্টারেক্টিভ গেম খেলে CABI প্রোটোকল শিখুন! লক্ষণ চিহ্নিকরণ থেকে IPM সিদ্ধান্ত — সব গেমে আছে।", tab: "game", color: "#7c3aed", bg: "#faf5ff" },
    { icon: "📚", title: "তথ্যভাণ্ডার", desc: "ভিডিও গাইড, স্লাইড ডেক, পড়ার PDF ও অডিও পডকাস্ট — দেখে ও শুনে শিখুন।", tab: "library", color: "#0891b2", bg: "#ecfeff" },
    { icon: "🌐", title: "কৃষি অ্যাপস", desc: "Krishi AI, GAP Brinjal, CIRDAP GreenLoop — আরও সেবা একসাথে খুলুন।", tab: "apps", color: "#ea580c", bg: "#fff7ed" },
    { icon: "📋", title: "নির্ণয় ইতিহাস", desc: "আগের সব নির্ণয় রিপোর্ট দেখুন, ট্র্যাক করুন ফসলের স্বাস্থ্য পরিবর্তন।", tab: "history", color: "#16a34a", bg: "#f0fdf4" },
  ];

  const risk = weather ? assessWeatherRisks(weather)[0] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeIn .3s ease" }}>
      {/* Hero Section */}
      <div className="ud-editorial-shadow" style={{ background: `linear-gradient(135deg,${C.primaryXDark},${C.primary},${C.primaryLight})`, borderRadius: 28, padding: "24px 20px", color: "#fff", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -18, top: -20, fontSize: 130, opacity: .08 }}>🌿</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", fontSize: 11, fontWeight: 700 }}>🌾 AI কৃষি সহকারী</span>
        </div>
        <div className="ud-headline" style={{ fontWeight: 800, fontSize: 32, lineHeight: 1.1, marginBottom: 8, letterSpacing: -0.8 }}>
          পাতার ছবি থেকে<br />দ্রুত সমস্যা ধরুন
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.8, opacity: .9, marginBottom: 16, maxWidth: 500 }}>
          কৃষকের ভাষায় রোগ, পোকা, খাবারের ঘাটতি ও করণীয় একসাথে দেখুন। গেম খেলে শিখুন, ছবি দিয়ে নির্ণয় করুন।
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => setActiveTab("diagnose")} className="ud-headline" style={{ background: "#fff", color: C.primaryDark, border: "none", borderRadius: 999, padding: "12px 18px", fontWeight: 800, cursor: "pointer", boxShadow: "0 8px 20px rgba(0,0,0,0.12)" }}>📸 ছবি দিয়ে শুরু</button>
          <button onClick={() => setActiveTab("game")} className="ud-headline" style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.24)", borderRadius: 999, padding: "12px 18px", fontWeight: 700, cursor: "pointer" }}>🎮 গেম খেলুন</button>
        </div>
      </div>

      {/* Read aloud home intro */}
      {isSupported && (
        <button onClick={() => speak("উদ্ভিদ গোয়েন্দায় স্বাগতম! আপনি ছবি দিয়ে রোগ নির্ণয় করতে পারবেন, CABI গাইড পড়তে পারবেন, গেম খেলে শিখতে পারবেন, আর তথ্যভাণ্ডার থেকেও জানতে পারবেন।", { prependFriendly: true })} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "10px 14px", borderRadius: 12, border: `1.5px solid ${speaking ? C.success : C.border}`, background: speaking ? "#f0fdf4" : C.bgMuted, color: speaking ? C.success : C.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: C.shadow }}>
          <span style={{ fontSize: 18 }}>🔊</span>
          {speaking ? "শুনছি..." : "হোম পেজ শুনুন"}
        </button>
      )}

      {/* Feature Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
        {features.map((feat, i) => (
          <button key={feat.tab} onClick={() => setActiveTab(feat.tab)} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 20, padding: "18px 16px", textAlign: "left", cursor: "pointer", boxShadow: C.shadow, animation: `popIn .4s ease ${i * .05}s both`, display: "flex", gap: 14, alignItems: "flex-start", width: "100%" }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: feat.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, border: `1.5px solid ${feat.color}22` }}>
              {feat.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="ud-headline" style={{ fontWeight: 800, fontSize: 16, color: C.primaryDark, marginBottom: 4, lineHeight: 1.3 }}>{feat.title}</div>
              <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.6, marginBottom: 8 }}>{feat.desc}</div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: feat.color }}>
                খুলুন <span style={{ fontSize: 13 }}>→</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Quick Info Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 20, padding: 16, boxShadow: C.shadow }}>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>📍 আপনার এলাকা</div>
          <div className="ud-headline" style={{ fontWeight: 800, fontSize: 17, color: C.text }}>{locationName || "অবস্থান সংগ্রহ হচ্ছে..."}</div>
        </div>
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 20, padding: 16, boxShadow: C.shadow }}>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>🗓️ বর্তমান মৌসুম</div>
          <div className="ud-headline" style={{ fontWeight: 800, fontSize: 17, color: C.text }}>{getCurrentSeason().split("/")[0].trim()}</div>
        </div>
        <div style={{ background: risk ? "linear-gradient(135deg,#fff,#eff6ff)" : "#fff", border: `1px solid ${C.border}`, borderRadius: 20, padding: 16, boxShadow: C.shadow }}>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>🌦️ আজকের ঝুঁকি</div>
          <div className="ud-headline" style={{ fontWeight: 800, fontSize: 15, color: C.text }}>{risk?.text || "আবহাওয়া আনা হচ্ছে..."}</div>
          {weather && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>তাপমাত্রা {weather.temp}°C · আর্দ্রতা {weather.humidity}%</div>}
        </div>
      </div>

      {/* CABI Learning Path */}
      <div style={{ background: "linear-gradient(135deg,#f0fdf4,#ecfdf5)", border: `1px solid #bbf7d0`, borderRadius: 20, padding: 18 }}>
        <div className="ud-headline" style={{ fontWeight: 800, fontSize: 16, color: C.primaryDark, marginBottom: 10 }}>📚 CABI শেখার পথ</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { icon: "👁️", label: "লক্ষণ পর্যবেক্ষণ", color: "#2563eb" },
            { icon: "🔬", label: "বর্জন পদ্ধতি", color: "#7c3aed" },
            { icon: "🔺", label: "রোগ ত্রিভুজ", color: "#d97706" },
            { icon: "🧪", label: "মাঠ নিশ্চিতকরণ", color: "#16a34a" },
            { icon: "🌿", label: "IPM সিদ্ধান্ত", color: "#0891b2" },
          ].map((step, i, arr) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fff", borderRadius: 12, padding: "6px 12px", border: `1px solid ${step.color}33`, fontSize: 11, fontWeight: 700, color: step.color }}>{step.icon} {step.label}</span>
              {i < arr.length - 1 && <span style={{ color: C.border, fontSize: 14 }}>→</span>}
            </span>
          ))}
        </div>
        <button onClick={() => setActiveTab("game")} style={{ marginTop: 12, background: C.primary, color: "#fff", border: "none", borderRadius: 12, padding: "10px 16px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
          🎮 গেম খেলে শিখুন
        </button>
      </div>

      {/* Recent Reports */}
      {history.length > 0 && (
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 24, padding: 18, boxShadow: C.shadow }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <div className="ud-headline" style={{ fontWeight: 800, fontSize: 18, color: C.primaryDark }}>🕐 সাম্প্রতিক নির্ণয়</div>
            <button onClick={() => setActiveTab("history")} style={{ background: "none", border: "none", color: C.primary, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>সব দেখুন →</button>
          </div>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
            {[...history].reverse().slice(0, 4).map((item, index) => (
              <div key={index} style={{ background: C.bgMuted, border: `1px solid ${C.border}`, borderRadius: 18, padding: 14, minWidth: 200, flexShrink: 0 }}>
                <div className="ud-headline" style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 4 }}>{item.crop?.split("/")[0]?.trim() || "ফসল"}</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>{item.district?.split("/")[0]?.trim() || "জেলা নেই"}</div>
                <div style={{ fontSize: 11, color: C.textLight, marginTop: 6 }}>{item.date}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
function AppsHub(){
  return(
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:14,animation:"fadeIn .3s ease"}}>
      {OTHER_APPS.map(app=>(
        <a key={app.url} href={app.url} target="_blank" rel="noreferrer" style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:18,padding:18,textDecoration:"none",boxShadow:C.shadowMd}}>
          <div style={{fontSize:30,marginBottom:12}}>{app.icon}</div>
          <div style={{fontWeight:800,fontSize:16,color:C.primaryDark,marginBottom:6}}>{app.name}</div>
          <div style={{fontSize:12.5,color:C.textMuted,lineHeight:1.7,marginBottom:14}}>{app.desc}</div>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"#f0fdf4",border:`1px solid ${C.border}`,borderRadius:999,padding:"6px 12px",fontSize:12,color:C.primary,fontWeight:700}}>↗ খুলুন</div>
        </a>
      ))}
    </div>
  );
}
function MediaFrame({title,src,height=520}){
  return(
    <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:24,padding:12,boxShadow:C.shadow}}>
      <div className="ud-headline" style={{fontWeight:800,fontSize:14,color:C.primaryDark,marginBottom:10}}>{title}</div>
      <iframe src={src} title={title} style={{width:"100%",height,border:"none",borderRadius:18,background:"#f8fafc"}} allow="autoplay" />
    </div>
  );
}
function AudioPodcastCard({title,id}){
  const audioRef=useRef(null);
  const[playing,setPlaying]=useState(false);
  const[currentTime,setCurrentTime]=useState(0);
  const[duration,setDuration]=useState(0);
  useEffect(()=>{
    const audio=audioRef.current;
    if(!audio)return;
    const onTime=()=>setCurrentTime(audio.currentTime||0);
    const onMeta=()=>setDuration(audio.duration||0);
    const onEnd=()=>setPlaying(false);
    audio.addEventListener("timeupdate",onTime);
    audio.addEventListener("loadedmetadata",onMeta);
    audio.addEventListener("ended",onEnd);
    return()=>{
      audio.removeEventListener("timeupdate",onTime);
      audio.removeEventListener("loadedmetadata",onMeta);
      audio.removeEventListener("ended",onEnd);
    };
  },[]);
  const toggle=async()=>{
    const audio=audioRef.current;
    if(!audio)return;
    if(audio.paused){await audio.play();setPlaying(true);}else{audio.pause();setPlaying(false);}
  };
  const seek=(event)=>{
    const audio=audioRef.current;
    if(!audio||!duration)return;
    const rect=event.currentTarget.getBoundingClientRect();
    const ratio=Math.min(1,Math.max(0,(event.clientX-rect.left)/rect.width));
    audio.currentTime=ratio*duration;
  };
  const skip=(seconds)=>{
    const audio=audioRef.current;
    if(!audio)return;
    audio.currentTime=Math.max(0,Math.min((audio.duration||0),audio.currentTime+seconds));
  };
  const progress=duration?`${(currentTime/duration)*100}%`:"0%";
  return(
    <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:18,padding:16,boxShadow:C.shadow}}>
      <audio ref={audioRef} preload="metadata" src={toDriveDownloadUrl(id)} />
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
        <div style={{width:46,height:46,borderRadius:14,background:"#ecfeff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🎙️</div>
        <div style={{flex:1}}>
          <div style={{fontWeight:800,fontSize:15,color:C.primaryDark}}>{title}</div>
          <div style={{fontSize:11,color:C.textMuted}}>Google Drive podcast</div>
        </div>
        <button onClick={toggle} style={{width:46,height:46,borderRadius:"50%",border:"none",background:C.primary,color:"#fff",cursor:"pointer",fontSize:18}}>{playing?"⏸":"▶"}</button>
      </div>
      <div onClick={seek} style={{height:10,background:"#e5efe5",borderRadius:999,cursor:"pointer",overflow:"hidden",marginBottom:12}}>
        <div style={{width:progress,height:"100%",background:`linear-gradient(90deg,${C.primary},${C.primaryLight})`}} />
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12,color:C.textMuted,marginBottom:12}}>
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button onClick={()=>skip(-10)} style={{padding:"8px 12px",borderRadius:12,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer"}}>⏪ 10s</button>
        <button onClick={()=>skip(10)} style={{padding:"8px 12px",borderRadius:12,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer"}}>10s ⏩</button>
        <a href={toDriveViewUrl(id)} target="_blank" rel="noreferrer" style={{padding:"8px 12px",borderRadius:12,border:`1px solid ${C.border}`,background:"#f0fdf4",cursor:"pointer",textDecoration:"none",color:C.primary,fontWeight:700}}>Drive লিংক</a>
      </div>
    </div>
  );
}
function LibrarySection(){
  const[section,setSection]=useState("slides");
  const[currentSlide,setCurrentSlide]=useState(0);
  const sections=[
    {id:"slides",label:"স্লাইড ডেক",icon:"🖼️"},
    {id:"read",label:"পড়ার ডকুমেন্ট",icon:"📖"},
    {id:"audio",label:"অডিও পডকাস্ট",icon:"🎙️"},
  ];
  const slide=LIBRARY_MEDIA.slides[currentSlide];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:"#f8fafc",border:`1px dashed ${C.border}`,borderRadius:18,padding:16}}>
        <div style={{fontWeight:800,fontSize:15,color:C.primaryDark,marginBottom:4}}>🎬 ভিডিও সেকশন</div>
        <div style={{fontSize:12.5,color:C.textMuted,lineHeight:1.7}}>
          {LIBRARY_MEDIA.videoUrl?"উপরের ভিডিওটি দেখুন.":"এই ট্যাবের জন্য MP4 লিংক দেওয়া হয়নি, তাই ভিডিও স্লট প্রস্তুত রাখা হয়েছে."}
        </div>
        {LIBRARY_MEDIA.videoUrl&&<div style={{marginTop:12}}><MediaFrame title="ভিডিও" src={LIBRARY_MEDIA.videoUrl} height={340}/></div>}
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {sections.map(item=>(
          <button key={item.id} onClick={()=>setSection(item.id)} style={{padding:"9px 14px",borderRadius:999,border:`1px solid ${section===item.id?C.primary:C.border}`,background:section===item.id?C.primary:"#fff",color:section===item.id?"#fff":C.text,fontWeight:700,cursor:"pointer"}}>{item.icon} {item.label}</button>
        ))}
      </div>
      {section==="slides"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {LIBRARY_MEDIA.slides.map((item,index)=>(
              <button key={item.id} onClick={()=>setCurrentSlide(index)} style={{padding:"8px 12px",borderRadius:12,border:`1px solid ${currentSlide===index?C.primary:C.border}`,background:currentSlide===index?"#f0fdf4":"#fff",color:currentSlide===index?C.primaryDark:C.text,cursor:"pointer",fontWeight:700}}>📄 {index+1}</button>
            ))}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
            <button onClick={()=>setCurrentSlide(s=>Math.max(0,s-1))} disabled={currentSlide===0} style={{padding:"9px 14px",borderRadius:12,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer"}}>← আগেরটি</button>
            <a href={toDriveViewUrl(slide.id)} target="_blank" rel="noreferrer" style={{padding:"9px 14px",borderRadius:12,border:`1px solid ${C.border}`,background:"#f0fdf4",textDecoration:"none",color:C.primary,fontWeight:700}}>Drive এ খুলুন</a>
            <button onClick={()=>setCurrentSlide(s=>Math.min(LIBRARY_MEDIA.slides.length-1,s+1))} disabled={currentSlide===LIBRARY_MEDIA.slides.length-1} style={{padding:"9px 14px",borderRadius:12,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer"}}>পরেরটি →</button>
          </div>
          <MediaFrame title={slide.title} src={toDrivePreviewUrl(slide.id)} height={620}/>
        </div>
      )}
      {section==="read"&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:14}}>
          {LIBRARY_MEDIA.readings.map(item=>(
            <div key={item.id} style={{display:"flex",flexDirection:"column",gap:10}}>
              <MediaFrame title={item.title} src={toDrivePreviewUrl(item.id)} height={560}/>
              <a href={toDriveViewUrl(item.id)} target="_blank" rel="noreferrer" style={{alignSelf:"flex-start",padding:"9px 14px",borderRadius:12,background:"#f0fdf4",border:`1px solid ${C.border}`,textDecoration:"none",color:C.primary,fontWeight:700}}>পূর্ণ স্ক্রিনে পড়ুন</a>
            </div>
          ))}
        </div>
      )}
      {section==="audio"&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:14}}>
          {LIBRARY_MEDIA.audio.map(item=><AudioPodcastCard key={item.id} title={item.title} id={item.id}/>)}
        </div>
      )}
    </div>
  );
}
function EnhancedLibrarySection(){
  const[section,setSection]=useState("slides");
  const[currentSlide,setCurrentSlide]=useState(0);
  const sections=[
    {id:"slides",label:"স্লাইড ডেক",icon:"🖼️"},
    {id:"read",label:"পড়ার ডকুমেন্ট",icon:"📖"},
    {id:"audio",label:"অডিও পডকাস্ট",icon:"🎙️"},
  ];
  const slide=LIBRARY_MEDIA.slides[currentSlide];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div className="ud-editorial-shadow" style={{background:"linear-gradient(135deg,#d2e9d0,#f5fbf6)",border:`1px solid ${C.border}`,borderRadius:28,padding:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"end",gap:12,flexWrap:"wrap",marginBottom:8}}>
          <div>
            <div style={{fontSize:11,color:C.primary,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",marginBottom:6}}>ভিডিও গাইড</div>
            <div className="ud-headline" style={{fontWeight:800,fontSize:28,color:C.primaryDark,lineHeight:1.1}}>দেখে শিখুন, তারপর খুলুন স্লাইড ও ডকুমেন্ট</div>
          </div>
          <div style={{padding:"8px 12px",borderRadius:999,background:"#fff",border:`1px solid ${C.border}`,fontSize:12,fontWeight:700,color:C.primary}}>তথ্যভাণ্ডার</div>
        </div>
        <div style={{fontSize:13,color:C.textMuted,lineHeight:1.7}}>
          {LIBRARY_MEDIA.videoUrl?"উপরের ভিডিওটি দেখুন.":"এই ট্যাবের জন্য MP4 লিংক দেওয়া হয়নি, তাই ভিডিও স্লট প্রস্তুত রাখা হয়েছে."}
        </div>
        {LIBRARY_MEDIA.videoUrl&&<div style={{marginTop:12}}><MediaFrame title="ভিডিও" src={LIBRARY_MEDIA.videoUrl} height={340}/></div>}
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {sections.map(item=>(
          <button key={item.id} onClick={()=>setSection(item.id)} className="ud-headline" style={{padding:"11px 16px",borderRadius:999,border:`1px solid ${section===item.id?C.primary:C.border}`,background:section===item.id?C.primary:"#fff",color:section===item.id?"#fff":C.text,fontWeight:700,cursor:"pointer"}}>{item.icon} {item.label}</button>
        ))}
      </div>
      {section==="slides"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {LIBRARY_MEDIA.slides.map((item,index)=>(
              <button key={item.id} onClick={()=>setCurrentSlide(index)} style={{padding:"8px 12px",borderRadius:14,border:`1px solid ${currentSlide===index?C.primary:C.border}`,background:currentSlide===index?"#f0fdf4":"#fff",color:currentSlide===index?C.primaryDark:C.text,cursor:"pointer",fontWeight:700}}>📄 {index+1}</button>
            ))}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
            <button onClick={()=>setCurrentSlide(s=>Math.max(0,s-1))} disabled={currentSlide===0} style={{padding:"10px 14px",borderRadius:14,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer"}}>← আগেরটি</button>
            <a href={toDriveViewUrl(slide.id)} target="_blank" rel="noreferrer" style={{padding:"10px 14px",borderRadius:14,border:`1px solid ${C.border}`,background:"#f0fdf4",textDecoration:"none",color:C.primary,fontWeight:700}}>Drive এ খুলুন</a>
            <button onClick={()=>setCurrentSlide(s=>Math.min(LIBRARY_MEDIA.slides.length-1,s+1))} disabled={currentSlide===LIBRARY_MEDIA.slides.length-1} style={{padding:"10px 14px",borderRadius:14,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer"}}>পরেরটি →</button>
          </div>
          <MediaFrame title={slide.title} src={toDrivePreviewUrl(slide.id)} height={640}/>
        </div>
      )}
      {section==="read"&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:14}}>
          {LIBRARY_MEDIA.readings.map(item=>(
            <div key={item.id} style={{display:"flex",flexDirection:"column",gap:10}}>
              <MediaFrame title={item.title} src={toDrivePreviewUrl(item.id)} height={560}/>
              <a href={toDriveViewUrl(item.id)} target="_blank" rel="noreferrer" style={{alignSelf:"flex-start",padding:"10px 14px",borderRadius:14,background:"#f0fdf4",border:`1px solid ${C.border}`,textDecoration:"none",color:C.primary,fontWeight:700}}>পূর্ণ স্ক্রিনে পড়ুন</a>
            </div>
          ))}
        </div>
      )}
      {section==="audio"&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:14}}>
          {LIBRARY_MEDIA.audio.map(item=><AudioPodcastCard key={item.id} title={item.title} id={item.id}/>)}
        </div>
      )}
    </div>
  );
}
function LegacyLibrarySection(){
  const[activeTab,setActiveTab]=useState("pests");
  const[selected,setSelected]=useState(null);
  const tabs=[{id:"pests",label:"পোকামাকড়",icon:"🐛"},{id:"diseases",label:"রোগ",icon:"🦠"},{id:"deficiencies",label:"পুষ্টি অভাব",icon:"🌿"}];
  const items=LIBRARY[activeTab]||[];
  return(
    <div>
      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>{setActiveTab(t.id);setSelected(null);}} style={{flex:1,padding:"9px 6px",borderRadius:10,border:`1px solid ${activeTab===t.id?C.primary:C.border}`,background:activeTab===t.id?C.primary:"#fff",cursor:"pointer",fontSize:12,fontWeight:600,color:activeTab===t.id?"#fff":C.text,transition:"all .15s"}}>{t.icon} {t.label}</button>
        ))}
      </div>
      {selected?(
        <div style={{animation:"fadeIn .3s ease"}}>
          <button onClick={()=>setSelected(null)} style={{background:"none",border:"none",color:C.primary,cursor:"pointer",fontSize:13,marginBottom:10,display:"flex",alignItems:"center",gap:4,fontWeight:600}}>← ফিরে যান</button>
          <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.border}`,padding:18}}>
            <div style={{fontSize:32,marginBottom:8}}>{selected.icon}</div>
            <h3 style={{color:C.primaryDark,fontSize:17,marginBottom:3}}>{selected.name}</h3>
            <div style={{color:C.textMuted,fontSize:12,marginBottom:14}}>{selected.en}</div>
            <div style={{background:C.bgMuted,borderRadius:10,padding:12,marginBottom:10}}>
              <div style={{fontWeight:700,fontSize:12,color:C.text,marginBottom:5}}>🔍 লক্ষণসমূহ</div>
              <div style={{fontSize:13,color:C.text,lineHeight:1.7}}>{selected.symptoms}</div>
            </div>
            {(selected.ipm||selected.fix)&&<div style={{background:"#f0fdf4",borderRadius:10,padding:12,marginBottom:10}}><div style={{fontWeight:700,fontSize:12,color:C.success,marginBottom:5}}>{selected.ipm?"🌿 IPM ব্যবস্থাপনা":"💊 প্রতিকার"}</div><div style={{fontSize:13,color:C.text,lineHeight:1.7}}>{selected.ipm||selected.fix}</div></div>}
            {selected.etl&&<div style={{background:"#fffbeb",borderRadius:10,padding:12,marginBottom:10}}><div style={{fontWeight:700,fontSize:12,color:C.warning,marginBottom:3}}>📊 ETL</div><div style={{fontSize:13,color:C.text}}>{selected.etl}</div></div>}
            <div style={{padding:"7px 10px",background:"#eff6ff",borderRadius:8,fontSize:11,color:C.blue}}>🌾 ফসল: {Array.isArray(selected.crops)?selected.crops.join(", "):selected.crops}</div>
          </div>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:7}}>
          {items.map((item,i)=>(
            <button key={i} onClick={()=>setSelected(item)} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,cursor:"pointer",textAlign:"left",transition:"all .15s",boxShadow:C.shadow}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.primary} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
              <div style={{fontSize:26,flexShrink:0}}>{item.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:13,color:C.text}}>{item.name}</div>
                <div style={{color:C.textMuted,fontSize:11,marginTop:2}}>{item.en}</div>
              </div>
              <span style={{color:C.textLight,fontSize:16}}>›</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CABI Guide tab ───────────────────────────────────────────────────────────
function CABIGuideTab(){
   const[section,setSection]=useState("protocol");
   const[database,setDatabase]=useState(null);
   const[loading,setLoading]=useState(true);
   
   useEffect(()=>{
     fetch('/database.json')
       .then(res=>res.json())
       .then(data=>{
         setDatabase(data);
         setLoading(false);
       })
       .catch(err=>{
         console.error('Failed to load database:', err);
         setLoading(false);
       });
   },[]);
   
   const sections=[{id:"protocol",label:"প্রোটোকল",icon:"📋"},{id:"etl",label:"ETL সীমা",icon:"📊"},{id:"nutrients",label:"পুষ্টি",icon:"🧪"},{id:"ipm",label:"IPM পিরামিড",icon:"🌿"},{id:"resistance",label:"প্রতিরোধ",icon:"🔄"}];
   const resistanceData={
     frac:[
       {group:"FRAC 1 (MBC)",ai:"কার্বেন্ডাজিম, থিওফানেট",risk:"উচ্চ",rotate:"FRAC 3 বা 11 এর ساتھ"},
       {group:"FRAC 3 (Triazole)",ai:"ট্রাইসাইক্লাজোল, হেক্সাকোনাজোল",risk:"মাঝারি",rotate:"FRAC 11 বা 7 এর ساتھ"},
       {group:"FRAC 4 (PA)",ai:"মেটালাক্সিল-এম",risk:"উচ্চ",rotate:"FRAC M3 (মানকোজেব) মিশিয়ে"},
       {group:"FRAC 11 (Strobilurin)",ai:"আজোক্সিস্ট্রোবিন, ট্রাইফ্লোক্সিস্ট্রোবিন",risk:"উচ্চ",rotate:"FRAC 3 ساتھ, মৌসুমে ২ বার"},
       {group:"FRAC M3 (Dithiocarbamate)",ai:"মানকোজেব, জিনেব",risk:"কম",rotate:"যেকোনো সিস্টেমিকের সাথে"},
     ],
      irac:[
        {group:"IRAC 1A (Organophosphate)",ai:"ক্লোরপাইরিফস, ডাইমিথোয়েট",risk:"মাঝারি",rotate:"IRAC 3 বা 4 এর সাথে"},
        {group:"IRAC 3 (Pyrethroid)",ai:"সাইপারমেথ্রিন, ডেলটামেথ্রিন",risk:"উচ্চ",rotate:"IRAC 1 বা 4 এর সাথে"},
        {group:"IRAC 4A (Neonicotinoid)",ai:"ইমিডাক্লোপ্রিড, থিয়ামেথók্সাম",risk:"উচ্চ",rotate:"IRAC 22 বা 28; মৌমাছি সতর্কতা"},
        {group:"IRAC 22 (Pymetrozine)",ai:"পাইমেট্রোজিন",risk:"কম",rotate:"নিম্যের বিকল্প"},
        {group:"IRAC 28 (Diamide)",ai:"ক্লোরান্ট্রানিলিপ্রোল",risk:"মাঝারি",rotate:"মৌসুমে ২ বারের বেশি নয়"},
      ]
   };

   // Function to get relevant images based on section
   const getRelevantImages = (db, sectionId) => {
     if (!db?.diagnostic_keys) return [];
     
     // Map section IDs to symptom categories in database
     const sectionToSymptomMap = {
       protocol: null, // Show general images for protocol
       etl: ["Drying/necrosis/blight", "Leaf spot", "Wilt"],
       nutrients: ["Yellowing of leaves", "Distortion of leaves"],
       ipm: ["Leaf spot", "Wilt", "Galls"],
       resistance: null
     };
     
     const targetSymptoms = sectionToSymptomMap[sectionId];
     if (!targetSymptoms) return [];
     
     return db.diagnostic_keys
       .filter(page => 
         targetSymptoms.some(symptom => 
           page.symptom_category && 
           page.symptom_category.toLowerCase().includes(symptom.toLowerCase())
         )
       )
       .flatMap(page => page.images || [])
       .slice(0, 3); // Return at most 3 images
   };

   return(
     <div>
       <div style={{display:"flex",gap:8,marginBottom:16,overflowX:"auto",paddingBottom:4,scrollbarWidth:"none"}}>
         {sections.map(s=>(
           <button key={s.id} onClick={()=>setSection(s.id)} className="ud-headline" style={{flexShrink:0,padding:"10px 15px",borderRadius:999,border:`1px solid ${section===s.id?C.primary:C.border}`,background:section===s.id?C.primary:"#fff",color:section===s.id?"#fff":C.text,cursor:"pointer",fontSize:12,fontWeight:800,whiteSpace:"nowrap",transition:"all .15s"}}>{s.icon} {s.label}</button>
         ))}
       </div>
       {section==="protocol"&&(
         <div>
           <div className="ud-editorial-shadow" style={{background:`linear-gradient(135deg,${C.primaryXDark},${C.primary})`,borderRadius:24,padding:22,marginBottom:16,color:"#fff"}}>
             <div style={{fontSize:24,marginBottom:8}}>🔬</div>
             <div style={{fontWeight:800,fontSize:17,marginBottom:3}}>{CABI_GUIDE.protocol.title}</div>
             <div style={{opacity:.8,fontSize:12}}>{CABI_GUIDE.protocol.subtitle}</div>
           </div>
           {CABI_GUIDE.protocol.steps.map((step,i)=>(
             <div key={i} style={{background:"#fff",borderRadius:18,padding:18,marginBottom:12,border:`1px solid ${step.border}`,boxShadow:C.shadow,animation:`fadeIn .3s ease ${i*.05}s both`}}>
               <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                 <div style={{width:46,height:46,borderRadius:16,background:step.bg,border:`2px solid ${step.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,flexShrink:0}}>{step.icon}</div>
                 <div style={{flex:1}}>
                   <div style={{fontWeight:800,fontSize:14,color:step.color}}>ধাপ {step.num}: {step.title}</div>
                   <div style={{fontSize:11,color:C.textMuted}}>{step.en}</div>
                 </div>
               </div>
               <p style={{fontSize:13,color:C.text,lineHeight:1.7,marginBottom:10}}>{step.desc}</p>
               {step.points.map((pt,j)=><div key={j} style={{display:"flex",gap:8,fontSize:12,color:C.text,padding:"3px 0"}}><span style={{color:step.color,fontWeight:700,flexShrink:0}}>✓</span><span>{pt}</span></div>)}
             </div>
           ))}
           {/* Add reference images for protocol section */}
           {!loading && database && (
             <div style={{marginTop:20}}>
               <div style={{fontWeight:700,fontSize:14,color:C.primaryDark,marginBottom:8}}>🔍 সごめんなさい načewskiprzed</div>
               <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:8}}>
                 {getRelevantImages(database, "protocol").map((img, index)=>( 
                   <div key={index} style={{flexShrink:0,width:100,height:80,borderRadius:8,overflow:"hidden",border:`2px solid ${C.border}`}}>
                     <img src={`/images/${img}`} alt={`Reference ${index+1}`} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                   </div>
                 ))}
               </div>
             </div>
           )}
         </div>
       )}
       {section==="etl"&&(
         <div>
           <div style={{background:"#fffbeb",borderRadius:12,padding:12,marginBottom:12,border:"1px solid #fcd34d"}}>
             <div style={{fontWeight:700,fontSize:13,color:C.warning,marginBottom:3}}>📊 ETL কী?</div>
             <div style={{fontSize:12,color:C.text,lineHeight:1.7}}>ETL হলো সেই মাত্রা যখন কীটনাশক ব্যবহারের অর্থনৈতিক ন্যায্যতা থাকে। নিচে থাকলে প্রাকৃতিক নিয়ন্ত্রণই যথেষ্ট।</div>
           </div>
           {CABI_GUIDE.etl.map((e,i)=>(
             <div key={i} style={{background:"#fff",borderRadius:12,padding:14,marginBottom:9,border:`1px solid ${C.border}`,boxShadow:C.shadow}}>
               <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                 <div><div style={{fontWeight:700,fontSize:13,color:C.primaryDark}}>{e.pest}</div><div style={{color:C.textMuted,fontSize:11}}>{e.en}</div></div>
                 <span style={{background:"#fef3c7",border:"1px solid #fcd34d",color:"#92400e",borderRadius:8,padding:"2px 8px",fontSize:10,fontWeight:700,flexShrink:0,marginLeft:8}}>ETL</span>
               </div>
               <div style={{background:"#fffbeb",borderRadius:8,padding:"7px 10px",marginBottom:7}}><div style={{fontSize:11,fontWeight:700,color:C.warning,marginBottom:2}}>ব্যবস্থার সীমা:</div><div style={{fontSize:12,color:C.text}}>{e.etl}</div></div>
               <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                 <div style={{fontSize:11,color:C.textMuted}}>📅 পর্যায়: <span style={{color:C.text,fontWeight:600}}>{e.stage}</span></div>
                 <div style={{fontSize:11,color:C.textMuted}}>🔍 <span style={{color:C.text,fontWeight:600}}>{e.monitor}</span></div>
               </div>
             </div>
           ))}
           {/* Add reference images for ETL section */}
           {!loading && database && (
             <div style={{marginTop:20}}>
               <div style={{fontWeight:700,fontSize:14,color:C.primaryDark,marginBottom:8}}>🖼️ ETL সম্পর্কিত संदर्भ ছবি</div>
               <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:8}}>
                 {getRelevantImages(database, "etl").map((img, index)=>( 
                   <div key={index} style={{flexShrink:0,width:100,height:80,borderRadius:8,overflow:"hidden",border:`2px solid ${C.border}`}}>
                     <img src={`/images/${img}`} alt={`ETL Reference ${index+1}`} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                   </div>
                 ))}
               </div>
             </div>
           )}
         </div>
       )}
       {section==="nutrients"&&(
         <div>
           <div style={{background:"#f0fdf4",borderRadius:12,padding:12,marginBottom:12,border:"1px solid #bbf7d0"}}><div style={{fontWeight:700,fontSize:13,color:C.success,marginBottom:3}}>🧪 পুষ্টি উপাদান</div><div style={{fontSize:12,color:C.text,lineHeight:1.7}}>পুষ্টি অভাবের লক্ষণ প্রায়ই রোগের মতো দেখায়। CABI প্রোটোকলে এটি প্রথমেই বাদ দিতে হয়।</div></div>
           {CABI_GUIDE.nutrients.map((n,i)=>(
             <div key={i} style={{background:"#fff",borderRadius:12,padding:14,marginBottom:9,border:`1px solid ${C.border}`,borderLeft:`4px solid ${n.color}`,boxShadow:C.shadow}}>
               <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                 <div style={{width:34,height:34,borderRadius:"50%",background:n.color+"20",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:13,color:n.color,flexShrink:0}}>{n.name.match(/\((.*?)\)/)?.[1]||n.name[0]}</div>
                 <div><div style={{fontWeight:800,fontSize:14,color:C.text}}>{n.name}</div><div style={{fontSize:11,color:C.textMuted}}>{n.en}</div></div>
               </div>
               <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:9}}>
                 <div style={{fontSize:11,color:C.textMuted}}>অভাবের লক্ষণ:</div><div style={{fontSize:12,color:C.text}}>{n.deficiency}</div>
                 <div style={{fontSize:11,color:C.textMuted}}>অতিক্রমের লক্ষণ:</div><div style={{fontSize:12,color:C.text}}>{n.excess}</div>
               </div>
               <div style={{fontSize:11,color:C.textMuted}}>শ말로 পূরণ:</div><div style={{fontSize:12,color:C.text}}>{n.fix}</div>
                  {n.crops && (
                    <div>
                      <div style={{fontSize:11,color:C.textMuted}}>প্রভাবিত ফসল:</div>
                      <div style={{fontSize:12,color:C.text}}>{n.crops.join(", ")}</div>
                    </div>
                  )}
             </div>
           ))}
           {/* Add reference images for nutrients section */}
           {!loading && database && (
             <div style={{marginTop:20}}>
               <div style={{fontWeight:700,fontSize:14,color:C.primaryDark,marginBottom:8}}>🖼️ পুষ্টি-abnormalitetে σχετية छवियां</div>
               <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:8}}>
                 {getRelevantImages(database, "nutrients").map((img, index)=>( 
                   <div key={index} style={{flexShrink:0,width:100,height:80,borderRadius:8,overflow:"hidden",border:`2px solid ${C.border}`}}>
                     <img src={`/images/${img}`} alt={`Nutrient Reference ${index+1}`} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                   </div>
                 ))}
               </div>
             </div>
           )}
         </div>
       )}
       {section==="ipm"&&(
         <div>
           <div style={{display:"flex",gap:10,marginBottom:12}}>
             {[...CABI_GUIDE.ipm_pyramid].reverse().map((level,i)=>(
               <div key={i} style={{flex:1,minWidth:0,background:level.color+"15",borderRadius:12,padding:12,position:"relative"}}>
                 <div style={{position:"absolute",top:-6,left:12,background:level.color,color:"#fff",borderRadius:10,padding:"2px 6px",fontSize:10,fontWeight:700}}>LEVEL {level.level}</div>
                 <div style={{fontWeight:800,fontSize:14,color:level.color,marginBottom:8}}>{level.label}</div>
                 <div style={{fontSize:11,color:C.text,lineHeight:1.6,marginBottom:10}}>{level.items.map((item,j)=><div key={j} style={{display:"flex",alignItems:"start",gap:6,marginBottom:4}}><span style={{color:level.color,flexShrink:0}}>▸</span><span>{item}</span></div>)}</div>
               </div>
             ))}
           </div>
           {/* Add reference images for IPM section */}
           {!loading && database && (
             <div style={{marginTop:20}}>
               <div style={{fontWeight:700,fontSize:14,color:C.primaryDark,marginBottom:8}}>🖼️ IPM পিরামিডের संदर्भ छवियां</div>
               <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:8}}>
                 {getRelevantImages(database, "ipm").map((img, index)=>( 
                   <div key={index} style={{flexShrink:0,width:100,height:80,borderRadius:8,overflow:"hidden",border:`2px solid ${C.border}`}}>
                     <img src={`/images/${img}`} alt={`IPM Reference ${index+1}`} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                   </div>
                 ))}
               </div>
             </div>
           )}
         </div>
       )}
       {section==="resistance"&&(
         <div>
           <div style={{background:"#faf5ff",borderRadius:12,padding:12,marginBottom:12,border:"1px solid #e9d5ff"}}>
             <div style={{fontWeight:700,fontSize:13,color:"#7c3aed",marginBottom:3}}>🔄 PRC/IRAC রোটেশন গাইড</div>
             <div style={{fontSize:12,color:C.text,lineHeight:1.7}}>PRC ও IRAC gruppi ప్ర 따라 রাসায়নিকs ব্যবহার করে রোগ/পোকা-নিয়ন্ত্র ССР algunosprotocols</div>
           </div>
           <div style={{display:"grid",gap:10,marginBottom:12}}>
             <div>
               <div style={{fontWeight:700,fontSize:13,color:"#7c3aed",marginBottom:4}}>FRAC (ছত্রাকনাশক)</div>
               <div style={{background:"#fff",borderRadius:10,padding:12}}>
                 {resistanceData.frac.map((f,i)=>(
                   <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:i===resistanceData.frac.length-1?"none":`1px solid ${C.border}`}}>
                     <div><div style={{fontSize:11,color:C.textMuted}}>{f.group}</div><div style={{fontSize:10,color:C.text}}>{f.ai}</div></div>
                     <div style={{display:"flex",gap:6,alignItems:"center"}}>
                       <span style={{background:"#fed7aa",borderRadius:4,padding:"1px 4px",fontSize:9,color:C.warning}}>{f.risk}</span>
                       <span style={{fontSize:10,color:C.text}}>{f.rotate}</span>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
             <div>
               <div style={{fontWeight:700,fontSize:13,color:"#7c3aed",marginBottom:4}}>IRAC (কীটনাশক)</div>
               <div style={{background:"#fff",borderRadius:10,padding:12}}>
                 {resistanceData.irac.map((i,idx)=>( 
                   <div key={idx} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:idx===resistanceData.irac.length-1?"none":`1px solid ${C.border}`}}>
                     <div><div style={{fontSize:11,color:C.textMuted}}>{i.group}</div><div style={{fontSize:10,color:C.text}}>{i.ai}</div></div>
                     <div style={{display:"flex",gap:6,alignItems:"center"}}>
                       <span style={{background:"#fed7aa",borderRadius:4,padding:"1px 4px",fontSize:9,color:C.warning}}>{i.risk}</span>
                       <span style={{fontSize:10,color:C.text}}>{i.rotate}</span>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
           </div>
           {/* Add reference images for resistance section */}
           {!loading && database && (
             <div style={{marginTop:20}}>
               <div style={{fontWeight:700,fontSize:14,color:C.primaryDark,marginBottom:8}}>🖼️ PRC/IRAC রোটেশনের संदर्भ छवियां</div>
               <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:8}}>
                 {getRelevantImages(database, "resistance").map((img, index)=>( 
                   <div key={index} style={{flexShrink:0,width:100,height:80,borderRadius:8,overflow:"hidden",border:`2px solid ${C.border}`}}>
                     <img src={`/images/${img}`} alt={`Resistance Reference ${index+1}`} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                   </div>
                 ))}
               </div>
             </div>
           )}
         </div>
       )}
    </div>
  );
}


// ─── 🎮 GAME HUB ─────────────────────────────────────────────────────────────
function GameHub(){
  const[activeGame,setActiveGame]=useState(null);
  const { speak, stop, speaking, isSupported } = useTTS();

  const CABI_GAMES=[
    {id:"symptom-spotter",title:"লক্ষণ লক্ষ্য",en:"Symptom Spotter",step:1,icon:"👁️",color:"#2563eb",bg:"linear-gradient(135deg,#1e40af,#2563eb)",desc:"ফসলের লক্ষণ চিনুন — পাতার দাগ, রং ও আকৃতি থেকে রোগ শনাক্ত করুন",difficulty:"সহজ",duration:"৫-১০ মিনিট",Component:SymptomSpotter},
    {id:"cause-detective",title:"কারণ খুঁজো",en:"Cause Detective",step:2,icon:"🔬",color:"#7c3aed",bg:"linear-gradient(135deg,#4c1d95,#7c3aed)",desc:"CABI বর্জন পদ্ধতি — ক্লু থেকে সঠিক কারণ নির্ণয় করুন",difficulty:"মধ্যম",duration:"১০-১৫ মিনিট",Component:CauseDetective},
    {id:"disease-triangle",title:"রোগ ত্রিভুজ",en:"Disease Triangle",step:3,icon:"🔺",color:"#d97706",bg:"linear-gradient(135deg,#92400e,#d97706)",desc:"পোষক, রোগজীবাণু ও পরিবেশ — তিনটি উপাদান মেলান",difficulty:"মধ্যম",duration:"১০-১৫ মিনিট",Component:DiseaseTriangle},
    {id:"field-scout",title:"মাঠ পরীক্ষক",en:"Field Scout",step:4,icon:"🧪",color:"#16a34a",bg:"linear-gradient(135deg,#065f46,#16a34a)",desc:"W-pattern স্যাম্পলিং ও ETL থ্রেশহোল্ড সিদ্ধান্ত",difficulty:"কঠিন",duration:"১০-১৫ মিনিট",Component:FieldScout},
    {id:"ipm-commander",title:"IPM কমান্ডার",en:"IPM Commander",step:5,icon:"🌿",color:"#0891b2",bg:"linear-gradient(135deg,#0e7490,#0891b2)",desc:"IPM পিরামিড অনুসরণ করে সঠিক চিকিৎসা সিদ্ধান্ত নিন",difficulty:"কঠিন",duration:"১০-১৫ মিনিট",Component:IPMCommander},
  ];

  const EXTERNAL_GAMES=[
    {id:"dhan-doctor",title:"ধানের ডাক্তার",en:"Dhan Doctor Simulation",icon:"🌾",color:C.game2,bg:"linear-gradient(135deg,#0c4a6e,#0891b2)",desc:"ধানের ৫টি প্রধান রোগ চিহ্নিত করুন",difficulty:"মধ্যম",duration:"১৫-২০ মিনিট",src:"https://game-diagnosis.space.z.ai/"},
    {id:"smart-krishok",title:"স্মার্ট কৃষক ৩.০",en:"Smart Farmer Decision Game",icon:"👨‍🌾",color:C.game1,bg:"linear-gradient(135deg,#4c1d95,#7c3aed)",desc:"কৃষি সিদ্ধান্ত গ্রহণের দক্ষতা বাড়ান",difficulty:"কঠিন",duration:"২০-৩০ মিনিট",src:"https://game-diagnosis.space.z.ai/"},
    {id:"plant-clinic",title:"প্ল্যান্ট ক্লিনিক",en:"Plant Clinic Simulation",icon:"🏥",color:C.game3,bg:"linear-gradient(135deg,#7c2d12,#ea580c)",desc:"CABI প্রোটোকল অনুশীলন ও পরামর্শ দিন",difficulty:"সহজ",duration:"১০-১৫ মিনিট",src:"https://game-diagnosis.space.z.ai/"},
  ];

  if(activeGame){
    const game=CABI_GAMES.find(g=>g.id===activeGame);
    if(!game)return null;
    const GameComponent=game.Component;
    return(
      <div style={{animation:"fadeIn .3s ease"}}>
        <button onClick={()=>setActiveGame(null)} style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,background:"none",border:"none",cursor:"pointer",padding:0,color:C.primary,fontSize:13,fontWeight:600}}>
          <span style={{fontSize:18}}>←</span> গেম হাবে ফিরুন
        </button>
        <GameComponent/>
      </div>
    );
  }

  return(
    <div style={{animation:"fadeIn .3s ease",paddingBottom:20}}>
      {/* Section header */}
      <div style={{marginBottom:20}}>
        <div className="ud-headline" style={{fontWeight:800,fontSize:20,color:C.primaryDark,marginBottom:4}}>🎮 গেম হাব</div>
        <div style={{fontSize:13,color:C.textLight}}>CABI Plantwise ৫-ধাপ প্রোটোকল অনুসারে খেলুন ও শিখুন</div>
      </div>

      {isSupported && (
        <button onClick={() => speak("গেম হাবে স্বাগতম! এখানে পাঁচটি CABI গেম আছে। লক্ষণ লক্ষ্য, কারণ খুঁজো, রোগ ত্রিভুজ, মাঠ পরীক্ষক, এবং IPM কমান্ডার।", { prependFriendly: true })} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "10px 14px", borderRadius: 12, border: `1.5px solid ${speaking ? C.success : C.border}`, background: speaking ? "#f0fdf4" : C.bgMuted, color: speaking ? C.success : C.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 14, boxShadow: C.shadow }}>
          <span style={{ fontSize: 18 }}>🔊</span>
          {speaking ? "শুনছি..." : "গেম তালিকা শুনুন"}
        </button>
      )}

      {/* CABI Step Games — inline playable */}
      <div style={{marginBottom:8,fontSize:11,color:C.primary,fontWeight:700,textTransform:"uppercase",letterSpacing:.6}}>📖 CABI প্রোটোকল গেম</div>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
        {CABI_GAMES.map((game,i)=>(
          <button
            key={game.id}
            onClick={()=>setActiveGame(game.id)}
            style={{display:"flex",alignItems:"center",gap:14,background:"#fff",borderRadius:16,padding:"14px 16px",border:`1px solid ${C.border}`,boxShadow:C.shadow,cursor:"pointer",animation:`popIn .4s ease ${i*.06}s both`,transition:"all .2s ease",textAlign:"left",width:"100%"}}
          >
            <div style={{position:"relative",width:54,height:54,flexShrink:0}}>
              <div style={{width:54,height:54,borderRadius:14,background:game.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,boxShadow:"0 4px 12px rgba(0,0,0,0.12)"}}>
                {game.icon}
              </div>
              <div style={{position:"absolute",top:-4,right:-4,width:20,height:20,borderRadius:8,background:"#fff",border:`1.5px solid ${game.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:game.color,boxShadow:C.shadow}}>ধা.{game.step}</div>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:800,fontSize:14,color:C.text,marginBottom:1,lineHeight:1.3}}>{game.title}</div>
              <div style={{fontSize:10.5,color:C.textMuted,marginBottom:5,lineHeight:1.4}}>{game.desc}</div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{fontSize:10,color:C.textLight}}>⚡ {game.difficulty}</span>
                <span style={{fontSize:10,color:C.textLight}}>⏱ {game.duration}</span>
              </div>
            </div>
            {isSupported && (
              <button
                onClick={(e) => { e.stopPropagation(); speak(`${game.title}। ${game.desc}। ${game.difficulty} মাত্রা।`, { prependFriendly: true }); }}
                style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 12, background: C.bgMuted, border: `1.5px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: C.shadow, cursor: "pointer", fontSize: 16 }}
              >
                🔊
              </button>
            )}
            <div style={{flexShrink:0,width:38,height:38,borderRadius:12,background:`linear-gradient(135deg,${game.color},${game.color}bb)`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 6px 16px rgba(0,0,0,0.15)"}}>
              <span style={{color:"#fff",fontSize:16}}>▶</span>
            </div>
          </button>
        ))}
      </div>

      {/* External simulation games */}
      <div style={{marginBottom:8,fontSize:11,color:C.textLight,fontWeight:700,textTransform:"uppercase",letterSpacing:.6}}>🌐 সিমুলেশন গেম</div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {EXTERNAL_GAMES.map((game,i)=>(
          <a
            key={game.id}
            href={game.src}
            target="_blank"
            rel="noreferrer"
            style={{display:"flex",alignItems:"center",gap:14,background:"#fff",borderRadius:16,padding:"14px 16px",border:`1px solid ${C.border}`,boxShadow:C.shadow,textDecoration:"none",animation:`popIn .4s ease ${(i+5)*.06}s both`,transition:"all .2s ease"}}
          >
            <div style={{width:54,height:54,borderRadius:14,background:game.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0,boxShadow:"0 4px 12px rgba(0,0,0,0.12)"}}>
              {game.icon}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:800,fontSize:14,color:C.text,marginBottom:1,lineHeight:1.3}}>{game.title}</div>
              <div style={{fontSize:10.5,color:C.textMuted,marginBottom:5,lineHeight:1.4}}>{game.desc}</div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{fontSize:10,color:C.textLight}}>⚡ {game.difficulty}</span>
                <span style={{fontSize:10,color:C.textLight}}>⏱ {game.duration}</span>
              </div>
            </div>
            <div style={{flexShrink:0,width:38,height:38,borderRadius:12,background:`linear-gradient(135deg,${game.color},${game.color}bb)`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 6px 16px rgba(0,0,0,0.15)"}}>
              <span style={{color:"#fff",fontSize:16}}>↗</span>
            </div>
          </a>
        ))}
      </div>

      {/* Learning path */}
      <div style={{marginTop:20,padding:"12px 0",borderTop:`1px solid ${C.border}`}}>
        <div style={{fontSize:11,color:C.textLight,fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>📚 CABI শেখার ক্রম</div>
        <div style={{display:"flex",gap:4,alignItems:"center",fontSize:10.5,color:C.textMuted,flexWrap:"wrap"}}>
          {CABI_GAMES.map((game,i,arr)=>(
            <span key={game.id} style={{display:"flex",alignItems:"center",gap:4}}>
              <span style={{display:"inline-flex",alignItems:"center",gap:3,background:`${game.color}15`,borderRadius:10,padding:"3px 8px",color:game.color,fontWeight:700}}>{game.icon} ধাপ {game.step}</span>
              {i<arr.length-1&&<span style={{color:C.border,fontSize:12}}>→</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UdbhidGoenda(){
const[activeTab,setActiveTab]=useState("home");
  const[step,setStep]=useState(1);
  const[form,setForm]=useState({crop:"Rice / ধান, Tomato / টমেটো",district:"",season:getCurrentSeason(),growthStage:"",symptoms:"",duration:"",affectedArea:""});
  const[diagnosisMode,setDiagnosisMode]=useState("online"); // "online" or "offline"
  const[offlineDiagnosis,setOfflineDiagnosis]=useState(null);
  const[showMoreCrops,setShowMoreCrops]=useState(false);
  const[expandedGroup,setExpandedGroup]=useState(null);
  const[image,setImage]=useState(null);
  const[imageBase64,setImageBase64]=useState(null);
  const[result,setResult]=useState(null);
  const[showEnglish,setShowEnglish]=useState(false);
  const[provider,setProvider]=useState(null);
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState(null);
  const[severity,setSeverity]=useState(null);
  const[history,setHistory]=useState(()=>{try{return JSON.parse(localStorage.getItem("ud-history")||"[]");}catch{return[];}});
  const[pesticideDb,setPesticideDb]=useState(null);
  const[recommendedProducts,setRecommendedProducts]=useState([]);

  const fileRef=useRef();
  const recognitionRef=useRef(null);
  const resultRef=useRef(null);

  const[isListening,setIsListening]=useState(false);
  const[isSpeaking,setIsSpeaking]=useState(false);
  const[voiceSupported,setVoiceSupported]=useState(false);
  const[ttsSupported,setTtsSupported]=useState(false);

  const[weather,setWeather]=useState(null);
  const[weatherLoading,setWeatherLoading]=useState(false);
  const[locationName,setLocationName]=useState(null);
  const[coords,setCoords]=useState(null);
  const[locationSource,setLocationSource]=useState(null);
  const[analysingCrop,setAnalysingCrop]=useState(false);
  const[viewportWidth,setViewportWidth]=useState(()=>typeof window!=="undefined"?window.innerWidth:1280);
  const[userEmail,setUserEmail]=useState(()=>{try{return localStorage.getItem("ud-user-email")||"";}catch{return"";}});
  const[visitorStats,setVisitorStats]=useState(()=>({visits:1,sections:{}}));
  const[visitorId,setVisitorId]=useState(()=>{try{return localStorage.getItem("ud-visitor-id")||"";}catch{return"";}});

  const galleryRef=useRef();
  const cameraRef=useRef();
  const isDesktop=viewportWidth>=1100;
  const isGameTab=activeTab==="game";

  useEffect(()=>{fetch("/pesticides.json").then(r=>r.json()).then(d=>setPesticideDb(d)).catch(()=>{});},[]);
  useEffect(()=>{
    const onResize=()=>setViewportWidth(window.innerWidth);
    window.addEventListener("resize",onResize);
    return()=>window.removeEventListener("resize",onResize);
  },[]);
  useEffect(()=>{
    try{
      const raw=JSON.parse(localStorage.getItem("ud-visitor-stats")||"{}");
      const next={visits:(raw.visits||0)+1,sections:raw.sections||{},totalVisits:raw.totalVisits||0,uniqueVisitors:raw.uniqueVisitors||0};
      const id=localStorage.getItem("ud-visitor-id")||`${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      localStorage.setItem("ud-visitor-id",id);
      setVisitorId(id);
      localStorage.setItem("ud-visitor-stats",JSON.stringify(next));
      setVisitorStats(next);
    }catch{}
  },[]);
  useEffect(()=>{
    try{localStorage.setItem("ud-user-email",userEmail||"");}catch{}
  },[userEmail]);
  useEffect(()=>{
    try{
      const raw=JSON.parse(localStorage.getItem("ud-visitor-stats")||"{}");
      const next={visits:raw.visits||1,sections:{...(raw.sections||{}),[activeTab]:(raw.sections?.[activeTab]||0)+1},totalVisits:raw.totalVisits||0,uniqueVisitors:raw.uniqueVisitors||0};
      localStorage.setItem("ud-visitor-stats",JSON.stringify(next));
      setVisitorStats(next);
    }catch{}
  },[activeTab]);
  useEffect(()=>{
    if(!visitorId)return;
    postJson("/api/analytics",{visitorId,section:"app_open"}).then(data=>{
      if(data?.totalVisits) {
        setVisitorStats(prev=>({...prev,totalVisits:data.totalVisits,uniqueVisitors:data.uniqueVisitors,sections:data.sections||prev.sections}));
        try{localStorage.setItem("ud-visitor-stats",JSON.stringify({...visitorStats,totalVisits:data.totalVisits,uniqueVisitors:data.uniqueVisitors,sections:data.sections||visitorStats.sections,visits:visitorStats.visits||1}));}catch{}
      }
    }).catch(()=>{});
  },[visitorId]);
  useEffect(()=>{
    if(!visitorId||!activeTab)return;
    postJson("/api/analytics",{visitorId,section:activeTab}).then(data=>{
      if(data?.totalVisits) setVisitorStats(prev=>({...prev,totalVisits:data.totalVisits,uniqueVisitors:data.uniqueVisitors,sections:data.sections||prev.sections}));
    }).catch(()=>{});
  },[visitorId,activeTab]);

  useEffect(()=>{
    if(!pesticideDb||!result||!form.crop)return;
    const text=(result.bn+" "+result.en).toLowerCase();
    const cropKey=Object.keys(pesticideDb.crop_to_product_map).find(k=>form.crop.toLowerCase().includes(k.toLowerCase())||k.toLowerCase().includes(form.crop.split("/")[0].trim().toLowerCase()));
    const cropIds=cropKey?(pesticideDb.crop_to_product_map[cropKey]||[]):[];
    const pestIds=[];
    for(const[pest,ids]of Object.entries(pesticideDb.pest_to_product_map))if(text.includes(pest.toLowerCase()))ids.forEach(id=>pestIds.push(id));
    const allIds=[...new Set([...pestIds,...cropIds])];
    const matched=allIds.map(id=>pesticideDb.products.find(p=>p.id===id)).filter(Boolean);
    const pestSet=new Set(pestIds);
    matched.sort((a,b)=>{const aP=pestSet.has(a.id)?1:0;const bP=pestSet.has(b.id)?1:0;if(bP!==aP)return bP-aP;return(b.rating||0)-(a.rating||0);});
    setRecommendedProducts(matched.slice(0,5));
  },[pesticideDb,result,form.crop]);

  const fetchWeather=useCallback(async(lat,lon)=>{
    try{
      const d=await(await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,uv_index&daily=precipitation_sum&timezone=Asia%2FDhaka&forecast_days=1`)).json();
      const c=d.current;
      setWeather({temp:Math.round(c.temperature_2m),feelsLike:Math.round(c.apparent_temperature),humidity:Math.round(c.relative_humidity_2m),rain24h:Math.round((d.daily?.precipitation_sum?.[0]??c.precipitation??0)*10)/10,windSpeed:Math.round(c.wind_speed_10m),uvIndex:Math.round(c.uv_index)});
    }catch{}
  },[]);

  const reverseGeocode=useCallback(async(lat,lon)=>{
    try{
      const d=await(await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`,{headers:{"User-Agent":"UddhidGoenda/1.0"}})).json();
      const district=d.address?.county||d.address?.state_district||d.address?.city||d.address?.town||d.address?.village||"";
      setLocationName([district,"Bangladesh"].filter(Boolean).join(", "));
      const m=findDistrictMatch(district,d.address?.state,d.address?.region);
      if(m)setForm(f=>({...f,district:f.district||m}));
    }catch{setLocationName("Bangladesh");}
  },[]);

  const fetchByIP=useCallback(async()=>{
    try{
      const d=await(await fetch("https://ip-api.com/json/?fields=lat,lon,city,regionName")).json();
      if(d.lat&&d.lon){setCoords({lat:d.lat,lon:d.lon});setLocationSource("ip");setLocationName([d.city,d.regionName,"Bangladesh"].filter(Boolean).join(", "));await fetchWeather(d.lat,d.lon);const m=findDistrictMatch(d.city,d.regionName);if(m)setForm(f=>({...f,district:f.district||m}));}
      else{setCoords({lat:23.685,lon:90.356});setLocationName("Bangladesh");await fetchWeather(23.685,90.356);}
    }catch{}
  },[fetchWeather]);

  useEffect(()=>{
    setWeatherLoading(true);
    if(navigator.geolocation){navigator.geolocation.getCurrentPosition(async(pos)=>{const{latitude:lat,longitude:lon}=pos.coords;setCoords({lat,lon});setLocationSource("gps");await Promise.all([fetchWeather(lat,lon),reverseGeocode(lat,lon)]);setWeatherLoading(false);},async()=>{await fetchByIP();setWeatherLoading(false);},{timeout:8000});}
    else{fetchByIP().then(()=>setWeatherLoading(false));}
  },[fetchWeather,reverseGeocode,fetchByIP]);
  useEffect(()=>{setForm(f=>f.season?f:{...f,season:getCurrentSeason()});},[]);

  useEffect(()=>{setVoiceSupported(!!(window.SpeechRecognition||window.webkitSpeechRecognition));setTtsSupported(!!window.speechSynthesis);},[]);

  const refreshWeather=async()=>{if(!coords)return;setWeatherLoading(true);await fetchWeather(coords.lat,coords.lon);setWeatherLoading(false);};

  const detectCropFromImage=useCallback(async(base64,fileName="")=>{
    setAnalysingCrop(true);
    try{
      const res=await fetch("/api/diagnose",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        systemPrompt:CROP_DETECT_SYSTEM_PROMPT,
        messages:[{role:"user",content:[
          {type:"image",source:{type:"base64",media_type:"image/jpeg",data:base64}},
          {type:"text",text:`Identify the crop in this image. Filename: ${fileName||"unknown"}. Return JSON only.`},
        ]}]
      })});
      const data=await res.json();
      const raw=data.content?.map(b=>b.text||"").join("\n")||"";
      let crop="";
      try{crop=guessCropFromText(JSON.parse(raw).crop||"");}catch{crop=guessCropFromText(raw);}
      if(crop)setForm(f=>f.crop?f:{...f,crop});
    }catch{}
    finally{setAnalysingCrop(false);}
  },[]);
  const handleImageFile=(file)=>{
    if(!file)return;
    const objectUrl=URL.createObjectURL(file);
    setImage(objectUrl);
    const img=new Image();
    img.onload=()=>{
      const MAX=800;let{width:w,height:h}=img;
      if(w>MAX||h>MAX){if(w>h){h=Math.round(h*MAX/w);w=MAX;}else{w=Math.round(w*MAX/h);h=MAX;}}
      const cv=document.createElement("canvas");cv.width=w;cv.height=h;cv.getContext("2d").drawImage(img,0,0,w,h);
      const base64=cv.toDataURL("image/jpeg",0.7).split(",")[1];
      setImageBase64(base64);
      const cropFromName=guessCropFromText(file.name||"");
      if(cropFromName)setForm(f=>f.crop?f:{...f,crop:cropFromName});
      else detectCropFromImage(base64,file.name);
      URL.revokeObjectURL(objectUrl);
    };
    img.src=objectUrl;
  };
  const handleImage=(e)=>handleImageFile(e.target.files?.[0]);

const handleSubmit=async()=>{
    if(!form.crop||!form.symptoms){setError("অনুগ্রহ করে ফসল এবং লক্ষণ উভয়ই পূরণ করুন।");return;}
    setLoading(true);setError(null);setResult(null);setSeverity(null);setRecommendedProducts([]);
    
    if (diagnosisMode === "offline") {
      // Use offline diagnosis
      try {
        // Prepare input data for offline diagnosis
        const inputData = {
          symptoms: {
            leafSymptoms: form.symptoms,
            distribution: form.affectedArea || "N/A",
            progression: form.duration || "N/A",
            signs: "N/A" // We could extract more specific signs from symptoms
          },
          hostInfo: {
            varietySusceptibility: "medium", // Default - could be improved
            growthStage: form.growthStage || "N/A"
          },
          pathogenInfo: {
            inoculumPressure: "low", // Default - could be improved
            recentHistory: "none" // Default - could be improved
          },
          envInfo: weather ? {
            temp: weather.temp,
            humidity: weather.humidity,
            rainfall: weather.rain24h
          } : null
        };
        
        // Perform offline diagnosis
        const offlineResult = diagnoseOffline(inputData);
        
        // Convert offline result to format compatible with existing result display
        const banglaText = `
---BANGLA_SECTION---
## ১. CABI বর্জন পদ্ধতি অনুযায়ী বিশ্লেষণ
**অ্যাবায়োটিক নাকি বায়োটিক:** ${offlineResult.abioticBiotic === "abiotic" ? "অবায়টিক (পরিবেশজ)" : offlineResult.abioticBiotic === "biotic" ? "বায়োটিক (জীবজিৎ)" : "নিশ্চিত নয়"}
**বর্জন গেট ফলাফল:** ${offlineResult.excluded.length > 0 ? offlineResult.excluded.join(", ") : "কোনোcause বাদ দেয়নি"} || ${offlineResult.suspects.length > 0 ? offlineResult.suspects.join(", ") : "কোনোসন্দেহ নেই"}

## ২. সম্ভাব্য রোগ / পোকার নাম
**প্রাথমিক সন্দেহ:** ${offlineResult.primarySuspect}
**বিকল্প সন্দেহ (যদি থাকে):** ${offlineResult.suspects.slice(1,3).length > 0 ? offlineResult.suspects.slice(1,3).join(" ; ") : "না"}
**আস্থার মাত্রা:** ${offlineResult.confidence}

## ৩. রোগ ত্রিভুজ মূল্যায়ন
**পোষক (Host):** ${offlineResult.diseaseTriangle.host}
**জীবাণু (Pathogen):** ${offlineResult.diseaseTriangle.pathogen}
**পরিবেশ (Environment):** ${offlineResult.diseaseTriangle.environment}

## ৪. মাঠে নিশ্চিতকরণের পদ্ধতি
${offlineResult.fieldConfirmation.map((method, idx) => `${idx+1}. ${method}`).join("\n")}

## ৫. তীব্রতা ও অর্থনৈতিক গুরুত্ব
**ক্ষয়ক্ষতির মাত্রা:** মূল্যায়ন করতে필요
**অর্থনৈতিক থ্রেশহোল্ড:** ${offlineResult.economicThreshold}

## ৬. সমন্বিত বালাই ব্যবস্থাপনা (IPM)
**কৃষি ব্যবস্থাপনা (সর্বোচ্চ অগ্রাধিকার):**
${offlineResult.ipmRecommendations.cultural.map((item, idx) => `${idx+1}. ${item}`).join("\n")}
**জৈবিক নিয়ন্ত্রণ:**
${offlineResult.ipmRecommendations.biological.map((item, idx) => `${idx+1}. ${item}`).join("\n")}
**রাসায়নিক (শেষ উপায় — FRAC/IRAC গ্রুপ উল্লেখসহ):**
${offlineResult.ipmRecommendations.chemical.map((item, idx) => `${idx+1}. ${item}`).join("\n")}

## ৭. প্রতিরোধ — পরবর্তী মৌসুম
${offlineResult.ipmRecommendations.prevention.map((item, idx) => `${idx+1}. ${item}`).join("\n")}

## ৮. কখন DAE কর্মকর্তার পরামর্শ নেবেন
- শুত মূল্যায়ন নিশ্চিৎ হলে
- রोग দ্রুত প্রসারিত হলে
- নিরাপদ কিমিয়ার ব্যবহারে হুমকি হলে
---END_BANGLA---

---ENGLISH_SECTION---
## 1. CABI Exclusion Analysis
**Abiotic vs Biotic:** ${offlineResult.abioticBiotic}
**Exclusion Gates:** Excluded: ${offlineResult.excluded.join(", ")} | Suspects: ${offlineResult.suspects.join(", ")}

## 2. Probable Diagnosis
**Primary suspect:** ${offlineResult.primarySuspect}
**Differential diagnosis:** ${offlineResult.suspects.slice(1,3).length > 0 ? offlineResult.suspects.slice(1,3).join(" ; ") : "None"}
**Confidence level:** ${offlineResult.confidence}

## 3. Disease Triangle Assessment
**Host:** ${offlineResult.diseaseTriangle.host}
**Pathogen:** ${offlineResult.diseaseTriangle.pathogen}
**Environment:** ${offlineResult.diseaseTriangle.environment}
**Risk Level:** ${offlineResult.diseaseTriangle.riskLevel}

## 4. Field Confirmation Method
${offlineResult.fieldConfirmation.map((method, idx) => `${idx+1}. ${method}`).join("\n")}

## 5. Severity & Economic Importance
**Damage level:** Assessment required
**Economic threshold:** ${offlineResult.economicThreshold}

## 6. IPM Recommendations
**Cultural control (highest priority):**
${offlineResult.ipmRecommendations.cultural.map((item, idx) => `${idx+1}. ${item}`).join("\n")}
**Biological control:**
${offlineResult.ipmRecommendations.biological.map((item, idx) => `${idx+1}. ${item}`).join("\n")}
**Chemical — last resort (with FRAC/IRAC group):**
${offlineResult.ipmRecommendations.chemical.map((item, idx) => `${idx+1}. ${item}`).join("\n")}

## 7. Prevention — Next Season
${offlineResult.ipmRecommendations.prevention.map((item, idx) => `${idx+1}. ${item}`).join("\n")}

## 8. When to Consult DAE
- When initial assessment needs confirmation
- When disease is rapidly spreading
- When safe chemical application is uncertain
---END_ENGLISH---
`;
        
        setResult({
          bn: banglaText.split("---END_BANGLA---")[0].replace("---BANGLA_SECTION---", "").trim(),
          en: banglaText.split("---END_ENGLISH---")[1].replace("---ENGLISH_SECTION---", "").trim()
        });
        setProvider("Offline CABI Diagnostic Engine");
        setStep(2);
        
        const entry = {
          crop: form.crop,
          district: form.district,
          date: new Date().toLocaleDateString("bn-BD"),
          resultPreview: banglaText.substring(0, 100)
        };
        const nh = [...history, entry].slice(-10);
        setHistory(nh);
        try { localStorage.setItem("ud-history", JSON.stringify(nh)); } catch {}
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      } catch (err) {
        setError(`অফলাইন নিদানে সমস্যা: ${err.message}`);
        console.error("Offline diagnosis error:", err);
      } finally {
        setLoading(false);
      }
      return;
    }
    
    // Online diagnosis (existing code)
    const uc = [];
    if (imageBase64) uc.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } });
    uc.push({ 
      type: "text", 
      text: `Crop:${form.crop}\nDistrict:${form.district||locationName||"N/A"}\nSeason:${form.season||"N/A"}\nGrowth:${form.growthStage||"N/A"}\nDuration:${form.duration||"N/A"}\nArea:${form.affectedArea||"N/A"}\nSymptoms:${form.symptoms}\n${imageBase64?"Photo attached.":"No photo."}\n${weatherPromptText(weather,locationName)}\n\nDiagnose using CABI Plantwise 5-step protocol. Use very simple Bangla for farmers. Avoid technical words unless you immediately explain them in plain language. Prefer short icon-led bullets and practical field actions.\n---BANGLA_SECTION---\n[Full Bangla]\n---END_BANGLA---\n---ENGLISH_SECTION---\n[Full English]\n---END_ENGLISH---`} 
    );
    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          model: "claude-sonnet-4-20250514", 
          max_tokens: 2000, 
          messages: [{ role: "user", content: uc }] 
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      const raw = data.content?.map(b => b.text || "").join("\n") || "";
      const bn = (raw.match(/---BANGLA_SECTION---([\s\S]*?)---END_BANGLA---/) || [])[1]?.trim() || raw;
      const en = (raw.match(/---ENGLISH_SECTION---([\s\S]*?)---END_ENGLISH---/) || [])[1]?.trim() || "";
      setResult({ bn, en });
      setProvider(data.provider || null);
      setStep(2);
      const entry = { crop: form.crop, district: form.district, date: new Date().toLocaleDateString("bn-BD"), resultPreview: bn.slice(0, 80) };
      const nh = [...history, entry].slice(-10);
      setHistory(nh);
      try { localStorage.setItem("ud-history", JSON.stringify(nh)); } catch {}
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      setError(`রোগ নির্ণয়ে সমস্যা: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const stopSpeaking=()=>{window.speechSynthesis?.cancel();setIsSpeaking(false);};
  const reset=()=>{setForm({crop:"",district:"",season:getCurrentSeason(),growthStage:"",symptoms:"",duration:"",affectedArea:""});setImage(null);setImageBase64(null);setResult(null);setError(null);setProvider(null);setShowEnglish(false);setStep(1);setSeverity(null);setShowMoreCrops(false);setRecommendedProducts([]);stopSpeaking();};

  const startListening=()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return;stopSpeaking();
    const r=new SR();recognitionRef.current=r;r.lang="bn-BD";r.interimResults=true;r.continuous=false;
    r.onstart=()=>setIsListening(true);
    r.onresult=(e)=>{const t=Array.from(e.results).map(r=>r[0].transcript).join("");setForm(f=>({...f,symptoms:f.symptoms?f.symptoms.trimEnd()+" "+t:t}));};
    r.onerror=()=>setIsListening(false);r.onend=()=>setIsListening(false);r.start();
  };
  const stopListening=()=>{recognitionRef.current?.stop();setIsListening(false);};
  const speakResult=(text)=>{
    if(!window.speechSynthesis)return;stopSpeaking();
    const clean=text.replace(/#{1,6}\s/g,"").replace(/\*\*/g,"").replace(/---[\w_]+---/g,"").replace(/\*/g,"").replace(/`/g,"").trim();
    const u=new SpeechSynthesisUtterance(clean);u.lang=showEnglish?"en-US":"bn-BD";u.rate=0.88;
    if(!showEnglish){const v=window.speechSynthesis.getVoices().find(v=>v.lang.startsWith("bn"));if(v)u.voice=v;}
    u.onstart=()=>setIsSpeaking(true);u.onend=()=>setIsSpeaking(false);u.onerror=()=>setIsSpeaking(false);
    window.speechSynthesis.speak(u);
  };
  const handleCropQuickSelect=(val)=>{if(val==="__more__"){setShowMoreCrops(true);return;}setForm(f=>({...f,crop:val}));setShowMoreCrops(false);};

  // style constants
  const labelSt={display:"block",color:C.text,fontSize:12,fontWeight:700,marginBottom:5};
  const selSt={width:"100%",background:C.bgMuted,border:`1px solid ${C.border}`,borderRadius:10,color:C.text,padding:"9px 10px",fontSize:13,outline:"none",appearance:"none"};
  const chipSt={padding:"5px 12px",borderRadius:20,fontSize:12,cursor:"pointer",transition:"all .15s",flexShrink:0};

  const navTabs=[
    {id:"home",label:"হোম",icon:"🏠"},
    {id:"guide",label:"CABI গাইড",icon:"📖"},
    {id:"game",label:"গেম হাব",icon:"🎮"},
    {id:"diagnose",label:"নির্ণয়",icon:"🔬"},
    {id:"library",label:"তথ্য ভান্ডার",icon:"📚"},
    {id:"apps",label:"অ্যাপস",icon:"🌐"},
    {id:"history",label:"ইতিহাস",icon:"📋"},
  ];
  const legacyNavTabs=[
    {id:"diagnose",label:"নির্ণয়",icon:"🔬"},
    {id:"guide",label:"CABI গাইড",icon:"📖"},
    {id:"library",label:"তথ্যভাণ্ডার",icon:"📚"},
    {id:"game",label:"গেম হাব",icon:"🎮"},
    {id:"history",label:"ইতিহাস",icon:"📋"},
  ];
  const feedbackContext=activeTab==="diagnose"
    ?(step===2?"Diagnosis Report":"Diagnosis Form")
    :activeTab==="game"
      ?"Game Hub"
      :activeTab==="library"
        ?"Information Library"
        :activeTab==="guide"
          ?"CABI Guide"
          :activeTab==="apps"
            ?"Apps Hub"
            :activeTab==="history"
              ?"History"
              :"Home";
  const feedbackSummary=activeTab==="diagnose"&&result
    ?`${form.crop||"Unknown crop"} | ${form.district||locationName||"Unknown district"} | ${(result.bn||result.en||"").slice(0,160)}`
    :activeTab==="game"
      ?"Game tab feedback"
      :activeTab==="library"
        ?"Drive-based slide, reading, and audio library"
        :activeTab==="apps"
          ?"External agriculture apps hub"
          :activeTab==="guide"
            ?"CABI training guide view"
            :activeTab==="history"
              ?`Saved reports: ${history.length}`
              :"General app feedback";

  return(
    <div style={{minHeight:"100svh",background:C.bg,width:"100%",display:"flex",flexDirection:"column"}}>

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <div style={{background:`linear-gradient(135deg,${C.primaryXDark},${C.primary})`,padding:isGameTab?"8px 14px 0":"12px 14px 0",position:"sticky",top:0,zIndex:100,boxShadow:C.shadowMd}}>
        <div style={{maxWidth:1280,width:"100%",margin:"0 auto"}}>
        {!isGameTab&&<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <div style={{width:40,height:40,borderRadius:11,overflow:"hidden",flexShrink:0,boxShadow:"0 2px 10px rgba(0,0,0,0.3)",animation:"glow 3s ease-in-out infinite"}}>
            <img src="/cabi-logo.jpg" alt="CABI" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{color:"#fff",fontWeight:800,fontSize:17,letterSpacing:-.5,lineHeight:1.1}}>উদ্ভিদ গোয়েন্দা</div>
            <div style={{color:"rgba(255,255,255,0.65)",fontSize:10,letterSpacing:.2}}>Plant Detective · Bangladesh · CABI Plantwise</div>
          </div>
          {step===2&&result&&<button onClick={reset} style={{flexShrink:0,background:"rgba(255,255,255,0.15)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:10,color:"#fff",padding:"6px 10px",cursor:"pointer",fontSize:12,fontWeight:600}}>🔁 নতুন</button>}
        </div>}
        {/* Tab bar */}
        <div style={{display:"flex",overflowX:"auto",scrollbarWidth:"none",gap:0,justifyContent:isGameTab?"center":"flex-start"}}>
          {navTabs.map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{flexShrink:0,padding:isGameTab?"11px 12px":"9px 11px",border:"none",cursor:"pointer",background:"none",color:activeTab===t.id?"#fff":"rgba(255,255,255,0.55)",borderBottom:`2.5px solid ${activeTab===t.id?"#fff":"transparent"}`,fontSize:isGameTab?12:11.5,fontWeight:activeTab===t.id?700:400,transition:"all .15s",whiteSpace:"nowrap",letterSpacing:.1}}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        </div>
      </div>

      {/* ══ CONTENT ═════════════════════════════════════════════════════════ */}
      <div style={{flex:1,padding:activeTab==="game"?"10px 12px":"14px",overflowY:activeTab==="game"?"hidden":"auto",overflowX:"hidden"}}>
        <div style={{maxWidth:isDesktop?1280:1040,margin:"0 auto",width:"100%"}}>

        {activeTab==="home"&&<EnhancedHomeTab setActiveTab={setActiveTab} history={history} weather={weather} locationName={locationName}/>}

        {activeTab==="apps"&&(
          <div className="ud-editorial-shadow" style={{background:"#fff",borderRadius:28,padding:20,border:`1px solid ${C.border}`,boxShadow:C.shadow}}>
            <div style={{fontWeight:800,fontSize:15,color:C.primaryDark,marginBottom:3}}>🌐 আমাদের অন্য অ্যাপ</div>
            <div style={{color:C.textMuted,fontSize:12,marginBottom:14}}>আরও কৃষি টুল ও শেখার প্ল্যাটফর্ম</div>
            <AppsHub/>
          </div>
        )}

        {/* ── DIAGNOSE ─────────────────────────────────────────────── */}
        {activeTab==="diagnose"&&(
          <div>
            <WeatherBar weather={weather} weatherLoading={weatherLoading} locationName={locationName} locationSource={locationSource} onRefresh={refreshWeather}/>
            <SprayingWidget weather={weather} weatherLoading={weatherLoading}/>
            <DiagnosisHistory history={history} onLoad={(h)=>setForm(f=>({...f,crop:h.crop||"",district:h.district||""}))}/>

            {step===1&&(
              <div>
                <div className="ud-editorial-shadow" style={{background:"#fff",borderRadius:28,padding:18,marginBottom:12,border:`1px solid ${C.border}`,overflow:"hidden"}}>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:18,alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:11,color:C.primary,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",marginBottom:8}}>নতুন নির্ণয়</div>
                      <div className="ud-headline" style={{fontWeight:800,fontSize:30,color:C.primaryDark,lineHeight:1.08,marginBottom:10}}>পাতার ছবি দিন, বাকি তথ্য সহজে পূরণ করুন</div>
                      <div style={{fontSize:13,color:C.textMuted,lineHeight:1.75}}>ফসল, জেলা, মৌসুম, লক্ষণ আর ছবি একসাথে দিলে ফল বেশি ভালো আসে। ছবি থাকলে সিস্টেম নিজে ফসল ধরারও চেষ্টা করবে.</div>
                    </div>
                    <div style={{minHeight:240,borderRadius:26,background:"linear-gradient(135deg,#d2e9d0,#f5fbf6)",position:"relative",overflow:"hidden"}}>
                      <div style={{position:"absolute",inset:18,border:`2px solid ${C.primary}55`,borderRadius:20}}>
                        <div style={{position:"absolute",left:12,top:12,width:28,height:28,borderTop:`3px solid ${C.primary}`,borderLeft:`3px solid ${C.primary}`}} />
                        <div style={{position:"absolute",right:12,top:12,width:28,height:28,borderTop:`3px solid ${C.primary}`,borderRight:`3px solid ${C.primary}`}} />
                        <div style={{position:"absolute",left:12,bottom:12,width:28,height:28,borderBottom:`3px solid ${C.primary}`,borderLeft:`3px solid ${C.primary}`}} />
                        <div style={{position:"absolute",right:12,bottom:12,width:28,height:28,borderBottom:`3px solid ${C.primary}`,borderRight:`3px solid ${C.primary}`}} />
                        <div style={{position:"absolute",left:18,right:18,height:2,background:"#9bf7a8",top:"22%",boxShadow:"0 0 18px rgba(26,122,58,0.55)",animation:"scan 3.2s linear infinite"}} />
                      </div>
                      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8}}>
                        <div style={{fontSize:62}}>🍃</div>
                        <div className="ud-headline" style={{fontWeight:800,fontSize:22,color:C.primaryDark}}>পাতা ফ্রেমের মাঝে রাখুন</div>
                        <div style={{fontSize:12,color:C.textMuted}}>ভালো আলো থাকলে ফল বেশি নির্ভুল হয়</div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* crop */}
                <div style={{background:"#fff",borderRadius:16,padding:14,marginBottom:10,border:`1px solid ${C.border}`,boxShadow:C.shadow}}>
                  <div style={{fontWeight:700,fontSize:13,color:C.text,marginBottom:10}}>🌱 ফসল নির্বাচন *</div>
                  {!form.crop&&!showMoreCrops&&<QuickCropRow onSelect={handleCropQuickSelect} selected={form.crop}/>}
                  {form.crop&&!showMoreCrops&&(
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{background:"#f0fdf4",border:`1.5px solid ${C.primary}`,borderRadius:12,padding:"8px 14px",color:C.primaryDark,fontWeight:700,fontSize:13,flex:1}}>✅ {form.crop}</div>
                      <button onClick={()=>{setForm(f=>({...f,crop:""}));setShowMoreCrops(false);}} style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,color:C.danger,padding:"7px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>পরিবর্তন</button>
                    </div>
                  )}
                  {showMoreCrops&&(
                    <div>
                      <button onClick={()=>setShowMoreCrops(false)} style={{background:"none",border:"none",color:C.primary,cursor:"pointer",fontSize:13,marginBottom:8,fontWeight:600}}>← ফিরুন</button>
                      {Object.keys(CROPS).map(group=>(
                        <div key={group} style={{marginBottom:7}}>
                          <button onClick={()=>setExpandedGroup(expandedGroup===group?null:group)} style={{width:"100%",background:expandedGroup===group?"#f0fdf4":C.bgMuted,border:`1px solid ${expandedGroup===group?C.primary:C.border}`,borderRadius:10,padding:"8px 12px",color:C.text,cursor:"pointer",textAlign:"left",fontSize:12,fontWeight:600}}>
                            {group} {expandedGroup===group?"▲":"▼"}
                          </button>
                          {expandedGroup===group&&(
                            <div style={{background:"#fff",border:`1px solid ${C.border}`,borderTop:"none",borderRadius:"0 0 10px 10px",padding:7,maxHeight:190,overflowY:"auto"}}>
                              {CROPS[group].map(crop=>(
                                <div key={crop} onClick={()=>{handleCropQuickSelect(crop);setExpandedGroup(null);}} style={{padding:"6px 10px",cursor:"pointer",fontSize:12,color:C.text,borderRadius:7}} onMouseEnter={e=>e.currentTarget.style.background="#f0fdf4"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>{crop}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Diagnosis Mode Toggle */}
                  <div style={{marginTop:16,paddingTop:12,borderTop:`1px solid ${C.border}`}}>
                    <div style={{fontWeight:600,fontSize:13,color:C.text,marginBottom:8}}>নিদান মোড</div>
                    <div style={{display:"flex",alignItems:"center",gap:16}}>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <label style={{cursor:"pointer",userSelect:"none"}}>
                          <input
                            type="radio"
                            name="diagnosisMode"
                            value="online"
                            checked={diagnosisMode==="online"}
                            onChange={(e)=>setDiagnosisMode(e.target.value)}
                            style={{margin:0,width:16,height:16}}
                          />
                          <span style={{fontSize:11,color:C.text}}>Online (AI-based)</span>
                        </label>
                        <div style={{width:1}}></div>
                        <label style={{cursor:"pointer",userSelect:"none"}}>
                          <input
                            type="radio"
                            name="diagnosisMode"
                            value="offline"
                            checked={diagnosisMode==="offline"}
                            onChange={(e)=>setDiagnosisMode(e.target.value)}
                            style={{margin:0,width:16,height:16}}
                          />
                          <span style={{fontSize:11,color:C.text}}>Offline (Rule-based)</span>
                        </label>
                      </div>
                    </div>
                  
                  </div>
                </div>

                {/* location/season */}
                <div style={{background:"#fff",borderRadius:16,padding:14,marginBottom:10,border:`1px solid ${C.border}`,boxShadow:C.shadow}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                    <div>
                      <label style={labelSt}>📍 জেলা {locationSource&&<span style={{color:C.blue,fontSize:9}}>(auto)</span>}</label>
                      <select value={form.district} onChange={e=>setForm(f=>({...f,district:e.target.value}))} style={selSt}>
                        <option value="">-- জেলা --</option>
                        {DISTRICTS.map(d=><option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelSt}>🗓️ মৌসুম</label>
                      <select value={form.season} onChange={e=>setForm(f=>({...f,season:e.target.value}))} style={selSt}>
                        <option value="">-- মৌসুম --</option>
                        {SEASONS.map(s=><option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={labelSt}>🌿 বৃদ্ধির পর্যায়</label>
                    <select value={form.growthStage} onChange={e=>setForm(f=>({...f,growthStage:e.target.value}))} style={selSt}>
                      <option value="">-- পর্যায় --</option>
                      {GROWTH_STAGES.map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* duration */}
                <div style={{background:"#fff",borderRadius:16,padding:14,marginBottom:10,border:`1px solid ${C.border}`,boxShadow:C.shadow}}>
                  <label style={labelSt}>⏱️ সমস্যার সময়কাল</label>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {DURATION_CHIPS.map(chip=>{const a=form.duration===chip.value;return<button key={chip.label} onClick={()=>setForm(f=>({...f,duration:a?"":chip.value}))} style={{...chipSt,border:`1px solid ${a?C.primary:C.border}`,background:a?"#f0fdf4":"#f8faf8",color:a?C.primaryDark:C.text,fontWeight:a?700:400}}>{chip.label}</button>;})}
                  </div>
                </div>

                {/* area */}
                <div style={{background:"#fff",borderRadius:16,padding:14,marginBottom:10,border:`1px solid ${C.border}`,boxShadow:C.shadow}}>
                  <label style={labelSt}>🗺️ আক্রান্ত এলাকা</label>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {AREA_CHIPS.map(chip=>{const a=form.affectedArea===chip.value;return<button key={chip.label} onClick={()=>setForm(f=>({...f,affectedArea:a?"":chip.value}))} style={{...chipSt,border:`1px solid ${a?C.primary:C.border}`,background:a?"#f0fdf4":"#f8faf8",color:a?C.primaryDark:C.text,fontWeight:a?700:400}}>{chip.label}</button>;})}
                  </div>
                </div>

                {/* symptoms */}
                <div style={{background:"#fff",borderRadius:16,padding:14,marginBottom:10,border:`1px solid ${C.border}`,boxShadow:C.shadow}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:9}}>
                    <label style={{...labelSt,marginBottom:0}}>🩺 লক্ষণ বর্ণনা *</label>
                    {voiceSupported&&<button onClick={isListening?stopListening:startListening} style={{width:40,height:40,borderRadius:"50%",border:`2px solid ${isListening?C.danger:C.primary}`,background:isListening?"#fef2f2":"#f0fdf4",cursor:"pointer",fontSize:17,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{isListening?<span style={{animation:"pulse 1s infinite"}}>⏹</span>:"🎙️"}</button>}
                  </div>
                  {Object.entries(SYMPTOM_CHIPS).map(([group,chips])=>(
                    <div key={group} style={{marginBottom:9}}>
                      <div style={{color:C.textMuted,fontSize:10,fontWeight:700,marginBottom:5,textTransform:"uppercase",letterSpacing:.5}}>{group}</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                        {chips.map(chip=>{const a=form.symptoms.includes(chip.value);return<button key={chip.label} onClick={()=>{if(a)setForm(f=>({...f,symptoms:f.symptoms.replace(chip.value,"").replace(/\n\n+/g,"\n").trim()}));else setForm(f=>({...f,symptoms:f.symptoms?f.symptoms.trimEnd()+"\n"+chip.value:chip.value}));}} style={{...chipSt,border:`1px solid ${a?C.primary:C.border}`,background:a?"#f0fdf4":"#f8faf8",color:a?C.primaryDark:C.textMuted,fontWeight:a?700:400,fontSize:11}}>{a?"✓ ":""}{chip.label}</button>;})}
                      </div>
                    </div>
                  ))}
                  <textarea value={form.symptoms} onChange={e=>setForm(f=>({...f,symptoms:e.target.value}))} placeholder="বিস্তারিত লিখুন বা উপরে ট্যাপ করুন..." rows={3} style={{width:"100%",background:C.bgMuted,border:`1px solid ${isListening?C.danger:C.border}`,borderRadius:10,color:C.text,padding:"9px 12px",fontSize:13,outline:"none",resize:"vertical",marginTop:8,boxSizing:"border-box",lineHeight:1.6}}/>
                </div>

                {/* image */}
                <div style={{background:"#fff",borderRadius:16,padding:14,marginBottom:12,border:`1px solid ${C.border}`,boxShadow:C.shadow}}>
                  <label style={labelSt}>📷 ছবি আপলোড (ঐচ্ছিক)</label>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{display:"none"}}/>
                  <input ref={galleryRef} type="file" accept="image/*" onChange={handleImage} style={{display:"none"}}/>
                  <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleImage} style={{display:"none"}}/>
                  {!image&&(
                    <div style={{marginBottom:12}}>
                      <div style={{padding:"22px 16px",border:`2px dashed ${C.border}`,borderRadius:22,background:"linear-gradient(135deg,#eff5f0,#ffffff)",color:C.textMuted,fontSize:13,display:"flex",flexDirection:"column",alignItems:"center",gap:6,marginBottom:12}}>
                        <span style={{fontSize:34}}>📷</span>
                        <span className="ud-headline" style={{fontWeight:800,fontSize:18,color:C.primaryDark}}>পাতার পরিষ্কার ছবি দিন</span>
                        <span style={{fontSize:11}}>JPG, PNG · সামনে থেকে তুলুন · AI বিশ্লেষণ করবে</span>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}>
                        <button onClick={()=>cameraRef.current?.click()} className="ud-headline" style={{padding:"16px 14px",borderRadius:20,border:"none",background:`linear-gradient(135deg,${C.primary},${C.primaryLight})`,color:"#fff",cursor:"pointer",fontWeight:800,fontSize:15}}>📸 ক্যামেরা</button>
                        <button onClick={()=>galleryRef.current?.click()} className="ud-headline" style={{padding:"16px 14px",borderRadius:20,border:`1px solid ${C.border}`,background:"#fff",color:C.primaryDark,cursor:"pointer",fontWeight:800,fontSize:15}}>🖼️ গ্যালারি</button>
                      </div>
                    </div>
                  )}
                  {image&&(
                    <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:16,padding:"10px 12px",marginBottom:12}}>
                      <div>
                        <div className="ud-headline" style={{fontSize:16,color:C.success,fontWeight:800}}>✅ ছবি যুক্ত হয়েছে</div>
                        <div style={{fontSize:11,color:C.textMuted}}>{analysingCrop?"ফসল চিনে দেখছে...":"AI বিশ্লেষণ প্রস্তুত"}</div>
                      </div>
                      <button onClick={()=>galleryRef.current?.click()} style={{padding:"8px 12px",borderRadius:12,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer",fontWeight:700,flexShrink:0}}>অন্য ছবি</button>
                    </div>
                  )}
                  {!image?(
                    <button onClick={()=>fileRef.current.click()} style={{width:"100%",padding:"18px",border:`2px dashed ${C.border}`,borderRadius:12,background:C.bgMuted,cursor:"pointer",color:C.textMuted,fontSize:13,display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
                      <span style={{fontSize:26}}>📁</span><span style={{fontWeight:600}}>ছবি বেছে নিন</span>
                      <span style={{fontSize:11}}>JPG, PNG · AI বিশ্লেষণ করবে</span>
                    </button>
                  ):(
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <img src={image} alt="preview" style={{width:76,height:76,objectFit:"cover",borderRadius:12,border:`2px solid ${C.primary}`,flexShrink:0}}/>
                      <div style={{flex:1}}><div style={{fontSize:13,color:C.success,fontWeight:700}}>✅ ছবি সংযুক্ত</div><div style={{fontSize:11,color:C.textMuted,marginTop:2}}>AI বিশ্লেষণ হবে</div></div>
                      <button onClick={()=>{setImage(null);setImageBase64(null);}} style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,color:C.danger,padding:"7px 10px",cursor:"pointer",fontSize:13}}>✕</button>
                    </div>
                  )}
                </div>

                {error&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:12,padding:"12px 14px",color:C.danger,marginBottom:10,fontSize:13}}>⚠️ {error}</div>}

                <button onClick={handleSubmit} disabled={loading} style={{width:"100%",padding:"15px",borderRadius:14,border:"none",background:loading?C.border:`linear-gradient(135deg,${C.primaryXDark},${C.primaryLight})`,color:"#fff",fontWeight:800,fontSize:15,cursor:loading?"not-allowed":"pointer",boxShadow:loading?"none":`0 4px 20px ${C.primary}55`,display:"flex",alignItems:"center",justifyContent:"center",gap:9,transition:"all .2s"}}>
                  {loading?<><span style={{display:"inline-block",animation:"spin 1s linear infinite",fontSize:17}}>⟳</span>বিশ্লেষণ হচ্ছে...</>:<><span style={{fontSize:18}}>🔍</span>রোগ নির্ণয় করুন</>}
                </button>
              </div>
            )}

            {/* ── RESULT ──────────────────────────────────────────────── */}
            {step===2&&result&&(
              <div ref={resultRef} style={{animation:"slideUp .4s ease"}}>
                <div className="ud-editorial-shadow" style={{background:"#fff",borderRadius:28,padding:18,marginBottom:12,border:`1px solid ${C.border}`,overflow:"hidden"}}>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:18,alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:11,color:C.primary,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",marginBottom:8}}>নির্ণয় সম্পন্ন</div>
                      <div className="ud-headline" style={{fontWeight:800,fontSize:30,color:C.primaryDark,lineHeight:1.08,marginBottom:10}}>{form.crop?.split("/")[0]?.trim()||"ফসল"} এর জন্য সহজ রিপোর্ট</div>
                      <div style={{fontSize:13,color:C.textMuted,lineHeight:1.75}}>কোন সমস্যা বেশি মনে হচ্ছে, কী লক্ষণ দেখা গেছে, আর এখন কী করলে ক্ষতি কমবে তা নিচে কার্ড আকারে সাজানো আছে.</div>
                    </div>
                    <div style={{minHeight:220,borderRadius:26,background:"linear-gradient(135deg,#d2e9d0,#f5fbf6)",position:"relative",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {image?<img src={image} alt="diagnosis preview" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{fontSize:64}}>🍃</div>}
                      <div style={{position:"absolute",inset:18,border:"2px solid rgba(255,255,255,0.7)",borderRadius:20}} />
                      <div style={{position:"absolute",top:18,right:18,padding:"7px 12px",borderRadius:999,background:"rgba(0,96,40,0.88)",color:"#fff",fontSize:11,fontWeight:800}}>বিশ্লেষণ শেষ</div>
                    </div>
                  </div>
                </div>
                <div style={{background:"#fff",borderRadius:16,padding:14,marginBottom:10,border:`1px solid ${C.border}`,boxShadow:C.shadow}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
                    <div style={{width:38,height:38,borderRadius:10,background:"linear-gradient(135deg,#f0fdf4,#dcfce7)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>📋</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:800,fontSize:15,color:C.primaryDark}}>রোগ নির্ণয় প্রতিবেদন</div>
                      <div style={{fontSize:11,color:C.textMuted}}>{form.crop?.split("/")[0]?.trim()} · {form.district?.split("/")[0]?.trim()||locationName}</div>
                    </div>
                    {provider&&<span style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:20,padding:"3px 9px",color:C.blue,fontSize:10,fontWeight:700}}>{provider}</span>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
                    <div style={{display:"flex",background:C.bgMuted,borderRadius:20,padding:3,gap:2}}>
                      <button onClick={()=>{setShowEnglish(false);stopSpeaking();}} style={{borderRadius:16,padding:"5px 14px",border:"none",cursor:"pointer",fontSize:12,fontWeight:700,background:!showEnglish?C.primary:"transparent",color:!showEnglish?"#fff":C.textMuted,transition:"all .2s"}}>বাংলা</button>
                      <button onClick={()=>{setShowEnglish(true);stopSpeaking();}} style={{borderRadius:16,padding:"5px 14px",border:"none",cursor:"pointer",fontSize:12,fontWeight:700,background:showEnglish?C.primary:"transparent",color:showEnglish?"#fff":C.textMuted,transition:"all .2s"}}>English</button>
                    </div>
                    {ttsSupported&&<button onClick={()=>isSpeaking?stopSpeaking():speakResult(showEnglish?result.en:result.bn)} style={{width:36,height:36,borderRadius:"50%",border:`2px solid ${isSpeaking?C.warning:C.primary}`,background:isSpeaking?"#fffbeb":"#f0fdf4",cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{isSpeaking?"⏹":"🔊"}</button>}
                    {weather&&<span style={{background:"#f0f9ff",border:"1px solid #bae6fd",borderRadius:20,padding:"3px 8px",color:"#0369a1",fontSize:10}}>🌡️{weather.temp}°C·💧{weather.humidity}%</span>}
                  </div>
                </div>

                {(()=>{
                  const text=simplifyFarmerText(showEnglish?(result.en||""):(result.bn||result.en||""));
                  if(!text)return<div style={{color:C.textMuted,textAlign:"center",padding:20}}>ফলাফল পাওয়া যায়নি।</div>;
                  const highlights=extractResultHighlights(text);
                  const sections=parseIntoSections(text);
                  if(sections.length<=1&&!sections[0]?.title)return<div style={{background:"#fff",borderRadius:14,padding:16,color:C.text,fontSize:13.5,lineHeight:1.85,border:`1px solid ${C.border}`,boxShadow:C.shadow}}>{renderInline(text)}</div>;
                  if(highlights.length>0){
                    return<>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,marginBottom:10}}>
                        {highlights.map(item=>(
                          <div key={item.label} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:14,padding:14,boxShadow:C.shadow}}>
                            <div style={{fontSize:20,marginBottom:8}}>{item.icon}</div>
                            <div style={{fontSize:11,color:C.textMuted,marginBottom:4}}>{item.label}</div>
                            <div style={{fontWeight:700,fontSize:13,color:C.text,lineHeight:1.5}}>{item.value}</div>
                          </div>
                        ))}
                      </div>
                      {sections.map((sec,i)=><SectionCard key={i} title={sec.title} bodyLines={sec.body} defaultOpen={i<3}/>)}
                    </>;
                  }
                  return sections.map((sec,i)=><SectionCard key={i} title={sec.title} bodyLines={sec.body} defaultOpen={i<3}/>);
                })()}

                {recommendedProducts.length>0&&<ProductRecommendations products={recommendedProducts} crop={form.crop}/>}

                {!severity?(
                  <div style={{background:"#fff",borderRadius:16,padding:18,marginTop:10,border:`1px solid ${C.border}`,boxShadow:C.shadow}}><SeveritySurvey onSubmit={s=>setSeverity(s)}/></div>
                ):(
                  <div style={{background:"#f0fdf4",borderRadius:12,padding:"11px 14px",marginTop:10,border:"1px solid #bbf7d0",fontSize:13,color:C.success,fontWeight:700}}>✅ তীব্রতা নথিভুক্ত: {severity}</div>
                )}

                <div style={{marginTop:10,padding:"10px 14px",background:"#fffbeb",border:"1px solid #fed7aa",borderRadius:12,color:C.warning,fontSize:12}}>⚠️ এই রিপোর্ট প্রাথমিক গাইডেন্সের জন্য। চূড়ান্ত সিদ্ধান্তে DAE কর্মকর্তার পরামর্শ নিন।</div>
                <button onClick={reset} style={{width:"100%",marginTop:10,padding:"13px",borderRadius:14,border:`1px solid ${C.border}`,background:"#fff",color:C.text,fontWeight:600,fontSize:14,cursor:"pointer",boxShadow:C.shadow}}>🔁 নতুন রোগ নির্ণয়</button>
              </div>
            )}
          </div>
        )}

        {/* ── GUIDE ────────────────────────────────────────────────── */}
        {activeTab==="guide"&&(
          <div className="ud-editorial-shadow" style={{background:"#fff",borderRadius:28,padding:20,border:`1px solid ${C.border}`,boxShadow:C.shadow}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <div style={{width:42,height:42,borderRadius:11,overflow:"hidden",flexShrink:0}}><img src="/cabi-logo.jpg" alt="CABI" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>
              <div><div style={{fontWeight:800,fontSize:15,color:C.primaryDark}}>CABI Plantwise গাইড</div><div style={{color:C.textMuted,fontSize:11}}>সম্পূর্ণ রোগ নির্ণয় প্রোটোকল</div></div>
            </div>
            <CABIGuideTab/>
          </div>
        )}

        {/* ── LIBRARY ──────────────────────────────────────────────── */}
        {activeTab==="library"&&(
          <div className="ud-editorial-shadow" style={{background:"#fff",borderRadius:28,padding:20,border:`1px solid ${C.border}`,boxShadow:C.shadow}}>
            <div style={{fontWeight:800,fontSize:15,color:C.primaryDark,marginBottom:3}}>📚 তথ্যভাণ্ডার</div>
            <div style={{color:C.textMuted,fontSize:12,marginBottom:14}}>পোকামাকড়, রোগ ও পুষ্টি অভাব</div>
            <EnhancedLibrarySection/>
          </div>
        )}

        {/* ── GAME HUB ─────────────────────────────────────────────── */}
        {activeTab==="game"&&<GameHub/>}

        {/* ── HISTORY ──────────────────────────────────────────────── */}
        {activeTab==="history"&&(
          <div className="ud-editorial-shadow" style={{background:"#fff",borderRadius:28,padding:20,border:`1px solid ${C.border}`,boxShadow:C.shadow}}>
            <div style={{fontSize:11,color:C.primary,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",marginBottom:6}}>History</div>
            <div style={{fontWeight:800,fontSize:15,color:C.primaryDark,marginBottom:14}}>📋 নির্ণয়ের ইতিহাস</div>
            {history.length===0?(
              <div style={{textAlign:"center",padding:"40px 0",color:C.textMuted}}>
                <div style={{fontSize:48,marginBottom:12,animation:"float 2s ease-in-out infinite"}}>🌾</div>
                <div style={{fontWeight:700,fontSize:15}}>এখনো কোনো নির্ণয় নেই</div>
                <div style={{fontSize:12,marginTop:4}}>প্রথম নির্ণয় করুন!</div>
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:9}}>
                {[...history].reverse().map((h,i)=>(
                  <div key={i} style={{padding:"16px",background:C.bgMuted,borderRadius:20,border:`1px solid ${C.border}`,boxShadow:"0 6px 18px rgba(0,33,9,0.05)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                      <div className="ud-headline" style={{fontWeight:800,fontSize:17,color:C.text}}>{h.crop?.split("/")[0]?.trim()}</div>
                      <span style={{background:"#dcfce7",color:"#166534",borderRadius:10,padding:"2px 9px",fontSize:11,fontWeight:700}}>সম্পন্ন</span>
                    </div>
                    <div style={{color:C.textMuted,fontSize:11}}>📍 {h.district?.split("/")[0]?.trim()||"—"} · 📅 {h.date}</div>
                    {h.resultPreview&&<div style={{color:C.textLight,fontSize:12,marginTop:8,lineHeight:1.6,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{h.resultPreview}...</div>}
                  </div>
                ))}
                <button onClick={()=>{setHistory([]);try{localStorage.removeItem("ud-history");}catch{}}} style={{padding:"9px",borderRadius:10,border:"1px solid #fecaca",background:"#fef2f2",color:C.danger,cursor:"pointer",fontSize:12,fontWeight:600,marginTop:3}}>🗑️ সব ইতিহাস মুছুন</button>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

        {!isGameTab&&<FeedbackPanel context={feedbackContext} summary={feedbackSummary} userEmail={userEmail} onEmailChange={setUserEmail} visitorStats={visitorStats} visitorId={visitorId}/>}
       {/* Footer - Optimized for better spacing */}
       {!isGameTab&&<div style={{textAlign:"center",padding:"8px 4px",color:C.textLight,fontSize:10,borderTop:`1px solid ${C.border}`,background:"#fff",letterSpacing:0.5}}>
         উদ্ভিদ গোয়েন্দা · CABI Plantwise · BRRI · BARI · DAE Bangladesh
       </div>}
    </div>
  );
}
