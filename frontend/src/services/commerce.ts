import type { CartResponse, WishlistResponse } from "../types/commerce";

const base = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

async function request<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body && typeof body.error === "string" ? body.error : "Unable to complete this request.";
    throw new Error(message);
  }

  return body as T;
}

export const commerceApi = {
  cart(token: string) {
    return request<CartResponse>("/api/commerce/cart", token);
  },

  addToCart(token: string, productId: string, quantity = 1) {
    return request("/api/commerce/cart/items", token, {
      method: "POST",
      body: JSON.stringify({ productId, quantity }),
    });
  },

  updateCartItem(token: string, itemId: string, quantity: number) {
    return request(`/api/commerce/cart/items/${encodeURIComponent(itemId)}`, token, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    });
  },

  removeCartItem(token: string, itemId: string) {
    return request(`/api/commerce/cart/items/${encodeURIComponent(itemId)}`, token, {
      method: "DELETE",
    });
  },

  wishlist(token: string) {
    return request<WishlistResponse>("/api/commerce/wishlist", token);
  },

  addToWishlist(token: string, productId: string) {
    return request("/api/commerce/wishlist/items", token, {
      method: "POST",
      body: JSON.stringify({ productId }),
    });
  },

  removeWishlistItem(token: string, productId: string) {
    return request(`/api/commerce/wishlist/items/${encodeURIComponent(productId)}`, token, {
      method: "DELETE",
    });
  },
};
