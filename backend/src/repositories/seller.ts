import { pool } from "../db/index.js";
import { addOutboxEvent } from "../events/outbox.js";

export interface SellerRow {
  id: string;
  user_id: string;
  store_name: string;
  store_description: string | null;
  created_at: string;
  updated_at: string;
}

export async function findSellerByUserId(userId: string): Promise<SellerRow | null> {
  const result = await pool.query<SellerRow>(`SELECT id, user_id, store_name, store_description, created_at, updated_at FROM public.sellers WHERE user_id = $1 LIMIT 1`, [userId]);
  return result.rows[0] ?? null;
}

export async function onboardSeller(userId: string, storeName: string, storeDescription: string | null): Promise<SellerRow> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query<SellerRow>(`SELECT id, user_id, store_name, store_description, created_at, updated_at FROM public.sellers WHERE user_id = $1 LIMIT 1 FOR UPDATE`, [userId]);
    if (existing.rows[0]) {
      await client.query("ROLLBACK");
      return existing.rows[0];
    }
    const result = await client.query<SellerRow>(`INSERT INTO public.sellers (user_id, store_name, store_description) VALUES ($1, $2, $3) RETURNING id, user_id, store_name, store_description, created_at, updated_at`, [userId, storeName, storeDescription]);
    const seller = result.rows[0];
    if (!seller) throw new Error("Seller profile could not be created.");
    await client.query(`UPDATE public.users SET role = 'SELLER', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [userId]);
    await client.query("COMMIT");
    return seller;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export interface SellerProductRow {
  id: string;
  seller_id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  image_url: string | null;
  is_active: boolean;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export async function categoryExists(categoryId: string): Promise<boolean> {
  const result = await pool.query(`SELECT 1 FROM public.categories WHERE id = $1 LIMIT 1`, [categoryId]);
  return (result.rowCount ?? 0) > 0;
}

export async function getSellerProductRows(userId: string): Promise<SellerProductRow[]> {
  const result = await pool.query<SellerProductRow>(`SELECT p.id, p.seller_id, p.category_id, p.name, p.slug, p.description, p.price::text, p.image_url, p.is_active, COALESCE(i.quantity, 0)::int AS quantity, p.created_at, p.updated_at FROM public.products p JOIN public.sellers s ON s.id = p.seller_id LEFT JOIN public.inventory i ON i.product_id = p.id WHERE s.user_id = $1 ORDER BY p.created_at DESC`, [userId]);
  return result.rows;
}

export async function getSellerProductRow(userId: string, productId: string): Promise<SellerProductRow | null> {
  const result = await pool.query<SellerProductRow>(`SELECT p.id, p.seller_id, p.category_id, p.name, p.slug, p.description, p.price::text, p.image_url, p.is_active, COALESCE(i.quantity, 0)::int AS quantity, p.created_at, p.updated_at FROM public.products p JOIN public.sellers s ON s.id = p.seller_id LEFT JOIN public.inventory i ON i.product_id = p.id WHERE s.user_id = $1 AND p.id = $2 LIMIT 1`, [userId, productId]);
  return result.rows[0] ?? null;
}

export async function insertSellerProduct(userId: string, categoryId: string, name: string, slug: string, description: string | null, price: string, imageUrl: string | null, quantity: number): Promise<SellerProductRow> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const sellerResult = await client.query<{ id: string }>(`SELECT id FROM public.sellers WHERE user_id = $1 LIMIT 1 FOR UPDATE`, [userId]);
    const seller = sellerResult.rows[0];
    if (!seller) throw new Error("Seller profile not found.");
    const productResult = await client.query<{ id: string }>(`INSERT INTO public.products (seller_id, category_id, name, slug, description, price, image_url, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE) RETURNING id`, [seller.id, categoryId, name, slug, description, price, imageUrl]);
    const product = productResult.rows[0];
    if (!product) throw new Error("Product could not be created.");
    await client.query(`INSERT INTO public.inventory (product_id, quantity) VALUES ($1, $2)`, [product.id, quantity]);

    await addOutboxEvent(client, {
      aggregateType: "PRODUCT",
      aggregateId: product.id,
      eventType: "PRODUCT_CREATED",
      topic: "nexamarket.products",
      payload: {
        productId: product.id,
        sellerId: seller.id,
        categoryId,
        name,
        slug,
        price,
        imageUrl,
        initialStock: quantity,
        isActive: true,
      },
    });

    await client.query("COMMIT");
    const row = await getSellerProductRow(userId, product.id);
    if (!row) throw new Error("Created product could not be loaded.");
    return row;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateSellerProductRow(userId: string, productId: string, categoryId: string, name: string, slug: string, description: string | null, price: string, imageUrl: string | null, isActive: boolean): Promise<SellerProductRow | null> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<{ id: string; seller_id: string }>(
      `UPDATE public.products p
       SET category_id = $3,
           name = $4,
           slug = $5,
           description = $6,
           price = $7,
           image_url = $8,
           is_active = $9
       FROM public.sellers s
       WHERE p.seller_id = s.id
         AND s.user_id = $1
         AND p.id = $2
       RETURNING p.id, p.seller_id`,
      [userId, productId, categoryId, name, slug, description, price, imageUrl, isActive],
    );

    const product = result.rows[0];

    if (!product) {
      await client.query("ROLLBACK");
      return null;
    }

    await addOutboxEvent(client, {
      aggregateType: "PRODUCT",
      aggregateId: product.id,
      eventType: "PRODUCT_UPDATED",
      topic: "nexamarket.products",
      payload: {
        productId: product.id,
        sellerId: product.seller_id,
        categoryId,
        name,
        slug,
        price,
        imageUrl,
        isActive,
      },
    });

    await client.query("COMMIT");

    return getSellerProductRow(userId, productId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateSellerInventoryRow(userId: string, productId: string, quantity: number): Promise<SellerProductRow | null> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const current = await client.query<{
      product_id: string;
      seller_id: string;
      product_name: string;
      quantity: number;
    }>(
      `SELECT p.id AS product_id,
              p.seller_id,
              p.name AS product_name,
              i.quantity
       FROM public.products p
       JOIN public.sellers s ON s.id = p.seller_id
       JOIN public.inventory i ON i.product_id = p.id
       WHERE s.user_id = $1
         AND p.id = $2
       FOR UPDATE OF i`,
      [userId, productId],
    );

    const product = current.rows[0];

    if (!product) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query(
      `UPDATE public.inventory
       SET quantity = $2
       WHERE product_id = $1`,
      [productId, quantity],
    );

    await addOutboxEvent(client, {
      aggregateType: "PRODUCT",
      aggregateId: productId,
      eventType: "INVENTORY_UPDATED",
      topic: "nexamarket.inventory",
      payload: {
        productId,
        sellerId: product.seller_id,
        productName: product.product_name,
        previousQuantity: product.quantity,
        newQuantity: quantity,
        reason: "SELLER_ADJUSTMENT",
      },
    });

    await client.query("COMMIT");

    return getSellerProductRow(userId, productId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deactivateSellerProductRow(userId: string, productId: string): Promise<boolean> {
  const result = await pool.query(`UPDATE public.products p SET is_active = FALSE FROM public.sellers s WHERE p.seller_id = s.id AND s.user_id = $1 AND p.id = $2`, [userId, productId]);
  return (result.rowCount ?? 0) > 0;
}

export interface SellerOrderRow {
  order_id: string;
  customer_id: string;
  customer_email: string;
  order_status: string;
  order_total: string;
  order_created_at: string;
  item_id: string;
  product_id: string;
  product_name: string;
  unit_price: string;
  quantity: number;
  line_total: string;
}

export async function getSellerOrderRows(
  userId: string,
): Promise<SellerOrderRow[]> {
  const result = await pool.query<SellerOrderRow>(
    `
      SELECT
        o.id AS order_id,
        o.user_id AS customer_id,
        u.email AS customer_email,
        o.status AS order_status,
        o.total_amount::text AS order_total,
        o.created_at AS order_created_at,
        oi.id AS item_id,
        oi.product_id,
        oi.product_name,
        oi.unit_price::text,
        oi.quantity::int,
        oi.line_total::text
      FROM public.orders o
      JOIN public.users u
        ON u.id = o.user_id
      JOIN public.order_items oi
        ON oi.order_id = o.id
      JOIN public.products p
        ON p.id = oi.product_id
      JOIN public.sellers s
        ON s.id = p.seller_id
      WHERE s.user_id = $1
      ORDER BY o.created_at DESC, oi.created_at ASC
    `,
    [userId],
  );

  return result.rows;
}

export async function updateSellerOrderStatus(
  userId: string,
  orderId: string,
  status: string,
): Promise<boolean> {
  const result = await pool.query(
    `
      UPDATE public.orders o
      SET status = $3
      WHERE o.id = $2
        AND EXISTS (
          SELECT 1
          FROM public.order_items oi
          JOIN public.products p
            ON p.id = oi.product_id
          JOIN public.sellers s
            ON s.id = p.seller_id
          WHERE oi.order_id = o.id
            AND s.user_id = $1
        )
    `,
    [userId, orderId, status],
  );

  return (result.rowCount ?? 0) > 0;
}

export async function getSellerDashboardStats(userId: string): Promise<{
  productCount: number;
  activeProductCount: number;
  inventoryUnits: number;
  orderCount: number;
  unitsSold: number;
  salesAmount: string;
}> {
  const result = await pool.query<{
    product_count: number;
    active_product_count: number;
    inventory_units: number;
    order_count: number;
    units_sold: number;
    sales_amount: string;
  }>(
    `
      SELECT
        (
          SELECT COUNT(*)::int
          FROM public.products p
          JOIN public.sellers s ON s.id = p.seller_id
          WHERE s.user_id = $1
        ) AS product_count,

        (
          SELECT COUNT(*)::int
          FROM public.products p
          JOIN public.sellers s ON s.id = p.seller_id
          WHERE s.user_id = $1
            AND p.is_active = TRUE
        ) AS active_product_count,

        (
          SELECT COALESCE(SUM(i.quantity), 0)::int
          FROM public.inventory i
          JOIN public.products p ON p.id = i.product_id
          JOIN public.sellers s ON s.id = p.seller_id
          WHERE s.user_id = $1
        ) AS inventory_units,

        COUNT(DISTINCT o.id)::int AS order_count,
        COALESCE(SUM(oi.quantity), 0)::int AS units_sold,
        COALESCE(SUM(oi.line_total), 0)::numeric(14,2)::text AS sales_amount

      FROM public.order_items oi
      JOIN public.orders o
        ON o.id = oi.order_id
      JOIN public.products p
        ON p.id = oi.product_id
      JOIN public.sellers s
        ON s.id = p.seller_id
      WHERE s.user_id = $1
    `,
    [userId],
  );

  const row = result.rows[0];

  return {
    productCount: row?.product_count ?? 0,
    activeProductCount: row?.active_product_count ?? 0,
    inventoryUnits: row?.inventory_units ?? 0,
    orderCount: row?.order_count ?? 0,
    unitsSold: row?.units_sold ?? 0,
    salesAmount: row?.sales_amount ?? "0.00",
  };
}
