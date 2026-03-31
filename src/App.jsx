import { useState, useRef, useEffect, useCallback } from "react";

// ─── Global styles ────────────────────────────────────────────────────────────
const GLOBAL_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{font-family:'Inter','Noto Sans Bengali',sans-serif;background:#f5fbf6;color:#171d1a;overflow-x:hidden;-webkit-tap-highlight-color:transparent}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
  @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
  @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
  @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
  @keyframes popIn{0%{transform:scale(.85);opacity:0}70%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}
  @keyframes glow{0%,100%{box-shadow:0 0 8px rgba(26,122,58,0.3)}50%{box-shadow:0 0 20px rgba(26,122,58,0.6)}}
  @keyframes scan{0%{transform:translateY(-120px)}100%{transform:translateY(260px)}}
  ::-webkit-scrollbar{width:3px;height:3px}
  ::-webkit-scrollbar-thumb{background:#2d9d52;border-radius:4px}
  input,select,textarea,button{font-family:inherit}
  button:active{transform:scale(0.97)}
  .ud-headline{font-family:'Plus Jakarta Sans','Noto Sans Bengali',sans-serif}
  .ud-editorial-shadow{box-shadow:0 16px 44px rgba(0,33,9,0.10)}
`;
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
      <div style={{background:`linear-gradient(135deg,${C.primaryXDark},${C.primary},${C.primaryLight})`,borderRadius:24,padding:24,color:"#fff",position:"relative",overflow:"hidden"}}>
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
  const highlights=[
    {icon:"📸",title:"ছবি তুলে রোগ ধরুন",desc:"পাতার ছবি দিন, সিস্টেম ফসল আন্দাজ করবে, তারপর সহজ রিপোর্ট দেখাবে.",action:"নির্ণয়ে যান",tab:"diagnose"},
    {icon:"📚",title:"চিত্রভিত্তিক তথ্যঘর",desc:"ভিডিও, স্লাইড, পুরো PDF আর অডিও একই ট্যাবে সাজানো আছে.",action:"তথ্যভাণ্ডার খুলুন",tab:"library"},
    {icon:"🌐",title:"অন্য কৃষি অ্যাপ",desc:"Krishi AI, GAP Brinjal, GreenLoop ও আরও সেবা একসাথে খুলুন.",action:"অ্যাপস দেখুন",tab:"apps"},
  ];
  const risk=weather?assessWeatherRisks(weather)[0]:null;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:18,animation:"fadeIn .3s ease"}}>
      <div className="ud-editorial-shadow" style={{background:`linear-gradient(135deg,${C.primaryXDark},${C.primary},${C.primaryLight})`,borderRadius:32,padding:"26px 24px",color:"#fff",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",right:-18,top:-20,fontSize:130,opacity:.08}}>🌿</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:24,alignItems:"center",position:"relative"}}>
          <div>
            <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"7px 12px",borderRadius:999,background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.18)",fontSize:11,fontWeight:700,letterSpacing:.3,marginBottom:14}}>AI কৃষি সহকারী</div>
            <div className="ud-headline" style={{fontWeight:800,fontSize:36,lineHeight:1.05,letterSpacing:-1.2,marginBottom:10}}>পাতার ছবি থেকে দ্রুত সমস্যা ধরুন</div>
            <div style={{fontSize:14.5,lineHeight:1.8,opacity:.92,marginBottom:16,maxWidth:560}}>কৃষকের ভাষায় রোগ, পোকা, খাবারের ঘাটতি, আবহাওয়ার ঝুঁকি আর করণীয় একসাথে দেখুন। জেলা ও মৌসুমও আগে থেকেই বসে যাবে.</div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              <button onClick={()=>setActiveTab("diagnose")} className="ud-headline" style={{background:"#fff",color:C.primaryDark,border:"none",borderRadius:999,padding:"13px 20px",fontWeight:800,cursor:"pointer",boxShadow:"0 10px 24px rgba(0,0,0,0.12)"}}>📸 ছবি দিয়ে শুরু</button>
              <button onClick={()=>setActiveTab("library")} className="ud-headline" style={{background:"rgba(255,255,255,0.12)",color:"#fff",border:"1px solid rgba(255,255,255,0.24)",borderRadius:999,padding:"13px 20px",fontWeight:700,cursor:"pointer"}}>📚 শেখার লাইব্রেরি</button>
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"center"}}>
            <button onClick={()=>setActiveTab("diagnose")} style={{width:"100%",maxWidth:320,aspectRatio:"1 / 1",borderRadius:28,border:"4px solid rgba(255,255,255,0.16)",background:"linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.05))",padding:18,cursor:"pointer",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",inset:18,border:"2px solid rgba(255,255,255,0.4)",borderRadius:22}}>
                <div style={{position:"absolute",left:14,top:14,width:28,height:28,borderTop:"3px solid #fff",borderLeft:"3px solid #fff"}} />
                <div style={{position:"absolute",right:14,top:14,width:28,height:28,borderTop:"3px solid #fff",borderRight:"3px solid #fff"}} />
                <div style={{position:"absolute",left:14,bottom:14,width:28,height:28,borderBottom:"3px solid #fff",borderLeft:"3px solid #fff"}} />
                <div style={{position:"absolute",right:14,bottom:14,width:28,height:28,borderBottom:"3px solid #fff",borderRight:"3px solid #fff"}} />
                <div style={{position:"absolute",left:18,right:18,height:2,background:"rgba(170,255,181,0.95)",top:"22%",boxShadow:"0 0 18px rgba(155,247,168,0.85)",animation:"scan 3.2s linear infinite"}} />
              </div>
              <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,color:"#fff"}}>
                <div style={{fontSize:64}}>🌱</div>
                <div className="ud-headline" style={{fontWeight:800,fontSize:22}}>Ready to scan</div>
                <div style={{fontSize:12,opacity:.9}}>পাতা মাঝখানে রাখুন</div>
              </div>
            </button>
          </div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:14}}>
        {highlights.map(card=>(
          <button key={card.title} onClick={()=>setActiveTab(card.tab)} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:24,padding:20,textAlign:"left",cursor:"pointer",boxShadow:C.shadow}}>
            <div style={{fontSize:28,marginBottom:10}}>{card.icon}</div>
            <div className="ud-headline" style={{fontWeight:800,fontSize:18,color:C.primaryDark,marginBottom:6}}>{card.title}</div>
            <div style={{fontSize:12.5,color:C.textMuted,lineHeight:1.65,marginBottom:12}}>{card.desc}</div>
            <div style={{fontSize:12,color:C.primary,fontWeight:700}}>{card.action} →</div>
          </button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14}}>
        <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:24,padding:18,boxShadow:C.shadow}}>
          <div style={{fontSize:12,color:C.textMuted,marginBottom:6}}>📍 আপনার এলাকা</div>
          <div className="ud-headline" style={{fontWeight:800,fontSize:18,color:C.text}}>{locationName||"অবস্থান সংগ্রহ হচ্ছে..."}</div>
          <div style={{fontSize:12,color:C.textMuted,marginTop:6}}>জেলা স্বয়ংক্রিয়ভাবে ভরার চেষ্টা করা হয়.</div>
        </div>
        <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:24,padding:18,boxShadow:C.shadow}}>
          <div style={{fontSize:12,color:C.textMuted,marginBottom:6}}>🗓️ বর্তমান মৌসুম</div>
          <div className="ud-headline" style={{fontWeight:800,fontSize:18,color:C.text}}>{getCurrentSeason().split("/")[0].trim()}</div>
          <div style={{fontSize:12,color:C.textMuted,marginTop:6}}>তারিখ অনুযায়ী Detection tab-এ আগেই বসে যাবে.</div>
        </div>
        <div style={{background:risk?"linear-gradient(135deg,#ffffff,#eff6ff)":"#fff",border:`1px solid ${C.border}`,borderRadius:24,padding:18,boxShadow:C.shadow}}>
          <div style={{fontSize:12,color:C.textMuted,marginBottom:6}}>🌦️ আজকের ঝুঁকি</div>
          <div className="ud-headline" style={{fontWeight:800,fontSize:18,color:C.text}}>{risk?.text||"আবহাওয়া আনা হচ্ছে..."}</div>
          {weather&&<div style={{fontSize:12,color:C.textMuted,marginTop:6}}>তাপমাত্রা {weather.temp}°C · আর্দ্রতা {weather.humidity}%</div>}
        </div>
      </div>
      {history.length>0&&(
        <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:28,padding:18,boxShadow:C.shadow}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"end",gap:10,marginBottom:12,flexWrap:"wrap"}}>
            <div className="ud-headline" style={{fontWeight:800,fontSize:22,color:C.primaryDark}}>সাম্প্রতিক নির্ণয়</div>
            <button onClick={()=>setActiveTab("history")} style={{background:"none",border:"none",color:C.primary,fontWeight:700,cursor:"pointer"}}>সব দেখুন</button>
          </div>
          <div style={{display:"flex",gap:12,overflowX:"auto",paddingBottom:4,scrollbarWidth:"none"}}>
            {[...history].reverse().slice(0,4).map((item,index)=>(
              <div key={index} style={{background:C.bgMuted,border:`1px solid ${C.border}`,borderRadius:22,padding:14,minWidth:210}}>
                <div style={{width:"100%",height:120,borderRadius:18,background:"linear-gradient(135deg,#d2e9d0,#f5fbf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,marginBottom:12}}>🌿</div>
                <div className="ud-headline" style={{fontWeight:800,fontSize:16,color:C.text,marginBottom:4}}>{item.crop?.split("/")[0]?.trim()||"ফসল"}</div>
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
  const sections=[{id:"protocol",label:"প্রোটোকল",icon:"📋"},{id:"etl",label:"ETL সীমা",icon:"📊"},{id:"nutrients",label:"পুষ্টি",icon:"🧪"},{id:"ipm",label:"IPM পিরামিড",icon:"🌿"},{id:"resistance",label:"প্রতিরোধ",icon:"🔄"}];
  const resistanceData={
    frac:[
      {group:"FRAC 1 (MBC)",ai:"কার্বেন্ডাজিম, থিওফানেট",risk:"উচ্চ",rotate:"FRAC 3 বা 11 এর সাথে"},
      {group:"FRAC 3 (Triazole)",ai:"ট্রাইসাইক্লাজোল, হেক্সাকোনাজোল",risk:"মাঝারি",rotate:"FRAC 11 বা 7 এর সাথে"},
      {group:"FRAC 4 (PA)",ai:"মেটালাক্সিল-এম",risk:"উচ্চ",rotate:"FRAC M3 (মানকোজেব) মিশিয়ে"},
      {group:"FRAC 11 (Strobilurin)",ai:"আজোক্সিস্ট্রোবিন, ট্রাইফ্লোক্সিস্ট্রোবিন",risk:"উচ্চ",rotate:"FRAC 3 সাথে, মৌসুমে ২ বার"},
      {group:"FRAC M3 (Dithiocarbamate)",ai:"মানকোজেব, জিনেব",risk:"কম",rotate:"যেকোনো সিস্টেমিকের সাথে"},
    ],
    irac:[
      {group:"IRAC 1A (Organophosphate)",ai:"ক্লোরপাইরিফস, ডাইমিথোয়েট",risk:"মাঝারি",rotate:"IRAC 3 বা 4 এর সাথে"},
      {group:"IRAC 3 (Pyrethroid)",ai:"সাইপারমেথ্রিন, ডেলটামেথ্রিন",risk:"উচ্চ",rotate:"IRAC 1 বা 4 এর সাথে"},
      {group:"IRAC 4A (Neonicotinoid)",ai:"ইমিডাক্লোপ্রিড, থিয়ামেথোক্সাম",risk:"উচ্চ",rotate:"IRAC 22 বা 28; মৌমাছি সতর্কতা"},
      {group:"IRAC 22 (Pymetrozine)",ai:"পাইমেট্রোজিন",risk:"কম",rotate:"নিওনিকোটিনয়েডের বিকল্প"},
      {group:"IRAC 28 (Diamide)",ai:"ক্লোরান্ট্রানিলিপ্রোল",risk:"মাঝারি",rotate:"মৌসুমে ২ বারের বেশি নয়"},
    ]
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
                <div style={{background:"#fef2f2",borderRadius:8,padding:9}}><div style={{fontSize:10,fontWeight:700,color:C.danger,marginBottom:3}}>🔴 অভাব</div><div style={{fontSize:11,color:C.text,lineHeight:1.6}}>{n.deficiency}</div></div>
                <div style={{background:"#fff7ed",borderRadius:8,padding:9}}><div style={{fontSize:10,fontWeight:700,color:C.warning,marginBottom:3}}>🟡 আধিক্য</div><div style={{fontSize:11,color:C.text,lineHeight:1.6}}>{n.excess}</div></div>
              </div>
              <div style={{background:"#f0fdf4",borderRadius:8,padding:9,marginBottom:7}}><div style={{fontSize:10,fontWeight:700,color:C.success,marginBottom:2}}>✅ প্রতিকার</div><div style={{fontSize:12,color:C.text,lineHeight:1.6}}>{n.fix}</div></div>
              <div style={{fontSize:11,color:C.textMuted}}>🌾 {n.crops.join(", ")}</div>
            </div>
          ))}
        </div>
      )}
      {section==="ipm"&&(
        <div>
          <div style={{background:`linear-gradient(135deg,${C.primaryXDark},${C.primary})`,borderRadius:16,padding:18,marginBottom:12,color:"#fff"}}><div style={{fontWeight:800,fontSize:15,marginBottom:3}}>🌿 IPM পিরামিড</div><div style={{opacity:.8,fontSize:12}}>Integrated Pest Management — সমন্বিত বালাই ব্যবস্থাপনা</div></div>
          {[...CABI_GUIDE.ipm_pyramid].reverse().map((level,i)=>(
            <div key={i} style={{background:"#fff",borderRadius:12,padding:14,marginBottom:9,border:`1px solid ${C.border}`,borderLeft:`4px solid ${level.color}`,boxShadow:C.shadow}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:9}}>
                <div style={{width:30,height:30,borderRadius:"50%",background:level.color+"20",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:13,color:level.color,flexShrink:0}}>{level.level}</div>
                <div style={{fontWeight:700,fontSize:13,color:level.color,flex:1}}>{level.label}</div>
                {level.level===4&&<span style={{background:"#fef2f2",border:"1px solid #fecaca",color:C.danger,borderRadius:10,padding:"1px 7px",fontSize:10,fontWeight:700}}>শেষ উপায়</span>}
                {level.level===1&&<span style={{background:"#f0fdf4",border:"1px solid #bbf7d0",color:C.success,borderRadius:10,padding:"1px 7px",fontSize:10,fontWeight:700}}>সবার আগে</span>}
              </div>
              {level.items.map((item,j)=>(
                <div key={j} style={{display:"flex",gap:8,padding:"4px 0",borderBottom:j<level.items.length-1?`1px dashed ${C.border}`:"none"}}><span style={{color:level.color,fontWeight:700,flexShrink:0}}>✓</span><span style={{fontSize:12,color:C.text}}>{item}</span></div>
              ))}
            </div>
          ))}
        </div>
      )}
      {section==="resistance"&&(
        <div>
          <div style={{background:"#fff7ed",borderRadius:12,padding:12,marginBottom:12,border:"1px solid #fed7aa"}}><div style={{fontWeight:700,fontSize:13,color:C.warning,marginBottom:3}}>🔄 প্রতিরোধ ব্যবস্থাপনা</div><div style={{fontSize:12,color:C.text,lineHeight:1.7}}>একই গ্রুপের কীটনাশক বারবার ব্যবহারে প্রতিরোধ গড়ে ওঠে।</div></div>
          {["frac","irac"].map(type=>(
            <div key={type}>
              <div style={{fontWeight:700,fontSize:14,color:C.primaryDark,margin:"12px 0 8px"}}>{type==="frac"?"ছত্রাকনাশক (FRAC)":"কীটনাশক (IRAC)"}</div>
              {resistanceData[type].map((f,i)=>(
                <div key={i} style={{background:"#fff",borderRadius:10,padding:12,marginBottom:7,border:`1px solid ${C.border}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
                    <div style={{fontWeight:700,fontSize:12,color:C.text,flex:1}}>{f.group}</div>
                    <span style={{background:f.risk==="উচ্চ"?"#fef2f2":f.risk==="কম"?"#f0fdf4":"#fffbeb",border:`1px solid ${f.risk==="উচ্চ"?"#fecaca":f.risk==="কম"?"#bbf7d0":"#fed7aa"}`,color:f.risk==="উচ্চ"?C.danger:f.risk==="কম"?C.success:C.warning,borderRadius:10,padding:"1px 7px",fontSize:10,fontWeight:700,flexShrink:0,marginLeft:6}}>{f.risk}</span>
                  </div>
                  <div style={{fontSize:11,color:C.textMuted,marginBottom:3}}>উদাহরণ: {f.ai}</div>
                  <div style={{fontSize:11,color:C.primary,fontWeight:600}}>🔄 {f.rotate}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 🎮 GAME HUB ─────────────────────────────────────────────────────────────
function GameHub(){
  const[activeGame,setActiveGame]=useState(null);
  const[gameLoaded,setGameLoaded]=useState(false);
  const[gameErr,setGameErr]=useState(false);
  const[gameViewportWidth,setGameViewportWidth]=useState(()=>typeof window!=="undefined"?window.innerWidth:1280);

  useEffect(()=>{
    if(typeof window==="undefined")return;
    const onResize=()=>setGameViewportWidth(window.innerWidth);
    onResize();
    window.addEventListener("resize",onResize);
    return()=>window.removeEventListener("resize",onResize);
  },[]);

  const GAMES=[
    {
      id:"dhan-doctor",
      title:"ধানের ডাক্তার",
      subtitle:"Dhan Doctor Simulation",
      desc:"ধানের ৫টি প্রধান রোগ চিহ্নিত করুন এবং সঠিক চিকিৎসা দিন। বাস্তব মাঠের পরিস্থিতি থেকে শিখুন।",
      icon:"🌾",
      color:C.game2,
      bg:"linear-gradient(135deg,#0c4a6e,#0891b2)",
      tags:["ধান","রোগ নির্ণয়","IPM"],
      difficulty:"মধ্যম",
      duration:"১৫-২০ মিনিট",
      src:"https://game-diagnosis.space.z.ai/",
      badge:"🏆 ৩টি সিমুলেশন",
    },
    {
      id:"smart-krishok",
      title:"স্মার্ট কৃষক ৩.০",
      subtitle:"Smart Farmer Decision Game",
      desc:"কৃষি সিদ্ধান্ত গ্রহণের দক্ষতা বাড়ান। ফসল ব্যবস্থাপনা, সার প্রয়োগ ও বাজার দর বিশ্লেষণ।",
      icon:"👨‍🌾",
      color:C.game1,
      bg:"linear-gradient(135deg,#4c1d95,#7c3aed)",
      tags:["কৃষি সিদ্ধান্ত","অর্থনীতি","সার"],
      difficulty:"কঠিন",
      duration:"২০-৩০ মিনিট",
      src:"https://game-diagnosis.space.z.ai/",
      badge:"⭐ নতুন সংস্করণ",
    },
    {
      id:"plant-clinic",
      title:"প্ল্যান্ট ক্লিনিক",
      subtitle:"Plant Clinic Simulation",
      desc:"কৃষকের সমস্যা শুনুন, লক্ষণ বিশ্লেষণ করুন এবং বিশেষজ্ঞ পরামর্শ দিন। CABI প্রোটোকল অনুশীলন।",
      icon:"🏥",
      color:C.game3,
      bg:"linear-gradient(135deg,#7c2d12,#ea580c)",
      tags:["CABI","পরামর্শ","IPM"],
      difficulty:"সহজ",
      duration:"১০-১৫ মিনিট",
      src:"https://game-diagnosis.space.z.ai/",
      badge:"🌱 শুরু করুন",
    },
  ];
  const gameStageDesktop=gameViewportWidth>=980;
  const gameStageTablet=gameViewportWidth>=700;

  if(activeGame){
    const game=GAMES.find(g=>g.id===activeGame);
    return(
      <div style={{position:"fixed",inset:0,zIndex:220,background:"linear-gradient(180deg,#03160b 0%, #052412 34%, #eef6ef 34%, #f5fbf6 100%)",display:"flex",flexDirection:"column"}}>
        <div style={{position:"absolute",top:-120,right:-80,width:320,height:320,borderRadius:"50%",background:`radial-gradient(circle, ${game.color}55 0%, transparent 70%)`,pointerEvents:"none"}} />
        <div style={{position:"absolute",left:-120,bottom:-120,width:280,height:280,borderRadius:"50%",background:"radial-gradient(circle, rgba(26,122,58,0.15) 0%, transparent 72%)",pointerEvents:"none"}} />
        {/* game header */}
        <div style={{display:"flex",alignItems:gameStageTablet?"center":"flex-start",gap:12,padding:gameStageTablet?"16px 18px 10px":"12px 12px 8px",flexShrink:0,flexWrap:"wrap",position:"relative",zIndex:1}}>
          <button onClick={()=>{setActiveGame(null);setGameLoaded(false);setGameErr(false);}} style={{width:36,height:36,borderRadius:10,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0,boxShadow:C.shadow}}>←</button>
          <div style={{flex:"1 1 260px",minWidth:0,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:20,padding:gameStageTablet?"12px 14px":"10px 12px",backdropFilter:"blur(18px)"}}>
            <div style={{fontWeight:800,fontSize:gameStageTablet?18:15,color:"#fff"}}>{game.icon} {game.title}</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.72)",marginTop:4}}>{game.subtitle}</div>
          </div>
          <a href={game.src} target="_blank" rel="noreferrer" style={{padding:"6px 12px",borderRadius:10,background:game.color,color:"#fff",textDecoration:"none",fontSize:12,fontWeight:700,flexShrink:0,boxShadow:C.shadow}}>↗ খুলুন</a>
        </div>
        {/* loading state */}
        {!gameLoaded&&!gameErr&&(
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#fff",borderRadius:16,border:`1px solid ${C.border}`,gap:14,padding:24}}>
            <div style={{fontSize:48,animation:"float 2s ease-in-out infinite"}}>{game.icon}</div>
            <div style={{textAlign:"center"}}>
              <div style={{fontWeight:800,fontSize:16,color:C.primaryDark,marginBottom:4}}>{game.title}</div>
              <div style={{color:C.textMuted,fontSize:13}}>{game.subtitle}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,color:C.textMuted,fontSize:12}}>
              <span style={{display:"inline-block",animation:"spin 1s linear infinite",fontSize:16}}>⟳</span>গেম লোড হচ্ছে...
            </div>
          </div>
        )}
        {gameErr&&(
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#fff",borderRadius:16,border:`1px solid ${C.border}`,gap:12,padding:24,textAlign:"center"}}>
            <div style={{fontSize:40}}>{game.icon}</div>
            <div style={{fontWeight:700,fontSize:15,color:C.text}}>গেম লোড হয়নি</div>
            <div style={{color:C.textMuted,fontSize:13}}>সরাসরি ব্রাউজারে খুলুন:</div>
            <a href={game.src} target="_blank" rel="noreferrer" style={{background:game.color,color:"#fff",padding:"12px 24px",borderRadius:12,textDecoration:"none",fontWeight:700,fontSize:14,boxShadow:C.shadowMd}}>🎮 {game.title} খেলুন →</a>
          </div>
        )}
        <iframe
          key={activeGame}
          src={game.src}
          title={game.title}
          style={{flex:1,width:"100%",border:"none",borderRadius:16,display:gameLoaded&&!gameErr?"block":"none",boxShadow:C.shadowMd}}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; microphone"
          onLoad={()=>setGameLoaded(true)}
          onError={()=>setGameErr(true)}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        />
      </div>
    );
  }

  // Game hub home
  return(
    <div style={{animation:"fadeIn .3s ease"}}>
      {/* Hero banner */}
      <div style={{background:`linear-gradient(135deg,${C.primaryXDark} 0%,${C.primary} 60%,${C.primaryLight} 100%)`,borderRadius:20,padding:22,marginBottom:16,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-20,right:-20,fontSize:80,opacity:.15,transform:"rotate(15deg)"}}>🎮</div>
        <div style={{position:"relative"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <div style={{width:40,height:40,borderRadius:12,overflow:"hidden",flexShrink:0,boxShadow:"0 2px 8px rgba(0,0,0,0.3)"}}>
              <img src="/cabi-logo.png" alt="CABI" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            </div>
            <div>
              <div style={{color:"#fff",fontWeight:800,fontSize:16,lineHeight:1.2}}>উদ্ভিদ গোয়েন্দা</div>
              <div style={{color:"rgba(255,255,255,0.75)",fontSize:11}}>কৃষি শিক্ষা গেম হাব</div>
            </div>
          </div>
          <p style={{color:"rgba(255,255,255,0.9)",fontSize:13,lineHeight:1.6,marginBottom:12}}>খেলার ছলে শিখুন — ধানের রোগ নির্ণয়, কৃষি সিদ্ধান্ত, এবং CABI প্ল্যান্ট ক্লিনিক পরামর্শ পদ্ধতি।</p>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <div style={{background:"rgba(255,255,255,0.15)",backdropFilter:"blur(8px)",borderRadius:10,padding:"6px 12px",fontSize:11,color:"#fff",fontWeight:600}}>🎮 ৩টি সিমুলেশন</div>
            <div style={{background:"rgba(255,255,255,0.15)",backdropFilter:"blur(8px)",borderRadius:10,padding:"6px 12px",fontSize:11,color:"#fff",fontWeight:600}}>🌾 বাংলায়</div>
            <div style={{background:"rgba(255,255,255,0.15)",backdropFilter:"blur(8px)",borderRadius:10,padding:"6px 12px",fontSize:11,color:"#fff",fontWeight:600}}>📱 মোবাইল বান্ধব</div>
          </div>
        </div>
      </div>

      {/* Game cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:14}}>
        {GAMES.map((game,i)=>(
          <div key={game.id} style={{background:"#fff",borderRadius:22,overflow:"hidden",boxShadow:C.shadowMd,border:`1px solid ${C.border}`,animation:`popIn .4s ease ${i*.1}s both`,cursor:"pointer",height:"100%",display:"flex",flexDirection:"column"}} onClick={()=>{setActiveGame(game.id);setGameLoaded(false);setGameErr(false);}}>
            {/* Card header with gradient */}
            <div style={{background:game.bg,padding:"18px 20px 16px",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:-10,right:-10,fontSize:60,opacity:.2}}>{game.icon}</div>
              <div style={{position:"relative",display:"flex",alignItems:"flex-start",gap:12}}>
                <div style={{width:52,height:52,borderRadius:14,background:"rgba(255,255,255,0.2)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,flexShrink:0,boxShadow:"0 2px 8px rgba(0,0,0,0.2)"}}>{game.icon}</div>
                <div style={{flex:1}}>
                  <div style={{color:"#fff",fontWeight:800,fontSize:16,marginBottom:2}}>{game.title}</div>
                  <div style={{color:"rgba(255,255,255,0.75)",fontSize:11,marginBottom:8}}>{game.subtitle}</div>
                  <span style={{background:"rgba(255,255,255,0.2)",backdropFilter:"blur(4px)",color:"#fff",borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700}}>{game.badge}</span>
                </div>
              </div>
            </div>
            {/* Card body */}
            <div style={{padding:"14px 16px",display:"flex",flexDirection:"column",flex:1}}>
              <div style={{marginBottom:14,borderRadius:18,background:"linear-gradient(135deg,#f6fbf7,#edf6ef)",border:`1px solid ${C.border}`,padding:12,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
                <div>
                  <div style={{fontSize:11,color:C.textMuted,marginBottom:4}}>Preview mode</div>
                  <div style={{fontWeight:800,fontSize:13,color:C.primaryDark}}>Responsive wide game stage</div>
                </div>
                <div style={{width:84,height:52,borderRadius:12,background:"#dce8de",padding:5,boxShadow:"inset 0 0 0 1px rgba(0,96,40,0.08)"}}>
                  <div style={{width:"100%",height:"100%",borderRadius:8,background:game.bg,position:"relative",overflow:"hidden"}}>
                    <div style={{position:"absolute",left:6,right:6,top:6,height:5,borderRadius:999,background:"rgba(255,255,255,0.42)"}} />
                    <div style={{position:"absolute",left:6,right:22,bottom:8,height:24,borderRadius:7,background:"rgba(255,255,255,0.18)"}} />
                  </div>
                </div>
              </div>
              <p style={{fontSize:12,color:C.textMuted,lineHeight:1.6,marginBottom:12}}>{game.desc}</p>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
                {game.tags.map(tag=><span key={tag} style={{background:C.bgMuted,border:`1px solid ${C.border}`,borderRadius:20,padding:"2px 9px",fontSize:10,color:C.textMuted,fontWeight:600}}>{tag}</span>)}
              </div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:"auto"}}>
                <div style={{display:"flex",gap:14}}>
                  <div style={{fontSize:11,color:C.textMuted}}>⚡ <span style={{color:C.text,fontWeight:600}}>{game.difficulty}</span></div>
                  <div style={{fontSize:11,color:C.textMuted}}>⏱ <span style={{color:C.text,fontWeight:600}}>{game.duration}</span></div>
                </div>
                <button style={{background:`linear-gradient(135deg,${C.primary},${C.primaryLight})`,border:"none",borderRadius:14,color:"#fff",padding:"10px 18px",fontSize:13,fontWeight:800,cursor:"pointer",boxShadow:`0 8px 18px ${C.primary}33`}}>
                  খেলুন →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Learning path section */}
      <div style={{marginTop:16,background:"#fff",borderRadius:16,padding:16,border:`1px solid ${C.border}`,boxShadow:C.shadow}}>
        <div style={{fontWeight:800,fontSize:14,color:C.primaryDark,marginBottom:4}}>📚 শেখার পথ</div>
        <div style={{color:C.textMuted,fontSize:12,marginBottom:12}}>নতুন হলে এই ক্রমে খেলুন:</div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {["প্ল্যান্ট ক্লিনিক","ধানের ডাক্তার","স্মার্ট কৃষক"].map((name,i,arr)=>(
            <span key={name} style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{background:C.primary,color:"#fff",borderRadius:20,padding:"4px 10px",fontSize:11,fontWeight:700}}>{i+1}. {name}</span>
              {i<arr.length-1&&<span style={{color:C.textLight,fontSize:14}}>→</span>}
            </span>
          ))}
        </div>
      </div>

      {/* External link */}
      <div style={{marginTop:12,background:`linear-gradient(135deg,${C.bgMuted},#fff)`,borderRadius:14,padding:14,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:26}}>🌐</span>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:13,color:C.text}}>পূর্ণ স্ক্রিনে খেলুন</div>
          <div style={{fontSize:11,color:C.textMuted}}>game-diagnosis.space.z.ai</div>
        </div>
        <a href="https://game-diagnosis.space.z.ai" target="_blank" rel="noreferrer" style={{background:C.primary,color:"#fff",padding:"8px 14px",borderRadius:10,textDecoration:"none",fontSize:12,fontWeight:700,flexShrink:0,boxShadow:C.shadow}}>↗ খুলুন</a>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UdbhidGoenda(){
  const[activeTab,setActiveTab]=useState("home");
  const[step,setStep]=useState(1);
  const[form,setForm]=useState({crop:"",district:"",season:getCurrentSeason(),growthStage:"",symptoms:"",duration:"",affectedArea:""});
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
    const uc=[];
    if(imageBase64)uc.push({type:"image",source:{type:"base64",media_type:"image/jpeg",data:imageBase64}});
    uc.push({type:"text",text:`Crop:${form.crop}\nDistrict:${form.district||locationName||"N/A"}\nSeason:${form.season||"N/A"}\nGrowth:${form.growthStage||"N/A"}\nDuration:${form.duration||"N/A"}\nArea:${form.affectedArea||"N/A"}\nSymptoms:${form.symptoms}\n${imageBase64?"Photo attached.":"No photo."}\n${weatherPromptText(weather,locationName)}\n\nDiagnose using CABI Plantwise 5-step protocol. Use very simple Bangla for farmers. Avoid technical words unless you immediately explain them in plain language. Prefer short icon-led bullets and practical field actions.\n---BANGLA_SECTION---\n[Full Bangla]\n---END_BANGLA---\n---ENGLISH_SECTION---\n[Full English]\n---END_ENGLISH---`});
    try{
      const res=await fetch("/api/diagnose",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:2000,messages:[{role:"user",content:uc}]})});
      const data=await res.json();
      if(!res.ok)throw new Error(data?.error||`HTTP ${res.status}`);
      const raw=data.content?.map(b=>b.text||"").join("\n")||"";
      const bn=(raw.match(/---BANGLA_SECTION---([\s\S]*?)---END_BANGLA---/)||[])[1]?.trim()||raw;
      const en=(raw.match(/---ENGLISH_SECTION---([\s\S]*?)---END_ENGLISH---/)||[])[1]?.trim()||"";
      setResult({bn,en});setProvider(data.provider||null);setStep(2);
      const entry={crop:form.crop,district:form.district,date:new Date().toLocaleDateString("bn-BD"),resultPreview:bn.slice(0,80)};
      const nh=[...history,entry].slice(-10);setHistory(nh);try{localStorage.setItem("ud-history",JSON.stringify(nh));}catch{}
      setTimeout(()=>resultRef.current?.scrollIntoView({behavior:"smooth"}),100);
    }catch(err){setError(`রোগ নির্ণয়ে সমস্যা: ${err.message}`);}
    finally{setLoading(false);}
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
    {id:"diagnose",label:"নির্ণয়",icon:"🔬"},
    {id:"apps",label:"অন্য অ্যাপ",icon:"🌐"},
    {id:"guide",label:"CABI গাইড",icon:"📖"},
    {id:"library",label:"তথ্যভাণ্ডার",icon:"📚"},
    {id:"game",label:"গেম হাব",icon:"🎮"},
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
            <img src="/cabi-logo.png" alt="CABI" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
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
              <div style={{width:42,height:42,borderRadius:11,overflow:"hidden",flexShrink:0}}><img src="/cabi-logo.png" alt="CABI" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>
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

        <FeedbackPanel context={feedbackContext} summary={feedbackSummary} userEmail={userEmail} onEmailChange={setUserEmail} visitorStats={visitorStats} visitorId={visitorId}/>
      {/* Footer */}
      <div style={{textAlign:"center",padding:"7px",color:C.textLight,fontSize:9.5,borderTop:`1px solid ${C.border}`,background:"#fff",letterSpacing:.3}}>
        উদ্ভিদ গোয়েন্দা · CABI Plantwise · BRRI · BARI · DAE Bangladesh
      </div>
    </div>
  );
}
