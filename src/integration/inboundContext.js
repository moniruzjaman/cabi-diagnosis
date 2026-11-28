// CABI inbound diagnostic-context adapter — Phase 1, Workstream D.
//
// Minimal, allowlisted, privacy-preserving parser for cross-app deep links
// into CABI, per the DRAFT Diagnostic Context Contract v1
// (docs/integration/diagnostic-contract-v1.schema.json + integration spec §5):
//   - Parses ONLY the documented query parameters; everything else is ignored
//     and reported (never interpreted).
//   - Privacy-hostile parameters (photo/GPS/phone/token/notes...) are detected,
//     rejected and never read into the context.
//   - All IDs are validated against pinned local snapshots
//     (contractSnapshot.js + canonicalCrops.js). Unknown IDs are reported, not
//     silently mapped to another crop/disease.
//   - returnTo accepts ONLY the three known app IDs — never a URL, never a
//     path. Any "/" ":" "." or protocol-shaped value is rejected.
//   - No network, no storage, no navigation side effects: pure function.
//
// Route shapes remain unfrozen (integration spec §5); this module documents
// the concrete entry parameters and the UI wiring decision in
// docs/integration/cabi-inbound-adapter.md. It does NOT auto-navigate or
// prefill forms yet — that wiring lands when the contract is approved, so
// existing entries/back behaviour stay untouched (Phase 1 safety boundary).

import {
  APP_IDS,
  DESTINATION_APP,
  CONTRACT_SNAPSHOT,
  LIMITS,
  SYMPTOM_IDS,
  CAUSE_GROUP_IDS,
  CROP_IDS,
} from "./contractSnapshot.js";
import { resolveCanonicalCrop } from "../data/canonicalCrops.js";

// Documented, allowlisted query parameters (the ONLY ones read).
export const ALLOWED_PARAMS = [
  "v", // contract schemaVersion; defaults to "1.0.0"
  "source", // sourceApp
  "cropId",
  "plantPartId",
  "symptomIds", // comma-separated
  "causeGroupIds", // comma-separated
  "guideId",
  "guidePage",
  "chapterId",
  "trainingTopicId",
  "returnTo", // app enum ONLY — never a URL
];

// Parameters that indicate privacy-boundary violations. They are never read;
// their presence is reported so senders can be corrected.
export const BLOCKED_PARAM_HINTS = [
  "image",
  "photo",
  "gps",
  "lat",
  "lon",
  "lng",
  "coordinate",
  "phone",
  "token",
  "notes",
  "name",
  "email",
  "nid",
  "address",
];

