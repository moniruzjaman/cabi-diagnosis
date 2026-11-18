// ============================================================
// Plant Detective — Crop Health Intelligence (Phase 3)
// Export Utilities — CSV / JSON export of crop health cases for the
// Field Health Passport. CSV values are quoted and UTF-8 safe so
// Bangla text round-trips through spreadsheets.
//
// Original design. CSV quoting (RFC 4180) is a standard pattern.
// No code ported from any repository.
// ============================================================

const CSV_HEADERS = [
  "caseId",
  "crop",
  "variety",
  "growthStage",
  "status",
  "createdAt",
  "updatedAt",
  "fieldId",
  "fieldLocation",
  "syncStatus",
  "verification",
];

const EXPORT_LIMITATIONS = [
  "CSV রপ্তানি কেবল কেস মেটাডেটা — পর্যবেক্ষণ/চিকিৎসার পূর্ণ বিবরণ JSON রপ্তানিতে আছে।",
  "Bangla টেক্সট UTF-8 এ সংরক্ষিত — পুরনো স্প্রেডশিট সফটওয়্যারে এনকোডিং সমস্যা হতে পারে।",
];

/**
 * Quote a CSV value per RFC 4180: wrap in double quotes and escape any
 * embedded double quote by doubling it. Non-string values are stringified.
 * @param {*} value
 * @returns {string}
 */
function csvQuote(value) {
  if (value == null) return '""';
  const s = typeof value === "string" ? value : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * Serialise a fieldLocation ({lat, lng, accuracy}) into a compact CSV cell.
 * @param {object|null} field
 * @returns {string}
 */
function formatFieldLocation(field) {
  if (!field || field.lat == null || field.lng == null) return "";
  const acc = field.accuracy != null ? `,acc=${field.accuracy}` : "";
  return `lat=${field.lat},lng=${field.lng}${acc}`;
}

/**
 * Serialise a verification object into a compact CSV cell.
 * @param {object|null} v
 * @returns {string}
 */
function formatVerification(v) {
  if (!v) return "";
  const parts = [];
  if (v.status) parts.push(`status=${v.status}`);
  if (v.officer) parts.push(`officer=${v.officer}`);
  return parts.join(";");
}

/**
 * Build a CSV string from an array of crop health cases. Headers are fixed
 * (see CSV_HEADERS) so exports have a stable schema. Bangla text is preserved
 * (UTF-8) and every value is quoted.
 * @param {object[]} cases
 * @returns {string}
 */
export function exportCasesToCSV(cases) {
  const rows = [CSV_HEADERS.map(csvQuote).join(",")];
  for (const c of cases || []) {
    rows.push(
      [
        c.id,
        c.crop,
        c.variety,
        c.growthStage,
        c.status,
        c.createdAt,
        c.updatedAt,
        c.fieldId,
        formatFieldLocation(c.fieldLocation),
        c.syncStatus,
        formatVerification(c.verification),
      ]
        .map(csvQuote)
        .join(","),
    );
  }
  // Prepend a UTF-8 BOM so Excel/LibreOffice detect encoding correctly.
  return "\uFEFF" + rows.join("\r\n");
}

/**
 * Build a pretty-printed JSON string from an array of crop health cases.
 * @param {object[]} cases
 * @returns {string}
 */
export function exportCasesToJSON(cases) {
  return JSON.stringify(cases || [], null, 2);
}

/**
 * Build a pretty-printed JSON string for a single case.
 * @param {object} caseObj
 * @returns {string}
 */
export function exportSingleCase(caseObj) {
  return JSON.stringify(caseObj ?? null, null, 2);
}

export const EXPORT_MODEL_LIMITATIONS = EXPORT_LIMITATIONS;
export { CSV_HEADERS };
