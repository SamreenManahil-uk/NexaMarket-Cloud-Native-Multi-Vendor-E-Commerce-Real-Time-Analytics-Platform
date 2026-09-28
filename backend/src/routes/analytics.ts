import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { pool } from "../db/index.js";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";

export const analyticsRouter = Router();

const outputDir = path.resolve(process.cwd(), "../data-science/output");

async function readJson(name: string) {
  return JSON.parse(await fs.readFile(path.join(outputDir, name), "utf8"));
}

async function readCsv(name: string) {
  const text = await fs.readFile(path.join(outputDir, name), "utf8");
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0]!.split(",");
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ""]));
  });
}

analyticsRouter.get("/analytics/dashboard", requireAuth, requireRole("ADMIN", "SELLER"), async (req, res, next) => {
  try {
    const [summary, segments, forecast, demand] = await Promise.all([
      readJson("analytics_summary.json"),
      readCsv("customer_segments.csv"),
      readCsv("demand_forecast.csv"),
      readCsv("daily_demand.csv"),
    ]);

    // ADMIN receives complete marketplace analytics.
    const authenticatedUser = (req as AuthenticatedRequest).auth;

    if (authenticatedUser?.role === "ADMIN") {
      return res.json({
        data: {
          summary,
          customerSegments: segments,
          forecast,
          demandHistory: demand,
        },
      });
    }

    // SELLER receives analytics for their own store only.
    if (!authenticatedUser?.sub) {
      return res.status(401).json({ error: "Authentication required." });
    }

    const sellerResult = await pool.query(
      `SELECT id, store_name, store_description
       FROM sellers
       WHERE user_id = $1
       LIMIT 1`,
      [authenticatedUser.sub],
    );

    if (!sellerResult.rows[0]) {
      return res.status(404).json({ error: "Seller profile not found." });
    }

    const sellerId = sellerResult.rows[0].id;

    const sellerResultData = await pool.query(
      `SELECT
         p.id,
         p.name,
         p.price,
         p.is_active,
         COALESCE(i.quantity, 0)::int AS stock
       FROM products p
       LEFT JOIN inventory i ON i.product_id = p.id
       WHERE p.seller_id = $1
       ORDER BY p.created_at DESC`,
      [sellerId],
    );

    const salesResult = await pool.query(
      `SELECT
         COUNT(DISTINCT o.id)::int AS orders,
         COALESCE(SUM(oi.quantity), 0)::int AS units_sold,
         COALESCE(SUM(oi.line_total), 0)::float8 AS sales_value,
         COALESCE(AVG(oi.line_total), 0)::float8 AS average_item_value
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       JOIN products p ON p.id = oi.product_id
       WHERE p.seller_id = $1
         AND o.status <> 'CANCELLED'`,
      [sellerId],
    );

    const topProductsResult = await pool.query(
      `SELECT
         p.id AS product_id,
         p.name AS product_name,
         COALESCE(SUM(oi.quantity), 0)::int AS units_sold,
         COALESCE(SUM(oi.line_total), 0)::float8 AS sales_value
       FROM products p
       LEFT JOIN order_items oi ON oi.product_id = p.id
       LEFT JOIN orders o
         ON o.id = oi.order_id
        AND o.status <> 'CANCELLED'
       WHERE p.seller_id = $1
       GROUP BY p.id, p.name
       ORDER BY sales_value DESC, units_sold DESC
       LIMIT 10`,
      [sellerId],
    );

    const recentOrdersResult = await pool.query(
      `SELECT
         o.id AS order_id,
         o.status,
         o.created_at,
         oi.product_name,
         oi.quantity,
         oi.line_total::float8 AS line_total
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN products p ON p.id = oi.product_id
       WHERE p.seller_id = $1
       ORDER BY o.created_at DESC
       LIMIT 10`,
      [sellerId],
    );

    const lowStockResult = await pool.query(
      `SELECT
         p.id AS product_id,
         p.name,
         COALESCE(i.quantity, 0)::int AS stock
       FROM products p
       LEFT JOIN inventory i ON i.product_id = p.id
       WHERE p.seller_id = $1
         AND COALESCE(i.quantity, 0) <= 5
       ORDER BY stock ASC, p.name`,
      [sellerId],
    );

    const sellerSummary = {
      generated_at: summary.generated_at,
      source: "NexaMarket PostgreSQL seller transactional data",
      seller: sellerResult.rows[0],
      business_insights: {
        orders: salesResult.rows[0],
        products: {
          total: sellerResultData.rows.length,
          active: sellerResultData.rows.filter((p: { is_active: boolean }) => p.is_active).length,
        },
        top_products: topProductsResult.rows,
        low_stock_products: lowStockResult.rows,
      },
      limitations: summary.limitations,
    };

    return res.json({
      data: {
        summary: sellerSummary,
        customerSegments: [],
        forecast: [],
        demandHistory: [],
        sellerProducts: sellerResultData.rows,
        recentOrders: recentOrdersResult.rows,
      },
    });
  } catch (error) {
    next(error);
  }
});
