// Explicit opt-in against NexaMarket only; run db:seed first.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { once } = require('node:events');
const path = require('node:path');
const { config } = require('../src/config/env.ts');
const { pool } = require('../src/db/index.ts');
const { assertMigrationTarget } = require('../src/db/migrate.ts');
const { seedCatalogue } = require('../src/db/seed.ts');
const { app } = require('../src/app.ts');
const productId = 'de000000-0000-4000-8000-400000000001';

test('seed rerun preserves data; real HTTP catalogue and active visibility work', async t => {
  let server, client;
  try {
    assertMigrationTarget(config.database);
    const actual = (await pool.query('SELECT current_database() AS database,current_user AS username,inet_server_port() AS port')).rows[0];
    assert.deepEqual(actual, { database: 'nexamarket', username: 'nexamarket', port: 5432 });
    async function snapshot() {
      const data = {};
      for (const table of ['users', 'sellers', 'categories', 'products', 'inventory']) {
        // Compare inside the test; never print password hashes or other private fields.
        data[table] = JSON.stringify((await pool.query(`SELECT * FROM public.${table} ORDER BY id`)).rows);
      }
      return JSON.stringify(data);
    }
    const before = await snapshot();
    await seedCatalogue(pool, config.database, path.resolve('database/seeds/development_catalogue.sql'));
    assert.ok(before === await snapshot(), 'seed rerun must not change existing records');
    const counts = (await pool.query(`SELECT
      (SELECT count(*)::int FROM public.categories WHERE id::text LIKE 'de000000-0000-4000-8000-3%') categories,
      (SELECT count(*)::int FROM public.products WHERE id::text LIKE 'de000000-0000-4000-8000-4%') products,
      (SELECT count(*)::int FROM public.inventory WHERE id::text LIKE 'de000000-0000-4000-8000-5%') inventory`)).rows[0];
    assert.deepEqual(counts, { categories: 4, products: 10, inventory: 10 });
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    async function get(route, status = 200) {
      const response = await fetch(base + route);
      assert.equal(response.status, status);
      return response.json();
    }
    const categories = await get('/api/categories');
    assert.equal(categories.data.filter(c => c.slug.startsWith('demo-')).length, 4);
    const products = await get('/api/products');
    assert.equal(products.data.filter(p => p.slug.startsWith('demo-')).length, 10);
    assert.deepEqual(products.pagination, { page: 1, limit: 12, totalItems: 10, totalPages: 1 });
    const second = await get('/api/products?page=2&limit=3');
    assert.deepEqual(second.data, products.data.slice(3, 6));
    assert.deepEqual(second.pagination, { page: 2, limit: 3, totalItems: 10, totalPages: 4 });
    const desk = await get('/api/products?category=demo-desk');
    assert.equal(desk.data.length, 3);
    assert.ok(desk.data.every(p => p.category.slug === 'demo-desk'));
    assert.deepEqual(desk.pagination, { page: 1, limit: 12, totalItems: 3, totalPages: 1 });
    const filteredPage = await get('/api/products?page=2&limit=2&category=demo-desk');
    assert.deepEqual(filteredPage.data, desk.data.slice(2));
    assert.deepEqual(filteredPage.pagination, { page: 2, limit: 2, totalItems: 3, totalPages: 2 });
    const beyond = await get('/api/products?page=99&limit=2&category=demo-desk');
    assert.deepEqual(beyond, { data: [], pagination: { page: 99, limit: 2, totalItems: 3, totalPages: 2 } });
    assert.deepEqual(await get('/api/products?category=no-such-category'), {
      data: [], pagination: { page: 1, limit: 12, totalItems: 0, totalPages: 0 },
    });
    for (const query of ['page=0', 'limit=-1', 'limit=101', 'category=a&category=b']) {
      assert.deepEqual(await get('/api/products?' + query, 400), { error: 'Bad Request' });
    }
    const detail = await get(`/api/products/${productId}`);
    assert.equal(detail.data.name, 'Demo Notebook');
    assert.equal(detail.data.price, '8.50');
    assert.equal(detail.data.available_quantity, 24);
    assert.equal(detail.data.category.slug, 'demo-desk');
    assert.equal(detail.data.seller.store_name, 'Fictional Demo Store');
    assert.deepEqual(Object.keys(detail.data).sort(), ['id','name','slug','description','price','image_url','category','seller','available_quantity'].sort());
    assert.deepEqual(await get('/api/products/not-a-uuid', 400), { error: 'Bad Request' });
    assert.deepEqual(await get('/api/products/00000000-0000-0000-0000-000000000000', 404), { error: 'Not Found' });
    console.log('HTTP example:', JSON.stringify(detail));
    // Route all API queries through one real transaction for reversible edge cases.
    client = await pool.connect();
    await client.query('BEGIN');
    t.mock.method(pool, 'query', (sql, values) => client.query(sql, values));
    await client.query('UPDATE public.products SET is_active=FALSE WHERE id=$1', [productId]);
    await get(`/api/products/${productId}`, 404);
    const activeDesk = await get('/api/products?category=demo-desk');
    assert.equal(activeDesk.pagination.totalItems, 2);
    assert.ok(!activeDesk.data.some(p => p.id === productId));
    assert.ok(!(await get('/api/products')).data.some(p => p.id === productId));
    await client.query('UPDATE public.products SET is_active=TRUE WHERE id=$1', [productId]);
    await client.query('DELETE FROM public.inventory WHERE product_id=$1', [productId]);
    assert.equal((await get(`/api/products/${productId}`)).data.available_quantity, 0);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (client) { await client.query('ROLLBACK'); client.release(); }
    await pool.end();
  }
});
