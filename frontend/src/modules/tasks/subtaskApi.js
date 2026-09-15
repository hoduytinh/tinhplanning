import api from "../../shared/api";

// Subtask API client — chỉ gọi API, không xử lý business logic.

export async function fetchSubtasks(taskId) {
  const { data } = await api.get(`/api/tasks/${taskId}/subtasks`);
  return data;
}

export async function createSubtask(taskId, payload) {
  const body = typeof payload === "string" ? { title: payload } : payload;
  const { data } = await api.post(`/api/tasks/${taskId}/subtasks`, body);
  return data;
}

export async function updateSubtask(taskId, subtaskId, payload) {
  const { data } = await api.patch(
    `/api/tasks/${taskId}/subtasks/${subtaskId}`,
    payload
  );
  return data;
}

export async function reorderSubtasks(taskId, orderedIds) {
  const { data } = await api.put(`/api/tasks/${taskId}/subtasks/reorder`, {
    ordered_ids: orderedIds,
  });
  return data;
}

export async function deleteSubtask(taskId, subtaskId) {
  await api.delete(`/api/tasks/${taskId}/subtasks/${subtaskId}`);
}
