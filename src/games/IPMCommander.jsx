import { useState, useEffect, useCallback, useMemo } from "react";
import { IPM_COMMANDER_IMAGES } from "./imageMap";
import useTTS from "./useTTS";
import SymptomImageGallery from "./SymptomImageGallery";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  primary: "#006028", primaryLight: "#1a7a3a", primaryDark: "#005322",
  accent: "#f59e0b", bg: "#f5fbf6", bgCard: "#ffffff", bgMuted: "#eff5f0",
  text: "#171d1a", textMuted: "#3f493f", textLight: "#6f7a6e",
  border: "#becabc", success: "#16a34a", warning: "#d97706", danger: "#dc2626", blue: "#2563eb",
  shadow: "0 8px 24px rgba(0,33,9,0.08)", shadowMd: "0 16px 40px rgba(0,33,9,0.10)",
};

// ─── Keyframes (injected once) ────────────────────────────────────────────────
const KS = `
@keyframes ipmFadeIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes ipmPopIn{0%{transform:scale(.82);opacity:0}70%{transform:scale(1.06)}100%{transform:scale(1);opacity:1}}
@keyframes ipmFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes ipmPulse{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes ipmShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
@keyframes ipmGlow{0%,100%{box-shadow:0 0 6px rgba(22,163,74,.25)}50%{box-shadow:0 0 22px rgba(22,163,74,.55)}}
@keyframes ipmSlideRight{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}
@keyframes ipmScaleUp{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes ipmConfetti{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(120px) rotate(360deg);opacity:0}}
@keyframes ipmBounceIn{0%{transform:scale(0) rotate(-12deg);opacity:0}50%{transform:scale(1.15) rotate(3deg)}70%{transform:scale(.95) rotate(-1deg)}100%{transform:scale(1) rotate(0);opacity:1}}
`;
if (typeof document !== "undefined" && !document.getElementById("ipm-ks")) {
  const s = document.createElement("style");
  s.id = "ipm-ks";
  s.textContent = KS;
  document.head.appendChild(s);
}

// ─── Game data ────────────────────────────────────────────────────────────────
const ROUNDS = [
  {
    crop: "ধান (Rice)", icon: "🌾", problem: "ধানের ব্লাস্ট রোগ দেখা দিয়েছে",
    interventions: [
      { text: "ব্লাস্ট প্রতিরোধী জাত ব্যবহার করুন", level: 1, icon: "🌱" },
      { text: "আক্রান্ত পাতা তুলে পুড়িয়ে ফেলুন, সুষম সার", level: 2, icon: "🧹" },
      { text: "ট্রাইকোডেরমা বীজ প্রক্রিয়াজাতকরণ", level: 3, icon: "🦠" },
      { text: "ট্রাইসাইক্লাজল স্প্রে (FRAC Group M3)", level: 4, icon: "⚗️" },
    ],
  },
  {
    crop: "ধান (Rice)", icon: "🌾", problem: "মাজরা পোকার উপদ্রব শুরু হয়েছে",
    interventions: [
      { text: "সময়মতো বপন + প্রতিরোধী জাত", level: 1, icon: "🌱" },
      { text: "আলোক ফাঁদ ও আক্রান্ত গাছ অপসারণ", level: 2, icon: "💡" },
      { text: "ট্রাইকোগ্রামা কার্ড স্থাপন", level: 3, icon: "🪳" },
      { text: "ফিপ্রোনিল স্প্রে (IRAC Group 4)", level: 4, icon: "⚗️" },
    ],
  },
  {
    crop: "টমেটো (Tomato)", icon: "🍅", problem: "আর্লি ব্লাইট এর লক্ষণ দেখা দিচ্ছে",
    interventions: [
      { text: "রোগমুক্ত বীজ + ফসল আবর্তন", level: 1, icon: "🌱" },
      { text: "নিচের পাতা সরান, পানি সেচে এড়িয়ে চলুন", level: 2, icon: "🧹" },
      { text: "ট্রাইকোডেরমা + ব্যাকটেরিয়া স্প্রে", level: 3, icon: "🦠" },
      { text: "ম্যানকোজেব স্প্রে (FRAC Group M3)", level: 4, icon: "⚗️" },
    ],
  },
  {
    crop: "আলু (Potato)", icon: "🥔", problem: "লেট ব্লাইট দেখা দিয়েছে — জরুরি পরিস্থিতি",
    interventions: [
      { text: "প্রতিরোধী জাত নির্বাচন (আগে থেকে)", level: 1, icon: "🌱" },
      { text: "আক্রান্ত গাছ ধ্বংস + পাহাড়া স্থাপন", level: 2, icon: "🧹" },
      { text: "ব্যাকটেরিয়া বিরোধী প্রাণী", level: 3, icon: "🦠" },
      { text: "মেটালাক্সিল + ম্যানকোজেব জরুরি স্প্রে", level: 4, icon: "⚗️" },
    ],
  },
  {
    crop: "সরিষা (Mustard)", icon: "🌼", problem: "জাব পোকায় আক্রান্ত, সমস্যা বাড়ছে",
    interventions: [
      { text: "সঠিক সময়ে বপন + ফসল আবর্তন", level: 1, icon: "🌱" },
      { text: "নীল ট্র্যাপ + আক্রান্ত অংশ অপসারণ", level: 2, icon: "💡" },
      { text: "নিম তেল স্প্রে + প্রাকৃতিক শত্রু সংরক্ষণ", level: 3, icon: "🌿" },
      { text: "ইমিডাক্লোপ্রিড স্প্রে (IRAC Group 4A)", level: 4, icon: "⚗️" },
    ],
  },
  {
    crop: "বেগুন (Brinjal)", icon: "🍆", problem: "লাল মাকড়সা মাইটে আক্রান্ত",
    interventions: [
      { text: "সুষম সেচ + গাছের মাঝে ফাঁকা রাখুন", level: 1, icon: "🌱" },
      { text: "আক্রান্ত পাতা সরান + পানি স্প্রে", level: 2, icon: "🧹" },
      { text: "প্রাকৃতিক শত্রু (মাকড়সা, লেডিবাগ) সংরক্ষণ", level: 3, icon: "🕷️" },
      { text: "আবামেকটিন স্প্রে", level: 4, icon: "⚗️" },
    ],
  },
];

