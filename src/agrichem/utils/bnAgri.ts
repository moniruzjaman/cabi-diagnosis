/**
 * bnAgri.ts — Bangla localization engine for agricultural data strings.
 *
 * Strategy: all user-facing data strings (crops, pests, toxicity classes,
 * dosage lines) are stored in English in the databases. This module
 * translates them AT RENDER TIME to Bangla. Only scientific/Latin names
 * (active ingredients, binomials like "Cyperus rotundus", abbreviated
 * binomials like "C. rotundus") and product/trade names stay Latin —
 * per product rule: "only active ingredient or name can be English".
 *
 * Keys are normalized: lowercase, non-alphanumeric collapsed to spaces.
 * Lookup order: exact map → compound split ("&", "/", ",", "and") → raw.
 */

export type Lang = 'en' | 'bn';

export const normKey = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/* ------------------------------------------------------------------ */
/* CROPS (extends i18n CROP_TRANSLATIONS with typo/variant coverage)  */
/* ------------------------------------------------------------------ */
export const CROP_BN_RAW: Record<string, string> = {
  'aerial spray for rice': 'ধানে উড়াল স্প্রে',
  'apple': 'আপেল',
  'aquatic canals': 'জলাশয় ও নালা',
  'banana': 'কলা',
  'bean': 'শিম জাতীয়',
  'beetle leaf': 'পান',
  'bettle leaf': 'পান',
  'bettle vine': 'পান',
  'betel leaf': 'পান',
  'betel vine': 'পান বরগা',
  'bitter gourd': 'করলা (উচ্ছে)',
  'blackgram': 'মাশকালাই',
  'bottle gourd': 'লাউ',
  'brinjal': 'বেগুন',
  'burrow entrances': 'ইঁদুরের গর্ত',
  'cabbage': 'বাঁধাকপি',
  'cauli': 'ফুলকপি',
  'cauliflowe': 'ফুলকপি',
  'cauliflower': 'ফুলকপি',
  'chickpea': 'ছোলা',
  'chili': 'মরিচ',
  'chilli': 'মরিচ',
  'chili guava': 'মরিচ ও পেয়ারা',
  'citrus': 'লেবু জাতীয় ফল',
  'coriander': 'ধনে (ধনিয়া)',
  'corn': 'ভুট্টা',
  'maise': 'ভুট্টা',
  'maize': 'ভুট্টা',
  'cotton': 'তুলা',
  'country bean': 'বরবটি',
  'county bean': 'বরবটি',
  'crop borders': 'জমির সীমানা',
  'crops field': 'মাঠের ফসল',
  'cucumber': 'শসা',
  'cumcumber': 'শসা',
  'cucumbits': 'কুকুরবিট জাতীয়',
  'cucurbit': 'কুকুরবিট জাতীয়',
  'cucurbits': 'লাউ/কুমড়া জাতীয়',
  'drainage borders': 'নালার ধার',
  'eggplant': 'বেগুন',
  'empty godowns': 'খালি গুদাম',
  'fallow field preparation': 'পতিত জমি প্রস্তুতি',
  'fallow land': 'পতিত জমি',
  'field': 'মাঠ',
  'field crops': 'মাঠ ফসল',
  'floriculture': 'ফুল চাষ',
  'fruit': 'ফল ফসল',
  'fruits': 'ফল ফসল',
  'garden pea': 'বাগান মটর (মটরশুঁটি)',
  'grain bags': 'শস্যের বস্তা',
  'grain stores': 'শস্য গুদাম',
  'grapes': 'আঙুর',
  'ground nut': 'চীনাবাদাম',
  'groundnut': 'চীনাবাদাম',
  'peanut': 'চীনাবাদাম',
  'guava': 'পেয়ারা',
  'houses godowns': 'ঘর ও গুদাম',
  'jujube': 'কুল (বাদাম)',
  'jute': 'পাট',
  'kenaf mesta': 'কেনাফ ও মেস্তা পাট',
  'ladis finger': 'ঢেঁড়স',
  'lady s finger': 'ঢেঁড়স',
  'okra': 'ঢেঁড়স',
  'lawn turf': 'লন / ঘাসের মাঠ',
  'lemon': 'লেবু',
  'litchi': 'লিচু',
  'long yera bean': 'বরবটি (লং বিন)',
  'longyard bean': 'বরবটি (লং বিন)',
  'longyear bean': 'বরবটি (লং বিন)',
  'mango': 'আম',
  'mango guava': 'আম ও পেয়ারা',
  'marigold': 'গাঁদা ফুল',
  'melon': 'খরমুজ/বাঙ্গি',
  'mung bean': 'মুগ ডাল',
  'mustard': 'সরিষা',
  'mustard bean': 'সরিষা ও শিম',
  'non crop fallow land': 'অনাবাদি পতিত জমি',
  'non cropped land': 'অনাবাদি জমি',
  'oil palm coconut': 'তেল পাম ও নারকেল',
  'onion': 'পেঁয়াজ',
  'orchard borders': 'বাগানের সীমানা',
  'paddy bunds': 'আইল (পাটার)',
  'papaya': 'পেঁপে',
  'pigeonpea': 'অড়হর (আরহর)',
  'pineapple': 'আনারস',
  'pinapple': 'আনারস',
  'pine apple': 'আনারস',
  'polyhouse': 'পলিহাউস',
  'potato': 'আলু',
  'potato tomato': 'আলু ও টমেটো',
  'potato seed treatment': 'আলুর বীজ শোধন',
  'poultry farms': 'মুরগির খামার',
  'processed flour silos': 'প্রক্রিয়াজাত আটার সাইলো',
  'pulse oil crops': 'ডাল ও তেলবীজ ফসল',
  'pulse oilseed': 'ডাল ও তেলবীজ ফসল',
  'pulses': 'ডাল জাতীয় ফসল',
  'ribbed': 'ঝিঙ্গা',
  'ridge': 'ঝিঙ্গা',
  'rice': 'ধান',
  'rice borders': 'ধানখেতের সীমানা',
  'rose': 'গোলাপ ফুল',
  'roses': 'গোলাপ ফুল',
  'rubber': 'রাবার',
  'sesame': 'তিল',
  'silos': 'সাইলো (গুদাম)',
  'snake gourd': 'চিচিঙ্গা',
  'soil treatment': 'মাটি শোধন',
  'soyabean': 'সয়াবিন',
  'soybean': 'সয়াবিন',
  'store': 'গুদামজাত শস্য',
  'store field': 'গুদাম ও মাঠ',
  'stored grain': 'গুদামজাত শস্য',
  'stored grain in rice': 'গুদামজাত ধান',
  'stored grain pest': 'গুদামজাত শস্য',
  'stored grain pest in rice': 'গুদামজাত ধান',
  'stored grain pest in wheat': 'গুদামজাত গম',
  'stored grain silos': 'গুদাম ও সাইলো',
  'sugarcan': 'আখ',
  'sugarcane': 'আখ',
  'sugarcane fields': 'আখের জমি',
  'sugerbeet': 'চিনির বিট (সুগারবিট)',
  'swee gourd': 'মিষ্টি কুমড়া',
  'sweer gourd': 'মিষ্টি কুমড়া',
  'sweet gourd': 'মিষ্টি কুমড়া',
  'sweet guard': 'মিষ্টি কুমড়া',
  'sweet': 'মিষ্টি কুমড়া',
  'tea': 'চা',
  'tea rubber': 'চা ও রাবার',
  'teasel gourd': 'কাকরোল (টিসল গর্ড)',
  'teasle gourd': 'কাকরোল (টিসল গর্ড)',
  'teasle bitter gourd': 'কাকরোল ও করলা',
  'tobacco': 'তামাক',
  'tobacco warehouses': 'তামাকের গুদাম',
  'tomato': 'টমেটো',
  'tomota': 'টমেটো',
  'vegetables': 'সবজি',
  'warehouse': 'গুদামঘর',
  'warehouses': 'গুদামঘর',
  'warehouse walls bags': 'গুদামের দেয়াল ও বস্তা',
  'watermelon': 'তরমুজ',
  'wheal': 'গম',
  'wheat': 'গম',
  'wooden packing': 'কাঠের প্যাকিং সামগ্রী',
  'gourd': 'কুমড়া জাতীয়'
};

