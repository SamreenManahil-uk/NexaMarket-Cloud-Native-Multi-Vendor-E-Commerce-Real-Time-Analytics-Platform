from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class EventEnvelope(BaseModel):
    model_config = ConfigDict(extra="allow")

    eventId: str = Field(min_length=1)
    eventType: str = Field(min_length=1)

    aggregateType: str | None = None
    aggregateId: str | None = None

    data: dict[str, Any] = Field(default_factory=dict)
    occurredAt: str | None = None


class BronzeRecord(BaseModel):
    topic: str
    partition: int
    offset: int
    kafka_key: str | None
    consumed_at: str
    event: EventEnvelope


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()
