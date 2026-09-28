export interface AnalyticsProduct {
  product_id: string;
  product_name: string;
  units_sold: number;
  sales_value: number;
}

export interface AdminAnalyticsSummary {
  generated_at: string;
  source: string;
  clustering: {
    method: string;
    model_trained: boolean;
    clusters: number;
    silhouette_score: number;
    reason: string | null;
  };
  forecasting: {
    method: string;
    model_trained: boolean;
    reason: string | null;
    history_days: number;
    forecast_days: number;
  };
  business_insights: {
    orders: {
      qualifying_orders: number;
      order_value: number;
      average_order_value: number;
      units_sold: number;
    };
    customers: {
      analysed_customers: number;
      segments: Record<string, number>;
    };
    top_products: AnalyticsProduct[];
    low_stock_products: Array<{
      product_id: string;
      name: string;
      stock: number;
      category: string;
      seller: string;
    }>;
  };
  limitations: string[];
}

export interface SellerAnalyticsSummary {
  generated_at: string;
  source: string;
  seller: {
    id: string;
    store_name: string;
    store_description: string;
  };
  business_insights: {
    orders: {
      orders: number;
      units_sold: number;
      sales_value: number;
      average_item_value: number;
    };
    products: {
      total: number;
      active: number;
    };
    top_products: AnalyticsProduct[];
    low_stock_products: Array<{
      product_id: string;
      name: string;
      stock: number;
    }>;
  };
  limitations: string[];
}

export interface SellerProduct {
  id: string;
  name: string;
  price: string;
  is_active: boolean;
  stock: number;
}

export interface SellerRecentOrder {
  order_id: string;
  status: string;
  created_at: string;
  product_name: string;
  quantity: number;
  line_total: number;
}

export interface AnalyticsDashboard {
  summary: AdminAnalyticsSummary | SellerAnalyticsSummary;
  customerSegments: Array<Record<string, string>>;
  forecast: Array<Record<string, string>>;
  demandHistory: Array<Record<string, string>>;
  sellerProducts?: SellerProduct[];
  recentOrders?: SellerRecentOrder[];
}
