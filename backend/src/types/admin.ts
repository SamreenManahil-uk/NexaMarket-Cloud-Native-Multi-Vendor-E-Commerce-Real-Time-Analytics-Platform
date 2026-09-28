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
