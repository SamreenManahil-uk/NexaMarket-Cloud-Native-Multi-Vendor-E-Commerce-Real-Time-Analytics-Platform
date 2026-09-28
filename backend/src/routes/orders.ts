import { Router } from "express";
import {
  checkoutOrder,
  order,
  orders,
} from "../controllers/orders.js";
import {
  requireAuth,
  requireRole,
} from "../middleware/auth.js";

const router = Router();

router.use(
  "/orders",
  requireAuth,
  requireRole("CUSTOMER"),
);

router.post("/orders/checkout", checkoutOrder);
router.get("/orders", orders);
router.get("/orders/:orderId", order);

export default router;
