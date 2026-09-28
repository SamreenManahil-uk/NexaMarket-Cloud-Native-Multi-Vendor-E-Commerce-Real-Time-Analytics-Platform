import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { createSellerProfile, getSellerProfile } from "../services/seller.js";

export async function onboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.auth) { res.status(401).json({ error: "Unauthorized" }); return; }
  const seller = await createSellerProfile(req.auth.sub, req.body?.storeName, req.body?.storeDescription);
  res.status(201).json({ data: seller, message: "Seller onboarding completed. Please log in again to receive a SELLER access token." });
}

export async function profile(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.auth) { res.status(401).json({ error: "Unauthorized" }); return; }
  const seller = await getSellerProfile(req.auth.sub);
  res.status(200).json({ data: seller });
}
