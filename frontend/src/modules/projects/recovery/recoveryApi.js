import api from "../../../shared/api";

// Recovery API client — dùng chung giữa RecoveryTab (Project Detail) và
// RecoveryRadar (Dashboard). Chỉ gọi API, không xử lý business logic.

export async function fetchRecoveryPlans(projectId) {
  const { data } = await api.get(`/api/projects/${projectId}/recovery/plans`);
  return data;
}

export async function fetchLatestRecoveryPlan(projectId) {
  const { data } = await api.get(
    `/api/projects/${projectId}/recovery/plans/latest`
  );
  return data;
}

export async function fetchRecoveryPlansSummary(projectId) {
  const { data } = await api.get(
    `/api/projects/${projectId}/recovery/plans/summary`
  );
  return data;
}

export async function fetchRecoveryGap(projectId) {
  const { data } = await api.get(`/api/projects/${projectId}/recovery/gap`);
  return data;
}

export async function fetchRecoveryTrend(projectId) {
  const { data } = await api.get(`/api/projects/${projectId}/recovery/trend`);
  return data;
}

export async function createRecoveryPlan(projectId, payload) {
  const { data } = await api.post(
    `/api/projects/${projectId}/recovery/plans`,
    payload
  );
  return data;
}

export async function updateRecoveryPlan(projectId, planId, payload) {
  const { data } = await api.patch(
    `/api/projects/${projectId}/recovery/plans/${planId}`,
    payload
  );
  return data;
}

export async function deleteRecoveryPlan(projectId, planId) {
  await api.delete(`/api/projects/${projectId}/recovery/plans/${planId}`);
}
