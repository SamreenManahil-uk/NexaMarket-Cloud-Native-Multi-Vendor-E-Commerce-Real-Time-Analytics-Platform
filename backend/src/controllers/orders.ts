import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import {
  checkout,
  getOrder,
  getOrders,
} from "../services/orders.js";

function userId(req: AuthenticatedRequest): string {
  if (!req.auth?.sub) {
    throw new Error("Authenticated user is missing.");
  }

  return req.auth.sub;
}

export async function checkoutOrder(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const order = await checkout(userId(req));

    res.status(201).json({
      data: order,
      payment: {
        mode: "SIMULATED",
        processed: false,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function orders(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.json({
      data: await getOrders(userId(req)),
    });
  } catch (error) {
    next(error);
  }
}

export async function order(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.json({
      data: await getOrder(
        userId(req),
        String(req.params.orderId),
      ),
    });
  } catch (error) {
    next(error);
  }
}
