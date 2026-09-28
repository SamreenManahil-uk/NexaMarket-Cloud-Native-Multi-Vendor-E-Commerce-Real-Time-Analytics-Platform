from __future__ import annotations

import json
from pathlib import Path

from pyspark.sql import DataFrame, SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import (
    ArrayType,
    IntegerType,
    StringType,
    StructField,
    StructType,
)


BASE = Path(__file__).resolve().parents[1]
BRONZE = BASE / "data" / "bronze"
SILVER = BASE / "data" / "silver"
GOLD = BASE / "data" / "gold"
REPORTS = BASE / "reports"


def spark_session() -> SparkSession:
    return (
        SparkSession.builder
        .appName("NexaMarketDataPipeline")
        .master("local[*]")
        .config("spark.sql.session.timeZone", "UTC")
        .config("spark.sql.shuffle.partitions", "4")
        .getOrCreate()
    )


def bronze_schema() -> StructType:
    event_schema = StructType([
        StructField("eventId", StringType(), True),
        StructField("eventType", StringType(), True),
        StructField("aggregateType", StringType(), True),
        StructField("aggregateId", StringType(), True),
        StructField("occurredAt", StringType(), True),
        StructField("data", StringType(), True),
    ])

    return StructType([
        StructField("topic", StringType(), False),
        StructField("partition", IntegerType(), False),
        StructField("offset", IntegerType(), False),
        StructField("kafka_key", StringType(), True),
        StructField("consumed_at", StringType(), False),
        StructField("event", event_schema, False),
    ])


def read_bronze(spark: SparkSession) -> DataFrame:
    paths = [str(p) for p in BRONZE.rglob("*.jsonl")]

    if not paths:
        raise RuntimeError("No Bronze JSONL files found.")

    # Spark infers nested event.data structures independently across
    # different event types, so we read raw text first and normalise
    # with Python JSON parsing into a stable schema.
    rows = []

    for path in paths:
        with open(path, encoding="utf-8") as handle:
            for line in handle:
                if not line.strip():
                    continue

                record = json.loads(line)
                event = record["event"]

                rows.append({
                    "topic": record["topic"],
                    "partition": int(record["partition"]),
                    "offset": int(record["offset"]),
                    "kafka_key": record.get("kafka_key"),
                    "consumed_at": record["consumed_at"],
                    "event": {
                        "eventId": event.get("eventId"),
                        "eventType": event.get("eventType"),
                        "aggregateType": event.get("aggregateType"),
                        "aggregateId": event.get("aggregateId"),
                        "occurredAt": event.get("occurredAt"),
                        "data": json.dumps(
                            event.get("data", {}),
                            separators=(",", ":"),
                        ),
                    },
                })

    return spark.createDataFrame(rows, schema=bronze_schema())


def build_silver(bronze: DataFrame) -> DataFrame:
    return (
        bronze
        .select(
            "topic",
            "partition",
            "offset",
            "kafka_key",
            F.to_timestamp("consumed_at").alias("consumed_at"),
            F.col("event.eventId").alias("event_id"),
            F.col("event.eventType").alias("event_type"),
            F.col("event.aggregateType").alias("aggregate_type"),
            F.col("event.aggregateId").alias("aggregate_id"),
            F.to_timestamp("event.occurredAt").alias("occurred_at"),
            F.col("event.data").alias("event_data"),
        )
        .withColumn(
            "event_time",
            F.coalesce("occurred_at", "consumed_at"),
        )
        .withColumn("event_date", F.to_date("event_time"))
        .dropDuplicates(["event_id"])
    )


