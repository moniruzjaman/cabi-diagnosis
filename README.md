# 🌾 উদ্ভিদ গোয়েন্দা (Plant Detective)

> AI-powered CABI diagnostic process trainer for Bangladesh farmers — learn crop problem identification through guided steps, interactive games, and hands-on diagnosis.

![Smart Agri EcoSystem](https://img.shields.io/badge/Bangladesh-Extension%20Tool-green)
![Version](https://img.shields.io/badge/version-4.0.0-brightgreen)
![React](https://img.shields.io/badge/React-18-blue)
![Vite](https://img.shields.io/badge/Vite-5-purple)
![PWA](https://img.shields.io/badge/PWA-Installable-9cf)

## Overview

উদ্ভিদ গোয়েন্দা (Plant Detective) is a mobile-first educational app designed to teach Bangladesh farmers and extension workers the **CABI Plantwise 5-step diagnostic process**. Rather than just giving answers, it trains users to systematically identify crop problems — from symptom observation to IPM decision-making.

## ✨ Key Features

### 🎓 Learning-Focused Design
- **CABI 5-Step Guide** — Step-by-step read-aloud guide covering the full diagnostic protocol (Observation → Exclusion → Disease Triangle → Confirmation → IPM Decision)
- **5 Interactive Games** — SymptomSpotter, CauseDetective, DiseaseTriangle, FieldScout, IPM Commander — practice each diagnostic step through play
- **Learning Path** — Visual timeline guiding users through Guide → Game → Diagnose progression
- **Read-Aloud TTS** — Bengali text-to-speech accessibility for illiterate farmers (🔊 on every section)

### 🔬 Smart Diagnosis
- **AI-Powered Identification** — Multi-provider AI waterfall (Claude, Gemini, Groq, OpenRouter) for crop problem diagnosis
- **280+ Symptom Images** — Visual reference gallery for pest, disease, and deficiency identification
- **Bangladesh Context** — DAE, BRRI, BARI recommendations; local pesticide brands and dosage
- **Weather-Aware** — Real-time temperature, humidity, rainfall with pest-risk assessment
- **Spraying Conditions** — Wind, UV, and rain-based spray timing guidance

### 📱 Modern Mobile-First UI
- **Bottom Navigation** — 5-tab bar (Home, Diagnose, Library, Learn, More) with green active indicator
- **Clean Card Layout** — Soft shadows, rounded corners, neutral background
- **Hero Banner** — Green gradient with floating leaf animations and prominent CTAs
- **Weather Dashboard** — Temperature, humidity, and rainfall metrics in colored cards
- **Knowledge Hub** — 2×2 grid for quick access to all learning resources
- **PWA Installable** — Works offline as a native-like app on Android/iOS

### 📚 Rich Content Library
- **Video Gallery** — 9 categorized tutorial videos from Google Drive (Introduction, Diagnosis, Management, Pests)
- **YouTube Integration** — @AgriWisdomBd channel embed for Plant Detective playlists
- **CABI Ready Reckoner** — Full ETL (Economic Threshold Level) tables, IPM Pyramid, Nutrient deficiency guide
- **External Apps Hub** — Quick links to Krishi AI, GAP Brinjal, CIRDAP GreenLoop

### 🏆 Engagement Features
- **Award Crests** — Achievement badges for completing each diagnostic game
- **Social Sharing** — Share diagnoses via Facebook, LinkedIn, and more
- **Diagnosis History** — Saved past reports with crop, district, and date tracking
- **Visitor Analytics** — Usage tracking for improvement insights

## 🌍 Bangladesh Coverage

| Feature | Details |
|---------|---------|
| **Crops** | 100+ varieties across 10 categories (Rice, Jute, Potato, Tomato, Brinjal, Mustard, Banana, Mango, Wheat, Maize) |
| **Districts** | 25+ Bangladesh districts with local context |
| **Seasons** | Boro, Aman, Aus, Rabi, Kharif-1, Kharif-2 |
| **Pesticides** | 72+ DAE-approved products with local brand names |
| **Pests/Diseases** | Comprehensive database with symptom images |

## 🛠 Tech Stack

- **Frontend:** React 18 + Vite 5 (single-file architecture)
- **AI Providers:** Anthropic Claude, Google Gemini, Groq, OpenRouter (multi-provider fallback)
- **Styling:** Inline CSS-in-JS with design tokens + CSS custom properties
- **Fonts:** Noto Sans Bengali, Plus Jakarta Sans, Inter (Google Fonts)
- **TTS:** Web Speech API (bn-BD) with custom rate/pitch tuning
- **PWA:** Service Worker + Web App Manifest
- **Deployment:** Vercel with serverless API proxy

## 📁 Project Structure

```
cabi-diagnosis/
├── src/
│   ├── App.jsx                    # Main app (~2800 lines, all components)
│   ├── main.jsx                   # React entry point
│   ├── hooks/
│   │   └── useTTS.js              # Custom text-to-speech hook
│   ├── games/
│   │   ├── SymptomSpotter.jsx     # Game: Match symptoms to causes
│   │   ├── CauseDetective.jsx     # Game: Identify biotic vs abiotic
│   │   ├── DiseaseTriangle.jsx    # Game: Disease triangle analysis
│   │   ├── FieldScout.jsx         # Game: Field diagnosis practice
│   │   ├── IPMCommander.jsx       # Game: IPM decision making
│   │   ├── SymptomImageGallery.jsx
│   │   └── imageMap.js            # 280+ symptom image mappings
│   └── offline/
│       ├── index.js               # Offline diagnosis engine
│       ├── diagnosticEngine.js    # Rule-based diagnostic logic
│       └── OfflineDiagnosis.jsx   # Offline UI component
├── public/
│   ├── images/                    # 280+ diagnostic symptom images
│   ├── manifest.json              # PWA manifest
│   ├── sw.js                      # Service worker
│   ├── pesticides.json            # DAE-approved pesticide database
│   ├── cabi-logo.jpg/png          # CABI branding assets
│   └── favicon.png/svg            # App icons
├── api/                           # Vercel serverless functions
│   ├── diagnose.js                # AI diagnosis proxy
│   ├── analytics.js               # Usage tracking
│   └── feedback.js                # User feedback
├── index.html
├── package.json
└── vite.config.js
```

## 🚀 Getting Started

**Prerequisites:** Node.js 18+

```bash
# Clone the repo
git clone https://github.com/moniruzjaman/cabi-diagnosis.git
cd cabi-diagnosis

# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Open [http://localhost:5173](http://localhost:5173)

## 📲 Install as App

The app is PWA-enabled. On Android Chrome:
1. Open the app URL
2. Tap "Add to Home Screen" from the browser menu
3. The app installs as a native-like experience

## 🌐 Deploy

```bash
npm run build
# Deploy dist/ to Vercel, Netlify, or any static host
```

**Vercel:** Connect your GitHub repo at [vercel.com](https://vercel.com)

## 📋 Tab Navigation

| Tab | Bangla | Purpose |
|-----|--------|---------|
| 🏠 Home | হোম | Hero banner, weather, knowledge hub, learning path |
| 🔬 Diagnose | নির্ণয় | AI-powered crop problem identification |
| 📚 Library | ভান্ডার | Videos, slides, readings, audio resources |
| 📖 Learn | শিখুন | CABI Guide + 5 interactive games hub |
| ⋯ More | আরও | External apps + diagnosis history |

## 🤝 Credits

**Supported by:** CABI Plantwise · DAE Bangladesh · BRRI · BARI  
**Built with:** React · Vite · Claude AI · Google Fonts  
**YouTube:** [@AgriWisdomBd](https://youtube.com/@AgriWisdomBd)

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