/** Runtime-normalized view of CROP_BN_RAW. */
export const CROP_BN: Record<string, string> = Object.fromEntries(
  Object.entries(CROP_BN_RAW).map(([k, v]) => [normKey(k), v])
);

/* ------------------------------------------------------------------ */
/* TOXICITY (WHO class)                                               */
/* ------------------------------------------------------------------ */
export const TOXICITY_PHRASE_BN: Record<string, string> = {
  'extremely hazardous': 'অতি বিপজ্জনক',
  'highly hazardous': 'অত্যন্ত বিপজ্জনক',
  'moderately hazardous': 'মাঝারি বিপজ্জনক',
  'slightly hazardous': 'সামান্য বিপজ্জনক',
  'unlikely to present hazard': 'বিপদমুক্ত (সম্ভাবনা নেই)',
  'unlikely to present acute hazard': 'বিপদমুক্ত (সম্ভাবনা নেই)',
  'hazard unlikely': 'বিপদমুক্ত',
  'obsolete': 'পর্যায়ক্রমে বাতিল',
  'not classified': 'শ্রেণিবদ্ধ নয়'
};

/** Roman-class prefix stays (code-like); only the phrase is translated. */
export const translateToxicity = (s: string, lang: Lang): string => {
  if (!s || lang !== 'bn') return s;
  const m = s.match(/^\s*(Ia|Ib|II|III|I|U|O)\s*[-–—]?\s*(.*)$/i);
  if (!m) return TOXICITY_PHRASE_BN[normKey(s)] || s;
  const phrase = TOXICITY_PHRASE_BN[normKey(m[2])] || m[2];
  return `${m[1]} — ${phrase}`;
};

