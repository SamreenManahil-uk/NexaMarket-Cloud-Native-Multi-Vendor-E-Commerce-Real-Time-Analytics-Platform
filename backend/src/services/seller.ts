import { findSellerByUserId, onboardSeller, type SellerRow } from "../repositories/seller.js";
import type { SellerProfile } from "../types/seller.js";
import { CommerceError } from "./commerce.js";

function mapSeller(row: SellerRow): SellerProfile {
  return { id: row.id, userId: row.user_id, storeName: row.store_name, storeDescription: row.store_description, createdAt: row.created_at, updatedAt: row.updated_at };
}

function requireStoreName(value: unknown): string {
  if (typeof value !== "string") throw new CommerceError(400, "Store name is required.");
  const name = value.trim();
  if (name.length < 2 || name.length > 120) throw new CommerceError(400, "Store name must be between 2 and 120 characters.");
  return name;
}

function optionalDescription(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new CommerceError(400, "Store description must be text.");
  const description = value.trim();
  if (description.length > 1000) throw new CommerceError(400, "Store description must be 1000 characters or fewer.");
  return description || null;
}

export async function getSellerProfile(userId: string): Promise<SellerProfile> {
  const seller = await findSellerByUserId(userId);
  if (!seller) throw new CommerceError(404, "Seller profile not found.");
  return mapSeller(seller);
}

export async function createSellerProfile(userId: string, storeNameInput: unknown, descriptionInput: unknown): Promise<SellerProfile> {
  const storeName = requireStoreName(storeNameInput);
  const description = optionalDescription(descriptionInput);
  const existing = await findSellerByUserId(userId);
  if (existing) throw new CommerceError(409, "Seller profile already exists.");
  return mapSeller(await onboardSeller(userId, storeName, description));
}
