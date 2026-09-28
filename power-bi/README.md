# NexaMarket Power BI Analytics

## Purpose
Business Intelligence reporting layer for the NexaMarket cloud-native multi-vendor marketplace.

## Data Sources
- PostgreSQL transactional marketplace data
- Python/Pandas analytics pipeline
- RFM customer analysis
- K-Means customer segmentation
- Demand forecasting
- Apache Spark Medallion Gold datasets

## Recommended Power BI Pages
1. Executive Overview
2. Sales & Product Performance
3. Customer Intelligence & RFM
4. Customer Segmentation
5. Demand Forecasting
6. Inventory Intelligence

## Core KPIs
- Marketplace Order Value
- Total Orders
- Units Sold
- Average Order Value
- Active Products
- Customer Count
- Customer Segment Distribution
- Product Performance
- Daily Demand
- Forecast Demand
- Low Stock Products

## Important Interpretation
NexaMarket uses a simulated checkout. Order value represents marketplace transaction/order value and must not be described as settled payment revenue.

The current demand forecast uses a historical-mean baseline because the available transaction history is intentionally small. It must not be represented as a production-grade forecasting model.
