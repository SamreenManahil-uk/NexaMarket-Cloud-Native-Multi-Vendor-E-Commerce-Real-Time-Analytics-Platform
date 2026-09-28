from __future__ import annotations

import json
import os
import signal
from pathlib import Path

from kafka import KafkaConsumer

from .bronze import persist_event


BROKERS = os.getenv("KAFKA_BROKERS", "localhost:9094").split(",")
GROUP_ID = os.getenv("KAFKA_GROUP_ID", "nexamarket-bronze-consumer-v1")

TOPICS = [
    "nexamarket.orders",
    "nexamarket.products",
    "nexamarket.inventory",
    "nexamarket.clickstream",
]

BASE_DIR = Path(__file__).resolve().parents[1]
BRONZE_ROOT = BASE_DIR / "data" / "bronze"
QUARANTINE_ROOT = BASE_DIR / "data" / "quarantine"

running = True


def stop(*_: object) -> None:
    global running
    running = False


def decode_value(value: bytes) -> object:
    return json.loads(value.decode("utf-8"))


def main() -> None:
    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)

    consumer = KafkaConsumer(
        *TOPICS,
        bootstrap_servers=BROKERS,
        group_id=GROUP_ID,
        enable_auto_commit=False,
        auto_offset_reset="earliest",
        value_deserializer=decode_value,
        key_deserializer=lambda value: value.decode("utf-8") if value else None,
    )

    print(f"NexaMarket Bronze consumer connected to {BROKERS}")
    print(f"Topics: {TOPICS}")

    try:
        while running:
            batches = consumer.poll(timeout_ms=1000, max_records=100)

            for _, messages in batches.items():
                for message in messages:
                    accepted = persist_event(
                        bronze_root=BRONZE_ROOT,
                        quarantine_root=QUARANTINE_ROOT,
                        topic=message.topic,
                        partition=message.partition,
                        offset=message.offset,
                        key=message.key,
                        value=message.value,
                    )

                    state = "BRONZE" if accepted else "QUARANTINE"
                    print(
                        f"[{state}] {message.topic} "
                        f"partition={message.partition} offset={message.offset}"
                    )

            if batches:
                consumer.commit()

    finally:
        consumer.close()
        print("NexaMarket Bronze consumer stopped.")


if __name__ == "__main__":
    main()
