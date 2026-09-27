/**
 * Minimal JWT sign/verify using Web Crypto API (HMAC-SHA256).
 *
 * Works on Vercel serverless (Node 20+) and edge runtime without any
 * external dependencies. We deliberately don't use `jsonwebtoken`
 * because it relies on Node's `crypto` module which isn't available
 * in edge runtime.
 *
 * Token format: base64url(header).base64url(payload).base64url(signature)
 */

const enc = new TextEncoder();

function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): string {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return atob(padded + pad);
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/**
 * Sign a payload object as a JWT with HS256.
 * Adds `iat` (issued-at) automatically; caller supplies `exp` (expiry ms).
 */
export async function signJWT(
  payload: Record<string, unknown>,
  secret: string,
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const body = { ...payload, iat: Date.now() };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const bodyB64 = base64UrlEncode(JSON.stringify(body));
  const data = `${headerB64}.${bodyB64}`;
  const key = await importKey(secret);
  const sigBytes = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, enc.encode(data)),
  );
  const sigB64 = base64UrlEncodeBytes(sigBytes);
  return `${data}.${sigB64}`;
}

/**
 * Verify a JWT's signature and return the decoded payload, or null if invalid.
 * Does NOT check `exp` — caller should compare payload.exp < Date.now().
 */
export async function verifyJWT(
  token: string,
  secret: string,
): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, bodyB64, sigB64] = parts;
    const data = `${headerB64}.${bodyB64}`;
    const key = await importKey(secret);

    // Decode signature back to bytes
    const sigBin = base64UrlDecode(sigB64);
    const sigBytes = new Uint8Array(sigBin.length);
    for (let i = 0; i < sigBin.length; i++) sigBytes[i] = sigBin.charCodeAt(i);

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      enc.encode(data),
    );
    if (!valid) return null;

    return JSON.parse(base64UrlDecode(bodyB64));
  } catch {
    return null;
  }
}

/**
 * Read a named cookie from a Cookie header string.
 * Returns "" if not found.
 */
export function readCookie(cookieHeader: string, name: string): string {
  if (!cookieHeader) return "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : "";
}
