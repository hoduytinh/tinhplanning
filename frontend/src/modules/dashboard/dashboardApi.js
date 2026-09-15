import api from "../../shared/api";

// Dashboard API client — chỉ gọi API, không xử lý business logic.

export async function fetchDashboardSummary() {
  const { data } = await api.get("/api/dashboard/summary");
  return data;
}

export async function fetchTodayFocus() {
  const { data } = await api.get("/api/dashboard/today-focus");
  return data;
}

export async function fetchProjectsHealth() {
  const { data } = await api.get("/api/dashboard/projects-health");
  return data;
}

export async function fetchRegressionPulse(projectId) {
  const { data } = await api.get(
    `/api/dashboard/regression-pulse/${projectId}`
  );
  return data;
}
