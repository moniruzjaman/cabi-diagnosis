const CEREAL_CROPS = new Set(["rice", "wheat", "corn", "maize", "ধান", "গম", "ভুট্টা"]);
const SOLANACEAE_CROPS = new Set(["tomato", "potato", "pepper", "brinjal", "টমেটো", "আলু", "মরিচ", "বেগুন"]);

function cropToken(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z\u0980-\u09FF]/g, "");
}

export function pickVisionEngine(cropHint) {
  const token = cropToken(cropHint);
  if (!token) return "auto";
  if (CEREAL_CROPS.has(token) || [...CEREAL_CROPS].some((c) => token.includes(c))) return "vit";
  if (SOLANACEAE_CROPS.has(token) || [...SOLANACEAE_CROPS].some((c) => token.includes(c))) return "plantvillage";
  return "auto";
}
