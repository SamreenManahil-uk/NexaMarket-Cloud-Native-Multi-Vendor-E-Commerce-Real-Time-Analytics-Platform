import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import {
  addToCart,
  addToWishlist,
  changeCartQuantity,
  getCart,
  getWishlist,
  removeFromCart,
  removeFromWishlist,
} from "../services/commerce.js";

function userId(req: AuthenticatedRequest): string {
  if (!req.auth?.sub) {
    throw new Error("Authenticated user is missing.");
  }

  return req.auth.sub;
}

export async function cart(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.json({ data: await getCart(userId(req)) });
  } catch (error) {
    next(error);
  }
}

export async function cartAdd(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await addToCart(userId(req), req.body ?? {});
    res.status(201).json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function cartUpdate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.json({
      data: await changeCartQuantity(
        userId(req),
        req.params.itemId,
        req.body?.quantity,
      ),
    });
  } catch (error) {
    next(error);
  }
}

export async function cartRemove(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.json({
      data: await removeFromCart(userId(req), req.params.itemId),
    });
  } catch (error) {
    next(error);
  }
}

export async function wishlist(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.json({ data: await getWishlist(userId(req)) });
  } catch (error) {
    next(error);
  }
}

export async function wishlistAdd(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await addToWishlist(
      userId(req),
      req.body?.productId,
    );

    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function wishlistRemove(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.json({
      data: await removeFromWishlist(
        userId(req),
        req.params.productId,
      ),
    });
  } catch (error) {
    next(error);
  }
}