/* ------------------------------------------------------------------ */
/* PESTS & DISEASES (single-term dictionary; compounds are split)      */
/* Latin binomials (incl. abbreviated "C. rotundus") stay English.    */
/* ------------------------------------------------------------------ */
export const PEST_BN_RAW: Record<string, string> = {
  // --- Insect pests: rice ---
  'bph': 'বাদামি পাতা ফড়িং',
  'brown plant hopper': 'বাদামি পাতা ফড়িং',
  'brown planthopper': 'বাদামি পাতা ফড়িং',
  'brown planthopper nymphs': 'বাদামি পাতা ফড়িং (নিম্ফ)',
  'wbph': 'সাদাপিঠ পাতা ফড়িং',
  'whitebacked planthopper': 'সাদাপিঠ পাতা ফড়িং',
  'wbgh': 'সাদাপিঠ পাতা ফড়িং',
  'glh': 'সবুজ পাতা ফড়িং',
  'gh': 'সবুজ পাতা ফড়িং',
  'green plant hopper': 'সবুজ পাতা ফড়িং',
  'green leaf hopper': 'সবুজ পাতা ফড়িং',
  'green leafhopper': 'সবুজ পাতা ফড়িং',
  'hispa': 'হিসপা পোকা',
  'hiapa': 'হিসপা পোকা',
  'ysb': 'হলদে মাজরা পোকা',
  'sb': 'কাণ্ড ছিদ্রকারী পোকা',
  'lr': 'পাতা গুটানো পোকা',
  'yellow stem borer': 'হলদে মাজরা পোকা',
  'yellow stemborer': 'হলদে মাজরা পোকা',
  'yollow stemborer': 'হলদে মাজরা পোকা',
  'stem borer': 'কাণ্ড ছিদ্রকারী পোকা',
  'stemborer': 'কাণ্ড ছিদ্রকারী পোকা',
  'rice stem borer': 'ধানের মাজরা পোকা',
  'leaf folder': 'পাতা গুটানো পোকা',
  'leaffolder': 'পাতা গুটানো পোকা',
  'leaf roller': 'পাতা গুটানো পোকা',
  'leafrollerr': 'পাতা গুটানো পোকা',
  'leafroller': 'পাতা গুটানো পোকা',
  'rice leaf folder': 'ধানের পাতা গুটানো পোকা',
  'rice bug': 'ধানের মাছি পোকা',
  'gall midge': 'গল মিজ পোকা',
  'whorl maggot': 'হুইরল ম্যাগেট পোকা',
  'case worm': 'কেসওয়ার্ম পোকা',
  'caseworm': 'কেসওয়ার্ম পোকা',
  'casewarm': 'কেসওয়ার্ম পোকা',
  'catwarm': 'কেসওয়ার্ম পোকা',
  'rice ear cutting caterpillar': 'ধানের শীষ কাটা কীড়া পোকা',
  'ear cutting caterpillar': 'শীষ কাটা কীড়া পোকা',
  'armyworm': 'আর্মিওয়ার্ম পোকা',
  'fall armyworm': 'ফল আর্মিওয়ার্ম পোকা',
  'rice ratoon': 'ধানের গুটি গজ (রেটুন)',
  'rice blast': 'ধানের ব্লাস্ট রোগ',
  'leaf blast': 'পাতায় ব্লাস্ট রোগ',
  'neck blast': 'শীষের গোড়ায় ব্লাস্ট রোগ',
  'ufra': 'উফরা রোগ',
  'ufra nematode': 'উফরা নিমাটোড রোগ',
  'bakanae': 'বাকানেয়ে রোগ',
  'karnal bunt': 'কারনাল বান্ট রোগ',
  'leaf scald': 'পাতা পোড়া (স্কল্ড) রোগ',
  'sheath blight': 'শীথ ব্লাইট রোগ',
  'sheath rot': 'শীথ রট (খোসা পচা) রোগ',
  'stem rot': 'কাণ্ড পচা রোগ',
  'brown spot': 'বাদামি দাগ রোগ',
  'bacterial blight': 'ব্যাকটেরিয়াজনিত পাতা বাদলা',
  'bacterial leaf blight': 'ব্যাকটেরিয়াজনিত পাতা বাদলা',
  'bacterial leaf streak': 'ব্যাকটেরিয়াজনিত পাতার দাগ রোগ',
  'blast': 'ব্লাস্ট রোগ',
  'blast disease': 'ব্লাস্ট রোগ',
  'khaira': 'খাইরা রোগ',
  // --- Generic insect terms ---
  'aphid': 'জাব পোকা',
  'aphids': 'জাব পোকা',
  'ahpid': 'জাব পোকা',
  'apid': 'জাব পোকা',
  'thrips': 'থ্রিপস পোকা',
  'thirps': 'থ্রিপস পোকা',
  'whitefly': 'সাদা মাছি পোকা',
  'white fly': 'সাদা মাছি পোকা',
  'whiteflies': 'সাদা মাছি পোকা',
  'jassid': 'জ্যাসিড পোকা',
  'jassids': 'জ্যাসিড পোকা',
  'jessid': 'জ্যাসিড পোকা',
  'yapsilla': 'জ্যাসিড পোকা',
  'cotton jassid': 'তুলার জ্যাসিড পোকা',
  'mealybug': 'মিলিবাগ পোকা',
  'mealy bug': 'মিলিবাগ পোকা',
  'mealybugs': 'মিলিবাগ পোকা',
  'mealybug nymphs': 'মিলিবাগ পোকা (নিম্ফ)',
  'scale insects': 'স্কেল পোকা (আঁশ)',
  'mite': 'মাকড়',
  'mites': 'মাকড়',
  'red spider mite': 'লাল মাকড়',
  'red spider mites': 'লাল মাকড়',
  'red spider': 'লাল মাকড়',
  'red mite': 'লাল মাকড়',
  'red mites': 'লাল মাকড়',
  'yellow mite': 'হলদে মাকড়',
  'yellow mites': 'হলদে মাকড়',
  'yellow spider mite': 'হলদে মাকড়',
  'yellow tea mite': 'চায়ের হলদে মাকড়',
  'purple mite': 'বেগুনি মাকড়',
  'pink mite': 'গোলাপি মাকড়',
  'pink mites': 'গোলাপি মাকড়',
  'scarlet mite': 'স্কারলেট মাকড়',
  'scarlet': 'স্কারলেট মাকড়',
  'rust mite': 'মরিচা মাকড়',
  'eriophyid mites': 'এরিওফাইড মাকড়',
  'two-spotted spider mite': 'দুই দাগি মাকড়',
  'spider mite': 'স্পাইডার মাকড়',
  'tetranychid spider mites': 'টেট্রানিকাইড মাকড়',
  'hopper': 'ফড়িং পোকা',
  'hoppers': 'ফড়িং পোকা',
  'hopper nymphs': 'ফড়িং পোকা (নিম্ফ)',
  'mango hopper': 'আমের ফড়িং পোকা',
  'borers': 'ছিদ্রকারী পোকা',
  'caterpillar': 'কীড়া পোকা',
  'caterpillars': 'কীড়া পোকা',
  'leaf eating caterpillar': 'পাতা খাওয়া কীড়া পোকা',
  'cabbage caterpillar': 'বাঁধাকপির কীড়া পোকা',
  'hairy caterpillar': 'লোমশ কীড়া পোকা',
  'hairy caterpiller': 'লোমশ কীড়া পোকা',
  'hairy catterpillar': 'লোমশ কীড়া পোকা',
  'hiary caterpillar': 'লোমশ কীড়া পোকা',
  'jute hairy caterpillar': 'পাটের লোমশ কীড়া পোকা',
  'cutworm': 'কাটওয়ার্ম পোকা',
  'common cutworm': 'কমন কাটওয়ার্ম পোকা',
  'semilooper': 'সেমিলুপার পোকা',
  'semilopper': 'সেমিলুপার পোকা',
  'cabbage semi-looper': 'বাঁধাকপির সেমিলুপার পোকা',
  'loopers': 'লুপার পোকা',
  'looper caterpillars': 'লুপার কীড়া পোকা',
  'tea loopers': 'চায়ের লুপার পোকা',
  'diamondback moth': 'ডায়মন্ডব্যাক মথ পোকা',
  'diamond back moth': 'ডায়মন্ডব্যাক মথ পোকা',
  'leaf miner': 'পাতা মাইনার পোকা',
  'leafminer': 'পাতা মাইনার পোকা',
  'fruit fly': 'ফল মাছি পোকা',
  'fruit borer': 'ফলছিদ্রকারী পোকা',
  'fruit bollworm': 'ফলছিদ্রকারী পোকা',
  'shoot borer': 'ডগা ছিদ্রকারী পোকা',
  'fruit and shoot borer': 'ডগা ও ফল ছিদ্রকারী পোকা',
  'shoot and fruit borer': 'ডগা ও ফল ছিদ্রকারী পোকা',
  'brinjal shoot fruit borer': 'বেগুনের ডগা ও ফল ছিদ্রকারী পোকা',
  'brinjal fruit borer': 'বেগুনের ফলছিদ্রকারী পোকা',
  'early shoot borer': 'আগাম ডগা ছিদ্রকারী পোকা',
  'top shoot borer': 'শীর্ষ ডগা ছিদ্রকারী পোকা',
  'top shootborer': 'শীর্ষ ডগা ছিদ্রকারী পোকা',
  'white grub': 'সাদা গ্রাব পোকা',
  'white grabs': 'সাদা গ্রাব পোকা',
  'white grubs': 'সাদা গ্রাব পোকা',
  'root grubs': 'মূলের গ্রাব পোকা',
  'root stock borer': 'মূলগুল্ম ছিদ্রকারী পোকা',
  'termite': 'উই পোকা',
  'termites': 'উই পোকা',
  'field cricket': 'মাঠের ঝিঁঝিঁ পোকা',
  'bollworm': 'বলওয়ার্ম পোকা',
  'bollworms': 'বলওয়ার্ম পোকা',
  'ball worm': 'বলওয়ার্ম পোকা',
  'ballworm': 'বলওয়ার্ম পোকা',
  'boll warm': 'বলওয়ার্ম পোকা',
  'bollwarm': 'বলওয়ার্ম পোকা',
  'a bollworm': 'আমেরিকান বলওয়ার্ম পোকা',
  's bollworm': 'ডোরাকাটা বলওয়ার্ম পোকা',
  'spotted bollworm': 'ডোরাকাটা বলওয়ার্ম পোকা',
  'cotton bollworm': 'তুলার বলওয়ার্ম পোকা',
  'gram pod borer': 'ছোলার পড ছিদ্রকারী পোকা',
  'pod borer': 'পড ছিদ্রকারী পোকা',
  'heliothis': 'হেলিওথিস পোকা',
  'weevil': 'ওয়িভিল পোকা',
  'ball weevil': 'গুবি পোকা',
  'beetle': 'গুবি পোকা',
  'rhino beetle': 'গন্ডগুবি পোকা',
  'flour beetle': 'আটার পোকা',
  'red flour beetle': 'লাল আটার পোকা',
  'grain beetles': 'শস্য গুবি পোকা',
  'grain borer': 'শস্য ছিদ্রকারী পোকা',
  'lesser grain borer': 'ছোট শস্য ছিদ্রকারী পোকা',
  'grain weevil': 'শস্য ওয়িভিল পোকা',
  'rice weevil': 'ধান ওয়িভিল পোকা',
  'rice moth': 'ধান মথ পোকা',
  'warehouse moth': 'গুদাম মথ পোকা',
  'cigarette beetle': 'সিগারেট গুবি পোকা',
  'stored grain pests': 'গুদামজাত শস্যের পোকা',
  'pyrilla': 'পিরিল্লা পোকা',
  'sawfly': 'করাত মাছি পোকা',
  'flush worms': 'ফ্লাশ ওয়ার্ম পোকা',
  'flushworn': 'ফ্লাশ ওয়ার্ম পোকা',
  'tea mosquito bug': 'চায়ের মশা পোকা',
  'mosquito bug': 'মশা বাগ পোকা',
  'wooden pest': 'কাঠজাত পোকা',
  'bug worms': 'বাগ ও কীড়া পোকা',
  // --- Public health ---
  'mosquito': 'মশা',
  'mosquit': 'মশা',
  'mosqutio': 'মশা',
  'adult mosquito': 'পূর্ণবয়স্ক মশা',
  'adult mosqutio': 'পূর্ণবয়স্ক মশা',
  'mosquito larva': 'মশার লার্ভা',
  'mosquito larvae': 'মশার লার্ভা',
  'mosquito larva adult': 'মশার লার্ভা ও পূর্ণবয়স্ক',
  'mosquito adult': 'পূর্ণবয়স্ক মশা',
  'sandfly': 'বালু মাছি পোকা',
  'housefly': 'গৃহ মাছি পোকা',
  'house fly': 'গৃহ মাছি পোকা',
  'fly': 'মাছি পোকা',
  'bed bug': 'ছারপোকা',
  'cockroach': 'তেলাপোকা',
  'cockorach': 'তেলাপোকা',
  'cockoroach': 'তেলাপোকা',
  'ant': 'পিঁপড়া',
  'ants': 'পিঁপড়া',
  'rodent': 'ইঁদুর',
  'rats': 'ইঁদুর',
  'field rats': 'মাঠের ইঁদুর',
  'bandicoot rat': 'বড় বাঁদিকুট ইঁদুর',
  'lesser bandicoot rat': 'ছোট বাঁদিকুট ইঁদুর',
  'black rat': 'কালো ইঁদুর',
  'roof rat': 'ছাদ ইঁদুর',
  'house mouse': 'ঘর ইঁদুর',
  'nematode': 'নিমাটোড কৃমি',
  'nematodes': 'নিমাটোড কৃমি',
  'root knot nematode': 'মূল গ্রন্থি নিমাটোড',
  'rootknot nematode': 'মূল গ্রন্থি নিমাটোড',
  // --- Diseases: general ---
  'blight': 'ব্লাইট রোগ',
  'leaf blight': 'পাতার ব্লাইট রোগ',
  'early blight': 'আর্লি ব্লাইট রোগ',
  'late blight': 'লেট ব্লাইট রোগ',
  'late bight': 'লেট ব্লাইট রোগ',
  'alternaria blight': 'অল্টারনেরিয়া ব্লাইট রোগ',
  'alternaria bright': 'অল্টারনেরিয়া ব্লাইট রোগ',
  'alternaria spot': 'অল্টারনেরিয়া দাগ রোগ',
  'bipolaries leaf blight': 'বাইপোলারিস পাতার ব্লাইট রোগ',
  'purple blotch': 'পার্পল ব্লচ (বেগুনি দাগ) রোগ',
  'purple bloch': 'পার্পল ব্লচ (বেগুনি দাগ) রোগ',
  'purpule blotch': 'পার্পল ব্লচ (বেগুনি দাগ) রোগ',
  'downy mildew': 'ডাউনি মিলডিউ রোগ',
  'downey mildew': 'ডাউনি মিলডিউ রোগ',
  'powdery mildew': 'পাউডারি মিলডিউ (সাদা বাস্তা) রোগ',
  'powder mildew': 'পাউডারি মিলডিউ (সাদা বাস্তা) রোগ',
  'bacterial wilt': 'ব্যাকটেরিয়াজনিত ধসা (উইল্ট) রোগ',
  'fusarium wilt': 'ফিউজেরিয়াম উইল্ট (ধসা) রোগ',
  'wilt': 'উইল্ট (ধসা) রোগ',
  'wilting': 'ধসা রোগ',
  'root rot': 'মূল পচা রোগ',
  'foot rot': 'গোড়া পচা রোগ',
  'soft rot': 'নরম পচা রোগ',
  'black rot': 'কালো পচা রোগ',
  'block rot': 'কালো পচা রোগ',
  'bloct rot': 'কালো পচা রোগ',
  'collar rot': 'কলার পচা (গলদেশ পচা) রোগ',
  'fruit rot': 'ফল পচা রোগ',
  'boll rot': 'কুঁড়ি/বল পচা রোগ',
  'red rot': 'লাল পচা রোগ',
  'charcoal stump rot': 'কয়লা পচা রোগ',
  'sclerotinia stem rot': 'স্ক্লেরোটিনিয়া কাণ্ড পচা রোগ',
  'stem canker': 'কাণ্ড ক্যান্কার রোগ',
  'anthracnose': 'অ্যানথ্রাকনোজ (কালশিটে দাগ) রোগ',
  'amthacnose': 'অ্যানথ্রাকনোজ (কালশিটে দাগ) রোগ',
  'die back': 'ডাইব্যাক (ডগা শুকিয়ে যাওয়া) রোগ',
  'dieback': 'ডাইব্যাক (ডগা শুকিয়ে যাওয়া) রোগ',
  'd die back': 'ডাইব্যাক (ডগা শুকিয়ে যাওয়া) রোগ',
  'scab': 'স্ক্যাব (খড়খড়ে দাগ) রোগ',
  'scarb': 'স্ক্যাব (খড়খড়ে দাগ) রোগ',
  'damping off': 'ড্যাম্পিং অফ (চারা পচা) রোগ',
  'seedling blight': 'চারা ব্লাইট রোগ',
  'seedling disease': 'চারার রোগ',
  'seedling rot': 'চারা পচা',
  'seedling wilt': 'চারা ধসা',
  'seed rot': 'বীজ পচা রোগ',
  'set rot': 'সেট পচা রোগ',
  'sett rot': 'সেট পচা রোগ',
  'sett rot disease': 'সেট পচা রোগ',
  'sett treatment': 'সেট (বীজ আখ) শোধন',
  'seed treatment': 'বীজ শোধন',
  'seed borne disease': 'বীজবাহিত রোগ',
  'seed-borne blight': 'বীজবাহিত ব্লাইট রোগ',
  'seed-borne diseases': 'বীজবাহিত রোগ',
  'loose smut': 'লুজ স্মাট (খোলা কয়লা) রোগ',
  'head smut': 'হেড স্মাট রোগ',
  'false smut': 'ফলস স্মাট (মিথ্যা কয়লা) রোগ',
  'black root disease': 'কালো শিকড় পচা রোগ',
  'heart rot': 'হার্ট রট (কেন্দ্র পচা) রোগ',
  'phytophthora blight': 'ফাইটোফথোরা ব্লাইট রোগ',
  'sigatoka': 'সিগাটোকা রোগ',
  'botrytis grey mould': 'বোট্রিটিস ধূসর পচা রোগ',
  'becterial wild': 'ব্যাকটেরিয়াজনিত উইল্ট রোগ',
  'branch canker': 'ডালের ক্যান্কার রোগ',
  'bacterial canker': 'ব্যাকটেরিয়াজনিত ক্যান্কার রোগ',
  'citrus canker': 'লেবুর ক্যান্কার রোগ',
  'leaf rot': 'পাতা পচা রোগ',
  'leaf rust': 'পাতার মরিচা রোগ',
  'late rust': 'শেষ মরিচা রোগ',
  'rust': 'মরিচা রোগ',
  'red rust': 'লাল মরিচা রোগ',
  'tikka': 'টিক্কা রোগ',
  'tikka disease': 'টিক্কা রোগ',
  'tikka leaf spot': 'টিক্কা পাতায় দাগ রোগ',
  'tikka rust': 'টিক্কা মরিচা রোগ',
  'tikka rust spot': 'টিক্কা মরিচা দাগ রোগ',
  'leaf spot': 'পাতায় দাগ রোগ',
  'frog eye leaf spot': 'ফ্রগ আই ও পাতায় দাগ রোগ',
  'gummosis': 'গামোসিস (আঠা নিঃসরণ) রোগ',
  'pineapple disease': 'পাইনঅ্যাপেল (সেট পচা) রোগ',
  'pineapple red rot': 'আখের লাল পচা রোগ',
  'bagracote': 'ব্ল্যাক কোট রোগ',
  'black bend': 'কালো দাগ রোগ',
  'black bont': 'কালো দাগ রোগ',
  'black scarf': 'কালো খোসা রোগ',
  'black scurf': 'কালো খোসা (ব্ল্যাক স্কার্ফ) রোগ',
  'gall': 'গ্যাল (বৃদ্ধি কুঁড়ি)',
  'soil treatment': 'মাটি শোধন',
  'anti sprouting': 'অঙ্কুরোদগম রোধ',
  // --- Weeds ---
  'weed': 'আগাছা',
  'weeds': 'আগাছা',
  'weed complex': 'মিশ্র আগাছা',
  'broad leaf': 'চওড়া পাতার আগাছা',
  'broad leaves': 'চওড়া পাতার আগাছা',
  'broadleaf weeds': 'চওড়া পাতার আগাছা',
  'broad leaf weed': 'চওড়া পাতার আগাছা',
  'broad leaf weeds': 'চওড়া পাতার আগাছা',
  'broadlead and sedge': 'চওড়া পাতা ও মোথা আগাছা',
  'broad leaf and sedge': 'চওড়া পাতা ও মোথা আগাছা',
  'grass': 'ঘাস জাতীয় আগাছা',
  'annual grasses': 'বার্ষিক ঘাস জাতীয় আগাছা',
  'perennial grasses': 'বহুবর্ষজীবী ঘাস জাতীয় আগাছা',
  'sedge': 'মোথা জাতীয় আগাছা',
  'sedges': 'মোথা জাতীয় আগাছা',
  'perennial sedges': 'বহুবর্ষজীবী মোথা জাতীয় আগাছা',
  'dicot': 'ডাইকট (চওড়া পাতা) আগাছা',
  'dicot weed': 'ডাইকট (চওড়া পাতা) আগাছা',
  'monocot': 'মনোকট (ঘাসজাত) আগাছা',
  'monocot weed': 'মনোকট (ঘাসজাত) আগাছা',
  'deep rooted perennial weeds': 'গভীর মূলের বহুবর্ষজীবী আগাছা',
  'durba': 'দুর্বা ঘাস',
  'durba gaghra': 'দুর্বা ঘাস',
  'bathua': 'বথুয়া শাক',
  'commelina': 'কন্দালি লতা',
  'ludwigia': 'লুডউইজিয়া আগাছা',
  'marsilea': 'শুশুনি শাক',
  'monochoria': 'নুনিয়া আগাছা',
  'mimosa pudica': 'লজ্জাবতী লতা (Mimosa pudica)',
  'mikania': 'মিকানিয়া (আসাম লতা)',
  'mikania creeper': 'মিকানিয়া (আসাম লতা)',
  'eclipta alba': 'কালো কেশুতি (Eclipta alba)',
  'eclipta prostrata': 'কালো কেশুতি (Eclipta prostrata)',
  'imperata': 'ছন ঘাস (Imperata)',
  'imperata cylindrica': 'ছন ঘাস (Imperata cylindrica)',
  'echinochloa': 'শামা ঘাস',
  'echinochloa spp': 'শামা ঘাস জাতীয়',
  'wild oats': 'বুনো ওট',
  'canary grass': 'ক্যানারি ঘাস (Phalaris)',
  'sida acuta': 'বেলাকুড়ি (Sida acuta)',
  'digera arvensis': 'অমরনাথ আগাছা (Digera arvensis)',
  'fast contact burn-down of annual grasses': 'বার্ষিক ঘাসের দ্রুত সংস্পর্শ নিয়ন্ত্রণ',
  'fuskabegun nunia': 'ফুসকা বেগুন নুনিয়া',
  'sun grass other grasses': 'সান ঘাস ও অন্যান্য ঘাস',
  'shaknotey carpet': 'শ্যামনোটে কার্পেট আগাছা',
  'tobacco caterpillar': 'তামাক পাতা খাওয়া কীড়া পোকা',
  'leaf': 'পাতা',
  'neck': 'শীষের গোড়া',
  'seed borne': 'বীজবাহিত',
  'spotted': 'ডোরাকাটা',
  'american': 'আমেরিকান',
  'nymphs': 'নিম্ফ',
  'other mites': 'অন্যান্য মাকড়',
  'others mites': 'অন্যান্য মাকড়',
  'adult larva adult': 'পূর্ণবয়স্ক ও লার্ভা',
  // --- Multipart fillers ---
  'adult': 'পূর্ণবয়স্ক',
  'adult larva': 'পূর্ণবয়স্ক ও লার্ভা',
  'larva': 'লার্ভা',
  'larvae': 'লার্ভা',
  'and gall midge': 'এবং গল মিজ পোকা',
  'mosquito net': 'মশারি',
  'foot': 'গোড়া',
  'root': 'মূল',
  'rot': 'পচা',
  'purple': 'বেগুনি দাগ',
  'root rot gummosis': 'মূল পচা ও আঠা নিঃসরণ রোগ',
  // --- Coverage pass 2 (typos, variants, compounds) ---
  'boll worm': 'বলওয়ার্ম পোকা',
  'adult mosquit': 'পূর্ণবয়স্ক মশা',
  'annual grass': 'বার্ষিক ঘাস জাতীয় আগাছা',
  'other weeds': 'অন্যান্য আগাছা',
  'anthracnose bool rot': 'অ্যানথ্রাকনোজ ও কালো পচা রোগ',
  'barnyard grass': 'বড় শামা ঘাস (বার্নিয়ার্ড ঘাস)',
  'bittle leaf': 'পান',
  'blister blight': 'ব্লিস্টার ব্লাইট (ফোসকা দাগ) রোগ',
  'brown blight': 'ব্রাউন ব্লাইট রোগ',
  'broad': 'চওড়া পাতার আগাছা',
  'broad lead': 'চওড়া পাতার আগাছা',
  'broad leadf': 'চওড়া পাতার আগাছা',
  'broadleaf': 'চওড়া পাতার আগাছা',
  'sadges': 'মোথা জাতীয় আগাছা',
  'sadge': 'মোথা জাতীয় আগাছা',
  'sedge weeds': 'মোথা জাতীয় আগাছা',
  'grass weed': 'ঘাস জাতীয় আগাছা',
  'chilli thrips': 'মরিচের থ্রিপস পোকা',
  'cotton leaf caterpillar': 'তুলার পাতা খাওয়া কীড়া পোকা',
  'cutworms': 'কাটওয়ার্ম পোকা',
  'bermuda grass': 'দুর্বা ঘাস',
  'die bback': 'ডাইব্যাক (ডগা শুকিয়ে যাওয়া) রোগ',
  'gall ma': 'গল (বৃদ্ধি কুঁড়ি)',
  'wither tip': 'ডগা শুকাসু রোগ',
  'early & late blight': 'আর্লি ও লেট ব্লাইট রোগ',
  'early and late blight': 'আর্লি ও লেট ব্লাইট রোগ',
  'late & early blight': 'আর্লি ও লেট ব্লাইট রোগ',
  'late early blight': 'আর্লি ও লেট ব্লাইট রোগ',
  'early & top shoot borer': 'আগাম ও শীর্ষ ডগা ছিদ্রকারী পোকা',
  'early & top shootborer': 'আগাম ও শীর্ষ ডগা ছিদ্রকারী পোকা',
  'top & early shootborer': 'আগাম ও শীর্ষ ডগা ছিদ্রকারী পোকা',
  'top & early shoot borer': 'আগাম ও শীর্ষ ডগা ছিদ্রকারী পোকা',
  'top shootborer early shootborer': 'আগাম ও শীর্ষ ডগা ছিদ্রকারী পোকা',
  'early shootborer': 'আগাম ডগা ছিদ্রকারী পোকা',
  'kachuripana': 'কচুরিপানা',
  'water hyacinth': 'কচুরিপানা',
  'foot rot seedling blight': 'গোড়া পচা ও চারা ব্লাইট রোগ',
  'hairy caterpillr': 'লোমশ কীড়া পোকা',
  'leaf rollerr': 'পাতা গুটানো পোকা',
  'leaf hopper': 'পাতা ফড়িং পোকা',
  'leaf spot rust': 'পাতায় দাগ ও মরিচা রোগ',
  'rust leaf blight': 'মরিচা ও পাতার ব্লাইট রোগ',
  'phytophthora root rot': 'ফাইটোফথোরা মূল পচা রোগ',
  'phytopthora blight': 'ফাইটোফথোরা ব্লাইট রোগ',
  'purple nutsedge': 'মোথা (বেগুনি)',
  'yellow nutsedge': 'হলদে মোথা',
  'mice': 'ইঁদুর',
  'thips': 'থ্রিপস পোকা',
  'red grain beetle': 'লাল শস্য গুবি পোকা',
  'red grain bettle': 'লাল শস্য গুবি পোকা',
  'red rusr': 'লাল মরিচা রোগ',
  'red rust disease': 'লাল মরিচা রোগ',
  'other mite': 'অন্যান্য মাকড়',
  'ref spider mite': 'লাল মাকড়',
  'rice blast pyricularia oryzae - leaf blast, neck blast, node blast': 'ধানের ব্লাস্ট রোগ (পাতা, শীষমুখ, গিঁট)',
  'seedling damping off': 'চারা ড্যাম্পিং অফ (চারা পচা) রোগ',
  'seedling disease wilting soft': 'চারার রোগ, ধসা ও নরম পচা',
  'shoot': 'ডগা',
  'fruitborer': 'ফলছিদ্রকারী পোকা',
  'stand': 'চারা',
  'shrubs': 'ঝোপ আগাছা',
  'woody perennial weeds': 'কাষ্ঠল বহুবর্ষজীবী আগাছা',
  'bug': 'বাগ পোকা',
  'whit grub': 'সাদা গ্রাব পোকা',
  'vine rot': 'লতা পচা রোগ',
  'wheat blast': 'গমের ব্লাস্ট রোগ',
  'wheat leaf rust': 'গমের পাতার মরিচা রোগ',
  'white rust': 'সাদা মরিচা রোগ',
  'whitefly nymphs': 'সাদা মাছি পোকা (নিম্ফ)',
  'yellow red mites': 'হলদে ও লাল মাকড়',
  'yellow mites others mites': 'হলদে ও অন্যান্য মাকড়',
  'yelow mite': 'হলদে মাকড়',
  'red spider mite thips': 'লাল মাকড় ও থ্রিপস পোকা'
};

