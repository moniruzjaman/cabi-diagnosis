import { useState, useCallback, useRef } from "react";

/**
 * useTTS – Bangla text-to-speech hook using the Web Speech API.
 *
 * Usage:
 *   const { speak, stop, speaking, isSupported } = useTTS();
 *   speak("ধানের ব্লাস্ট রোগ দেখা দিয়েছে");
 */
export default function useTTS() {
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef(null);

  const speak = useCallback((text, lang = "bn-BD") => {
    if (!window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.85;
    utterance.pitch = 1;

    // Try to find a Bengali voice; fall back to Hindi as it shares phonemes
    const voices = window.speechSynthesis.getVoices();
    const bnVoice =
      voices.find((v) => v.lang.startsWith("bn")) ||
      voices.find((v) => v.lang.startsWith("hi"));
    if (bnVoice) utterance.voice = bnVoice;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }, []);

  const isSupported =
    typeof window !== "undefined" && !!window.speechSynthesis;

  return { speak, stop, speaking, isSupported };
}
