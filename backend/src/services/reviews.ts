import { findReviewByUserAndProduct, getProductReviewRows, getProductReviewSummary, hasPurchasedProduct, insertReview, productExists, type ReviewRow } from "../repositories/reviews.js";
import type { ProductReviews, Review } from "../types/reviews.js";
import { CommerceError } from "./commerce.js";

function requireUuid(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new CommerceError(400, `${field} must be a valid UUID.`);
  }
  return value;
}

function requireRating(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 5) {
    throw new CommerceError(400, "Rating must be an integer between 1 and 5.");
  }
  return value;
}

function optionalComment(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new CommerceError(400, "Comment must be text.");
  const comment = value.trim();
  if (comment.length > 2000) throw new CommerceError(400, "Comment must be 2000 characters or fewer.");
  return comment || null;
}

function mapReview(row: ReviewRow): Review {
  return { id: row.id, productId: row.product_id, userId: row.user_id, reviewerName: row.reviewer_name, rating: row.rating, comment: row.comment, createdAt: row.created_at, updatedAt: row.updated_at };
}

export async function getProductReviews(productIdInput: unknown): Promise<ProductReviews> {
  const productId = requireUuid(productIdInput, "Product ID");
  if (!(await productExists(productId))) throw new CommerceError(404, "Product not found.");
  const [rows, summary] = await Promise.all([getProductReviewRows(productId), getProductReviewSummary(productId)]);
  return { reviews: rows.map(mapReview), summary };
}

export async function createProductReview(userId: string, productIdInput: unknown, ratingInput: unknown, commentInput: unknown): Promise<Review> {
  const productId = requireUuid(productIdInput, "Product ID");
  const rating = requireRating(ratingInput);
  const comment = optionalComment(commentInput);
  if (!(await productExists(productId))) throw new CommerceError(404, "Product not found.");
  if (!(await hasPurchasedProduct(userId, productId))) throw new CommerceError(403, "You can only review a product you have ordered.");
  if (await findReviewByUserAndProduct(userId, productId)) throw new CommerceError(409, "You have already reviewed this product.");
  return mapReview(await insertReview(userId, productId, rating, comment));
}
