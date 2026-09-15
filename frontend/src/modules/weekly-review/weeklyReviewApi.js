import api from "../../shared/api";

const BASE = "/api/weekly-reviews";

// --- Reviews ---
export async function fetchReviews() {
  const { data } = await api.get(BASE);
  return data;
}

export async function fetchReview(id) {
  const { data } = await api.get(`${BASE}/${id}`);
  return data;
}

export async function fetchCurrentReview() {
  const { data } = await api.get(`${BASE}/current`);
  return data;
}

export async function createReview(payload = {}) {
  const { data } = await api.post(BASE, payload);
  return data;
}

export async function updateReview(id, patch) {
  const { data } = await api.patch(`${BASE}/${id}`, patch);
  return data;
}

export async function deleteReview(id) {
  await api.delete(`${BASE}/${id}`);
}

// --- Shoutouts ---
export async function addShoutout(reviewId, payload) {
  const { data } = await api.post(`${BASE}/${reviewId}/shoutouts`, payload);
  return data;
}

export async function deleteShoutout(reviewId, shoutoutId) {
  await api.delete(`${BASE}/${reviewId}/shoutouts/${shoutoutId}`);
}

// --- Summary / snapshot ---
export async function fetchSummary(reviewId) {
  const { data } = await api.get(`${BASE}/${reviewId}/summary`);
  return data;
}

export async function saveSnapshot(reviewId) {
  const { data } = await api.post(`${BASE}/${reviewId}/snapshot`);
  return data;
}

// --- CFT ---
export async function generateCft(reviewId) {
  const { data } = await api.post(`${BASE}/${reviewId}/generate-cft`);
  return data;
}

export async function updateCft(reviewId, content) {
  const { data } = await api.patch(`${BASE}/${reviewId}/cft`, {
    cft_report_content: content,
  });
  return data;
}

// --- Complete ---
export async function completeReview(reviewId) {
  const { data } = await api.post(`${BASE}/${reviewId}/complete`);
  return data;
}
