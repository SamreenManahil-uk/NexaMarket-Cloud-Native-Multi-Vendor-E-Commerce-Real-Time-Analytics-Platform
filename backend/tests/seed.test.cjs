const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const { seedCatalogue } = require('../src/db/seed.ts');
const target = { host: 'localhost', port: 5432, database: 'nexamarket', user: 'nexamarket' };
const file = path.resolve('database/seeds/development_catalogue.sql');
function fake({ identity = { database: 'nexamarket', username: 'nexamarket', port: 5432 }, fail = false } = {}) {
  const calls = [];
  return { calls, pool: { async connect() {
    calls.push('CONNECT');
    return { async query(sql) { calls.push(sql); if (sql.startsWith('SELECT current_database')) return { rows: [identity] }; if (fail && sql.includes('INSERT INTO')) throw new Error('seed failure'); return { rows: [] }; }, release() { calls.push('RELEASE'); } };
  } } };
}
test('seed refuses other configurations before opening a connection', async () => {
  for (const change of [{ host: 'other' }, { port: 5433 }, { database: 'other' }, { user: 'other' }]) {
    const f = fake(); await assert.rejects(seedCatalogue(f.pool, { ...target, ...change }, file), /requires/); assert.equal(f.calls.length, 0);
  }
});
test('seed refuses production', async t => {
  const previous = process.env.NODE_ENV;
  t.after(() => { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; });
  process.env.NODE_ENV = 'production';
  const f = fake(); await assert.rejects(seedCatalogue(f.pool, target, file), /production/); assert.equal(f.calls.length, 0);
});
test('seed checks connected identity before writing', async () => {
  const f = fake({ identity: { database: 'other' } }); await assert.rejects(seedCatalogue(f.pool, target, file), /identity/); assert.ok(!f.calls.includes('BEGIN'));
});
test('seed commits atomically and releases connection', async () => {
  const f = fake(); await seedCatalogue(f.pool, target, file); assert.deepEqual(f.calls.slice(-2), ['COMMIT', 'RELEASE']);
});
test('seed failure rolls back and releases connection', async () => {
  const f = fake({ fail: true }); await assert.rejects(seedCatalogue(f.pool, target, file), /seed failure/); assert.deepEqual(f.calls.slice(-2), ['ROLLBACK', 'RELEASE']); assert.ok(!f.calls.includes('COMMIT'));
});
