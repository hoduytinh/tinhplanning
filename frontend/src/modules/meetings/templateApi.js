import api from "../../shared/api";

// Meeting templates API client.

export async function fetchTemplates() {
  const { data } = await api.get("/api/meeting-templates");
  return data;
}

export async function fetchTemplate(id) {
  const { data } = await api.get(`/api/meeting-templates/${id}`);
  return data;
}

export async function createTemplate(payload) {
  const { data } = await api.post("/api/meeting-templates", payload);
  return data;
}

export async function updateTemplate(id, payload) {
  const { data } = await api.patch(`/api/meeting-templates/${id}`, payload);
  return data;
}

export async function deleteTemplate(id) {
  await api.delete(`/api/meeting-templates/${id}`);
}
