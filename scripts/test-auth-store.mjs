import { isBdPhone, toE164, normalizeBdNational } from "../src/auth/phone.js";
import { sanitizeDiagnosisEntry } from "../api/_lib/diagnosisSanitize.js";
import { authStatus } from "../api/_lib/userStore.js";
import { readCookie } from "../api/_lib/jwt.js";
import { SESSION_COOKIE, LEGACY_COOKIE, readSessionToken } from "../api/_lib/session.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(isBdPhone("01712345678"), "national phone should pass");
assert(isBdPhone("01712-345678"), "dashed phone should pass");
assert(isBdPhone("+8801712345678"), "e164 phone should pass");
assert(!isBdPhone("123"), "short phone should fail");
assert(!isBdPhone("02112345678"), "non-01 phone should fail");
assert(toE164("01712345678") === "+8801712345678", "toE164 national");
assert(normalizeBdNational("+8801712345678") === "01712345678", "normalize e164");

const sanitized = sanitizeDiagnosisEntry({
  session_id: "sid-1",
  crop: "rice",
  user_id: "attacker-uid",
  symptoms: "leaf spot",
});
assert(!sanitized.error, "valid diagnosis should sanitize");
assert(sanitized.entry.crop === "rice", "crop kept");
assert(sanitized.entry.user_id === undefined, "body user_id must not be copied");

const status = authStatus();
assert(typeof status.supabase === "boolean", "authStatus.supabase");
assert(!("turso" in status) || status.google !== undefined, "identity status still reports google");

assert(SESSION_COOKIE === "cabi_session", "cookie name");
assert(LEGACY_COOKIE === "agrichem_session", "legacy cookie name");
assert(readCookie("cabi_session=new; agrichem_session=old", "cabi_session") === "new", "readCookie current");
assert(
  readSessionToken({ headers: { cookie: "agrichem_session=legacy" } }) === "legacy",
  "legacy cookie fallback",
);
assert(
  readSessionToken({ headers: { cookie: "cabi_session=current; agrichem_session=legacy" } }) === "current",
  "prefer cabi_session",
);

console.log("test-auth-store: ok");
