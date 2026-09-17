import api from "./api";

// API client for the Ownership & Visibility layer: user directory, watchers,
// and project members. No business logic here — just HTTP calls.

// --- User directory (any authenticated user) ---
export async function fetchUserDirectory() {
  const { data } = await api.get("/users/directory");
  return data;
}

// --- Watchers ---
export async function fetchWatchers(objectType, objectId) {
  const { data } = await api.get("/api/watchers", {
    params: { object_type: objectType, object_id: objectId },
  });
  return data;
}

export async function addWatcher(objectType, objectId, userId) {
  const { data } = await api.post("/api/watchers", {
    object_type: objectType,
    object_id: objectId,
    // Bỏ trống => tự thêm chính mình (backend tự set user_id = current_user).
    user_id: userId,
  });
  return data;
}

export async function removeWatcher(watcherId) {
  await api.delete(`/api/watchers/${watcherId}`);
}

// --- Project members ---
export async function fetchProjectMembers(projectId) {
  const { data } = await api.get(`/api/projects/${projectId}/members`);
  return data;
}

export async function addProjectMember(projectId, payload) {
  const { data } = await api.post(`/api/projects/${projectId}/members`, payload);
  return data;
}

export async function updateProjectMember(projectId, memberId, role) {
  const { data } = await api.patch(
    `/api/projects/${projectId}/members/${memberId}`,
    { role }
  );
  return data;
}

export async function removeProjectMember(projectId, memberId) {
  await api.delete(`/api/projects/${projectId}/members/${memberId}`);
}
