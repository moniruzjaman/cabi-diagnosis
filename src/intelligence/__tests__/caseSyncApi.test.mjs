// Case-sync API integration test — the FULL production path:
//
//   syncQueue record → POST /api/community?resource=cases (the /api/cases
//   rewrite target) → requireSignedRequest (VERCEL=1) → casesLimiter →
//   validateCaseSyncRecord → turso.saveCaseRecord → real SQLite via
//   libsql's file: URL (same client code path as Turso cloud — see
//   scripts/verify-turso-config.mjs) → idempotent row in crop_health_cases.
//
// Covers: signed 200 + saved, replay idempotency (duplicate), photo/GPS
// smuggling stripped server-side, 403 on missing/invalid signature,
// 400 on invalid recordId/type, 404 unknown resource, 405 wrong method,
// and the client sanitizePayload ↔ server validator contract.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import crypto from "node:crypto";
import { createClient } from "@libsql/client";

// Env MUST be set before importing api modules — turso.js and
// requestSigning.js derive their client/secret from these at first use.
const dir = mkdtempSync(join(tmpdir(), "cabi-case-sync-"));
const dbPath = join(dir, "cases-test.db");
process.env.TURSO_DATABASE_URL = `file:${dbPath}`;
process.env.TURSO_AUTH_TOKEN = "test-token-not-real";
process.env.VERCEL = "1";

const { default: handler } = await import("../../../api/community.js");
const { validateCaseSyncRecord } = await import("../../../api/_lib/validation.js");
const { sanitizePayload } = await import("../syncQueue.js");

// Mint a valid signing token the same way api/_lib/requestSigning.js does
// (secret derived from Turso credentials, HMAC over the timestamp).
const SECRET = crypto
  .createHmac("sha256", "cabi-signing-v1")
  .update(`${process.env.TURSO_DATABASE_URL}|${process.env.TURSO_AUTH_TOKEN}`)
  .digest("hex");
function mintToken() {
  const ts = Date.now();
  return `${ts}.${crypto.createHmac("sha256", SECRET).update(`${ts}`).digest("hex")}`;
}

function mockReq({ body, token, method = "POST", resource = "cases" }) {
  return {
    method,
    query: { resource },
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "10.7.0.42",
      ...(token ? { "x-request-signature": token } : {}),
    },
    body,
  };
}

function mockRes() {
  const out = { statusCode: 200, headers: {}, body: undefined };
  out.status = (code) => {
    out.statusCode = code;
    return out;
  };
  out.json = (obj) => {
    out.body = obj;
    return out;
  };
  out.setHeader = (k, v) => {
    out.headers[k] = v;
    return out;
  };
  out.end = () => out;
  return out;
}

async function call(opts) {
  const res = mockRes();
  await handler(mockReq(opts), res);
  return res;
}

let pass = 0,
  fail = 0;
function assert(cond, msg) {
  if (cond) {
    pass++;
  } else {
    fail++;
    console.error("FAIL:", msg);
  }
}

const VALID_BODY = {
  recordId: "sync-abc-1",
  caseId: "case-77",
  type: "case_created",
  payload: { crop: "ধান", district: "বগুড়া", status: "active" },
  createdAt: "2026-11-22T10:00:00.000Z",
};

// 1. Signed valid POST → 200, saved
const r1 = await call({ body: VALID_BODY, token: mintToken() });
assert(r1.statusCode === 200, `valid signed POST → 200 (got ${r1.statusCode})`);
assert(r1.body?.ok === true && r1.body?.saved === true, "response ok + saved");
assert(r1.body?.duplicate === false, "first post is not a duplicate");
assert(r1.body?.persistence === "turso", "persistence reported as turso");

// 2. Replay of the same recordId → idempotent duplicate (offline retries)
const r2 = await call({ body: VALID_BODY, token: mintToken() });
assert(r2.statusCode === 200, `replay POST → 200 (got ${r2.statusCode})`);
assert(r2.body?.saved === false && r2.body?.duplicate === true, "replay → duplicate:true, no second row");

// 3. Real database row — correct columns, payload metadata-only
const db = createClient({ url: process.env.TURSO_DATABASE_URL });
const rows1 = await db.execute("SELECT * FROM crop_health_cases");
assert(rows1.rows.length === 1, `exactly 1 row in crop_health_cases (got ${rows1.rows.length})`);
const row = rows1.rows[0];
assert(row.client_record_id === "sync-abc-1", "client_record_id stored");
assert(row.case_id === "case-77" && row.type === "case_created", "case_id + type stored");
assert(row.crop === "ধান" && row.district === "বগুড়া", "extracted columns stored");
assert(typeof row.visitor_hash === "string" && row.visitor_hash.length === 16, "visitor_hash is a 16-char hash (no raw IP)");
const storedPayload = JSON.parse(row.payload);
assert(storedPayload.crop === "ধান" && storedPayload.status === "active", "payload JSON round-trips");
assert(!("photo" in storedPayload) && !("lat" in storedPayload), "stored payload has no media/location keys");