def build_orders(silver: DataFrame) -> DataFrame:
    schema = StructType([
        StructField("orderId", StringType(), True),
        StructField("userId", StringType(), True),
        StructField("status", StringType(), True),
        StructField("totalAmount", StringType(), True),
        StructField(
            "items",
            ArrayType(
                StructType([
                    StructField("productId", StringType(), True),
                    StructField("productName", StringType(), True),
                    StructField("quantity", IntegerType(), True),
                    StructField("unitPrice", StringType(), True),
                    StructField("lineTotal", StringType(), True),
                ])
            ),
            True,
        ),
    ])

    return (
        silver
        .filter(F.col("event_type") == "ORDER_CREATED")
        .withColumn("d", F.from_json("event_data", schema))
        .select(
            F.col("event_id"),
            F.col("event_time"),
            F.col("d.orderId").alias("order_id"),
            F.col("d.userId").alias("user_id"),
            F.col("d.status").alias("status"),
            F.col("d.totalAmount")
                .cast("decimal(18,2)")
                .alias("total_amount"),
            F.size("d.items").alias("item_lines"),
        )
    )


def build_order_items(silver: DataFrame) -> DataFrame:
    schema = StructType([
        StructField("orderId", StringType(), True),
        StructField(
            "items",
            ArrayType(
                StructType([
                    StructField("productId", StringType(), True),
                    StructField("productName", StringType(), True),
                    StructField("quantity", IntegerType(), True),
                    StructField("unitPrice", StringType(), True),
                    StructField("lineTotal", StringType(), True),
                ])
            ),
            True,
        ),
    ])

    return (
        silver
        .filter(F.col("event_type") == "ORDER_CREATED")
        .withColumn("d", F.from_json("event_data", schema))
        .withColumn("item", F.explode("d.items"))
        .select(
            F.col("d.orderId").alias("order_id"),
            F.col("event_time"),
            F.col("item.productId").alias("product_id"),
            F.col("item.productName").alias("product_name"),
            F.col("item.quantity").alias("quantity"),
            F.col("item.unitPrice")
                .cast("decimal(18,2)")
                .alias("unit_price"),
            F.col("item.lineTotal")
                .cast("decimal(18,2)")
                .alias("line_total"),
        )
    )


def build_inventory(silver: DataFrame) -> DataFrame:
    schema = StructType([
        StructField("productId", StringType(), True),
        StructField("productName", StringType(), True),
        StructField("previousQuantity", IntegerType(), True),
        StructField("newQuantity", IntegerType(), True),
        StructField("quantityPurchased", IntegerType(), True),
        StructField("reason", StringType(), True),
        StructField("orderId", StringType(), True),
        StructField("sellerId", StringType(), True),
    ])

    return (
        silver
        .filter(F.col("event_type") == "INVENTORY_UPDATED")
        .withColumn("d", F.from_json("event_data", schema))
        .select(
            "event_id",
            "event_time",
            F.col("d.productId").alias("product_id"),
            F.col("d.productName").alias("product_name"),
            F.col("d.previousQuantity").alias("previous_quantity"),
            F.col("d.newQuantity").alias("new_quantity"),
            F.col("d.quantityPurchased").alias("quantity_purchased"),
            F.col("d.reason").alias("reason"),
            F.col("d.orderId").alias("order_id"),
            F.col("d.sellerId").alias("seller_id"),
        )
    )


def build_products(silver: DataFrame) -> DataFrame:
    schema = StructType([
        StructField("productId", StringType(), True),
        StructField("sellerId", StringType(), True),
        StructField("categoryId", StringType(), True),
        StructField("name", StringType(), True),
        StructField("slug", StringType(), True),
        StructField("price", StringType(), True),
        StructField("imageUrl", StringType(), True),
        StructField("isActive", StringType(), True),
        StructField("initialStock", IntegerType(), True),
    ])

    return (
        silver
        .filter(
            F.col("event_type").isin(
                "PRODUCT_CREATED",
                "PRODUCT_UPDATED",
            )
        )
        .withColumn("d", F.from_json("event_data", schema))
        .select(
            "event_id",
            "event_type",
            "event_time",
            F.col("d.productId").alias("product_id"),
            F.col("d.sellerId").alias("seller_id"),
            F.col("d.categoryId").alias("category_id"),
            F.col("d.name").alias("product_name"),
            F.col("d.slug").alias("slug"),
            F.col("d.price")
                .cast("decimal(18,2)")
                .alias("price"),
            F.col("d.initialStock").alias("initial_stock"),
        )
    )


