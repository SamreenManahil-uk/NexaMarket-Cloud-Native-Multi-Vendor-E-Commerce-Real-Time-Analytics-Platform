const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const { migrate } = require('../src/db/migrate.ts');
const target = { host: 'localhost', port: 5432, database: 'nexamarket', user: 'nexamarket' };
const directory = path.resolve('database/migrations');
function fake(options = {}) {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push([sql, params]);
      if (sql.startsWith('SELECT current_database')) return { rows: [options.identity ?? { database: 'nexamarket', username: 'nexamarket', port: 5432 }] };
      if (sql.startsWith('SELECT name')) return { rows: options.history ?? [] };
      if (sql.includes('CREATE TABLE public.users') && options.fail) throw new Error('SQL failed');
      return { rows: [] };
    },
    release() { calls.push(['RELEASE']); },
  };
  return { calls, pool: { async connect() { calls.push(['CONNECT']); return client; } } };
}
test('unsafe targets are rejected before connection', async () => {
  for (const override of [{ host: '127.0.0.1' }, { port: 5433 }, { database: 'other' }, { user: 'other' }]) {
    const f = fake();
    await assert.rejects(migrate(f.pool, { ...target, ...override }, directory), /Migrations require/);
    assert.equal(f.calls.length, 0);
  }
});
test('connected identity is verified before any DDL', async () => {
  const f = fake({ identity: { database: 'other', username: 'nexamarket', port: 5432 } });
  await assert.rejects(migrate(f.pool, target, directory), /identity/);
  assert.ok(!f.calls.some(([sql]) => sql.startsWith('CREATE')));
});
test('migration commits, tracks checksum, and repeat runs skip SQL', async () => {
  const f = fake();
  assert.deepEqual(await migrate(f.pool, target, directory), ['001_initial_schema.sql']);
  const record = f.calls.find(([sql]) => sql.startsWith('INSERT INTO public.schema_migrations'))[1];
  assert.match(record[1], /^[a-f0-9]{64}$/);
  assert.ok(f.calls.some(([sql]) => sql === 'COMMIT'));
  const repeat = fake({ history: [{ name: record[0], checksum: record[1] }] });
  assert.deepEqual(await migrate(repeat.pool, target, directory), []);
  assert.ok(!repeat.calls.some(([sql]) => sql.includes('CREATE TABLE public.users')));
});
test('SQL failures and changed history roll back and release the client', async () => {
  for (const options of [{ fail: true }, { history: [{ name: '001_initial_schema.sql', checksum: 'changed' }] }]) {
    const f = fake(options);
    await assert.rejects(migrate(f.pool, target, directory));
    assert.ok(!f.calls.some(([sql]) => sql === 'COMMIT'));
    assert.deepEqual(f.calls.slice(-2).map(([sql]) => sql), ['ROLLBACK', 'RELEASE']);
  }
});