/** Runtime-normalized view of PEST_BN_RAW (keys: normKey form). */
export const PEST_BN: Record<string, string> = Object.fromEntries(
  Object.entries(PEST_BN_RAW).map(([k, v]) => [normKey(k), v])
);

/** Split compounds ("Aphid & Jassid", "Wilt & Early blight", "Mosquito/Cockroach")
 *  and translate part-by-part. Parenthetical Latin names are preserved.
 *  Returns original string if ANY part is untranslatable (no half-mixed output). */
const SEG_SPLIT = /\s*(?:&|\+|\/|,|\band\b|\bwith\b)\s*/i;

const translatePart = (part: string): string | null => {
  const trimmed = part.trim();
  if (!trimmed) return '';
  // Extract trailing parenthetical (Latin binomial) — keep as-is
  const m = trimmed.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  const base = (m ? m[1] : trimmed).trim();
  const paren = m ? ` (${m[2].trim()})` : '';
  // Skip pure numbers/units/artifacts inside base
  if (!base) return paren || '';
  if (/^[\d.\s]*(g|gm|kg|ml|l|lt)?\/?(ha|l|kg)?$/i.test(base) && !/[a-z]{3,}/i.test(base)) {
    return null; // dosage-like junk — abort compound
  }
  const bn = PEST_BN[normKey(base)] || CROP_BN[normKey(base)];
  return bn ? bn + paren : null;
};

