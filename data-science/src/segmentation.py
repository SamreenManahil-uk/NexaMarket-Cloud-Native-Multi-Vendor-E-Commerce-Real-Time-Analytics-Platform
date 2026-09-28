from __future__ import annotations

import numpy as np
import pandas as pd

from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

from .config import MAX_CLUSTERS, RANDOM_STATE


FEATURES = [
    "recency_days",
    "frequency",
    "monetary",
]


def _rule_segment(row: pd.Series) -> str:
    if (
        row["r_score"] >= 3
        and row["f_score"] >= 3
        and row["m_score"] >= 3
    ):
        return "High Value"

    if (
        row["r_score"] >= 3
        and row["frequency"] <= 1
    ):
        return "New / Recent"

    if (
        row["f_score"] >= 3
        and row["r_score"] <= 2
    ):
        return "At Risk"

    if row["m_score"] >= 3:
        return "High Spend"

    return "Developing"


def segment_customers(
    rfm: pd.DataFrame,
) -> tuple[pd.DataFrame, dict]:
    result = rfm.copy()

    metadata = {
        "method": "rule_based",
        "model_trained": False,
        "clusters": 0,
        "silhouette_score": None,
        "reason": None,
    }

    if result.empty:
        result["segment"] = pd.Series(dtype="object")
        result["cluster"] = pd.Series(dtype="Int64")
        metadata["reason"] = "No qualifying customer transactions."
        return result, metadata

    if len(result) < 4:
        result["segment"] = result.apply(
            _rule_segment,
            axis=1,
        )
        result["cluster"] = pd.Series(
            [pd.NA] * len(result),
            dtype="Int64",
        )
        metadata["reason"] = (
            "K-Means skipped because fewer than "
            "4 customers have qualifying transactions."
        )
        return result, metadata

    feature_frame = result[FEATURES].astype(float)

    if (
        feature_frame.nunique()
        .min()
        <= 1
    ):
        result["segment"] = result.apply(
            _rule_segment,
            axis=1,
        )
        result["cluster"] = pd.Series(
            [pd.NA] * len(result),
            dtype="Int64",
        )
        metadata["reason"] = (
            "K-Means skipped because customer features "
            "do not contain enough variation."
        )
        return result, metadata

    scaler = StandardScaler()
    scaled = scaler.fit_transform(feature_frame)

    max_k = min(
        MAX_CLUSTERS,
        len(result) - 1,
    )

    candidates = []

    for k in range(2, max_k + 1):
        model = KMeans(
            n_clusters=k,
            random_state=RANDOM_STATE,
            n_init=20,
        )

        labels = model.fit_predict(scaled)

        if len(np.unique(labels)) < 2:
            continue

        score = silhouette_score(
            scaled,
            labels,
        )

        candidates.append(
            (score, k, model, labels)
        )

    if not candidates:
        result["segment"] = result.apply(
            _rule_segment,
            axis=1,
        )
        result["cluster"] = pd.Series(
            [pd.NA] * len(result),
            dtype="Int64",
        )
        metadata["reason"] = (
            "No valid K-Means clustering solution "
            "could be produced."
        )
        return result, metadata

    score, k, model, labels = max(
        candidates,
        key=lambda item: item[0],
    )

    result["cluster"] = labels

    cluster_profile = (
        result.groupby("cluster")
        .agg(
            recency=("recency_days", "mean"),
            frequency=("frequency", "mean"),
            monetary=("monetary", "mean"),
        )
    )

    ranked = cluster_profile.assign(
        value_index=(
            cluster_profile["monetary"].rank(pct=True)
            + cluster_profile["frequency"].rank(pct=True)
            + cluster_profile["recency"].rank(
                pct=True,
                ascending=False,
            )
        )
    ).sort_values(
        "value_index",
        ascending=False,
    )

    labels_by_rank = [
        "Champions",
        "Loyal",
        "Promising",
        "Developing",
    ]

    mapping = {
        cluster_id: labels_by_rank[
            min(index, len(labels_by_rank) - 1)
        ]
        for index, cluster_id
        in enumerate(ranked.index)
    }

    result["segment"] = (
        result["cluster"]
        .map(mapping)
        .fillna("Developing")
    )

    metadata.update(
        {
            "method": "kmeans",
            "model_trained": True,
            "clusters": int(k),
            "silhouette_score": round(
                float(score),
                4,
            ),
            "reason": None,
        }
    )

    return result, metadata
