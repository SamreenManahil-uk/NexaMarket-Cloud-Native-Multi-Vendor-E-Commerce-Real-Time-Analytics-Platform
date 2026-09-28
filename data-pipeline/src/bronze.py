from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from .models import BronzeRecord, EventEnvelope, utc_now


def day_partition() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def append_jsonl(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload, ensure_ascii=False))
        handle.write(chr(10))

def bronze_path(root: Path, topic: str) -> Path:
    safe_topic = topic.replace("/", "_")
    return root / safe_topic / f"{day_partition()}.jsonl"


def quarantine_path(root: Path, topic: str) -> Path:
    safe_topic = topic.replace("/", "_")
    return root / safe_topic / f"{day_partition()}.jsonl"


def normalise_event(
    topic: str,
    value: dict[str, Any],
) -> dict[str, Any]:
    if topic == "nexamarket.clickstream":
        event_type = value.get("eventType") or value.get("type")
        event_id = value.get("eventId")

        if not event_id:
            event_id = (
                f"clickstream-{value.get('sessionId', 'unknown')}-"
                f"{value.get('timestamp', 'unknown')}-"
                f"{event_type or 'unknown'}"
            )

        return {
            "eventId": str(event_id),
            "eventType": str(event_type or "UNKNOWN"),
            "aggregateType": value.get("aggregateType") or "CLICKSTREAM",
            "aggregateId": (
                value.get("aggregateId")
                or value.get("productId")
                or value.get("sessionId")
            ),
            "occurredAt": (
                value.get("occurredAt")
                or value.get("timestamp")
            ),
            "data": value.get("data", value),
        }

    return value


def build_bronze_record(
    *,
    topic: str,
    partition: int,
    offset: int,
    key: str | None,
    value: dict[str, Any],
) -> BronzeRecord:
    normalised = normalise_event(topic, value)
    event = EventEnvelope.model_validate(normalised)

    return BronzeRecord(
        topic=topic,
        partition=partition,
        offset=offset,
        kafka_key=key,
        consumed_at=utc_now(),
        event=event,
    )


def persist_event(
    *,
    bronze_root: Path,
    quarantine_root: Path,
    topic: str,
    partition: int,
    offset: int,
    key: str | None,
    value: Any,
) -> bool:
    try:
        if not isinstance(value, dict):
            raise ValueError("Kafka event value must be a JSON object.")

        record = build_bronze_record(
            topic=topic,
            partition=partition,
            offset=offset,
            key=key,
            value=value,
        )

        append_jsonl(
            bronze_path(bronze_root, topic),
            record.model_dump(mode="json"),
        )
        return True

    except (ValidationError, ValueError, TypeError) as exc:
        append_jsonl(
            quarantine_path(quarantine_root, topic),
            {
                "topic": topic,
                "partition": partition,
                "offset": offset,
                "kafka_key": key,
                "consumed_at": utc_now(),
                "validation_error": str(exc),
                "raw_value": value,
            },
        )
        return False
