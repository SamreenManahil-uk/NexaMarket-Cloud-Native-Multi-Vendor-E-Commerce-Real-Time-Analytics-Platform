export interface AdminStats {
  totalUsers: number;
  customers: number;
  sellers: number;
  admins: number;
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: string;
}

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSeller {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  storeName: string;
  storeDescription: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProduct {
  id: string;
  name: string;
  price: string;
  image_url: string | null;
  available_quantity: number;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  seller: {
    id: string;
    store_name: string;
  };
}
