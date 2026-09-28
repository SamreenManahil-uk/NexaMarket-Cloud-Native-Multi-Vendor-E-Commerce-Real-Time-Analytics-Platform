from __future__ import annotations

import pandas as pd


def build_insights(
    orders: pd.DataFrame,
    items: pd.DataFrame,
    products: pd.DataFrame,
    segments: pd.DataFrame,
) -> dict:
    valid_orders = orders[
        ~orders["status"].isin(
            {"CANCELLED", "REFUNDED"}
        )
    ].copy()

    valid_items = items[
        ~items["status"].isin(
            {"CANCELLED", "REFUNDED"}
        )
    ].copy()

    order_value = (
        float(valid_orders["order_total"].sum())
        if not valid_orders.empty
        else 0.0
    )

    average_order_value = (
        float(valid_orders["order_total"].mean())
        if not valid_orders.empty
        else 0.0
    )

    units_sold = (
        int(valid_items["quantity"].sum())
        if not valid_items.empty
        else 0
    )

    top_products = []

    if not valid_items.empty:
        grouped = (
            valid_items.groupby(
                ["product_id", "product_name"],
                dropna=False,
            )
            .agg(
                units_sold=("quantity", "sum"),
                sales_value=("line_total", "sum"),
            )
            .reset_index()
            .sort_values(
                ["units_sold", "sales_value"],
                ascending=False,
            )
            .head(5)
        )

        top_products = [
            {
                "product_id": row.product_id,
                "product_name": row.product_name,
                "units_sold": int(row.units_sold),
                "sales_value": round(
                    float(row.sales_value),
                    2,
                ),
            }
            for row in grouped.itertuples()
        ]

    low_stock = []

    if not products.empty:
        stock = (
            products[
                (products["is_active"] == True)
                & (products["stock"] <= 5)
            ]
            .sort_values(
                ["stock", "name"],
            )
            .head(10)
        )

        low_stock = [
            {
                "product_id": row.product_id,
                "name": row.name,
                "stock": int(row.stock),
                "category": row.category,
                "seller": row.seller,
            }
            for row in stock.itertuples()
        ]

    segment_counts = {}

    if (
        not segments.empty
        and "segment" in segments.columns
    ):
        segment_counts = {
            str(key): int(value)
            for key, value
            in segments["segment"]
            .value_counts()
            .to_dict()
            .items()
        }

    return {
        "orders": {
            "qualifying_orders": int(
                len(valid_orders)
            ),
            "order_value": round(
                order_value,
                2,
            ),
            "average_order_value": round(
                average_order_value,
                2,
            ),
            "units_sold": units_sold,
        },
        "customers": {
            "analysed_customers": int(
                len(segments)
            ),
            "segments": segment_counts,
        },
        "top_products": top_products,
        "low_stock_products": low_stock,
    }
