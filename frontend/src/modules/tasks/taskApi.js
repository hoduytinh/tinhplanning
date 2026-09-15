import api from "../../shared/api";

// Tasks API client — only talks to the backend, no business logic here.

export async function fetchTasks(params = {}) {
  // Remove empty params so we don't send `?priority=` with no value.
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== "" && v != null)
  );
  const { data } = await api.get("/api/tasks", { params: clean });
  return data;
}

export async function fetchTask(id) {
  const { data } = await api.get(`/api/tasks/${id}`);
  return data;
}

export async function createTask(payload) {
  const { data } = await api.post("/api/tasks", payload);
  return data;
}

export async function updateTask(id, payload) {
  const { data } = await api.patch(`/api/tasks/${id}`, payload);
  return data;
}

export async function deleteTask(id) {
  await api.delete(`/api/tasks/${id}`);
}
