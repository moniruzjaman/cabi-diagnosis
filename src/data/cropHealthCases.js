/**
 * Crop Health Case Management — local-first case store.
 *
 * Backs the MONITOR and EVALUATE pillars of the six-pillar Crop Health
 * Intelligence workflow:  DETECT → TREAT → PREVENT → MONITOR → EVALUATE → LEARN
 *
 * Design decisions (see docs/six-pillar-architecture.md):
 *   - Local-first: everything lives in localStorage under UDH_CASES_KEY.
 *     No account, no server round-trip, works fully offline.
 *   - Privacy: original crop photographs are NEVER persisted here. Cases
 *     store metadata and (optionally, user-consented) small thumbnails.
 *     The app's privacy policy promises photos are not uploaded — this
 *     store honours that promise by default.
 *   - Mirrors the logical entity model as JSON documents:
 *       crop_health_cases   → case objects (id, status, crop, variety…)
 *       case_observations   → case.observations[]
 *       diagnosis_evidence  → case.diagnosisEvidence
 *       treatment_records   → case.treatments[]
 *       prevention_actions  → case.preventionActions[]
 *       monitoring_records  → case.monitoring[] (follow-up reminders)
 *       evaluation_results  → case.evaluation
 *       learning_insights   → module-level learning insights registry
 *
 * If server sync is added later, extend api/community.js with a "cases"
 * resource and add a crop_health_cases table in ensureSchema() — do NOT
 * create a new serverless function (Vercel Hobby 12-function cap).
 */

const UDH_CASES_KEY = "udh-crop-cases-v1";
const UDH_INSIGHTS_KEY = "udh-learning-insights-v1";

/** Maximum stored thumbnails per case (small JPEG data URLs, ~20-40 KB each). */
const MAX_THUMBNAILS_PER_CASE = 6;

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

export function loadCases() {
  try {
    return safeParse(localStorage.getItem(UDH_CASES_KEY), []);
  } catch {
    return [];
  }
}

export function saveCases(cases) {
  try {
    localStorage.setItem(UDH_CASES_KEY, JSON.stringify(cases));
    return true;
  } catch {
    // Storage full — drop thumbnails first (they are the biggest payload),
    // then retry once so metadata is never lost.
    try {
      const slim = cases.map((c) => ({ ...c, thumbnail: null }));
      localStorage.setItem(UDH_CASES_KEY, JSON.stringify(slim));
      return true;
    } catch {
      return false;
    }
  }
}

// ─── Case lifecycle ──────────────────────────────────────────────────────────

export const CASE_STATUSES = ["active", "monitoring", "resolved", "closed"];

export const STATUS_LABELS_BN = {
  active: "চলমান",
  monitoring: "পর্যবেক্ষণে",
  resolved: "সেরে উঠেছে",
  closed: "বন্ধ",
};

/**
 * Create a crop health case. The first observation is created automatically
 * from the provided context so every case starts with a baseline record.
 *
 * @param {object} input
 * @param {string} input.crop - Bengali crop name (e.g. 'ধান')
 * @param {string} [input.variety]
 * @param {string} [input.district]
 * @param {string} [input.upazila]
 * @param {string} [input.season]
 * @param {string} [input.growthStage]
 * @param {number} [input.lat]
 * @param {number} [input.lon]
 * @param {object} [input.diagnosisEvidence] - { diseaseName, diseaseNameBn, cause,
 *   confidence, confidencePct, provider, source: 'ai'|'offline'|'manual',
 *   alternatives: [], keySymptoms: [] }
 * @param {string} [input.thumbnail] - small data-URL (user-consented)
 * @param {boolean} [input.photoConsent] - explicit consent to keep thumbnails
 * @returns {{case: object, cases: object[]}}
 */
