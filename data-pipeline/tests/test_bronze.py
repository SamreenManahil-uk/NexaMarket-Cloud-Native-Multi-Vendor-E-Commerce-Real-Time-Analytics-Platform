from pathlib import Path

from src.bronze import persist_event


def valid_event():
    return {
        "eventId": "evt-001",
        "eventType": "ORDER_CREATED",
        "aggregateType": "ORDER",
        "aggregateId": "order-001",
        "occurredAt": "2026-09-26T18:00:00Z",
        "data": {"totalAmount": "24.99"},
    }


def test_valid_event_goes_to_bronze(tmp_path: Path):
    bronze = tmp_path / "bronze"
    quarantine = tmp_path / "quarantine"

    accepted = persist_event(
        bronze_root=bronze,
        quarantine_root=quarantine,
        topic="nexamarket.orders",
        partition=0,
        offset=1,
        key="order-001",
        value=valid_event(),
    )

    assert accepted is True
    assert list(bronze.rglob("*.jsonl"))
    assert not list(quarantine.rglob("*.jsonl"))


def test_invalid_event_goes_to_quarantine(tmp_path: Path):
    bronze = tmp_path / "bronze"
    quarantine = tmp_path / "quarantine"

    accepted = persist_event(
        bronze_root=bronze,
        quarantine_root=quarantine,
        topic="nexamarket.orders",
        partition=0,
        offset=2,
        key=None,
        value={"bad": "event"},
    )

    assert accepted is False
    assert not list(bronze.rglob("*.jsonl"))
    assert list(quarantine.rglob("*.jsonl"))


def test_clickstream_event_is_normalised(tmp_path: Path):
    bronze = tmp_path / "bronze"
    quarantine = tmp_path / "quarantine"

    accepted = persist_event(
        bronze_root=bronze,
        quarantine_root=quarantine,
        topic="nexamarket.clickstream",
        partition=0,
        offset=10,
        key="session-001",
        value={
            "eventType": "PAGE_VIEW",
            "sessionId": "session-001",
            "timestamp": "2026-09-26T18:00:00Z",
            "path": "/shop",
        },
    )

    assert accepted is True

    files = list(bronze.rglob("*.jsonl"))
    assert len(files) == 1

    content = files[0].read_text()
    assert "PAGE_VIEW" in content
    assert "CLICKSTREAM" in content


def test_jsonl_uses_real_newlines(tmp_path: Path):
    bronze = tmp_path / "bronze"
    quarantine = tmp_path / "quarantine"

    for offset in range(2):
        assert persist_event(
            bronze_root=bronze,
            quarantine_root=quarantine,
            topic="nexamarket.orders",
            partition=0,
            offset=offset,
            key="order-001",
            value=valid_event(),
        )

    file = next(bronze.rglob("*.jsonl"))

    with file.open(encoding="utf-8") as handle:
        lines = handle.readlines()

    assert len(lines) == 2
