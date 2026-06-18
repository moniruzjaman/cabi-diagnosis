/**
 * @module offline/offlineStorage
 * @description
 * IndexedDB-backed persistence for offline diagnoses.
 *
 * GAP-03 FIX: Previously, offline-mode diagnoses lived only in React state
 * and were lost on tab close/refresh. This module stores each completed
 * offline diagnosis in IndexedDB (250-entry rolling window) so field officers
 * can review them later, even after a device restart.
 *
 * API surface mirrors the localStorage history API used by the rest of the
 * app, so callers can swap `localStorage.getItem('ud-history')` for
 * `loadOfflineHistory()` without refactoring.
 *
 * Schema (single object store, keyPath = 'id'):
 *   {
 *     id: string (UUID),
 *     timestamp: ISO string,
 *     crop: string,
 *     district: string,
 *     season: string,
 *     growthStage: string,
 *     symptoms: string,
 *     result: { ...offlineDiagnosisObject },
 *     resultPreview: string (first 200 chars of summary),
 *     date: string (display date, e.g. "2026-06-18 14:32"),
 *   }
 *
 * @example
 *   import { saveOfflineDiagnosis, loadOfflineHistory, clearOfflineHistory } from '@/offline/offlineStorage';
 *   await saveOfflineDiagnosis({ crop: 'ধান', district: 'কুড়িগ্রাম', ...result });
 *   const history = await loadOfflineHistory();
 */

const DB_NAME = 'cabi-offline-db';
const DB_VERSION = 1;
const STORE_NAME = 'diagnoses';
const MAX_ENTRIES = 250;

let _dbPromise = null;

/**
 * Opens (or creates) the IndexedDB database.
 * Cached so subsequent calls return the same promise.
 * @returns {Promise<IDBDatabase>}
 */
function getDB() {
  if (_dbPromise) return _dbPromise;

  _dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available in this environment'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('crop', 'crop', { unique: false });
        store.createIndex('district', 'district', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return _dbPromise;
}

/**
 * Generate a reasonably-unique ID without external deps.
 * Uses crypto.randomUUID if available, falls back to time+random.
 */
function genId() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return `od-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Save an offline diagnosis to IndexedDB.
 * Also enforces the MAX_ENTRIES rolling-window cap by deleting the oldest
 * entries when the count exceeds the limit.
 *
 * @param {Object} entry - Diagnosis entry. Must contain at minimum a `result`
 *   field with the offline engine output. Other fields are auto-populated.
 * @returns {Promise<Object>} The saved entry (with id/timestamp assigned).
 */
export async function saveOfflineDiagnosis(entry) {
  const db = await getDB();
  const now = new Date();
  const record = {
    id: entry.id || genId(),
    timestamp: entry.timestamp || now.toISOString(),
    date: entry.date || now.toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
    crop: entry.crop || '—',
    district: entry.district || '—',
    season: entry.season || '',
    growthStage: entry.growthStage || '',
    symptoms: entry.symptoms || '',
    result: entry.result || null,
    resultPreview: entry.resultPreview || (entry.result ? buildPreview(entry.result) : ''),
    mode: 'offline',
  };

  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Enforce rolling-window cap (best-effort; don't fail save if prune fails)
  try {
    await pruneOldEntries();
  } catch (e) {
    console.warn('[offlineStorage] prune failed:', e);
  }

  return record;
}

/**
 * Load all offline diagnoses, newest first.
 * @param {Object} [opts]
 * @param {number} [opts.limit=50] - Max entries to return
 * @returns {Promise<Array>} Array of diagnosis entries
 */
export async function loadOfflineHistory({ limit = 50 } = {}) {
  try {
    const db = await getDB();
    const all = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return all.slice(0, limit);
  } catch (e) {
    console.warn('[offlineStorage] loadOfflineHistory failed:', e);
    return [];
  }
}

/**
 * Get a single offline diagnosis by id.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getOfflineDiagnosis(id) {
  try {
    const db = await getDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[offlineStorage] getOfflineDiagnosis failed:', e);
    return null;
  }
}

/**
 * Delete a single offline diagnosis by id.
 * @param {string} id
 * @returns {Promise<boolean>} true if deleted, false otherwise
 */
export async function deleteOfflineDiagnosis(id) {
  try {
    const db = await getDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return true;
  } catch (e) {
    console.warn('[offlineStorage] deleteOfflineDiagnosis failed:', e);
    return false;
  }
}

/**
 * Clear all offline diagnoses.
 * @returns {Promise<boolean>}
 */
export async function clearOfflineHistory() {
  try {
    const db = await getDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return true;
  } catch (e) {
    console.warn('[offlineStorage] clearOfflineHistory failed:', e);
    return false;
  }
}

/**
 * Get count of stored offline diagnoses.
 * @returns {Promise<number>}
 */
export async function getOfflineCount() {
  try {
    const db = await getDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return 0;
  }
}

/**
 * Check whether IndexedDB persistence is available in the current environment.
 * Useful for gracefully degrading to in-memory only on unsupported browsers.
 * @returns {boolean}
 */
export function isOfflineStorageAvailable() {
  return typeof indexedDB !== 'undefined';
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Prune oldest entries if the store exceeds MAX_ENTRIES.
 * Runs in a single transaction.
 */
async function pruneOldEntries() {
  const db = await getDB();
  const all = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  if (all.length <= MAX_ENTRIES) return;

  all.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const toDelete = all.slice(0, all.length - MAX_ENTRIES);

  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const entry of toDelete) store.delete(entry.id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Build a short preview string from an offline diagnosis result.
 * @param {Object} result
 * @returns {string}
 */
function buildPreview(result) {
  if (!result) return '';
  const parts = [];
  if (result.primarySuspect) parts.push(result.primarySuspect);
  if (result.abioticBiotic) parts.push(result.abioticBiotic);
  if (Array.isArray(result.suspects) && result.suspects.length) {
    parts.push(`Suspects: ${result.suspects.slice(0, 3).join(', ')}`);
  }
  return parts.join(' · ').slice(0, 200);
}