const URL_LIKE = /[/:?#.]|%2f|https?/i;

// Lowercase view of the allowlist for case-insensitive query-param matching.
const ALLOWED_LOWER = new Set(ALLOWED_PARAMS.map((p) => p.toLowerCase()));

/**
 * Parse and validate an inbound cross-app context.
 *
 * @param {URLSearchParams|Record<string,string>|string} input query string,
 *   params object or URLSearchParams.
 * @param {{strict?: boolean}} [opts] strict=true turns unknown-ID warnings
 *   into errors.
 * @returns {{
 *   ok: boolean,
 *   context: {
 *     schemaVersion: "1.0.0",
 *     sourceApp: string|null,
 *     destinationApp: "cabi-diagnosis",
 *     cropId?: string,
 *     plantPartId?: string,
 *     symptomIds?: string[],
 *     causeGroupIds?: string[],
 *     guideReference?: { guideId: string, page: number, chapterId?: string },
 *     trainingTopicId?: string,
 *   },
 *   returnTo: string|null,
 *   warnings: string[],
 *   errors: string[],
 *   rejectedPrivacyParams: string[],
 *   ignoredParams: string[],
 *   meta: { contract: string, schemaVersion: string, status: string },
 * }}
 */
export function parseInboundContext(input, opts = {}) {
  const errors = [];
  const warnings = [];
  const rejectedPrivacyParams = [];
  const ignoredParams = [];

  // ── collect raw pairs (no interpretation of unknown keys) ────────────────
  let pairs = [];
  if (typeof input === "string") {
    const qs = input.startsWith("?") ? input.slice(1) : input;
    pairs = [...new URLSearchParams(qs).entries()];
  } else if (input && typeof input.entries === "function") {
    pairs = [...input.entries()];
  } else if (input && typeof input === "object") {
    pairs = Object.entries(input).map(([k, v]) => [String(k), v == null ? "" : String(v)]);
  } else {
    pairs = [];
    errors.push("invalid input: expected query string, URLSearchParams or plain object");
  }

  const seen = new Map();
  for (const [key, value] of pairs) {
    const k = key.toLowerCase();
    // Exact key or clear suffix match only ("farmerPhone", "accessToken",
    // "caseNotes"); plain substring matching would falsely flag allowlisted
    // keys like cropId (contains "id"... and "nid").
    if (BLOCKED_PARAM_HINTS.some((h) => k === h || k.endsWith(h))) {
      rejectedPrivacyParams.push(key);
      continue;
    }
    if (!ALLOWED_LOWER.has(k)) {
      ignoredParams.push(key);
      continue;
    }
    seen.set(k, value);
  }
  if (rejectedPrivacyParams.length > 0) {
    errors.push(`privacy-boundary parameters rejected and not read: ${rejectedPrivacyParams.join(", ")}`);
  }

  // ── version ─────────────────────────────────────────────────────────────
  const v = seen.get("v");
  if (v !== undefined && v !== CONTRACT_SNAPSHOT.schemaVersion) {
    errors.push(`unsupported contract version "${v}" (expected ${CONTRACT_SNAPSHOT.schemaVersion})`);
  }

  // ── source ────────────────────────────────────────────────────────────────
  const source = seen.get("source");
  if (!source) {
    errors.push("missing required parameter: source");
  } else if (!APP_IDS.includes(source)) {
    errors.push(`unknown sourceApp "${source}"`);
  } else if (source === DESTINATION_APP) {
    errors.push(`sourceApp must not equal destinationApp (${DESTINATION_APP})`);
  }

  // ── returnTo: app enum only, never a URL ──────────────────────────────
  const returnTo = seen.get("returnto");
  let returnToOut = null;
  if (returnTo !== undefined) {
    if (URL_LIKE.test(returnTo)) {
      errors.push(`invalid returnTo "${returnTo}": arbitrary URLs are not accepted by this app`);
    } else if (!APP_IDS.includes(returnTo)) {
      errors.push(`unknown returnTo app "${returnTo}"`);
    } else {
      returnToOut = returnTo;
    }
  }

  // ── cropId: pattern + registry identity ─────────────────────────────────
  const context = { schemaVersion: CONTRACT_SNAPSHOT.schemaVersion, sourceApp: null, destinationApp: DESTINATION_APP };
  if (source && APP_IDS.includes(source) && source !== DESTINATION_APP) context.sourceApp = source;

  const cropRaw = seen.get("cropid");
  if (cropRaw !== undefined) {
    const resolved = resolveCanonicalCrop(cropRaw);
    if (resolved.ok) {
      // Inbound allowlist = registry-backed IDs + documented exceptions
      // (tomato). Other phase-1 derived selector IDs are NOT accepted until
      // the registry publishes them (see docs/integration/cabi-inbound-adapter.md §5).
      if (CROP_IDS.includes(resolved.cropId)) {
        context.cropId = resolved.cropId;
        if (resolved.season) context.cropSeason = resolved.season;
        if (cropRaw !== resolved.cropId) {
          warnings.push(`cropId "${cropRaw}" normalized to canonical "${resolved.cropId}"`);
        }
      } else {
        errors.push(
          `cropId "${cropRaw}" (${resolved.cropId}) is not in the CABI inbound allowlist — pending crop-registry publication`,
        );
      }
    } else if (resolved.reason === "ambiguous") {
      errors.push(`ambiguous cropId "${cropRaw}"; distinct identities: ${resolved.candidates.join(", ")}`);
    } else {
      errors.push(`unknown cropId "${cropRaw}" — not mapped to any other crop`);
    }
  }

  // ── plantPartId ─────────────────────────────────────────────────────────
  const plantPartRaw = seen.get("plantpartid");
  if (plantPartRaw !== undefined) {
    if (/^[a-z][a-z0-9_]{1,63}$/.test(plantPartRaw)) {
      context.plantPartId = plantPartRaw;
    } else {
      errors.push(`invalid plantPartId "${plantPartRaw}"`);
    }
  }

  // ── ID-list helper ────────────────────────────────────────────────────────
  const readIdList = (paramName, knownIds, max, ctxKey) => {
    const raw = seen.get(paramName.toLowerCase());
    if (raw === undefined) return;
    const ids = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length > max) {
      errors.push(`too many ${paramName} entries (max ${max})`);
      return;
    }
    const valid = [];
    for (const id of ids) {
      if (!/^[a-z][a-z0-9_]{1,63}$/.test(id)) {
        errors.push(`invalid ${paramName} entry "${id}"`);
        continue;
      }
      if (!knownIds.includes(id)) {
        const msg = `unknown ${paramName} entry "${id}" — ignored, never mapped`;
        if (opts.strict) errors.push(msg);
        else warnings.push(msg);
        continue;
      }
      if (!valid.includes(id)) valid.push(id);
    }
    if (valid.length > 0) context[ctxKey] = valid;
  };
  readIdList("symptomIds", SYMPTOM_IDS, LIMITS.maxSymptomIds, "symptomIds");
  readIdList("causeGroupIds", CAUSE_GROUP_IDS, LIMITS.maxCauseGroupIds, "causeGroupIds");

  // ── guideReference (opaque; pages are owned by the Field Guide) ───────
  const guideId = seen.get("guideid");
  const guidePage = seen.get("guidepage");
  const chapterId = seen.get("chapterid");
  if (guideId !== undefined || guidePage !== undefined || chapterId !== undefined) {
    if (!guideId || !guidePage) {
      errors.push("guideReference requires both guideId and guidePage");
    } else {
      const page = Number(guidePage);
      if (!Number.isInteger(page) || page < LIMITS.guidePageMin || page > LIMITS.guidePageMax) {
        errors.push(
          `invalid guidePage "${guidePage}" (expected integer ${LIMITS.guidePageMin}..${LIMITS.guidePageMax})`,
        );
      } else if (!/^[a-z][a-z0-9_-]{1,63}$/.test(guideId)) {
        errors.push(`invalid guideId "${guideId}"`);
      } else {
        context.guideReference = { guideId, page };
        if (chapterId !== undefined) {
          if (/^[a-z][a-z0-9_-]{1,63}$/.test(chapterId)) context.guideReference.chapterId = chapterId;
          else errors.push(`invalid chapterId "${chapterId}"`);
        }
      }
    }
  }

  // ── trainingTopicId ───────────────────────────────────────────────────
  const trainingTopicId = seen.get("trainingtopicid");
  if (trainingTopicId !== undefined) {
    if (/^[a-z][a-z0-9_-]{1,63}$/.test(trainingTopicId)) context.trainingTopicId = trainingTopicId;
    else errors.push(`invalid trainingTopicId "${trainingTopicId}"`);
  }

  const ok = errors.length === 0;
  return {
    ok,
    context,
    returnTo: returnToOut,
    warnings,
    errors,
    rejectedPrivacyParams,
    ignoredParams,
    meta: {
      contract: CONTRACT_SNAPSHOT.contract,
      schemaVersion: CONTRACT_SNAPSHOT.schemaVersion,
      status: CONTRACT_SNAPSHOT.status,
    },
  };
}

// -- result-shape sanity helper kept for tests/debug -----------------------
export function isInboundResultValid(result) {
  return (
    result && typeof result.ok === "boolean" && result.context && result.context.destinationApp === DESTINATION_APP
  );
}
