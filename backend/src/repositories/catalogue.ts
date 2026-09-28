import { pool } from "../db/index.js";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  image_url: string | null;
  category: Pick<Category, "id" | "name" | "slug">;
  seller: { id: string; store_name: string };
  available_quantity: number;
}

const productSelect = `
  SELECT p.id, p.name, p.slug, p.description, p.price, p.image_url,
    json_build_object('id', c.id, 'name', c.name, 'slug', c.slug) AS category,
    json_build_object('id', s.id, 'store_name', s.store_name) AS seller,
    COALESCE(i.quantity, 0) AS available_quantity
  FROM public.products p
  JOIN public.categories c ON c.id = p.category_id
  JOIN public.sellers s ON s.id = p.seller_id
  LEFT JOIN public.inventory i ON i.product_id = p.id
  WHERE p.is_active = TRUE`;

export async function findCategories(): Promise<Category[]> {
  return (await pool.query<Category>(
    "SELECT id, name, slug, description FROM public.categories ORDER BY name, id",
  )).rows;
}

export interface ProductFilters {
  page: number;
  limit: number;
  offset: number;
  category?: string;
  search?: string;
}

export async function findActiveProducts(filters: ProductFilters): Promise<{ data: Product[]; totalItems: number }> {
  const values: (string | number)[] = [filters.limit, filters.offset];
  const conditions: string[] = [];
  if (filters.category !== undefined) {
    values.push(filters.category);
    conditions.push("c.slug = $" + values.length);
  }
  if (filters.search !== undefined) {
    values.push("%" + filters.search + "%");
    const n = values.length;
    conditions.push("(p.name ILIKE $" + n + " OR COALESCE(p.description, '') ILIKE $" + n + " OR c.name ILIKE $" + n + " OR s.store_name ILIKE $" + n + ")");
  }
  const filterSql = conditions.length ? " AND " + conditions.join(" AND ") : "";
  // LEFT JOIN retains the count even when the requested page is empty.
  const result = await pool.query<Product & { total_items: string }>(`
    WITH totals AS (
      SELECT count(*) AS total_items
      FROM public.products p
      JOIN public.categories c ON c.id = p.category_id
      JOIN public.sellers s ON s.id = p.seller_id
      WHERE p.is_active = TRUE${filterSql}
    ), page AS (
      ${productSelect}${filterSql}
      ORDER BY p.name, p.id
      LIMIT $1 OFFSET $2
    )
    SELECT page.*, totals.total_items
    FROM totals LEFT JOIN page ON TRUE
    ORDER BY page.name, page.id`, values);
  return {
    data: result.rows.filter(row => row.id !== null).map(({ total_items, ...product }) => product),
    totalItems: Number(result.rows[0]?.total_items ?? 0),
  };
}

export async function findActiveProduct(id: string): Promise<Product | undefined> {
  return (await pool.query<Product>(`${productSelect} AND p.id = $1::uuid`, [id])).rows[0];
}