/** Translate parenthetical glosses ("Leaf & Neck", "Dicot"). Returns null if any part unknown. */
const translateParen = (paren: string): string | null => {
  const parts = paren.split(SEG_SPLIT);
  const out: string[] = [];
  for (const p of parts) {
    const trimmed = p.trim();
    if (!trimmed) continue;
    if (/^[\d.\s-]+$/.test(trimmed)) { out.push(trimmed); continue; }
    const bn = PEST_BN[normKey(trimmed)] || CROP_BN[normKey(trimmed)];
    if (!bn) return null;
    // Strip nested parentheses inside mapped value (e.g. "ডাইকট (চওড়া পাতা) আগাছা")
    out.push(bn.replace(/\s*\([^)]*\)/g, '').trim());
  }
  return out.length ? out.join(' ও ') : null;
};

const lookupBn = (s: string): string | undefined => PEST_BN[normKey(s)] || CROP_BN[normKey(s)];

export const translatePest = (s: string, lang: Lang): string => {
  if (!s || lang !== 'bn') return s;
  const exact = lookupBn(s);
  if (exact) return exact;
  // Paren-first: "Aphids (Lipaphis erysimi)" → "জাব পোকা (Lipaphis erysimi)"
  const m = s.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (m) {
    const base = m[1].trim();
    const paren = m[2].trim();
    const baseBn = base ? lookupBn(base) : undefined;
    const parenBn = translateParen(paren);
    if (baseBn && parenBn) return `${baseBn} (${parenBn})`;
    if (baseBn) return `${baseBn} (${paren})`;
    // Latin base with translatable gloss → Bangla first, Latin kept in parens
    if (!baseBn && parenBn && /[A-Z][a-z]+ [a-z]/.test(base)) {
      const parts = parenBn.split(/ ও /);
      return `${parts.join(' ও ')} (${base})`;
    }
    return s;
  }
  // Compound split: "BPH & Hispa", "Wilt & Early blight", "Mosquito/Cockroach"
  const parts = s.split(SEG_SPLIT);
  if (parts.length <= 1) return s;
  const out: string[] = [];
  for (const p of parts) {
    const t = translatePart(p);
    if (t === null) return s; // any unknown part → keep original English
    out.push(t);
  }
  return out.filter(Boolean).join(' ও ');
};

