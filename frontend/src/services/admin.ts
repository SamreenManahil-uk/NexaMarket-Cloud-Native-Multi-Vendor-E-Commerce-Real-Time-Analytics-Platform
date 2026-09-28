import type {
  AdminProduct,
  AdminSeller,
  AdminStats,
  AdminUser,
} from "../types/admin";

const API =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:3000";

interface DataResponse<T> {
  data: T;
}

function authHeaders(): HeadersInit {
  const token =
    localStorage.getItem("nexamarket_access_token");

  if (!token) {
    throw new Error("Administrator authentication required.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function adminRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers ?? {}),
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof body?.error === "string"
        ? body.error
        : `Admin request failed (${response.status}).`,
    );
  }

  return body as T;
}

export const adminApi = {
  async stats(): Promise<AdminStats> {
    return (
      await adminRequest<DataResponse<AdminStats>>(
        "/api/admin/dashboard",
      )
    ).data;
  },

  async users(): Promise<AdminUser[]> {
    return (
      await adminRequest<DataResponse<AdminUser[]>>(
        "/api/admin/users",
      )
    ).data;
  },

  async sellers(): Promise<AdminSeller[]> {
    return (
      await adminRequest<DataResponse<AdminSeller[]>>(
        "/api/admin/sellers",
      )
    ).data;
  },

  async products(): Promise<AdminProduct[]> {
    const response = await fetch(
      `${API}/api/products?page=1&limit=100`,
    );

    if (!response.ok) {
      throw new Error("Products could not be loaded.");
    }

    return (
      (await response.json()) as DataResponse<AdminProduct[]>
    ).data;
  },

  async moderateProduct(
    productId: string,
    isActive: boolean,
  ): Promise<void> {
    await adminRequest(
      `/api/admin/products/${productId}/moderation`,
      {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      },
    );
  },
};
