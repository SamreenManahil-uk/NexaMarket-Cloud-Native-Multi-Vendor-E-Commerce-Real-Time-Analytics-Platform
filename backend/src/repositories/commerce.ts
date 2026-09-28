import type { PoolClient } from "pg";
import { pool } from "../db/index.js";

type Queryable = Pick<PoolClient, "query">;

export interface ProductAvailabilityRow {
  id: string;
  name: string;
  price: string;
  is_active: boolean;
  stock: number;
}

export async function findProductAvailability(
  productId: string,
  db: Queryable = pool,
): Promise<ProductAvailabilityRow | null> {
  const result = await db.query<ProductAvailabilityRow>(
    `
      SELECT
        p.id,
        p.name,
        p.price::text,
        p.is_active,
        COALESCE(i.quantity, 0)::int AS stock
      FROM public.products p
      LEFT JOIN public.inventory i ON i.product_id = p.id
      WHERE p.id = $1
      LIMIT 1
    `,
    [productId],
  );

  return result.rows[0] ?? null;
}

export async function ensureCart(
  userId: string,
  db: Queryable = pool,
): Promise<string> {
  const result = await db.query<{ id: string }>(
    `
      INSERT INTO public.carts (user_id)
      VALUES ($1)
      ON CONFLICT (user_id)
      DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `,
    [userId],
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("Could not create or load cart.");
  }

  return row.id;
}

export async function getCartItemQuantity(
  cartId: string,
  productId: string,
  db: Queryable = pool,
): Promise<number> {
  const result = await db.query<{ quantity: number }>(
    `
      SELECT quantity
      FROM public.cart_items
      WHERE cart_id = $1 AND product_id = $2
      LIMIT 1
    `,
    [cartId, productId],
  );

  return result.rows[0]?.quantity ?? 0;
}

export async function upsertCartItem(
  cartId: string,
  productId: string,
  quantity: number,
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `
      INSERT INTO public.cart_items (cart_id, product_id, quantity)
      VALUES ($1, $2, $3)
      ON CONFLICT (cart_id, product_id)
      DO UPDATE SET
        quantity = EXCLUDED.quantity,
        updated_at = CURRENT_TIMESTAMP
    `,
    [cartId, productId, quantity],
  );
}

export async function updateCartItemQuantity(
  cartId: string,
  itemId: string,
  quantity: number,
  db: Queryable = pool,
): Promise<boolean> {
  const result = await db.query(
    `
      UPDATE public.cart_items
      SET quantity = $1
      WHERE id = $2 AND cart_id = $3
    `,
    [quantity, itemId, cartId],
  );

  return (result.rowCount ?? 0) > 0;
}

export async function deleteCartItem(
  cartId: string,
  itemId: string,
  db: Queryable = pool,
): Promise<boolean> {
  const result = await db.query(
    `
      DELETE FROM public.cart_items
      WHERE id = $1 AND cart_id = $2
    `,
    [itemId, cartId],
  );

  return (result.rowCount ?? 0) > 0;
}

export async function getCartRows(userId: string) {
  const result = await pool.query<{
    cart_id: string;
    item_id: string | null;
    quantity: number | null;
    product_id: string | null;
    name: string | null;
    slug: string | null;
    price: string | null;
    image_url: string | null;
    stock: number | null;
    seller_name: string | null;
  }>(
    `
      SELECT
        c.id AS cart_id,
        ci.id AS item_id,
        ci.quantity,
        p.id AS product_id,
        p.name,
        p.slug,
        p.price::text,
        p.image_url,
        COALESCE(i.quantity, 0)::int AS stock,
        s.store_name AS seller_name
      FROM public.carts c
      LEFT JOIN public.cart_items ci ON ci.cart_id = c.id
      LEFT JOIN public.products p ON p.id = ci.product_id
      LEFT JOIN public.inventory i ON i.product_id = p.id
      LEFT JOIN public.sellers s ON s.id = p.seller_id
      WHERE c.user_id = $1
      ORDER BY ci.created_at ASC
    `,
    [userId],
  );

  return result.rows;
}

export async function findCartItemForUser(
  userId: string,
  itemId: string,
) {
  const result = await pool.query<{
    cart_id: string;
    item_id: string;
    product_id: string;
    stock: number;
  }>(
    `
      SELECT
        c.id AS cart_id,
        ci.id AS item_id,
        ci.product_id,
        COALESCE(i.quantity, 0)::int AS stock
      FROM public.carts c
      JOIN public.cart_items ci ON ci.cart_id = c.id
      JOIN public.products p ON p.id = ci.product_id
      LEFT JOIN public.inventory i ON i.product_id = p.id
      WHERE c.user_id = $1 AND ci.id = $2
      LIMIT 1
    `,
    [userId, itemId],
  );

  return result.rows[0] ?? null;
}

export async function ensureWishlist(
  userId: string,
  db: Queryable = pool,
): Promise<string> {
  const result = await db.query<{ id: string }>(
    `
      INSERT INTO public.wishlists (user_id)
      VALUES ($1)
      ON CONFLICT (user_id)
      DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `,
    [userId],
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("Could not create or load wishlist.");
  }

  return row.id;
}

export async function addWishlistItem(
  wishlistId: string,
  productId: string,
): Promise<void> {
  await pool.query(
    `
      INSERT INTO public.wishlist_items (wishlist_id, product_id)
      VALUES ($1, $2)
      ON CONFLICT (wishlist_id, product_id) DO NOTHING
    `,
    [wishlistId, productId],
  );
}

export async function deleteWishlistItem(
  userId: string,
  productId: string,
): Promise<boolean> {
  const result = await pool.query(
    `
      DELETE FROM public.wishlist_items wi
      USING public.wishlists w
      WHERE
        wi.wishlist_id = w.id
        AND w.user_id = $1
        AND wi.product_id = $2
    `,
    [userId, productId],
  );

  return (result.rowCount ?? 0) > 0;
}

export async function getWishlistRows(userId: string) {
  const result = await pool.query<{
    item_id: string;
    created_at: string;
    product_id: string;
    name: string;
    slug: string;
    price: string;
    image_url: string | null;
    stock: number;
    seller_name: string;
  }>(
    `
      SELECT
        wi.id AS item_id,
        wi.created_at::text,
        p.id AS product_id,
        p.name,
        p.slug,
        p.price::text,
        p.image_url,
        COALESCE(i.quantity, 0)::int AS stock,
        s.store_name AS seller_name
      FROM public.wishlists w
      JOIN public.wishlist_items wi ON wi.wishlist_id = w.id
      JOIN public.products p ON p.id = wi.product_id
      LEFT JOIN public.inventory i ON i.product_id = p.id
      JOIN public.sellers s ON s.id = p.seller_id
      WHERE w.user_id = $1
      ORDER BY wi.created_at DESC
    `,
    [userId],
  );

  return result.rows;
}
