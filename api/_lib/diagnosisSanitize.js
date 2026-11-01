const DIAGNOSES_TEXT_FIELDS = {
  session_id: 200,
  crop: 100,
  disease_name: 300,
  disease_name_bn: 300,
  confidence: 20,
  severity: 20,
  biotic_abiotic: 20,
  provider: 100,
  symptoms: 2000,
  recommendations: 4000,
  weather_snapshot: 2000,
  district: 100,
  vit_prediction: 4000,
};

const DIAGNOSES_REQUIRED_FIELDS = ["session_id", "crop"];

function sanitizeDiagnosisString(value, maxLength) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str.length === 0 ? null : str.slice(0, maxLength);
}

export function sanitizeDiagnosisEntry(body = {}) {
  const missing = DIAGNOSES_REQUIRED_FIELDS.find(
    (field) => typeof body[field] !== "string" || body[field].trim() === "",
  );
  if (missing) return { error: `${missing} is required` };

  const entry = {};
  for (const [field, maxLength] of Object.entries(DIAGNOSES_TEXT_FIELDS)) {
    entry[field] = sanitizeDiagnosisString(body[field], maxLength);
  }
  entry.image_count = Math.min(Math.max(Number(body.image_count) || 0, 0), 10);

  return { entry };
}
