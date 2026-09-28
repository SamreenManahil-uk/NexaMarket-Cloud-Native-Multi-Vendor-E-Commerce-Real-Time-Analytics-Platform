// Explicit opt-in: npm run test:db. All fixture changes are rolled back.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { randomUUID } = require('node:crypto');
const { config } = require('../src/config/env.ts');
const { pool, closeDatabase } = require('../src/db/index.ts');
const { assertMigrationTarget } = require('../src/db/migrate.ts');

test('marketplace constraints, snapshots, delete behavior, and timestamps', async () => {
  let client;
  try {
    assertMigrationTarget(config.database);
    client = await pool.connect();
    const identity = (await client.query('SELECT current_database() AS db, current_user AS username, inet_server_port() AS port')).rows[0];
    assert.deepEqual(identity, { db: 'nexamarket', username: 'nexamarket', port: 5432 });
    await client.query('BEGIN');
    async function insert(sql, values = []) { return (await client.query(sql + ' RETURNING *', values)).rows[0]; }
    async function rejects(sql, values, code) {
      await client.query('SAVEPOINT constraint_test');
      await assert.rejects(client.query(sql, values), (error) => error.code === code);
      await client.query('ROLLBACK TO SAVEPOINT constraint_test');
      await client.query('RELEASE SAVEPOINT constraint_test');
    }
    const key = randomUUID();
    const user = await insert("INSERT INTO public.users(email,password_hash,first_name,last_name,role) VALUES ($1,'test-only-not-a-login','Schema','Test','SELLER')", [`${key}@example.invalid`]);
    await rejects("INSERT INTO public.users(email,password_hash,first_name,last_name) VALUES ($1,'x','x','x')", [user.email], '23505');
    await rejects("UPDATE public.users SET role='INVALID' WHERE id=$1", [user.id], '23514');
    const seller = await insert("INSERT INTO public.sellers(user_id,store_name) VALUES ($1,'Test store')", [user.id]);
    await rejects("INSERT INTO public.sellers(user_id,store_name) VALUES ($1,'Invalid')", [randomUUID()], '23503');
    const category = await insert('INSERT INTO public.categories(name,slug) VALUES ($1,$1)', [key]);
    const product = await insert("INSERT INTO public.products(seller_id,category_id,name,slug,price) VALUES ($1,$2,'Original',$3,12.34)", [seller.id, category.id, key]);
    const inventory = await insert('INSERT INTO public.inventory(product_id,quantity) VALUES ($1,3)', [product.id]);
    await rejects('UPDATE public.inventory SET quantity=-1 WHERE id=$1', [inventory.id], '23514');
    await rejects('INSERT INTO public.inventory(product_id) VALUES ($1)', [product.id], '23505');
    await rejects('UPDATE public.products SET price=-1 WHERE id=$1', [product.id], '23514');
    await rejects("UPDATE public.products SET price='NaN' WHERE id=$1", [product.id], '23514');
    const cart = await insert('INSERT INTO public.carts(user_id) VALUES ($1)', [user.id]);
    await insert('INSERT INTO public.cart_items(cart_id,product_id,quantity) VALUES ($1,$2,1)', [cart.id, product.id]);
    await rejects('INSERT INTO public.cart_items(cart_id,product_id,quantity) VALUES ($1,$2,1)', [cart.id, product.id], '23505');
    await rejects('UPDATE public.cart_items SET quantity=0 WHERE cart_id=$1', [cart.id], '23514');
    const wishlist = await insert('INSERT INTO public.wishlists(user_id) VALUES ($1)', [user.id]);
    await insert('INSERT INTO public.wishlist_items(wishlist_id,product_id) VALUES ($1,$2)', [wishlist.id, product.id]);
    await rejects('INSERT INTO public.wishlist_items(wishlist_id,product_id) VALUES ($1,$2)', [wishlist.id, product.id], '23505');
    await insert('INSERT INTO public.reviews(user_id,product_id,rating) VALUES ($1,$2,5)', [user.id, product.id]);
    await rejects('INSERT INTO public.reviews(user_id,product_id,rating) VALUES ($1,$2,4)', [user.id, product.id], '23505');
    for (const rating of [0, 6]) await rejects('UPDATE public.reviews SET rating=$1 WHERE product_id=$2', [rating, product.id], '23514');
    const order = await insert('INSERT INTO public.orders(user_id,total_amount) VALUES ($1,24.68)', [user.id]);
    await rejects("UPDATE public.orders SET status='INVALID' WHERE id=$1", [order.id], '23514');
    const item = await insert('INSERT INTO public.order_items(order_id,product_id,product_name,unit_price,quantity) SELECT $1,id,name,price,2 FROM public.products WHERE id=$2', [order.id, product.id]);
    assert.equal(item.line_total, '24.68');
    await rejects('UPDATE public.order_items SET quantity=0 WHERE id=$1', [item.id], '23514');
    await rejects('DELETE FROM public.orders WHERE id=$1', [order.id], '23503');
    await rejects('DELETE FROM public.categories WHERE id=$1', [category.id], '23503');
    await rejects('DELETE FROM public.users WHERE id=$1', [user.id], '23503');
    const updated = await insert("UPDATE public.products SET name='Changed',price=99 WHERE id=$1", [product.id]);
    assert.ok(updated.updated_at > product.updated_at);
    const snapshot = (await client.query('SELECT product_name,unit_price,line_total FROM public.order_items WHERE id=$1', [item.id])).rows[0];
    assert.deepEqual(snapshot, { product_name: 'Original', unit_price: '12.34', line_total: '24.68' });
    await client.query('DELETE FROM public.products WHERE id=$1', [product.id]);
    const historical = (await client.query('SELECT * FROM public.order_items WHERE id=$1', [item.id])).rows[0];
    assert.equal(historical.product_id, null);
    assert.equal(historical.product_name, 'Original');
    assert.equal(historical.unit_price, '12.34');
    for (const table of ['inventory', 'cart_items', 'reviews', 'wishlist_items']) {
      assert.equal((await client.query(`SELECT count(*)::int AS count FROM public.${table} WHERE product_id=$1`, [product.id])).rows[0].count, 0);
    }
  } finally {
    if (client) { await client.query('ROLLBACK'); client.release(); }
    await closeDatabase();
  }
});
