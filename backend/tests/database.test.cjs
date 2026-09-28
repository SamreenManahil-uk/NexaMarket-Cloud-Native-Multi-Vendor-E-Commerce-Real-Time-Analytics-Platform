const assert = require("node:assert/strict");
const { test } = require("node:test");
const { spawnSync } = require("node:child_process");

const databaseEnv = {
  DB_HOST: "localhost",
  DB_PORT: "5432",
  DB_NAME: "nexamarket",
  DB_USER: "nexamarket",
  DB_PASSWORD: "test-only-password",
};

function readConfig(overrides = {}) {
  return spawnSync(process.execPath, ["--require", "tsx/cjs", "-e",
    'require("./src/config/env.ts")'], {
    cwd: process.cwd(),
    env: { ...process.env, ...databaseEnv, PORT: "3000", ...overrides },
    encoding: "utf8",
  });
}

test("environment accepts valid configuration", () => {
  assert.equal(readConfig().status, 0);
});

test("environment requires every database setting without exposing secrets", () => {
  for (const name of Object.keys(databaseEnv)) {
    const result = readConfig({ [name]: " " });
    assert.notEqual(result.status, 0);
    assert.ok(result.stderr.includes(`${name} is required.`));
    assert.ok(!result.stderr.includes(databaseEnv.DB_PASSWORD));
  }
});

test("environment rejects invalid application and database ports", () => {
  for (const name of ["PORT", "DB_PORT"]) {
    for (const value of ["0", "65536", "5432.5", "abc"]) {
      const result = readConfig({ [name]: value });
      assert.notEqual(result.status, 0);
      assert.ok(result.stderr.includes(`${name} must be an integer`));
    }
  }
});

test("database verification reuses the pool, propagates failures, and supports closing", async (t) => {
  Object.assign(process.env, databaseEnv);
  const { pool, verifyDatabaseConnection, closeDatabase } = require("../src/db/index.ts");
  const query = t.mock.method(pool, "query", async () => ({ rows: [{ "?column?": 1 }] }));
  await verifyDatabaseConnection();
  await verifyDatabaseConnection();
  assert.equal(query.mock.callCount(), 2);
  assert.deepEqual(query.mock.calls[0].arguments, ["SELECT 1"]);

  const failure = new Error("database unavailable");
  query.mock.mockImplementation(async () => { throw failure; });
  await assert.rejects(verifyDatabaseConnection(), (error) => error === failure);
  await closeDatabase();
  assert.equal(pool.ended, true);
});
