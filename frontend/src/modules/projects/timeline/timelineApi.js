import api from "../../../shared/api";

// Timeline API client (Tab 3 — Project Detail). Chỉ gọi API, không xử lý
// business logic.

export async function fetchTimeline(projectId) {
  const { data } = await api.get(`/api/projects/${projectId}/timeline`);
  return data;
}

// --- Tracks -----------------------------------------------------------
export async function fetchTracks(projectId) {
  const { data } = await api.get(`/api/projects/${projectId}/timeline/tracks`);
  return data;
}

export async function createTrack(projectId, payload) {
  const { data } = await api.post(
    `/api/projects/${projectId}/timeline/tracks`,
    payload
  );
  return data;
}

export async function updateTrack(projectId, trackId, payload) {
  const { data } = await api.patch(
    `/api/projects/${projectId}/timeline/tracks/${trackId}`,
    payload
  );
  return data;
}

export async function deleteTrack(projectId, trackId) {
  await api.delete(`/api/projects/${projectId}/timeline/tracks/${trackId}`);
}

// --- Bars ---------------------------------------------------------------
export async function fetchBars(projectId) {
  const { data } = await api.get(`/api/projects/${projectId}/timeline/bars`);
  return data;
}

export async function createBar(projectId, payload) {
  const { data } = await api.post(
    `/api/projects/${projectId}/timeline/bars`,
    payload
  );
  return data;
}

export async function updateBar(projectId, barId, payload) {
  const { data } = await api.patch(
    `/api/projects/${projectId}/timeline/bars/${barId}`,
    payload
  );
  return data;
}

export async function deleteBar(projectId, barId) {
  await api.delete(`/api/projects/${projectId}/timeline/bars/${barId}`);
}

// --- Bar milestones (markers bên trong 1 bar) ---------------------------
export async function fetchBarMilestones(projectId, barId) {
  const { data } = await api.get(
    `/api/projects/${projectId}/timeline/bars/${barId}/milestones`
  );
  return data;
}

export async function createBarMilestone(projectId, barId, payload) {
  const { data } = await api.post(
    `/api/projects/${projectId}/timeline/bars/${barId}/milestones`,
    payload
  );
  return data;
}

export async function updateBarMilestone(projectId, barId, bmId, payload) {
  const { data } = await api.patch(
    `/api/projects/${projectId}/timeline/bars/${barId}/milestones/${bmId}`,
    payload
  );
  return data;
}

export async function deleteBarMilestone(projectId, barId, bmId) {
  await api.delete(
    `/api/projects/${projectId}/timeline/bars/${barId}/milestones/${bmId}`
  );
}

// --- Milestones (timeline view) -----------------------------------------
export async function fetchTimelineMilestones(projectId) {
  const { data } = await api.get(
    `/api/projects/${projectId}/timeline/milestones`
  );
  return data;
}

export async function createTimelineMilestone(projectId, payload) {
  const { data } = await api.post(
    `/api/projects/${projectId}/timeline/milestones`,
    payload
  );
  return data;
}

export async function updateTimelineMilestone(projectId, milestoneId, payload) {
  const { data } = await api.patch(
    `/api/projects/${projectId}/timeline/milestones/${milestoneId}`,
    payload
  );
  return data;
}

export async function deleteTimelineMilestone(projectId, milestoneId) {
  await api.delete(
    `/api/projects/${projectId}/timeline/milestones/${milestoneId}`
  );
}
