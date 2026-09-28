import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { createSellerProduct, deactivateSellerProduct, getSellerProduct, listSellerProducts, updateSellerProduct, updateSellerStock } from "../services/sellerProducts.js";

function userId(req: AuthenticatedRequest): string {
  if (!req.auth) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  return req.auth.sub;
}

export async function listProducts(req: AuthenticatedRequest, res: Response): Promise<void> {
  res.status(200).json({ data: await listSellerProducts(userId(req)) });
}

export async function product(req: AuthenticatedRequest, res: Response): Promise<void> {
  res.status(200).json({ data: await getSellerProduct(userId(req), req.params.productId) });
}

export async function createProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
  res.status(201).json({ data: await createSellerProduct(userId(req), req.body) });
}

export async function updateProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
  res.status(200).json({ data: await updateSellerProduct(userId(req), req.params.productId, req.body) });
}

export async function updateInventory(req: AuthenticatedRequest, res: Response): Promise<void> {
  res.status(200).json({ data: await updateSellerStock(userId(req), req.params.productId, req.body?.quantity) });
}

export async function deactivateProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
  await deactivateSellerProduct(userId(req), req.params.productId);
  res.status(204).send();
}