// 4. Photo/GPS smuggling attempt → stripped by the server whitelist
const smuggle = await call({
  body: {
    recordId: "sync-abc-2",
    caseId: "case-77",
    type: "observation",
    payload: { crop: "ধান", photo: "data:image/jpeg;base64,AAAA", thumbnail: "data:image/jpeg;base64,BBBB", lat: 23.8, longitude: 90.4, location: { v: 1 } },
  },
  token: mintToken(),
});
assert(smuggle.statusCode === 200 && smuggle.body?.saved === true, "smuggling POST accepted (keys stripped, not rejected)");
const rows2 = await db.execute("SELECT payload FROM crop_health_cases WHERE client_record_id = 'sync-abc-2'");
const smugglePayload = JSON.parse(rows2.rows[0].payload);
assert(
  ["photo", "thumbnail", "lat", "longitude", "location"].every((k) => !(k in smugglePayload)),
  "stored payload contains NO photo/thumbnail/GPS keys",
);
assert(smugglePayload.crop === "ধান", "whitelisted metadata still stored from smuggling attempt");

// 5. Client-side sanitizePayload output passes the server validator unchanged
const clientPayload = sanitizePayload({
  crop: "পাট",
  variety: "T-154",
  district: "ফরিদপুর",
  photo: "data:image/jpeg;base64,CCCC",
  lat: 23.1,
});
const validated = validateCaseSyncRecord({ recordId: "sync-abc-3", caseId: "case-88", type: "treatment", payload: clientPayload });
assert(!validated.error, `client-sanitized payload passes server validator (got ${validated.error})`);
assert(validated.record.payload.variety === "T-154", "whitelisted variety survives both layers");

// 6. Missing signature → 403 (VERCEL=1)
const r6 = await call({ body: VALID_BODY });
assert(r6.statusCode === 403, `unsigned POST → 403 (got ${r6.statusCode})`);

// 7. Invalid signature → 403
const r7 = await call({ body: VALID_BODY, token: "123.bogus" });
assert(r7.statusCode === 403, `invalid signature → 403 (got ${r7.statusCode})`);

// 8. Invalid type → 400
const r8 = await call({ body: { ...VALID_BODY, recordId: "sync-abc-9", type: "hacky_type" }, token: mintToken() });
assert(r8.statusCode === 400, `invalid type → 400 (got ${r8.statusCode})`);

// 9. Invalid recordId (bad chars / too long) → 400
const r9a = await call({ body: { ...VALID_BODY, recordId: "bad id with spaces" }, token: mintToken() });
assert(r9a.statusCode === 400, `recordId with spaces → 400 (got ${r9a.statusCode})`);
const r9b = await call({ body: { ...VALID_BODY, recordId: "x".repeat(80) }, token: mintToken() });
assert(r9b.statusCode === 400, `oversized recordId → 400 (got ${r9b.statusCode})`);

// 10. Broken JSON body → 400
const r10 = await call({ body: "not json at all", token: mintToken() });
assert(r10.statusCode === 400, `non-JSON body → 400 (got ${r10.statusCode})`);

// 11. Unknown resource → 404; wrong method on cases → 405
const r11 = await call({ body: VALID_BODY, token: mintToken(), resource: "nope" });
assert(r11.statusCode === 404, `unknown resource → 404 (got ${r11.statusCode})`);
const r12 = await call({ body: VALID_BODY, token: mintToken(), method: "DELETE" });
assert(r12.statusCode === 405, `DELETE on cases → 405 (got ${r12.statusCode})`);

// 12. validateCaseSyncRecord unit checks (string cap + type whitelist)
const v1 = validateCaseSyncRecord({ recordId: "ok-id", caseId: "ok-case", type: "evaluation", payload: { symptomSummary: "y".repeat(400) } });
assert(!v1.error && v1.record.payload.symptomSummary.length === 300, "validator caps strings at 300");
const v2 = validateCaseSyncRecord({ recordId: "ok-id2", caseId: "ok-case", type: "case_created", payload: { status: true } });
assert(!v2.error && v2.record.payload.status === true, "validator keeps booleans");
const v3 = validateCaseSyncRecord({ recordId: "ok-id3", caseId: "ok-case", type: "case_created", payload: { nested: { a: 1 } } });
assert(!v3.error && !("nested" in v3.record.payload), "validator drops nested objects");

console.log(`\ncaseSyncApi.test: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
