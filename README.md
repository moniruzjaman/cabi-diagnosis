# 🌾 CABI Smart Crop Diagnosis — Bangladesh

> AI-powered pest, disease and nutrient deficiency identification tool for Bangladesh farmers and extension workers.

![Smart Agri EcoSystem](https://img.shields.io/badge/Bangladesh-Extension%20Tool-green)
![Version](https://img.shields.io/badge/version-3.0.0-brightgreen)
![React](https://img.shields.io/badge/React-18-blue)
![Vite](https://img.shields.io/badge/Vite-5-purple)

## Features

- 🔬 **AI Diagnosis** — Identifies crop pests, diseases, deficiencies and abiotic disorders
- 🇧🇩 **Bangladesh Context** — DAE, BRRI, BARI recommendations; local pesticide brands
- 🌿 **24 BD Crops** — Rice (Boro/Aman/Aus), Jute, Potato, Tomato, Mango and more
- 📍 **District-aware** — Context from 25 Bangladesh districts
- 🗓️ **Season-aware** — Boro, Aman, Rabi, Kharif-1/2 seasonal context
- 📷 **Photo Upload** — Field photo analysis support
- 🔤 **Bilingual** — Full বাংলা and English interface
- ♻️ **Auto-retry** — Handles server busy errors automatically

## Tech Stack

- **Frontend:** React 18 + Vite 5
- **AI:** Anthropic Claude API (`claude-sonnet-4-20250514`)
- **Styling:** Inline React styles (no CSS framework needed)
- **Fonts:** Noto Sans Bengali (Google Fonts)

## Run Locally

**Prerequisites:** Node.js 18+

```bash
# Clone the repo
git clone https://github.com/moniruzjaman/cabi-diagnosis.git
cd cabi-diagnosis

# Install dependencies
npm install

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

> **Note:** This version uses the Anthropic Claude API via browser-direct access.  
> When running inside [claude.ai](https://claude.ai) as an artifact, no API key is needed.  
> For standalone deployment, you will need to set up a backend proxy with your `ANTHROPIC_API_KEY`.

## Deploy to Vercel

```bash
npm run build
# Then drag the dist/ folder to vercel.com, or connect your GitHub repo
```

## Project Structure

```
cabi-diagnosis/
├── src/
│   ├── App.jsx        # Main application component
│   └── main.jsx       # React entry point
├── public/
│   └── favicon.svg
├── index.html
├── package.json
└── vite.config.js
```

## About

Built for Bangladesh's Department of Agricultural Extension (DAE) ecosystem.  
Integrates CABI Plantwise knowledge base with local Bangladesh agricultural context.

**Supported by:** DAE · BRRI · BARI · CABI Plantwise