const PYRAMID_LEVELS = [
  { level: 1, label: "১. প্রতিরোধ / Prevention", color: C.success, bg: "#f0fdf4", border: "#bbf7d0" },
  { level: 2, label: "২. সাংস্কৃতিক / Cultural", color: C.blue, bg: "#eff6ff", border: "#bfdbfe" },
  { level: 3, label: "৩. জৈব / Biological", color: "#7c3aed", bg: "#faf5ff", border: "#e9d5ff" },
  { level: 4, label: "৪. রাসায়নিক / Chemical (শেষ উপায়)", color: C.danger, bg: "#fef2f2", border: "#fecaca" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function loadHighScore() {
  try {
    return Number(localStorage.getItem("game-ipm-commander-high")) || 0;
  } catch { return 0; }
}

function saveHighScore(score) {
  try {
    const prev = loadHighScore();
    if (score > prev) localStorage.setItem("game-ipm-commander-high", score);
  } catch { /* noop */ }
}

// ─── Confetti particle ────────────────────────────────────────────────────────
function ConfettiPiece({ delay, color, left }) {
  return (
    <div
      style={{
        position: "absolute", top: -12, left: `${left}%`, width: 8, height: 8,
        borderRadius: 2, background: color, opacity: 0,
        animation: `ipmConfetti 1.4s ${delay}s ease-out forwards`,
      }}
    />
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** IPM Pyramid visual (legend, non-interactive) */
function IPMPyramid({ highlightLevel, placedOrder }) {
  // Build widths: bottom (level 1) is widest, top (level 4) is narrowest
  const widths = ["92%", "82%", "70%", "56%"];
  const levelsReversed = [...PYRAMID_LEVELS].reverse(); // level 4 on top

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, margin: "12px 0 8px" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.primary, marginBottom: 4, letterSpacing: 0.5 }}>
        🏛️ IPM পিরামিড — নিচ থেকে উপরে
      </div>
      {levelsReversed.map((lv, i) => {
        const isHighlighted = highlightLevel === lv.level;
        const placed = placedOrder ? placedOrder.find(p => p.level === lv.level) : null;
        const isCorrect = placed && placed.level === i + 1 + (4 - (i + 1) - (lv.level - 1));
        return (
          <div
            key={lv.level}
            style={{
              width: widths[i],
              padding: "10px 14px",
              background: isHighlighted ? lv.bg : `${lv.bg}88`,
              border: `2px solid ${isHighlighted ? lv.color : lv.border}`,
              borderRadius: i === 0 ? "14px 14px 0 0" : i === 3 ? "0 0 14px 14px" : 0,
              display: "flex", alignItems: "center", gap: 8,
              transition: "all .35s ease",
              animation: isHighlighted ? "ipmPopIn .4s ease" : "none",
              boxShadow: isHighlighted ? `0 0 16px ${lv.color}44` : "none",
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>
              {lv.level === 1 ? "🛡️" : lv.level === 2 ? "🔧" : lv.level === 3 ? "🦠" : "⚗️"}
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: lv.color, flex: 1 }}>
              {lv.label}
            </span>
            {placed && (
              <span
                style={{
                  fontSize: 18, animation: "ipmBounceIn .5s ease",
                }}
              >
                {placed.icon}
              </span>
            )}
          </div>
        );
      })}
      <div style={{ fontSize: 10, color: C.textLight, marginTop: 2, textAlign: "center" }}>
        ↑ উপরের দিকে = শেষ উপায়
      </div>
    </div>
  );
}

/** Single intervention card (face-down or revealed) */
function InterventionCard({ card, index, onClick, disabled, picked, animDelay, showResult, correctLevel }) {
  const levelMeta = PYRAMID_LEVELS[card.level - 1];
  const isCorrect = showResult && card.level === correctLevel;
  const isWrong = showResult && card.level !== correctLevel;

  return (
    <button
      onClick={onClick}
      disabled={disabled || picked}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
        width: "100%", padding: "14px 10px",
        background: picked
          ? `${levelMeta.bg}aa`
          : showResult
            ? isCorrect ? "#f0fdf4" : isWrong ? "#fef2f2" : C.bgCard
            : C.bgCard,
        border: picked
          ? `2.5px solid ${levelMeta.color}`
          : showResult
            ? isCorrect ? `2.5px solid ${C.success}` : isWrong ? `2.5px solid ${C.danger}` : `1.5px solid ${C.border}`
            : `1.5px solid ${C.border}`,
        borderRadius: 16,
        cursor: disabled || picked ? "default" : "pointer",
        opacity: disabled && !picked ? 0.5 : 1,
        boxShadow: picked
          ? `0 0 18px ${levelMeta.color}33`
          : showResult && isCorrect
            ? `0 0 16px ${C.success}44`
            : showResult && isWrong
              ? `0 0 16px ${C.danger}33`
              : C.shadow,
        transition: "all .25s ease",
        animation: picked
          ? "ipmPopIn .4s ease"
          : `ipmFadeIn .35s ${animDelay}s ease both`,
        transform: disabled && !picked ? "scale(0.96)" : "scale(1)",
        position: "relative",
        overflow: "hidden",
        textAlign: "center",
      }}
    >
      {/* Pick order badge */}
      {picked && (
        <div
          style={{
            position: "absolute", top: -1, right: -1,
            width: 24, height: 24,
            background: levelMeta.color,
            borderRadius: "0 14px 0 12px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 800, color: "#fff",
            animation: "ipmPopIn .3s ease",
          }}
        >
          {/* show ordinal: ১, ২, ৩, ৪ */}
          {"১২৩৪"[picked - 1]}
        </div>
      )}

      {/* Result indicator */}
      {showResult && !picked && (
        <div
          style={{
            position: "absolute", top: 6, right: 6,
            fontSize: 14, animation: "ipmBounceIn .4s ease",
          }}
        >
          {isCorrect ? "✅" : isWrong ? "❌" : ""}
        </div>
      )}

      {/* Icon */}
      <div
        style={{
          fontSize: 30,
          animation: !picked && !disabled ? "ipmFloat 2.5s ease-in-out infinite" : "none",
          animationDelay: `${animDelay * 0.3}s`,
          filter: showResult && isWrong && !picked ? "grayscale(0.7)" : "none",
        }}
      >
        {picked ? card.icon : "❓"}
      </div>

      {/* Text */}
      <div
        style={{
          fontSize: 11.5, lineHeight: 1.55, fontWeight: 600,
          color: picked ? levelMeta.color : C.text,
        }}
      >
        {picked ? card.text : "গোপন কার্ড"}
      </div>

      {/* Level tag after result */}
      {showResult && (
        <div
          style={{
            fontSize: 9.5, fontWeight: 700, padding: "2px 8px",
            borderRadius: 20, background: `${levelMeta.color}18`,
            color: levelMeta.color, marginTop: 2,
          }}
        >
          {levelMeta.label.split(" / ")[0]}
        </div>
      )}

      {/* Hover hint */}
      {!picked && !disabled && !showResult && (
        <div style={{ fontSize: 10, color: C.textLight, marginTop: 2 }}>
          ট্যাপ করুন
        </div>
      )}
    </button>
  );
}

