import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import {
  getSellerDashboard,
  listSellerOrders,
  updateOrderStatus,
} from "../services/sellerOrders.js";

function userId(req: AuthenticatedRequest): string {
  if (!req.auth) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }
  return req.auth.sub;
}

export async function orders(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  res.status(200).json({
    data: await listSellerOrders(userId(req)),
  });
}

export async function updateStatus(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  res.status(200).json({
    data: await updateOrderStatus(
      userId(req),
      req.params.orderId,
      req.body?.status,
    ),
  });
}

export async function dashboard(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  res.status(200).json({
    data: await getSellerDashboard(userId(req)),
  });
}
