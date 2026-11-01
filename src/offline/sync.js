import localforage from "localforage";

const OUTBOX_KEY = "diagnoses_outbox";
const AUTH_DEVICE_KEY = "auth_device";
const HISTORY_MIRROR_KEY = "ud-history";
const HAS_DIAGNOSIS_KEY = "ud-has-diagnosis";

function nowIso() {
  return new Date().toISOString();
}

function localId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function getAuthDevice() {
  try {
    return (await localforage.getItem(AUTH_DEVICE_KEY)) || null;
  } catch {
    return null;
  }
}

export async function setAuthDevice(partial) {
  const current = (await getAuthDevice()) || {};
  const next = { ...current, ...partial };
  await localforage.setItem(AUTH_DEVICE_KEY, next);
  return next;
}

export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist) await navigator.storage.persist();
  } catch {
    /* ignore */
  }
}

async function readOutbox() {
  try {
    const rows = await localforage.getItem(OUTBOX_KEY);
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

async function writeOutbox(rows) {
  await localforage.setItem(OUTBOX_KEY, rows);
}

function toPayload(input) {
  const sessionId = input.session_id || input.sessionId || localId();
  return {
    session_id: String(sessionId).slice(0, 200),
    crop: String(input.crop || "unknown").slice(0, 100),
    disease_name: input.disease_name || input.diseaseName || null,
    disease_name_bn: input.disease_name_bn || input.diseaseNameBn || null,
    confidence: input.confidence || null,
    severity: input.severity || null,
    biotic_abiotic: input.biotic_abiotic || input.bioticAbiotic || null,
    provider: input.provider || null,
    symptoms: input.symptoms || null,
    recommendations: input.recommendations || null,
    weather_snapshot: input.weather_snapshot || input.weatherSnapshot || null,
    district: input.district || null,
    image_count: Math.min(Math.max(Number(input.image_count || input.imageCount) || 0, 0), 10),
    vit_prediction: input.vit_prediction || (input.vitPrediction ? JSON.stringify(input.vitPrediction) : null),
  };
}

export function toHistoryItem(row) {
  const payload = row.payload || row;
  const created = row.created_at || row.createdAt || nowIso();
  let date = payload.date;
  try {
    date = date || new Date(created).toLocaleDateString("bn-BD");
  } catch {
    date = created;
  }
  return {
    localId: row.localId,
    crop: payload.crop || "",
    district: payload.district || "",
    date,
    resultPreview: payload.disease_name_bn || payload.disease_name || payload.resultPreview || "",
    vitPrediction: payload.vitPrediction || null,
    fromServer: row.syncState === "synced",
    created_at: created,
    syncState: row.syncState || "pending",
  };
}

function mirrorHistory(items) {
  try {
    localStorage.setItem(HISTORY_MIRROR_KEY, JSON.stringify(items.slice(0, 20)));
    if (items.length > 0) localStorage.setItem(HAS_DIAGNOSIS_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function hasCompletedDiagnosis() {
  try {
    return localStorage.getItem(HAS_DIAGNOSIS_KEY) === "1";
  } catch {
    return false;
  }
}

export async function queueDiagnosis(input) {
  const device = await getAuthDevice();
  const payload = toPayload(input);
  const row = {
    localId: localId(),
    payload,
    user_id: device?.userId || null,
    syncState: "pending",
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  const rows = await readOutbox();
  rows.push(row);
  await writeOutbox(rows);
  const history = rows.map(toHistoryItem);
  mirrorHistory(history);
  return row;
}

async function getSigningToken() {
  try {
    const res = await fetch("/api/signing-token");
    const data = await res.json().catch(() => ({}));
    return data.token || null;
  } catch {
    return null;
  }
}

export async function flushOutbox() {
  const rows = await readOutbox();
  const pending = rows.filter((r) => r.syncState !== "synced");
  if (pending.length === 0) return rows;
  const token = await getSigningToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["X-Request-Signature"] = token;

  for (const row of pending) {
    try {
      const res = await fetch("/api/diagnoses", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(row.payload),
      });
      if (res.ok) {
        row.syncState = "synced";
        row.updated_at = nowIso();
      } else if (res.status === 503 || res.status >= 500) {
        row.syncState = "pending";
      } else {
        row.syncState = "error";
      }
    } catch {
      row.syncState = "pending";
    }
  }
  await writeOutbox(rows);
  return rows;
}

export async function attachLocalToUser(userId) {
  if (!userId) return;
  const rows = await readOutbox();
  for (const row of rows) {
    if (row.user_id == null) {
      row.user_id = userId;
      row.updated_at = nowIso();
      if (row.syncState === "synced") row.syncState = "pending";
    }
  }
  await writeOutbox(rows);
  await flushOutbox();
}

function mergeKey(item) {
  const created = item.created_at || item.createdAt || "";
  const crop = item.crop || item.payload?.crop || "";
  const disease = item.diseaseName || item.payload?.disease_name || item.resultPreview || "";
  return `${created}|${crop}|${disease}`;
}

export async function pullRemoteHistory() {
  let remote = [];
  try {
    const res = await fetch("/api/diagnoses?limit=50", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    remote = Array.isArray(data.diagnoses) ? data.diagnoses : [];
  } catch {
    remote = [];
  }

  const local = await readOutbox();
  const byKey = new Map();
  for (const row of local) {
    byKey.set(mergeKey(row.payload ? { ...row.payload, created_at: row.created_at } : row), row);
  }
  for (const d of remote) {
    const created = d.createdAt || d.created_at;
    const mapped = {
      localId: `remote-${d.id || created}`,
      payload: {
        session_id: d.sessionId || d.session_id || `remote-${d.id}`,
        crop: d.crop,
        disease_name: d.diseaseName || d.disease_name,
        disease_name_bn: d.diseaseNameBn || d.disease_name_bn,
        district: d.district,
      },
      user_id: d.userId || d.user_id || null,
      syncState: "synced",
      created_at: created,
      updated_at: created,
    };
    const key = mergeKey({ created_at: created, crop: mapped.payload.crop, diseaseName: mapped.payload.disease_name });
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, mapped);
      continue;
    }
    const existingTs = Date.parse(existing.created_at || "") || 0;
    const remoteTs = Date.parse(created || "") || 0;
    if (existing.syncState === "synced" && remoteTs < existingTs) continue;
    if (remoteTs >= existingTs) byKey.set(key, mapped);
  }
  const merged = [...byKey.values()].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  await writeOutbox(merged);
  return merged.map(toHistoryItem);
}

export async function getLocalHistory() {
  const rows = await readOutbox();
  const items = rows.map(toHistoryItem);
  if (items.length === 0) {
    try {
      const mirrored = JSON.parse(localStorage.getItem(HISTORY_MIRROR_KEY) || "[]");
      return Array.isArray(mirrored) ? mirrored : [];
    } catch {
      return [];
    }
  }
  mirrorHistory(items);
  return items;
}

export async function pendingCount() {
  const rows = await readOutbox();
  return rows.filter((r) => r.syncState === "pending" || r.syncState === "error").length;
}
