import { Router } from "express";
import { onboard, profile } from "../controllers/seller.js";
import { createProduct, deactivateProduct, listProducts, product, updateInventory, updateProduct } from "../controllers/sellerProducts.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const sellerRouter = Router();

sellerRouter.post("/seller/onboard", requireAuth, requireRole("CUSTOMER"), onboard);

sellerRouter.use("/seller", requireAuth, requireRole("SELLER"));
sellerRouter.get("/seller/profile", profile);
sellerRouter.get("/seller/products", listProducts);
sellerRouter.post("/seller/products", createProduct);
sellerRouter.get("/seller/products/:productId", product);
sellerRouter.put("/seller/products/:productId", updateProduct);
sellerRouter.patch("/seller/products/:productId/inventory", updateInventory);
sellerRouter.delete("/seller/products/:productId", deactivateProduct);
