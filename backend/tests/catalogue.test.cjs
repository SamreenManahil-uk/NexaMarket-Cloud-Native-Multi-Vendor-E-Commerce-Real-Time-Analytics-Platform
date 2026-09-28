const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const { once } = require('node:events');
Object.assign(process.env, { DB_HOST: 'localhost', DB_PORT: '5432', DB_NAME: 'nexamarket', DB_USER: 'nexamarket', DB_PASSWORD: 'test-only' });
const { pool } = require('../src/db/index.ts');
const { app } = require('../src/app.ts');
let server, base;
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); await pool.end(); });
const id = 'de000000-0000-4000-8000-400000000001';
const category = { id: 'de000000-0000-4000-8000-300000000001', name: 'Demo Desk', slug: 'demo-desk', description: 'Fictional fixtures' };
const product = { id, name: 'Demo Notebook', slug: 'demo-notebook', description: 'Fictional fixture', price: '8.50', image_url: null, category: { id: category.id, name: category.name, slug: category.slug }, seller: { id: 'de000000-0000-4000-8000-200000000001', store_name: 'Fictional Demo Store' }, available_quantity: 24 };
async function request(route, status, expected) {
  const response = await fetch(base + route);
  assert.equal(response.status, status);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.deepEqual(await response.json(), expected);
}
test('GET categories returns public category fields', async t => {
  t.mock.method(pool, 'query', async sql => { assert.match(sql, /FROM public.categories ORDER BY/); return { rows: [category] }; });
  await request('/api/categories', 200, { data: [category] });
});
test('GET products queries active catalogue with category, store and optional stock', async t => {
  t.mock.method(pool, 'query', async sql => {
    assert.match(sql, /p.is_active = TRUE/); assert.match(sql, /LEFT JOIN public.inventory/); assert.match(sql, /COALESCE\(i.quantity, 0\)/); assert.match(sql, /ORDER BY p.name, p.id/);
    assert.doesNotMatch(sql, /password_hash|email/);
    return { rows: [{ ...product, total_items: "1" }] };
  });
  await request('/api/products', 200, { data: [product], pagination: { page: 1, limit: 12, totalItems: 1, totalPages: 1 } });
});
test('GET detail passes a validated UUID as a SQL parameter', async t => {
  t.mock.method(pool, 'query', async (sql, values) => {
    assert.match(sql, /p.is_active = TRUE/); assert.match(sql, /p.id = \$1::uuid/); assert.ok(!sql.includes(id)); assert.deepEqual(values, [id]); return { rows: [product] };
  });
  await request(`/api/products/${id}`, 200, { data: product });
});
test('invalid product IDs return 400 without querying PostgreSQL', async t => {
  const query = t.mock.method(pool, 'query', async () => { throw new Error('must not query'); });
  for (const value of ['invalid', '123', id + 'x', "' OR 1=1--", id.replaceAll('-', '')]) {
    await request('/api/products/' + encodeURIComponent(value), 400, { error: 'Bad Request' });
  }
  assert.equal(query.mock.callCount(), 0);
});
test('nonexistent or inactive products return JSON 404', async t => {
  t.mock.method(pool, 'query', async () => ({ rows: [] }));
  await request(`/api/products/${id}`, 404, { error: 'Not Found' });
});
test('empty category and product lists return 200 with empty arrays', async t => {
  t.mock.method(pool, 'query', async () => ({ rows: [] }));
  await request('/api/categories', 200, { data: [] });
  await request('/api/products', 200, { data: [], pagination: { page: 1, limit: 12, totalItems: 0, totalPages: 0 } });
});
test('database errors use existing generic JSON error handler', async t => {
  t.mock.method(console, 'error', () => {});
  t.mock.method(pool, 'query', async () => { throw new Error('private database details'); });
  await request('/api/products', 500, { error: 'Internal Server Error' });
});

for (const [label, query, values, page, limit] of [
  ['defaults', '', [12, 0], 1, 12],
  ['custom page', '?page=2', [12, 12], 2, 12],
  ['custom limit', '?limit=5', [5, 0], 1, 5],
  ['maximum limit', '?limit=100', [100, 0], 1, 100],
  ['category', '?category=demo-desk', [12, 0, 'demo-desk'], 1, 12],
  ['combined', '?page=2&limit=2&category=demo-desk', [2, 2, 'demo-desk'], 2, 2],
]) {
  test(`pagination: ${label}`, async t => {
    t.mock.method(pool, 'query', async (sql, params) => {
      assert.deepEqual(params, values);
      assert.match(sql, /LIMIT \$1 OFFSET \$2/);
      assert.match(sql, /count\(\*\)/);
      assert.equal((sql.match(/p.is_active = TRUE/g) || []).length, 2);
      if (values.length === 3) {
        assert.equal((sql.match(/c.slug = \$3/g) || []).length, 2);
        assert.ok(!sql.includes('demo-desk'));
      }
      return { rows: [{ ...product, total_items: '25' }] };
    });
    await request('/api/products' + query, 200, { data: [product], pagination: { page, limit, totalItems: 25, totalPages: Math.ceil(25 / limit) } });
  });
}
for (const [label, query, total] of [
  ['category without products', '?category=no-products', 0],
  ['page beyond last page', '?page=99', 10],
]) {
  test(label, async t => {
    t.mock.method(pool, 'query', async () => ({ rows: [{ id: null, total_items: String(total) }] }));
    await request('/api/products' + query, 200, { data: [], pagination: { page: total ? 99 : 1, limit: 12, totalItems: total, totalPages: total ? 1 : 0 } });
  });
}
for (const parameter of ['page', 'limit']) {
  test(`reject invalid ${parameter} before database access`, async t => {
    const query = t.mock.method(pool, 'query', async () => { throw new Error('must not query'); });
    for (const value of ['', '0', '-1', '1.5', 'abc', '1e2', '01', ' 2', '9007199254740992']) {
      await request(`/api/products?${parameter}=${encodeURIComponent(value)}`, 400, { error: 'Bad Request' });
    }
    await request(`/api/products?${parameter}=1&${parameter}=2`, 400, { error: 'Bad Request' });
    assert.equal(query.mock.callCount(), 0);
  });
}
test('reject excessive limit, unsafe offset and malformed category', async t => {
  const query = t.mock.method(pool, 'query', async () => { throw new Error('must not query'); });
  for (const parameters of ['limit=101', 'page=9007199254740991&limit=100', 'category=', 'category=Demo', 'category=desk--home', 'category=a&category=b', "category=' OR 1=1--"]) {
    await request('/api/products?' + parameters, 400, { error: 'Bad Request' });
  }
  assert.equal(query.mock.callCount(), 0);
});
