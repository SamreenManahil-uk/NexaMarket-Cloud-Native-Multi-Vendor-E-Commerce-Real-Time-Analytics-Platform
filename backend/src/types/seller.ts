export interface SellerProfile {
  id: string;
  userId: string;
  storeName: string;
  storeDescription: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SellerProduct {
  id: string;
  sellerId: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  isActive: boolean;
  stock: number;
  createdAt: string;
  updatedAt: string;
}
