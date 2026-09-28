import { CommerceError } from "./commerce.js";
import {
  getSellerDashboardStats,
  getSellerOrderRows,
  updateSellerOrderStatus,
  type SellerOrderRow,
} from "../repositories/seller.js";

const ALLOWED_STATUSES = [
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

function mapOrderRows(rows: SellerOrderRow[]) {
  const orders = new Map<string, {
    id: string;
    customerId: string;
    customerEmail: string;
    status: string;
    totalAmount: string;
    createdAt: string;
    items: Array<{
      id: string;
      productId: string | null;
      productName: string;
      unitPrice: string;
      quantity: number;
      lineTotal: string;
    }>;
  }>();

  for (const row of rows) {
    let order = orders.get(row.order_id);

    if (!order) {
      order = {
        id: row.order_id,
        customerId: row.customer_id,
        customerEmail: row.customer_email,
        status: row.order_status,
        totalAmount: row.order_total,
        createdAt: row.order_created_at,
        items: [],
      };

      orders.set(row.order_id, order);
    }

    order.items.push({
      id: row.item_id,
      productId: row.product_id,
      productName: row.product_name,
      unitPrice: row.unit_price,
      quantity: row.quantity,
      lineTotal: row.line_total,
    });
  }

  return Array.from(orders.values());
}

export async function listSellerOrders(userId: string) {
  return mapOrderRows(await getSellerOrderRows(userId));
}

export async function updateOrderStatus(
  userId: string,
  orderIdInput: unknown,
  statusInput: unknown,
) {
  if (
    typeof orderIdInput !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderIdInput)
  ) {
    throw new CommerceError(400, "Order ID must be a valid UUID.");
  }

  if (
    typeof statusInput !== "string" ||
    !ALLOWED_STATUSES.includes(
      statusInput as (typeof ALLOWED_STATUSES)[number],
    )
  ) {
    throw new CommerceError(
      400,
      `Status must be one of: ${ALLOWED_STATUSES.join(", ")}.`,
    );
  }

  const updated = await updateSellerOrderStatus(
    userId,
    orderIdInput,
    statusInput,
  );

  if (!updated) {
    throw new CommerceError(404, "Order not found.");
  }

  return {
    orderId: orderIdInput,
    status: statusInput,
  };
}

export async function getSellerDashboard(userId: string) {
  return getSellerDashboardStats(userId);
}
