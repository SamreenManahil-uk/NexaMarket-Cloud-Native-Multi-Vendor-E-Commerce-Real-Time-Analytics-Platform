import { Router } from "express";
import { createReview, productReviews } from "../controllers/reviews.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const reviewsRouter = Router();

reviewsRouter.get("/products/:productId/reviews", productReviews);
reviewsRouter.post("/products/:productId/reviews", requireAuth, requireRole("CUSTOMER"), createReview);
