/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { isBdPhone, toE164 } from "./phone.js";
import {
  attachLocalToUser,
  flushOutbox,
  getAuthDevice,
  pendingCount as readPendingCount,
  pullRemoteHistory,
  requestPersistentStorage,
  setAuthDevice,
} from "../offline/sync.js";

const AuthContext = createContext(null);

async function afterEnroll(user, deviceSecret, extra = {}) {
  await setAuthDevice({
    userId: user.id,
    phone: user.phone || extra.phone || null,
    pendingOtp: false,
    enrolledAt: new Date().toISOString(),
    ...(deviceSecret ? { deviceSecret } : {}),
  });
  await requestPersistentStorage();
  await attachLocalToUser(user.id);
  await pullRemoteHistory();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("guest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(0);
  const [otpSending, setOtpSending] = useState(false);

  const refreshPending = useCallback(async () => {
    setPending(await readPendingCount());
  }, []);

  const refresh = useCallback(async () => {
    try {
      const resp = await fetch("/api/auth/me", { credentials: "include" });
      const data = await resp.json().catch(() => ({}));
      if (data.user) {
        setUser(data.user);
        setStatus("enrolled");
        setError(null);
        await afterEnroll(data.user, null);
        await refreshPending();
        return data.user;
      }

      const device = await getAuthDevice();
      if (device?.userId && device?.deviceSecret) {
        const restored = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "refresh", userId: device.userId, deviceSecret: device.deviceSecret }),
        });
        const restoredData = await restored.json().catch(() => ({}));
        if (restoredData.user) {
          setUser(restoredData.user);
          setStatus("enrolled");
          setError(null);
          await afterEnroll(restoredData.user, device.deviceSecret);
          await refreshPending();
          return restoredData.user;
        }
      }

      if (device?.pendingOtp && device?.phone) {
        setStatus("pending_phone");
        setUser(null);
      } else {
        setStatus("guest");
        setUser(null);
      }
      setError(null);
      return null;
    } catch (e) {
      setUser(null);
      setStatus("guest");
      setError(e?.message || "Failed to check session");
      return null;
    } finally {
      setLoading(false);
    }
  }, [refreshPending]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    refresh();
  }, [refresh]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    flushOutbox()
      .then(refreshPending)
      .catch(() => {});
  }, [refreshPending]);

  const loginWithGoogle = useCallback(
    async (credential) => {
      setError(null);
      const resp = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ credential }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const msg = data.error || "Sign-in failed";
        setError(msg);
        throw new Error(msg);
      }
      setUser(data.user);
      setStatus("enrolled");
      await afterEnroll(data.user, data.deviceSecret);
      await refreshPending();
      return data.user;
    },
    [refreshPending],
  );

  const sendOtp = useCallback(async (phone) => {
    let target = phone;
    if (!target) {
      const device = await getAuthDevice();
      target = device?.phone;
    }
    if (!target) throw new Error("Phone missing");
    const resp = await fetch("/api/auth/phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "send", phone: target }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(data.error || "OTP send failed");
    }
    return data;
  }, []);

  const savePhone = useCallback(
    async (raw) => {
      if (!isBdPhone(raw)) {
        const msg = "সঠিক বাংলাদেশি মোবাইল নম্বর লিখুন (01XXXXXXXXX)";
        setError(msg);
        throw new Error(msg);
      }
      const phone = toE164(raw);
      await setAuthDevice({ phone, pendingOtp: true });
      setStatus("pending_phone");
      setError(null);
      if (typeof navigator !== "undefined" && navigator.onLine) {
        setOtpSending(true);
        try {
          await sendOtp(raw);
        } catch (e) {
          setError(e.message);
        } finally {
          setOtpSending(false);
        }
      }
      return phone;
    },
    [sendOtp],
  );

  const verifyOtp = useCallback(
    async (token, rawPhone) => {
      const device = await getAuthDevice();
      const phone = rawPhone || device?.phone;
      if (!phone) throw new Error("Phone missing");
      const resp = await fetch("/api/auth/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "verify", phone, token }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const msg = data.error || "Invalid OTP";
        setError(msg);
        throw new Error(msg);
      }
      setUser(data.user);
      setStatus("enrolled");
      setError(null);
      await afterEnroll(data.user, data.deviceSecret, { phone });
      await refreshPending();
      return data.user;
    },
    [refreshPending],
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      /* keep local enrollment; farmer UI does not expose logout */
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      loading,
      error,
      pending,
      otpSending,
      loginWithGoogle,
      logout,
      refresh,
      savePhone,
      verifyOtp,
      sendOtp,
      refreshPending,
    }),
    [
      user,
      status,
      loading,
      error,
      pending,
      otpSending,
      loginWithGoogle,
      logout,
      refresh,
      savePhone,
      verifyOtp,
      sendOtp,
      refreshPending,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      status: "guest",
      loading: false,
      error: null,
      pending: 0,
      otpSending: false,
      loginWithGoogle: async () => {
        throw new Error("AuthProvider not mounted");
      },
      logout: async () => {},
      refresh: async () => {},
      savePhone: async () => {},
      verifyOtp: async () => {},
      sendOtp: async () => {},
      refreshPending: async () => {},
    };
  }
  return ctx;
}

export default useAuth;
