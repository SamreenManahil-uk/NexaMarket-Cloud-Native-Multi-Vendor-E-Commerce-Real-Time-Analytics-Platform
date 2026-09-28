import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { createProductReview, getProductReviews } from "../services/reviews.js";

export async function productReviews(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getProductReviews(req.params.productId);
  res.status(200).json({ data: result });
}

export async function createReview(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.auth) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const review = await createProductReview(req.auth.sub, req.params.productId, req.body?.rating, req.body?.comment);
  res.status(201).json({ data: review });
}
