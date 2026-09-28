import type { AnalyticsDashboard } from "../types/analytics";

const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

export async function getAnalyticsDashboard(): Promise<AnalyticsDashboard> {
  const token = localStorage.getItem("nexamarket_access_token");

  const response = await fetch(`${API_BASE}/api/analytics/dashboard`, {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {},
  });
  if (!response.ok) throw new Error("Analytics dashboard could not be loaded.");
  const body = await response.json() as { data: AnalyticsDashboard };
  return body.data;
}