export function createCase(input = {}) {
  const cases = loadCases();
  const ts = nowIso();
  const photoConsent = !!input.photoConsent;
  const c = {
    id: makeId("case"),
    createdAt: ts,
    updatedAt: ts,
    status: "active",
    crop: input.crop || "",
    variety: input.variety || "",
    district: input.district || "",
    upazila: input.upazila || "",
    season: input.season || "",
    growthStage: input.growthStage || "",
    location: input.lat != null && input.lon != null ? { lat: input.lat, lon: input.lon } : null,
    // diagnosis_evidence — source + confidence are always recorded so
    // "why was this suggested" stays answerable months later.
    diagnosisEvidence: input.diagnosisEvidence
      ? {
          diseaseName: input.diagnosisEvidence.diseaseName || "",
          diseaseNameBn: input.diagnosisEvidence.diseaseNameBn || "",
          cause: input.diagnosisEvidence.cause || "",
          confidence: input.diagnosisEvidence.confidence || "",
          confidencePct: input.diagnosisEvidence.confidencePct ?? null,
          provider: input.diagnosisEvidence.provider || null,
          source: input.diagnosisEvidence.source || "manual",
          alternatives: input.diagnosisEvidence.alternatives || [],
          keySymptoms: input.diagnosisEvidence.keySymptoms || [],
          recordedAt: ts,
        }
      : null,
    // User consent governs thumbnail persistence (default: not stored).
    thumbnail: photoConsent && input.thumbnail ? input.thumbnail : null,
    photoConsent,
    observations: [],
    treatments: [],
    preventionActions: [],
    monitoring: [],
    evaluation: null,
    // Optional intelligence fields (non-breaking — default null).
    // Populated by the Disease Risk Radar (src/intelligence/riskRadar.js)
    // and the Crop Protection Decision Engine (src/intelligence/protectionDecisionEngine.js).
    riskAssessment: null,
    scoutingAction: null,
    protectionDecision: null,
  };
  // Baseline observation
  c.observations.push({
    id: makeId("obs"),
    date: ts,
    severity: input.initialSeverity || "moderate",
    severityPct: input.initialSeverityPct ?? null,
    notes: input.initialNotes || "",
    symptoms: input.initialSymptoms || "",
    thumbnail: null,
  });
  cases.push(c);
  saveCases(cases);
  return { case: c, cases };
}

export function getCaseById(id) {
  return loadCases().find((c) => c.id === id) || null;
}

export function updateCase(id, patch) {
  const cases = loadCases();
  const idx = cases.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  // Immutable id/createdAt; everything else patchable.
  const { id: _id, createdAt: _createdAt, ...rest } = patch;
  cases[idx] = { ...cases[idx], ...rest, updatedAt: nowIso() };
  saveCases(cases);
  return cases[idx];
}

export function deleteCase(id) {
  const cases = loadCases();
  const next = cases.filter((c) => c.id !== id);
  saveCases(next);
  return next;
}

// ─── Observations (case_observations) ────────────────────────────────────────

/**
 * Append a follow-up observation (monitoring_records + case_observations).
 * @param {string} caseId
 * @param {{severity?: string, severityPct?: number|null, notes?: string,
 *          symptoms?: string, thumbnail?: string|null, date?: string}} obs
 */
export function addObservation(caseId, obs = {}) {
  const cases = loadCases();
  const idx = cases.findIndex((c) => c.id === caseId);
  if (idx === -1) return null;
  const c = cases[idx];
  let thumb = null;
  if (
    obs.thumbnail &&
    c.photoConsent &&
    (c.thumbnail ? countThumbnails(c) : countThumbnails(c)) < MAX_THUMBNAILS_PER_CASE
  ) {
    thumb = obs.thumbnail;
  }
  const entry = {
    id: makeId("obs"),
    date: obs.date || nowIso(),
    severity: obs.severity || "moderate",
    severityPct: obs.severityPct ?? null,
    notes: obs.notes || "",
    symptoms: obs.symptoms || "",
    thumbnail: thumb,
  };
  c.observations.push(entry);
  // Auto-close monitoring reminder if one is pending for this follow-up.
  c.monitoring = c.monitoring.map((m) =>
    m.status === "pending" ? { ...m, status: "done", completedAt: entry.date } : m,
  );
  c.updatedAt = nowIso();
  if (c.status === "resolved" || c.status === "closed") {
    // Re-opening via new observation keeps the lifecycle honest.
    c.status = "monitoring";
  }
  saveCases(cases);
  return c;
}

function countThumbnails(c) {
  return (c.observations || []).filter((o) => o.thumbnail).length + (c.thumbnail ? 1 : 0);
}

// ─── Treatments (treatment_records) ──────────────────────────────────────────

/**
 * Record an applied treatment. Registered-product info is copied verbatim
 * from the pesticide registry — never fabricated here.
 * @param {string} caseId
 * @param {{date?: string, type?: 'cultural'|'biological'|'chemical'|'mechanical',
 *          description: string, productName?: string, activeIngredient?: string,
 *          moaGroup?: string, dosage?: string, cost?: number|null, notes?: string}} t
 */
