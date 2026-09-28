import {
  addWishlistItem,
  deleteCartItem,
  deleteWishlistItem,
  ensureCart,
  ensureWishlist,
  findCartItemForUser,
  findProductAvailability,
  getCartItemQuantity,
  getCartRows,
  getWishlistRows,
  updateCartItemQuantity,
  upsertCartItem,
} from "../repositories/commerce.js";
import type {
  Cart,
  WishlistItem,
} from "../types/commerce.js";

export class CommerceError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function requireUuid(value: unknown, field: string): string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new CommerceError(400, `${field} must be a valid UUID.`);
  }

  return value;
}

function requireQuantity(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 100
  ) {
    throw new CommerceError(
      400,
      "Quantity must be an integer between 1 and 100.",
    );
  }

  return value;
}

async function requireAvailableProduct(productId: string) {
  const product = await findProductAvailability(productId);

  if (!product || !product.is_active) {
    throw new CommerceError(404, "Product not found.");
  }

  return product;
}

export async function getCart(userId: string): Promise<Cart> {
  const cartId = await ensureCart(userId);
  const rows = await getCartRows(userId);

  const items = rows
    .filter(
      (
        row,
      ): row is typeof row & {
        item_id: string;
        quantity: number;
        product_id: string;
        name: string;
        slug: string;
        price: string;
        stock: number;
        seller_name: string;
      } =>
        Boolean(
          row.item_id &&
            row.product_id &&
            row.name &&
            row.slug &&
            row.price !== null &&
            row.quantity !== null &&
            row.stock !== null &&
            row.seller_name,
        ),
    )
    .map((row) => ({
      id: row.item_id,
      quantity: row.quantity,
      product: {
        id: row.product_id,
        name: row.name,
        slug: row.slug,
        price: row.price,
        imageUrl: row.image_url,
        stock: row.stock,
        sellerName: row.seller_name,
      },
      lineTotal: (
        Number.parseFloat(row.price) * row.quantity
      ).toFixed(2),
    }));

  return {
    id: rows[0]?.cart_id ?? cartId,
    items,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    subtotal: items
      .reduce(
        (total, item) =>
          total + Number.parseFloat(item.product.price) * item.quantity,
        0,
      )
      .toFixed(2),
  };
}

export async function addToCart(
  userId: string,
  input: {
    productId?: unknown;
    quantity?: unknown;
  },
): Promise<Cart> {
  const productId = requireUuid(input.productId, "productId");
  const quantity = requireQuantity(input.quantity ?? 1);

  const product = await requireAvailableProduct(productId);

  if (product.stock < 1) {
    throw new CommerceError(409, "Product is out of stock.");
  }

  const cartId = await ensureCart(userId);
  const existingQuantity = await getCartItemQuantity(cartId, productId);
  const nextQuantity = existingQuantity + quantity;

  if (nextQuantity > product.stock) {
    throw new CommerceError(
      409,
      `Only ${product.stock} item(s) are currently available.`,
    );
  }

  await upsertCartItem(cartId, productId, nextQuantity);

  return getCart(userId);
}

export async function changeCartQuantity(
  userId: string,
  itemIdInput: unknown,
  quantityInput: unknown,
): Promise<Cart> {
  const itemId = requireUuid(itemIdInput, "itemId");
  const quantity = requireQuantity(quantityInput);

  const item = await findCartItemForUser(userId, itemId);

  if (!item) {
    throw new CommerceError(404, "Cart item not found.");
  }

  if (quantity > item.stock) {
    throw new CommerceError(
      409,
      `Only ${item.stock} item(s) are currently available.`,
    );
  }

  const updated = await updateCartItemQuantity(
    item.cart_id,
    itemId,
    quantity,
  );

  if (!updated) {
    throw new CommerceError(404, "Cart item not found.");
  }

  return getCart(userId);
}

export async function removeFromCart(
  userId: string,
  itemIdInput: unknown,
): Promise<Cart> {
  const itemId = requireUuid(itemIdInput, "itemId");
  const item = await findCartItemForUser(userId, itemId);

  if (!item) {
    throw new CommerceError(404, "Cart item not found.");
  }

  await deleteCartItem(item.cart_id, itemId);

  return getCart(userId);
}

export async function getWishlist(
  userId: string,
): Promise<WishlistItem[]> {
  await ensureWishlist(userId);

  const rows = await getWishlistRows(userId);

  return rows.map((row) => ({
    id: row.item_id,
    createdAt: row.created_at,
    product: {
      id: row.product_id,
      name: row.name,
      slug: row.slug,
      price: row.price,
      imageUrl: row.image_url,
      stock: row.stock,
      sellerName: row.seller_name,
    },
  }));
}

export async function addToWishlist(
  userId: string,
  productIdInput: unknown,
): Promise<WishlistItem[]> {
  const productId = requireUuid(productIdInput, "productId");

  await requireAvailableProduct(productId);

  const wishlistId = await ensureWishlist(userId);

  await addWishlistItem(wishlistId, productId);

  return getWishlist(userId);
}

export async function removeFromWishlist(
  userId: string,
  productIdInput: unknown,
): Promise<WishlistItem[]> {
  const productId = requireUuid(productIdInput, "productId");

  await ensureWishlist(userId);
  await deleteWishlistItem(userId, productId);

  return getWishlist(userId);
}
