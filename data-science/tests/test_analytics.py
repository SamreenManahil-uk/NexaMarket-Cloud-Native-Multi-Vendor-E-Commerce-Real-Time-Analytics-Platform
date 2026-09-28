import pandas as pd

from src.forecast import build_daily_demand, forecast_demand
from src.rfm import add_rfm_scores, build_rfm
from src.segmentation import segment_customers


def test_rfm_excludes_cancelled_orders():
    orders = pd.DataFrame([
        {
            "order_id": "1",
            "customer_id": "c1",
            "status": "DELIVERED",
            "order_total": 20.0,
            "created_at": "2026-09-01T10:00:00Z",
            "email": "a@example.com",
            "first_name": "A",
            "last_name": "One",
        },
        {
            "order_id": "2",
            "customer_id": "c1",
            "status": "CANCELLED",
            "order_total": 100.0,
            "created_at": "2026-09-02T10:00:00Z",
            "email": "a@example.com",
            "first_name": "A",
            "last_name": "One",
        },
    ])
    result = build_rfm(orders)
    assert len(result) == 1
    assert result.iloc[0]["frequency"] == 1
    assert result.iloc[0]["monetary"] == 20.0


def test_small_customer_set_uses_safe_fallback():
    frame = pd.DataFrame([
        {
            "customer_id": "1",
            "email": "1@example.com",
            "first_name": "A",
            "last_name": "A",
            "recency_days": 1,
            "frequency": 2,
            "monetary": 50.0,
        },
        {
            "customer_id": "2",
            "email": "2@example.com",
            "first_name": "B",
            "last_name": "B",
            "recency_days": 3,
            "frequency": 1,
            "monetary": 10.0,
        },
    ])
    scored = add_rfm_scores(frame)
    segmented, metadata = segment_customers(scored)
    assert len(segmented) == 2
    assert metadata["model_trained"] is False
    assert metadata["method"] == "rule_based"


def test_sparse_forecast_uses_mean_baseline():
    items = pd.DataFrame([
        {
            "status": "DELIVERED",
            "quantity": 2,
            "created_at": "2026-09-01T10:00:00Z",
        },
        {
            "status": "DELIVERED",
            "quantity": 4,
            "created_at": "2026-09-02T10:00:00Z",
        },
    ])
    daily = build_daily_demand(items)
    forecast, metadata = forecast_demand(daily, horizon=3)
    assert len(forecast) == 3
    assert metadata["method"] == "historical_mean"
    assert metadata["model_trained"] is False
