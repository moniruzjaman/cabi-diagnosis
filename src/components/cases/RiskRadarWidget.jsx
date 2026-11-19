import { useState, useEffect, useRef } from "react";
import { fetchWeather } from "../../intelligence/weatherProvider.js";
import { computeRiskRadar, makeMinimalActiveCrop } from "../../intelligence/riskRadar.js";
import { updateRiskAssessment } from "../../data/cropHealthCases.js";
import ScoutingScheduler from "./ScoutingScheduler.jsx";
import CropProtectionPanel from "./CropProtectionPanel.jsx";

// ────────────────────────────────────────────────────────────────────────────
// RiskRadarWidget — renders the Disease Risk Radar for an active Crop Health
// Case on the MONITOR pillar (case detail view). Fetches weather (Open-Meteo,
// keyless, CORS-friendly), runs computeRiskRadar, and shows:
//   - risk level badge (color-coded)
//   - crop + growth stage
//   - top disease risk (name + score)
//   - weather evidence (temp, humidity, leaf-wetness, rain) with freshness
//   - confidence + model limitations (expandable, Bangla-first)
//   - scouting action (if risk ≥ 25) via ScoutingScheduler
//
// Safety gates: weather unavailable → "আবহাওয়ার তথ্য অনুপস্থিত", no risk.
// Scores are never presented as calibrated probabilities.
// ────────────────────────────────────────────────────────────────────────────

// Map Bangla crop names (as stored in cropHealthCases) to the disease DB cropIds.
const CROP_NAME_TO_ID = {
  ধান: "rice",
  ধানের: "rice",
  paddy: "rice",
  rice: "rice",
  গম: "wheat",
  wheat: "wheat",
  পাট: "jute",
  jute: "jute",
  আলু: "potato",
  potato: "potato",
  টমেটো: "tomato",
  টমেটর: "tomato",
  tomato: "tomato",
  মরিচ: "chili",
  মরিচের: "chili",
  chili: "chili",
  chilli: "chili",
  বেগুন: "brinjal",
  বেগুনের: "brinjal",
  brinjal: "brinjal",
  eggplant: "brinjal",
  সরিষা: "mustard",
  সরিষার: "mustard",
  mustard: "mustard",
  পেঁয়াজ: "onion",
  পেঁয়াজের: "onion",
  onion: "onion",
  ভুট্টা: "maize",
  মকা: "maize",
  ভুট্টার: "maize",
  maize: "maize",
  corn: "maize",
};

// Map common growth-stage strings (Bangla/English) to GrowthSta...[truncated]