export const translateCrop = (s: string, lang: Lang): string => {
  if (!s || lang !== 'bn') return s;
  if (PEST_BN[normKey(s)]) return PEST_BN[normKey(s)];
  if (CROP_BN[normKey(s)]) return CROP_BN[normKey(s)];
  return s;
};

/* ------------------------------------------------------------------ */
/* SAFETY/ROTATION NOTES boilerplate (top-frequency coverage)          */
/* ------------------------------------------------------------------ */
export const NOTE_BN_RAW: Record<string, string> = {
  'dual action protectant fungicide and miticide with multi site contact action': 'বহুস্থলীয় সংস্পর্শ ক্রিয়াসহ দ্বৈত কার্যকর প্রতিরোধমূলক ছত্রাকনাশক ও মাকড়নাশক',
  'do not apply when ambient temperatures exceed 32 c to prevent crop scorch phytotoxicity': 'ফসল পোড়া (ফাইটোটক্সিসিটি) রোধ করতে পরিবেষ্টিত তাপমাত্রা ৩২°সে অতিক্রম করলে প্রয়োগ করবেন না',
  'do not mix with mineral oils or apply within 21 days of an oil spray': 'খনিজ তেলের সাথে মেশাবেন না বা তেল স্প্রের ২১ দিনের মধ্যে প্রয়োগ করবেন না',
  'multi site contact protectant containing zinc and manganese micronutrients': 'জিংক ও ম্যাঙ্গানিজ খাদ্যউপাদানসমৃদ্ধ বহুস্থলীয় সংস্পর্শ প্রতিরোধমূলক ওষুধ',
  'inactivates essential sulfhydryl sh groups in fungal respiratory enzymes': 'ছত্রাকের শ্বসন এনজাইমের অপরিহার্য সালফহাইড্রিল (-SH) গ্রুপ নিষ্ক্রিয় করে',
  'do not inhale dust during mixing wear dust mask and wash hands before eating': 'মেশানোর সময় ধুলা শ্বাসের সাথে নেবেন না; ডাস্ট মাস্ক পরুন এবং খাওয়ার আগে হাত ধুয়ে নিন',
  'non selective broad spectrum systemic herbicide translocated to roots and rhizomes': 'মূল ও রাইজোমে পরিবাহিত অনির্বাচী বিস্তৃত-মাত্রার দেহরসবাহী আগাছানাশক',
  'use strictly with spray shields hoods in tea and orchard inter rows zero crop contact permitted': 'চা বাগান ও বাগানের সারিতে কঠোরভাবে স্প্রে শিল্ড/হুড ব্যবহার করুন; ফসলের সংস্পর্শ একেবারেই নিষিদ্ধ',
  'use clean dirt free water to prevent herbicide deactivation by suspended clay particles': 'ঝুলন্ত কাদাকণা দ্বারা আগাছানাশক নিষ্ক্রিয় হওয়া রোধে পরিষ্কার, কাদামুক্ত পানি ব্যবহার করুন',
  'derived from natural soil bacterium streptomyces avermitilis': 'প্রাকৃতিক মাটির ব্যাকটেরিয়া (Streptomyces avermitilis) থেকে উৎপাদিত',
  'translaminar insecticide miticide penetrates leaf tissue to target hidden pests': 'ট্রান্সলামিনার কীটনাশক/মাকড়নাশক; পাতার টিস্যুতে প্রবেশ করে লুকানো পোকা দমন করে',
  'toxic to bees when wet apply strictly in late afternoon or early evening': 'ভেজা অবস্থায় মৌমাছির জন্য বিষাক্ত; বিকেল শেষ বা সন্ধ্যার শুরুতেই প্রয়োগ করুন',
  'toxic to aquatic organisms maintain 15 meter buffer from aquaculture ponds': 'জলজ প্রাণীর জন্য বিষাক্ত; মাছ চাষের পুকুর থেকে ১৫ মিটার ব্যবধান রাখুন',
  'systemic fungicide inhibiting beta tubulin polymerization during cell division': 'কোষ বিভাজনের সময় বিটা-টিউবুলিন পলিমারাইজেশন বাধা দেয় এমন দেহরসবাহী ছত্রাকনাশক',
  'high cross resistance risk within all mbc fungicides': 'সব MBC ছত্রাকনাশকের মধ্যে উচ্চ ক্রস-প্রতিরোধ ঝুঁকি',
  'wear protective gloves and avoid breathing spray mist': 'সুরক্ষামূলক গ্লাভস পরুন এবং স্প্রের কুয়াশা শ্বাসের সাথে নেবেন না',
  'systemic triazole with protective curative and antisporulant properties': 'প্রতিরোধমূলক, নিরাময়মূলক ও বীজাণু-বিস্তার রোধী বৈশিষ্ট্যসম্পন্ন দেহরসবাহী ট্রায়াজল',
  'prime choice for rice sheath blight rhizoctonia solani and mango anthracnose': 'ধানের শীথ ব্লাইট (Rhizoctonia solani) ও আমের অ্যানথ্রাকনোজের জন্য সর্বোত্তম নির্বাচন',
  'toxic to aquatic organisms maintain 10 meter boundary from irrigation ditches': 'জলজ প্রাণীর জন্য বিষাক্ত; সেচ নালা থেকে ১০ মিটার ব্যবধান রাখুন',
  'potent systemic curative triazole for sheath blight rust and leaf blast in rice and cereals': 'ধান ও শস্যের শীথ ব্লাইট, মরিচা ও পাতায় ব্লাস্টের জন্য শক্তিশালী দেহরসবাহী নিরাময়মূলক ট্রায়াজল',
  'rapid absorption within 1 hour exhibits strong acropetal translocation': '১ ঘণ্টার মধ্যে দ্রুত শোষিত হয়; শক্তিশালী ঊর্ধ্বমুখী পরিবহন ক্ষমতা সম্পন্ন',
  'toxic to fish do not apply near open water bodies or fish cum paddy operations': 'মাছের জন্য বিষাক্ত; খোলা জলাশয় বা ধান-মাছ চাষের পাশে প্রয়োগ করবেন না',
  'gold standard combination for late blight downy mildew and phytophthora rot': 'লেট ব্লাইট, ডাউনি মিলডিউ ও ফাইটোফথোরা পচার জন্য গোল্ড স্ট্যান্ডার্ড সমন্বয়',
  'metalaxyl provides fast systemic xylem transport to protect new un sprayed shoots': 'মেটালাক্সিল দ্রুত দেহরসবাহী জাইলেম পরিবহনের মাধ্যমে নতুন অস্প্রে করা ডগা সুরক্ষিত রাখে',
  'prevent resistance by limiting to 2 3 applications per crop season': 'ফসলের মৌসুমে ২-৩ বারের বেশি প্রয়োগ না করে প্রতিরোধ ক্ষমতা তৈরি রোধ করুন',
  'widely used dual action fungicide combining systemic curative reach with contact exterior shield': 'দেহরসবাহী নিরাময়মূলক কার্যকারিতা ও সংস্পর্শ-বহিঃস্তর সুরক্ষার সমন্বয়ে বহুল ব্যবহৃত দ্বৈত কার্যকর ছত্রাকনাশক',
  'effective against blast sheath rot tikka leaf spot anthracnose and damping off': 'ব্লাস্ট, শীথ রট, টিক্কা পাতায় দাগ, অ্যানথ্রাকনোজ ও ড্যাম্পিং অফ দমনে কার্যকর',
  'ensure complete foliar coverage on upper and lower leaf surfaces': 'পাতার উপরিভাগ ও নিচের পৃষ্ঠে সম্পূর্ণ প্রলেপ নিশ্চিত করুন',
  'contact and translaminar fungicide with protective and curative action against alternaria botrytis and sclerotinia': 'অল্টারনেরিয়া, বোট্রিটিস ও স্ক্লেরোটিনিয়ার বিরুদ্ধে প্রতিরোধ-নিরাময় ক্রিয়াসম্পন্ন সংস্পর্শ ও ট্রান্সলামিনার ছত্রাকনাশক',
  'inhibits fungal dna and lipid peroxidation via osmotic signal transduction': 'অজমোটিক সংকেত পরিবহনের মাধ্যমে ছত্রাকের DNA ও লিপিড পারঅক্সিডেশন বাধা দেয়',
  'zero known resistance development cornerstone resistance management partner for systemic fungicides and miticides': 'কোনো প্রতিরোধ ক্ষমতা তৈরির ঘটনা নেই। দেহরসবাহী ছত্রাকনাশক ও মাকড়নাশকের জন্য মূল প্রতিরোধ-ব্যবস্থাপনা সঙ্গী।',
  'no known fungal resistance after decades of global use ideal mixing and rotation partner for all single site systemics': 'বিশ্বব্যাপী দশকের ব্যবহারের পরেও কোনো ছত্রাক প্রতিরোধ জানা নেই। সব এক-স্থলীয় দেহরসবাহী ওষুধের জন্য আদর্শ মিশ্রণ ও ঘূর্ণন সঙ্গী।',
  'do not use as sole weed control method integrate mechanical weeding and cover cropping': 'একমাত্র আগাছা দমন পদ্ধতি হিসেবে ব্যবহার করবেন না। যান্ত্রিক আগাছা দমন ও কভার ক্রপের সাথে একীভূত করুন।',
  'maximum 2 applications per crop cycle rotate with irac 10a hexythiazox 12c propargite or 21a fenazaquin to manage mite resistance': 'প্রতি ফসল চক্রে সর্বোচ্চ ২ বার প্রয়োগ। মাকড় প্রতিরোধ ব্যবস্থাপনার জন্য IRAC 10A (Hexythiazox), 12C (Propargite) বা 21A (Fenazaquin) এর সাথে ঘূর্ণন করুন।',
  'never apply consecutively must be tank mixed or alternated with multi site contact fungicides m03 m01': 'কখনো পরপর প্রয়োগ করবেন না। বহুস্থলীয় সংস্পর্শ ছত্রাকনাশক (M03, M01) এর সাথে ট্যাংক-মিক্স বা পর্যায়ক্রমে ব্যবহার বাধ্যতামূলক।',
  'rotate with qoi frac 11 sdhi frac 7 or multi site dithiocarbamates m03': 'QoI (FRAC 11), SDHI (FRAC 7) বা বহুস্থলীয় ডাইথিওকার্বামেট (M03) এর সাথে ঘূর্ণন করুন।',
  'rotate with qoi frac 11 or mancozeb frac m03 limit to 2 sprays per season': 'QoI (FRAC 11) বা ম্যানকোজেব (FRAC M03) এর সাথে ঘূর্ণন করুন। মৌসুমে ২ বার স্প্রের মধ্যে সীমাবদ্ধ রাখুন।',
  'rotate with caa fungicides frac 40 or cyazofamid frac 21': 'CAA ছত্রাকনাশক (FRAC 40) বা সাইয়াজোফামিড (FRAC 21) এর সাথে ঘূর্ণন করুন।',
  'rotate with triazoles frac 3 or strobilurins frac 11': 'ট্রায়াজল (FRAC 3) বা স্ট্রোবিলুরিন (FRAC 11) এর সাথে ঘূর্ণন করুন।',
  'limit to 2 applications per crop cycle alternate with frac 7 frac 3 or frac m03': 'প্রতি ফসল চক্রে ২ বারের মধ্যে সীমাবদ্ধ রাখুন। FRAC 7, FRAC 3 বা FRAC M03 এর সাথে পর্যায়ক্রমে ব্যবহার করুন।',
  'no resistance issues ideal for disease suppression and resistance stewardship': 'প্রতিরোধের কোনো ঝুঁকি নেই। রোগ দমন ও প্রতিরোধ ব্যবস্থাপনার জন্য আদর্শ।',
  'rotate with chloroacetamides hrac 15 or synthetic auxins hrac 4': 'ক্লোরোঅ্যাসিটামাইড (HRAC 15) বা কৃত্রিম অক্সিন (HRAC 4) এর সাথে ঘূর্ণন করুন।',
  'rotate with als inhibitors hrac 2 or synthetic auxins hrac 4': 'ALS নিবারক (HRAC 2) বা কৃত্রিম অক্সিন (HRAC 4) এর সাথে ঘূর্ণন করুন।',
  'rotate with non als herbicides hrac 15 hrac 4 to prevent sulfonylurea resistance': 'সালফোনিলিউরিয়া প্রতিরোধ রোধে ALS-বহির্ভূত আগাছানাশক (HRAC 15, HRAC 4) এর সাথে ঘূর্ণন করুন।',
  'rotate with multi site protectants frac m03 or sdhis frac 7': 'বহুস্থলীয় প্রতিরোধমূলক (FRAC M03) বা SDHI (FRAC 7) শ্রেণির সাথে ঘূর্ণন করুন।',
  'alternate with dimethomorph frac 40 or fluopicolide frac 43': 'ডাইমেথোমর্ফ (FRAC 40) বা ফ্লুওপিকোলাইড (FRAC 43) এর সাথে পর্যায়ক্রমে ব্যবহার করুন।',
};

