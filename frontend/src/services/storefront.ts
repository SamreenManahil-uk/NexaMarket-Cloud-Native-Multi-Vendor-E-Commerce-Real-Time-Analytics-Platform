const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface StorefrontProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  image_url: string | null;
  category: string | null;
  available_quantity: number;
}

export interface StorefrontResponse {
  seller: {
    id: string;
    store_name: string;
    store_description: string | null;
    created_at: string;
  };
  products: StorefrontProduct[];
}

export async function getStorefront(sellerId: string): Promise<StorefrontResponse> {
  const response = await fetch(`${API_BASE}/api/stores/${sellerId}`);
  if (!response.ok) throw new Error("Store could not be loaded.");
  return response.json();
}