/** Round result banner */
function RoundResultBanner({ roundScore, perfectOrder, chemicalFirst, maxPossible }) {
  const pct = Math.round((roundScore / maxPossible) * 100);
  let msg = "", msgColor = C.textMuted;
  if (perfectOrder) { msg = "🎉 চমৎকার! পুরোপুরি সঠিক ক্রম!"; msgColor = C.success; }
  else if (chemicalFirst) { msg = "⚠️ রাসায়নিক প্রথমে নেওয়া হয়েছে!"; msgColor = C.danger; }
  else if (pct >= 50) { msg = "👍 মোটামুটি ভালো! আরও ভালো করতে পারবেন।"; msgColor = C.warning; }
  else { msg = "🔄 IPM পিরামিড মনে রাখুন: প্রতিরোধ প্রথমে!"; msgColor = C.danger; }

  return (
    <div
      style={{
        padding: "14px 18px", borderRadius: 14,
        background: perfectOrder ? "#f0fdf4" : chemicalFirst ? "#fef2f2" : "#fffbeb",
        border: `1.5px solid ${perfectOrder ? "#bbf7d0" : chemicalFirst ? "#fecaca" : "#fde68a"}`,
        animation: "ipmPopIn .45s ease",
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: msgColor }}>{msg}</span>
        <span style={{
          fontSize: 20, fontWeight: 800, color: perfectOrder ? C.success : C.text,
          animation: "ipmPopIn .5s ease",
        }}>
          +{roundScore}
        </span>
      </div>
      {/* Score breakdown */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11, color: C.textMuted }}>
        <span>✅ সঠিক স্থাপন: {roundScore >= 0 ? Math.min(roundScore, 40) : 0} পয়েন্ট</span>
        {perfectOrder && <span style={{ color: C.success, fontWeight: 700 }}>🏆 পারফেক্ট বোনাস: +২০</span>}
        {chemicalFirst && <span style={{ color: C.danger, fontWeight: 700 }}>❌ রাসায়নিক প্রথম: -১৫</span>}
      </div>
    </div>
  );
}

