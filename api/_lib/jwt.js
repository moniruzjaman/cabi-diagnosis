/**
 * Minimal JWT sign/verify using Web Crypto API (HMAC-SHA256).
 */

const enc = new TextEncoder();

function base64UrlEncode(str) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return atob(padded + pad);
}

function base64UrlEncodeBytes(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function importKey(secret) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

export async function signJWT(payload, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const body = { ...payload, iat: Date.now() };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const bodyB64 = base64UrlEncode(JSON.stringify(body));
  const data = `${headerB64}.${bodyB64}`;
  const key = await importKey(secret);
  const sigBytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
  const sigB64 = base64UrlEncodeBytes(sigBytes);
  return `${data}.${sigB64}`;
}

export async function verifyJWT(token, secret) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, bodyB64, sigB64] = parts;
    const data = `${headerB64}.${bodyB64}`;
    const key = await importKey(secret);
    const sigBin = base64UrlDecode(sigB64);
    const sigBytes = new Uint8Array(sigBin.length);
    for (let i = 0; i < sigBin.length; i++) sigBytes[i] = sigBin.charCodeAt(i);
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(data));
    if (!valid) return null;
    return JSON.parse(base64UrlDecode(bodyB64));
  } catch {
    return null;
  }
}

export function readCookie(cookieHeader, name) {
  if (!cookieHeader) return "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : "";
}

export function isPreviewDeploy() {
  return !!(process.env.VERCEL_ENV === "preview" || process.env.GITHUB_ACTIONS || process.env.CI);
}