export function addTreatment(caseId, t = {}) {
  const cases = loadCases();
  const idx = cases.findIndex((c) => c.id === caseId);
  if (idx === -1) return null;
  const c = cases[idx];
  c.treatments.push({
    id: makeId("trt"),
    date: t.date || nowIso(),
    type: t.type || "cultural",
    description: t.description || "",
    productName: t.productName || "",
    activeIngredient: t.activeIngredient || "",
    moaGroup: t.moaGroup || "",
    dosage: t.dosage || "",
    cost: t.cost ?? null,
    notes: t.notes || "",
    targetDisease: t.targetDisease || null,
  });
  c.updatedAt = nowIso();
  saveCases(cases);
  return c;
}

// ─── Prevention actions (prevention_actions) ─────────────────────────────────

export function addPreventionAction(caseId, p = {}) {
  const cases = loadCases();
  const idx = cases.findIndex((c) => c.id === caseId);
  if (idx === -1) return null;
  const c = cases[idx];
  c.preventionActions.push({
    id: makeId("prev"),
    date: p.date || nowIso(),
    action: p.action || "",
    category: p.category || "hygiene",
    notes: p.notes || "",
  });
  c.updatedAt = nowIso();
  saveCases(cases);
  return c;
}

// ─── Monitoring reminders (monitoring_records) ───────────────────────────────

/**
 * Schedule a follow-up reminder N days from now.
 * @param {string} caseId
 * @param {{dueInDays?: number, note?: string, title?: string}} r
 */
export function addMonitoringReminder(caseId, r = {}) {
  const cases = loadCases();
  const idx = cases.findIndex((c) => c.id === caseId);
  if (idx === -1) return null;
  const c = cases[idx];
  const due = new Date(Date.now() + (r.dueInDays ?? 7) * 86400000).toISOString();
  c.monitoring.push({
    id: makeId("mon"),
    title: r.title || "ফলো-আপ পর্যবেক্ষণ",
    note: r.note || "",
    dueAt: due,
    status: "pending",
    completedAt: null,
  });
  c.updatedAt = nowIso();
  saveCases(cases);
  return c;
}

/**
 * Cache a Disease Risk Radar snapshot on the case (non-breaking optional
 * field). Called by the RiskRadarWidget after each weather-driven computation.
 * Stores a slimmed projection — the full result stays in component state.
 * @param {string} caseId
 * @param {object} radarResult - output of computeRiskRadar()
 * @returns {object|null} the updated case
 */
export function updateRiskAssessment(caseId, radarResult) {
  const cases = loadCases();
  const idx = cases.findIndex((c) => c.id === caseId);
  if (idx === -1) return null;
  const c = cases[idx];
  c.riskAssessment = {
    riskLevel: radarResult.riskLevel,
    overallRiskScore: radarResult.overallRiskScore,
    dataFreshness: radarResult.dataFreshness,
    topDisease: radarResult.diseaseForecast?.diseases?.[0]?.disease?.id ?? null,
    topDiseaseNameBn: radarResult.diseaseForecast?.diseases?.[0]?.disease?.nameBn ?? null,
    modelLimitations: (radarResult.modelLimitations || []).slice(0, 3),
    computedAt: radarResult.computedAt,
  };
  c.scoutingAction = radarResult.scoutingAction
    ? {
        priority: radarResult.scoutingAction.priority,
        title: radarResult.scoutingAction.title,
        titleBn: radarResult.scoutingAction.titleBn,
        nextObservationDate: radarResult.scoutingAction.windowEnd,
      }
    : null;
  c.updatedAt = nowIso();
  saveCases(cases);
  return c;
}

/**
 * Cases whose reminders are due (for the Home dashboard widget).
 * @returns {Array<{case: object, reminder: object}>}
 */
export function getDueReminders() {
  const now = Date.now();
  const out = [];
  for (const c of loadCases()) {
    for (const m of c.monitoring || []) {
      if (m.status === "pending" && new Date(m.dueAt).getTime() <= now) {
        out.push({ case: c, reminder: m });
      }
    }
  }
  return out.sort((a, b) => new Date(a.reminder.dueAt) - new Date(b.reminder.dueAt));
}

// ─── Evaluation (evaluation_results) ─────────────────────────────────────────

export const OUTCOME_LABELS_BN = {
  recovered: "সেরে উঠেছে",
  improved: "উন্নতি হয়েছে",
  unchanged: "অপরিবর্তিত",
  worsened: "খারাপ হয়েছে",
  failed: "ব্যর্থ হয়েছে",
};

/**
 * Record an evaluation comparing the latest observation with the baseline.
 * The caller supplies before/after severities; this helper only computes
 * deltas — it deliberately does NOT claim treatment causality (images and
 * severity notes alone cannot prove cause and effect).
 *
 * @param {string} caseId
 * @param {{date?: string, outcome?: 'recovered'|'improved'|'unchanged'|'worsened'|'failed',
 *          beforeSeverityPct?: number|null, afterSeverityPct?: number|null,
 *          recoveryNote?: string, totalCost?: number|null,
 *          lessonsLearned?: string, userVerified?: boolean}} ev
 */