/** Progress dots for rounds */
function RoundProgress({ current, total, scores }) {
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center", margin: "8px 0" }}>
      {Array.from({ length: total }, (_, i) => {
        const done = i < current;
        const active = i === current;
        const sc = scores[i] ?? 0;
        const pct = sc / 60;
        let dotColor = C.border;
        if (done) {
          dotColor = sc >= 60 ? C.success : sc >= 30 ? C.warning : C.danger;
        }
        return (
          <div
            key={i}
            style={{
              width: active ? 28 : 22, height: active ? 28 : 22,
              borderRadius: "50%",
              background: active ? C.primary : done ? dotColor : C.bgMuted,
              border: `2px solid ${active ? C.primaryLight : done ? dotColor : C.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 700,
              color: active ? "#fff" : done ? "#fff" : C.textLight,
              transition: "all .3s ease",
              animation: active ? "ipmPulse 1.5s ease infinite" : "none",
              boxShadow: active ? `0 0 12px ${C.primary}44` : "none",
            }}
            title={done ? `রাউন্ড ${i + 1}: ${sc} পয়েন্ট` : `রাউন্ড ${i + 1}`}
          >
            {done ? (sc >= 60 ? "★" : sc >= 30 ? "✓" : "✗") : active ? i + 1 : i + 1}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function IPMCommander() {
  const [phase, setPhase] = useState("start"); // "start" | "playing" | "roundResult" | "result"
  const [roundIndex, setRoundIndex] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [roundScores, setRoundScores] = useState([]);
  const [shuffledCards, setShuffledCards] = useState([]);
  const [pickOrder, setPickOrder] = useState([]); // indices into shuffledCards in pick order
  const [showRoundResult, setShowRoundResult] = useState(false);
  const [roundScore, setRoundScore] = useState(0);
  const [perfectOrder, setPerfectOrder] = useState(false);
  const [chemicalFirst, setChemicalFirst] = useState(false);
  const [highScore, setHighScore] = useState(loadHighScore);
  const [animateOut, setAnimateOut] = useState(false);

  const { speak, stop, speaking, isSupported } = useTTS();

  const round = ROUNDS[roundIndex];
  const maxPossible = 60; // 4 × 10 + 20 bonus

  // Auto-speak problem for each round
  useEffect(() => {
    if (phase === "playing" && round && isSupported) {
      speak(`${round.crop}। ${round.problem}। আইপিএম পিরামিড অনুসারে সঠিক ক্রমে বেছে নিন।`);
    }
    return () => stop();
  }, [roundIndex, phase]);

  // Speak round result
  useEffect(() => {
    if (showRoundResult && isSupported) {
      if (perfectOrder) speak("চমৎকার! পুরোপুরি সঠিক ক্রম!");
      else if (chemicalFirst) speak("সাবধান! রাসায়নিক প্রথমে নেওয়া হয়েছে! প্রতিরোধ প্রথমে।");
      else speak(`পয়েন্ট: ${roundScore}। আবার চেষ্টা করুন।`);
    }
  }, [showRoundResult]);

  // Shuffle cards when round changes
  useEffect(() => {
    if (phase !== "playing") return;
    const shuffled = shuffle(round.interventions);
    // Attach shuffled index
    const withIdx = shuffled.map((c, i) => ({ ...c, shuffledIdx: i }));
    setShuffledCards(withIdx);
    setPickOrder([]);
    setShowRoundResult(false);
    setRoundScore(0);
    setPerfectOrder(false);
    setChemicalFirst(false);
  }, [roundIndex, phase]);

  // Save high score
  useEffect(() => {
    if (phase === "result") {
      saveHighScore(totalScore);
      setHighScore(loadHighScore());
    }
  }, [phase]);

  const handlePick = useCallback((cardIndex) => {
    if (showRoundResult) return;
    const newOrder = [...pickOrder, cardIndex];
    setPickOrder(newOrder);

    // Check if all 4 picked
    if (newOrder.length === 4) {
      // Calculate score
      let score = 0;
      const pickedCards = newOrder.map(idx => shuffledCards[idx]);
      const pickedLevels = pickedCards.map(c => c.level);
      const correctLevels = [1, 2, 3, 4];

      // +10 per correct level placement
      for (let i = 0; i < 4; i++) {
        if (pickedLevels[i] === correctLevels[i]) score += 10;
      }

      // Check perfect order
      const isPerfect = pickedLevels.every((l, i) => l === correctLevels[i]);

      // Check if chemical was picked first
      const hasChemicalFirst = pickedLevels[0] === 4;

      if (isPerfect) score += 20;
      if (hasChemicalFirst) score -= 15;

      // Minimum 0
      score = Math.max(0, score);

      setRoundScore(score);
      setPerfectOrder(isPerfect);
      setChemicalFirst(hasChemicalFirst);

      // Delay showing result for animation
      setTimeout(() => {
        setShowRoundResult(true);
      }, 600);
    }
  }, [pickOrder, shuffledCards, showRoundResult]);

  const handleNextRound = useCallback(() => {
    const newScores = [...roundScores, roundScore];
    setRoundScores(newScores);
    const newTotal = totalScore + roundScore;
    setTotalScore(newTotal);

    if (roundIndex < 5) {
      setRoundIndex(prev => prev + 1);
      setPhase("playing");
    } else {
      setPhase("result");
    }
  }, [roundScore, roundScores, totalScore, roundIndex]);

  const startGame = useCallback(() => {
    setPhase("playing");
    setRoundIndex(0);
    setTotalScore(0);
    setRoundScores([]);
    setPickOrder([]);
    setShowRoundResult(false);
    setRoundScore(0);
  }, []);

  // ─── RENDER: Start Screen ─────────────────────────────────────────────────
  if (phase === "start") {
    return (
      <div style={{
        minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Noto Sans Bengali', 'Inter', sans-serif",
      }}>
        <div style={{
          maxWidth: 420, width: "100%", textAlign: "center",
          animation: "ipmFadeIn .6s ease",
        }}>
          {/* Logo */}
          <div style={{ fontSize: 64, marginBottom: 8, animation: "ipmFloat 3s ease-in-out infinite" }}>🏛️</div>
          <h1 className="ud-headline" style={{
            fontSize: 28, fontWeight: 800, color: C.primaryDark, marginBottom: 4, lineHeight: 1.3,
          }}>
            IPM কমান্ডার
          </h1>
          <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 20, lineHeight: 1.6 }}>
            CABI Step 5 — সমন্বিত পোকা ব্যবস্থাপনা শিখুন
          </p>

          {/* IPM Pyramid preview */}
          <div style={{
            background: C.bgCard, borderRadius: 20, padding: "16px 12px",
            boxShadow: C.shadowMd, marginBottom: 20, border: `1.5px solid ${C.border}`,
          }}>
            {PYRAMID_LEVELS.map((lv, i) => (
              <div
                key={lv.level}
                style={{
                  width: `${90 - i * 10}%`, margin: "0 auto 2px",
                  padding: "8px 10px", background: lv.bg, borderRadius: 6,
                  borderLeft: `4px solid ${lv.color}`, textAlign: "left",
                  animation: `ipmFadeIn .4s ${i * 0.1}s ease both`,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 700, color: lv.color }}>
                  {lv.label.split(" / ")[0]}
                </span>
              </div>
            ))}
          </div>

          {/* How to play */}
          <div style={{
            background: C.bgCard, borderRadius: 16, padding: "16px 18px",
            boxShadow: C.shadow, marginBottom: 20, textAlign: "left", border: `1.5px solid ${C.border}`,
            animation: "ipmFadeIn .5s .2s ease both",
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.primary, marginBottom: 10 }}>📖 কিভাবে খেলবেন</div>
            {[
              "🏠 ফসলের সমস্যা দেখুন ও গুরুত্ব বুঝুন",
              "🎴 ৪টি গোপন কার্ড দেখুন — ট্যাপ করে খুলুন",
              "⬆️ IPM পিরামিড অনুসারে সঠিক ক্রমে বেছে নিন",
              "🛡️ প্রতিরোধ = প্রথম, রাসায়নিক = শেষ উপায়",
              "🏆 ৬ রাউন্ড — সর্বোচ্চ স্কোর করুন!",
            ].map((line, i) => (
              <div key={i} style={{ fontSize: 12.5, color: C.textMuted, marginBottom: 6, lineHeight: 1.6, paddingLeft: 4 }}>
                {line}
              </div>
            ))}
            <div style={{
              marginTop: 10, padding: "10px 14px", background: "#fffbeb", borderRadius: 10,
              border: "1px solid #fde68a", fontSize: 11.5, color: C.warning, fontWeight: 600, lineHeight: 1.6,
            }}>
              ⚡ স্কোরিং: সঠিক স্থাপন +১০ | পারফেক্ট ক্রম +২০ | রাসায়নিক প্রথমে -১৫
            </div>
          </div>

          {/* High score */}
          {highScore > 0 && (
            <div style={{ fontSize: 13, color: C.accent, fontWeight: 700, marginBottom: 16, animation: "ipmPulse 2s ease infinite" }}>
              🏆 সর্বোচ্চ স্কোর: {highScore}
            </div>
          )}

          {/* Start button */}
          <button
            onClick={startGame}
            style={{
              width: "100%", padding: "16px 0", border: "none", borderRadius: 16,
              background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
              color: "#fff", fontSize: 17, fontWeight: 800, cursor: "pointer",
              boxShadow: `0 6px 20px ${C.primary}55`,
              transition: "all .2s ease", animation: "ipmPopIn .5s .4s ease both",
              fontFamily: "'Noto Sans Bengali', sans-serif",
            }}
          >
            🚀 খেলা শুরু করুন
          </button>
        </div>
      </div>
    );
  }

  // ─── RENDER: Result Screen ────────────────────────────────────────────────
  if (phase === "result") {
    const isNewHigh = totalScore >= highScore && totalScore > 0;
    const grade =
      totalScore >= 200 ? { label: "S — IPM মাস্টার! 🌟", color: C.accent } :
      totalScore >= 150 ? { label: "A — দক্ষ কৃষক! 🌿", color: C.success } :
      totalScore >= 100 ? { label: "B — ভালো চেষ্টা! 👍", color: C.blue } :
      totalScore >= 50 ? { label: "C — আরও অনুশীলন দরকার 📚", color: C.warning } :
      { label: "D — আবার চেষ্টা করুন 🔄", color: C.danger };

    const confettiColors = ["#f59e0b", "#16a34a", "#2563eb", "#7c3aed", "#dc2626", "#ec4899"];
    const confetti = totalScore >= 100
      ? Array.from({ length: 18 }, (_, i) => (
          <ConfettiPiece
            key={i}
            delay={Math.random() * 1.2}
            color={confettiColors[i % confettiColors.length]}
            left={Math.random() * 90 + 5}
          />
        ))
      : null;

    return (
      <div style={{
        minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Noto Sans Bengali', 'Inter', sans-serif",
        position: "relative", overflow: "hidden",
      }}>
        {confetti}

        <div style={{ maxWidth: 420, width: "100%", textAlign: "center", animation: "ipmFadeIn .6s ease" }}>
          {/* Trophy */}
          <div style={{ fontSize: 72, marginBottom: 8, animation: "ipmFloat 3s ease-in-out infinite" }}>
            {totalScore >= 200 ? "🏆" : totalScore >= 100 ? "🌟" : totalScore >= 50 ? "📘" : "🌱"}
          </div>
          <h1 className="ud-headline" style={{ fontSize: 26, fontWeight: 800, color: C.primaryDark, marginBottom: 4 }}>
            খেলা শেষ!
          </h1>

          {/* Final score */}
          <div style={{
            fontSize: 52, fontWeight: 900, color: grade.color, marginBottom: 4,
            animation: "ipmPopIn .5s .2s ease both",
            textShadow: `0 2px 12px ${grade.color}44`,
          }}>
            {totalScore}
          </div>
          <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 4 }}>
            / {ROUNDS.length * maxPossible} সর্বোচ্চ
          </div>
          <div style={{
            fontSize: 15, fontWeight: 700, color: grade.color, marginBottom: 16,
            animation: "ipmFadeIn .4s .3s ease both",
          }}>
            {grade.label}
          </div>

          {/* New high score banner */}
          {isNewHigh && (
            <div style={{
              display: "inline-block", padding: "8px 20px", borderRadius: 30,
              background: `linear-gradient(135deg, ${C.accent}, #fbbf24)`,
              color: "#fff", fontSize: 14, fontWeight: 800, marginBottom: 16,
              animation: "ipmPulse 1.5s ease infinite",
              boxShadow: `0 4px 16px ${C.accent}55`,
            }}>
              🎉 নতুন সর্বোচ্চ স্কোর!
            </div>
          )}

          {/* Round breakdown */}
          <div style={{
            background: C.bgCard, borderRadius: 16, padding: "14px 16px",
            boxShadow: C.shadow, marginBottom: 20, textAlign: "left",
            border: `1.5px solid ${C.border}`, animation: "ipmFadeIn .5s .35s ease both",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.primary, marginBottom: 10 }}>📊 রাউন্ড ভিত্তিক ফলাফল</div>
            {ROUNDS.map((r, i) => {
              const sc = roundScores[i] ?? 0;
              const pct = sc / maxPossible;
              const barColor = pct >= 0.9 ? C.success : pct >= 0.5 ? C.warning : C.danger;
              return (
                <div key={i} style={{ marginBottom: 8, animation: `ipmFadeIn .35s ${i * 0.08}s ease both` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <span style={{ fontSize: 12, color: C.text }}>
                      {r.icon} {r.crop} — রাউন্ড {i + 1}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: barColor }}>{sc}</span>
                  </div>
                  <div style={{ width: "100%", height: 6, background: C.bgMuted, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{
                      width: `${pct * 100}%`, height: "100%", borderRadius: 3,
                      background: barColor, transition: "width .6s ease",
                    }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* IPM tip */}
          <div style={{
            padding: "12px 16px", background: "#f0fdf4", borderRadius: 12,
            border: "1px solid #bbf7d0", fontSize: 12, color: C.success,
            textAlign: "center", lineHeight: 1.65, marginBottom: 20,
            animation: "ipmFadeIn .4s .5s ease both",
          }}>
            💡 মনে রাখুন: <strong>প্রতিরোধ → সাংস্কৃতিক → জৈব → রাসায়নিক</strong><br />
            রাসায়নিক কীটনাশক সবসময় <strong>শেষ উপায়</strong>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, animation: "ipmFadeIn .4s .55s ease both" }}>
            <button
              onClick={startGame}
              style={{
                flex: 1, padding: "14px 0", border: "none", borderRadius: 14,
                background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
                color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer",
                boxShadow: `0 4px 16px ${C.primary}44`,
                fontFamily: "'Noto Sans Bengali', sans-serif",
              }}
            >
              🔄 আবার খেলুন
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── RENDER: Playing Screen ───────────────────────────────────────────────
  const pickedCards = pickOrder.map(idx => shuffledCards[idx]);
  const allPicked = pickOrder.length === 4;

  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      fontFamily: "'Noto Sans Bengali', 'Inter', sans-serif",
      paddingBottom: 40,
    }}>
      {/* Top bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: `linear-gradient(135deg, ${C.primaryDark}, ${C.primary})`,
        padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 4px 16px rgba(0,33,9,0.15)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>{round.icon}</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>
              রাউন্ড {roundIndex + 1} / {ROUNDS.length}
            </div>
            <div style={{ fontSize: 10, color: "#ffffffaa" }}>{round.crop}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.accent }}>
              {totalScore + (showRoundResult ? roundScore : 0)}
            </div>
            <div style={{ fontSize: 9, color: "#ffffffaa", fontWeight: 600 }}>স্কোর</div>
          </div>
          <div style={{
            padding: "4px 10px", borderRadius: 8, background: "rgba(255,255,255,0.15)",
            fontSize: 11, fontWeight: 700, color: "#fff",
          }}>
            🏆 {Math.max(highScore, totalScore)}
          </div>
        </div>
      </div>

      {/* Round progress */}
      <div style={{ padding: "10px 16px 0" }}>
        <RoundProgress current={roundIndex} total={ROUNDS.length} scores={roundScores} />
      </div>

      {/* Problem scenario */}
      <div style={{ padding: "8px 16px 0", animation: "ipmFadeIn .4s ease" }}>
        <div style={{
          background: "#fff7ed", borderRadius: 14, padding: "14px 16px",
          border: "1.5px solid #fde68a", display: "flex", alignItems: "flex-start", gap: 10,
        }}>
          <span style={{ fontSize: 24, flexShrink: 0, animation: "ipmFloat 3s ease-in-out infinite" }}>
            {round.icon}
          </span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.warning, marginBottom: 3 }}>
              ⚠️ সমস্যা
            </div>
            <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6, fontWeight: 600 }}>
              {round.problem}
            </div>
            <div style={{ fontSize: 11, color: C.textLight, marginTop: 4 }}>
              সঠিক IPM ক্রমে হস্তক্ষেপ বেছে নিন (প্রতিরোধ → সাংস্কৃতিক → জৈব → রাসায়নিক)
            </div>
          </div>
        </div>
      </div>

      {/* Symptom Images */}
      <div style={{ padding: "8px 16px 0" }}>
        <SymptomImageGallery
          images={IPM_COMMANDER_IMAGES[round.problem] || []}
          label={round.problem}
        />
      </div>

      {/* Audio helper */}
      {isSupported && (
        <div style={{ padding: "4px 16px 0" }}>
          <button
            onClick={() => speak(`${round.crop}। ${round.problem}। আইপিএম পিরামিড অনুসারে সঠিক ক্রমে বেছে নিন।`)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              width: "100%", padding: "10px 14px", borderRadius: 12,
              border: `1.5px solid ${speaking ? C.success : C.border}`,
              background: speaking ? "#f0fdf4" : C.bgMuted,
              color: speaking ? C.success : C.textMuted,
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 18 }}>🔊</span>
            {speaking ? "শুনছি..." : "সমস্যা শুনুন"}
          </button>
        </div>
      )}

      {/* IPM Pyramid (visual legend) */}
      <div style={{ padding: "10px 16px 0", animation: "ipmFadeIn .4s .1s ease both" }}>
        <IPMPyramid
          highlightLevel={null}
          placedOrder={pickedCards}
        />
      </div>

      {/* Pick order display */}
      <div style={{ padding: "4px 16px 0", animation: "ipmFadeIn .3s ease" }}>
        <div style={{
          display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap",
          marginBottom: 6,
        }}>
          {[0, 1, 2, 3].map((slot) => {
            const picked = pickedCards[slot];
            const levelMeta = picked ? PYRAMID_LEVELS[picked.level - 1] : null;
            return (
              <div
                key={slot}
                style={{
                  width: 52, height: 52, borderRadius: 12,
                  background: picked ? levelMeta.bg : C.bgCard,
                  border: picked
                    ? `2px solid ${levelMeta.color}`
                    : `1.5px dashed ${C.border}`,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 1,
                  animation: picked ? "ipmPopIn .4s ease" : "none",
                  boxShadow: picked ? `0 0 10px ${levelMeta.color}33` : "none",
                  transition: "all .3s ease",
                }}
              >
                <span style={{ fontSize: 9, color: C.textLight, fontWeight: 600 }}>
                  {"১২৩৪"[slot]}
                </span>
                <span style={{ fontSize: 18, animation: picked ? "ipmBounceIn .5s ease" : "none" }}>
                  {picked ? picked.icon : "·"}
                </span>
              </div>
            );
          })}
        </div>
        <div style={{ textAlign: "center", fontSize: 11, color: C.textLight, marginBottom: 4 }}>
          {allPicked
            ? showRoundResult
              ? "ফলাফল দেখুন"
              : "মূল্যায়ন হচ্ছে..."
            : `${pickOrder.length}/৪ বাছাই হয়েছে — ${4 - pickOrder.length} টি বাকি`}
        </div>
      </div>

      {/* Intervention cards grid */}
      <div style={{ padding: "6px 16px 0" }}>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
        }}>
          {shuffledCards.map((card, i) => {
            const isPicked = pickOrder.includes(i);
            const pickNum = isPicked ? pickOrder.indexOf(i) + 1 : 0;
            return (
              <InterventionCard
                key={`${roundIndex}-${i}`}
                card={card}
                index={i}
                onClick={() => handlePick(i)}
                disabled={allPicked}
                picked={pickNum || false}
                animDelay={i * 0.08}
                showResult={showRoundResult}
                correctLevel={i + 1} // slot index → expected level (1, 2, 3, 4)
              />
            );
          })}
        </div>
      </div>

      {/* Round result section */}
      {showRoundResult && (
        <div style={{ padding: "14px 16px 0", animation: "ipmFadeIn .4s ease" }}>
          <RoundResultBanner
            roundScore={roundScore}
            perfectOrder={perfectOrder}
            chemicalFirst={chemicalFirst}
            maxPossible={maxPossible}
          />

          {/* Detailed placement breakdown */}
          <div style={{
            background: C.bgCard, borderRadius: 14, padding: "12px 14px",
            border: `1.5px solid ${C.border}`, boxShadow: C.shadow, marginBottom: 14,
            animation: "ipmFadeIn .4s .15s ease both",
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.primary, marginBottom: 8 }}>
              📋 আপনার বাছাই বিশ্লেষণ
            </div>
            {pickOrder.map((shuffledIdx, slot) => {
              const card = shuffledCards[shuffledIdx];
              const levelMeta = PYRAMID_LEVELS[card.level - 1];
              const isRight = card.level === slot + 1;
              const expectedMeta = PYRAMID_LEVELS[slot];
              return (
                <div
                  key={slot}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 10px", borderRadius: 10, marginBottom: 4,
                    background: isRight ? "#f0fdf4" : "#fef2f2",
                    border: `1px solid ${isRight ? "#bbf7d0" : "#fecaca"}`,
                    animation: `ipmSlideRight .35s ${slot * 0.1}s ease both`,
                  }}
                >
                  <span style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: isRight ? C.success : C.danger,
                    color: "#fff", fontSize: 11, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    {isRight ? "✓" : "✗"}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11.5, color: C.text, fontWeight: 600, lineHeight: 1.5 }}>
                      <span style={{ fontSize: 14, marginRight: 4 }}>{card.icon}</span>
                      {card.text}
                    </div>
                    <div style={{ fontSize: 10, color: C.textLight, marginTop: 1 }}>
                      আপনার পছন্দ: <span style={{ color: levelMeta.color, fontWeight: 600 }}>
                        লেভেল {card.level} ({levelMeta.label.split(" / ")[0]})
                      </span>
                      {!isRight && (
                        <span> → সঠিক ছিল: <span style={{ color: expectedMeta.color, fontWeight: 600 }}>
                          লেভেল {slot + 1}
                        </span></span>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: isRight ? C.success : C.danger }}>
                    {isRight ? "+10" : "0"}
                  </span>
                </div>
              );
            })}
            {perfectOrder && (
              <div style={{
                textAlign: "center", padding: "8px", marginTop: 4,
                background: "#fffbeb", borderRadius: 8, fontSize: 12,
                fontWeight: 700, color: C.accent, animation: "ipmPopIn .5s .4s ease both",
              }}>
                🏆 পারফেক্ট ক্রম বোনাস: +২০
              </div>
            )}
            {chemicalFirst && (
              <div style={{
                textAlign: "center", padding: "8px", marginTop: 4,
                background: "#fef2f2", borderRadius: 8, fontSize: 12,
                fontWeight: 700, color: C.danger, animation: "ipmShake .5s ease",
              }}>
                ⚠️ রাসায়নিক প্রথম পছন্দ জরিমানা: -১৫
              </div>
            )}
          </div>

          {/* Next round / see results button */}
          <button
            onClick={handleNextRound}
            style={{
              width: "100%", padding: "15px 0", border: "none", borderRadius: 14,
              background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
              color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer",
              boxShadow: `0 6px 20px ${C.primary}55`,
              fontFamily: "'Noto Sans Bengali', sans-serif",
              animation: "ipmPopIn .4s .5s ease both",
              marginBottom: 20,
            }}
          >
            {roundIndex < 5 ? `পরবর্তী রাউন্ড → ${round.icon} ${ROUNDS[roundIndex + 1].crop}` : "📊 ফলাফল দেখুন"}
          </button>
        </div>
      )}

      {/* Footer hint */}
      {!showRoundResult && !allPicked && (
        <div style={{
          textAlign: "center", padding: "16px",
          fontSize: 11, color: C.textLight,
          animation: "ipmPulse 2.5s ease infinite",
        }}>
          💡 প্রতিরোধমূলক ব্যবস্থা সবসময় প্রথমে বেছে নিন
        </div>
      )}
    </div>
  );
}
