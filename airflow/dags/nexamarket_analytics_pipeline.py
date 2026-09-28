from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path

try:
    from airflow import DAG
    from airflow.operators.bash import BashOperator
except ImportError:
    DAG = None
    BashOperator = None

PROJECT_ROOT = Path(__file__).resolve().parents[2]

default_args = {
    "owner": "nexamarket",
    "depends_on_past": False,
    "retries": 1,
    "retry_delay": timedelta(minutes=2),
}

if DAG is not None:
    with DAG(
        dag_id="nexamarket_analytics_pipeline",
        description="NexaMarket Data Science and Spark Medallion pipeline",
        default_args=default_args,
        start_date=datetime(2026, 1, 1),
        schedule="@daily",
        catchup=False,
        tags=["nexamarket", "analytics", "spark"],
    ) as dag:

        customer_intelligence = BashOperator(
            task_id="customer_intelligence",
            bash_command=(
                f"cd {PROJECT_ROOT}/data-science && "
                f"PYTHONPATH=. {PROJECT_ROOT}/data-science/.venv/bin/python -m src.pipeline"
            ),
        )

        spark_medallion = BashOperator(
            task_id="spark_medallion",
            bash_command=(
                f"cd {PROJECT_ROOT} && "
                f"JAVA_HOME=$(/usr/libexec/java_home -v 17) "
                f"PYTHONPATH=analytics "
                f"{PROJECT_ROOT}/analytics/.venv/bin/python "
                f"analytics/spark/medallion_pipeline.py"
            ),
        )

        customer_intelligence >> spark_medallion
else:
    dag = None
