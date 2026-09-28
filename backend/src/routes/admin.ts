import { moderateProduct } from "../controllers/admin.js";
import { Router } from "express";
import {
  dashboard,
  sellers,
  users,
} from "../controllers/admin.js";
import {
  requireAuth,
  requireRole,
} from "../middleware/auth.js";

export const adminRouter = Router();

adminRouter.use(
  "/admin",
  requireAuth,
  requireRole("ADMIN"),
);

adminRouter.get("/admin/users", users);

adminRouter.get("/admin/sellers", sellers);

adminRouter.get("/admin/dashboard", dashboard);

adminRouter.patch(
  "/admin/products/:productId/moderation",
  moderateProduct,
);
