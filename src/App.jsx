import { useState, useRef, useEffect, useCallback } from "react";

// ─── Global styles ────────────────────────────────────────────────────────────
const GLOBAL_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700;800&family=Sora:wght@400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{font-family:'Sora','Noto Sans Bengali',sans-serif;background:#f0f6f1;overflow-x:hidden;-webkit-tap-highlight-color:transparent}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
  @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
  @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
  @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
  @keyframes popIn{0%{transform:scale(.85);opacity:0}70%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}
  @keyframes glow{0%,100%{box-shadow:0 0 8px rgba(26,122,58,0.3)}50%{box-shadow:0 0 20px rgba(26,122,58,0.6)}}
  ::-webkit-scrollbar{width:3px;height:3px}
  ::-webkit-scrollbar-thumb{background:#2d9d52;border-radius:4px}
  input,select,textarea,button{font-family:inherit}
  button:active{transform:scale(0.97)}
`;
if(typeof document!=="undefined"&&!document.getElementById("ud-gs")){
  const s=document.createElement("style");s.id="ud-gs";s.textContent=GLOBAL_STYLE;document.head.appendChild(s);
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const C={
  primary:"#1a7a3a", primaryLight:"#2d9d52", primaryDark:"#0f5a28", primaryXDark:"#093d1b",
  accent:"#f59e0b", accentLight:"#fbbf24", accentDark:"#d97706",
  bg:"#f0f6f1", bgCard:"#ffffff", bgMuted:"#f5faf6",
  text:"#132213", textMuted:"#5a6e5a", textLight:"#8fa88f",
  border:"#c8e0c8", borderFocus:"#2d9d52",
  success:"#16a34a", warning:"#d97706", danger:"#dc2626", blue:"#2563eb",
  shadow:"0 1px 4px rgba(0,60,20,0.08)",
  shadowMd:"0 4px 16px rgba(0,60,20,0.12)",
  shadowLg:"0 8px 32px rgba(0,60,20,0.16)",
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
  const bodyText=bodyLines.join("\n").trim();
  if(!bodyText&&!title)return null;
  return(
    <div style={{borderRadius:14,border:`1px solid ${meta.border}`,marginBottom:10,overflow:"hidden",animation:"fadeIn .3s ease"}}>
      {title&&<button onClick={()=>setOpen(o=>!o)} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"12px 16px",background:meta.bg,border:"none",cursor:"pointer",textAlign:"left"}}>
        <span style={{fontSize:19}}>{meta.icon}</span>
        <span style={{color:meta.color,fontWeight:700,fontSize:14,flex:1}}>{title}</span>
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
function LibrarySection(){
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
      <div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto",paddingBottom:4,scrollbarWidth:"none"}}>
        {sections.map(s=>(
          <button key={s.id} onClick={()=>setSection(s.id)} style={{flexShrink:0,padding:"7px 12px",borderRadius:20,border:`1px solid ${section===s.id?C.primary:C.border}`,background:section===s.id?C.primary:"#fff",color:section===s.id?"#fff":C.text,cursor:"pointer",fontSize:11,fontWeight:600,whiteSpace:"nowrap",transition:"all .15s"}}>{s.icon} {s.label}</button>
        ))}
      </div>
      {section==="protocol"&&(
        <div>
          <div style={{background:`linear-gradient(135deg,${C.primaryXDark},${C.primary})`,borderRadius:16,padding:20,marginBottom:14,color:"#fff"}}>
            <div style={{fontSize:24,marginBottom:8}}>🔬</div>
            <div style={{fontWeight:800,fontSize:17,marginBottom:3}}>{CABI_GUIDE.protocol.title}</div>
            <div style={{opacity:.8,fontSize:12}}>{CABI_GUIDE.protocol.subtitle}</div>
          </div>
          {CABI_GUIDE.protocol.steps.map((step,i)=>(
            <div key={i} style={{background:"#fff",borderRadius:14,padding:16,marginBottom:10,border:`1px solid ${step.border}`,boxShadow:C.shadow,animation:`fadeIn .3s ease ${i*.05}s both`}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                <div style={{width:42,height:42,borderRadius:"50%",background:step.bg,border:`2px solid ${step.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,flexShrink:0}}>{step.icon}</div>
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

  if(activeGame){
    const game=GAMES.find(g=>g.id===activeGame);
    return(
      <div style={{display:"flex",flexDirection:"column",height:"calc(100svh - 110px)"}}>
        {/* game header */}
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",flexShrink:0}}>
          <button onClick={()=>{setActiveGame(null);setGameLoaded(false);setGameErr(false);}} style={{width:36,height:36,borderRadius:10,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0,boxShadow:C.shadow}}>←</button>
          <div style={{flex:1}}>
            <div style={{fontWeight:800,fontSize:14,color:C.primaryDark}}>{game.icon} {game.title}</div>
            <div style={{fontSize:11,color:C.textMuted}}>{game.subtitle}</div>
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
          <div style={{display:"flex",gap:8}}>
            <div style={{background:"rgba(255,255,255,0.15)",backdropFilter:"blur(8px)",borderRadius:10,padding:"6px 12px",fontSize:11,color:"#fff",fontWeight:600}}>🎮 ৩টি সিমুলেশন</div>
            <div style={{background:"rgba(255,255,255,0.15)",backdropFilter:"blur(8px)",borderRadius:10,padding:"6px 12px",fontSize:11,color:"#fff",fontWeight:600}}>🌾 বাংলায়</div>
            <div style={{background:"rgba(255,255,255,0.15)",backdropFilter:"blur(8px)",borderRadius:10,padding:"6px 12px",fontSize:11,color:"#fff",fontWeight:600}}>📱 মোবাইল বান্ধব</div>
          </div>
        </div>
      </div>

      {/* Game cards */}
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {GAMES.map((game,i)=>(
          <div key={game.id} style={{background:"#fff",borderRadius:18,overflow:"hidden",boxShadow:C.shadowMd,border:`1px solid ${C.border}`,animation:`popIn .4s ease ${i*.1}s both`,cursor:"pointer"}} onClick={()=>{setActiveGame(game.id);setGameLoaded(false);setGameErr(false);}}>
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
            <div style={{padding:"14px 16px"}}>
              <p style={{fontSize:12,color:C.textMuted,lineHeight:1.6,marginBottom:12}}>{game.desc}</p>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
                {game.tags.map(tag=><span key={tag} style={{background:C.bgMuted,border:`1px solid ${C.border}`,borderRadius:20,padding:"2px 9px",fontSize:10,color:C.textMuted,fontWeight:600}}>{tag}</span>)}
              </div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{display:"flex",gap:14}}>
                  <div style={{fontSize:11,color:C.textMuted}}>⚡ <span style={{color:C.text,fontWeight:600}}>{game.difficulty}</span></div>
                  <div style={{fontSize:11,color:C.textMuted}}>⏱ <span style={{color:C.text,fontWeight:600}}>{game.duration}</span></div>
                </div>
                <button style={{background:`linear-gradient(135deg,${C.primary},${C.primaryLight})`,border:"none",borderRadius:12,color:"#fff",padding:"8px 18px",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:`0 3px 10px ${C.primary}44`}}>
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
  const[activeTab,setActiveTab]=useState("diagnose");
  const[step,setStep]=useState(1);
  const[form,setForm]=useState({crop:"",district:"",season:"",growthStage:"",symptoms:"",duration:"",affectedArea:""});
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

  useEffect(()=>{fetch("/pesticides.json").then(r=>r.json()).then(d=>setPesticideDb(d)).catch(()=>{});},[]);

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
      const district=d.address?.county||d.address?.state_district||d.address?.city||"";
      setLocationName([district,"Bangladesh"].filter(Boolean).join(", "));
      const m=DISTRICTS.find(dd=>dd.toLowerCase().includes(district.toLowerCase())||district.toLowerCase().includes(dd.split("/")[0].trim().toLowerCase()));
      if(m)setForm(f=>({...f,district:f.district||m}));
    }catch{setLocationName("Bangladesh");}
  },[]);

  const fetchByIP=useCallback(async()=>{
    try{
      const d=await(await fetch("https://ip-api.com/json/?fields=lat,lon,city,regionName")).json();
      if(d.lat&&d.lon){setCoords({lat:d.lat,lon:d.lon});setLocationSource("ip");setLocationName([d.city,d.regionName,"Bangladesh"].filter(Boolean).join(", "));await fetchWeather(d.lat,d.lon);const m=DISTRICTS.find(dd=>dd.toLowerCase().includes((d.city||"").toLowerCase()));if(m)setForm(f=>({...f,district:f.district||m}));}
      else{setCoords({lat:23.685,lon:90.356});setLocationName("Bangladesh");await fetchWeather(23.685,90.356);}
    }catch{}
  },[fetchWeather]);

  useEffect(()=>{
    setWeatherLoading(true);
    if(navigator.geolocation){navigator.geolocation.getCurrentPosition(async(pos)=>{const{latitude:lat,longitude:lon}=pos.coords;setCoords({lat,lon});setLocationSource("gps");await Promise.all([fetchWeather(lat,lon),reverseGeocode(lat,lon)]);setWeatherLoading(false);},async()=>{await fetchByIP();setWeatherLoading(false);},{timeout:8000});}
    else{fetchByIP().then(()=>setWeatherLoading(false));}
  },[fetchWeather,reverseGeocode,fetchByIP]);

  useEffect(()=>{setVoiceSupported(!!(window.SpeechRecognition||window.webkitSpeechRecognition));setTtsSupported(!!window.speechSynthesis);},[]);

  const refreshWeather=async()=>{if(!coords)return;setWeatherLoading(true);await fetchWeather(coords.lat,coords.lon);setWeatherLoading(false);};

  const handleImage=(e)=>{
    const file=e.target.files[0];if(!file)return;
    setImage(URL.createObjectURL(file));
    const img=new Image();
    img.onload=()=>{
      const MAX=800;let{width:w,height:h}=img;
      if(w>MAX||h>MAX){if(w>h){h=Math.round(h*MAX/w);w=MAX;}else{w=Math.round(w*MAX/h);h=MAX;}}
      const cv=document.createElement("canvas");cv.width=w;cv.height=h;cv.getContext("2d").drawImage(img,0,0,w,h);
      setImageBase64(cv.toDataURL("image/jpeg",0.7).split(",")[1]);
    };
    img.src=URL.createObjectURL(file);
  };

  const handleSubmit=async()=>{
    if(!form.crop||!form.symptoms){setError("অনুগ্রহ করে ফসল এবং লক্ষণ উভয়ই পূরণ করুন।");return;}
    setLoading(true);setError(null);setResult(null);setSeverity(null);setRecommendedProducts([]);
    const uc=[];
    if(imageBase64)uc.push({type:"image",source:{type:"base64",media_type:"image/jpeg",data:imageBase64}});
    uc.push({type:"text",text:`Crop:${form.crop}\nDistrict:${form.district||locationName||"N/A"}\nSeason:${form.season||"N/A"}\nGrowth:${form.growthStage||"N/A"}\nDuration:${form.duration||"N/A"}\nArea:${form.affectedArea||"N/A"}\nSymptoms:${form.symptoms}\n${imageBase64?"Photo attached.":"No photo."}\n${weatherPromptText(weather,locationName)}\n\nDiagnose using CABI Plantwise 5-step protocol.\n---BANGLA_SECTION---\n[Full Bangla]\n---END_BANGLA---\n---ENGLISH_SECTION---\n[Full English]\n---END_ENGLISH---`});
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
  const reset=()=>{setForm({crop:"",district:"",season:"",growthStage:"",symptoms:"",duration:"",affectedArea:""});setImage(null);setImageBase64(null);setResult(null);setError(null);setProvider(null);setShowEnglish(false);setStep(1);setSeverity(null);setShowMoreCrops(false);setRecommendedProducts([]);stopSpeaking();};

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
    {id:"diagnose",label:"নির্ণয়",icon:"🔬"},
    {id:"guide",label:"CABI গাইড",icon:"📖"},
    {id:"library",label:"তথ্যভাণ্ডার",icon:"📚"},
    {id:"game",label:"গেম হাব",icon:"🎮"},
    {id:"history",label:"ইতিহাস",icon:"📋"},
  ];

  return(
    <div style={{minHeight:"100svh",background:C.bg,maxWidth:640,margin:"0 auto",display:"flex",flexDirection:"column"}}>

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <div style={{background:`linear-gradient(135deg,${C.primaryXDark},${C.primary})`,padding:"12px 14px 0",position:"sticky",top:0,zIndex:100,boxShadow:C.shadowMd}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <div style={{width:40,height:40,borderRadius:11,overflow:"hidden",flexShrink:0,boxShadow:"0 2px 10px rgba(0,0,0,0.3)",animation:"glow 3s ease-in-out infinite"}}>
            <img src="/cabi-logo.png" alt="CABI" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{color:"#fff",fontWeight:800,fontSize:17,letterSpacing:-.5,lineHeight:1.1}}>উদ্ভিদ গোয়েন্দা</div>
            <div style={{color:"rgba(255,255,255,0.65)",fontSize:10,letterSpacing:.2}}>Plant Detective · Bangladesh · CABI Plantwise</div>
          </div>
          {step===2&&result&&<button onClick={reset} style={{flexShrink:0,background:"rgba(255,255,255,0.15)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:10,color:"#fff",padding:"6px 10px",cursor:"pointer",fontSize:12,fontWeight:600}}>🔁 নতুন</button>}
        </div>
        {/* Tab bar */}
        <div style={{display:"flex",overflowX:"auto",scrollbarWidth:"none",gap:0}}>
          {navTabs.map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{flexShrink:0,padding:"9px 11px",border:"none",cursor:"pointer",background:"none",color:activeTab===t.id?"#fff":"rgba(255,255,255,0.55)",borderBottom:`2.5px solid ${activeTab===t.id?"#fff":"transparent"}`,fontSize:11.5,fontWeight:activeTab===t.id?700:400,transition:"all .15s",whiteSpace:"nowrap",letterSpacing:.1}}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══ CONTENT ═════════════════════════════════════════════════════════ */}
      <div style={{flex:1,padding:activeTab==="game"?"10px 12px":"14px",overflowY:activeTab==="game"?"hidden":"auto",overflowX:"hidden"}}>

        {/* ── DIAGNOSE ─────────────────────────────────────────────── */}
        {activeTab==="diagnose"&&(
          <div>
            <WeatherBar weather={weather} weatherLoading={weatherLoading} locationName={locationName} locationSource={locationSource} onRefresh={refreshWeather}/>
            <SprayingWidget weather={weather} weatherLoading={weatherLoading}/>
            <DiagnosisHistory history={history} onLoad={(h)=>setForm(f=>({...f,crop:h.crop||"",district:h.district||""}))}/>

            {step===1&&(
              <div>
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
                  <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleImage} style={{display:"none"}}/>
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
                  const text=showEnglish?(result.en||""):(result.bn||result.en||"");
                  if(!text)return<div style={{color:C.textMuted,textAlign:"center",padding:20}}>ফলাফল পাওয়া যায়নি।</div>;
                  const sections=parseIntoSections(text);
                  if(sections.length<=1&&!sections[0]?.title)return<div style={{background:"#fff",borderRadius:14,padding:16,color:C.text,fontSize:13.5,lineHeight:1.85,border:`1px solid ${C.border}`,boxShadow:C.shadow}}>{renderInline(text)}</div>;
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
          <div style={{background:"#fff",borderRadius:16,padding:18,border:`1px solid ${C.border}`,boxShadow:C.shadow}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <div style={{width:42,height:42,borderRadius:11,overflow:"hidden",flexShrink:0}}><img src="/cabi-logo.png" alt="CABI" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>
              <div><div style={{fontWeight:800,fontSize:15,color:C.primaryDark}}>CABI Plantwise গাইড</div><div style={{color:C.textMuted,fontSize:11}}>সম্পূর্ণ রোগ নির্ণয় প্রোটোকল</div></div>
            </div>
            <CABIGuideTab/>
          </div>
        )}

        {/* ── LIBRARY ──────────────────────────────────────────────── */}
        {activeTab==="library"&&(
          <div style={{background:"#fff",borderRadius:16,padding:18,border:`1px solid ${C.border}`,boxShadow:C.shadow}}>
            <div style={{fontWeight:800,fontSize:15,color:C.primaryDark,marginBottom:3}}>📚 তথ্যভাণ্ডার</div>
            <div style={{color:C.textMuted,fontSize:12,marginBottom:14}}>পোকামাকড়, রোগ ও পুষ্টি অভাব</div>
            <LibrarySection/>
          </div>
        )}

        {/* ── GAME HUB ─────────────────────────────────────────────── */}
        {activeTab==="game"&&<GameHub/>}

        {/* ── HISTORY ──────────────────────────────────────────────── */}
        {activeTab==="history"&&(
          <div style={{background:"#fff",borderRadius:16,padding:18,border:`1px solid ${C.border}`,boxShadow:C.shadow}}>
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
                  <div key={i} style={{padding:"13px 14px",background:C.bgMuted,borderRadius:12,border:`1px solid ${C.border}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                      <div style={{fontWeight:700,fontSize:13,color:C.text}}>{h.crop?.split("/")[0]?.trim()}</div>
                      <span style={{background:"#dcfce7",color:"#166534",borderRadius:10,padding:"2px 9px",fontSize:11,fontWeight:700}}>সম্পন্ন</span>
                    </div>
                    <div style={{color:C.textMuted,fontSize:11}}>📍 {h.district?.split("/")[0]?.trim()||"—"} · 📅 {h.date}</div>
                    {h.resultPreview&&<div style={{color:C.textLight,fontSize:11,marginTop:5,lineHeight:1.5,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{h.resultPreview}...</div>}
                  </div>
                ))}
                <button onClick={()=>{setHistory([]);try{localStorage.removeItem("ud-history");}catch{}}} style={{padding:"9px",borderRadius:10,border:"1px solid #fecaca",background:"#fef2f2",color:C.danger,cursor:"pointer",fontSize:12,fontWeight:600,marginTop:3}}>🗑️ সব ইতিহাস মুছুন</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{textAlign:"center",padding:"7px",color:C.textLight,fontSize:9.5,borderTop:`1px solid ${C.border}`,background:"#fff",letterSpacing:.3}}>
        উদ্ভিদ গোয়েন্দা · CABI Plantwise · BRRI · BARI · DAE Bangladesh
      </div>
    </div>
  );
}
