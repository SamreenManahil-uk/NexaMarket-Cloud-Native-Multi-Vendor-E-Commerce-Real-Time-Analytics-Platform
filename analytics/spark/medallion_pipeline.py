from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

import psycopg
from pyspark.sql import SparkSession
from pyspark.sql import functions as F

ROOT = Path(__file__).resolve().parents[1]
MEDALLION = ROOT / "medallion"
BRONZE = MEDALLION / "bronze"
SILVER = MEDALLION / "silver"
GOLD = MEDALLION / "gold"

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://nexamarket:nexamarket_dev@localhost:5432/nexamarket",
)

def extract_rows(query: str) -> list[dict]:
    with psycopg.connect(DATABASE_URL) as connection:
        with connection.cursor() as cursor:
            cursor.execute(query)
            columns = [item.name for item in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]

def serialise(value):
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)

def write_jsonl(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, default=serialise) + "\n")

def main() -> None:
    print("1/5 Extracting NexaMarket transactional data...")

    orders = extract_rows("""
        SELECT id::text AS order_id,
               user_id::text AS customer_id,
               status,
               total_amount::float8 AS order_total,
               created_at
        FROM orders
        ORDER BY created_at
    """)

    items = extract_rows("""
        SELECT oi.id::text AS order_item_id,
               oi.order_id::text AS order_id,
               oi.product_id::text AS product_id,
               p.name AS product_name,
               oi.quantity::int AS quantity,
               oi.unit_price::float8 AS unit_price,
               oi.line_total::float8 AS line_total,
               o.status,
               o.created_at
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        LEFT JOIN products p ON p.id = oi.product_id
        ORDER BY o.created_at
    """)

    write_jsonl(BRONZE / "orders.jsonl", orders)
    write_jsonl(BRONZE / "order_items.jsonl", items)

    print(f"   Bronze orders: {len(orders)}")
    print(f"   Bronze items:  {len(items)}")

    if not orders or not items:
        raise RuntimeError("Transactional data is required for Spark analytics.")

    print("2/5 Starting local Spark...")

    spark = (
        SparkSession.builder
        .appName("NexaMarketAnalytics")
        .master("local[*]")
        .config("spark.sql.shuffle.partitions", "4")
        .getOrCreate()
    )

    spark.sparkContext.setLogLevel("WARN")

    print("3/5 Creating Silver layer...")

    orders_df = spark.read.json(str(BRONZE / "orders.jsonl"))
    items_df = spark.read.json(str(BRONZE / "order_items.jsonl"))

    valid_orders = (
        orders_df
        .filter(~F.col("status").isin("CANCELLED", "REFUNDED"))
        .withColumn("order_total", F.col("order_total").cast("double"))
        .withColumn("created_at", F.to_timestamp("created_at"))
        .dropDuplicates(["order_id"])
    )

    valid_items = (
        items_df
        .filter(~F.col("status").isin("CANCELLED", "REFUNDED"))
        .withColumn("quantity", F.col("quantity").cast("integer"))
        .withColumn("unit_price", F.col("unit_price").cast("double"))
        .withColumn("line_total", F.col("line_total").cast("double"))
        .withColumn("created_at", F.to_timestamp("created_at"))
        .dropDuplicates(["order_item_id"])
    )

    silver_orders = SILVER / "orders"
    silver_items = SILVER / "order_items"

    valid_orders.write.mode("overwrite").parquet(str(silver_orders))
    valid_items.write.mode("overwrite").parquet(str(silver_items))

    print("4/5 Creating Gold business datasets...")

    daily_sales = (
        valid_items
        .withColumn("order_date", F.to_date("created_at"))
        .groupBy("order_date")
        .agg(
            F.countDistinct("order_id").alias("orders"),
            F.sum("quantity").alias("units"),
            F.round(F.sum("line_total"), 2).alias("order_value"),
        )
        .orderBy("order_date")
    )

    product_performance = (
        valid_items
        .groupBy("product_id", "product_name")
        .agg(
            F.sum("quantity").alias("units_sold"),
            F.round(F.sum("line_total"), 2).alias("order_value"),
            F.countDistinct("order_id").alias("orders"),
        )
        .orderBy(F.desc("units_sold"), F.desc("order_value"))
    )

    customer_value = (
        valid_orders
        .groupBy("customer_id")
        .agg(
            F.countDistinct("order_id").alias("order_frequency"),
            F.round(F.sum("order_total"), 2).alias("order_value"),
            F.max("created_at").alias("last_order_at"),
        )
        .orderBy(F.desc("order_value"))
    )

    daily_sales.write.mode("overwrite").parquet(str(GOLD / "daily_sales"))
    product_performance.write.mode("overwrite").parquet(str(GOLD / "product_performance"))
    customer_value.write.mode("overwrite").parquet(str(GOLD / "customer_value"))

    daily_sales.coalesce(1).write.mode("overwrite").option("header", True).csv(str(GOLD / "daily_sales_csv"))
    product_performance.coalesce(1).write.mode("overwrite").option("header", True).csv(str(GOLD / "product_performance_csv"))
    customer_value.coalesce(1).write.mode("overwrite").option("header", True).csv(str(GOLD / "customer_value_csv"))

    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "architecture": "Bronze/Silver/Gold medallion",
        "engine": "Apache Spark / PySpark",
        "bronze": {
            "orders": len(orders),
            "order_items": len(items),
        },
        "silver": {
            "valid_orders": valid_orders.count(),
            "valid_order_items": valid_items.count(),
        },
        "gold": {
            "daily_sales_rows": daily_sales.count(),
            "product_performance_rows": product_performance.count(),
            "customer_value_rows": customer_value.count(),
        },
        "note": "Order value represents simulated checkout orders, not settled payment revenue.",
    }

    with (GOLD / "pipeline_summary.json").open("w", encoding="utf-8") as handle:
        json.dump(summary, handle, indent=2)

    print("5/5 Spark Gold outputs complete.")
    print(json.dumps(summary, indent=2))

    print("")
    print("===== GOLD: DAILY SALES =====")
    daily_sales.show(truncate=False)

    print("===== GOLD: PRODUCT PERFORMANCE =====")
    product_performance.show(truncate=False)

    print("===== GOLD: CUSTOMER VALUE =====")
    customer_value.show(truncate=False)

    spark.stop()

if __name__ == "__main__":
    main()
