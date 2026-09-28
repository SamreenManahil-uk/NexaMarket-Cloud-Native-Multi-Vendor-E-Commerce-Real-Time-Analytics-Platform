import { Router } from "express";
import { pool } from "../db/index.js";

export const storefrontRouter = Router();

storefrontRouter.get("/stores/:sellerId", async (req, res, next) => {
  try {
    const sellerId = req.params.sellerId;
    const sellerResult = await pool.query(
      `SELECT id, store_name, store_description, created_at
       FROM sellers WHERE id = $1`,
      [sellerId]
    );

    if (!sellerResult.rowCount) {
      return res.status(404).json({ message: "Store not found" });
    }

    const productsResult = await pool.query(
      `SELECT p.id, p.name, p.slug, p.description, p.price, p.image_url,
              c.name AS category,
              COALESCE(i.quantity, 0) AS available_quantity
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN inventory i ON i.product_id = p.id
       WHERE p.seller_id = $1 AND p.is_active = TRUE
       ORDER BY p.created_at DESC`,
      [sellerId]
    );

    return res.json({
      seller: sellerResult.rows[0],
      products: productsResult.rows
    });
  } catch (error) {
    next(error);
  }
});
