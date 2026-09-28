# NexaMarket Data Science

This component builds reproducible customer and demand analytics
from NexaMarket's PostgreSQL transactional data.

## Capabilities

- RFM customer analysis
- Customer segmentation
- K-Means when the dataset is sufficiently large and varied
- Rule-based segmentation fallback for small datasets
- Daily demand aggregation
- Short-horizon demand forecasting
- Business insight generation
- Low-stock identification
- Top-product analysis

The pipeline deliberately reports when the current dataset is
too small for a defensible ML model instead of fabricating model
quality.

Checkout in NexaMarket is simulated. Monetary/order-value
analytics therefore represent order value, not settled payment
revenue.

## Run

Activate the Python environment and run:

    PYTHONPATH=. python -m src.pipeline

## Outputs

- output/rfm_customers.csv
- output/customer_segments.csv
- output/daily_demand.csv
- output/demand_forecast.csv
- output/product_snapshot.csv
- output/analytics_summary.json