def build_clickstream(silver: DataFrame) -> DataFrame:
    schema = StructType([
        StructField("sessionId", StringType(), True),
        StructField("productId", StringType(), True),
        StructField("searchQuery", StringType(), True),
        StructField("path", StringType(), True),
    ])

    return (
        silver
        .filter(F.col("topic") == "nexamarket.clickstream")
        .withColumn("d", F.from_json("event_data", schema))
        .select(
            "event_id",
            "event_type",
            "event_time",
            F.col("d.sessionId").alias("session_id"),
            F.col("d.productId").alias("product_id"),
            F.col("d.searchQuery").alias("search_query"),
            F.col("d.path").alias("path"),
        )
    )


def write_parquet(df: DataFrame, path: Path) -> None:
    (
        df.write
        .mode("overwrite")
        .parquet(str(path))
    )


def quality_report(
    silver: DataFrame,
    orders: DataFrame,
    inventory: DataFrame,
    clickstream: DataFrame,
) -> dict:
    duplicate_events = (
        silver
        .groupBy("event_id")
        .count()
        .filter(F.col("count") > 1)
        .count()
    )

    null_event_ids = silver.filter(
        F.col("event_id").isNull()
    ).count()

    negative_orders = orders.filter(
        F.col("total_amount") < 0
    ).count()

    negative_inventory = inventory.filter(
        F.col("new_quantity") < 0
    ).count()

    unknown_clickstream = clickstream.filter(
        ~F.col("event_type").isin(
            "PAGE_VIEW",
            "PRODUCT_VIEW",
            "SEARCH",
            "ADD_TO_CART",
            "ADD_TO_WISHLIST",
        )
    ).count()

    report = {
        "silver_events": silver.count(),
        "duplicate_event_ids": duplicate_events,
        "null_event_ids": null_event_ids,
        "orders": orders.count(),
        "negative_order_totals": negative_orders,
        "inventory_events": inventory.count(),
        "negative_inventory_quantities": negative_inventory,
        "clickstream_events": clickstream.count(),
        "unknown_clickstream_types": unknown_clickstream,
    }

    report["passed"] = all([
        duplicate_events == 0,
        null_event_ids == 0,
        negative_orders == 0,
        negative_inventory == 0,
        unknown_clickstream == 0,
    ])

    return report


def main() -> None:
    REPORTS.mkdir(parents=True, exist_ok=True)

    spark = spark_session()
    spark.sparkContext.setLogLevel("WARN")

    try:
        bronze = read_bronze(spark)
        silver = build_silver(bronze)

        orders = build_orders(silver)
        order_items = build_order_items(silver)
        inventory = build_inventory(silver)
        products = build_products(silver)
        clickstream = build_clickstream(silver)

        write_parquet(
            silver,
            SILVER / "events",
        )

        write_parquet(
            orders,
            GOLD / "orders",
        )

        write_parquet(
            order_items,
            GOLD / "order_items",
        )

        write_parquet(
            inventory,
            GOLD / "inventory",
        )

        write_parquet(
            products,
            GOLD / "products",
        )

        write_parquet(
            clickstream,
            GOLD / "clickstream",
        )

        report = quality_report(
            silver,
            orders,
            inventory,
            clickstream,
        )

        report_path = REPORTS / "data_quality.json"
        report_path.write_text(
            json.dumps(report, indent=2),
            encoding="utf-8",
        )

        print("\n===== NEXAMARKET DATA PIPELINE =====")
        print(json.dumps(report, indent=2))

        print("\n===== GOLD ORDER SAMPLE =====")
        orders.show(truncate=False)

        print("\n===== GOLD CLICKSTREAM COUNTS =====")
        (
            clickstream
            .groupBy("event_type")
            .count()
            .orderBy(F.desc("count"))
            .show(truncate=False)
        )

        if not report["passed"]:
            raise RuntimeError(
                "Data-quality checks failed. "
                "See reports/data_quality.json"
            )

        print("DATA QUALITY: PASS")

    finally:
        spark.stop()


if __name__ == "__main__":
    main()
