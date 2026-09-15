import api from "../../shared/api";

// Activity (auto-log, read-only) + Comment (manual) API client.

export async function fetchActivities(taskId) {
  const { data } = await api.get(`/api/tasks/${taskId}/activities`);
  return data;
}

export async function fetchComments(taskId) {
  const { data } = await api.get(`/api/tasks/${taskId}/comments`);
  return data;
}

export async function createComment(taskId, content) {
  const { data } = await api.post(`/api/tasks/${taskId}/comments`, {
    content,
  });
  return data;
}

export async function deleteComment(taskId, commentId) {
  await api.delete(`/api/tasks/${taskId}/comments/${commentId}`);
}
