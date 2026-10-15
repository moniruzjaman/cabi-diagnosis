// ---------------------------------------------------------------------------
// Share-attribution + download analytics (client side)
//
// Goal: understand whether a person we shared the app with actually OPENED
// it and DOWNLOADED content.
//
// How attribution works:
//  1. Every link produced by ShareModal carries `?from=share` (or is opened
//     from an in-app share button, which marks the session directly).
//  2. On load, detectSharedVisit() checks URL params / hash and persists the
//     fact in sessionStorage (`pesticidenext_shared_visit`) so the flag
//     survives redirects and later tab navigation within the same visit.
//  3. When any PDF/guide download completes, logDownload() POSTs to
//     /api/downloads/log with `viaShare`, so the server counts how many
//     downloads came from shared-link visitors ("opened or not" signal).
// ---------------------------------------------------------------------------

const SHARED_VISIT_KEY = "pesticidenext_shared_visit";

export function markSharedVisit(): void {
  try {
    sessionStorage.setItem(SHARED_VISIT_KEY, "true");
  } catch {
    // sessionStorage unavailable (private mode) — best-effort only.
  }
}

export function isSharedVisit(): boolean {
  try {
    return sessionStorage.getItem(SHARED_VISIT_KEY) === "true";
  } catch {
    return false;
  }
}

/** Detect ?from=share / ?ref=share / ?utm_source=share / #sh-… deep links.
 *  Called once at app start, BEFORE DocumentMeta/hash-routing touches the URL. */
export function detectSharedVisit(): boolean {
  if (typeof window === "undefined") return false;
  let detected = false;
  try {
    const search = new URLSearchParams(window.location.search);
    const src = (search.get("from") || search.get("ref") || search.get("utm_source") || "").toLowerCase();
    if (src.includes("share")) detected = true;
    if (window.location.hash.startsWith("#sh-")) detected = true;
    // WhatsApp/Telegram previews sometimes strip query strings but keep the
    // referrer host of the messaging web client.
    if (!detected && /web\.whatsapp\.com|web\.telegram\.org|m\.facebook\.com/.test(document.referrer)) {
      detected = true;
    }
  } catch {
    // ignore malformed URLs
  }
  if (detected) markSharedVisit();
  return detected;
}

/**
 * Record a completed download on the server. Fire-and-forget: never blocks
 * or throws into the UI. Uses sendBeacon when the page may be unloading.
 */
export function logDownload(kind: string, label: string): void {
  if (typeof window === "undefined") return;
  const viaShare = isSharedVisit();
  const payload = JSON.stringify({ kind, label: label.slice(0, 120), viaShare });

  try {
    fetch("/api/downloads/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true, // lets the request survive a quick tab close
    }).catch(() => {
      // Offline / API unavailable — fall back to beacon, then localStorage.
      try {
        navigator.sendBeacon?.(
          "/api/downloads/beacon",
          new Blob([payload], { type: "application/json" })
        );
      } catch {
        /* noop */
      }
      queuePendingDownload(payload);
    });
  } catch {
    queuePendingDownload(payload);
  }
}

const PENDING_KEY = "pesticidenext_pending_downloads";

function queuePendingDownload(payload: string): void {
  try {
    const arr = JSON.parse(sessionStorage.getItem(PENDING_KEY) || "[]");
    arr.push(payload);
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(arr.slice(-20)));
  } catch {
    /* noop */
  }
}

/** Retry downloads that failed while offline (called once at startup). */
export function flushPendingDownloads(): void {
  if (typeof window === "undefined") return;
  try {
    const arr: string[] = JSON.parse(sessionStorage.getItem(PENDING_KEY) || "[]");
    if (!arr.length) return;
    sessionStorage.removeItem(PENDING_KEY);
    for (const payload of arr) {
      fetch("/api/downloads/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      }).catch(() => {
        /* drop silently — stats are best-effort */
      });
    }
  } catch {
    /* noop */
  }
}
