import { pool } from "../db/index.js";

export interface AiCatalogueProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  availableQuantity: number;
  category: string;
  seller: string;
}

export type AiCatalogueSort =
  | "RELEVANCE"
  | "PRICE_ASC"
  | "PRICE_DESC"
  | "STOCK_DESC";

export interface AiCatalogueFilters {
  search?: string;
  searchTerms?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  outOfStockOnly?: boolean;
  limit?: number;
  sort?: AiCatalogueSort;
}

function searchableCondition(
  index: number,
): string {
  return `(
    p.name ILIKE $${index}
    OR COALESCE(p.description, '') ILIKE $${index}
    OR c.name ILIKE $${index}
    OR s.store_name ILIKE $${index}
  )`;
}

export async function findProductsForAssistant(
  filters: AiCatalogueFilters,
): Promise<AiCatalogueProduct[]> {
  const conditions = [
    "p.is_active = TRUE",
  ];

  const values: Array<string | number> = [];

  const terms =
    filters.searchTerms?.length
      ? filters.searchTerms
      : filters.search?.trim()
        ? [filters.search.trim()]
        : [];

  if (terms.length > 0) {
    const termConditions: string[] = [];

    for (const term of terms.slice(0, 4)) {
      values.push(`%${term}%`);
      termConditions.push(
        searchableCondition(values.length),
      );
    }

    conditions.push(
      `(${termConditions.join(" OR ")})`,
    );
  }

  if (
    typeof filters.minPrice === "number" &&
    Number.isFinite(filters.minPrice)
  ) {
    values.push(filters.minPrice);
    conditions.push(
      `p.price >= $${values.length}`,
    );
  }

  if (
    typeof filters.maxPrice === "number" &&
    Number.isFinite(filters.maxPrice)
  ) {
    values.push(filters.maxPrice);
    conditions.push(
      `p.price <= $${values.length}`,
    );
  }

  if (filters.outOfStockOnly === true) {
    conditions.push(
      "COALESCE(i.quantity, 0) <= 0",
    );
  } else if (filters.inStockOnly !== false) {
    conditions.push(
      "COALESCE(i.quantity, 0) > 0",
    );
  }

  const limit = Math.min(
    Math.max(filters.limit ?? 6, 1),
    12,
  );

  const orderBy =
    filters.sort === "PRICE_ASC"
      ? "p.price ASC, COALESCE(i.quantity, 0) DESC, p.name ASC"
      : filters.sort === "PRICE_DESC"
        ? "p.price DESC, COALESCE(i.quantity, 0) DESC, p.name ASC"
        : filters.sort === "STOCK_DESC"
          ? "COALESCE(i.quantity, 0) DESC, p.price ASC, p.name ASC"
          : terms.length > 0
            ? `
              CASE
                WHEN LOWER(p.name) = LOWER($1::text) THEN 0
                WHEN p.name ILIKE $1 THEN 1
                WHEN c.name ILIKE $1 THEN 2
                ELSE 3
              END,
              COALESCE(i.quantity, 0) DESC,
              p.price ASC
            `
            : `
              COALESCE(i.quantity, 0) DESC,
              p.price ASC,
              p.name ASC
            `;

  values.push(limit);

  const result = await pool.query(
    `
      SELECT
        p.id,
        p.name,
        p.slug,
        p.description,
        p.price::text AS price,
        p.image_url,
        COALESCE(i.quantity, 0)::int
          AS available_quantity,
        c.name AS category_name,
        s.store_name
      FROM public.products p
      JOIN public.categories c
        ON c.id = p.category_id
      JOIN public.sellers s
        ON s.id = p.seller_id
      LEFT JOIN public.inventory i
        ON i.product_id = p.id
      WHERE ${conditions.join(" AND ")}
      ORDER BY ${orderBy}
      LIMIT $${values.length}
    `,
    values,
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: row.price,
    imageUrl: row.image_url,
    availableQuantity:
      row.available_quantity,
    category: row.category_name,
    seller: row.store_name,
  }));
}

export async function findCatalogueFallback(
  filters: Omit<
    AiCatalogueFilters,
    "search" | "searchTerms"
  >,
): Promise<AiCatalogueProduct[]> {
  return findProductsForAssistant({
    ...filters,
    search: undefined,
    searchTerms: undefined,
  });
}
