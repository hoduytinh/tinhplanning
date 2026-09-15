import api from "../../shared/api";

// Attachment API client (link-only, không upload file).

export async function fetchAttachments(taskId) {
  const { data } = await api.get(`/api/tasks/${taskId}/attachments`);
  return data;
}

export async function createAttachment(taskId, { url, label }) {
  const { data } = await api.post(`/api/tasks/${taskId}/attachments`, {
    url,
    label,
  });
  return data;
}

export async function deleteAttachment(taskId, attachmentId) {
  await api.delete(`/api/tasks/${taskId}/attachments/${attachmentId}`);
}
