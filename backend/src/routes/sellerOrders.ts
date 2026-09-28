import { Router } from "express";
import {
  dashboard,
  orders,
  updateStatus,
} from "../controllers/sellerOrders.js";
import {
  requireAuth,
  requireRole,
} from "../middleware/auth.js";

export const sellerOrdersRouter = Router();

sellerOrdersRouter.use(
  "/seller",
  requireAuth,
  requireRole("SELLER"),
);

sellerOrdersRouter.get(
  "/seller/orders",
  orders,
);

sellerOrdersRouter.patch(
  "/seller/orders/:orderId/status",
  updateStatus,
);

sellerOrdersRouter.get(
  "/seller/dashboard",
  dashboard,
);
