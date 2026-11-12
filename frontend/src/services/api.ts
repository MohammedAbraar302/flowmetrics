
const API = "/api";

export interface Overview {
  total_revenue: number;
  total_orders: number;
  total_customers: number;
  gross_profit: number;
  profit_margin: number;
  average_order_value: number;
}

export interface Retention {
  repeat_customers: number;
  repeat_rate: number;
  one_time_customers: number;
}

export interface MonthlySales {
  month: string;
  revenue: number;
  profit: number;
  orders: number;
}

export interface TopProduct {
  product: string;
  revenue: number;
  profit: number;
  units_sold: number;
}

export interface CategoryPerformance {
  category: string;
  revenue: number;
  profit: number;
  units_sold: number;
}

export interface RFM {
  customer_id: number;
  customer_name: string;
  city: string;
  last_purchase: string;
  frequency: number;
  monetary: number;
  recency: number;
  R_score: number;
  F_score: number;
  M_score: number;
  segment: string;
  RFM_score: string;
}

export interface SegmentSummary {
  segment: string;
  customer_count: number;
  total_revenue: number;
  average_frequency: number;
}

export interface ApiCollection<T> {
  value: T[];
  Count: number;
}

async function getData<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API}${endpoint}`);

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  overview: () => getData<Overview>("/analytics/overview"),

  monthlySales: () =>
    getData<ApiCollection<MonthlySales>>("/analytics/monthly-sales"),

  topProducts: () =>
    getData<ApiCollection<TopProduct>>("/analytics/top-products"),

  categories: () =>
    getData<ApiCollection<CategoryPerformance>>("/analytics/categories"),

  rfm: () =>
    getData<ApiCollection<RFM>>("/analytics/rfm"),

  segments: () =>
    getData<ApiCollection<SegmentSummary>>("/analytics/segments"),

  retention: () =>
    getData<Retention>("/analytics/retention/overview"),

  cohorts: () =>
    getData<ApiCollection<unknown>>("/analytics/retention/cohorts"),
};
