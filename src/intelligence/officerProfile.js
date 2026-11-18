// ============================================================
// Plant Detective — Crop Health Intelligence (Phase 4)
// Officer Profile — local-only identity for extension officers
// who verify farmer-submitted crop health cases.
//
// NO AUTHENTICATION. The profile is self-declared and stored only on
// this device (localStorage). It exists so the VerificationPanel can
// label decisions with a name + upazila and so the validation API can
// run an *advisory* role check before approving/rejecting a case.
//
// License note: the audit that sourced this app traced it to
// "Plantation Tracker" (UNLICENSED). This module is reimplemented from
// the Phase 4 design description below — no code was copied from any
// repository. Only the public-domain localStorage + role-check pattern.
// ============================================================

const UDH_OFFICER_KEY = "ud-officer-profile-v1";

const VALID_ROLES = ["officer", "admin", "farmer"];

/**
 * Honest caveats — surfaced in the UI so the "officer approved this"
 * badge is never mistaken for a server-authenticated signature.
 * @type {string[]}
 */
export const modelLimitations = [
  "no authentication — profile is local-only and self-declared",
  "role checks are advisory, not enforced server-side",
];

// ─── IDs & time ──────────────────────────────────────────────────────────────

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

// ─── Store primitives ────────────────────────────────────────────────────────

function safeParse(json, fallback) {
  try {
    const v = JSON.parse(json);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Read the local officer profile.
 * Returns null when no profile is set — in that case the user is treated
 * as a farmer (no verification privileges).
 * @returns {import('./types.js').OfficerProfile|null}
 */
export function getOfficerProfile() {
  try {
    return safeParse(localStorage.getItem(UDH_OFFICER_KEY), null);
  } catch {
    return null;
  }
}

/**
 * Persist a local officer profile. Generates id + createdAt when missing,
 * and coerces `role` to a known value (defaults to "farmer").
 * @param {Partial<import('./types.js').OfficerProfile>} profile
 * @returns {import('./types.js').OfficerProfile} the stored profile
 */
export function setOfficerProfile(profile = {}) {
  const existing = getOfficerProfile();
  const role = VALID_ROLES.includes(profile.role) ? profile.role : "farmer";
  const stored = {
    id: existing?.id || profile.id || makeId("officer"),
    nameBn: profile.nameBn || existing?.nameBn || "",
    role,
    upazila: profile.upazila || existing?.upazila || "",
    district: profile.district || existing?.district || "",
    createdAt: existing?.createdAt || profile.createdAt || nowIso(),
  };
  try {
    localStorage.setItem(UDH_OFFICER_KEY, JSON.stringify(stored));
  } catch {
    // localStorage unavailable (private mode / full) — profile stays in
    // memory only for this call. Callers still get the object back.
  }
  return stored;
}

/**
 * Remove the local officer profile (sign-out). After this the user is
 * treated as a farmer again.
 * @returns {boolean}
 */
export function clearOfficerProfile() {
  try {
    localStorage.removeItem(UDH_OFFICER_KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * Advisory role check — true only for officer/admin profiles.
 * Farmers and absent profiles return false. This is NOT a security
 * boundary (see modelLimitations); it only stops the UI from offering
 * approve/reject actions to non-officers.
 * @param {import('./types.js').OfficerProfile|null} [profile]
 * @returns {boolean}
 */
export function isOfficer(profile) {
  const p = profile ?? getOfficerProfile();
  return p?.role === "officer" || p?.role === "admin";
}

/**
 * Alias of {@link isOfficer} — can this profile verify cases?
 * @param {import('./types.js').OfficerProfile|null} [profile]
 * @returns {boolean}
 */
export function canVerify(profile) {
  return isOfficer(profile);
}

export { UDH_OFFICER_KEY, VALID_ROLES };