/** Runtime-normalized view of NOTE_BN_RAW. */
export const NOTE_BN: Record<string, string> = Object.fromEntries(
  Object.entries(NOTE_BN_RAW).map(([k, v]) => [normKey(k), v])
);

export const translateNote = (s: string, lang: Lang): string => {
  if (!s || lang !== 'bn') return s;
  return NOTE_BN[normKey(s)] || s;
};

/** Returns the Bangla translation if available, else undefined. */
export const lookupNoteBn = (s: string): string | undefined =>
  s ? NOTE_BN[normKey(s)] : undefined;

/* ------------------------------------------------------------------ */
/* DOSAGE LINES: "2 ml/L of water; 2.80 Kg/ha" → "২ মিলি/লিটার পানি; …" */
/* ------------------------------------------------------------------ */
const DOSAGE_UNIT_BN: [RegExp, string][] = [
  [/\bkg\s*a\.?i\.?\/ha\b/gi, 'কেজি কার্যকর উপাদান/হেক্টর'],
  [/\bml\/kg of seed\b/gi, 'মিলি/কেজি বীজ'],
  [/\bg\/kg of seed\b/gi, 'গ্রাম/কেজি বীজ'],
  [/\bml\/kg seed\b/gi, 'মিলি/কেজি বীজ'],
  [/\bg\/kg seed\b/gi, 'গ্রাম/কেজি বীজ'],
  [/\bml\/l of water\b/gi, 'মিলি/লিটার পানি'],
  [/\bg\/l of water\b/gi, 'গ্রাম/লিটার পানি'],
  [/\bml\/l\b/gi, 'মিলি/লিটার'],
  [/\bg\/l\b/gi, 'গ্রাম/লিটার'],
  [/\bkg\/ha\b/gi, 'কেজি/হেক্টর'],
  [/\bl\/ha\b/gi, 'লিটার/হেক্টর'],
  [/\bml\/ha\b/gi, 'মিলি/হেক্টর'],
  [/\bgm\/ha\b/gi, 'গ্রাম/হেক্টর'],
  [/\bg\/ha\b/gi, 'গ্রাম/হেক্টর'],
  [/\blitre?s?\b/gi, 'লিটার'],
  [/\bgram(s)?\b/gi, 'গ্রাম'],
  [/\btablet(s)?\b/gi, 'ট্যাবলেট'],
  [/\btrap(s)?\b/gi, 'ফাঁদ'],
  [/\bof water\b/gi, 'পানির সাথে'],
  [/\bper\b/gi, 'প্রতি'],
  [/\bton(s)?\b/gi, 'টন'],
  [/\bapprox\.?\b/gi, 'প্রায়'],
  [/\bpheromone\b/gi, 'ফেরোমন'],
  [/\blure(s)?\b/gi, 'লিউর'],
  [/\btank\b/gi, 'ট্যাংক'],
  [/\bfor\b/gi, 'জন্য'],
  [/\bharvest\b/gi, 'ফসল'],
  [/\bml\b/gi, 'মিলি'],
  [/(\d)\s*L\b/g, '$1 লিটার'],
  [/\bml\//gi, 'মিলি/'],
  [/\bgm\//gi, 'গ্রাম/'],
  [/\bg\//gi, 'গ্রাম/'],
  [/\bkg\//gi, 'কেজি/'],
  [/\ba\.?i\.?\b/gi, 'কার্যকর উপাদান']
];

export const translateDosage = (s: string, lang: Lang): string => {
  if (!s || lang !== 'bn') return s;
  let out = s;
  for (const [re, bn] of DOSAGE_UNIT_BN) out = out.replace(re, bn);
  // Bangla digits
  out = out.replace(/[0-9]/g, (w) => '০১২৩৪৫৬৭৮৯'[+w]);
  return out;
};
