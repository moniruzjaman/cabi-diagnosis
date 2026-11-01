/**
 * POST /api/auth/phone
 *
 * actions:
 *   send    — { phone } send SMS OTP via Supabase Auth
 *   verify  — { phone, token } verify OTP, enroll device, set cookie
 *   refresh — { userId, deviceSecret } re-issue cookie for enrolled device
 *
 * /api/auth/refresh rewrites here so we stay under the Vercel function limit.
 */

import { handleCORSPreflight, setCORSHeaders } from "../_lib/cors.js";
import { createRateLimiter } from "../_lib/rateLimit.js";
import { hasSupabase, sendPhoneOtp, verifyPhoneOtp } from "../_lib/supabase.js";
import { upsertUserProfile, getUserById } from "../_lib/userStore.js";
import { setSessionCookie, signSessionToken, getSessionUserId, getSessionSecret } from "../_lib/session.js";
import { createDeviceEnrollment, verifyDeviceEnrollment } from "../_lib/turso.js";
import { isBdPhone, toE164 } from "../../src/auth/phone.js";

const sendLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, maxRequests: 5 });

function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  return {};
}

async function issueSession(res, user) {
  const sessionToken = await signSessionToken(user.id);
  if (!sessionToken) return null;
  setSessionCookie(res, sessionToken);
  const deviceSecret = await createDeviceEnrollment(user.id);
  return { user, deviceSecret };
}

async function handleSend(req, res, body) {
  if (!hasSupabase()) {
    return res.status(503).json({ error: "Auth unavailable" });
  }
  if (!isBdPhone(body.phone)) {
    return res.status(400).json({ error: "invalid_phone" });
  }
  if (sendLimiter(req, res)) return;
  const phone = toE164(body.phone);
  try {
    await sendPhoneOtp(phone);
    return res.status(200).json({ ok: true, phone });
  } catch (err) {
    console.error("[auth/phone] send failed:", err.message);
    return res.status(503).json({ error: "OTP send failed" });
  }
}

async function handleVerify(req, res, body) {
  if (!hasSupabase()) {
    return res.status(503).json({ error: "Auth unavailable" });
  }
  if (!getSessionSecret()) {
    return res.status(503).json({ error: "Server auth not configured" });
  }
  if (!isBdPhone(body.phone) || !body.token) {
    return res.status(400).json({ error: "invalid_phone" });
  }
  const phone = toE164(body.phone);
  let verified;
  try {
    verified = await verifyPhoneOtp(phone, String(body.token).trim());
  } catch (err) {
    console.error("[auth/phone] verify failed:", err.message);
    return res.status(401).json({ error: "Invalid OTP" });
  }
  if (!verified) {
    return res.status(401).json({ error: "Invalid OTP" });
  }
  const authId = verified.user?.id || verified.id || null;
  try {
    const stored = await upsertUserProfile({
      auth_id: authId,
      phone,
      email: verified.user?.email || verified.email || null,
      nowIso: new Date().toISOString(),
    });
    if (!stored.user) {
      return res.status(500).json({ error: "Failed to create/update user" });
    }
    const issued = await issueSession(res, stored.user);
    if (!issued) return res.status(503).json({ error: "Server auth not configured" });
    return res.status(200).json({ user: issued.user, deviceSecret: issued.deviceSecret });
  } catch (err) {
    console.error("[auth/phone] upsert failed:", err.message);
    return res.status(500).json({ error: "Failed to create/update user" });
  }
}

async function handleRefresh(req, res, body) {
  const existingUid = await getSessionUserId(req);
  if (existingUid) {
    const user = await getUserById(existingUid);
    if (user) {
      const token = await signSessionToken(user.id);
      if (token) setSessionCookie(res, token);
      return res.status(200).json({ user });
    }
  }

  const userId = body.userId != null ? String(body.userId) : "";
  const deviceSecret = typeof body.deviceSecret === "string" ? body.deviceSecret : "";
  if (!userId || !deviceSecret) {
    return res.status(200).json({ user: null });
  }

  const ok = await verifyDeviceEnrollment(userId, deviceSecret);
  if (!ok) {
    return res.status(200).json({ user: null });
  }

  const user = await getUserById(userId);
  if (!user) {
    return res.status(200).json({ user: null });
  }

  const token = await signSessionToken(user.id);
  if (token) setSessionCookie(res, token);
  return res.status(200).json({ user });
}

export default async function handler(req, res) {
  if (handleCORSPreflight(req, res, "POST, OPTIONS")) return;
  setCORSHeaders(req, res, "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = parseBody(req);
  const action = body.action || (req.query?.action ? String(req.query.action) : "");

  if (action === "send") return handleSend(req, res, body);
  if (action === "verify") return handleVerify(req, res, body);
  if (action === "refresh") return handleRefresh(req, res, body);

  return res.status(400).json({ error: "Unknown action" });
}
