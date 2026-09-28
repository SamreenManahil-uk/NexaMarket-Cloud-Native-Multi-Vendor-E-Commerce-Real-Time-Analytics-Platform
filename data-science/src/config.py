from __future__ import annotations

import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://nexamarket:nexamarket_dev@localhost:5432/nexamarket",
)

RANDOM_STATE = 42
MAX_CLUSTERS = 4
FORECAST_DAYS = 7
