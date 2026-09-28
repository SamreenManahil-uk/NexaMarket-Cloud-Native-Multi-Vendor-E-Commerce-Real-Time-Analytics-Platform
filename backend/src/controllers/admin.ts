import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { setProductModeration } from "../repositories/admin.js";
import {
  getAdminSellers,
  getAdminStats,
  getAdminUsers,
} from "../repositories/admin.js";

function userId(req: AuthenticatedRequest): string {
  if (!req.auth) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }

  return req.auth.sub;
}

export async function users(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  userId(req);

  res.status(200).json({
    data: await getAdminUsers(),
  });
}

export async function sellers(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  userId(req);

  res.status(200).json({
    data: await getAdminSellers(),
  });
}

export async function dashboard(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  userId(req);

  res.status(200).json({
    data: await getAdminStats(),
  });
}

export async function moderateProduct(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  userId(req);

  const productId = req.params.productId;
  const { isActive } = req.body ?? {};

  if (
    typeof productId !== "string" ||
    typeof isActive !== "boolean"
  ) {
    res.status(400).json({ error: "Bad Request" });
    return;
  }

  const updated = await setProductModeration(
    productId,
    isActive,
  );

  if (!updated) {
    res.status(404).json({ error: "Product not found." });
    return;
  }

  res.status(200).json({
    data: {
      productId,
      isActive,
    },
  });
}
