/**
 * Session cookie helpers for one-time device login.
 * cabi_session is current; agrichem_session is read until it expires.
 */

import { signJWT, verifyJWT, readCookie, isPreviewDeploy } from "./jwt.js";

export const SESSION_COOKIE = "cabi_session";
export const LEGACY_COOKIE = "agrichem_session";
export const SESSION_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export function getSessionSecret() {
  return process.env.SESSION_SECRET || (isPreviewDeploy() ? "preview-session-secret" : "");
}

function cookieFlags(name, value, maxAge) {
  return [`${name}=${value}`, "HttpOnly", "Secure", "SameSite=Lax", "Path=/", `Max-Age=${maxAge}`].join("; ");
}

export function setSessionCookie(res, token) {
  res.setHeader("Set-Cookie", cookieFlags(SESSION_COOKIE, token, SESSION_MAX_AGE_SECONDS));
}

export function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", [cookieFlags(SESSION_COOKIE, "", 0), cookieFlags(LEGACY_COOKIE, "", 0)]);
}

export function readSessionToken(req) {
  const header = req?.headers?.cookie || "";
  return readCookie(header, SESSION_COOKIE) || readCookie(header, LEGACY_COOKIE) || "";
}

export async function signSessionToken(uid) {
  const secret = getSessionSecret();
  if (!secret || !uid) return "";
  return signJWT(
    {
      uid: String(uid),
      exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    },
    secret,
  );
}

export async function getSessionUserId(req) {
  const secret = getSessionSecret();
  if (!secret) return null;
  const token = readSessionToken(req);
  if (!token) return null;
  const payload = await verifyJWT(token, secret);
  if (!payload) return null;
  const exp = Number(payload.exp || 0);
  if (exp < Date.now()) return null;
  const uid = payload.uid;
  if (uid == null || uid === "") return null;
  return String(uid);
}