export function recordEvaluation(caseId, ev = {}) {
  const cases = loadCases();
  const idx = cases.findIndex((c) => c.id === caseId);
  if (idx === -1) return null;
  const c = cases[idx];
  const before = ev.beforeSeverityPct ?? c.observations[0]?.severityPct ?? null;
  const after = ev.afterSeverityPct ?? c.observations[c.observations.length - 1]?.severityPct ?? null;
  c.evaluation = {
    id: makeId("eval"),
    date: ev.date || nowIso(),
    outcome: ev.outcome || "unchanged",
    beforeSeverityPct: before,
    afterSeverityPct: after,
    severityDelta: before != null && after != null ? before - after : null,
    recoveryNote: ev.recoveryNote || "",
    totalCost: ev.totalCost ?? null,
    lessonsLearned: ev.lessonsLearned || "",
    // userVerified=true only when the farmer explicitly confirms; the app
    // never auto-promotes unverified feedback into authoritative knowledge.
    userVerified: !!ev.userVerified,
    causalityDisclaimer: true,
  };
  c.status = ev.outcome === "recovered" ? "resolved" : ev.outcome === "failed" ? "closed" : "monitoring";
  c.updatedAt = nowIso();
  saveCases(cases);
  return c;
}

// ─── Learning insights (learning_insights) ───────────────────────────────────

/**
 * Promote a verified evaluation into a personal learning insight.
 * These are the farmer's OWN field lessons (clearly labelled as
 * field-verified by the user, not as CABI guidance) surfaced in Pillar 6.
 */
export function addLearningInsight(caseId, insight = {}) {
  const c = getCaseById(caseId);
  if (!c || !c.evaluation) return null;
  const list = safeParse(localStorage.getItem(UDH_INSIGHTS_KEY), []);
  const entry = {
    id: makeId("ins"),
    createdAt: nowIso(),
    caseId,
    crop: c.crop,
    diseaseName: c.diagnosisEvidence?.diseaseName || "",
    diseaseNameBn: c.diagnosisEvidence?.diseaseNameBn || "",
    outcome: c.evaluation.outcome,
    lesson: insight.lesson || c.evaluation.lessonsLearned || "",
    treatmentsTried: (c.treatments || []).map((t) => t.description).filter(Boolean),
    verified: !!c.evaluation.userVerified,
    source: "field-case",
  };
  list.unshift(entry);
  localStorage.setItem(UDH_INSIGHTS_KEY, JSON.stringify(list.slice(0, 50)));
  return entry;
}

export function getLearningInsights() {
  return safeParse(localStorage.getItem(UDH_INSIGHTS_KEY), []);
}

// ─── Dashboard helpers ───────────────────────────────────────────────────────

/** Active (non-closed) cases, newest first. */
export function getActiveCases() {
  return loadCases()
    .filter((c) => c.status === "active" || c.status === "monitoring")
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

/** Compact stats for the Home dashboard header chips. */
export function getCaseStats() {
  const cases = loadCases();
  const reminders = getDueReminders().length;
  return {
    total: cases.length,
    active: cases.filter((c) => c.status === "active").length,
    monitoring: cases.filter((c) => c.status === "monitoring").length,
    resolved: cases.filter((c) => c.status === "resolved").length,
    failed: cases.filter((c) => c.evaluation?.outcome === "failed").length,
    dueReminders: reminders,
  };
}

/** Latest severity of a case (as % if recorded, else label). */
export function latestSeverity(c) {
  const o = (c.observations || [])[c.observations.length - 1] || c.observations?.[0];
  if (!o) return { label: "—", pct: null };
  return { label: o.severity, pct: o.severityPct };
}

/** Downscale an image data-URL to a small thumbnail (max 240px, JPEG q0.6). */
export function makeThumbnail(dataUrl) {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        const MAX = 240;
        let { width: w, height: h } = img;
        if (w > MAX || h > MAX) {
          if (w > h) {
            h = Math.round((h * MAX) / w);
            w = MAX;
          } else {
            w = Math.round((w * MAX) / h);
            h = MAX;
          }
        }
        const cv = document.createElement("canvas");
        cv.width = w;
        cv.height = h;
        cv.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(cv.toDataURL("image/jpeg", 0.6));
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    } catch {
      resolve(null);
    }
  });
}
