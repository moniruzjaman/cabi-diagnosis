// ============================================================
// Plant Detective — Crop Health Intelligence (Phase 3)
// useNetworkStatus — React hook wrapping navigator.onLine + the
// browser online/offline events. Lets the SyncStatusChip and Field
// Location Picker reflect connectivity without each re-implementing
// the listener dance.
//
// In Node (no navigator), reports online:true so server-side renders
// and tests do not falsely show "offline".
//
// Original design. Standard browser-online pattern. No code ported
// from any repository.
// ============================================================

import { useEffect, useState } from "react";

const NETWORK_LIMITATIONS = [
  "navigator.onLine কেবল নেটওয়ার্ক সংযোগের অনুপস্থিতি বোঝায় — ইন্টারনেট অ্যাক্সেস নিশ্চিত করে না (DNS/ক্যাপটিভ পোর্টাল থাকতে পারে)।",
];

/**
 * Track the device's connectivity. Returns { online, since } where `since`
 * is the ISO timestamp of the last transition. Listeners are cleaned up on
 * unmount.
 * @returns {{online: boolean, since: string}}
 */
export function useNetworkStatus() {
  const [state, setState] = useState(() => ({
    online: typeof navigator !== "undefined" && typeof navigator.onLine === "boolean" ? navigator.onLine : true,
    since: new Date().toISOString(),
  }));

  useEffect(() => {
    // SSR / Node: no navigator, no window events — assume online, do nothing.
    if (typeof navigator === "undefined" || typeof window === "undefined") return undefined;

    const update = (online) => setState({ online, since: new Date().toISOString() });
    const handleOnline = () => update(true);
    const handleOffline = () => update(false);

    // Re-sync with the live value in case it changed between init and effect.
    update(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return state;
}

export const NETWORK_MODEL_LIMITATIONS = NETWORK_LIMITATIONS;
