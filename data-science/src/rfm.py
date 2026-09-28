from __future__ import annotations

import pandas as pd


EXCLUDED_STATUSES = {"CANCELLED", "REFUNDED"}


def build_rfm(orders: pd.DataFrame) -> pd.DataFrame:
    columns = [
        "customer_id",
        "email",
        "first_name",
        "last_name",
        "recency_days",
        "frequency",
        "monetary",
    ]

    if orders.empty:
        return pd.DataFrame(columns=columns)

    frame = orders.copy()

    frame["created_at"] = pd.to_datetime(
        frame["created_at"],
        utc=True,
    )

    frame = frame[
        ~frame["status"].isin(EXCLUDED_STATUSES)
    ].copy()

    if frame.empty:
        return pd.DataFrame(columns=columns)

    snapshot_date = (
        frame["created_at"].max().normalize()
        + pd.Timedelta(days=1)
    )

    grouped = (
        frame.groupby(
            [
                "customer_id",
                "email",
                "first_name",
                "last_name",
            ],
            dropna=False,
        )
        .agg(
            last_order=("created_at", "max"),
            frequency=("order_id", "nunique"),
            monetary=("order_total", "sum"),
        )
        .reset_index()
    )

    grouped["recency_days"] = (
        snapshot_date - grouped["last_order"]
    ).dt.days.astype(int)

    grouped["monetary"] = (
        grouped["monetary"]
        .astype(float)
        .round(2)
    )

    return grouped[
        columns
    ].sort_values(
        ["monetary", "frequency"],
        ascending=[False, False],
    ).reset_index(drop=True)


def add_rfm_scores(rfm: pd.DataFrame) -> pd.DataFrame:
    if rfm.empty:
        result = rfm.copy()
        result["r_score"] = pd.Series(dtype="int64")
        result["f_score"] = pd.Series(dtype="int64")
        result["m_score"] = pd.Series(dtype="int64")
        result["rfm_score"] = pd.Series(dtype="int64")
        return result

    result = rfm.copy()

    def percentile_score(
        series: pd.Series,
        reverse: bool = False,
    ) -> pd.Series:
        percentile = series.rank(
            method="average",
            pct=True,
        )

        if reverse:
            percentile = 1 - percentile + (
                1 / max(len(series), 1)
            )

        return (
            (percentile * 4)
            .clip(1, 4)
            .round()
            .astype(int)
        )

    result["r_score"] = percentile_score(
        result["recency_days"],
        reverse=True,
    )
    result["f_score"] = percentile_score(
        result["frequency"],
    )
    result["m_score"] = percentile_score(
        result["monetary"],
    )

    result["rfm_score"] = (
        result["r_score"] * 100
        + result["f_score"] * 10
        + result["m_score"]
    )

    return result
