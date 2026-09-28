import type {
  Category,
  SellerDashboard,
  SellerOrder,
  SellerProduct,
  SellerProfile,
} from "../types/seller";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:3000";

interface DataResponse<T> {
  data: T;
}

function token(): string {
  const value = localStorage.getItem("nexamarket_access_token");

  if (!value) {
    throw new Error("Seller authentication is required.");
  }

  return value;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token()}`,
      ...(options.headers ?? {}),
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof body?.error === "string"
        ? body.error
        : `Request failed (${response.status}).`,
    );
  }

  return body as T;
}

export const sellerApi = {
  async profile(): Promise<SellerProfile> {
    return (
      await request<DataResponse<SellerProfile>>(
        "/api/seller/profile",
      )
    ).data;
  },

  async dashboard(): Promise<SellerDashboard> {
    return (
      await request<DataResponse<SellerDashboard>>(
        "/api/seller/dashboard",
      )
    ).data;
  },

  async products(): Promise<SellerProduct[]> {
    return (
      await request<DataResponse<SellerProduct[]>>(
        "/api/seller/products",
      )
    ).data;
  },

  async orders(): Promise<SellerOrder[]> {
    return (
      await request<DataResponse<SellerOrder[]>>(
        "/api/seller/orders",
      )
    ).data;
  },

  async categories(): Promise<Category[]> {
    const response = await fetch(`${API_BASE}/api/categories`);

    if (!response.ok) {
      throw new Error("Categories could not be loaded.");
    }

    return (
      (await response.json()) as DataResponse<Category[]>
    ).data;
  },

  async createProduct(input: {
    categoryId: string;
    name: string;
    slug: string;
    description: string;
    price: number;
    imageUrl: string;
    stock: number;
  }): Promise<SellerProduct> {
    return (
      await request<DataResponse<SellerProduct>>(
        "/api/seller/products",
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      )
    ).data;
  },

  async updateProduct(
    product: SellerProduct,
    input: {
      categoryId: string;
      name: string;
      slug: string;
      description: string;
      price: number;
      imageUrl: string;
      isActive: boolean;
    },
  ): Promise<SellerProduct> {
    return (
      await request<DataResponse<SellerProduct>>(
        `/api/seller/products/${product.id}`,
        {
          method: "PUT",
          body: JSON.stringify(input),
        },
      )
    ).data;
  },

  async updateStock(
    productId: string,
    quantity: number,
  ): Promise<SellerProduct> {
    return (
      await request<DataResponse<SellerProduct>>(
        `/api/seller/products/${productId}/inventory`,
        {
          method: "PATCH",
          body: JSON.stringify({ quantity }),
        },
      )
    ).data;
  },

  async deactivate(productId: string): Promise<void> {
    await request<void>(
      `/api/seller/products/${productId}`,
      {
        method: "DELETE",
      },
    );
  },

  async updateOrderStatus(
    orderId: string,
    status: string,
  ): Promise<void> {
    await request(
      `/api/seller/orders/${orderId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      },
    );
  },
};
