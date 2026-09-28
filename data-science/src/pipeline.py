from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from .extract import (
    load_order_items,
    load_orders,
    load_products,
)
from .forecast import (
    build_daily_demand,
    forecast_demand,
)
from .insights import build_insights
from .rfm import add_rfm_scores, build_rfm
from .segmentation import segment_customers


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output"


def main() -> None:
    OUTPUT.mkdir(
        parents=True,
        exist_ok=True,
    )

    print("1/6 Extracting PostgreSQL data...")
    orders = load_orders()
    items = load_order_items()
    products = load_products()

    print(
        f"   orders={len(orders)} "
        f"items={len(items)} "
        f"products={len(products)}"
    )

    print("2/6 Building RFM features...")
    rfm = add_rfm_scores(
        build_rfm(orders)
    )

    print("3/6 Segmenting customers...")
    segments, clustering = (
        segment_customers(rfm)
    )

    print("4/6 Building demand history...")
    daily = build_daily_demand(items)

    print("5/6 Forecasting demand...")
    forecast, forecasting = (
        forecast_demand(daily)
    )

    print("6/6 Generating business insights...")
    insights = build_insights(
        orders,
        items,
        products,
        segments,
    )

    rfm.to_csv(
        OUTPUT / "rfm_customers.csv",
        index=False,
    )

    segments.to_csv(
        OUTPUT / "customer_segments.csv",
        index=False,
    )

    daily.to_csv(
        OUTPUT / "daily_demand.csv",
        index=False,
    )

    forecast.to_csv(
        OUTPUT / "demand_forecast.csv",
        index=False,
    )

    products.to_csv(
        OUTPUT / "product_snapshot.csv",
        index=False,
    )

    report = {
        "generated_at": datetime.now(
            timezone.utc
        ).isoformat(),
        "source": "NexaMarket PostgreSQL transactional data",
        "clustering": clustering,
        "forecasting": forecasting,
        "business_insights": insights,
        "limitations": [
            (
                "Checkout is simulated, therefore order value "
                "must not be described as settled payment revenue."
            ),
            (
                "Customer segmentation quality depends on the "
                "number and diversity of qualifying customer orders."
            ),
            (
                "Demand forecasting is a portfolio analytics "
                "demonstration and not a production demand guarantee."
            ),
        ],
    }

    with (
        OUTPUT / "analytics_summary.json"
    ).open(
        "w",
        encoding="utf-8",
    ) as handle:
        json.dump(
            report,
            handle,
            indent=2,
        )

    print("")
    print("========== DATA SCIENCE SUMMARY ==========")
    print(
        json.dumps(
            report,
            indent=2,
        )
    )
    print("")
    print(
        f"Outputs written to: {OUTPUT}"
    )


if __name__ == "__main__":
    main()
