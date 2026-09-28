import { pool } from "../db/index.js";
import type { AdminUser, AdminSeller, AdminStats } from "../types/admin.js";

export async function getAdminUsers(): Promise<AdminUser[]> {
  const result = await pool.query<AdminUser>(
    `
      SELECT
        id,
        email,
        first_name AS "firstName",
        last_name AS "lastName",
        role,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM public.users
      ORDER BY created_at DESC
    `,
  );

  return result.rows;
}

export async function getAdminSellers(): Promise<AdminSeller[]> {
  const result = await pool.query<AdminSeller>(
    `
      SELECT
        s.id,
        s.user_id AS "userId",
        u.email,
        u.first_name AS "firstName",
        u.last_name AS "lastName",
        s.store_name AS "storeName",
        s.store_description AS "storeDescription",
        s.created_at AS "createdAt",
        s.updated_at AS "updatedAt"
      FROM public.sellers s
      JOIN public.users u
        ON u.id = s.user_id
      ORDER BY s.created_at DESC
    `,
  );

  return result.rows;
}

export async function getAdminStats(): Promise<AdminStats> {
  const result = await pool.query<{
    total_users: number;
    customers: number;
    sellers: number;
    admins: number;
    total_products: number;
    active_products: number;
    total_orders: number;
    pending_orders: number;
    completed_orders: number;
    total_revenue: string;
  }>(
    `
      SELECT
        (SELECT COUNT(*)::int FROM public.users) AS total_users,

        (SELECT COUNT(*)::int
         FROM public.users
         WHERE role = 'CUSTOMER') AS customers,

        (SELECT COUNT(*)::int
         FROM public.users
         WHERE role = 'SELLER') AS sellers,

        (SELECT COUNT(*)::int
         FROM public.users
         WHERE role = 'ADMIN') AS admins,

        (SELECT COUNT(*)::int
         FROM public.products) AS total_products,

        (SELECT COUNT(*)::int
         FROM public.products
         WHERE is_active = TRUE) AS active_products,

        (SELECT COUNT(*)::int
         FROM public.orders) AS total_orders,

        (SELECT COUNT(*)::int
         FROM public.orders
         WHERE status = 'PENDING') AS pending_orders,

        (SELECT COUNT(*)::int
         FROM public.orders
         WHERE status IN ('DELIVERED', 'PAID')) AS completed_orders,

        (SELECT COALESCE(SUM(total_amount), 0)::numeric(14,2)::text
         FROM public.orders
         WHERE status <> 'CANCELLED') AS total_revenue
    `,
  );

  const row = result.rows[0];

  return {
    totalUsers: row?.total_users ?? 0,
    customers: row?.customers ?? 0,
    sellers: row?.sellers ?? 0,
    admins: row?.admins ?? 0,
    totalProducts: row?.total_products ?? 0,
    activeProducts: row?.active_products ?? 0,
    totalOrders: row?.total_orders ?? 0,
    pendingOrders: row?.pending_orders ?? 0,
    completedOrders: row?.completed_orders ?? 0,
    totalRevenue: row?.total_revenue ?? "0.00",
  };
}

export async function setProductModeration(
  productId: string,
  isActive: boolean,
): Promise<boolean> {
  const result = await pool.query(
    `
      UPDATE public.products
      SET
        is_active = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
    [productId, isActive],
  );

  return (result.rowCount ?? 0) > 0;
}
