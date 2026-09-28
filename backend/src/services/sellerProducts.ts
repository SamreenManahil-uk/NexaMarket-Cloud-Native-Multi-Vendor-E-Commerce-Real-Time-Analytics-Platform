import { categoryExists, deactivateSellerProductRow, getSellerProductRow, getSellerProductRows, insertSellerProduct, updateSellerInventoryRow, updateSellerProductRow, type SellerProductRow } from "../repositories/seller.js";
import type { SellerProduct } from "../types/seller.js";
import { CommerceError } from "./commerce.js";

function uuid(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new CommerceError(400, `${field} must be a valid UUID.`);
  return value;
}

function text(value: unknown, field: string, max: number): string {
  if (typeof value !== "string" || !value.trim()) throw new CommerceError(400, `${field} is required.`);
  const result = value.trim();
  if (result.length > max) throw new CommerceError(400, `${field} is too long.`);
  return result;
}

function optionalText(value: unknown, field: string, max: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new CommerceError(400, `${field} must be text.`);
  const result = value.trim();
  if (result.length > max) throw new CommerceError(400, `${field} is too long.`);
  return result || null;
}

function money(value: unknown): string {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > 9999999999.99) throw new CommerceError(400, "Price must be a valid non-negative amount.");
  return amount.toFixed(2);
}

function stock(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) throw new CommerceError(400, "Stock must be a non-negative integer.");
  return value;
}

function slug(value: unknown): string {
  const result = text(value, "Slug", 180).toLowerCase();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(result)) throw new CommerceError(400, "Slug must contain lowercase letters, numbers and hyphens only.");
  return result;
}

function map(row: SellerProductRow): SellerProduct {
  return { id: row.id, sellerId: row.seller_id, categoryId: row.category_id, name: row.name, slug: row.slug, description: row.description, price: row.price, imageUrl: row.image_url, isActive: row.is_active, stock: row.quantity, createdAt: row.created_at, updatedAt: row.updated_at };
}

export async function listSellerProducts(userId: string): Promise<SellerProduct[]> {
  return (await getSellerProductRows(userId)).map(map);
}

export async function getSellerProduct(userId: string, productIdInput: unknown): Promise<SellerProduct> {
  const productId = uuid(productIdInput, "Product ID");
  const row = await getSellerProductRow(userId, productId);
  if (!row) throw new CommerceError(404, "Product not found.");
  return map(row);
}

export async function createSellerProduct(userId: string, body: any): Promise<SellerProduct> {
  const categoryId = uuid(body?.categoryId, "Category ID");
  if (!(await categoryExists(categoryId))) throw new CommerceError(400, "Category does not exist.");
  return map(await insertSellerProduct(userId, categoryId, text(body?.name, "Name", 200), slug(body?.slug), optionalText(body?.description, "Description", 4000), money(body?.price), optionalText(body?.imageUrl, "Image URL", 2000), stock(body?.stock)));
}

export async function updateSellerProduct(userId: string, productIdInput: unknown, body: any): Promise<SellerProduct> {
  const productId = uuid(productIdInput, "Product ID");
  const categoryId = uuid(body?.categoryId, "Category ID");
  if (!(await categoryExists(categoryId))) throw new CommerceError(400, "Category does not exist.");
  if (typeof body?.isActive !== "boolean") throw new CommerceError(400, "isActive must be boolean.");
  const row = await updateSellerProductRow(userId, productId, categoryId, text(body?.name, "Name", 200), slug(body?.slug), optionalText(body?.description, "Description", 4000), money(body?.price), optionalText(body?.imageUrl, "Image URL", 2000), body.isActive);
  if (!row) throw new CommerceError(404, "Product not found.");
  return map(row);
}

export async function updateSellerStock(userId: string, productIdInput: unknown, quantityInput: unknown): Promise<SellerProduct> {
  const productId = uuid(productIdInput, "Product ID");
  const row = await updateSellerInventoryRow(userId, productId, stock(quantityInput));
  if (!row) throw new CommerceError(404, "Product not found.");
  return map(row);
}

export async function deactivateSellerProduct(userId: string, productIdInput: unknown): Promise<void> {
  const productId = uuid(productIdInput, "Product ID");
  if (!(await deactivateSellerProductRow(userId, productId))) throw new CommerceError(404, "Product not found.");
}
