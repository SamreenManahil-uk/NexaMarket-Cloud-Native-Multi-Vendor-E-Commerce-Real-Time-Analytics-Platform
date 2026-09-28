import type { CheckoutResponse, Order } from "../types/orders";

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
    const message = body && typeof body.error === "string"
      ? body.error
      : "Unable to complete order request.";
    throw new Error(message);
  }

  return body as T;
}

export const ordersApi = {
  checkout(token: string) {
    return request<CheckoutResponse>("/api/orders/checkout", token, {
      method: "POST",
    });
  },

  list(token: string) {
    return request<{ data: Order[] }>("/api/orders", token);
  },

  get(token: string, orderId: string) {
    return request<{ data: Order }>(`/api/orders/${encodeURIComponent(orderId)}`, token);
  },
};
