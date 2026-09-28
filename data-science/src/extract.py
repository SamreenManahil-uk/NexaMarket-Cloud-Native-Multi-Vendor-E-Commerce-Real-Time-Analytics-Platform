from __future__ import annotations

import pandas as pd
import psycopg

from .config import DATABASE_URL


ORDER_QUERY = """
SELECT
    o.id::text AS order_id,
    o.user_id::text AS customer_id,
    o.status,
    o.total_amount::float8 AS order_total,
    o.created_at,
    u.email,
    u.first_name,
    u.last_name
FROM orders o
JOIN users u
  ON u.id = o.user_id
ORDER BY o.created_at;
"""


ITEM_QUERY = """
SELECT
    oi.id::text AS order_item_id,
    oi.order_id::text AS order_id,
    oi.product_id::text AS product_id,
    COALESCE(p.name, oi.product_name) AS product_name,
    oi.unit_price::float8 AS unit_price,
    oi.quantity::int AS quantity,
    oi.line_total::float8 AS line_total,
    o.user_id::text AS customer_id,
    o.status,
    o.created_at
FROM order_items oi
JOIN orders o
  ON o.id = oi.order_id
LEFT JOIN products p
  ON p.id = oi.product_id
ORDER BY o.created_at;
"""


PRODUCT_QUERY = """
SELECT
    p.id::text AS product_id,
    p.name,
    p.price::float8 AS price,
    p.is_active,
    COALESCE(i.quantity, 0)::int AS stock,
    c.name AS category,
    s.store_name AS seller
FROM products p
JOIN categories c
  ON c.id = p.category_id
JOIN sellers s
  ON s.id = p.seller_id
LEFT JOIN inventory i
  ON i.product_id = p.id
ORDER BY p.name;
"""


def _query_dataframe(query: str) -> pd.DataFrame:
    with psycopg.connect(DATABASE_URL) as connection:
        with connection.cursor() as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()
            columns = [
                description.name
                for description in cursor.description
            ]

    return pd.DataFrame(rows, columns=columns)


def load_orders() -> pd.DataFrame:
    return _query_dataframe(ORDER_QUERY)


def load_order_items() -> pd.DataFrame:
    return _query_dataframe(ITEM_QUERY)


def load_products() -> pd.DataFrame:
    return _query_dataframe(PRODUCT_QUERY)
