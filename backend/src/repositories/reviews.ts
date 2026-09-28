import { pool } from "../db/index.js";

export interface ReviewRow {
  id: string;
  user_id: string;
  product_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  reviewer_name: string;
}

export async function productExists(productId: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM public.products WHERE id = $1 AND is_active = TRUE LIMIT 1`,
    [productId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function hasPurchasedProduct(userId: string, productId: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM public.orders o JOIN public.order_items oi ON oi.order_id = o.id WHERE o.user_id = $1 AND oi.product_id = $2 LIMIT 1`,
    [userId, productId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function findReviewByUserAndProduct(userId: string, productId: string): Promise<ReviewRow | null> {
  const result = await pool.query<ReviewRow>(
    `SELECT r.id, r.user_id, r.product_id, r.rating, r.comment, r.created_at, r.updated_at, CONCAT(u.first_name, ' ', u.last_name) AS reviewer_name FROM public.reviews r JOIN public.users u ON u.id = r.user_id WHERE r.user_id = $1 AND r.product_id = $2 LIMIT 1`,
    [userId, productId],
  );
  return result.rows[0] ?? null;
}

export async function getProductReviewRows(productId: string): Promise<ReviewRow[]> {
  const result = await pool.query<ReviewRow>(
    `SELECT r.id, r.user_id, r.product_id, r.rating, r.comment, r.created_at, r.updated_at, CONCAT(u.first_name, ' ', u.last_name) AS reviewer_name FROM public.reviews r JOIN public.users u ON u.id = r.user_id WHERE r.product_id = $1 ORDER BY r.created_at DESC`,
    [productId],
  );
  return result.rows;
}

export async function insertReview(userId: string, productId: string, rating: number, comment: string | null): Promise<ReviewRow> {
  const result = await pool.query<ReviewRow>(
    `WITH inserted AS (INSERT INTO public.reviews (user_id, product_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *) SELECT i.id, i.user_id, i.product_id, i.rating, i.comment, i.created_at, i.updated_at, CONCAT(u.first_name, ' ', u.last_name) AS reviewer_name FROM inserted i JOIN public.users u ON u.id = i.user_id`,
    [userId, productId, rating, comment],
  );
  const row = result.rows[0];
  if (!row) throw new Error("Review could not be created.");
  return row;
}

export async function getProductReviewSummary(productId: string): Promise<{ averageRating: number | null; reviewCount: number }> {
  const result = await pool.query<{ average_rating: string | null; review_count: number }>(
    `SELECT ROUND(AVG(rating)::numeric, 2)::text AS average_rating, COUNT(*)::int AS review_count FROM public.reviews WHERE product_id = $1`,
    [productId],
  );
  const average = result.rows[0]?.average_rating;
  return {
    averageRating: average === null || average === undefined ? null : Number.parseFloat(average),
    reviewCount: result.rows[0]?.review_count ?? 0,
  };
}
