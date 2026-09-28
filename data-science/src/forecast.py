from __future__ import annotations

import pandas as pd

from sklearn.linear_model import LinearRegression

from .config import FORECAST_DAYS


EXCLUDED_STATUSES = {"CANCELLED", "REFUNDED"}


def build_daily_demand(
    items: pd.DataFrame,
) -> pd.DataFrame:
    columns = ["date", "units"]

    if items.empty:
        return pd.DataFrame(columns=columns)

    frame = items[
        ~items["status"].isin(EXCLUDED_STATUSES)
    ].copy()

    if frame.empty:
        return pd.DataFrame(columns=columns)

    frame["created_at"] = pd.to_datetime(
        frame["created_at"],
        utc=True,
    )

    frame["date"] = (
        frame["created_at"]
        .dt.tz_convert(None)
        .dt.normalize()
    )

    daily = (
        frame.groupby("date")["quantity"]
        .sum()
        .rename("units")
        .reset_index()
        .sort_values("date")
    )

    full_dates = pd.date_range(
        daily["date"].min(),
        daily["date"].max(),
        freq="D",
    )

    daily = (
        daily.set_index("date")
        .reindex(full_dates, fill_value=0)
        .rename_axis("date")
        .reset_index()
    )

    daily["units"] = daily["units"].astype(int)

    return daily[columns]


def forecast_demand(
    daily: pd.DataFrame,
    horizon: int = FORECAST_DAYS,
) -> tuple[pd.DataFrame, dict]:
    columns = [
        "date",
        "predicted_units",
        "method",
    ]

    if daily.empty:
        return (
            pd.DataFrame(columns=columns),
            {
                "method": "unavailable",
                "model_trained": False,
                "reason": "No qualifying order-item history.",
                "history_days": 0,
                "forecast_days": horizon,
            },
        )

    history_days = len(daily)

    future_dates = pd.date_range(
        daily["date"].max()
        + pd.Timedelta(days=1),
        periods=horizon,
        freq="D",
    )

    if history_days < 7:
        baseline = max(
            float(daily["units"].mean()),
            0.0,
        )

        forecast = pd.DataFrame(
            {
                "date": future_dates,
                "predicted_units": [
                    round(baseline, 2)
                ] * horizon,
                "method": [
                    "historical_mean"
                ] * horizon,
            }
        )

        metadata = {
            "method": "historical_mean",
            "model_trained": False,
            "reason": (
                "Fewer than 7 days of demand history; "
                "using a transparent historical-mean baseline."
            ),
            "history_days": history_days,
            "forecast_days": horizon,
        }

        return forecast, metadata

    train = daily.copy()
    train["time_index"] = range(len(train))

    model = LinearRegression()

    model.fit(
        train[["time_index"]],
        train["units"],
    )

    future_index = pd.DataFrame(
        {
            "time_index": range(
                len(train),
                len(train) + horizon,
            )
        }
    )

    predictions = model.predict(future_index)

    forecast = pd.DataFrame(
        {
            "date": future_dates,
            "predicted_units": [
                round(max(float(value), 0.0), 2)
                for value in predictions
            ],
            "method": [
                "linear_trend"
            ] * horizon,
        }
    )

    metadata = {
        "method": "linear_trend",
        "model_trained": True,
        "reason": None,
        "history_days": history_days,
        "forecast_days": horizon,
        "coefficient": round(
            float(model.coef_[0]),
            6,
        ),
        "intercept": round(
            float(model.intercept_),
            6,
        ),
    }

    return forecast, metadata
