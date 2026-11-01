const NATIONAL_RE = /^01[3-9]\d{8}$/;

export function normalizeBdNational(raw) {
  if (raw == null) return "";
  let digits = String(raw)
    .trim()
    .replace(/[\s\-()]/g, "");
  if (digits.startsWith("+880")) digits = `0${digits.slice(4)}`;
  else if (digits.startsWith("880")) digits = `0${digits.slice(3)}`;
  return digits;
}

export function isBdPhone(raw) {
  return NATIONAL_RE.test(normalizeBdNational(raw));
}

export function toE164(raw) {
  const national = normalizeBdNational(raw);
  if (!NATIONAL_RE.test(national)) return null;
  return `+880${national.slice(1)}`;
}
