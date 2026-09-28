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

export interface SellerOrderItem {
  id: string;
  productId: string | null;
  productName: string;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
}

export interface SellerOrder {
  id: string;
  customerId: string;
  customerEmail: string;
  status: string;
  totalAmount: string;
  createdAt: string;
  items: SellerOrderItem[];
}

export interface SellerDashboard {
  productCount: number;
  activeProductCount: number;
  inventoryUnits: number;
  orderCount: number;
  unitsSold: number;
  salesAmount: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}
