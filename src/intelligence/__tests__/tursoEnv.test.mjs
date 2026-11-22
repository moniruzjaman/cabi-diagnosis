// Turso environment resolution regression tests.
// Verifies the Vercel integration alias and documented local/CI variable.
const originalDatabaseUrl = process.env.TURSO_DATABASE_URL;
const originalDbUrl = process.env.TURSO_DB_URL;
const originalToken = process.env.TURSO_AUTH_TOKEN;

let pass = 0;
let fail = 0;
function assert(condition, message) {
  if (condition) pass++;
  else {
    fail++;
    console.error("FAIL:", message);
  }
}

try {
  delete process.env.TURSO_DATABASE_URL;
  process.env.TURSO_DB_URL = "libsql://vercel-alias.example.turso.io";
  process.env.TURSO_AUTH_TOKEN = "test-token";

  const { getTursoUrl, hasTurso } = await import("../../../api/_lib/turso.js?turso-env-test");

  assert(
    getTursoUrl() === "libsql://vercel-alias.example.turso.io",
    "resolves Vercel TURSO_DB_URL alias",
  );
  assert(hasTurso() === true, "reports configured when alias and token are present");

  process.env.TURSO_DATABASE_URL = "libsql://canonical.example.turso.io";
  assert(
    getTursoUrl() === "libsql://canonical.example.turso.io",
    "documented TURSO_DATABASE_URL takes precedence",
  );

  delete process.env.TURSO_AUTH_TOKEN;
  assert(hasTurso() === false, "requires an auth token even when a URL exists");
} finally {
  if (originalDatabaseUrl === undefined) delete process.env.TURSO_DATABASE_URL;
  else process.env.TURSO_DATABASE_URL = originalDatabaseUrl;
  if (originalDbUrl === undefined) delete process.env.TURSO_DB_URL;
  else process.env.TURSO_DB_URL = originalDbUrl;
  if (originalToken === undefined) delete process.env.TURSO_AUTH_TOKEN;
  else process.env.TURSO_AUTH_TOKEN = originalToken;
}

console.log(`\ntursoEnv.test: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
