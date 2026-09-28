import { Router } from "express";
import {
  cart,
  cartAdd,
  cartRemove,
  cartUpdate,
  wishlist,
  wishlistAdd,
  wishlistRemove,
} from "../controllers/commerce.js";
import {
  requireAuth,
  requireRole,
} from "../middleware/auth.js";

const router = Router();

router.use(
  "/commerce",
  requireAuth,
  requireRole("CUSTOMER"),
);

router.get("/commerce/cart", cart);
router.post("/commerce/cart/items", cartAdd);
router.patch("/commerce/cart/items/:itemId", cartUpdate);
router.delete("/commerce/cart/items/:itemId", cartRemove);

router.get("/commerce/wishlist", wishlist);
router.post("/commerce/wishlist/items", wishlistAdd);
router.delete(
  "/commerce/wishlist/items/:productId",
  wishlistRemove,
);

export default router;
